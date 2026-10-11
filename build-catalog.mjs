#!/usr/bin/env node
// Build the segment-first, buyer-facing pricing catalog.
// Flow: cover -> "find your organization" (segment grid) -> segment detail -> how pricing works -> contact.
// This is the PUBLIC, buyer-facing clone of the confidential VC magazine catalog. It carries LIST PRICES
// and the payment-savings story ONLY: no COGS, float, ARPU, ARR, CAC, or moat (those live in the private repo).
//
// Design lock (shared with the VC catalog): ONE indigo accent, DM Serif Text display + DM Sans body (>=17px),
// clean near-white base, soft 14px radius, shadows <=8%, gold used only as a hairline signature. StyleSeed discipline.
//
// Usage:
//   node build-catalog.mjs                     -> site/index.html          (PUBLIC, deployable; default)
//   node build-catalog.mjs --encrypt "<pass>"  -> site/index.html          (AES-GCM gated, if you ever want it private)
//
// Brand assets (logos, grid, fonts) inlined as data-URIs => zero external calls once built.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const BRAND = 'https://civicchain-v2.vercel.app';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';
const text = async (url) => (await fetch(url, { headers: { 'User-Agent': UA } })).text();
const svgDataUri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);

async function inlineFonts() {
  const url = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Text:ital@0;1&display=swap';
  try {
    let css = await text(url);
    const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map(m => m[1]))];
    for (const u of urls) {
      const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
      css = css.split(u).join('data:font/woff2;base64,' + buf.toString('base64'));
    }
    return { style: `<style>${css}</style>`, kb: css.length / 1024 };
  } catch (e) {
    console.warn('font inline failed (' + e.message + '); using Google Fonts <link>');
    return { style: `<link rel="stylesheet" href="${url}">`, kb: 0 };
  }
}

async function inlineBrand() {
  try {
    const [wordmark, icon, grid] = await Promise.all([
      text(BRAND + '/brand/civic-logo-w-text-horizontal.svg'),
      text(BRAND + '/brand/civic-chain-logo.svg'),
      text(BRAND + '/design-assets/bg-textures/civic-grid.svg'),
    ]);
    return { ok: true, wordmark: svgDataUri(wordmark), icon: svgDataUri(icon), grid: svgDataUri(grid) };
  } catch (e) {
    console.warn('brand asset fetch failed (' + e.message + '); using text wordmark');
    return { ok: false };
  }
}

// ---- Shared product names. The plain-language definition is the segment-specific "fit" line below. ----
const PRODUCTS = {
  transparency: { name: 'Transparency Layer' },
  vendor: { name: 'Vendor Management + Spend Cards' },
  finance: { name: 'Public Finance' },
};

