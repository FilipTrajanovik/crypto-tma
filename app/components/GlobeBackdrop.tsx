"use client";

import { useEffect, useRef } from "react";

// Purely decorative: a slowly rotating dotted globe with fixed city markers,
// curved light trails and orbital rings. It does not represent real
// transactions or live network activity.

type Pt = [number, number]; // [lon, lat] degrees

// Coarse continent outlines, only used to place the dotted land mass.
const LAND: Pt[][] = [
  // North America
  [[-168, 66], [-140, 70], [-95, 72], [-80, 68], [-62, 58], [-55, 48], [-70, 42], [-76, 35], [-81, 25], [-97, 26], [-105, 22], [-118, 32], [-124, 42], [-125, 50], [-140, 59], [-165, 60]],
  // Central America
  [[-105, 22], [-97, 19], [-88, 16], [-83, 10], [-78, 8], [-80, 11], [-87, 14], [-95, 17]],
  // Greenland
  [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 76]],
  // South America
  [[-78, 8], [-62, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-66, -46], [-72, -52], [-74, -40], [-71, -18], [-81, -5]],
  // Eurasia
  [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 56], [20, 60], [28, 70], [60, 69], [90, 76], [120, 73], [160, 70], [180, 66], [170, 60], [140, 52], [142, 46], [130, 42], [122, 38], [122, 30], [110, 20], [106, 10], [100, 2], [98, 14], [92, 22], [80, 14], [77, 8], [72, 20], [66, 25], [56, 26], [50, 30], [45, 13], [36, 28], [34, 32], [28, 36], [22, 38], [12, 44], [5, 43], [-5, 36]],
  // Africa
  [[-17, 21], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -5], [40, -16], [33, -26], [20, -35], [14, -22], [12, -5], [8, 4], [-8, 4], [-17, 14]],
  // Australia
  [[114, -22], [130, -12], [142, -11], [153, -26], [147, -38], [135, -35], [115, -34]],
  // British Isles
  [[-6, 50], [1, 51], [-2, 58], [-6, 57]],
  // Japan
  [[130, 32], [141, 36], [142, 44], [140, 40]],
  // Indonesia
  [[95, 5], [106, -6], [120, -8], [140, -8], [138, -3], [120, 0], [105, 2]],
];

const CITIES: Pt[] = [
  [-74, 40.7], // New York
  [-0.1, 51.5], // London
  [8.7, 50.1], // Frankfurt
  [55.3, 25.2], // Dubai
  [103.8, 1.35], // Singapore
  [139.7, 35.7], // Tokyo
  [151.2, -33.9], // Sydney
  [-46.6, -23.5], // Sao Paulo
  [28, -26.2], // Johannesburg
  [-122.4, 37.8], // San Francisco
];
const LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [3, 4],
  [4, 5],
  [0, 9],
  [0, 7],
  [2, 8],
  [5, 6],
];

