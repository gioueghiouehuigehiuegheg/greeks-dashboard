import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/schwab-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Missing 'code' query parameter" },
      { status: 400 }
    );
  }
  try {
    await exchangeCodeForTokens(code);
    // Redirect back to dashboard on success
    return NextResponse.redirect(new URL("/?auth=ok", req.url));
  } catch (e: any) {
    return NextResponse.json(
      { error: "Token exchange failed", detail: e.message },
      { status: 500 }
    );
  }
}