// ---- Segment-first content model ----
// INDICATIVE prices on net-new segments (schools, HOAs, special districts) are first-pass and get
// hardened in M2 against the private pricing docs. Municipal / county / state carry the reconciled bands.
const SEGMENTS = [
  {
    id: 'municipal', name: 'Municipalities', sub: 'Towns & cities',
    problem: 'Residents and council want to see where the money goes, and you need to prove every figure without paying for a six-figure open-data portal.',
    startsAt: '$1,800 / yr',
    sizing: 'Sized by population: under 10k · 10k–100k · over 100k',
    fits: [
      { id: 'transparency', fit: 'Resident and council portal, plain-English answers anyone can verify, unlimited users.', price: '$1,800–$30,000 / yr by population' },
      { id: 'vendor', fit: 'Gate every vendor payout on a confirmed milestone; catch duplicate and over-contract payments.', price: '$18,000–$120,000 / yr by spend' },
      { id: 'finance', fit: 'Budget, grant, and bond figures your auditor can reproduce in one click.', price: '$12,000–$75,000 / yr by population' },
    ],
    roi: 'Replace a six-figure open-data portal at a tenth the cost, and recover even 0.1% of a $25M spend, that is $25,000, in caught duplicate payments.',
    buy: 'Entry tiers sit under the typical $25k sole-source threshold, so you can buy without an RFP. Larger tiers through Sourcewell, OMNIA, or GSA.',
  },
  {
    id: 'schools', name: 'School Districts', sub: 'K-12 & districts',
    problem: 'Parents and taxpayers want to see how grant, bond, and construction dollars are spent, and a district audit runs $40,000 to $130,000.',
    startsAt: '$3,000 / yr',
    sizing: 'Sized by enrollment: under 2,500 · 2,500–10,000 · over 10,000 students',
    fits: [
      { id: 'transparency', fit: 'Parent and taxpayer portal for budgets, grants, and construction spend.', price: '$3,000–$30,000 / yr by enrollment' },
      { id: 'vendor', fit: 'Category-locked p-cards for staff purchasing, plus vendor and construction spend gated on milestones.', price: '$18,000–$90,000 / yr by spend' },
      { id: 'finance', fit: 'Grant-drawdown and bond-proceeds figures reproducible for the board and your auditor.', price: '$12,000–$60,000 / yr by enrollment' },
    ],
    roi: 'Hand your auditor the evidence packet in one click instead of three weeks of email, for a fraction of a $40,000 to $130,000 district audit.',
    buy: 'Buy through your state contract or a purchasing co-op; entry tiers are under the sole-source threshold.',
  },
  {
    id: 'hoa', name: 'HOAs & Condos', sub: 'Community associations',
    problem: 'Homeowners want to see where dues and reserves go, but board turnover loses the paper trail and contractor overpayment is the top dispute.',
    startsAt: '$600 / yr',
    sizing: 'Priced to your community size. Talk to us for a quote.',
    fits: [
      { id: 'transparency', fit: 'Homeowner portal for dues, reserves, and vendor spend anyone can verify.', price: 'from $600 / yr' },
      { id: 'vendor', fit: 'Every contractor payment backed by a bid and a completed milestone; catch duplicate and over-contract payments.', price: 'by community size' },
      { id: 'finance', fit: 'Reserve-fund and operating-budget figures reproducible across board turnover.', price: 'by community size' },
    ],
    roi: 'End the dues dispute with a record every homeowner can check, and catch the duplicate contractor invoice before it is paid.',
    buy: 'Buy direct with a board vote, no RFP; management companies can roll it across their portfolio.',
  },
  {
    id: 'special', name: 'Special Districts', sub: 'Water, fire, sewer, library, transit',
    problem: 'Ratepayers fund your capital projects and reserves, and a single-purpose district rarely has the finance staff to prove every figure.',
    startsAt: '$1,800 / yr',
    sizing: 'Sized by annual budget: under $5M · $5M–$50M · over $50M',
    fits: [
      { id: 'transparency', fit: 'Ratepayer portal for rates, reserves, and capital spend.', price: '$1,800–$24,000 / yr by budget' },
      { id: 'vendor', fit: 'Capital-project and vendor spend gated on milestones; catch duplicate and over-contract payments.', price: '$18,000–$90,000 / yr by spend' },
      { id: 'finance', fit: 'Reserve and capital figures reproducible for your board and your auditor.', price: '$12,000–$48,000 / yr by budget' },
    ],
    roi: 'Show ratepayers exactly what the rate increase funds, and prove your capital spend without hiring finance staff.',
    buy: 'Entry tiers are under the sole-source threshold; larger tiers through Sourcewell, OMNIA, or GSA.',
  },
  {
    id: 'county', name: 'Counties & Authorities', sub: 'Counties & regional authorities',
    problem: 'Bigger budgets, more funds, more vendors, and a public that expects county-level transparency across every department.',
    startsAt: '$9,000 / yr',
    sizing: 'Sized from mid county to large regional authority, by population and spend',
    fits: [
      { id: 'transparency', fit: 'Countywide resident and commissioner portal, every department, unlimited users.', price: '$9,000–$30,000 / yr' },
      { id: 'vendor', fit: 'Milestone-gated payouts and category-locked spend cards across departments, with continuous duplicate scans.', price: '$48,000–$120,000+ / yr by spend' },
      { id: 'finance', fit: 'Multi-fund, grant, and bond figures reproducible for the board and your auditor.', price: '$36,000–$75,000+ / yr' },
    ],
    roi: 'One verifiable record across every department, and recover improper payments at county scale before they leave the door.',
    buy: 'Sell through Sourcewell, OMNIA, or GSA so the board skips the RFP; multi-entity pricing available.',
  },
  {
    id: 'state', name: 'State Agencies', sub: 'Departments & statewide',
    problem: 'Enterprise-scale spend, federal improper-payment mandates (PIIA), and multi-entity reporting that has to reconcile.',
    startsAt: 'Custom',
    sizing: 'Priced per agency and spend under management; multi-entity and API quoted per deployment',
    fits: [
      { id: 'transparency', fit: 'Statewide public portal with an API, every figure verified.', price: 'from $30,000 / yr' },
      { id: 'vendor', fit: 'Continuous monitoring across entities, category-locked spend cards, an API, and a public contract portal.', price: '$120,000+ / yr by spend' },
      { id: 'finance', fit: 'Every-figure verification across funds and entities, resident query portal.', price: '$75,000+ / yr' },
    ],
    roi: 'Improper payments sent $162B out the door in FY2024, and PIIA requires agencies to reduce them. Catch them continuously at software cost.',
    buy: 'Buy through GSA or a state master contract; multi-entity and API pricing quoted per deployment.',
  },
];

