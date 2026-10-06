const statusId = 'boma-offline-status';

export function registerOfflineQueue() {
    if (typeof window === 'undefined' || ! ('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                if (navigator.onLine) {
                    requestSync(registration);
                }
            })
            .catch(() => {
                // PWA support should never block the core app.
            });
    });

    window.addEventListener('online', () => {
        setOfflineStatus(false);
        navigator.serviceWorker.ready.then(requestSync).catch(() => {});
    });

    window.addEventListener('offline', () => {
        setOfflineStatus(true);
    });

    setOfflineStatus(! navigator.onLine);
}

function requestSync(registration) {
    if ('sync' in registration) {
        registration.sync.register('boma-offline-sync');
        return;
    }

    registration.active?.postMessage({ type: 'BOMA_SYNC_NOW' });
}

function setOfflineStatus(isOffline) {
    let element = document.getElementById(statusId);

    if (! element) {
        element = document.createElement('div');
        element.id = statusId;
        element.setAttribute('role', 'status');
        element.style.cssText = [
            'position:fixed',
            'left:50%',
            'bottom:18px',
            'z-index:9999',
            'transform:translateX(-50%)',
            'border-radius:999px',
            'padding:10px 16px',
            'background:#050505',
            'color:#ffffff',
            'box-shadow:0 18px 60px rgba(0,0,0,.25)',
            'font-size:12px',
            'font-weight:800',
            'letter-spacing:.08em',
            'text-transform:uppercase',
            'display:none',
        ].join(';');
        document.body.appendChild(element);
    }

    element.textContent = 'Offline mode. Actions will sync later.';
    element.style.display = isOffline ? 'block' : 'none';
}
