"use client";
import { useEffect, useRef, useState } from "react";

/** Signature au doigt (ou à la souris) : renvoie une image PNG (data URL), ou null si la zone est vide. */
export default function SignaturePad({ onChange, btnClass, height = 170 }: { onChange: (png: string | null) => void; btnClass?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false); const last = useRef<[number, number] | null>(null); const mid = useRef<[number, number] | null>(null); const ink = useRef(0);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * ratio; cv.height = h * ratio;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  }, []);

  const pos = (e: { clientX: number; clientY: number }, cv: HTMLCanvasElement): [number, number] => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; last.current = mid.current = pos(e, e.currentTarget); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return; e.preventDefault();
    const cv = e.currentTarget; const ctx = cv.getContext("2d"); if (!ctx) return;
    // Points intermédiaires (si le navigateur les fournit) + courbes par les milieux : trait lisse, sans angles.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const p = pos(ev, cv); const l = last.current; const m0 = mid.current ?? l;
      const m: [number, number] = [(l[0] + p[0]) / 2, (l[1] + p[1]) / 2];
      ctx.beginPath(); ctx.moveTo(...m0); ctx.quadraticCurveTo(l[0], l[1], m[0], m[1]); ctx.stroke();
      ink.current += Math.hypot(p[0] - l[0], p[1] - l[1]); last.current = p; mid.current = m;
    }
  };
  const up = () => {
    if (!drawing.current) return; drawing.current = false;
    const ctx = ref.current?.getContext("2d");
    if (ctx && last.current && mid.current) { ctx.beginPath(); ctx.moveTo(...mid.current); ctx.lineTo(...last.current); ctx.stroke(); }
    last.current = null; mid.current = null;
    // Un vrai tracé (pas un simple point) : au moins ~40 px d'encre.
    const ok = ink.current > 40; setEmpty(!ok); onChange(ok && ref.current ? ref.current.toDataURL("image/png") : null);
  };
  const clear = () => {
    const cv = ref.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore();
    ink.current = 0; setEmpty(true); onChange(null);
  };

  return <div style={{ display: "grid", gap: 6 }}>
    <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      style={{ width: "100%", height, border: "2px dashed #c9c2b6", borderRadius: 12, background: "#fff", touchAction: "none", cursor: "crosshair", userSelect: "none", WebkitUserSelect: "none" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <small style={{ color: "#666" }}>{empty ? "Signez avec le doigt dans le cadre." : "✅ Signature enregistrée."}</small>
      <button type="button" className={btnClass} style={{ padding: "6px 12px" }} onClick={clear}>Effacer</button>
    </div>
  </div>;
}