// Shared "how pricing works" (simplified from the 3-stream model: no float, no ARPU)
const PRICING = {
  kicker: 'Pricing',
  title: 'How pricing works',
  lede: 'Two simple parts. A subscription sized to your organization, and an optional low fee only on the payments you move through us.',
  points: [
    { h: 'Subscription', p: 'An annual price sized to your population, enrollment, budget, or unit count, never per seat. Staff, board, council, and residents all get access at $0 per user.' },
    { h: 'Optional payment fee', p: 'When you move vendor payments on our rails, you pay 0.25–0.75%, versus the 2.25–2.75% most card and processor rails charge today. The savings scale with the volume you move.' },
    { h: 'One-time onboarding', p: 'A single implementation fee per deployment that covers your data setup and integrations. Quoted per deal, it reflects real setup work.' },
  ],
  notes: [
    'Every entry tier sits under the typical $25,000 government sole-source threshold, so you can buy without an RFP. Larger tiers sell through cooperative-purchasing vehicles (Sourcewell, OMNIA, GSA) so you skip the RFP entirely.',
    'We produce evidence, not a certification. The system refuses to guess rather than return a figure it cannot verify against the record, by design, for public money.',
    'Prices are list prices, confirmed in your SOW. The payment-savings depends on your payment mix (card versus ACH), so we confirm the rate in writing before quoting a dollar figure.',
  ],
};

const COVER = {
  eyebrow: 'Pricing',
  title: 'Simple pricing for public money',
  lede: 'One verifiable record of every dollar. Find your organization and see what it costs. No RFP, no per-seat fees, no six-figure portal.',
  chips: ['Unlimited users at $0 / seat', 'Evidence, not certification', 'Buy without an RFP'],
};

// Contents / top-nav order
// Top-nav: segments + Pricing. Contact is the bar CTA + a home-foot link, so it's not duplicated here.
const NAV = [
  ...SEGMENTS.map(s => ({ id: s.id, label: s.name })),
  { id: 'pricing', label: 'Pricing' },
];

// ---------- renderers ----------
function renderSegmentCard(s) {
  return `<button class="toc" data-nav="${s.id}">
    <span class="toc-t">${s.name}</span>
    <span class="toc-s">${s.sub}</span>
    <span class="toc-price">from ${s.startsAt}</span>
    <span class="toc-go">→</span>
  </button>`;
}

function renderFitCard(f) {
  const p = PRODUCTS[f.id];
  return `<div class="fit">
    <div class="fit-head"><h4>${p.name}</h4><span class="fit-price">${f.price}</span></div>
    <p class="fit-line">${f.fit}</p>
  </div>`;
}

