// CanvasOverlay.tsx
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface AcData {
    id:        string;
    lat:       number;
    lon:       number;
    alt:       number;
    trk:       number;  // degrees, 0 = north/up
}

export function CanvasOverlay({ points }: { points: AcData[] }) {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement>();

    useEffect(() => {
        // 1) Create & append a full-screen canvas in the overlay pane
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top      = '0';
        canvas.style.left     = '0';
        canvas.style.pointerEvents = 'none';  // let mouse events pass through
        canvasRef.current = canvas;
        map.getPanes().overlayPane.appendChild(canvas);

        const ctx = canvas.getContext('2d')!;

        // 2) A single draw() that sizes, positions, and renders everything
        const draw = () => {
            const size = map.getSize();
            const bounds = map.getBounds();
            const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());

            // resize & position the canvas
            canvas.width  = size.x;
            canvas.height = size.y;
            // move it so that layerPoint (0,0) equals the NW of the map
            L.DomUtil.setPosition(canvas, topLeft);

            // clear before drawing
            ctx.clearRect(0, 0, size.x, size.y);

            // choose arrow length in pixels (you can tweak this formula)
            const zoom    = map.getZoom();
            const basePx  = 5;
            const scale   = Math.pow(2, zoom / 4);

            for (const pt of points) {
                // compute pixel coords relative to the NW corner
                const origin = map.latLngToLayerPoint([pt.lat, pt.lon])
                    .subtract(topLeft);
                ctx.save();
                // draw arrow
                ctx.translate(origin.x, origin.y);
                ctx.rotate((pt.trk * Math.PI) / 180);
                const sizePx = basePx * scale;
                ctx.beginPath();
                ctx.moveTo(0, -sizePx);                        // tip
                ctx.lineTo(-sizePx * 0.4,  sizePx * 0.4);      // left
                ctx.lineTo( sizePx * 0.4,  sizePx * 0.4);
                ctx.closePath();
                ctx.fillStyle   = 'blue';
                ctx.strokeStyle = 'navy';
                ctx.lineWidth   = 1;
                ctx.fill();
                ctx.stroke();

                ctx.restore();

                // draw label top-left of arrow origin
                ctx.font          = '12px sans-serif';
                ctx.textAlign     = 'left';
                ctx.textBaseline  = 'bottom';
                ctx.fillStyle     = 'black';
                ctx.fillText(
                    pt.id,
                    origin.x - sizePx * 0.5,
                    origin.y - sizePx * 0.2
                );
            }
        };

        // 3) Redraw on pan, zoom, or resize
        map.on('move zoomend resize', draw);

        // initial draw
        draw();

        return () => {
            map.off('move zoomend resize', draw);
            map.getPanes().overlayPane.removeChild(canvas);
        };
    }, [map, points]);

    return null;
}
