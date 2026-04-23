"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ALLOWED_MARCAS } from "@/lib/dgeg";

interface Distrito  { Id: number; Descritivo: string; }
interface Municipio { Id: number; Descritivo: string; }

export interface FilterValues {
  fuelId:      string;
  idDistrito:  string;
  idMunicipio: string;
  marcaId:     string;
  search:      string;
}

interface Props {
  onChange:       (f: FilterValues) => void;
  onSearch:       (f: FilterValues) => void;
  loading:        boolean;
  total:          number;
  currentFuelId:  string;
  distritoAtivo:  string;
  municipioAtivo: string;
  cheapestPrice?: number | null;
}

export default function FilterPanel({
  onChange, onSearch, loading, total,
  currentFuelId, distritoAtivo, municipioAtivo, cheapestPrice,
}: Props) {
  const { dark } = useTheme();
  const [distritos,   setDistritos]   = useState<Distrito[]>([]);
  const [municipios,  setMunicipios]  = useState<Municipio[]>([]);
  const [idDistrito,  setIdDistrito]  = useState("");
  const [idMunicipio, setIdMunicipio] = useState("");
  const [marcaId,     setMarcaId]     = useState("");

  const [litros,    setLitros]    = useState(50);
  const [precoCalc, setPrecoCalc] = useState("");
  const precoNum  = parseFloat(precoCalc) || cheapestPrice || 0;
  const totalCalc = precoNum > 0 ? (precoNum * litros).toFixed(2) : null;

  const monoColor = dark ? "#ffffff" : "#000000";

  // ── Sincronização com props externas (mapa → FilterPanel) ──

  useEffect(() => {
    if (!precoCalc && cheapestPrice) setPrecoCalc(cheapestPrice.toFixed(3));
  }, [cheapestPrice]);

  // 1. Quando o distrito muda externamente (clique no mapa)
  useEffect(() => {
    if (distritoAtivo === idDistrito) return;
    setIdDistrito(distritoAtivo);
    setIdMunicipio(""); // reset concelho ao mudar distrito
  }, [distritoAtivo]);

  // 2. Quando o concelho muda externamente (clique no mapa)
  useEffect(() => {
    if (municipioAtivo === idMunicipio) return;
    setIdMunicipio(municipioAtivo);
  }, [municipioAtivo]);

  // 3. Quando os municípios carregam de forma assíncrona e há um municipioAtivo à espera
  //    (essencial em mobile — o fetch pode demorar mais que a propagação do estado)
  useEffect(() => {
    if (!municipioAtivo || municipios.length === 0) return;
    const existe = municipios.some((m: Municipio) => String(m.Id) === municipioAtivo);
    if (existe) setIdMunicipio(municipioAtivo);
  }, [municipios, municipioAtivo]);

  const vals = useCallback(
    (ov: Partial<FilterValues> = {}): FilterValues =>
      ({ fuelId: currentFuelId, idDistrito, idMunicipio, marcaId, search: "", ...ov }),
    [currentFuelId, idDistrito, idMunicipio, marcaId]
  );

  useEffect(() => {
    fetch("/api/distritos").then(r => r.json()).then(d => setDistritos(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!idDistrito) { setMunicipios([]); return; }
    fetch(`/api/municipios?id=${idDistrito}`)
      .then(r => r.json()).then(d => setMunicipios(d.data ?? []));
  }, [idDistrito]);

  function handleDistritoChange(v: string) {
    setIdDistrito(v); setIdMunicipio("");
    onChange(vals({ idDistrito: v, idMunicipio: "" }));
  }
  function handleMunicipioChange(v: string) {
    setIdMunicipio(v);
    onChange(vals({ idMunicipio: v }));
  }
  function handleMarcaChange(v: string) {
    setMarcaId(v);
    onChange(vals({ marcaId: v }));
  }
  function handleReset() {
    setIdDistrito(""); setIdMunicipio(""); setMarcaId("");
    setPrecoCalc("");
    onChange({ fuelId: currentFuelId, idDistrito: "", idMunicipio: "", marcaId: "", search: "" });
  }

  return (
    <aside style={{
      display: "flex", flexDirection: "column", gap: "0.5rem",
      position: "sticky", top: 72,
      maxHeight: "calc(100vh - 80px)", overflowY: "auto", paddingBottom: "0.5rem",
    }}>

      {/* Filtros */}
      <div className="card" style={{ padding: "0.875rem",
        display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Filtros</p>

        <div>
          <label className="field-label">Distrito</label>
          <select value={idDistrito} onChange={e => handleDistritoChange(e.target.value)}
            className="field-input">
            <option value="">Todos</option>
            {distritos.map(d =>
              <option key={d.Id} value={String(d.Id)}>{d.Descritivo}</option>
            )}
          </select>
        </div>

        <div>
          <label className="field-label">Concelho</label>
          <select
            value={idMunicipio}
            onChange={e => handleMunicipioChange(e.target.value)}
            disabled={!municipios.length}
            className="field-input"
            style={{ opacity: municipios.length ? 1 : 0.45 }}>
            <option value="">Todos</option>
            {municipios.map(m =>
              <option key={m.Id} value={String(m.Id)}>{m.Descritivo}</option>
            )}
          </select>
        </div>

        <div>
          <label className="field-label">Marca</label>
          <select value={marcaId} onChange={e => handleMarcaChange(e.target.value)}
            className="field-input">
            <option value="">Todas</option>
            {ALLOWED_MARCAS.map(m =>
              <option key={m.id} value={m.id}>{m.nome}</option>
            )}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => onSearch(vals())}
            className="btn-primary"
            style={{
              background: monoColor,
              color: dark ? "#000000" : "#ffffff",
              borderColor: monoColor,
            }}
          >
            Pesquisar
          </button>
          <button type="button" onClick={handleReset} className="btn-ghost">
            Limpar
          </button>
        </div>
      </div>

      {/* Calculadora — escondida em mobile via CSS */}
      <div className="calc-sidebar">
        <div className="card" style={{ padding: "0.875rem",
          display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Calculadora</p>

          <div>
            <label className="field-label">Preço (€/L)</label>
            <input
              type="number" step="0.001" min="0" max="5"
              value={precoCalc}
              onChange={e => setPrecoCalc(e.target.value)}
              placeholder={cheapestPrice ? cheapestPrice.toFixed(3) : "0.000"}
              className="field-input"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "0.3rem" }}>
              <label className="field-label" style={{ marginBottom: 0 }}>Litros</label>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color: monoColor }}>
                {litros} L
              </span>
            </div>
            <input
              type="range" min="5" max="100" step="5"
              value={litros}
              onChange={e => setLitros(Number(e.target.value))}
              style={{ width: "100%", accentColor: monoColor, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="text-muted" style={{ fontSize: "0.6rem" }}>5 L</span>
              <span className="text-muted" style={{ fontSize: "0.6rem" }}>100 L</span>
            </div>
          </div>

          <div style={{
            background: "var(--bg-input)", borderRadius: "0.6rem",
            padding: "0.65rem 0.875rem", textAlign: "center",
            border: "1px solid var(--border)",
          }}>
            {totalCalc ? (
              <>
                <p style={{ fontWeight: 800, fontSize: "1.4rem",
                  color: monoColor, lineHeight: 1 }}>
                  {totalCalc} €
                </p>
                <p className="text-muted" style={{ fontSize: "0.62rem", marginTop: "0.2rem" }}>
                  {litros} L × {precoNum.toFixed(3)} €/L
                </p>
              </>
            ) : (
              <p className="text-muted" style={{ fontSize: "0.72rem" }}>
                Insira um preço ou pesquise postos
              </p>
            )}
          </div>
        </div>
      </div>

    </aside>
  );
}