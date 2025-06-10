import "./css/App.css";
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMapEvent } from 'react-leaflet';
import type {LatLngExpression, LeafletMouseEvent} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CanvasOverlay } from './CanvasOverlay';
import {PopupManager} from "./PopupManager.tsx";
import { invoke } from "@tauri-apps/api/core";
import {AcData} from "./interfaces/acdata.tsx";
import {NavPoint} from "./interfaces/navpoint.tsx";


function App() {
  const [points, setPoints] = useState<AcData[]>([]);
  const [navPoints, setNavPoints] = useState<NavPoint[]>([]);
  const [lastCenter] = useState<[number, number]>([0, 0]);
  const [selected, setSelected] = useState<AcData | null>(null);

  useEffect(() => {
    (async () => {
        try {
            const np: NavPoint[] = await invoke('get_nav_points');
            setNavPoints(np);
        } catch (err) {
            console.error('Failed to load nav points:', err);
        }
    })();
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
        useMapEvent('click', (e: LeafletMouseEvent) => {
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
        ? [50.039060831, 8.555603027]  // default view
        : lastCenter;


    return (
        <MapContainer
            center={center}
            zoom={10}
            style={{ height: '100vh', width: '100%' }}
        >

            <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://maptiles.p.rapidapi.com/en/map/v1/{z}/{x}/{y}.png"
            />
            <CanvasOverlay points={points} navPoints={navPoints} runways={[
                [[50.032624432, 8.534617424], [50.045151875, 8.586845398]],
                [[50.027648379, 8.534231186], [50.040135777, 8.586330414]],
                [[50.034071663, 8.525862694], [49.998636419, 8.526291847]],
                [[50.037131380, 8.497066498], [50.045840858, 8.533630371]]
            ]}/>

            <ClickHandler />
            <PopupManager selected={selected} />
        </MapContainer>
    );
}

export default App;
