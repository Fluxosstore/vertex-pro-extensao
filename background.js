// Vertex Pro — background: abre o painel lateral nativo (desktop) ou, quando
// não há suporte (celular) ou o usuário prefere, o painel dentro da página.
const HAS_SIDE_PANEL = !!(chrome.sidePanel && chrome.sidePanel.open);

async function nativeEnabled() {
  try {
    const st = await chrome.storage.local.get(['vertex_native_panel']);
    return st.vertex_native_panel !== false;
  } catch (_) { return true; }
}

async function openInPage(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' });
  } catch (_) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['config.js', 'project-memory.js', 'code-review.js', 'aurora-engine-ui.js', 'content.js'] });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' });
    } catch (err) {
      console.warn('[Vertex Pro] Não foi possível abrir nesta página:', err);
    }
  }
}

// O clique no ícone é tratado aqui (open precisa de gesto do usuário, então
// nada de await antes dele).
if (HAS_SIDE_PANEL) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  if (!HAS_SIDE_PANEL) { openInPage(tab); return; }
  chrome.storage.local.get(['vertex_native_panel']).then(async (st) => {
    if (st.vertex_native_panel === false) {
      // o usuário escolheu o painel dentro da página; reabilita o nativo no próximo clique longo? não: só pelo menu.
      await openInPage(tab);
      return;
    }
    try {
      await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel.html?tab=' + tab.id, enabled: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.warn('[Vertex Pro] Painel nativo indisponível, usando o da página:', err);
      await openInPage(tab);
    }
  });
});

chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m?.type === 'vtx-whoami') { sendResponse({ tabId: sender.tab?.id ?? null }); return false; }
  if (m?.type === 'vtx-frame-message') return false; // entregue direto ao painel (extension page)
  return false;
});