function renderSegmentView(s) {
  const idx = SEGMENTS.findIndex(x => x.id === s.id);
  const next = SEGMENTS[idx + 1] || { id: 'pricing', name: 'How pricing works' };
  const prev = idx > 0 ? SEGMENTS[idx - 1] : null;
  return `
  <article class="view sec" data-view="${s.id}">
    <button class="back" data-nav="home">← All organizations</button>
    <header class="sec-head">
      <span class="kicker">${s.sub}</span>
      <h2>${s.name}</h2>
      <p class="lede">${s.problem}</p>
    </header>
    <div class="startsat"><span class="startsat-k">Starts at</span><span class="startsat-n">${s.startsAt}</span></div>
    ${s.sizing ? `<p class="sizing">${s.sizing}</p>` : ''}
    <h3 class="fits-h">What fits you</h3>
    <div class="fits">${s.fits.map(renderFitCard).join('')}</div>
    <blockquote class="pull">${s.roi}</blockquote>
    <div class="buy"><span class="buy-k">Easy to buy</span><p>${s.buy}</p></div>
    <nav class="secnav">
      ${prev ? `<button class="secnav-btn" data-nav="${prev.id}">← ${prev.name}</button>` : '<button class="secnav-btn" data-nav="home">← All organizations</button>'}
      <button class="secnav-btn next" data-nav="${next.id}">${next.name} →</button>
    </nav>
  </article>`;
}

function renderPricingView() {
  const cards = PRICING.points.map((p, i) =>
    `<div class="ecard streamcard"><div class="snum">${i + 1}</div><h4>${p.h}</h4><p>${p.p}</p></div>`).join('');
  const notes = PRICING.notes.map(n => `<li>${n}</li>`).join('');
  return `
  <article class="view sec" data-view="pricing">
    <button class="back" data-nav="home">← All organizations</button>
    <header class="sec-head">
      <span class="kicker">${PRICING.kicker}</span>
      <h2>${PRICING.title}</h2>
      <p class="lede">${PRICING.lede}</p>
    </header>
    <div class="grid g3">${cards}</div>
    <ul class="notes">${notes}</ul>
    <nav class="secnav">
      <button class="secnav-btn" data-nav="home">← All organizations</button>
      <button class="secnav-btn next" data-nav="contact">Contact →</button>
    </nav>
  </article>`;
}

function renderContactView() {
  return `
  <article class="view sec" data-view="contact">
    <button class="back" data-nav="home">← All organizations</button>
    <header class="sec-head">
      <span class="kicker">Contact</span>
      <h2>See it on your numbers</h2>
      <p class="lede">A 20-minute walkthrough on your own data. We confirm your tier, your onboarding scope, and, if you move payments, your rate, in writing.</p>
    </header>
    <div class="contact-cta">
      <a class="enter" href="mailto:hello@civic-chain.com?subject=Civic%20Chain%20pricing">Request a walkthrough →</a>
      <p class="contact-sub">Prefer a cooperative-purchasing route? We are set up for Sourcewell, OMNIA, and GSA so you can skip the RFP.</p>
    </div>
    <nav class="secnav">
      <button class="secnav-btn" data-nav="pricing">← How pricing works</button>
      <button class="secnav-btn next" data-nav="home">All organizations →</button>
    </nav>
  </article>`;
}

// ---------- build ----------
const args = process.argv.slice(2);
const doEncrypt = args.includes('--encrypt');
const fonts = await inlineFonts();
const brand = await inlineBrand();

const wordmark = brand.ok ? `<img class="wm" src="${brand.wordmark}" alt="Civic Chain">` : `<span class="wmtext">Civic Chain</span>`;
const gridBg = brand.ok ? `background-image:url("${brand.grid}");` : '';

const coverChips = COVER.chips.map(c => `<span class="cchip">${c}</span>`).join('');
const segmentCards = SEGMENTS.map(renderSegmentCard).join('');
const segmentViews = SEGMENTS.map(renderSegmentView).join('\n');
const topNav = NAV.map(n => `<button class="tn" data-nav="${n.id}">${n.label}</button>`).join('');

