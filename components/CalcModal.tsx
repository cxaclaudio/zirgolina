"use client";
import { useState, useEffect, useRef } from "react";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPrice?: number;
}

export default function CalcModal({ open, onClose, defaultPrice = 1.76 }: Props) {
  const [litros, setLitros] = useState(40);
  const [preco,  setPreco]  = useState(defaultPrice);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setPreco(defaultPrice); }, [defaultPrice]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
      padding: "3.5rem 1.5rem 0 0",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="card" style={{
        width: 340, padding: "1.25rem", boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        animation: "fadeIn 0.15s ease",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
          <p style={{ fontWeight:700, fontSize:"0.88rem" }}>Calculadora</p>
          <button onClick={onClose} className="btn-ghost"
            style={{ padding:"0.2rem 0.5rem", fontSize:"0.9rem", lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
          <div>
            <label className="field-label">Litros</label>
            <input type="number" min={1} max={200} step={1} value={litros}
              onChange={e => setLitros(Number(e.target.value))} className="field-input text-center" />
            <input type="range" min={1} max={100} step={1} value={litros}
              onChange={e => setLitros(Number(e.target.value))}
              style={{ width:"100%", marginTop:"0.4rem", accentColor:"var(--accent)" }} />
          </div>
          <div>
            <label className="field-label">€ / Litro</label>
            <input type="number" min={0.5} max={3} step={0.001} value={preco.toFixed(3)}
              onChange={e => setPreco(Number(e.target.value))} className="field-input text-center" />
            <input type="range" min={1} max={2.5} step={0.001} value={preco}
              onChange={e => setPreco(Number(e.target.value))}
              style={{ width:"100%", marginTop:"0.4rem", accentColor:"var(--accent)" }} />
          </div>
        </div>

        <div style={{
          marginTop:"0.875rem", borderRadius:"0.75rem", padding:"0.875rem",
          background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <p className="field-label" style={{ marginBottom:2 }}>Total estimado</p>
            <p style={{ fontWeight:800, fontSize:"1.6rem", color:"var(--accent)", lineHeight:1 }}>
              {EURO.format(litros * preco)}
            </p>
          </div>
          <div style={{ textAlign:"right", fontSize:"0.7rem", color:"var(--text-muted)" }}>
            <p>{litros} L × {preco.toFixed(3)} €/L</p>
            <p style={{ marginTop:2 }}>{EURO.format(preco * 10)} / 10 L</p>
          </div>
        </div>

        <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap", marginTop:"0.75rem" }}>
          {[20, 30, 40, 50, 60, 80].map(l => (
            <button key={l} type="button" onClick={() => setLitros(l)}
              className={`chip ${litros === l ? "active" : ""}`}>{l} L</button>
          ))}
        </div>
      </div>
    </div>
  );
}