import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/schwab-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getAuthorizationUrl();
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
