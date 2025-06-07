// CanvasOverlay.tsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface AcData {
    id:        string;
    lat:       number;
    lon:       number;
    alt:       number;
    trk:       number;  // degrees, 0 = north/up
}
interface NavPoint {
    id:   string;
    lat:  number;
    lon:  number;
    name: string;
}

export function CanvasOverlay({ points, navPoints }: { points: AcData[], navPoints: NavPoint[]; }) {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement>();
    const ptsRef = useRef<AcData[]>([]);
    const drawRef = useRef<() => void>();
    const navRef   = useRef<NavPoint[]>([]);
    useEffect(() => {
        ptsRef.current = points;
        if (drawRef.current) {
            drawRef.current();
        }
    }, [points]);
    useEffect(() => {
        navRef.current = navPoints;
        drawRef.current?.();
    }, [navPoints]);

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
            const navPx     = 1;
            const sqrt3     = Math.sqrt(3);

            for (const pt of ptsRef.current) {
                // compute pixel coords relative to the NW corner
                const origin = map.latLngToLayerPoint([pt.lat, pt.lon])
                    .subtract(topLeft);

                const sizePx = basePx * scale;
                const rad    = (pt.trk * Math.PI) / 180;
                ctx.save();
                // draw arrow
                ctx.translate(origin.x, origin.y);
                ctx.rotate(rad);
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
                const lines = [
                    pt.id,
                    `HDG:${Math.round(pt.trk)}`,
                    `SPD:${Math.round(0)}`,
                    `ALT:${Math.round(pt.alt)}`,
                ];
                ctx.font          = '12px sans-serif';
                ctx.textAlign     = 'left';
                ctx.textBaseline  = 'top';      // so we can stack downward
                ctx.fillStyle     = 'black';

                // compute starting text position just NW of arrow base
                const textX = origin.x - sizePx * 0.5;
                const textY = origin.y + sizePx * 0.6; // slightly below arrow

                // draw each line
                lines.forEach((line, i) => {
                    ctx.fillText(line, textX, textY + i * 14);
                });
                // draw label top-left of arrow origin
            }

            for (const np of navRef.current) {
                const origin = map.latLngToLayerPoint([np.lat, np.lon])
                    .subtract(topLeft);

                const size   = navPx * scale;
                const height = size * (sqrt3 / 2);
                ctx.beginPath();
                ctx.moveTo(origin.x, origin.y - height);
                ctx.lineTo(origin.x - size / 2, origin.y + height / 2);
                ctx.lineTo(origin.x + size / 2, origin.y + height / 2);
                ctx.closePath();
                ctx.fillStyle   = 'green';
                ctx.strokeStyle = 'darkgreen';
                ctx.lineWidth   = 1;
                ctx.fill();
                ctx.stroke();
            }
        };
        drawRef.current = draw;

        // 3) Redraw on pan, zoom, or resize
        map.on('move zoomend resize', draw);

        // initial draw
        draw();

        return () => {
            map.off('move zoomend resize', draw);
            map.getPanes().overlayPane.removeChild(canvas);
        };
    }, [map]);

    return null;
}
