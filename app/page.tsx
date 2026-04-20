"use client";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { getPostos, getMunicipios, type Posto } from "@/lib/dgeg";
import FilterPanel, { type FilterValues } from "@/components/FilterPanel";
import PostoCard from "@/components/PostoCard";
import { useTheme } from "@/components/ThemeProvider";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ width:"100%", height:"100%", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontSize:"0.78rem", color:"var(--text-muted)" }}>
      A carregar mapa…
    </div>
  ),
});

const HEADER_H = 56;

const GASOLINA_TIPOS = [
  "gasolina simples 95", "gasolina especial 95", "gasolina especial",
  "gasolina simples", "gasolina 98", "gasolina",
];
const GASOLEO_EXCLUIR = /(agr[ií]col|biodiesel|b[0-9]+|colorid|aditivad)/i;
const GASOLEO_TIPOS   = ["gasóleo simples", "gasoleo simples", "gasóleo especial", "gasoleo especial", "gasóleo", "gasoleo"];
const GPL_TIPOS       = ["gpl"];

function precoRelevante(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): number {
  const tipos =
    tipo === "gasolina" ? GASOLINA_TIPOS :
    tipo === "gasoleo"  ? GASOLEO_TIPOS  : GPL_TIPOS;

  const comb = posto.combustiveis?.find((c: any) => {
    const t = c.tipo?.toLowerCase() ?? "";
    if (tipo === "gasoleo" && GASOLEO_EXCLUIR.test(t)) return false;
    return tipos.some(k => t.includes(k));
  });
  return (comb as any)?.preco ?? Infinity;
}

function temCombustivel(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): boolean {
  return precoRelevante(posto, tipo) !== Infinity;
}

