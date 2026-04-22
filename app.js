/* ============================================================
   AUDITOR DA BOLSA — app.js
   Lógica de cotações ao vivo, rankings Graham/Bazin e movers
   ============================================================ */

// ---------- FORMATADORES ----------
const fmtBRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtUSD = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtPct = (v) =>
  (v >= 0 ? "+" : "") +
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) +
  "%";
const fmtNum = (v, d = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

// ---------- COTAÇÕES AO VIVO ----------
let quotesCache = {};

async function fetchQuotes() {
  try {
    const [awesomeRes, coinRes, brapiRes] = await Promise.all([
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,XAU-BRL"),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
      fetch("https://brapi.dev/api/quote/%5EBVSP"),
    ]);

    const awesome = await awesomeRes.json();
    const coin = await coinRes.json();
    const brapi = await brapiRes.json();

    const goldPerOz = parseFloat(awesome.XAUBRL?.bid || 0);
    const goldPerG = goldPerOz / 31.1035;
    const goldPrevOz = parseFloat(awesome.XAUBRL?.high || goldPerOz);
    const goldPrevG = goldPrevOz / 31.1035;

    quotesCache = {
      USD: parseFloat(awesome.USDBRL?.bid),
      USDprev: parseFloat(awesome.USDBRL?.pctChange)
        ? parseFloat(awesome.USDBRL.bid) / (1 + parseFloat(awesome.USDBRL.pctChange) / 100)
        : null,
      EUR: parseFloat(awesome.EURBRL?.bid),
      EURprev: parseFloat(awesome.EURBRL?.pctChange)
        ? parseFloat(awesome.EURBRL.bid) / (1 + parseFloat(awesome.EURBRL.pctChange) / 100)
        : null,
      GOLD: goldPerG,
      GOLDprev: goldPrevG,
      BTC: coin.bitcoin?.usd,
      BTCprev: coin.bitcoin?.usd_24h_change
        ? coin.bitcoin.usd / (1 + coin.bitcoin.usd_24h_change / 100)
        : null,
      ETH: coin.ethereum?.usd,
      ETHprev: coin.ethereum?.usd_24h_change
        ? coin.ethereum.usd / (1 + coin.ethereum.usd_24h_change / 100)
        : null,
      IBOV: brapi.results?.[0]?.regularMarketPrice,
      IBOVprev: brapi.results?.[0]?.regularMarketPreviousClose,
    };

    renderTicker();
    renderMarketCards();
    document.getElementById("ticker-status").textContent = "Ao vivo";
  } catch (e) {
    console.error("Quote fetch error:", e);
    document.getElementById("ticker-status").textContent = "Erro ao carregar";
  }
}

// ---------- TICKER ----------
function renderTicker() {
  const items = [
    { label: "DÓLAR", value: quotesCache.USD, prev: quotesCache.USDprev, fmt: "brl" },
    { label: "EURO", value: quotesCache.EUR, prev: quotesCache.EURprev, fmt: "brl" },
    { label: "OURO / g", value: quotesCache.GOLD, prev: quotesCache.GOLDprev, fmt: "brl" },
    { label: "BITCOIN", value: quotesCache.BTC, prev: quotesCache.BTCprev, fmt: "usd" },
    { label: "ETHEREUM", value: quotesCache.ETH, prev: quotesCache.ETHprev, fmt: "usd" },
  ];

  const buildItem = (it) => {
    if (it.value == null) return "";
    const change = it.prev ? ((it.value - it.prev) / it.prev) * 100 : 0;
    const up = change >= 0;
    const value = it.fmt === "brl" ? fmtBRL(it.value) : fmtUSD(it.value);
    return `
      <div class="ticker-item">
        <span class="ticker-label-inner">${it.label}</span>
        <span class="ticker-value">${value}</span>
        ${it.prev ? `<span class="ticker-change ${up ? "up" : "down"}">${fmtPct(change)}</span>` : ""}
      </div>
    `;
  };

  const html = [...items, ...items, ...items].map(buildItem).join("");
  document.getElementById("ticker-track").innerHTML = html;
}

// ---------- MARKET CARDS ----------
function renderMarketCards() {
  const cards = [
    { label: "Dólar Comercial", short: "USD/BRL", value: quotesCache.USD, prev: quotesCache.USDprev, fmt: "brl", icon: iconDollar() },
    { label: "Euro", short: "EUR/BRL", value: quotesCache.EUR, prev: quotesCache.EURprev, fmt: "brl", icon: iconEuro() },
    { label: "Ouro", short: "BRL / g", value: quotesCache.GOLD, prev: quotesCache.GOLDprev, fmt: "brl", icon: iconGem() },
    { label: "Bitcoin", short: "BTC / USD", value: quotesCache.BTC, prev: quotesCache.BTCprev, fmt: "usd", icon: iconBTC() },
    { label: "Ethereum", short: "ETH / USD", value: quotesCache.ETH, prev: quotesCache.ETHprev, fmt: "usd", icon: iconActivity() },
    { label: "Ibovespa", short: "^BVSP", value: quotesCache.IBOV, prev: quotesCache.IBOVprev, fmt: "pts", icon: iconBar() },
  ];

  const buildCard = (c) => {
    const change = c.prev && c.value ? ((c.value - c.prev) / c.prev) * 100 : 0;
    const up = change >= 0;
    const value = c.value
      ? c.fmt === "brl"
        ? fmtBRL(c.value)
        : c.fmt === "usd"
        ? fmtUSD(c.value)
        : fmtNum(c.value, 0) + " pts"
      : "—";
    return `
      <div class="market-card">
        <div class="market-card-head">
          <div>
            <div class="market-card-label">${c.label}</div>
            <div class="market-card-short">${c.short}</div>
          </div>
          <div class="market-card-icon">${c.icon}</div>
        </div>
        <div class="market-card-value">${value}</div>
        ${
          c.prev && c.value
            ? `<div class="market-card-change ${up ? "up" : "down"}">
                 ${up ? "▲" : "▼"} ${fmtPct(change)}
                 <span class="muted" style="font-size:12px">(24h)</span>
               </div>`
            : ""
        }
      </div>
    `;
  };

  document.getElementById("market-cards").innerHTML = cards.map(buildCard).join("");
}

// ---------- IBOV MOVERS ----------
const IBOV_TICKERS = [
  "VALE3","PETR4","ITUB4","BBDC4","ABEV3","WEGE3","BBAS3","B3SA3","ITSA4","MGLU3",
  "SUZB3","RENT3","RAIL3","LREN3","EQTL3","GGBR4","JBSS3","CSNA3","PRIO3","CMIG4",
  "VIVT3","CPLE6","ELET3","HYPE3","BRFS3","TOTS3","UGPA3","CSAN3","CCRO3","EMBR3",
  "AZUL4","GOLL4","CVCB3","IRBR3","HAPV3","RDOR3","NTCO3","ENGI11","KLBN11","SANB11",
  "BRAP4","CYRE3","MRFG3","BEEF3","SBSP3","TAEE11","TIMS3","VBBR3","USIM5","RADL3",
];

let moversData = { altas: [], baixas: [] };
let currentMoversTab = "altas";

async function fetchMovers() {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${IBOV_TICKERS.join(",")}`);
    const json = await res.json();
    const results = (json.results || []).filter((r) => r.regularMarketChangePercent != null);
    const sorted = [...results].sort(
      (a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent
    );
    moversData = {
      altas: sorted.slice(0, 10),
      baixas: sorted.slice(-10).reverse(),
    };
    renderMovers();
  } catch (e) {
    console.error("Movers fetch error:", e);
    document.getElementById("movers-body").innerHTML = `
      <tr><td colspan="5" class="center muted pad">Dados indisponíveis no momento.</td></tr>
    `;
  }
}

function renderMovers() {
  const list = moversData[currentMoversTab] || [];
  if (list.length === 0) {
    document.getElementById("movers-body").innerHTML = `
      <tr><td colspan="5" class="center muted pad">Sem dados.</td></tr>
    `;
    return;
  }

  const html = list
    .map((s, i) => {
      const up = s.regularMarketChangePercent >= 0;
      return `
      <tr>
        <td class="rank-num">${i + 1}</td>
        <td class="sym">${s.symbol}</td>
        <td class="hide-sm muted" style="font-size:13px">${s.longName || s.shortName || "—"}</td>
        <td class="right">${fmtBRL(s.regularMarketPrice)}</td>
        <td class="right ${up ? "gain" : "loss"}">${fmtPct(s.regularMarketChangePercent)}</td>
      </tr>
    `;
    })
    .join("");

  document.getElementById("movers-body").innerHTML = html;
  document.getElementById("movers-tab-label").textContent =
    currentMoversTab === "altas" ? "altas" : "baixas";
}

document.querySelectorAll("[data-movers]").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentMoversTab = btn.getAttribute("data-movers");
    document.querySelectorAll("[data-movers]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderMovers();
  });
});

// ---------- RANKINGS GRAHAM / BAZIN ----------
const UNIVERSO_RANKINGS = [
  "BBAS3","BBDC4","ITUB4","ITSA4","SANB11","BBSE3","PSSA3","VALE3","PETR4","PETR3",
  "CMIG4","CPLE6","EGIE3","TAEE11","TRPL4","ELET3","ELET6","VIVT3","TIMS3","ALUP11",
  "GOAU4","GGBR4","USIM5","CSNA3","KLBN11","SUZB3","FESA4","UNIP6","ABEV3","JBSS3",
  "MRFG3","BEEF3","BRFS3","CSMG3","SBSP3","SAPR11","CXSE3","WEGE3","RANI3","CMIN3",
  "TUPY3","ROMI3","POMO4","AGRO3","SLCE3","ITSA3","BRAP4","CRFB3","PRIO3","RECV3",
];

let rankingsData = { graham: [], bazin: [] };
let currentRanksTab = "graham";

async function fetchRankings() {
  try {
    const chunks = [];
    for (let i = 0; i < UNIVERSO_RANKINGS.length; i += 20) {
      chunks.push(UNIVERSO_RANKINGS.slice(i, i + 20));
    }
    const allData = [];
    for (const chunk of chunks) {
      const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(",")}?fundamental=true`);
      const json = await res.json();
      if (json.results) allData.push(...json.results);
    }

    const graham = allData
      .map((s) => {
        const lpa = s.earningsPerShare;
        const vpa = s.priceToBook ? s.regularMarketPrice / s.priceToBook : null;
        if (!lpa || lpa <= 0 || !vpa || vpa <= 0) return null;
        const vi = Math.sqrt(22.5 * lpa * vpa);
        const margem = ((vi - s.regularMarketPrice) / s.regularMarketPrice) * 100;
        return {
          symbol: s.symbol,
          name: s.longName || s.shortName,
          price: s.regularMarketPrice,
          lpa, vpa, vi, margem,
        };
      })
      .filter((x) => x && x.margem > 0)
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 10);

    const bazin = allData
      .map((s) => {
        const dy = s.dividendYield;
        if (!dy || dy < 0.04) return null;
        const dpa = (dy / 100) * s.regularMarketPrice;
        const precoTeto = dpa / 0.06;
        const margem = ((precoTeto - s.regularMarketPrice) / s.regularMarketPrice) * 100;
        return {
          symbol: s.symbol,
          name: s.longName || s.shortName,
          price: s.regularMarketPrice,
          dy, dpa, precoTeto, margem,
        };
      })
      .filter((x) => x && x.margem > 0)
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 10);

    rankingsData = { graham, bazin };
    renderRankings();
  } catch (e) {
    console.error("Rankings error:", e);
    document.getElementById("rankings-body").innerHTML = `
      <tr><td colspan="7" class="center muted pad">Dados indisponíveis no momento.</td></tr>
    `;
  }
}

