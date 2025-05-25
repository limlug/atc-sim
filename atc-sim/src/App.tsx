import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { listen } from '@tauri-apps/api/event';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, useMapEvent } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CanvasArrows } from './CanvasArrow';
import { CanvasOverlay } from './CanvasOverlay';
interface AcData {
    id:   string;
    lat:  number;
    lon:  number;
    alt:  number;
    trk:  number;
}

function App() {
  //const [greetMsg, setGreetMsg] = useState("");
  //const [name, setName] = useState("");
  const [points, setPoints] = useState<AcData[]>([]);
  const [lastCenter] = useState<[number, number]>([0, 0]);
  const [selected, setSelected] = useState<AcData | null>(null);
  //async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //  setGreetMsg(await invoke("greet", { name }));
  //}
    useEffect(() => {
        // listen for “acdata” events from Tauri
        let unlisten: () => void;
        (async () => {
            unlisten = await listen<AcData[]>('acdata', event => {
                    setPoints(event.payload);
                });
        })();
        return () => {
            unlisten?.();
        };
    }, []);


    // 2. Install click handler on the map
    function ClickHandler() {
        useMapEvent('click', (e) => {
            const map = e.target as L.Map;
            const clickPt = map.latLngToContainerPoint(e.latlng);

            // parameters must match your CanvasOverlay
            const basePx = 5;
            const scale  = Math.pow(2, map.getZoom() / 4);
            const sizePx = basePx * scale;
            const perp   = Math.PI / 2;

            // test each plane
            for (const pt of points) {
                const rad = (pt.trk * Math.PI) / 180;
                const origin = map.latLngToContainerPoint([pt.lat, pt.lon]);

                // compute the three corners of the arrow in container pixels
                const tip = {
                    x: origin.x + Math.sin(rad) * sizePx,
                    y: origin.y - Math.cos(rad) * sizePx,
                };
                const left = {
                    x: origin.x + Math.sin(rad + perp) * sizePx * 0.4,
                    y: origin.y - Math.cos(rad + perp) * sizePx * 0.4,
                };
                const right = {
                    x: origin.x + Math.sin(rad - perp) * sizePx * 0.4,
                    y: origin.y - Math.cos(rad - perp) * sizePx * 0.4,
                };

                // point-in-triangle test
                const sign = (p: L.Point, a: L.Point, b: L.Point) =>
                    (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);

                const b1 = sign(clickPt, tip as any, left as any) < 0;
                const b2 = sign(clickPt, left as any, right as any) < 0;
                const b3 = sign(clickPt, right as any, tip as any) < 0;

                if (b1 === b2 && b2 === b3) {
                    setSelected(pt);
                    return;
                }
            }
            // if none hit, deselect
            setSelected(null);
        });
        return null;
    }
    const center: LatLngExpression = lastCenter[0] === 0 && lastCenter[1] === 0
        ? [53.4267, 6.2808]  // default view
        : lastCenter;


    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100vh', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
            />
            <CanvasOverlay points={points} />

            <ClickHandler />
            {selected && (
                <Popup
                     key={selected.id}               // keeps React from remounting it on points updates
                     position={[selected.lat, selected.lon]}
                     onClose={() => setSelected(null)}
                     // Leaflet options to keep it open through pans/zooms/map redraws:
                     autoClose={false}
                     closeOnClick={false}
                     autoPan={false}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <strong>{selected.id}</strong>
                        <button
                            onClick={async () => {
                                // example Tauri invoke
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
                </Popup>
            )}
        </MapContainer>
    );
}

export default App;
