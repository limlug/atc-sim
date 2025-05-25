import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createRoot, Root } from 'react-dom/client';
import React, { useEffect, useRef } from 'react';

interface AcData {
    id:  string;
    lat: number;
    lon: number;
    alt: number;
    trk: number;
}

export function PopupManager({
                                 selected,
                             }: {
    selected: AcData | null;
}) {
    const map = useMap();
    const popupRef = useRef<L.Popup>();
    const rootRef  = useRef<Root>();

    useEffect(() => {
        // Defer cleanup of any existing popup
        if (popupRef.current) {
            const oldPopup = popupRef.current;
            const oldRoot  = rootRef.current;
            setTimeout(() => {
                oldPopup.remove();
                oldRoot?.unmount();
            }, 0);
            popupRef.current = undefined;
            rootRef.current  = undefined;
        }

        if (!selected) {
            return;
        }

        // 1) Create a container and mount the React content
        const container = document.createElement('div');
        const root      = createRoot(container);
        root.render(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong>{selected.id}</strong>
        <button
        onClick={async () => {
            const resp: string = await window.__TAURI__.invoke('greet', {
                name: selected.id,
            });
            console.log(resp);
        }}
    >
        Say Hello
        </button>
        <button onClick={() => alert(`Action for ${selected.id}`)}>
        Other Action
        </button>
        </div>
    );

        // 2) Create & open the Leaflet popup
        const popup = L.popup({
            autoClose:    false,
            closeOnClick: false,
            autoPan:      false,
        })
            .setLatLng([selected.lat, selected.lon])
            .setContent(container)
            .openOn(map);

        popupRef.current = popup;
        rootRef.current  = root;

        // No synchronous cleanup here: we already deferred above.
        return () => {
            // For completeness, also defer cleanup when `PopupManager` unmounts
            setTimeout(() => {
                popup.remove();
                root.unmount();
            }, 0);
        };
    }, [map, selected]);

    return null;
}
