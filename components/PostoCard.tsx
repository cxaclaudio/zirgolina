"use client";
import { useState } from "react";
import type { Posto } from "@/lib/dgeg";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface Props {
  posto: Posto;
  tipoAtivo?: "gasolina" | "gasoleo" | "gpl" | null;
  precoDestaque?: number | null;
}

const GASOLINA_TIPOS = [
  "gasolina simples 95", "gasolina especial 95", "gasolina especial",
  "gasolina simples", "gasolina 98", "gasolina",
];
const GASOLEO_EXCLUIR = /(agr[ií]col|biodiesel|b[0-9]+|colorid|aditivad)/i;
const GASOLEO_TIPOS   = ["gasóleo simples", "gasoleo simples", "gasóleo especial", "gasoleo especial", "gasóleo", "gasoleo"];
const GPL_TIPOS       = ["gpl"];

function getPrecoDestaque(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): number | null {
  const tipos =
    tipo === "gasolina" ? GASOLINA_TIPOS :
    tipo === "gasoleo"  ? GASOLEO_TIPOS  : GPL_TIPOS;
  const comb = posto.combustiveis?.find((c: any) => {
    const t = c.tipo?.toLowerCase() ?? "";
    if (tipo === "gasoleo" && GASOLEO_EXCLUIR.test(t)) return false;
    return tipos.some(k => t.includes(k));
  });
  return (comb as any)?.preco ?? null;
}

export default function PostoCard({ posto, tipoAtivo }: Props) {
  const [horarioOpen, setHorarioOpen] = useState(false);

  const horarioLines = posto.horario
    ? posto.horario.split(" · ").map(s => s.trim()).filter(Boolean)
    : [];

  // Preço a destacar: usa tipoAtivo se definido, senão preco principal
  const precoDestaque: number | null = tipoAtivo
    ? getPrecoDestaque(posto, tipoAtivo)
    : posto.preco;

  const precoTexto = precoDestaque != null
    ? `${precoDestaque.toFixed(3)} €/L`
    : posto.precoTexto ?? "—";

  function handleDirecoes(e: React.MouseEvent) {
    e.stopPropagation();
    const url = posto.lat && posto.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [posto.nome, posto.morada, posto.localidade, posto.codPostal].filter(Boolean).join(", ")
        )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="card" style={{ padding:"0.875rem 1rem", fontSize:"0.8rem" }}>

      {/* Linha 1: marca | nome + botão direções */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.75rem" }}>
        <div style={{ minWidth:0 }}>
          <h3 style={{ fontWeight:700, fontSize:"0.85rem", lineHeight:1.3, marginBottom:2 }}>
            <span style={{ color:"var(--accent)" }}>{posto.marca}</span>
            <span style={{ color:"var(--text-muted)", margin:"0 0.3rem" }}>|</span>
            {posto.nome}
          </h3>
          <p className="text-muted" style={{ fontSize:"0.7rem" }}>
            {[posto.morada, posto.localidade, posto.codPostal].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={handleDirecoes}
          title="Abrir no Google Maps"
          style={{
            display:"flex", alignItems:"center", gap:"0.3rem",
            background:"transparent",
            border:"1px solid var(--border)",
            borderRadius:"0.45rem",
            padding:"0.22rem 0.55rem",
            cursor:"pointer",
            color:"var(--text-muted)",
            fontSize:"0.67rem", fontWeight:500,
            whiteSpace:"nowrap", flexShrink:0,
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Direções
        </button>
      </div>

      {/* Preço destaque */}
      <p style={{ fontWeight:800, fontSize:"1.55rem", color:"var(--accent)", lineHeight:1, margin:"0.6rem 0 0.5rem" }}>
        {precoTexto}
      </p>

      {/* Combustíveis */}
      {posto.combustiveis.length > 0 && (
        <div style={{ borderRadius:"0.5rem", overflow:"hidden", border:"1px solid var(--border)", marginBottom:"0.6rem" }}>
          {posto.combustiveis.map((c, i) => (
            <div key={c.tipo} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"0.3rem 0.7rem",
              background: i%2===0 ? "var(--bg-input)" : "transparent",
              borderBottom: i < posto.combustiveis.length-1 ? "1px solid var(--border)" : "none",
            }}>
              <span className="text-muted" style={{ fontSize:"0.7rem" }}>{c.tipo}</span>
              <strong style={{ fontSize:"0.75rem", color:"var(--accent)" }}>{c.texto}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Meta info — sem "Atualizado" */}
      <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap", marginBottom: horarioLines.length ? "0.4rem" : 0 }}>
        {[
          { label:"Localidade",  value: posto.localidade || posto.municipio },
          { label:"Cód. Postal", value: posto.codPostal || "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="field-label" style={{ marginBottom:1 }}>{label}</p>
            <p style={{ fontSize:"0.72rem", fontWeight:500 }}>{value}</p>
          </div>
        ))}

        {/* Horário colapsável */}
        {horarioLines.length > 0 && (
          <div>
            <p className="field-label" style={{ marginBottom:1 }}>Horário</p>
            <button
              onClick={() => setHorarioOpen(o => !o)}
              style={{
                display:"flex", alignItems:"center", gap:"0.3rem",
                background:"none", border:"none", cursor:"pointer",
                fontSize:"0.72rem", fontWeight:500, color:"var(--text)", padding:0,
              }}>
              {horarioOpen ? "Fechar" : "Ver horário"}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ transform: horarioOpen ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {horarioOpen && (
              <div style={{ marginTop:"0.3rem", display:"flex", flexDirection:"column", gap:"0.1rem" }}>
                {horarioLines.map((l, i) => (
                  <p key={i} className="text-muted" style={{ fontSize:"0.7rem" }}>{l}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estimativas 40/50 L — usa precoDestaque */}
      {precoDestaque != null && (
        <p className="text-muted" style={{ fontSize:"0.67rem", marginTop:"0.35rem" }}>
          40 L ≈ <strong style={{ color:"var(--accent)" }}>{EURO.format(precoDestaque * 40)}</strong>
          {" · "}
          50 L ≈ <strong style={{ color:"var(--accent)" }}>{EURO.format(precoDestaque * 50)}</strong>
        </p>
      )}
    </article>
  );
}