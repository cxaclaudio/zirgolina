"use client";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export default function Calculadora({ defaultPrice = 1.76 }: { defaultPrice?: number }) {
  const { dark } = useTheme();
  const [litros, setLitros] = useState(40);
  const [preco,  setPreco]  = useState(defaultPrice);

  const monoColor = dark ? "#ffffff" : "#000000";

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
            className="w-full mt-1.5" style={{ accentColor: monoColor }} />
        </div>
        <div>
          <label className="field-label">€ / Litro</label>
          <input type="number" min={0.5} max={3} step={0.001} value={preco.toFixed(3)}
            onChange={e => setPreco(Number(e.target.value))} className="field-input text-center" />
          <input type="range" min={1} max={2.5} step={0.001} value={preco}
            onChange={e => setPreco(Number(e.target.value))}
            className="w-full mt-1.5" style={{ accentColor: monoColor }} />
        </div>
      </div>

      <div className="rounded-xl p-3.5 flex items-center justify-between"
        style={{
          background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
        }}>
        <div>
          <p className="field-label mb-0.5">Total estimado</p>
          <p style={{ fontWeight:800, fontSize:"1.7rem", color: monoColor, lineHeight:1 }}>
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
            className={`chip ${litros === l ? "active" : ""}`}
            style={litros === l ? {
              background: monoColor,
              color: dark ? "#000000" : "#ffffff",
              borderColor: monoColor,
            } : {}}>
            {l} L
          </button>
        ))}
      </div>
    </div>
  );
}