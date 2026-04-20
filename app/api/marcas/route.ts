import { getMarcas } from "@/lib/dgeg";
import { NextResponse } from "next/server";
export const revalidate = 3600;
export async function GET() {
  try {
    const data = await getMarcas();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}