const BODY = `
<header class="bar">
  <button class="barbrand" data-nav="cover">${wordmark}</button>
  <nav class="topnav">${topNav}</nav>
  <button class="bar-cta" data-nav="contact">Contact</button>
</header>

<main id="app">

  <section class="view cover active" data-view="cover">
    <div class="cover-inner">
      <span class="eyebrow">${COVER.eyebrow}</span>
      <h1>${COVER.title}</h1>
      <p class="cover-lede">${COVER.lede}</p>
      <div class="cchips">${coverChips}</div>
      <button class="enter" data-nav="home">Find your organization →</button>
    </div>
  </section>

  <section class="view home" data-view="home">
    <header class="sec-head center">
      <span class="kicker">Find your organization</span>
      <h2>Which are you?</h2>
      <p class="lede">Pick your organization type and see what it costs. One engine, priced to how you already buy.</p>
    </header>
    <div class="toc-grid">${segmentCards}</div>
    <div class="home-foot">
      <button class="home-link" data-nav="pricing">How pricing works →</button>
      <button class="home-link" data-nav="contact">Contact →</button>
    </div>
  </section>

  ${segmentViews}
  ${renderPricingView()}
  ${renderContactView()}

</main>
`;

const STYLE = `
:root{
  --paper:#faf9f6; --surface:#ffffff; --surface-2:#f4f2ec;
  --ink:#16123a; --ink-2:#4b4668; --ink-3:#817c99;
  --brand:#3d3c86; --brand-deep:#262067; --brand-tint:#ecebf6;
  --gold:#8a6a2f; --border:rgba(22,18,58,.11); --border-2:rgba(22,18,58,.07);
  --rcard:14px; --rctrl:9px;
  --sh-card:0 1px 2px rgba(22,18,58,.04),0 6px 20px rgba(22,18,58,.05);
  --sh-hot:0 2px 6px rgba(38,32,103,.10),0 14px 34px rgba(38,32,103,.12);
  --wash-brand:linear-gradient(135deg,var(--brand-deep),var(--brand) 62%,color-mix(in oklab,var(--brand),var(--gold) 36%));
  --serif:"DM Serif Text",Georgia,serif; --sans:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;position:relative;font-family:var(--sans);color:var(--ink);background:var(--paper);${gridBg}background-attachment:fixed;line-height:1.6;font-size:17px;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;left:0;right:0;bottom:0;height:40vh;z-index:-1;pointer-events:none;background:radial-gradient(58% 120% at 16% 128%,rgba(138,106,47,.11),transparent 70%),radial-gradient(64% 120% at 84% 130%,rgba(61,60,134,.13),transparent 72%),linear-gradient(to top,rgba(61,60,134,.05),transparent)}
.view{display:none}
.view.active{display:block}

/* top bar */
.bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:22px;padding:12px 30px;background:rgba(250,249,246,.86);backdrop-filter:saturate(1.3) blur(10px);border-bottom:1px solid var(--border-2)}
.barbrand{border:0;background:none;cursor:pointer;padding:0;display:flex;align-items:center}
.wm{height:26px;width:auto;display:block}
.wmtext{font-family:var(--sans);font-weight:700;letter-spacing:.02em;color:var(--brand-deep)}
.topnav{display:flex;gap:2px;flex:1;overflow:auto;scrollbar-width:none}
.topnav::-webkit-scrollbar{display:none}
.tn{border:0;background:none;font-family:var(--sans);font-size:14px;font-weight:500;color:var(--ink-2);padding:7px 11px;border-radius:7px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.tn:hover{background:var(--brand-tint);color:var(--brand-deep)}
.tn.cur{color:var(--brand-deep);font-weight:700}
.bar-cta{border:1px solid var(--brand);background:none;color:var(--brand-deep);font-family:var(--sans);font-size:14px;font-weight:700;padding:8px 15px;border-radius:var(--rctrl);cursor:pointer;white-space:nowrap;transition:background .15s}
.bar-cta:hover{background:var(--brand-tint)}

#app{max-width:1060px;margin:0 auto;padding:0 30px 120px}

/* cover */
.cover{min-height:calc(100vh - 51px);display:none;align-items:center}
.cover.active{display:flex}
.cover-inner{padding:40px 0 60px;max-width:820px}
.eyebrow{display:inline-block;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:700;border-bottom:2px solid var(--gold);padding-bottom:5px;margin-bottom:26px}
.cover h1{font-family:var(--serif);font-weight:400;font-size:76px;line-height:1;letter-spacing:-.02em;color:var(--brand-deep);margin:0 0 .22em}
.cover-lede{font-size:22px;line-height:1.5;color:var(--ink-2);max-width:620px;margin:0 0 30px}
.cchips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:40px}
.cchip{font-size:13.5px;font-weight:600;color:var(--brand-deep);background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:7px 15px;box-shadow:var(--sh-card)}
.enter{display:inline-block;font-family:var(--sans);font-size:16px;font-weight:700;color:#fff;background:var(--wash-brand);border:0;border-radius:var(--rctrl);padding:15px 28px;cursor:pointer;text-decoration:none;transition:filter .15s,transform .15s}
.enter:hover{filter:brightness(1.08);transform:translateY(-1px)}

/* section heads */
.sec-head{max-width:720px;margin:46px 0 30px}
.sec-head.center{text-align:center;margin-left:auto;margin-right:auto}
.kicker{display:inline-block;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:14px}
.sec-head h2{font-family:var(--serif);font-weight:400;font-size:46px;line-height:1.08;letter-spacing:-.02em;color:var(--brand-deep);margin:0 0 .3em}
.lede{font-size:19px;line-height:1.55;color:var(--ink-2);margin:0}
.back{margin-top:30px;border:1px solid var(--border);background:var(--surface);color:var(--ink-2);font-family:var(--sans);font-size:14px;font-weight:600;border-radius:var(--rctrl);padding:8px 15px;cursor:pointer;transition:background .15s}
.back:hover{background:var(--brand-tint);color:var(--brand-deep)}

/* segment grid */
.toc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto}
.toc{position:relative;text-align:left;display:grid;grid-template-rows:auto auto auto;row-gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rcard);padding:24px 22px;cursor:pointer;box-shadow:var(--sh-card);transition:transform .15s,box-shadow .15s,border-color .15s}
.toc:hover{transform:translateY(-3px);box-shadow:var(--sh-hot);border-color:var(--brand)}
.toc-t{font-family:var(--serif);font-size:24px;color:var(--brand-deep);line-height:1.1}
.toc-s{font-size:14px;color:var(--ink-3)}
.toc-price{margin-top:8px;font-size:14px;font-weight:700;color:var(--brand)}
.toc-go{position:absolute;top:24px;right:22px;color:var(--brand);font-size:20px;opacity:0;transition:opacity .15s,transform .15s}
.toc:hover .toc-go{opacity:1;transform:translateX(3px)}

.home-foot{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:30px auto 0}
.home-link{border:1px solid var(--border);background:var(--surface);color:var(--brand-deep);font-family:var(--sans);font-size:14.5px;font-weight:600;border-radius:var(--rctrl);padding:10px 18px;cursor:pointer;transition:all .15s}
.home-link:hover{background:var(--brand-tint);border-color:var(--brand)}

/* starts-at */
.startsat{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 10px}
.startsat-k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:700}
.startsat-n{font-family:var(--serif);font-size:40px;line-height:1;color:var(--brand-deep);font-variant-numeric:tabular-nums}
.sizing{font-size:14px;color:var(--ink-3);margin:10px 0 0;font-weight:500}

/* fit cards */
.fits-h{font-family:var(--serif);font-weight:400;font-size:22px;color:var(--brand-deep);margin:34px 0 14px}
.fits{display:grid;gap:14px;max-width:860px}
.fit{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:var(--rcard);padding:20px 22px;box-shadow:var(--sh-card)}
.fit-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:6px}
.fit-head h4{font-family:var(--serif);font-weight:400;font-size:20px;color:var(--brand-deep);margin:0}
.fit-price{font-size:14.5px;font-weight:700;color:var(--brand);white-space:nowrap;font-variant-numeric:tabular-nums}
.fit-line{font-size:15.5px;color:var(--ink-2);margin:0;line-height:1.55}

.pull{margin:30px 0;padding:4px 0 4px 26px;border-left:3px solid var(--gold);font-family:var(--serif);font-size:24px;line-height:1.4;color:var(--brand-deep);max-width:820px;font-style:italic}
.buy{display:grid;grid-template-columns:120px 1fr;gap:16px;max-width:820px;padding:18px 0;border-top:1px solid var(--border)}
.buy-k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:700;padding-top:2px}
.buy p{margin:0;font-size:15.5px;color:var(--ink-2);line-height:1.55}

/* editorial grid (pricing) */
.grid{display:grid;gap:16px;margin:26px 0}
.g3{grid-template-columns:repeat(3,1fr)}
.ecard{background:var(--surface);border:1px solid var(--border);border-radius:var(--rcard);padding:24px 22px;box-shadow:var(--sh-card)}
.ecard h4{font-family:var(--serif);font-weight:400;font-size:20px;color:var(--brand-deep);margin:0 0 .4em}
.ecard p{font-size:15px;color:var(--ink-2);margin:0;line-height:1.55}
.streamcard{border-top:3px solid var(--brand)}
.snum{font-family:var(--serif);font-size:28px;color:var(--brand);opacity:.5;line-height:1;margin-bottom:8px}
.notes{list-style:none;padding:0;margin:26px 0 0;max-width:820px}
.notes li{position:relative;padding:16px 0 16px 24px;border-top:1px solid var(--border);font-size:15px;color:var(--ink-2);line-height:1.55}
.notes li::before{content:"";position:absolute;left:0;top:23px;width:8px;height:8px;border-radius:2px;background:var(--gold)}

/* contact */
.contact-cta{max-width:720px;margin:10px 0 0}
.contact-sub{font-size:14.5px;color:var(--ink-3);margin:18px 0 0}

/* section nav */
.secnav{display:flex;justify-content:space-between;gap:12px;margin-top:50px;padding-top:26px;border-top:1px solid var(--border)}
.secnav-btn{border:1px solid var(--border);background:var(--surface);color:var(--brand-deep);font-family:var(--sans);font-size:15px;font-weight:600;border-radius:var(--rctrl);padding:12px 18px;cursor:pointer;transition:all .15s}
.secnav-btn:hover{background:var(--brand-tint);border-color:var(--brand)}
.secnav-btn.next{margin-left:auto}

@media(max-width:820px){
  .cover h1{font-size:48px}.sec-head h2{font-size:34px}
  .toc-grid,.g3{grid-template-columns:1fr}
  .topnav{display:none}
  .buy{grid-template-columns:1fr;gap:6px}
}
`;

