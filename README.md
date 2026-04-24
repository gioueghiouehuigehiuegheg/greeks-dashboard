# Greeks Dashboard

Live options second-order Greeks dashboard for SPY, QQQ, DIA, and any other ticker on Schwab. Computes GEX, DEX, VEX, and Charm from real chain data using Black-Scholes, auto-refreshes every 5 minutes, and deploys to Vercel in one command.

![Layout: GEX left, DEX/VEX/Charm stacked right](preview.png)

## What's in it

**Top row**
- **Left** — Horizontal Gamma Exposure by strike, with call (yellow) and put (purple) split, spot line, gamma flip, and max pain overlays.
- **Right** — Delta Exposure (top) and Vanna Exposure (bottom) as MarketMono-style vertical bar charts. Positive bars green, negative red, spot marked with a dashed line.

**Bottom row** — Vanna and Charm smooth line curves, side by side. Each panel plots Call / Put / Net lines with a subtle gradient fill under the Net line, matching the MarketMono style. Spot is a thin vertical divider.

**Stats strip** — Net aggregates below the charts: total OI, Net GEX, Net DEX, Net VEX, Net Charm, Gamma Flip, Max Pain.

**Controls** — Ticker dropdown (SPY/QQQ/DIA/IWM/AAPL/NVDA/TSLA/META/MSFT/GOOGL/AMZN), expiry selector, DTE filter (0DTE / 0-7 / 0-21 / 0-45), strike range (±3% / ±5% / ±8%). Live status indicator and countdown to next refresh.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `.env` set, it runs in **demo mode** with realistic synthetic chains — zero credentials needed.

## Deploying to Vercel

**Step 1 — Push to GitHub and import at vercel.com/new.**

**Step 2 — Create a Vercel KV store** (Dashboard → Storage → Create → KV). Attach it to this project. Vercel will automatically inject `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.

**Step 3 — Register a Schwab developer app** at [developer.schwab.com](https://developer.schwab.com):
- Callback URL: `https://<your-project>.vercel.app/api/auth/callback`
- Once approved, grab your Client ID and Secret.

**Step 4 — Set env vars in Vercel** (Project → Settings → Environment Variables):
```
SCHWAB_CLIENT_ID      = <your client id>
SCHWAB_CLIENT_SECRET  = <your client secret>
SCHWAB_REDIRECT_URI   = https://<your-project>.vercel.app/api/auth/callback
```

**Step 5 — Deploy.** After the build is live, visit `https://<your-project>.vercel.app/api/auth/login` once. You'll be redirected to Schwab's OAuth consent, then bounced back with tokens stored in KV. The dashboard now has live data and will auto-refresh tokens silently.

Refresh tokens are valid for 7 days. If yours expires, just hit `/api/auth/login` again.

## How auth works on serverless

Your original `tokens.json` approach doesn't work on Vercel because function filesystems are ephemeral and each request can hit a different container. This version uses Vercel KV (Redis-compatible) keyed under `schwab:tokens`. Both the `/api/chain` route and the `/api/auth/callback` route share the same KV store, so tokens persist across cold starts and regions.

The access-token refresh is wrapped in a single read/write to KV — it's not distributed-locked like the Python `_FileLock`, but because Vercel requests are stateless and short-lived, the window for a race is tiny, and Schwab tolerates the occasional duplicate refresh.

## File map

```
greeks-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # redirects to Schwab OAuth
│   │   │   └── callback/route.ts   # exchanges code → tokens, writes KV
│   │   └── chain/route.ts          # main data endpoint
│   ├── globals.css                 # Tailwind + fonts + grid background
│   ├── layout.tsx
│   └── page.tsx                    # dashboard UI root
├── components/
│   ├── ControlBar.tsx              # ticker/expiry/DTE/range/status
│   ├── GexChart.tsx                # horizontal GEX with call/put split
│   ├── BarChartPanel.tsx           # MarketMono-style vertical bars (DEX, VEX)
│   ├── LineChartPanel.tsx          # smooth curves with call/put/net (Vanna, Charm)
│   └── StatsFooter.tsx             # net exposure aggregates
├── lib/
│   ├── greeks.ts                   # Black-Scholes Δ/Γ/Vanna/Charm — ported from Python
│   ├── schwab-auth.ts              # OAuth with Vercel KV token storage
│   ├── schwab-api.ts               # /chains and /quotes client
│   ├── demo-data.ts                # synthetic chain generator (no creds needed)
│   └── format.ts                   # fmtK, fmtMoney helpers
├── .env.example
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── package.json
└── tsconfig.json
```

## Formulas

All Greeks match `gex-dashboard.py` exactly:

```
Δ (call) = N(d1)
Δ (put)  = N(d1) - 1
Γ        = φ(d1) / (S · σ · √T)
Vanna    = -φ(d1) · d2 / σ
Charm(c) = [-φ(d1) · (2rT - d2·σ·√T) / (2T·σ·√T)] / 365
Charm(p) = Charm(c) + [2r · N(-d1)] / 365
```

Dealer exposure conventions (client-side net, dealers on the other side):
- **GEX**  = ±Γ · OI · 100 · S · {+1 if call, -1 if put}  → dollar notional per 1% move
- **DEX**  = -sign · Δ · OI · 100  (dealer delta)
- **VEX**  = sign · Vanna · OI · 100
- **Charm** = sign · Charm · OI · 100

Risk-free rate defaults to 4.5% — edit in `app/api/chain/route.ts` if you want something else.

## Credits

Engine ported from [rreidriddle/black-scholes-greeks-dashboard](https://github.com/rreidriddle/black-scholes-greeks-dashboard) by Reid Riddle. Visual style inspired by MarketMono.
# greeks-dashboard
# greeks-dashboard
# greeks-dashboard
# greeks-dashboard
# greeks-dashboard
# greeks-dashboard
