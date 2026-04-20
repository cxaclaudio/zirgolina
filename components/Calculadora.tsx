"use client";
import { useState, useEffect } from "react";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export default function Calculadora({ defaultPrice = 1.76 }: { defaultPrice?: number }) {
  const [litros, setLitros] = useState(40);
  const [preco,  setPreco]  = useState(defaultPrice);

  useEffect(() => { setPreco(defaultPrice); }, [defaultPrice]);

  return (
    <div className="card p-4 space-y-3">
      <p className="font-display font-bold text-sm">⛽ Calculadora</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Litros</label>
          <input type="number" min={1} max={200} step={1} value={litros}
            onChange={e => setLitros(Number(e.target.value))} className="field-input text-center" />
          <input type="range" min={1} max={100} step={1} value={litros}
            onChange={e => setLitros(Number(e.target.value))}
            className="w-full mt-1.5" style={{ accentColor:"var(--accent)" }} />
        </div>
        <div>
          <label className="field-label">€ / Litro</label>
          <input type="number" min={0.5} max={3} step={0.001} value={preco.toFixed(3)}
            onChange={e => setPreco(Number(e.target.value))} className="field-input text-center" />
          <input type="range" min={1} max={2.5} step={0.001} value={preco}
            onChange={e => setPreco(Number(e.target.value))}
            className="w-full mt-1.5" style={{ accentColor:"var(--accent)" }} />
        </div>
      </div>

      <div className="rounded-xl p-3.5 flex items-center justify-between"
        style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)" }}>
        <div>
          <p className="field-label mb-0.5">Total estimado</p>
          <p className="font-display font-extrabold text-accent" style={{ fontSize:"1.7rem" }}>
            {EURO.format(litros * preco)}
          </p>
        </div>
        <div className="text-right text-muted" style={{ fontSize:"0.72rem" }}>
          <p>{litros} L × {preco.toFixed(3)} €/L</p>
          <p className="mt-0.5">≈ {EURO.format(preco * 10)} por 10 L</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[20, 30, 40, 50, 60, 80].map(l => (
          <button key={l} type="button" onClick={() => setLitros(l)}
            className={`chip ${litros === l ? "active" : ""}`}>{l} L</button>
        ))}
      </div>
    </div>
  );
}