const SCRIPT = `
(function(){
  var views=[].slice.call(document.querySelectorAll('.view'));
  function show(id){
    var found=false;
    views.forEach(function(v){var on=v.getAttribute('data-view')===id;v.classList.toggle('active',on);if(on)found=true;});
    if(!found){views.forEach(function(v){v.classList.toggle('active',v.getAttribute('data-view')==='cover');});}
    document.querySelectorAll('.tn').forEach(function(t){t.classList.toggle('cur',t.getAttribute('data-nav')===id);});
    window.scrollTo(0,0);
  }
  document.addEventListener('click',function(e){
    var nav=e.target.closest('[data-nav]');
    if(nav){show(nav.getAttribute('data-nav'));}
  });
})();
`;

function page(bodyHtml, inlineScript) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Civic Chain · Pricing</title>
${fonts.style}
<style>${STYLE}</style>
</head><body>
${bodyHtml}
<script>${inlineScript}</script>
</body></html>`;
}

if (!doEncrypt) {
  mkdirSync('site', { recursive: true });
  const html = page(BODY, SCRIPT);
  writeFileSync('site/index.html', html);
  console.log('WROTE site/index.html  (' + (html.length / 1024).toFixed(0) + ' KB; fonts ' + fonts.kb.toFixed(0) + ' KB; brand ' + (brand.ok ? 'inlined' : 'TEXT') + ')  [PUBLIC]');
} else {
  // Optional AES-GCM gate (kept for parity with the VC catalog; off by default for this public catalog).
  const ITER = 250000;
  const WORDS = ['harbor','ledger','quorum','granite','beacon','tide','charter','summit','anchor','maple','cobalt','mercer','vantage','haven','sterling','compass'];
  const genPass = () => { const b = crypto.getRandomValues(new Uint8Array(4)); return [...b].map(i => WORDS[i % WORDS.length]).join('-') + '-' + (crypto.getRandomValues(new Uint8Array(1))[0] % 90 + 10); };
  const passphrase = args[args.indexOf('--encrypt') + 1] && !args[args.indexOf('--encrypt') + 1].startsWith('--') ? args[args.indexOf('--encrypt') + 1] : genPass();
  const payloadHtml = `<style>${STYLE}</style>${BODY}<script>${SCRIPT}<\/script>`;
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const b64 = (buf) => Buffer.from(buf).toString('base64');
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(payloadHtml));
  const payload = { salt: b64(salt), iv: b64(iv), ct: b64(ct), iter: ITER };
  const gate = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Civic Chain · Pricing</title>${fonts.style}
<style>:root{--brand-deep:#262067;--brand:#3d3c86;--gold:#8a6a2f;--paper:#faf9f6;--surface:#fff;--ink:#16123a;--ink-3:#817c99;--border:rgba(22,18,58,.11)}
*{box-sizing:border-box}body{margin:0;font-family:"DM Sans",sans-serif;background:var(--paper);${gridBg}color:var(--ink);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--gold);border-radius:14px;max-width:440px;width:100%;padding:44px 40px;box-shadow:0 18px 50px rgba(22,18,58,.12)}
.card h1{font-family:"DM Serif Text",serif;font-weight:400;font-size:30px;color:var(--brand-deep);margin:.1em 0 .3em}
.sub{color:var(--ink-3);font-size:14.5px;margin:0 0 24px}label{display:block;font-size:12.5px;font-weight:600;margin-bottom:7px}
input{width:100%;padding:13px 15px;font-size:16px;border:1px solid var(--border);border-radius:9px}
button{margin-top:16px;width:100%;padding:13px;font-size:15px;font-weight:700;color:#fff;background:var(--brand-deep);border:0;border-radius:9px;cursor:pointer}
.err{color:#9a1b1b;font-size:13px;min-height:18px;margin-top:10px}</style></head>
<body><div class="card"><h1>Pricing</h1><p class="sub">This catalog is protected. Enter the passphrase shared with you.</p>
<form id="f"><label for="p">Passphrase</label><input type="password" id="p" autocomplete="off" autofocus><button type="submit">Unlock</button><div class="err" id="e"></div></form></div>
<script>var D=${JSON.stringify(payload)};var dec=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
document.getElementById('f').addEventListener('submit',async function(ev){ev.preventDefault();var e=document.getElementById('e');e.textContent='';
try{var bk=await crypto.subtle.importKey('raw',new TextEncoder().encode(document.getElementById('p').value),'PBKDF2',false,['deriveKey']);
var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:dec(D.salt),iterations:D.iter,hash:'SHA-256'},bk,{name:'AES-GCM',length:256},false,['decrypt']);
var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:dec(D.iv)},k,dec(D.ct));
document.open();document.write('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">'+${JSON.stringify(fonts.style)}+'</head><body>'+new TextDecoder().decode(pt)+'</body></html>');document.close();
}catch(_){e.textContent='Incorrect passphrase.'}});<\/script></body></html>`;
  mkdirSync('site', { recursive: true });
  writeFileSync('site/index.html', gate);
  console.log('WROTE site/index.html  (' + (gate.length / 1024).toFixed(0) + ' KB; GATED)');
  console.log('PASSPHRASE: ' + passphrase);
}
