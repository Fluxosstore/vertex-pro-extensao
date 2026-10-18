// Vertex Pro — inicializa o painel lateral nativo do Chrome.
// Faz a ponte com a aba: estado da página (URL, projeto Lovable) e chamadas
// que só funcionam dentro dela (chat da Lovable, prévia, bloqueio).
(function () {
  'use strict';
  globalThis.__VTX_SIDEPANEL__ = true;

  const ALIVE_KEY = 'vertex_panel_alive';
  const SCRIPTS = ['config.js', 'project-memory.js', 'code-review.js', 'aurora-engine-ui.js', 'content.js'];
  const state = { href: '', hostname: '', pathname: '', search: '', origin: '', supabaseRefs: [] };
  let boundTab = null;
  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });

  const emptyState = { href: '', hostname: '', pathname: '', search: '', origin: '', supabaseRefs: [] };

  async function pageMessage(tabId, msg) {
    return chrome.tabs.sendMessage(tabId, msg, { frameId: 0 });
  }

  async function ensureAgent(tabId) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId }, files: SCRIPTS });
      return true;
    } catch (_) { return false; }
  }

  async function fetchState(tabId, allowInject) {
    try {
      return await pageMessage(tabId, { type: 'vtx-page-state' });
    } catch (_) {
      if (allowInject && await ensureAgent(tabId)) {
        try { return await pageMessage(tabId, { type: 'vtx-page-state' }); } catch (_) {}
      }
      return null;
    }
  }

  function applyState(next) {
    Object.assign(state, emptyState, next || {});
  }

  async function writeAlive() {
    try {
      const st = await chrome.storage.local.get([ALIVE_KEY]);
      const map = Object.assign({}, st[ALIVE_KEY] || {});
      const now = Date.now();
      for (const k of Object.keys(map)) if (now - Number(map[k]) > 60000) delete map[k];
      if (boundTab != null) map[boundTab] = now;
      await chrome.storage.local.set({ [ALIVE_KEY]: map });
    } catch (_) {}
  }
  async function clearAlive(tabId) {
    try {
      const st = await chrome.storage.local.get([ALIVE_KEY]);
      const map = Object.assign({}, st[ALIVE_KEY] || {});
      delete map[tabId];
      await chrome.storage.local.set({ [ALIVE_KEY]: map });
    } catch (_) {}
  }

  async function bind(tabId, allowInject) {
    if (boundTab != null && boundTab !== tabId) clearAlive(boundTab);
    boundTab = tabId;
    applyState(await fetchState(tabId, allowInject));
    writeAlive();
  }

  globalThis.VTX_PAGE = {
    state,
    tabId: () => boundTab,
    async call(fn, ...args) {
      await ready;
      if (boundTab == null) throw new Error('sem aba');
      const res = await pageMessage(boundTab, { type: 'vtx-page-call', fn, args });
      if (!res || !res.ok) throw new Error(res?.error || 'falha na página');
      return res.value;
    },
  };

  chrome.runtime.onMessage.addListener((m, sender) => {
    if (m?.type === 'vtx-frame-message' && sender?.tab?.id === boundTab) {
      globalThis.__vtxHandleFrameMessage?.(m.origin, m.data);
    }
  });

  chrome.tabs.onActivated.addListener(async (info) => {
    const win = await chrome.windows.getCurrent().catch(() => null);
    if (win && info.windowId !== win.id) return;
    bind(info.tabId, true);
  });
  chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (tabId === boundTab && (change.status === 'complete' || change.url)) bind(tabId, true);
  });
  setInterval(async () => {
    if (boundTab == null) return;
    const s = await fetchState(boundTab, false);
    if (s) applyState(s);
    writeAlive();
  }, 1500);
  addEventListener('pagehide', () => { if (boundTab != null) clearAlive(boundTab); });

  function load(i) {
    if (i >= SCRIPTS.length) return;
    const el = document.createElement('script');
    el.src = SCRIPTS[i];
    el.onload = () => load(i + 1);
    el.onerror = () => load(i + 1);
    document.body.appendChild(el);
  }

  (async () => {
    const qs = new URLSearchParams(location.search);
    let tabId = Number(qs.get('tab')) || null;
    if (!tabId) {
      const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = t?.id ?? null;
    }
    if (tabId != null) await bind(tabId, true);
    readyResolve();
    load(0);
  })();
})();
