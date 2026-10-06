const CACHE_NAME = 'boma-cache-v1';
const DB_NAME = 'boma-offline-actions';
const DB_VERSION = 1;
const STORE_NAME = 'actions';
const APP_SHELL = [
    '/',
    '/offline.html',
    '/manifest.webmanifest',
    '/icons/boma-icon.svg',
];

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            ))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (MUTATION_METHODS.has(request.method)) {
        event.respondWith(handleMutation(request));
        return;
    }

    if (request.method === 'GET') {
        event.respondWith(handleGet(request));
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'boma-offline-sync') {
        event.waitUntil(replayQueuedActions());
    }
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'BOMA_SYNC_NOW') {
        event.waitUntil(replayQueuedActions());
    }
});

async function handleGet(request) {
    if (request.mode === 'navigate') {
        try {
            const response = await fetch(request);
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());

            return response;
        } catch (error) {
            return (await caches.match(request))
                || (await caches.match('/offline.html'));
        }
    }

    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);

        if (response.ok && shouldCache(request, response)) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        return caches.match('/offline.html');
    }
}

async function handleMutation(request) {
    try {
        return await fetch(request.clone());
    } catch (error) {
        if (! shouldQueue(request)) {
            throw error;
        }

        await queueRequest(request);
        await requestReplay();

        return new Response(JSON.stringify({
            queued: true,
            message: 'You are offline. Boma saved this action and will retry it when the connection returns.',
        }), {
            status: 202,
            headers: {
                'Content-Type': 'application/json',
                'X-Boma-Offline-Queued': 'true',
            },
        });
    }
}

function shouldCache(request, response) {
    const destination = request.destination;

    return response.type === 'basic'
        && ['style', 'script', 'image', 'font', 'manifest'].includes(destination);
}

function shouldQueue(request) {
    const contentType = request.headers.get('content-type') || '';

    return ! contentType.includes('multipart/form-data')
        && ! request.headers.has('X-Boma-Offline-Replay');
}

async function queueRequest(request) {
    const headers = {};
    request.headers.forEach((value, key) => {
        if (! ['content-length', 'host'].includes(key.toLowerCase())) {
            headers[key] = value;
        }
    });

    const record = {
        url: request.url,
        method: request.method,
        headers,
        body: await request.clone().text(),
        credentials: request.credentials,
        createdAt: new Date().toISOString(),
        attempts: 0,
    };

    const db = await openDb();

    return txDone(db, STORE_NAME, 'readwrite', (store) => store.add(record));
}

async function replayQueuedActions() {
    const db = await openDb();
    const records = await txDone(db, STORE_NAME, 'readonly', (store) => store.getAll());

    for (const record of records) {
        try {
            const headers = new Headers(record.headers || {});
            headers.set('X-Boma-Offline-Replay', 'true');

            const response = await fetch(record.url, {
                method: record.method,
                headers,
                body: ['GET', 'HEAD'].includes(record.method) ? undefined : record.body,
                credentials: record.credentials || 'same-origin',
            });

            if (! response.ok && response.status >= 500) {
                throw new Error(`Replay failed with ${response.status}`);
            }

            await txDone(db, STORE_NAME, 'readwrite', (store) => store.delete(record.id));
        } catch (error) {
            record.attempts = (record.attempts || 0) + 1;
            record.lastError = error.message;
            record.lastAttemptAt = new Date().toISOString();

            await txDone(db, STORE_NAME, 'readwrite', (store) => store.put(record));
        }
    }
}

async function requestReplay() {
    if ('sync' in self.registration) {
        await self.registration.sync.register('boma-offline-sync');
        return;
    }

    await replayQueuedActions();
}

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (! db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function txDone(db, storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = callback(tx.objectStore(storeName));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
    });
}
