// vtx-frame-selector.js — roda DENTRO do iframe *.lovable.app
// (domínio real confirmado via DevTools: id-preview-*.lovable.app)
// Namespace exclusivo vtx-visual-* pra tudo que criamos aqui.
// Comunicação com a página principal (lovable.dev) é EXCLUSIVAMENTE via
// postMessage — nunca tenta acessar o DOM do parent (cross-origin).
// Não importa módulos externos, não altera o DOM do projeto de forma
// permanente, não interfere nos scripts do site dentro do iframe.

(function vtxFrameSelector() {
  'use strict';

  // Garante que só inicializa uma vez mesmo se o script for injetado
  // mais de uma vez (ex: recarregamento do iframe).
  if (window.__vtxFrameSelectorActive) return;
  window.__vtxFrameSelectorActive = true;

  // ── Constantes de protocolo de mensagens ────────────────────────────
  // Só processa mensagens com essa origem para evitar que qualquer página
  // arbitrária possa ativar o seletor.
  const PARENT_ORIGIN = 'https://lovable.dev';
  const MSG_START     = 'VTX_FRAME_START_SELECT';    // parent → frame
  const MSG_CANCEL    = 'VTX_FRAME_CANCEL_SELECT';   // parent → frame
  const MSG_SELECTED  = 'VTX_FRAME_ELEMENT_SELECTED'; // frame → parent
  const MSG_READY     = 'VTX_FRAME_READY';            // frame → parent (handshake)

  // ── Estado ───────────────────────────────────────────────────────────
  let isSelecting   = false;
  let highlightBox  = null;
  let cancelPill    = null;
  let lastHovered   = null;

  // ── Overlay de destaque ──────────────────────────────────────────────
  function ensureHighlight() {
    if (highlightBox && document.body.contains(highlightBox)) return highlightBox;
    highlightBox = document.createElement('div');
    highlightBox.id = 'vtx-visual-highlight-box';
    // Estilos inline pra não depender de nenhuma folha de estilos do projeto
    Object.assign(highlightBox.style, {
      position: 'fixed',
      zIndex: '2147483000',
      display: 'none',
      border: '2px solid #7c3aed',
      background: 'rgba(124,58,237,0.10)',
      borderRadius: '4px',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      boxShadow: '0 0 0 2px rgba(255,255,255,0.6)',
    });
    document.body.appendChild(highlightBox);
    return highlightBox;
  }

  function positionHighlight(el) {
    const box  = ensureHighlight();
    const rect = el.getBoundingClientRect();
    Object.assign(box.style, {
      left:    rect.left + 'px',
      top:     rect.top  + 'px',
      width:   rect.width  + 'px',
      height:  rect.height + 'px',
      display: 'block',
    });
  }

  function hideHighlight() {
    if (highlightBox) highlightBox.style.display = 'none';
  }

  // ── Pill de cancelar (mobile) ────────────────────────────────────────
  function ensureCancelPill() {
    if (cancelPill && document.body.contains(cancelPill)) return cancelPill;
    cancelPill = document.createElement('button');
    cancelPill.id = 'vtx-visual-cancel-pill';
    Object.assign(cancelPill.style, {
      position:      'fixed',
      zIndex:        '2147483001',
      bottom:        '24px',
      left:          '50%',
      transform:     'translateX(-50%)',
      background:    '#14121c',
      color:         '#fff',
      border:        'none',
      borderRadius:  '999px',
      padding:       '10px 20px',
      fontSize:      '13px',
      fontWeight:    '700',
      fontFamily:    'system-ui,sans-serif',
      cursor:        'pointer',
      display:       'none',
      whiteSpace:    'nowrap',
      boxShadow:     '0 8px 24px rgba(0,0,0,0.3)',
    });
    cancelPill.textContent = '✕ Cancelar seleção';
    cancelPill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitSelectMode();
      window.parent.postMessage({ type: MSG_CANCEL }, PARENT_ORIGIN);
    });
    document.body.appendChild(cancelPill);
    return cancelPill;
  }

  // ── Coleta de contexto do elemento ──────────────────────────────────
  function sanitizeHtml(el, maxLen) {
    try {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script,style,iframe').forEach(n => n.remove());
      Array.from(clone.attributes || []).forEach(a => {
        if (/^on/i.test(a.name)) clone.removeAttribute(a.name);
      });
      const h = clone.outerHTML || '';
      return h.length > maxLen ? h.slice(0, maxLen) + '…' : h;
    } catch { return ''; }
  }

  function getComputedStyleSample(el) {
    const cs = window.getComputedStyle(el);
    const keys = ['color','backgroundColor','fontSize','fontWeight',
                  'padding','margin','borderRadius','display','width','height'];
    const out = {};
    keys.forEach(k => { out[k] = cs[k]; });
    return out;
  }

  function collectAncestors(el, depth) {
    const out = []; let node = el.parentElement;
    for (let i = 0; i < depth && node; i++, node = node.parentElement) {
      out.push({
        tag:     (node.tagName || '').toLowerCase(),
        id:      node.id || '',
        classes: typeof node.className === 'string' ? node.className : '',
      });
    }
    return out;
  }

  function extractContext(el) {
    const rect = el.getBoundingClientRect();
    const dataAttrs = {}, ariaAttrs = {};
    Array.from(el.attributes || []).forEach(a => {
      if (a.name.startsWith('data-')) dataAttrs[a.name] = a.value;
      else if (a.name.startsWith('aria-')) ariaAttrs[a.name] = a.value;
    });
    const parent = el.parentElement;
    const nearbyText = parent
      ? (parent.innerText || '').trim().slice(0, 200)
      : '';
    return {
      tag:       (el.tagName || '').toLowerCase(),
      id:        el.id || '',
      classes:   typeof el.className === 'string' ? el.className : '',
      text:      (el.innerText || el.textContent || '').trim().slice(0, 300),
      attributes: {
        ...dataAttrs, ...ariaAttrs,
        role: el.getAttribute('role')  || undefined,
        href: el.getAttribute('href')  || undefined,
        src:  el.getAttribute('src')   || undefined,
        alt: el.getAttribute('alt') || undefined,
        currentSrc: el.currentSrc || undefined,
      },
      parents:    collectAncestors(el, 4),
      nearbyText,
      rect:      { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      styles:    getComputedStyleSample(el),
      html:      sanitizeHtml(el, 800),
    };
  }

  // ── Modo de seleção ──────────────────────────────────────────────────
  function isOwnElement(el) {
    if (!el) return false;
    const ownIds = ['vtx-visual-highlight-box', 'vtx-visual-cancel-pill'];
    return ownIds.some(id => el.id === id) || !!el.closest?.('#vtx-visual-highlight-box,#vtx-visual-cancel-pill');
  }

  function onPointerMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwnElement(el)) { hideHighlight(); lastHovered = null; return; }
    if (el === lastHovered) return;
    lastHovered = el;
    positionHighlight(el);
  }

  function onClickCapture(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwnElement(el)) return;
    // Bloqueia a ação real do elemento (link, submit, etc.)
    // APENAS durante o modo de seleção.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    selectElement(el);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      exitSelectMode();
      window.parent.postMessage({ type: MSG_CANCEL }, PARENT_ORIGIN);
    }
  }

  function selectElement(el) {
    const ctx = extractContext(el);
    exitSelectMode();
    // Envia o contexto pra página principal — ela vai exibir o chip e
    // incluir no próximo pedido ao backend.
    window.parent.postMessage({ type: MSG_SELECTED, context: ctx }, PARENT_ORIGIN);
  }

  function enterSelectMode() {
    if (isSelecting) return;
    isSelecting = true;
    ensureCancelPill().style.display = 'block';
    document.addEventListener('pointermove',  onPointerMove,  true);
    document.addEventListener('click',        onClickCapture, true);
    document.addEventListener('keydown',      onKeyDown,      true);
  }

  function exitSelectMode() {
    isSelecting = false;
    document.removeEventListener('pointermove',  onPointerMove,  true);
    document.removeEventListener('click',        onClickCapture, true);
    document.removeEventListener('keydown',      onKeyDown,      true);
    hideHighlight();
    if (cancelPill) cancelPill.style.display = 'none';
    lastHovered = null;
  }

  // ── Escuta mensagens da página principal ─────────────────────────────
  window.addEventListener('message', (e) => {
    // Valida origem — só aceita comandos de lovable.dev
    if (e.origin !== PARENT_ORIGIN) return;
    if (!e.data || typeof e.data.type !== 'string') return;
    // START é idempotente — se já estiver selecionando, só confirma que está ativo
    if (e.data.type === MSG_START) {
      exitSelectMode(); // garante estado limpo antes de reentrar
      enterSelectMode();
    }
    if (e.data.type === MSG_CANCEL) exitSelectMode();
  });

  // Avisa a página principal que o script está pronto (handshake inicial)
  // Tenta de imediato e repete por 3s caso o listener do parent ainda não
  // esteja registrado (a mensagem pode chegar antes do vertex-ui.js terminar
  // de carregar na página principal).
  function sendReady() {
    try { window.parent.postMessage({ type: MSG_READY }, PARENT_ORIGIN); } catch { /* cross-origin block, ignore */ }
  }
  sendReady();
  setTimeout(sendReady, 500);
  setTimeout(sendReady, 1500);

})();
