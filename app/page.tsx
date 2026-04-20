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

type SortOrder = "asc" | "desc";
const HEADER_H = 56;

export default function Home() {
  const { dark, toggle } = useTheme();
  const [postos,         setPostos]         = useState<Posto[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [fuelId,         setFuelId]         = useState("3201");
  const [distritoAtivo,  setDistritoAtivo]  = useState("");
  const [municipioAtivo, setMunicipioAtivo] = useState("");
  const [sortOrder,      setSortOrder]      = useState<SortOrder>("asc");

  const mapFlyRef = useRef<{
    flyToDistrito: (id: string) => void;
    flyToConcelho: (distritoId: string, concelhoNome: string) => void;
  } | null>(null);

  const filtersRef = useRef<FilterValues>({
    fuelId:"3201", idDistrito:"", idMunicipio:"", marcaId:"", search:"",
  });

  // ── fetch directo no browser — DGEG permite CORS ──
  const fetchPostos = useCallback(async (f: FilterValues) => {
    if (!f.idDistrito && !f.marcaId && !f.search) { setPostos([]); return; }
    setLoading(true); setError("");
    try {
      const data = await getPostos({
        fuelId:      f.fuelId,
        idDistrito:  f.idDistrito  || undefined,
        idMunicipio: f.idMunicipio || undefined,
        marcaId:     f.marcaId     || undefined,
        search:      f.search      || undefined,
      });
      setPostos(data);
    } catch (e) { setError(String(e)); setPostos([]); }
    finally { setLoading(false); }
  }, []);

  function handleReset() {
    filtersRef.current = { fuelId:"3201", idDistrito:"", idMunicipio:"", marcaId:"", search:"" };
    setPostos([]); setError("");
    setDistritoAtivo(""); setMunicipioAtivo("");
    setFuelId("3201");
  }

  const handleDistritoClick = useCallback((nome: string, id?: string) => {
    const newF: FilterValues = {
      ...filtersRef.current, fuelId, idDistrito: id ?? "", idMunicipio: "",
    };
    filtersRef.current = newF;
    setDistritoAtivo(id ?? "");
    setMunicipioAtivo("");
    fetchPostos(newF);
  }, [fetchPostos, fuelId]);

  const handleConcelhoClick = useCallback(async (distritoId: string, concelhoNome: string) => {
    let concelhoId = "";
    try {
      const lista = await getMunicipios(distritoId);
      const normTarget = concelhoNome.toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu,"").normalize("NFC");
      const found = lista.find((m: any) => {
        const norm = m.Descritivo.toLowerCase()
          .normalize("NFD").replace(/\p{Diacritic}/gu,"").normalize("NFC");
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

  const handleFilterChange = useCallback((f: FilterValues) => {
    const distritoMudou = f.idDistrito  !== filtersRef.current.idDistrito;
    const concelhoMudou = f.idMunicipio !== filtersRef.current.idMunicipio;
    filtersRef.current = f;
    setFuelId(f.fuelId);
    setDistritoAtivo(f.idDistrito);
    setMunicipioAtivo(f.idMunicipio);
    fetchPostos(f);

    if (concelhoMudou && f.idMunicipio && f.idDistrito) {
      getMunicipios(f.idDistrito).then(lista => {
        const m = (lista as any[]).find(x => String(x.Id) === f.idMunicipio);
        if (m) mapFlyRef.current?.flyToConcelho(f.idDistrito, m.Descritivo);
      });
    } else if (distritoMudou && f.idDistrito) {
      mapFlyRef.current?.flyToDistrito(f.idDistrito);
    }
  }, [fetchPostos]);

  const priced   = postos.map(p => p.preco).filter((x): x is number => x !== null);
  const minP     = priced.length ? Math.min(...priced) : 0;
  const cheapest = postos.find(p => p.preco === minP);

  const sortedPostos = [...postos].sort((a, b) => {
    if (a.preco === null) return 1;
    if (b.preco === null) return -1;
    return sortOrder === "asc" ? a.preco - b.preco : b.preco - a.preco;
  });

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
          {/* Logo — clique reseta */}
          <div onClick={handleReset}
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

          {/* Botão tema — ícone SVG monocromático */}
          <button onClick={toggle} style={{
            background:"transparent",
            color: dark ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
            border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
            borderRadius:"0.6rem", padding:"0.35rem 0.6rem",
            cursor:"pointer", display:"flex", alignItems:"center", gap:"0.4rem",
            fontSize:"0.72rem", fontWeight:500,
          }}>
            {dark ? (
              /* sol monocromático */
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
              /* lua monocromática */
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
        gridTemplateColumns:"280px 540px 1fr",   /* sidebar | lista | mapa */
        gap:"1rem",
        alignItems:"start",
      }}>

        {/* Col 1 — SIDEBAR */}
        <FilterPanel
          onChange={handleFilterChange}
          loading={loading}
          total={postos.length}
          currentFuelId={fuelId}
          distritoAtivo={distritoAtivo}
          municipioAtivo={municipioAtivo}
          cheapestPrice={cheapest?.preco}
        />


        {/* Col 2 — LISTA */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem", minWidth:0 }}>

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

          {/* Stats + ordenação */}
          {postos.length > 0 && (
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:"0.4rem", flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:"0.35rem" }}>
                {[
                  { l:"Postos", v: postos.length.toString() },
                  { l:"Mín",    v: minP ? minP.toFixed(3) : "—" },
                  { l:"Média",  v: priced.length
                    ? (priced.reduce((a,b) => a+b) / priced.length).toFixed(3) : "—" },
                ].map(s => (
                  <div key={s.l} className="card"
                    style={{ padding:"0.35rem 0.65rem", textAlign:"center", minWidth:80 }}>
                    <p style={{ fontWeight:800, fontSize:"0.82rem", color:"var(--accent)" }}>{s.v}</p>
                    <p className="text-muted" style={{ fontSize:"0.55rem", marginTop:1 }}>{s.l}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
                className="btn-ghost"
                style={{ fontSize:"0.72rem", padding:"0.3rem 0.65rem",
                  display:"flex", alignItems:"center", gap:"0.35rem" }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  {sortOrder === "asc"
                    ? <path d="M2 8.5L6 3.5L10 8.5" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    : <path d="M2 3.5L6 8.5L10 3.5" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  }
                </svg>
                {sortOrder === "asc" ? "Mais baratos" : "Mais caros"}
              </button>
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
          {!loading && distritoAtivo && postos.length === 0 && !error && (
            <div className="card" style={{ padding:"1.25rem", textAlign:"center" }}>
              <p style={{ fontWeight:700, fontSize:"0.8rem" }}>Sem resultados</p>
              <p className="text-muted" style={{ fontSize:"0.68rem", marginTop:"0.2rem" }}>
                Tenta outro filtro.
              </p>
            </div>
          )}

          {!loading && sortedPostos.map(posto => (
            <PostoCard key={posto.id} posto={posto} />
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
            mostrarPins={municipioAtivo !== ""}
            flyRef={mapFlyRef}
          />
        </div>
      </div>
    </div>
  );
}