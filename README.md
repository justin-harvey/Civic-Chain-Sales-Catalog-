# Civic-Chain: Pricing Catalog (public, buyer-facing)

A segment-first pricing catalog for prospects. A buyer picks their organization type (municipality, school district, HOA, special district, county, state agency) and sees what it costs. One engine, priced to how each buyer already buys.

**This repo is PUBLIC-safe by design.** It carries **list prices and the payment-savings story only**. No COGS, float, ARPU/ARR, CAC, or moat, those are confidential and live in the separate `justin-harvey/Civic-Chain-catalog-` repo (the VC / rep-facing catalog). Do not copy internal economics into this repo.

> Not to be confused with `CIVIC-CHAIN-SALES-CATALOG.md` in the confidential repo, that is the **rep-facing** sales-enablement doc. This is the **buyer-facing, public** one.

## Build

```bash
node build-catalog.mjs            # -> site/index.html  (PUBLIC, deployable; default)
node build-catalog.mjs --encrypt "passphrase"   # -> site/index.html (AES-GCM gated, if you ever want it private)
```

The build inlines brand fonts, logos, and the civic-grid texture as data-URIs, so the page makes zero external calls once built. Brand source: `civicchain-v2.vercel.app`.

## Preview screenshots

```bash
node render-shots.mjs             # -> shots/{desktop,mobile}-*.png  (needs playwright; reuses the test-suite install)
```

## Deploy

The repo is live at `github.com/justin-harvey/Civic-Chain-Sales-Catalog-` (public, `main`). The build emits the page to **two** publish dirs so either host works with one build:
- `site/` — what Netlify publishes (pinned by `netlify.toml`).
- `docs/` — the GitHub Pages mirror (+ `.nojekyll`).

**Option A, GitHub Pages (one click, no extra accounts).** Settings → Pages → Source: "Deploy from a branch" → Branch `main`, folder `/docs` → Save. Live at `https://justin-harvey.github.io/Civic-Chain-Sales-Catalog-/` within a minute.

**Option B, Netlify.** Add a new site from this repo. `netlify.toml` already pins the publish dir to `site/`. No build command needed (the HTML is committed); optionally set the build command to `node build-catalog.mjs` so it rebuilds on push.

The page carries a `noindex` meta tag (and `netlify.toml` adds a `noindex` header) while it is a demo. Drop those at launch to let it be indexed.

> Pushing was done with a short-lived token that could write code but not toggle Pages, hence the one-click step above. Re-push after any rebuild: `node build-catalog.mjs` then commit + push `main`.

## Content model

All content lives in `build-catalog.mjs`:
- `PRODUCTS`, the three shared products (Transparency Layer, Vendor Management + Spend Cards, Public Finance).
- `SEGMENTS`, the six buyer types, each with a problem line, which products fit, a price range, an ROI line, and a "how to buy" note.
- `PRICING`, the shared "how pricing works" section (subscription + optional low payment fee).

**Pricing status:** municipal / county / state bands carry the reconciled prices from the confidential pricing docs. Schools, HOAs, and special districts are marked `indicative` and get hardened in M2 against those docs (net-new tiers by enrollment, unit count, and budget).