function renderRankings() {
  const isGraham = currentRanksTab === "graham";
  const data = rankingsData[currentRanksTab] || [];

  document.getElementById("rankings-tab-label").textContent = isGraham ? "Graham" : "Bazin";
  document.getElementById("rankings-formula").textContent = isGraham
    ? "VI = √(22,5 × LPA × VPA) — ranking pela margem de segurança"
    : "Preço Teto = DPA ÷ 0,06 (DY-alvo 6%) — ranking pela margem";

  // Header
  const headHTML = isGraham
    ? `
      <tr>
        <th>#</th>
        <th>Ticker</th>
        <th class="right">Preço</th>
        <th class="right hide-sm">LPA</th>
        <th class="right hide-sm">VPA</th>
        <th class="right">VI Graham</th>
        <th class="right">Margem</th>
      </tr>
    `
    : `
      <tr>
        <th>#</th>
        <th>Ticker</th>
        <th class="right">Preço</th>
        <th class="right hide-sm">DY</th>
        <th class="right hide-sm">DPA</th>
        <th class="right">Preço Teto</th>
        <th class="right">Margem</th>
      </tr>
    `;
  document.getElementById("rankings-head").innerHTML = headHTML;

  if (data.length === 0) {
    document.getElementById("rankings-body").innerHTML = `
      <tr><td colspan="7" class="center muted pad">Nenhuma ação atende aos critérios no momento.</td></tr>
    `;
    return;
  }

  const html = data
    .map((s, i) => {
      if (isGraham) {
        return `
          <tr>
            <td class="rank-num">${i + 1}</td>
            <td class="sym">${s.symbol}</td>
            <td class="right">${fmtBRL(s.price)}</td>
            <td class="right hide-sm">${fmtNum(s.lpa)}</td>
            <td class="right hide-sm">${fmtNum(s.vpa)}</td>
            <td class="right vi">${fmtBRL(s.vi)}</td>
            <td class="right gain">+${fmtNum(s.margem, 1)}%</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td class="rank-num">${i + 1}</td>
            <td class="sym">${s.symbol}</td>
            <td class="right">${fmtBRL(s.price)}</td>
            <td class="right hide-sm vi">${fmtNum(s.dy, 2)}%</td>
            <td class="right hide-sm">${fmtBRL(s.dpa)}</td>
            <td class="right vi">${fmtBRL(s.precoTeto)}</td>
            <td class="right gain">+${fmtNum(s.margem, 1)}%</td>
          </tr>
        `;
      }
    })
    .join("");
  document.getElementById("rankings-body").innerHTML = html;
}

document.querySelectorAll("[data-rank]").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentRanksTab = btn.getAttribute("data-rank");
    document.querySelectorAll("[data-rank]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderRankings();
  });
});

// ---------- ÍCONES SVG ----------
function iconDollar() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`;
}
function iconEuro() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12M4 14h12M18 21a10 10 0 110-18"/></svg>`;
}
function iconGem() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/></svg>`;
}
function iconBTC() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/></svg>`;
}
function iconActivity() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
}
function iconBar() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`;
}

// ---------- REFRESH BUTTON ----------
document.getElementById("btn-refresh").addEventListener("click", () => {
  const svg = document.querySelector("#btn-refresh svg");
  svg.classList.add("loading");
  Promise.all([fetchQuotes(), fetchMovers(), fetchRankings()]).finally(() => {
    setTimeout(() => svg.classList.remove("loading"), 600);
  });
});

// ---------- YEAR ----------
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- INIT ----------
fetchQuotes();
fetchMovers();
fetchRankings();
setInterval(fetchQuotes, 60000);
