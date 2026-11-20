/**
 * ============================================================================
 * MACMO AI CONCIERGE — GROUNDED CONVERSATIONAL SALES & SUPPORT AGENT (v2)
 * ============================================================================
 * Golden rule: the agent ONLY answers from real, verifiable sources —
 *   1. Live product catalog (window.MACMO_STORE, incl. Admin Portal overrides)
 *   2. Trade-In valuation matrix (MACMO_STORE.tradeInCatalog)
 *   3. Store settings (site-config.js + Admin Portal "Store & Hotlines")
 *   4. Owner-taught knowledge (Admin Portal → AI Concierge → Custom Knowledge)
 *   5. The website's own text (every section of index.html) + privacy.html policies
 * If none of these contain the answer, it says so honestly and offers a human
 * hand-off on WhatsApp — it never invents products, prices or policies.
 *
 * Optional: Cloud language model via a secure Netlify Function proxy
 * (/.netlify/functions/macmo-ai). The API key lives ONLY in Netlify env vars.
 *
 * Headless mode (used by the Admin Portal test console):
 *   window.MACMO_AI_HEADLESS = true  → no widget is injected
 *   window.MacMoAI.ask('question')   → Promise<{ html, chips, intent, answered }>
 * ============================================================================
 */

(function () {
  'use strict';

  const AI_SETTINGS_KEY = 'macmo_ai_settings';
  const AI_LOG_KEY = 'macmo_ai_log';
  const HEADLESS = window.MACMO_AI_HEADLESS === true;
  const ASSET_PREFIX = window.MACMO_AI_ASSET_PREFIX || '';
  const PAGE_PREFIX = HEADLESS ? '../' : '';

  const DEFAULT_AI_SETTINGS = {
    enabled: true,
    assistantName: 'MacMo AI Concierge',
    greeting: '',
    customFaqs: [],            // [{ id, keywords: 'warranty, guarantee', answer: '...' }]
    bulkTiers: [],             // [{ minQty: 5, pct: 3 }] — empty = no automatic discount figures
    cloudEnabled: false,
    cloudEndpoint: '/.netlify/functions/macmo-ai',
    logConversations: true
  };

  let remoteAISettings = null;
  let remoteStoreSettings = null;
  let siteIndex = [];          // [{ source, sectionId, title, heading, text, link }]
  let siteIndexReady = false;

  const sessionMemory = {
    lastProduct: null,
    lastProductsList: [],
    lastCategory: null,
    lastTradeInModel: null,
    lastQuantity: 1,
    history: []
  };

  // ==========================================================================
  // 1. KNOWLEDGE SOURCES
  // ==========================================================================
  function getAISettings() {
    let local = {};
    try { local = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}') || {}; } catch (e) { local = {}; }
    // Cloud (Firestore) settings published by the admin win over local previews
    return Object.assign({}, DEFAULT_AI_SETTINGS, local, remoteAISettings || {});
  }

  function getStoreInfo() {
    let local = {};
    try { local = JSON.parse(localStorage.getItem('macmo_store_settings') || '{}') || {}; } catch (e) { local = {}; }
    const base = window.MACMO_CONFIG || {};
    const merged = Object.assign({}, base, local, remoteStoreSettings || {});
    const wa = String(merged.whatsappPrimary || '260972756767').replace(/[^0-9]/g, '');
    const defaultBranches = {
      townCenter: {
        name: 'Town Center Branch',
        address: 'Kalundwe Road, Cha-Cha Rd Corner, Voltic Building, Lusaka',
        hours: 'Mon to Sun: 07:30 – 18:30',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Voltic+Building+Kalundwe+Road+Cha+Cha+Road+Lusaka+Zambia'
      },
      silverest: {
        name: 'Silverest Branch',
        address: 'Asado Complex Shop #1, Opposite University of Lusaka (UNILUS), Silverest Campus, Great East Road',
        hours: 'Mon to Sat: 09:00 – 18:00',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Asado+Complex+University+of+Lusaka+Silverest+Campus+Great+East+Road+Lusaka+Zambia'
      }
    };
    const branches = Object.assign({}, defaultBranches, merged.branches || {});
    if (merged.townCenterAddress) branches.townCenter.address = merged.townCenterAddress;
    if (merged.townCenterHours) branches.townCenter.hours = merged.townCenterHours;
    if (merged.silverestAddress) branches.silverest.address = merged.silverestAddress;
    if (merged.silverestHours) branches.silverest.hours = merged.silverestHours;
    return {
      brandName: merged.brandName || 'MacMo Electronics',
      brandSlogan: merged.brandSlogan || 'Innovate. Elevate. Connect.',
      whatsapp: wa,
      phonePrimary: merged.phoneDisplayPrimary || ('+' + wa),
      phoneSecondary: merged.phoneDisplaySecondary || '',
      location: merged.storeLocation || 'Town Center (Voltic Building, Kalundwe & Cha-Cha Rd) • Silverest (Asado Complex Shop #1, Opp. UNILUS)',
      landmark: merged.landmark || 'Voltic Building (Town Center) & Opposite UNILUS Silverest Campus (Great East Road)',
      branches,
      hoursWeekday: merged.hoursWeekday || 'Town Center: Mon–Sun 07:30–18:30 | Silverest: Mon–Sat 09:00–18:00',
      hoursSunday: merged.hoursSunday || 'Town Center Open Sundays (07:30 – 18:30) • Silverest Closed Sundays',
      deliveryNotice: merged.deliveryNotice || '',
      warrantyNotice: merged.warrantyNotice || '',
      email: merged.email || ''
    };
  }

  function getCatalog() {
    let list = [];
    if (window.MACMO_STORE && Array.isArray(window.MACMO_STORE.products)) {
      list = window.MACMO_STORE.products;
    }
    if (HEADLESS) {
      // Admin test console: use the admin's live working catalog
      try {
        const override = JSON.parse(localStorage.getItem('macmo_catalog_override') || 'null');
        if (Array.isArray(override) && override.length) list = override;
      } catch (e) {}
    }
    let deleted = [];
    try { deleted = JSON.parse(localStorage.getItem('macmo_deleted_product_ids') || '[]'); } catch (e) {}
    return list.filter(p => p && p.id && !deleted.includes(p.id));
  }

  function getTradeInCatalog() {
    return (window.MACMO_STORE && window.MACMO_STORE.tradeInCatalog) || {};
  }

  function isInStock(p) {
    return !(p.stock && /sold\s*out/i.test(p.stock));
  }

  // Live Firestore listeners so every customer sees what the admin publishes
  function initCloudSettingsSync() {
    try {
      if (!(window.MACMO_FIREBASE && window.MACMO_FIREBASE.enabled && window.firebase)) return;
      if (!firebase.apps.length) firebase.initializeApp(window.MACMO_FIREBASE.config);
      const db = firebase.firestore();
      db.collection('settings').doc('ai').onSnapshot(doc => {
        remoteAISettings = doc.exists ? doc.data() : null;
        applyEnabledState();
      }, () => {});
      db.collection('settings').doc('store').onSnapshot(doc => {
        remoteStoreSettings = doc.exists ? doc.data() : null;
      }, () => {});
    } catch (e) {}
  }

  // Cross-tab instant preview when the admin saves in another tab
  try {
    const bc = new BroadcastChannel('macmo_ai_channel');
    bc.onmessage = () => applyEnabledState();
  } catch (e) {}

  // --------------------------------------------------------------------------
  // Website text index (reads EVERY section of the website + store policies)
  // --------------------------------------------------------------------------
  function cleanText(t) {
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  function indexDocument(doc, source, linkBase) {
    const chunks = [];
    const sections = doc.querySelectorAll('main section, footer, .onetech-characteristics');
    sections.forEach(sec => {
      const sectionId = sec.id || '';
      const h2 = sec.querySelector('h2');
      const title = cleanText(h2 ? h2.textContent : (sectionId || 'MacMo Electronics'));
      let heading = title;
      sec.querySelectorAll('h2, h3, h4, p, li, .char-title, .char-sub').forEach(el => {
        if (el.closest('#productsGrid, select, .modal-overlay, .macmo-ai-widget, form')) return;
        const tag = el.tagName.toLowerCase();
        const text = cleanText(el.textContent);
        if (!text || text.length < 3) return;
        if (tag === 'h3' || tag === 'h4') heading = text;
        chunks.push({
          source,
          sectionId,
          title,
          heading,
          text,
          link: sectionId ? `${linkBase}#${sectionId}` : linkBase
        });
      });
    });
    return chunks;
  }

  function indexPolicyDocument(doc) {
    const chunks = [];
    const cards = doc.querySelectorAll('.policy-card');
    if (cards && cards.length) {
      cards.forEach(card => {
        const sectionId = card.id || 'policies';
        const h2 = card.querySelector('h2');
        const heading = cleanText(h2 ? h2.textContent : 'Store Policies');
        card.querySelectorAll('p, li').forEach(el => {
          const text = cleanText(el.textContent);
          if (!text || text.length < 3) return;
          chunks.push({
            source: 'policies',
            sectionId,
            title: 'Warranty, Returns & Store Policies',
            heading,
            text,
            link: PAGE_PREFIX + 'privacy.html' + (sectionId ? '#' + sectionId : '')
          });
        });
      });
      return chunks;
    }
    let heading = 'Store Policies';
    doc.querySelectorAll('h1, h2, h3, h4, p, li').forEach(el => {
      const tag = el.tagName.toLowerCase();
      const text = cleanText(el.textContent);
      if (!text || text.length < 3) return;
      if (/^h[1-4]$/.test(tag)) { heading = text; return; }
      chunks.push({
        source: 'policies',
        sectionId: 'policies',
        title: 'Warranty, Returns & Store Policies',
        heading,
        text,
        link: PAGE_PREFIX + 'privacy.html'
      });
    });
    return chunks;
  }

  async function buildSiteIndex() {
    const chunks = [];
    try {
      if (HEADLESS) {
        const res = await fetch(PAGE_PREFIX + 'index.html', { cache: 'no-store' });
        if (res.ok) {
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          chunks.push(...indexDocument(doc, 'website', PAGE_PREFIX + 'index.html'));
        }
      } else {
        chunks.push(...indexDocument(document, 'website', ''));
      }
    } catch (e) {}
    try {
      const res = await fetch(PAGE_PREFIX + 'privacy.html', { cache: 'no-store' });
      if (res.ok) {
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        chunks.push(...indexPolicyDocument(doc));
      }
    } catch (e) {}
    siteIndex = chunks;
    siteIndexReady = true;
  }

  // ==========================================================================
  // 2. TEXT UTILITIES
  // ==========================================================================
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatK(amount) {
    const num = Number(amount) || 0;
    return `K ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatKShort(amount) {
    return `K ${Math.round(Number(amount) || 0).toLocaleString('en-US')}`;
  }

  const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'what', 'whats', 'how', 'much', 'can', 'you', 'your', 'have', 'has',
    'get', 'want', 'need', 'looking', 'tell', 'about', 'from', 'macmo', 'please', 'does', 'do', 'are', 'there', 'any', 'is',
    'it', 'this', 'that', 'a', 'an', 'to', 'of', 'in', 'on', 'me', 'my', 'i', 'we', 'our', 'us', 'be', 'or', 'if', 'at',
    'by', 'which', 'who', 'when', 'where', 'why', 'will', 'would', 'could', 'should', 'some', 'show', 'give', 'know', 'electronics']);

  function tokenize(text) {
    return String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
      .map(w => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
  }

  // ==========================================================================
  // 3. ENTITY EXTRACTION
  // ==========================================================================
  const CATEGORY_MAP = {
    phones: /\b(phones?|smartphones?|iphones?|mobile|handsets?|android)\b/i,
    computers: /\b(laptops?|computers?|macbooks?|notebooks?|pc|workstations?)\b/i,
    gaming: /\b(gaming|games?|ps5|ps4|playstation|consoles?|gamer)\b/i,
    tablets: /\b(tablets?|ipads?)\b/i,
    audio: /\b(audio|earphones?|earbuds?|airpods|buds|headphones?|speakers?|jbl|sound|music)\b/i,
    wearables: /\b(watch(es)?|smartwatch(es)?|wearables?|fitness\s*tracker)\b/i,
    power: /\b(power\s*banks?|powerbanks?|power\s*stations?|ecoflow|romoss|load\s*shedding|loadshedding|blackouts?|zesco|backup\s*power|inverters?|ups)\b/i,
    accessories: /\b(accessor(y|ies)|chargers?|adapters?|cables?|gimbals?|dji)\b/i
  };

  const CATEGORY_TITLES = {
    phones: 'Smartphones', computers: 'Laptops', gaming: 'PlayStation & Gaming', tablets: 'iPads & Tablets',
    audio: 'Audio & Speakers', wearables: 'Smartwatches', power: 'Power & Load-Shedding Backup', accessories: 'Accessories'
  };

  const KNOWN_BRANDS = ['apple', 'samsung', 'sony', 'dell', 'hp', 'lenovo', 'huawei', 'tecno', 'infinix', 'itel', 'xiaomi',
    'redmi', 'oppo', 'vivo', 'google', 'pixel', 'asus', 'acer', 'microsoft', 'surface', 'nintendo', 'xbox', 'jbl', 'oraimo',
    'dji', 'ecoflow', 'romoss', 'anker', 'nokia', 'motorola', 'realme', 'honor', 'bose', 'beats', 'garmin', 'fitbit', 'canon', 'nikon', 'gopro',
    'rolex', 'casio', 'fossil', 'lg', 'hisense', 'tcl', 'panasonic'];

  function detectCategory(q) {
    for (const [cat, rx] of Object.entries(CATEGORY_MAP)) {
      if (rx.test(q)) return cat;
    }
    return null;
  }

  function productKeyPhrases(p) {
    const name = (p.name || '').toLowerCase();
    const core = name
      .replace(/\(.*?\)/g, ' ')
      .replace(/\b(apple|samsung|sony|5g|portable|console|smartphone|gps|45mm|usb-c|2nd gen)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    const phrases = new Set([name, core]);
    // Short-hand forms customers actually type
    const m = core.match(/(iphone\s*\d+\s*(pro\s*max|pro|plus)?|galaxy\s*\w+\s*(ultra)?|s\d{2}\s*(ultra)?|ps\d\s*(slim|pro)?|playstation\s*\d\s*(slim|pro)?|macbook\s*\w+|ipad\s*\w+|airpods\s*\w*|watch\s*series\s*\d+|buds\s*\d*\s*pro|freepods\s*\d+|charge\s*\d+|river\s*\d\s*(max)?|osmo\s*mobile\s*\d+)/);
    if (m) phrases.add(m[0].trim());
    if (/playstation 5/.test(name)) phrases.add('ps5');
    if (/playstation 4/.test(name)) phrases.add('ps4');
    if (/galaxy s24 ultra/.test(name)) { phrases.add('s24 ultra'); phrases.add('s24'); }
    if (/powerbox 40,000/.test(name)) { phrases.add('40000'); phrases.add('40,000'); phrases.add('oraimo power bank'); }
    if (/60,000/.test(name)) { phrases.add('60000'); phrases.add('60,000'); phrases.add('romoss'); }
    if (/ecoflow/.test(name)) phrases.add('ecoflow');
    if (/osmo mobile/.test(name)) phrases.add('gimbal');
    if (/20w/.test(name)) { phrases.add('20w'); phrases.add('apple charger'); }
    return [...phrases].filter(s => s && s.length >= 3);
  }

  function findProductsInQuery(q) {
    const catalog = getCatalog();
    const query = ' ' + q.toLowerCase().replace(/[^a-z0-9,\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const scored = [];
    catalog.forEach(p => {
      let best = 0;
      productKeyPhrases(p).forEach(ph => {
        const clean = ph.replace(/[^a-z0-9,\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length >= 3 && query.includes(' ' + clean + ' ')) best = Math.max(best, clean.length);
        else if (clean.length >= 6 && query.includes(clean)) best = Math.max(best, clean.length - 1);
      });
      if (best > 0) scored.push({ p, score: best });
    });
    scored.sort((a, b) => b.score - a.score);
    // Avoid "iPhone 15" also matching when "iPhone 15 Pro Max" is the clear match
    const result = [];
    scored.forEach(s => {
      const covered = result.some(r => (r.name || '').toLowerCase().includes((s.p.name || '').toLowerCase().replace(/\(.*?\)/g, '').trim()) && s.score < 8);
      if (!covered) result.push(s.p);
    });
    return result;
  }

  function findTradeInModel(q) {
    const tradeCat = getTradeInCatalog();
    const all = [];
    Object.keys(tradeCat).forEach(brand => (tradeCat[brand] || []).forEach(m => all.push(Object.assign({ brand }, m))));
    all.sort((a, b) => b.name.length - a.name.length);
    const query = q.toLowerCase();
    for (const m of all) {
      const variants = m.name.toLowerCase()
        .replace(/\(.*?\)/g, '')
        .split('/')
        .map(v => v.replace(/^(apple|samsung|sony|google)\s+/, '').trim());
      if (variants.some(v => v.length >= 4 && query.includes(v))) return m;
    }
    if (/\bps4\s*pro\b/.test(query)) return all.find(m => /ps4-pro/.test(m.id)) || null;
    if (/\bps4\b/.test(query)) return all.find(m => /ps4-slim/.test(m.id)) || null;
    return null;
  }

  function extractBudget(q) {
    const s = q.toLowerCase();
    const k = s.match(/\b(\d{1,3}(?:\.\d+)?)\s*k\b/);
    if (k && !/\b\d+\s*k\s*(tv|video|display)\b/.test(s)) return parseFloat(k[1]) * 1000;
    const n = s.match(/(?:k|zmw|kwacha|under|below|less\s+than|budget(?:\s+of)?|have|around|about|max(?:imum)?)\s*[:\-]?\s*(\d{1,3}(?:,\d{3})+|\d{3,6})\b/);
    if (n) {
      const v = parseFloat(n[1].replace(/,/g, ''));
      if (v >= 200 && v <= 1000000) return v;
    }
    return null;
  }

  function extractQuantity(q) {
    const s = q.toLowerCase();
    const m = s.match(/\b(\d{1,3})\s*(?:x\s+|units?|pieces?|pcs|laptops?|phones?|iphones?|devices?|consoles?|ps5s?|power\s*(?:stations?|banks?)|ipads?|tablets?|watches|speakers?|earbuds|chargers?)\b/) ||
      s.match(/\badd\s+(\d{1,3})\b/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 500) return n;
    }
    return null;
  }

  // ==========================================================================
  // 4. RESPONSE BUILDERS
  // ==========================================================================
  function imgSrc(p) {
    const src = p.image || 'images/powerbank-40k.jpg';
    if (/^(data:|https?:|\.\.\/)/.test(src)) return src;
    return ASSET_PREFIX + src;
  }

  function productCard(p) {
    if (!p) return '';
    const dep = Math.round((Number(p.price) || 0) * 0.2);
    const stock = isInStock(p);
    return `
      <div class="ai-prod-card">
        <img src="${esc(imgSrc(p))}" alt="${esc(p.name)}" class="ai-prod-thumb" onerror="this.style.visibility='hidden'" />
        <div class="ai-prod-info">
          <div class="ai-prod-top">
            <span class="ai-prod-brand">${esc(p.brand || 'MacMo')}</span>
            <span class="ai-prod-stock ${stock ? 'in' : 'out'}">${stock ? 'In Stock' : 'Order on Request'}</span>
          </div>
          <div class="ai-prod-name">${esc(p.name)}</div>
          <div class="ai-prod-price-row">
            <span class="ai-prod-price">${formatK(p.price)}</span>
            <span class="ai-prod-layby">Layby: ${formatKShort(dep)} dep.</span>
          </div>
          <div class="ai-prod-actions">
            <button type="button" class="ai-prod-btn primary" data-ai-action="configure" data-id="${esc(p.id)}">Configure &amp; Buy</button>
            <button type="button" class="ai-prod-btn secondary" data-ai-action="basket" data-id="${esc(p.id)}">+ Basket</button>
          </div>
        </div>
      </div>`;
  }

  function reply(intent, html, chips, answered = true) {
    return { intent, html, chips: chips || [], answered };
  }

  function priceRangeLine(items) {
    if (!items.length) return '';
    const min = Math.min(...items.map(i => Number(i.price) || 0));
    const max = Math.max(...items.map(i => Number(i.price) || 0));
    return min === max ? formatKShort(min) : `${formatKShort(min)} – ${formatKShort(max)}`;
  }

  // --------------------------------------------------------------------------
  // Owner-taught knowledge (Admin Portal → AI Concierge → Custom Knowledge)
  // --------------------------------------------------------------------------
  function matchCustomFaq(q) {
    const faqs = (getAISettings().customFaqs || []).filter(f => f && f.answer && f.keywords);
    const query = q.toLowerCase();
    let best = null;
    faqs.forEach(f => {
      const kws = String(f.keywords).toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
      let score = 0;
      kws.forEach(k => { if (query.includes(k)) score += k.split(' ').length + 1; });
      if (score > 0 && (!best || score > best.score)) best = { f, score };
    });
    return best ? best.f : null;
  }

  function faqAnswerHtml(answer) {
    // Owner answers are plain text: escape, then allow **bold** and line breaks
    return esc(answer).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  // --------------------------------------------------------------------------
  // Website text retrieval
  // --------------------------------------------------------------------------
  function searchSiteIndex(q, limit = 3) {
    const tokens = tokenize(q);
    if (!tokens.length || !siteIndex.length) return [];
    const scored = siteIndex.map(chunk => {
      const hay = (chunk.heading + ' ' + chunk.text).toLowerCase();
      const head = (chunk.heading + ' ' + chunk.title).toLowerCase();
      let score = 0;
      let hits = 0;
      tokens.forEach(t => {
        if (hay.includes(t)) { score += 1; hits++; }
        if (head.includes(t)) score += 1;
      });
      return { chunk, score, coverage: hits / tokens.length };
    }).filter(s => s.score >= 2 && s.coverage >= 0.5);
    scored.sort((a, b) => b.score - a.score || b.coverage - a.coverage);
    const seen = new Set();
    const out = [];
    for (const s of scored) {
      const key = s.chunk.text.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s.chunk);
      if (out.length >= limit) break;
    }
    return out;
  }

  function siteAnswerHtml(chunks) {
    const first = chunks[0];
    const body = chunks.map(c => `• ${esc(c.text)}`).join('<br>');
    const linkLabel = first.source === 'policies' ? 'Read full store policies' : `Go to “${esc(first.title)}” section`;
    return `
      Here is what our website says${first.heading ? ` about <strong>${esc(first.heading)}</strong>` : ''}:<br>
      ${body}<br>
      <a href="${esc(first.link)}" class="ai-source-link" ${first.source === 'policies' ? 'target="_blank" rel="noopener"' : 'data-ai-action="scroll"'} data-target="${esc(first.sectionId)}">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> ${linkLabel}
      </a>`;
  }

  // ==========================================================================
  // 5. CORE REASONING ENGINE (deterministic, grounded)
  // ==========================================================================
  function answerLocally(rawInput) {
    const input = String(rawInput || '').trim();
    const q = input.toLowerCase();
    const catalog = getCatalog();
    const store = getStoreInfo();
    const ai = getAISettings();

    if (!input) return reply('empty', 'Please type a question and I will help right away.', [], false);

    let products = findProductsInQuery(q);
    const cat = detectCategory(q);
    const budget = extractBudget(q);
    const qty = extractQuantity(q);
    const tradeModel = findTradeInModel(q);

    const pronoun = /\b(it|that one|this one|the same|for it|buy it|add it|that phone|this phone|that laptop|this laptop)\b/.test(q);
    if (!products.length && pronoun && sessionMemory.lastProduct) products = [sessionMemory.lastProduct];
    if (products.length) { sessionMemory.lastProduct = products[0]; sessionMemory.lastProductsList = products; }
    if (cat) sessionMemory.lastCategory = cat;
    if (qty) sessionMemory.lastQuantity = qty;
    if (tradeModel) sessionMemory.lastTradeInModel = tradeModel;

    // ---- Greetings & capability questions ---------------------------------
    if (/^(hi+|hello|hey|good\s*(morning|afternoon|evening|day)|muli\s+bwanji|bwanji|shani|howzit|yo)\b[\s!.,?]*$/i.test(input) ||
        (/^(hi|hello|hey)\b/i.test(input) && input.length < 25)) {
      return reply('greeting', `
        Hello! 👋 Welcome to <strong>${esc(store.brandName)}</strong>, ${esc(store.location)}.<br><br>
        I know every product on this website (<strong>${catalog.length}</strong> right now), live prices, our Trade-In values,
        0% Layby plans, delivery, warranty and store policies. Ask me anything in your own words.`,
        ['Show phones & prices', 'Best option under K 15,000', 'Calculate a trade-in', 'How does 0% Layby work?', 'Where is your shop?']);
    }

    if (/\b(who are you|what can you do|are you (a )?(bot|robot|ai|human)|how do you work)\b/.test(q)) {
      return reply('about', `
        I'm the <strong>${esc(ai.assistantName)}</strong> — an AI assistant connected to ${esc(store.brandName)}'s live data:<br>
        • All <strong>${catalog.length}</strong> products, prices and stock status<br>
        • Trade-In valuations and 0% Layby calculations<br>
        • Delivery, warranty and store policies from this website<br><br>
        If something isn't on our website, I'll tell you honestly and connect you to our team on WhatsApp.`,
        ['Show all categories', 'Compare two products', 'Talk to a human']);
    }

    // ---- Owner-taught knowledge (highest priority after greetings) -------
    const faq = matchCustomFaq(q);
    if (faq) {
      return reply('custom-faq', faqAnswerHtml(faq.answer) + (products[0] ? productCard(products[0]) : ''),
        ['Show phones & prices', 'Talk to a human']);
    }

    // ---- Direct actions ----------------------------------------------------
    if (/\badd\b.*\b(basket|cart|bag)\b|\badd (it|this|that)\b/.test(q)) {
      const p = products[0] || sessionMemory.lastProduct;
      if (p) {
        const n = qty || 1;
        return reply('action-add', `
          Done — I've added <strong>${n}× ${esc(p.name)}</strong> (${formatK(p.price)} each) to your basket.
          You can choose storage/colour in the product view, or go straight to checkout.`,
          ['Open checkout', 'How do I pay?', 'Download a proforma quote'], true, { addId: p.id, addQty: n });
      }
      return reply('action-add', 'Which product would you like me to add? Tell me the name, e.g. <em>"Add the PS5 to my basket"</em>.',
        ['Show phones & prices', 'Show gaming'], false);
    }

    if (/\b(open|go to|proceed to)\s+(the\s+)?checkout\b|^checkout$/.test(q)) {
      return reply('action-checkout', 'Opening checkout for you. Nothing is charged on that page — the team confirms the amount and delivery with you first.',
        ['How do I pay?', 'Delivery options'], true);
    }

    if (/\b(proforma|quotation|quote|invoice)\b/.test(q) && !/\b(\d+)\s*(units?|laptops?|phones?)\b/.test(q)) {
      if (/\b(valid|expire|expiry|duration|how long|audit|tax|terms)\b/.test(q)) {
        return reply('policies-corporate', `
          📑 <strong>Corporate Procurement &amp; Proforma Terms:</strong><br>
          • <strong>Validity:</strong> Official PDF proforma quotes generated on our website are valid for <strong>14 calendar days</strong>.<br>
          • <strong>Audit Documentation:</strong> We provide formal Tax Invoices, Delivery Notes with serialized items, and signed Warranty Certificates.<br>
          • <strong>Fulfillment:</strong> Dispatched within 24 hours in Lusaka for in-stock items; 3–5 days for specialized corporate orders.<br>
          <a href="${PAGE_PREFIX}privacy.html#corporate" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full B2B procurement terms</a>`,
          ['Download a proforma quote', 'Talk to the corporate desk', 'Payment options']);
      }
      return reply('proforma', `
        <strong>Official proforma quotes (PDF):</strong><br>
        1. Add the products you need to your <strong>Basket</strong>.<br>
        2. Click <strong>Checkout</strong> and fill in your name / organisation.<br>
        3. Click <strong>“Download Official Proforma Quote (PDF)”</strong> — it includes a reference number, ZMW totals and warranty terms, ready for your finance office.<br>
        • All generated quotes are valid for <strong>14 calendar days</strong>.
        ${products[0] ? productCard(products[0]) : ''}`,
        ['Open checkout', 'Bulk / corporate orders', 'Talk to a human']);
    }

    // ---- Comparison ---------------------------------------------------------
    if (/\b(compare|vs\.?|versus|difference between|which is better|better than)\b/.test(q) || (products.length >= 2 && /\b(or)\b/.test(q))) {
      let pair = products.length >= 2 ? products.slice(0, 2) : [];
      if (pair.length < 2 && products.length === 1 && sessionMemory.lastProductsList.length) {
        const other = sessionMemory.lastProductsList.find(x => x.id !== products[0].id);
        if (other) pair = [other, products[0]];
      }
      if (pair.length < 2 && sessionMemory.lastProductsList.length >= 2) pair = sessionMemory.lastProductsList.slice(0, 2);
      if (pair.length < 2 && cat) {
        const inCat = catalog.filter(p => p.category === cat).sort((a, b) => b.price - a.price);
        if (inCat.length >= 2) pair = inCat.slice(0, 2);
      }
      if (pair.length === 2) {
        const [a, b] = pair;
        sessionMemory.lastProductsList = pair;
        const diff = Math.abs(a.price - b.price);
        const cheaper = a.price < b.price ? a : b;
        return reply('compare', `
          Side-by-side: <strong>${esc(a.name)}</strong> vs <strong>${esc(b.name)}</strong>
          <div class="ai-compare-table-wrap"><table class="ai-compare-table">
            <thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
            <tbody>
              <tr><td><strong>Price</strong></td><td>${formatK(a.price)}</td><td>${formatK(b.price)}</td></tr>
              <tr><td><strong>20% Layby deposit</strong></td><td>${formatKShort(a.price * 0.2)}</td><td>${formatKShort(b.price * 0.2)}</td></tr>
              <tr><td><strong>Key specs</strong></td><td>${esc(a.specs || '—')}</td><td>${esc(b.specs || '—')}</td></tr>
              <tr><td><strong>Status</strong></td><td>${esc(a.stock || 'In stock')}</td><td>${esc(b.stock || 'In stock')}</td></tr>
            </tbody></table></div>
          ${diff > 0 ? `💡 The <strong>${esc(cheaper.name)}</strong> is <strong>${formatKShort(diff)}</strong> cheaper. ` : ''}Both qualify for 0% Layby and Trade-In.
          ${productCard(a)}${productCard(b)}`,
          [`Layby plan for ${a.name}`, `Layby plan for ${b.name}`, 'Talk to a human']);
      }
      return reply('compare', 'Tell me the two products you want to compare, e.g. <em>"Compare iPhone 15 Pro Max vs Galaxy S24 Ultra"</em>.',
        ['Compare iPhone 15 Pro Max vs Galaxy S24 Ultra', 'Show phones & prices'], false);
    }

    // ---- Trade-In -----------------------------------------------------------
    if ((/\b(trade[\s-]?in|swap|top[\s-]?up|upgrade from|sell my|my old)\b/.test(q) || (/\bexchange\b/.test(q) && !/\b(return|fault|defect|broken|doa|damage)\b/.test(q))) && !/\b(return|refund|money back)\b/.test(q)) {
      if (/\b(clean imei|stolen|blacklist(ed)?|icloud lock|google lock|mdm|proof of ownership|anti[\s-]?theft)\b/.test(q)) {
        return reply('policies-tradein-security', `
          🔒 <strong>Trade-In Security &amp; Anti-Theft Guidelines:</strong><br>
          • <strong>Strict Verification:</strong> All trade-in IMEIs/serial numbers are verified against official registers. Stolen or blacklisted hardware is strictly rejected.<br>
          • <strong>Account Sign-Out:</strong> iCloud, Apple ID, Google, and Knox accounts must be completely removed before diagnostic testing.<br>
          • <strong>Certified Data Sanitization:</strong> Customers should back up their data; MacMo performs a certified cryptographic wipe on every accepted device.<br>
          <a href="${PAGE_PREFIX}privacy.html#trade-in" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full trade-in criteria</a>`,
          ['Calculate a trade-in', 'Where is your shop?', 'Talk to a human']);
      }
      const owned = tradeModel || sessionMemory.lastTradeInModel;
      const target = products.find(p => !owned || !(p.name || '').toLowerCase().includes(owned.name.toLowerCase().replace(/^(apple|samsung|sony|google)\s+/, ''))) || null;
      let mult = 0.85, condLabel = 'Good (85% of value)';
      if (/\b(flawless|mint|pristine|perfect|like new)\b/.test(q)) { mult = 1; condLabel = 'Flawless (100% of value)'; }
      else if (/\b(fair|scratch|scratched|scuffed|worn)\b/.test(q)) { mult = 0.65; condLabel = 'Fair (65% of value)'; }

      if (owned) {
        const credit = Math.round(owned.baseValue * mult);
        const tgt = target || sessionMemory.lastProduct;
        return reply('trade-in', `
          <strong>Trade-In estimate</strong><br>
          • Your device: <strong>${esc(owned.name)}</strong> — ${condLabel}<br>
          • Estimated credit: <strong style="color:#15803d;">${formatK(credit)}</strong>
          ${mult < 1 ? ` (up to ${formatK(owned.baseValue)} if flawless)` : ''}<br>
          ${tgt ? `• Upgrade to: <strong>${esc(tgt.name)}</strong> (${formatK(tgt.price)})<br>
          • Estimated top-up: <strong style="color:#0a70b9;">${formatK(Math.max(0, tgt.price - credit))}</strong><br>` :
          '• Tell me which product you want to upgrade to and I will calculate your top-up.<br>'}
          <em>Final value is confirmed after a quick physical test at ${esc(store.location)} (screen, battery health 85%+, sensors, iCloud/Google account removed).</em>
          ${tgt ? productCard(tgt) : ''}`,
          tgt ? [`Layby plan for ${tgt.name}`, 'Open trade-in calculator', 'Book trade-in on WhatsApp'] : ['Swap for iPhone 15 Pro Max', 'Swap for PS5 Slim', 'Open trade-in calculator']);
      }

      const tc = getTradeInCatalog();
      const examples = [];
      Object.keys(tc).forEach(b => (tc[b] || []).forEach(m => examples.push(m)));
      examples.sort((a, b) => b.baseValue - a.baseValue);
      return reply('trade-in', `
        <strong>Trade-In / Swap</strong> — we accept ${esc(Object.keys(tc).join(', ') || 'phones, consoles and laptops')} devices.<br>
        Some current top values (flawless condition):<br>
        ${examples.slice(0, 5).map(m => `• ${esc(m.name)}: up to <strong>${formatKShort(m.baseValue)}</strong>`).join('<br>')}<br><br>
        Tell me <strong>what you have</strong> and <strong>what you want</strong>, e.g. <em>"Swap my iPhone 13 Pro Max for the iPhone 15 Pro Max"</em>.`,
        ['Swap iPhone 13 Pro Max for iPhone 15 Pro Max', 'Swap PS4 Pro for PS5 Slim', 'Open trade-in calculator']);
    }

    // ---- 0% Layby -----------------------------------------------------------
    if (/\b(lay[\s-]?by|instal+ments?|deposit|pay monthly|monthly|pay in parts|pay slowly|credit|hire purchase)\b/.test(q)) {
      if (/\b(cancel(ling)?|stop|default|refund|cannot pay|cant pay|fail(ed)? to pay|policy|terms|agreement)\b/.test(q)) {
        return reply('policies-layby-terms', `
          📋 <strong>0% Layby Cancellation &amp; Price Lock Terms:</strong><br>
          • <strong>Price Lock Guarantee:</strong> Your Kwacha price is 100% locked at deposit and will never increase due to USD exchange rates.<br>
          • <strong>Grace Period:</strong> 14-day automatic extension upon notifying our WhatsApp desk.<br>
          • <strong>Cancellation:</strong> Accumulated payments are converted into a <strong>100% Store Credit Voucher</strong> (valid for 12 months for any tech purchase), or refunded minus a standard 10% administrative restocking fee.<br>
          <a href="${PAGE_PREFIX}privacy.html#layby" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full 0% Layby agreement</a>`,
          ['How does 0% Layby work?', 'Talk to a human', 'Show phones & prices']);
      }
      const p = products[0] || sessionMemory.lastProduct;
      if (p) {
        const price = Number(p.price) || 0;
        const rows = [0.2, 0.3, 0.5].map(r => {
          const dep = Math.round(price * r);
          const bal = price - dep;
          return `<tr><td><strong>${r * 100}%</strong></td><td><strong>${formatKShort(dep)}</strong></td><td>${formatKShort(bal)}</td><td>${formatKShort(bal / 2)}/mo</td><td>${formatKShort(bal / 3)}/mo</td></tr>`;
        }).join('');
        return reply('layby', `
          <strong>0% Interest Layby — ${esc(p.name)} (${formatK(price)})</strong>
          <div class="ai-compare-table-wrap"><table class="ai-compare-table">
            <thead><tr><th>Deposit</th><th>Pay today</th><th>Balance</th><th>2 months</th><th>3 months</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
          Zero interest, the price is locked once the deposit is paid. Pay via Airtel Money, MTN MoMo, bank transfer or cash, and collect when complete.
          ${productCard(p)}`,
          [`Add ${p.name} to basket`, 'Reserve on WhatsApp', 'Trade in instead']);
      }
      return reply('layby', `
        <strong>How 0% Layby works</strong><br>
        1. Pick any product.<br>
        2. Pay a <strong>20%, 30% or 50%</strong> deposit to lock the device and price.<br>
        3. Pay the balance over <strong>1 to 3 months</strong> at 0% interest.<br>
        4. Collect in store, or get it delivered once fully paid.<br><br>
        Which product should I calculate a plan for?`,
        ['Layby for iPhone 15 Pro Max', 'Layby for PS5 Slim', 'Layby for MacBook Air']);
    }

    // ---- Corporate / bulk ---------------------------------------------------
    if (/\b(corporate|company|companies|business price|bulk|wholesale|ngo|institution|organi[sz]ation|office|procurement|tender|b2b|school|government)\b/.test(q) || (qty && qty >= 3)) {
      const n = qty || (sessionMemory.lastQuantity > 1 ? sessionMemory.lastQuantity : null);
      const p = products[0] || sessionMemory.lastProduct;
      const tiers = (ai.bulkTiers || []).filter(t => t && Number(t.minQty) > 0 && Number(t.pct) > 0).sort((a, b) => b.minQty - a.minQty);
      if (p && n) {
        const retail = p.price * n;
        const tier = tiers.find(t => n >= Number(t.minQty));
        return reply('corporate', `
          <strong>Bulk estimate — ${n}× ${esc(p.name)}</strong><br>
          • Unit price: ${formatK(p.price)}<br>
          • Standard total: <strong>${formatK(retail)}</strong><br>
          ${tier ? `• Volume pricing (${tier.pct}% for ${tier.minQty}+ units): <strong style="color:#0a70b9;">${formatK(retail * (1 - tier.pct / 100))}</strong><br>` :
          '• Volume pricing: confirmed by our corporate desk on your official proforma quote.<br>'}
          Every unit includes the official warranty, and you can download a <strong>PDF proforma</strong> from checkout for your finance team.
          ${productCard(p)}`,
          [`Add ${n} ${p.name} to basket`, 'Download a proforma quote', 'Talk to the corporate desk']);
      }
      const cats = Object.keys(CATEGORY_TITLES).map(c => ({ c, items: catalog.filter(p => p.category === c) })).filter(x => x.items.length);
      return reply('corporate', `
        <strong>Corporate, NGO & institutional supply</strong><br>
        We supply offices and institutions across Zambia from our current range:<br>
        ${cats.map(x => `• ${esc(CATEGORY_TITLES[x.c])}: ${x.items.length} item${x.items.length > 1 ? 's' : ''} (${priceRangeLine(x.items)})`).join('<br>')}<br><br>
        You get official <strong>PDF proforma quotes</strong>, bank transfer (ZMW) and warranty on every unit.
        Tell me the product and quantity, e.g. <em>"Quote for 5 iPhone 15"</em>.`,
        ['Quote for 5 iPhone 15', 'How do I get a proforma?', 'Talk to the corporate desk']);
    }

    // ---- Brands we don't list ------------------------------------------------
    const mentionedBrand = KNOWN_BRANDS.find(b => new RegExp(`\\b${b}\\b`).test(q));
    if (mentionedBrand && !products.length) {
      const hasBrand = catalog.some(p => `${p.brand} ${p.name}`.toLowerCase().includes(mentionedBrand));
      if (!hasBrand) {
        const alt = catalog.filter(p => !cat || p.category === cat).slice(0, 2);
        return reply('brand-not-listed', `
          We don't currently list <strong>${esc(mentionedBrand.charAt(0).toUpperCase() + mentionedBrand.slice(1))}</strong> products on the website.
          Our team can check if they can source one for you on WhatsApp.${alt.length ? '<br>Here is what we have in stock that is similar:' : ''}
          ${alt.map(productCard).join('')}`,
          ['Ask the team to source it', cat ? `Show ${CATEGORY_TITLES[cat]}` : 'Show all categories'], false);
      }
    }

    // ---- Budget / cheapest / most expensive -------------------------------
    const wantsCheapest = /\b(cheapest|lowest price|most affordable|budget|entry level|cheap)\b/.test(q);
    const wantsTop = /\b(most expensive|best|top|flagship|premium|highest end)\b/.test(q) && !products.length;
    if (budget || wantsCheapest || (wantsTop && cat)) {
      let pool = catalog.filter(isInStock);
      const c = cat || (budget ? null : sessionMemory.lastCategory);
      if (c) pool = pool.filter(p => p.category === c);
      if (budget) {
        const within = pool.filter(p => p.price <= budget).sort((a, b) => b.price - a.price);
        const viaLayby = pool.filter(p => p.price > budget && p.price * 0.2 <= budget).sort((a, b) => a.price - b.price);
        if (within.length) {
          sessionMemory.lastProductsList = within.slice(0, 3);
          sessionMemory.lastProduct = within[0];
          return reply('budget', `
            Best ${c ? `<strong>${esc(CATEGORY_TITLES[c])}</strong> ` : ''}options within <strong>${formatKShort(budget)}</strong>:
            ${within.slice(0, 3).map(productCard).join('')}
            ${viaLayby.length ? `💡 With ${formatKShort(budget)} as a 20% Layby deposit you could also lock in the <strong>${esc(viaLayby[0].name)}</strong> (${formatK(viaLayby[0].price)}).` : ''}`,
            ['Compare the top 2', 'How does 0% Layby work?', 'Show more options']);
        }
        if (viaLayby.length) {
          return reply('budget', `
            Nothing ${c ? `in ${esc(CATEGORY_TITLES[c])} ` : ''}is priced under ${formatKShort(budget)} outright, but your budget covers the <strong>20% Layby deposit</strong> on:
            ${viaLayby.slice(0, 2).map(productCard).join('')}`, ['How does 0% Layby work?', 'Show cheapest options']);
        }
        const cheapest = [...pool].sort((a, b) => a.price - b.price)[0];
        return reply('budget', `Our ${c ? esc(CATEGORY_TITLES[c]) + ' ' : ''}range currently starts at ${cheapest ? formatK(cheapest.price) : 'a higher price'}.${cheapest ? productCard(cheapest) : ''}`,
          ['Show all categories', 'Talk to a human'], true);
      }
      pool.sort((a, b) => wantsCheapest ? a.price - b.price : b.price - a.price);
      sessionMemory.lastProductsList = pool.slice(0, 3);
      if (pool[0]) sessionMemory.lastProduct = pool[0];
      return reply('budget', `
        ${wantsCheapest ? 'Most affordable' : 'Top-tier'} ${c ? `<strong>${esc(CATEGORY_TITLES[c])}</strong>` : 'products'} right now:
        ${pool.slice(0, 3).map(productCard).join('')}`, ['Compare the top 2', 'How does 0% Layby work?']);
    }

    // ---- Load-shedding advisor (catalog driven) ---------------------------
    if (/\b(zesco|load\s*shedding|loadshedding|blackouts?|power cuts?|no power|keep .* on|backup)\b/.test(q) && !products.length) {
      const power = catalog.filter(p => p.category === 'power').sort((a, b) => b.price - a.price);
      if (power.length) {
        return reply('power', `
          <strong>Load-shedding backup we stock:</strong><br>
          ${power.map(p => `• <strong>${esc(p.name)}</strong> — ${formatK(p.price)}<br><span style="color:#64748b;font-size:0.76rem;">${esc(p.specs || '')}</span>`).join('<br>')}<br>
          Tell me what you need to keep running (e.g. <em>"laptop and Wi-Fi router for 6 hours"</em>) and our team will confirm the right unit.
          ${productCard(power[0])}`,
          power.length > 1 ? [`Compare ${power[0].name} vs ${power[1].name}`, 'Talk to a human'] : ['Talk to a human']);
      }
    }

    // ---- Store facts (from settings — never invented) -----------------------
    if (/\b(where|location|locations|branch|branches|address|directions?|map|find you|visit|showroom|silverest|town center|town centre|kalundwe|cha-cha|chacha|voltic|asado|located)\b/.test(q)) {
      const tc = store.branches.townCenter;
      const sv = store.branches.silverest;
      return reply('location', `
        📍 <strong>MacMo Electronics — 2 Lusaka Branches:</strong><br><br>
        <strong>1. ${esc(tc.name)} 📍</strong><br>
        ${esc(tc.address)}<br>
        🕒 <strong>${esc(tc.hours)}</strong><br>
        <a href="${tc.mapsUrl}" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-location-arrow"></i> Open Town Center in Google Maps</a><br><br>
        <strong>2. ${esc(sv.name)} 📍</strong><br>
        ${esc(sv.address)}<br>
        🕒 <strong>${esc(sv.hours)}</strong><br>
        <a href="${sv.mapsUrl}" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-location-arrow"></i> Open Silverest in Google Maps</a><br><br>
        📞 Hotlines: ${esc(store.phonePrimary)}${store.phoneSecondary ? ` / ${esc(store.phoneSecondary)}` : ''}`,
        ['Opening hours', 'Delivery options', 'Show phones & prices']);
    }

    if (/\b(hours?|open|opening|close|closing|sunday|saturday|weekend|holiday|what time)\b/.test(q)) {
      const tc = store.branches.townCenter;
      const sv = store.branches.silverest;
      return reply('hours', `
        🕒 <strong>Official Branch Opening Hours:</strong><br>
        • <strong>Town Center 📍</strong> (Voltic Building, Kalundwe &amp; Cha-Cha Rd Corner): <strong>${esc(tc.hours)}</strong><br>
        • <strong>Silverest 📍</strong> (Asado Complex Shop #1, Opposite UNILUS Great East Rd): <strong>${esc(sv.hours)}</strong><br><br>
        For anything outside these hours, message us on WhatsApp and the team will assist you promptly.`,
        ['Where are your branches?', 'Delivery options']);
    }

    if (/\b(pay|payment|momo|airtel|mtn|bank|cash|card|visa|mastercard)\b/.test(q)) {
      return reply('payment', `
        💳 <strong>Payment options</strong> (as listed on our website):<br>
        • Airtel Money & MTN MoMo<br>• Bank transfer (ZMW)<br>• Cash on delivery / at pickup<br>• 0% Layby (20%+ deposit, 1–3 months)<br>
        Nothing is charged online — the team confirms your order and amount with you first.`,
        ['How does 0% Layby work?', 'Download a proforma quote', 'Open checkout']);
    }

    // ---- Specific Store Policies Handlers ------------------------------------
    if (/\b(return(s)?|refund(s)?|exchange(s)?|money back|replace(ment)?|faulty|defect(ive)?|dead on arrival|doa|broken device)\b/.test(q)) {
      return reply('policies-returns', `
        🔄 <strong>7-Day Immediate Replacement &amp; Returns:</strong><br>
        • <strong>Factory Defect / DOA:</strong> 1-to-1 immediate replacement or 100% store credit within 7 days of purchase.<br>
        • <strong>Change of Mind:</strong> Sealed brand-new devices in original unopened factory wrap accepted within 48 hours for store voucher. Once unsealed or activated, change-of-mind returns are not accepted.<br>
        • <strong>Requirements:</strong> Original retail box, supplied accessories, and store receipt.<br>
        <a href="${PAGE_PREFIX}privacy.html#returns" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full 7-day return policy</a>`,
        ['12-Month warranty coverage', 'Talk to a human', 'How does 0% Layby work?']);
    }

    if (/\b(cancel(ling)? layby|stop layby|default on layby|layby refund|cannot pay layby|cant pay layby)\b/.test(q)) {
      return reply('policies-layby-terms', `
        📋 <strong>0% Layby Cancellation &amp; Price Lock Terms:</strong><br>
        • <strong>Price Lock Guarantee:</strong> Your Kwacha price is 100% locked at deposit and will never increase due to USD exchange rates.<br>
        • <strong>Grace Period:</strong> 14-day automatic extension upon notifying our WhatsApp desk.<br>
        • <strong>Cancellation:</strong> Accumulated payments are converted into a <strong>100% Store Credit Voucher</strong> (valid for 12 months for any tech purchase), or refunded minus a standard 10% administrative restocking fee.<br>
        <a href="${PAGE_PREFIX}privacy.html#layby" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full 0% Layby agreement</a>`,
        ['How does 0% Layby work?', 'Talk to a human', 'Show phones & prices']);
    }

    if (/\b(kitwe|ndola|solwezi|livingstone|kabwe|chipata|mansa|choma|outside lusaka|copperbelt|other (towns|cities|provinces)|courier|power tools|ems)\b/.test(q)) {
      return reply('policies-shipping', `
        📦 <strong>Countrywide Provincial Delivery:</strong><br>
        • <strong>Destinations:</strong> Kitwe, Ndola, Chingola, Solwezi, Livingstone, Kabwe, Chipata, Mansa, Kasama &amp; all provincial centres.<br>
        • <strong>Courier Partners:</strong> EMS (Zambia Postal Services) and Power Tools / BM Courier.<br>
        • <strong>Same-Day Dispatch:</strong> Orders confirmed before 14:00 (Mon–Sat) are dispatched same day with waybill tracking sent on WhatsApp.<br>
        <a href="${PAGE_PREFIX}privacy.html#courier" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full shipping policies</a>`,
        ['Lusaka & UNILUS delivery', 'How do I pay?', 'Talk to a human']);
    }

    if (/\b(how long is (the|a) (quote|proforma) valid|quote validity|proforma validity|tax invoice|delivery note|audit documentation)\b/.test(q)) {
      return reply('policies-corporate', `
        📑 <strong>Corporate Procurement &amp; Proforma Terms:</strong><br>
        • <strong>Validity:</strong> Official PDF proforma quotes generated on our website are valid for <strong>14 calendar days</strong>.<br>
        • <strong>Audit Documentation:</strong> We provide formal Tax Invoices, Delivery Notes with serialized items, and signed Warranty Certificates.<br>
        • <strong>Fulfillment:</strong> Dispatched within 24 hours in Lusaka for in-stock items; 3–5 days for specialized corporate orders.<br>
        <a href="${PAGE_PREFIX}privacy.html#corporate" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full B2B procurement terms</a>`,
        ['Download a proforma quote', 'Talk to the corporate desk', 'Payment options']);
    }

    if (/\b(clean imei|stolen|blacklist(ed)?|icloud lock|google lock|mdm|proof of ownership)\b/.test(q)) {
      return reply('policies-tradein-security', `
        🔒 <strong>Trade-In Security &amp; Anti-Theft Guidelines:</strong><br>
        • <strong>Strict Verification:</strong> All trade-in IMEIs/serial numbers are verified against official registers. Stolen or blacklisted hardware is strictly rejected.<br>
        • <strong>Account Sign-Out:</strong> iCloud, Apple ID, Google, and Knox accounts must be completely removed before diagnostic testing.<br>
        • <strong>Certified Data Sanitization:</strong> Customers should back up their data; MacMo performs a certified cryptographic wipe on every accepted device.<br>
        <a href="${PAGE_PREFIX}privacy.html#trade-in" target="_blank" rel="noopener" class="ai-source-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read full trade-in criteria</a>`,
        ['Calculate a trade-in', 'Where is your shop?', 'Talk to a human']);
    }

    // ---- Specific product ---------------------------------------------------
    if (products.length) {
      const p = products[0];
      const dep = Math.round((Number(p.price) || 0) * 0.2);
      const options = [p.customStorage ? `Options: ${esc(p.customStorage.replace(/\([+\-]?\d+\)/g, '').replace(/\s+,/g, ','))}` : '',
        p.customColors ? `Colours: ${esc(p.customColors)}` : ''].filter(Boolean).join('<br>• ');
      return reply('product', `
        <strong>${esc(p.name)}</strong>${p.brand ? ` (${esc(p.brand)})` : ''}<br>
        • Price: <strong style="color:#0a70b9;">${formatK(p.price)}</strong><br>
        • 0% Layby: <strong>${formatKShort(dep)}</strong> deposit, balance over 1–3 months<br>
        ${p.specs ? `• Specs: ${esc(p.specs)}<br>` : ''}
        ${options ? `• ${options}<br>` : ''}
        • Status: <strong>${esc(p.stock || 'In stock')}</strong>${p.badge ? ` · ${esc(p.badge)}` : ''}
        ${p.description ? `<div style="margin-top:6px;color:#475569;font-size:0.8rem;">${esc(p.description)}</div>` : ''}
        ${productCard(p)}
        ${products.slice(1, 3).map(productCard).join('')}`,
        [`Add ${p.name} to basket`, `Layby plan for ${p.name}`, 'Trade in my old device', products[1] ? `Compare ${p.name} vs ${products[1].name}` : 'Bulk / corporate price']);
    }

    // ---- Category browsing / specific inquiry check -------------------------
    if (cat) {
      const isSpecificInquiry = /\b(do you (have|sell|stock)|looking for|got any|price of|how much (is|for)|buy a|buy the)\b/i.test(q) && !/^(show|browse|list|view|all)\b/i.test(q);
      const items = catalog.filter(p => p.category === cat);
      if (items.length) {
        sessionMemory.lastProductsList = items;
        sessionMemory.lastProduct = items[0];
        if (isSpecificInquiry && !products.length) {
          return reply('catalog-unlisted', `
            We don't currently list that specific model in our online catalog, but we do have <strong>${items.length}</strong> other verified <strong>${esc(CATEGORY_TITLES[cat])}</strong> in stock.<br><br>
            If you need a specific model not shown here, our sales team can check availability on WhatsApp. Here is what we currently stock:
            ${items.slice(0, 2).map(productCard).join('')}`,
            ['Ask the team to source it', `Show all ${CATEGORY_TITLES[cat]}`, 'Talk to a human'], false);
        }
        return reply('category', `
          We have <strong>${items.length}</strong> ${esc(CATEGORY_TITLES[cat])} product${items.length > 1 ? 's' : ''} (${priceRangeLine(items)}):
          <ul class="ai-list">${items.map(i => `<li><strong>${esc(i.name)}</strong> — ${formatK(i.price)}${isInStock(i) ? '' : ' <em>(order on request)</em>'}</li>`).join('')}</ul>
          ${items.slice(0, 2).map(productCard).join('')}`,
          [`Cheapest ${CATEGORY_TITLES[cat]}`, items.length > 1 ? 'Compare the top 2' : 'How does 0% Layby work?', 'Bulk / corporate price']);
      }
      return reply('category', `We don't have any ${esc(CATEGORY_TITLES[cat])} listed right now. Our team can check incoming stock for you on WhatsApp.`,
        ['Ask the team to source it', 'Show all categories'], false);
    }

    if (/\b(all categories|what do you sell|what do you have|products|catalog(ue)?|inventory|stock list)\b/.test(q)) {
      const cats = Object.keys(CATEGORY_TITLES).map(c => ({ c, items: catalog.filter(p => p.category === c) })).filter(x => x.items.length);
      return reply('overview', `
        Here's everything we currently list (${catalog.length} products):<br>
        ${cats.map(x => `• <strong>${esc(CATEGORY_TITLES[x.c])}</strong> — ${x.items.length} (${priceRangeLine(x.items)})`).join('<br>')}`,
        cats.slice(0, 4).map(x => `Show ${CATEGORY_TITLES[x.c]}`));
    }

    // ---- Website text retrieval (delivery, warranty, campus, reviews, etc.) -
    const siteHits = searchSiteIndex(q);
    if (siteHits.length) {
      return reply('website', siteAnswerHtml(siteHits), ['Talk to a human', 'Show phones & prices']);
    }

    // ---- Fuzzy catalog search ------------------------------------------------
    const tokens = tokenize(q);
    if (tokens.length) {
      const scored = catalog.map(p => {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.specs} ${p.description} ${p.badge}`.toLowerCase();
        let s = 0;
        tokens.forEach(t => { if (hay.includes(t)) s += (p.name || '').toLowerCase().includes(t) ? 3 : 1; });
        return { p, s };
      }).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);
      if (scored.length) {
        const top = scored.slice(0, 3).map(x => x.p);
        sessionMemory.lastProductsList = top;
        sessionMemory.lastProduct = top[0];
        return reply('catalog-search', `These products match what you asked about:${top.map(productCard).join('')}`,
          [`Layby plan for ${top[0].name}`, top[1] ? 'Compare the top 2' : 'Talk to a human']);
      }
    }

    // ---- Honest fallback (logged as unanswered for the admin) -----------------
    return reply('fallback', `
      I don't have a confirmed answer to that on our website yet, and I'd rather not guess.
      Our team can answer it directly on WhatsApp — tap <strong>“Talk to a human”</strong> and I'll pass your question along.<br><br>
      I can also help with products and prices, trade-ins, 0% Layby, delivery, warranty or proforma quotes.`,
      ['Talk to a human', 'Show all categories', 'How does 0% Layby work?'], false);
  }

  // Attach optional side-effects without breaking reply() signature users
  const _reply = reply;
  // eslint-disable-next-line no-func-assign
  reply = function (intent, html, chips, answered = true, effects) {
    const r = _reply(intent, html, chips, answered);
    if (effects) r.effects = effects;
    return r;
  };

  // ==========================================================================
  // 6. OPTIONAL CLOUD LANGUAGE MODEL (via secure Netlify Function proxy)
  // ==========================================================================
  const CLOUD_ELIGIBLE = new Set(['fallback', 'website', 'catalog-search', 'brand-not-listed', 'about']);

  function buildCloudContext(question) {
    const store = getStoreInfo();
    const ai = getAISettings();
    const catalog = getCatalog().map(p =>
      `- ${p.name} | ${p.category} | ${formatK(p.price)} | ${p.stock || 'In stock'} | ${p.specs || ''}${p.customStorage ? ' | options: ' + p.customStorage : ''}`).join('\n');
    const faqs = (ai.customFaqs || []).map(f => `Q (${f.keywords}): ${f.answer}`).join('\n');
    const site = searchSiteIndex(question, 6).map(c => `[${c.title} › ${c.heading}] ${c.text}`).join('\n');
    const tc = store.branches.townCenter;
    const sv = store.branches.silverest;
    return [
      `STORE: ${store.brandName} (${store.brandSlogan}). TWO LUSAKA BRANCHES: 1) Town Center: ${tc.address} (Hours: ${tc.hours}). 2) Silverest: ${sv.address} (Hours: ${sv.hours}). Phone/WhatsApp ${store.phonePrimary}. ${store.deliveryNotice}. ${store.warrantyNotice}.`,
      `PAYMENT: Airtel Money, MTN MoMo, Bank transfer (ZMW), Cash on delivery/pickup, 0% Layby (20/30/50% deposit, 1-3 months, zero interest).`,
      `CATALOG (only these products exist):\n${catalog}`,
      faqs ? `OWNER KNOWLEDGE:\n${faqs}` : '',
      site ? `WEBSITE EXCERPTS:\n${site}` : ''
    ].filter(Boolean).join('\n\n').slice(0, 18000);
  }

  async function askCloud(question) {
    const ai = getAISettings();
    if (!ai.cloudEnabled || !ai.cloudEndpoint) return null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(ai.cloudEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          question: question.slice(0, 600),
          history: sessionMemory.history.slice(-6),
          context: buildCloudContext(question)
        })
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const text = data && typeof data.answer === 'string' ? data.answer.trim() : '';
      if (!text) return null;
      const html = esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      const cards = findProductsInQuery(question).slice(0, 2).map(productCard).join('');
      const unsure = /\b(don't have|do not have|not sure|cannot confirm|can't confirm|contact (our|the) team)\b/i.test(text);
      return { intent: 'cloud', html: html + cards, chips: ['Talk to a human', 'Show all categories'], answered: !unsure };
    } catch (e) {
      return null;
    }
  }

  // ==========================================================================
  // 7. PUBLIC ASK PIPELINE + CONVERSATION LOG
  // ==========================================================================
  function logTurn(question, result) {
    const ai = getAISettings();
    if (!ai.logConversations) return;
    const entry = {
      q: String(question).slice(0, 300),
      intent: result.intent,
      answered: !!result.answered,
      ts: new Date().toISOString(),
      page: HEADLESS ? 'admin-test' : 'storefront'
    };
    if (HEADLESS) return; // Admin test questions are not mixed into customer insights
    try {
      const log = JSON.parse(localStorage.getItem(AI_LOG_KEY) || '[]');
      log.unshift(entry);
      localStorage.setItem(AI_LOG_KEY, JSON.stringify(log.slice(0, 300)));
    } catch (e) {}
    try {
      if (window.MACMO_FIREBASE && window.MACMO_FIREBASE.enabled && window.firebase && firebase.apps.length) {
        firebase.firestore().collection('ai_logs').add(entry).catch(() => {});
      }
    } catch (e) {}
  }

  async function ask(question) {
    if (!siteIndexReady) {
      try { await Promise.race([buildSiteIndexPromise, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    }
    let result = answerLocally(question);
    if (CLOUD_ELIGIBLE.has(result.intent)) {
      const cloud = await askCloud(question);
      if (cloud) result = cloud;
    }
    sessionMemory.history.push({ role: 'user', text: String(question).slice(0, 400) });
    sessionMemory.history.push({ role: 'assistant', text: result.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400) });
    if (sessionMemory.history.length > 20) sessionMemory.history = sessionMemory.history.slice(-20);
    logTurn(question, result);
    return result;
  }

  function resetMemory() {
    sessionMemory.lastProduct = null;
    sessionMemory.lastProductsList = [];
    sessionMemory.lastCategory = null;
    sessionMemory.lastTradeInModel = null;
    sessionMemory.lastQuantity = 1;
    sessionMemory.history = [];
  }

  const buildSiteIndexPromise = new Promise(resolve => {
    const run = () => setTimeout(() => buildSiteIndex().then(resolve, resolve), HEADLESS ? 0 : 600);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  });

  window.MacMoAI = {
    ask,
    reset: resetMemory,
    rebuildIndex: buildSiteIndex,
    getIndexSize: () => siteIndex.length,
    getSettings: getAISettings
  };

  initCloudSettingsSync();
  if (HEADLESS) return;

  // ==========================================================================
  // 8. STOREFRONT CHAT WIDGET
  // ==========================================================================
  function applyEnabledState() {
    const enabled = getAISettings().enabled !== false;
    const widget = document.getElementById('macmoAiWidget');
    const mBtn = document.getElementById('m-bar-ai-btn');
    if (widget) widget.style.display = enabled ? '' : 'none';
    if (mBtn) mBtn.style.display = enabled ? '' : 'none';
    const title = document.getElementById('aiHeaderTitleText');
    if (title) title.textContent = getAISettings().assistantName || DEFAULT_AI_SETTINGS.assistantName;
  }

  function injectWidget() {
    if (document.getElementById('macmoAiWidget')) return;
    const ai = getAISettings();
    const wrapper = document.createElement('div');
    wrapper.id = 'macmoAiWidget';
    wrapper.className = 'macmo-ai-widget';
    wrapper.innerHTML = `
      <button type="button" class="ai-fab-trigger" id="aiFabTrigger" aria-label="Open AI assistant">
        <span class="ai-fab-pulse"></span>
        <span class="ai-fab-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
        <span class="ai-fab-text"><strong>Ask MacMo AI</strong><small>Prices · Trade-In · Layby</small></span>
      </button>
      <aside class="ai-chat-window" id="aiChatWindow" aria-label="AI assistant chat" aria-hidden="true">
        <div class="ai-chat-header">
          <div class="ai-header-brand">
            <div class="ai-avatar-ring">
              <img src="images/macmo-emblem-official.png" alt="MacMo AI" class="ai-avatar-img" />
              <span class="ai-online-dot"></span>
            </div>
            <div>
              <div class="ai-header-title"><span id="aiHeaderTitleText">${esc(ai.assistantName)}</span>
                <span class="ai-verified-pill"><i class="fa-solid fa-bolt"></i> Live</span></div>
              <div class="ai-header-sub">Answers from our live catalog &amp; website</div>
            </div>
          </div>
          <div class="ai-header-actions">
            <button type="button" class="ai-hdr-btn" data-ai-action="reset" title="New conversation" aria-label="New conversation"><i class="fa-solid fa-rotate-right"></i></button>
            <button type="button" class="ai-hdr-btn" data-ai-action="close" title="Close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages" role="log" aria-live="polite"></div>
        <div class="ai-chips-bar" id="aiChipsBar"></div>
        <form class="ai-chat-composer" id="aiChatForm">
          <button type="button" class="ai-voice-btn" id="aiVoiceBtn" data-ai-action="voice" title="Speak your question" aria-label="Voice input"><i class="fa-solid fa-microphone"></i></button>
          <input type="text" id="aiChatInput" class="ai-chat-input" maxlength="600" placeholder="Ask anything — e.g. best phone under K15,000" autocomplete="off" />
          <button type="submit" class="ai-send-btn" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
        <div class="ai-chat-footer">
          <span>AI answers from live store data</span>
          <button type="button" class="ai-wa-handoff-link" data-ai-action="handoff"><i class="fa-brands fa-whatsapp"></i> Talk to a human</button>
        </div>
      </aside>`;
    document.body.appendChild(wrapper);

    wrapper.addEventListener('click', onWidgetClick);
    document.getElementById('aiChatForm').addEventListener('submit', e => { e.preventDefault(); send(); });
    renderWelcome();
    applyEnabledState();
  }

  function renderWelcome() {
    const box = document.getElementById('aiChatMessages');
    if (!box) return;
    const ai = getAISettings();
    const store = getStoreInfo();
    const greeting = ai.greeting && ai.greeting.trim()
      ? faqAnswerHtml(ai.greeting)
      : `👋 Welcome to <strong>${esc(store.brandName)}</strong>! I can answer questions about all <strong>${getCatalog().length}</strong> products on this website,
         live prices, Trade-In values, 0% Layby, delivery, warranty and proforma quotes. What are you looking for today?`;
    box.innerHTML = `<div class="ai-msg-row assistant"><div class="ai-msg-bubble">${greeting}</div></div>`;
    renderChips(['Show phones & prices', 'Best option under K 15,000', 'Compare iPhone 15 Pro Max vs Galaxy S24 Ultra', 'Calculate a trade-in', 'Load-shedding backup', 'Where is your shop?']);
  }

  function renderChips(chips) {
    const bar = document.getElementById('aiChipsBar');
    if (!bar) return;
    bar.style.display = chips && chips.length ? 'flex' : 'none';
    bar.innerHTML = (chips || []).map(c => `<button type="button" class="ai-chip-btn" data-ai-chip="${esc(c)}">${esc(c)}</button>`).join('');
  }

  function appendMessage(role, html) {
    const box = document.getElementById('aiChatMessages');
    if (!box) return;
    const row = document.createElement('div');
    row.className = `ai-msg-row ${role}`;
    row.innerHTML = `<div class="ai-msg-bubble">${html}</div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function showTyping() {
    const box = document.getElementById('aiChatMessages');
    if (!box) return null;
    const row = document.createElement('div');
    row.className = 'ai-msg-row assistant';
    row.innerHTML = '<div class="ai-msg-bubble ai-typing-bubble"><span></span><span></span><span></span></div>';
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    return row;
  }

  let busy = false;
  async function send(textOverride) {
    const input = document.getElementById('aiChatInput');
    const text = String(textOverride !== undefined ? textOverride : (input ? input.value : '')).trim().slice(0, 600);
    if (!text || busy) return;
    busy = true;
    if (input) input.value = '';
    appendMessage('user', esc(text));
    const typing = showTyping();
    const started = Date.now();
    let result;
    try {
      result = await ask(text);
    } catch (e) {
      result = { intent: 'error', html: 'Sorry, something went wrong on my side. Please try again or tap “Talk to a human”.', chips: ['Talk to a human'], answered: false };
    }
    const wait = Math.max(0, 280 - (Date.now() - started));
    setTimeout(() => {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      appendMessage('assistant', result.html);
      renderChips(result.chips);
      runEffects(result);
      busy = false;
    }, wait);
  }

  function runEffects(result) {
    if (result.intent === 'action-checkout' && typeof window.openCheckoutModal === 'function') {
      setTimeout(() => window.openCheckoutModal(), 250);
    }
    if (result.effects && result.effects.addId && typeof window.addToCart === 'function') {
      window.addToCart(result.effects.addId, result.effects.addQty || 1);
    }
  }

  window.toggleMacMoAI = function (force) {
    const win = document.getElementById('aiChatWindow');
    const fab = document.getElementById('aiFabTrigger');
    if (!win) return;
    const open = typeof force === 'boolean' ? force : !win.classList.contains('open');
    win.classList.toggle('open', open);
    win.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (fab) fab.classList.toggle('hidden-fab', open);
    if (open && window.innerWidth > 768) setTimeout(() => { const i = document.getElementById('aiChatInput'); if (i) i.focus(); }, 180);
  };

  window.resetMacMoAIChat = function () { resetMemory(); renderWelcome(); };

  function handoff(extraQuestion) {
    const store = getStoreInfo();
    const lastQs = sessionMemory.history.filter(h => h.role === 'user').slice(-2).map(h => h.text);
    if (extraQuestion) lastQs.push(extraQuestion);
    const prod = sessionMemory.lastProduct ? `\nProduct: ${sessionMemory.lastProduct.name} (${formatK(sessionMemory.lastProduct.price)})` : '';
    const msg = `Hello ${store.brandName}! I was chatting with the AI assistant on your website.${prod}` +
      (lastQs.length ? `\nMy question: "${lastQs.join(' | ')}"` : '') + `\nPlease assist me.`;
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  const CHIP_ACTIONS = {
    'Talk to a human': () => handoff(),
    'Talk to the corporate desk': () => handoff('Corporate / bulk order enquiry'),
    'Ask the team to source it': () => handoff('Can you source this product for me?'),
    'Book trade-in on WhatsApp': () => handoff('I would like to book a trade-in test'),
    'Reserve on WhatsApp': () => handoff('I would like to reserve this on 0% Layby'),
    'Open trade-in calculator': () => {
      const sec = document.getElementById('trade-in');
      if (typeof window.switchServiceTab === 'function') window.switchServiceTab('trade-in');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      if (window.innerWidth <= 768) window.toggleMacMoAI(false);
    },
    'Download a proforma quote': () => {
      if (typeof window.openCheckoutModal === 'function') window.openCheckoutModal();
    }
  };

  function onWidgetClick(e) {
    const chip = e.target.closest('[data-ai-chip]');
    if (chip) {
      const label = chip.getAttribute('data-ai-chip');
      if (CHIP_ACTIONS[label]) { CHIP_ACTIONS[label](); return; }
      send(label);
      return;
    }
    const btn = e.target.closest('[data-ai-action]');
    if (btn) {
      const action = btn.getAttribute('data-ai-action');
      const id = btn.getAttribute('data-id');
      if (action === 'configure' && id && typeof window.openDeviceSpecs === 'function') {
        if (window.innerWidth <= 768) window.toggleMacMoAI(false);
        window.openDeviceSpecs(id);
      } else if (action === 'basket' && id && typeof window.addToCart === 'function') {
        window.addToCart(id, 1);
      } else if (action === 'scroll') {
        e.preventDefault();
        const target = document.getElementById(btn.getAttribute('data-target') || '');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth <= 768) window.toggleMacMoAI(false);
      } else if (action === 'reset') window.resetMacMoAIChat();
      else if (action === 'close') window.toggleMacMoAI(false);
      else if (action === 'handoff') handoff();
      else if (action === 'voice') startVoice();
    }
    if (e.target.closest('#aiFabTrigger')) window.toggleMacMoAI(true);
  }

  function startVoice() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById('aiVoiceBtn');
    if (!Rec) { if (window.showToast) window.showToast('Voice input works in Chrome, Edge and Safari.'); return; }
    try {
      const rec = new Rec();
      rec.lang = 'en-GB';
      rec.interimResults = false;
      if (btn) btn.classList.add('listening');
      rec.onresult = ev => { const t = ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript; if (t) send(t); };
      rec.onend = rec.onerror = () => { if (btn) btn.classList.remove('listening'); };
      rec.start();
    } catch (err) { if (btn) btn.classList.remove('listening'); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectWidget);
  else injectWidget();
})();
