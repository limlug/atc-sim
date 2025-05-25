import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { listen } from '@tauri-apps/api/event';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
import React, { useEffect, useState } from 'react';
import {MapContainer, TileLayer, Marker, useMap, Tooltip, Popup} from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CanvasArrows } from './CanvasArrows';

interface AcData {
    id:   string;
    lat:  number;
    lon:  number;
    alt:  number;
    trk:  number;
}


function createArrowIcon(angle: number) {
    return new DivIcon({
        className: '',
        html: `<div class="arrow-marker" style="transform: rotate(${angle}deg)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 0],
    });
}

function App() {
  //const [greetMsg, setGreetMsg] = useState("");
  //const [name, setName] = useState("");
  const [points, setPoints] = useState<AcData[]>([]);
  const [lastCenter] = useState<[number, number]>([0, 0]);
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


            {points.map(({ id, lat, lon, alt, trk }) => (
                <Marker key={id} position={[lat, lon]} icon={createArrowIcon(trk)}>
                    <Tooltip
                        direction="top"
                        permanent
                        offset={[-5, -5]}
                        opacity={1}
                        className="id-label"
                    >
                        {id}/{trk.toFixed(0) }/{alt.toFixed(0) }
                    </Tooltip>

                    <Popup>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <strong>{id}</strong>

                            {/* Example button: invoke a Tauri command */}
                            <button
                                onClick={async () => {
                                    try {
                                        const response: string = await invoke('greet', { name: id });
                                        console.log('Greet response:', response);
                                    } catch (e) {
                                        console.error('invoke error', e);
                                    }
                                }}
                            >
                                Say Hello
                            </button>

                            {/* You can add more buttons here */}
                            <button
                                onClick={() => {
                                    // do something else with pt.id
                                    alert(`You clicked action for ${id}`);
                                }}
                            >
                                Other Action
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default App;
