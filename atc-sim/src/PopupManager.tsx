import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createRoot, Root } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import { PopupContent } from './PopupContent';
interface AcData {
    id:  string;
    lat: number;
    lon: number;
    alt: number;
    trk: number;
}
// PopupContent: React component for dynamic UI inside Leaflet popup
/*function PopupContent({ selected }: { selected: AcData }) {
    const [showHeading, setShowHeading] = useState(false);
    const [heading, setHeading] = useState(selected.trk);
    const [altitude, setAltitude] = useState(0);

    // generate heading options in 10° steps
    const headingOptions = Array.from({ length: 36 }, (_, i) => i * 10);
    // altitude options in 1000 ft steps up to, say, 40,000 ft
    const altitudeOptions = Array.from({ length: 41 }, (_, i) => i * 1000);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            <strong style={{ textAlign: 'center' }}>{selected.id}</strong>

            <div>
                <button
                    style={{ width: '100%' }}
                    onClick={() => setShowHeading(h => !h)}
                >
                    {showHeading ? 'Hide Heading' : 'Set Heading'}
                </button>
                {showHeading && (
                    <select
                        value={heading}
                        onChange={e => {console.log(e.target.value); setHeading(Number(e.target.value)); invoke('set_heading', {id: selected.id, heading: e.target.value})}}
                        style={{ width: '100%', marginTop: '4px' }}
                    >
                        {headingOptions.map(deg => (
                            <option key={deg} value={deg}>{deg}</option>
                        ))}
                    </select>
                )}
            </div>

            <div>
                <label htmlFor="altitude-select" style={{ fontSize: '0.9rem', marginBottom: '2px', display: 'block' }}>
                    Altitude
                </label>
                <select
                    id="altitude-select"
                    value={altitude}
                    onChange={e => {
                        setAltitude(Number(e.target.value));
                        invoke('set_altitude', {id: selected.id, altitude: e.target.value}).then();
                    }}
                    style={{ width: '100%' }}
                >
                    {altitudeOptions.map(ft => (
                        <option key={ft} value={ft}>{ft.toLocaleString()} ft</option>
                    ))}
                </select>
            </div>

            <button
                style={{ background: '#28a745', color: 'white', padding: '6px', border: 'none', borderRadius: '4px' }}
                onClick={() => invoke('assume_control', { id: selected.id, heading, altitude })}
            >
                Assume Control
            </button>

            <button
                style={{ background: '#dc3545', color: 'white', padding: '6px', border: 'none', borderRadius: '4px' }}
                onClick={() => invoke('relinquish_control', { id: selected.id })}
            >
                Relinquish Control
            </button>
        </div>
    );
}*/
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
        root.render(<PopupContent selected={selected}/>);

        // 2) Create & open the Leaflet popup
        const popup = L.popup({
            autoClose:    false,
            closeOnClick: false,
            autoPan:      false,
            className:    'control-popup',
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