export default function Home() {
  const { dark, toggle } = useTheme();
  const [postos,         setPostos]         = useState<Posto[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [fuelId,         setFuelId]         = useState("3201");
  const [distritoAtivo,  setDistritoAtivo]  = useState("");
  const [municipioAtivo, setMunicipioAtivo] = useState("");
  const [ordenacao,      setOrdenacao]      = useState("gasolina_asc");

  const mapFlyRef = useRef<{
    flyToDistrito: (id: string) => void;
    flyToConcelho: (distritoId: string, concelhoNome: string) => void;
  } | null>(null);

  const filtersRef = useRef<FilterValues>({
    fuelId: "3201", idDistrito: "", idMunicipio: "", marcaId: "", search: "",
  });

  const fetchPostos = useCallback(async (f: FilterValues) => {
    const temDistrito  = !!f.idDistrito;
    const temMunicipio = !!f.idMunicipio;
    const temMarca     = !!f.marcaId;
    const podeSearch   =
      (temDistrito && temMunicipio) ||
      (temDistrito && temMarca)     ||
      !!f.search;

    if (!podeSearch) { setPostos([]); return; }

    setLoading(true); setError("");
    try {
      const data = await getPostos({
        fuelId:      f.fuelId,
        idDistrito:  f.idDistrito  || undefined,
        idMunicipio: f.idMunicipio || undefined,
        marcaId:     f.marcaId     || undefined,
        search:      f.search      || undefined,
      });
      // Filtra postos genéricos e com preço 0
      const filtered = (data as Posto[]).filter(p =>
        p.marca &&
        p.marca.toLowerCase() !== "genérico" &&
        p.marca.toLowerCase() !== "generico" &&
        (p.preco === null || p.preco > 0)
      );
      setPostos(filtered);
    } catch (e) { setError(String(e)); setPostos([]); }
    finally { setLoading(false); }
  }, []);

  function handleReset() {
    filtersRef.current = { fuelId: "3201", idDistrito: "", idMunicipio: "", marcaId: "", search: "" };
    setPostos([]); setError("");
    setDistritoAtivo(""); setMunicipioAtivo("");
    setFuelId("3201"); setOrdenacao("gasolina_asc");
  }

  const handleDistritoClick = useCallback((nome: string, id?: string) => {
    const newF: FilterValues = {
      ...filtersRef.current, fuelId, idDistrito: id ?? "", idMunicipio: "",
    };
    filtersRef.current = newF;
    setDistritoAtivo(id ?? "");
    setMunicipioAtivo("");
    if (filtersRef.current.marcaId) {
      fetchPostos(newF);
    } else {
      setPostos([]);
    }
  }, [fetchPostos, fuelId]);

  const handleConcelhoClick = useCallback(async (distritoId: string, concelhoNome: string) => {
    let concelhoId = "";
    try {
      const lista = await getMunicipios(distritoId);
      const normTarget = concelhoNome.toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC");
      const found = lista.find((m: any) => {
        const norm = m.Descritivo.toLowerCase()
          .normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC");
        return norm === normTarget || norm.includes(normTarget) || normTarget.includes(norm);
      });
      if (found) concelhoId = String(found.Id);
    } catch { /* usa só distrito */ }

    const newF: FilterValues = {
      ...filtersRef.current, fuelId, idDistrito: distritoId, idMunicipio: concelhoId,
    };
    filtersRef.current = newF;
    setDistritoAtivo(distritoId);
    setMunicipioAtivo(concelhoId);
    fetchPostos(newF);
  }, [fetchPostos, fuelId]);

  // onChange — só actualiza estado e fly no mapa, SEM fetch
  const handleFilterChange = useCallback((f: FilterValues) => {
    const distritoMudou = f.idDistrito  !== filtersRef.current.idDistrito;
    const concelhoMudou = f.idMunicipio !== filtersRef.current.idMunicipio;
    filtersRef.current = f;
    setFuelId(f.fuelId);
    setDistritoAtivo(f.idDistrito);
    setMunicipioAtivo(f.idMunicipio);

    if (concelhoMudou && f.idMunicipio && f.idDistrito) {
      getMunicipios(f.idDistrito).then(lista => {
        const m = (lista as any[]).find(x => String(x.Id) === f.idMunicipio);
        if (m) mapFlyRef.current?.flyToConcelho(f.idDistrito, m.Descritivo);
      });
    } else if (distritoMudou && f.idDistrito) {
      mapFlyRef.current?.flyToDistrito(f.idDistrito);
    }
  }, []);

  // onSearch — dispara fetch
  const handleSearch = useCallback((f: FilterValues) => {
    filtersRef.current = f;
    fetchPostos(f);
  }, [fetchPostos]);

  // Tipo activo derivado da ordenação
  const tipoAtivo: "gasolina" | "gasoleo" | "gpl" | null =
    ordenacao === "gasolina_asc" ? "gasolina" :
    ordenacao === "gasoleo_asc"  ? "gasoleo"  :
    ordenacao === "gpl_asc"      ? "gpl"      : null;

  // GPL: remove postos sem GPL; outros: mostra todos
  const postosVisiveis = tipoAtivo === "gpl"
    ? postos.filter(p => temCombustivel(p, "gpl"))
    : postos;

  const precosVisiveis = postosVisiveis
    .map(p => {
      if (!tipoAtivo) return p.preco;
      const pr = precoRelevante(p, tipoAtivo);
      return pr === Infinity ? null : pr;
    })
    .filter((x): x is number => x !== null);

  const minP = precosVisiveis.length ? Math.min(...precosVisiveis) : 0;

  const cheapestPrice: number | null = (() => {
    if (!tipoAtivo) {
      const p = postosVisiveis.find(p => p.preco === minP);
      return p?.preco ?? null;
    }
    const p = postosVisiveis.find(p => precoRelevante(p, tipoAtivo) === minP);
    if (!p) return null;
    return minP;
  })();

  const sortedPostos = [...postosVisiveis].sort((a, b) => {
    if (tipoAtivo) return precoRelevante(a, tipoAtivo) - precoRelevante(b, tipoAtivo);
    return 0;
  });

  const mostrarPins =
    municipioAtivo !== "" ||
    (distritoAtivo !== "" && filtersRef.current.marcaId !== "" && municipioAtivo === "");

  const mostrarPinsDistrito =
    distritoAtivo !== "" &&
    filtersRef.current.marcaId !== "" &&
    municipioAtivo === "";

  const SORT_BTNS = [
    { label: "⬇ Gasolina", value: "gasolina_asc" },
    { label: "⬇ Gasóleo",  value: "gasoleo_asc"  },
    { label: "⬇ GPL",      value: "gpl_asc"       },
  ] as const;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

      {/* ── TOPBAR ── */}
      <header style={{
        background: dark ? "#000000" : "#ffffff",
        borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e0d8",
        position:"sticky", top:0, zIndex:40, height:HEADER_H,
        display:"flex", alignItems:"center",
      }}>
        <div style={{
          maxWidth:1600, margin:"0 auto", padding:"0 1.25rem", width:"100%",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem",
        }}>
          <div onClick={() => window.location.reload()}
            style={{ display:"flex", alignItems:"center", height:HEADER_H, cursor:"pointer" }}>
            <img
              src={dark ? "/logo-dark.png" : "/logo-light.png"}
              alt="Zirgolina"
              style={{ height:HEADER_H - 4, width:"auto", maxWidth:220,
                display:"block", objectFit:"contain", objectPosition:"left center" }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
                const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (fb) fb.style.display = "block";
              }}
            />
            <span style={{
              display:"none",
              fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
              fontWeight:700, fontSize:"1.9rem",
              color: dark ? "#22c55e" : "#16a34a",
              letterSpacing:"-0.02em", lineHeight:1,
            }}>zirgolina</span>
          </div>

          <div style={{ flex:1 }} />

          <button onClick={toggle} style={{
            background:"transparent",
            color: dark ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
            border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
            borderRadius:"0.6rem", padding:"0.35rem 0.6rem",
            cursor:"pointer", display:"flex", alignItems:"center", gap:"0.4rem",
            fontSize:"0.72rem", fontWeight:500,
          }}>
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2"  x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"/>
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                <line x1="2"  y1="12" x2="5"  y2="12"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
                <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
            {dark ? "Claro" : "Escuro"}
          </button>
        </div>
      </header>

      {/* ── MAIN — 3 colunas ── */}
      <div style={{
        maxWidth:1600, margin:"0 auto", padding:"1rem 1.25rem",
        display:"grid",
        gridTemplateColumns:"280px 540px 1fr",
        gap:"1rem",
        alignItems:"start",
      }}>

        {/* Col 1 — SIDEBAR */}
        <FilterPanel
          onChange={handleFilterChange}
          onSearch={handleSearch}
          loading={loading}
          total={postosVisiveis.length}
          currentFuelId={fuelId}
          distritoAtivo={distritoAtivo}
          municipioAtivo={municipioAtivo}
          cheapestPrice={cheapestPrice}
        />

        {/* Col 2 — LISTA */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem", minWidth:0 }}>

          {/* Status */}
          <div className="card" style={{ padding:"0.45rem 0.875rem",
            display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <span style={{
              width:7, height:7, borderRadius:"50%", flexShrink:0, display:"inline-block",
              background: loading ? "#f97316" : distritoAtivo ? "#22c55e" : "var(--text-muted)",
            }} />
            <span className="text-muted" style={{ fontSize:"0.72rem" }}>
              {loading ? "A carregar…" : distritoAtivo ? `${postosVisiveis.length} postos` : "Selecione um distrito"}
            </span>
          </div>

          {/* Placeholder */}
          {!distritoAtivo && !loading && postos.length === 0 && !error && (
            <div className="card" style={{ padding:"2.5rem 1.5rem", textAlign:"center",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"0.6rem" }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="1.5"/>
                <path d="M20 10 L20 20 L27 24" stroke="var(--accent)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ fontWeight:700, fontSize:"0.9rem" }}>Selecione um distrito</p>
              <p className="text-muted" style={{ fontSize:"0.74rem" }}>
                Clique no mapa ou escolha nos filtros.
              </p>
            </div>
          )}

          {/* Hint: distrito sem resultados */}
          {distritoAtivo && !loading && postos.length === 0 && !error && (
            <div className="card" style={{ padding:"1.5rem", textAlign:"center",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"0.4rem" }}>
              <p style={{ fontWeight:700, fontSize:"0.82rem" }}>Escolha concelho ou marca</p>
              <p className="text-muted" style={{ fontSize:"0.72rem" }}>
                Selecione um concelho <strong>ou</strong> uma marca e clique <strong>Pesquisar</strong>.
              </p>
            </div>
          )}

          {/* Stats + botões de ordenação */}
          {postos.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.4rem" }}>

              {/* Stats */}
              <div style={{ display:"flex", gap:"0.35rem" }}>
                {[
                  { l:"Mín",   v: minP ? minP.toFixed(3) : "—" },
                  { l:"Média", v: precosVisiveis.length
                    ? (precosVisiveis.reduce((a,b) => a+b) / precosVisiveis.length).toFixed(3) : "—" },
                  { l:"Máx",   v: precosVisiveis.length
                    ? Math.max(...precosVisiveis).toFixed(3) : "—" },
                ].map(s => (
                  <div key={s.l} className="card"
                    style={{ padding:"0.35rem 0.65rem", textAlign:"center", minWidth:80 }}>
                    <p style={{ fontWeight:800, fontSize:"0.82rem", color:"var(--accent)" }}>{s.v}</p>
                    <p className="text-muted" style={{ fontSize:"0.55rem", marginTop:1 }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Botões de ordenação */}
              <div style={{ display:"flex", gap:"0.35rem" }}>
                {SORT_BTNS.map(opt => {
                  const active = ordenacao === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setOrdenacao(opt.value)}
                      className="btn-ghost"
                      style={{
                        fontSize:"0.72rem", padding:"0.3rem 0.65rem",
                        display:"flex", alignItems:"center", gap:"0.35rem",
                        background:  active ? "var(--accent)" : undefined,
                        color:       active ? "#fff"          : undefined,
                        borderColor: active ? "var(--accent)" : undefined,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="card" style={{ padding:"0.65rem", color:"#f87171", fontSize:"0.73rem" }}>
              {error}
            </div>
          )}
          {loading && (
            <div className="card" style={{ padding:"1.5rem", textAlign:"center" }}>
              <div style={{ width:16, height:16, border:"2px solid var(--accent)",
                borderTopColor:"transparent", borderRadius:"50%",
                animation:"spin 0.8s linear infinite", margin:"0 auto 0.4rem" }} />
              <p className="text-muted" style={{ fontSize:"0.68rem" }}>A carregar…</p>
            </div>
          )}
          {!loading && postos.length > 0 && postosVisiveis.length === 0 && !error && (
            <div className="card" style={{ padding:"1.25rem", textAlign:"center" }}>
              <p style={{ fontWeight:700, fontSize:"0.8rem" }}>Sem postos com GPL</p>
              <p className="text-muted" style={{ fontSize:"0.68rem", marginTop:"0.2rem" }}>
                Nenhum posto nesta área tem GPL registado.
              </p>
            </div>
          )}

          {!loading && sortedPostos.map(posto => (
            <PostoCard key={posto.id} posto={posto} tipoAtivo={tipoAtivo} />
          ))}

          {postos.length > 0 && (
            <p className="text-muted"
              style={{ fontSize:"0.56rem", textAlign:"center", padding:"0.2rem 0 0.5rem" }}>
              Fonte: DGEG · precoscombustiveis.dgeg.gov.pt
            </p>
          )}
        </div>

        {/* Col 3 — MAPA */}
        <div className="card" style={{
          overflow:"hidden", position:"sticky",
          top: HEADER_H + 8,
          height:`calc(100vh - ${HEADER_H + 24}px)`,
        }}>
          <MapView
            postos={postos}
            onDistritoClick={handleDistritoClick}
            onConcelhoClick={handleConcelhoClick}
            mostrarPins={mostrarPins}
            mostrarPinsDistrito={mostrarPinsDistrito}
            flyRef={mapFlyRef}
          />
        </div>
      </div>
    </div>
  );
}