// Vertex Pro — background mínimo para abrir/fechar a UI.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
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
});