function inPoly(lon: number, lat: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

type V3 = [number, number, number];
const RAD = Math.PI / 180;
const toVec = (lon: number, lat: number): V3 => [
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
];

function buildLand(): V3[] {
  const dots: V3[] = [];
  for (let lat = -80; lat <= 84; lat += 2.0) {
    const step = 2.0 / Math.max(Math.cos(lat * RAD), 0.2);
    for (let lon = -180; lon < 180; lon += step) {
      if (LAND.some((p) => inPoly(lon, lat, p))) dots.push(toVec(lon, lat));
    }
  }
  return dots;
}

const SIZE = 600;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 190;
const TILT = 22 * RAD;

export default function GlobeBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const land = buildLand();
    const cities = CITIES.map(([lon, lat]) => ({ lon, lat, v: toVec(lon, lat) }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    // rotate a unit vector so that the view-centre longitude is `theta`, then tilt
    const view = (v: V3, theta: number, scale = 1): V3 => {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const x1 = v[0] * c - v[2] * s;
      const z1 = v[0] * s + v[2] * c;
      const y2 = v[1] * cosT - z1 * sinT;
      const z2 = v[1] * sinT + z1 * cosT;
      return [x1 * scale, y2 * scale, z2 * scale];
    };
    const px = (p: V3): [number, number] => [CX + p[0] * R, CY - p[1] * R];
    const visible = (p: V3) => p[2] >= 0 || p[0] * p[0] + p[1] * p[1] > 1;

    const arc = (a: V3, b: V3, t: number): V3 => {
      const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      const w = Math.acos(dot);
      const sw = Math.sin(w) || 1;
      const k1 = Math.sin((1 - t) * w) / sw;
      const k2 = Math.sin(t * w) / sw;
      const lift = 1 + 0.22 * Math.sin(Math.PI * t) * Math.min(1, w / 1.2);
      return [(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift];
    };

    const ring = (rx: number, ry: number, rot: number, front: boolean, alpha: number) => {
      ctx.beginPath();
      ctx.ellipse(CX, CY, rx, ry, rot, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = `rgba(16,217,192,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = (time: number) => {
      const t = time / 1000;
      const theta = -0.3 - t * 0.09;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // atmosphere
      const halo = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.5);
      halo.addColorStop(0, "rgba(22,139,255,0.28)");
      halo.addColorStop(0.45, "rgba(22,139,255,0.08)");
      halo.addColorStop(1, "rgba(22,139,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // back half of orbital rings
      ring(R * 1.5, R * 0.46, -0.42, false, 0.16);
      ring(R * 1.28, R * 1.28 * 0.3, 0.3, false, 0.1);

      // sphere body
      const body = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.4, R * 0.1, CX, CY, R);
      body.addColorStop(0, "#14406f");
      body.addColorStop(0.55, "#0a2548");
      body.addColorStop(1, "#071426");
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // graticule
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(92,179,255,0.13)";
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = view(toVec(lon, lat), theta);
          if (p[2] < 0) {
            pen = false;
            continue;
          }
          const [x, y] = px(p);
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const p = view(toVec(lon, lat), theta);
          if (p[2] < 0) {
            pen = false;
            continue;
          }
          const [x, y] = px(p);
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
      }

      // land dots
      for (const v of land) {
        const p = view(v, theta);
        if (p[2] <= 0.02) continue;
        const [x, y] = px(p);
        // light from the upper left: lit side bright, far limb falls into shadow
        const lit = Math.max(0, (-p[0] * 0.45 + p[1] * 0.4 + p[2] * 0.8) / 1.1);
        const a = 0.18 + 0.82 * Math.pow(lit, 0.8);
        ctx.fillStyle = `rgba(${130 + lit * 90},${200 + lit * 40},255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + p[2] * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // rim light
      const rim = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
      rim.addColorStop(0, "rgba(22,139,255,0)");
      rim.addColorStop(1, "rgba(92,179,255,0.35)");
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.strokeStyle = "rgba(92,179,255,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // soft specular highlight
      const spec = ctx.createRadialGradient(CX - R * 0.42, CY - R * 0.46, 0, CX - R * 0.42, CY - R * 0.46, R * 0.7);
      spec.addColorStop(0, "rgba(160,215,255,0.16)");
      spec.addColorStop(1, "rgba(160,215,255,0)");
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // light trails between fixed city markers
      LINKS.forEach(([ai, bi], i) => {
        const a = cities[ai].v;
        const b = cities[bi].v;
        const head = reduced ? 0.55 : (t * 0.12 + i * 0.37) % 1;
        const N = 36;
        let prev: V3 | null = null;
        for (let s = 0; s <= N; s++) {
          const u = s / N;
          const p = view(arc(a, b, u), theta);
          if (prev && visible(p) && visible(prev)) {
            const [x0, y0] = px(prev);
            const [x1, y1] = px(p);
            const d = (head - u + 1) % 1; // distance behind the head
            const glow = d < 0.22 ? 1 - d / 0.22 : 0;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = glow > 0 ? `rgba(16,217,192,${0.25 + glow * 0.75})` : "rgba(16,217,192,0.22)";
            ctx.lineWidth = glow > 0 ? 1 + glow * 1.2 : 0.8;
            ctx.stroke();
          }
          prev = p;
        }
      });

      // city markers
      cities.forEach((c, i) => {
        const p = view(c.v, theta);
        if (p[2] <= 0.05) return;
        const [x, y] = px(p);
        const pulse = reduced ? 0.5 : (Math.sin(t * 1.6 + i) + 1) / 2;
        ctx.beginPath();
        ctx.arc(x, y, 3 + pulse * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,217,192,${0.22 - pulse * 0.16})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#10d9c0";
        ctx.fill();
      });

      // front half of orbital rings + gold satellite
      ring(R * 1.5, R * 0.46, -0.42, true, 0.5);
      ring(R * 1.28, R * 1.28 * 0.3, 0.3, true, 0.3);
      const ang = reduced ? 1.1 : t * 0.35;
      const sx = Math.cos(ang) * R * 1.5;
      const sy = Math.sin(ang) * R * 0.46;
      const rot = -0.42;
      const X = CX + sx * Math.cos(rot) - sy * Math.sin(rot);
      const Y = CY + sx * Math.sin(rot) + sy * Math.cos(rot);
      const front = Math.sin(ang) > 0;
      const behindGlobe = !front && (X - CX) ** 2 + (Y - CY) ** 2 < R * R;
      if (!behindGlobe) {
        ctx.beginPath();
        ctx.arc(X, Y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245,199,107,0.25)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(X, Y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "#f5c76b";
        ctx.fill();
      }
    };

    if (reduced) {
      draw(0);
      return;
    }

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 33) return; // ~30fps is plenty
      last = now;
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none select-none aspect-square ${className}`}
    />
  );
}
