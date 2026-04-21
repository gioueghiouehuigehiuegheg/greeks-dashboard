// lib/schwab-auth.ts
// Schwab OAuth2 — serverless-compatible. Tokens stored in Vercel KV.
// Access token refreshes automatically when expired (30 min lifetime).
// Refresh token lives 7 days — after that user must re-authenticate via /api/auth/login.

import { kv } from "@vercel/kv";

const CLIENT_ID     = process.env.SCHWAB_CLIENT_ID!;
const CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.SCHWAB_REDIRECT_URI!;
const TOKEN_URL     = "https://api.schwabapi.com/v1/oauth/token";
const AUTH_URL      = "https://api.schwabapi.com/v1/oauth/authorize";
const KV_KEY        = "schwab:tokens";

interface TokenBundle {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  saved_at: number;
}

function basicAuthHeader(): string {
  const creds = `${CLIENT_ID}:${CLIENT_SECRET}`;
  return "Basic " + Buffer.from(creds).toString("base64");
}

export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "readonly",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed ${resp.status}: ${text}`);
  }
  const tokens = (await resp.json()) as Omit<TokenBundle, "saved_at">;
  const bundle: TokenBundle = { ...tokens, saved_at: Date.now() };
  await kv.set(KV_KEY, bundle);
  return bundle;
}

async function refreshAccessToken(refresh_token: string): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Refresh failed ${resp.status}: ${text}`);
  }
  const tokens = (await resp.json()) as Omit<TokenBundle, "saved_at">;
  // Schwab returns a new refresh_token on each refresh — rolling 7-day window
  const bundle: TokenBundle = { ...tokens, saved_at: Date.now() };
  await kv.set(KV_KEY, bundle);
  return bundle;
}

/**
 * Returns a valid Schwab access token.
 * Throws if no tokens exist in KV — user must hit /api/auth/login first.
 */
export async function getValidAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("SCHWAB_CLIENT_ID / SCHWAB_CLIENT_SECRET not set in env.");
  }
  const tokens = (await kv.get<TokenBundle>(KV_KEY));
  if (!tokens) {
    throw new Error("NOT_AUTHENTICATED: Visit /api/auth/login to connect Schwab.");
  }

  const elapsedSec = (Date.now() - tokens.saved_at) / 1000;
  const accessExpired = elapsedSec >= (tokens.expires_in - 60);
  const refreshExpired = elapsedSec >= (7 * 24 * 3600 - 3600);

  if (refreshExpired) {
    throw new Error("REFRESH_EXPIRED: Refresh token >7 days old, re-auth required.");
  }
  if (!accessExpired) return tokens.access_token;

  const fresh = await refreshAccessToken(tokens.refresh_token);
  return fresh.access_token;
}
