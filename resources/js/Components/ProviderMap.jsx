import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

const zimbabweCenter = [-19.0154, 29.1549];

function initialsFor(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function providerPopup(provider) {
    const popup = document.createElement('div');
    popup.className = 'min-w-48 font-sans';

    const category = document.createElement('p');
    category.className = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500';
    category.textContent = provider.category;

    const name = document.createElement('p');
    name.className = 'mt-1 text-base font-semibold text-zinc-950';
    name.textContent = provider.businessName;

    const location = document.createElement('p');
    location.className = 'mt-1 text-xs text-zinc-600';
    location.textContent = provider.distanceKm !== null
        ? `${provider.locationLabel} · ${provider.distanceKm} km away`
        : provider.locationLabel;

    const link = document.createElement('a');
    link.className = 'mt-3 inline-flex rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-white';
    link.href = route('providers.show', provider.id);
    link.textContent = 'View profile';

    popup.append(category, name, location, link);

    return popup;
}

export default function ProviderMap({ providers, searchLocation }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) {
            return undefined;
        }

        const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        const bounds = [];

        providers.forEach((provider) => {
            if (provider.latitude === null || provider.longitude === null) {
                return;
            }

            const point = [Number(provider.latitude), Number(provider.longitude)];
            bounds.push(point);

            L.marker(point, {
                icon: L.divIcon({
                    className: 'boma-provider-pin',
                    html: `<span>${initialsFor(provider.businessName)}</span>`,
                    iconAnchor: [20, 20],
                    iconSize: [40, 40],
                    popupAnchor: [0, -22],
                }),
            })
                .addTo(map)
                .bindPopup(providerPopup(provider));
        });

        if (searchLocation) {
            const point = [
                Number(searchLocation.latitude),
                Number(searchLocation.longitude),
            ];
            bounds.push(point);

            L.circleMarker(point, {
                color: '#18181b',
                fillColor: '#ffffff',
                fillOpacity: 1,
                radius: 8,
                weight: 4,
            })
                .addTo(map)
                .bindTooltip('Your search location');
        }

        if (bounds.length) {
            map.fitBounds(bounds, { maxZoom: 13, padding: [36, 36] });
        } else {
            map.setView(zimbabweCenter, 6);
        }

        return () => map.remove();
    }, [providers, searchLocation]);

    return (
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
            <div ref={containerRef} className="h-[34rem] w-full" />
            <div className="flex flex-col gap-2 border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                <p>{providers.length} mapped provider{providers.length === 1 ? '' : 's'}</p>
                <p>Scroll zoom activates after clicking the map.</p>
            </div>
        </div>
    );
}
