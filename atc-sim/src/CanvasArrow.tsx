// CanvasArrows.tsx
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface AcData {
    id:        string;
    lat:       number;
    lon:       number;
    direction: number;  // degrees, 0 = north/up
}

/**
 * React component that attaches a single canvas to the map,
 * and draws arrows + labels into it.
 */
export function CanvasArrows({ points }: { points: AcData[] }) {
    const map = useMap();

    useEffect(() => {
        // 1) Create a Leaflet canvas renderer and add it to the map
        const canvasLayer = L.canvas({ padding: 0.5 }).addTo(map);

        // 2) The draw function
        const draw = () => {
            const ctx = (canvasLayer as any)._ctx as CanvasRenderingContext2D;
            if (!ctx) return;
            const sizeFactor = Math.pow(2, map.getZoom() / 4); // scale with zoom
            const basePx = 20;                                 // base arrow length in px

            // clear
            const canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const pt of points) {
                // screen-pixel origin of this geo-point
                const origin = map.latLngToLayerPoint([pt.lat, pt.lon]);
                const sizePx = basePx * sizeFactor;
                const rad    = (pt.direction * Math.PI) / 180;
                const perp   = Math.PI / 2;

                // compute the three corners in pixel space
                const tip = origin.add(
                    new L.Point(Math.sin(rad) * sizePx, -Math.cos(rad) * sizePx)
                );
                const left = origin.add(
                    new L.Point(
                        Math.sin(rad + perp) * sizePx * 0.4,
                        -Math.cos(rad + perp) * sizePx * 0.4
                    )
                );
                const right = origin.add(
                    new L.Point(
                        Math.sin(rad - perp) * sizePx * 0.4,
                        -Math.cos(rad - perp) * sizePx * 0.4
                    )
                );

                // draw triangle
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(left.x, left.y);
                ctx.lineTo(right.x, right.y);
                ctx.closePath();
                ctx.fillStyle   = 'blue';
                ctx.strokeStyle = 'navy';
                ctx.lineWidth   = 1;
                ctx.fill();
                ctx.stroke();

                // draw label
                ctx.font      = '12px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = 'black';
                // offset the text slightly to top-left of origin
                const textX = origin.x - sizePx * 0.5;
                const textY = origin.y - sizePx * 0.2;
                ctx.fillText(pt.id, textX, textY);
            }
        };

        // 3) Hook into map events
        map.on('zoomend move resize', draw);

        // initial draw
        draw();

        return () => {
            map.off('zoomend move resize', draw);
            map.removeLayer(canvasLayer);
        };
    }, [map, points]);

    return null;
}
