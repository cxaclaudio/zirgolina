import { getPostos } from "@/lib/dgeg";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const data = await getPostos({
      fuelId:  searchParams.get("fuelId")      ?? "3201",
      idDistrito:   searchParams.get("idDistrito")  ?? undefined,
      idMunicipio:  searchParams.get("idMunicipio") ?? undefined,
      marcaId:      searchParams.get("marcaId")     ?? undefined,
      search:       searchParams.get("search")      ?? undefined,
      bbox:         searchParams.get("bbox")        ?? undefined,
    });
    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), data: [] }, { status: 502 });
  }
}