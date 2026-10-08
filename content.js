(function () {
  if (document.getElementById('next-widget-root')) return; // evita duplicar

  // Garante que a Space Grotesk carregue mesmo se o @import do CSS
  // for bloqueado por alguma política da página. Injetar o <link> no
  // <head> é o caminho mais compatível.
  (function ensureFont() {
    const ID = 'vertex-space-grotesk-font';
    if (document.getElementById(ID)) return;
    try {
      const pre = document.createElement('link');
      pre.rel = 'preconnect';
      pre.href = 'https://fonts.gstatic.com';
      pre.crossOrigin = 'anonymous';
      document.head.appendChild(pre);

      const link = document.createElement('link');
      link.id = ID;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    } catch (_) { /* se falhar, os fallbacks do CSS assumem */ }
  })();

  const logoUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('logo.png')
    : 'logo.png';

  const welcomeSoundUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('welcome.mp3')
    : 'welcome.mp3';
  const configSoundUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('welcome-config.mp3')
    : 'welcome-config.mp3';
  // Toca "Seja bem vindo a Vertex Pro, Bora começar?" só na primeira vez
  // que o painel abre (guardado no storage, igual ao áudio de config).
  // 2s depois, entra o áudio explicando a configuração (GitHub/Supabase)
  // — também só uma vez, com sua própria flag no storage.
  let welcomeAudio = null;
  let configAudio = null;
  let configSoundTimer = null;
  function playWelcomeSound() {
    (async () => {
      try {
        const saved = await chrome.storage.local.get(['vertex_welcome_audio_played']).catch(() => ({}));
        if (saved.vertex_welcome_audio_played) return; // já tocou antes, não toca de novo
        if (!welcomeAudio) welcomeAudio = new Audio(welcomeSoundUrl);
        welcomeAudio.currentTime = 0;
        welcomeAudio.play().catch(() => {});
        chrome.storage.local.set({ vertex_welcome_audio_played: true }).catch(() => {});
      } catch (_) { /* se o áudio falhar, não trava o resto da extensão */ }
    })();

    clearTimeout(configSoundTimer);
    configSoundTimer = setTimeout(async () => {
      try {
        const saved = await chrome.storage.local.get(['vertex_config_audio_played']).catch(() => ({}));
        if (saved.vertex_config_audio_played) return; // já tocou antes, não toca de novo
        if (!configAudio) configAudio = new Audio(configSoundUrl);
        configAudio.currentTime = 0;
        configAudio.play().catch(() => {});
        chrome.storage.local.set({ vertex_config_audio_played: true }).catch(() => {});
      } catch (_) { /* se o áudio falhar, não trava o resto da extensão */ }
    }, 4000);
  }

  const config = window.VERTEX_CONFIG || {};
  const supportUrl = config.SUPPORT_URL || 'https://wa.me/553584723836';

  const root = document.createElement('div');
  root.id = 'next-widget-root';
  // Impede o tradutor automático do navegador de mexer na interface
  // da extensão. Sem isso ele traduz até o SQL exibido ("create table"
  // vira "criar tabela"), e o cliente revisa um código diferente do
  // que realmente vai rodar.
  root.setAttribute('translate', 'no');
  root.classList.add('notranslate');
  root.innerHTML = `
    <!-- BOTÃO FLUTUANTE (BOLINHA) -->
    <button id="nextLauncher" title="Abrir Vertex Pro">
      <img class="next-launcher-img" src="${logoUrl}" alt="Vertex Pro" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
      <div class="next-launcher-fallback" style="display:none;">V</div>
    </button>

    <!-- MODAL DE ATIVAÇÃO DE LICENÇA (IDÊNTICO À IMAGEM) -->
    <div class="vertex-modal-backdrop" id="vertexLicenseModal" style="display:none;">
      <div class="vertex-license-card">
        <button class="vertex-modal-close" id="vertexLicenseCloseBtn" title="Fechar">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="vertex-license-logo-wrap">
          <img class="vertex-license-logo" src="${logoUrl}" alt="Vertex Pro" />
        </div>

        <div class="vertex-license-brand">
          <span class="vertex-brand-name">Vertex</span>
          <span class="vertex-brand-pro">Pro</span>
        </div>

        <p class="vertex-license-subtitle">Insira sua chave para ativar a extensão.</p>

        <form class="vertex-license-form" id="vertexLicenseForm">
          <label class="vertex-license-label" for="vertexLicenseInput">CHAVE DE LICENÇA</label>
          <div class="vertex-input-box">
            <input 
              type="text" 
              id="vertexLicenseInput" 
              class="vertex-license-input" 
              placeholder="Sua chave de licença..." 
              autocomplete="off"
              spellcheck="false"
              required
            />
          </div>

          <div class="vertex-license-msg" id="vertexLicenseMsg" style="display:none;"></div>

          <button type="submit" class="vertex-license-btn" id="vertexActivateBtn">
            <span class="btn-text">Ativar Licença</span>
            <span class="btn-spinner" style="display:none;"></span>
          </button>
        </form>

        <div class="vertex-license-footer">
          <a href="${supportUrl}" target="_blank" rel="noopener noreferrer" class="vertex-support-link">
            Precisa de ajuda? Fale com o suporte ›
          </a>
        </div>
      </div>
    </div>

    <!-- PAINEL PRINCIPAL VERTEX PRO -->
    <div class="next-app" id="nextApp" style="display:none;">
      <!-- TOPBAR -->
      <header class="next-topbar" id="nextDragHandle">
        <div class="next-brand">
          <img class="next-brand-logo-img" src="${logoUrl}" alt="Vertex" />
          <div class="next-brand-text">
            <span class="next-brand-name">Vertex</span>
            <span class="next-brand-pro">Pro</span>
          </div>
        </div>
        <div class="next-topbar-actions">
          <button class="next-icon-btn" id="nextBellBtn" title="Novidades">
            <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="next-bell-dot" id="nextBellDot" style="display:none;"></span>
          </button>
          <button class="next-icon-btn" id="nextSettingsBtn" title="Configurações / conta (Teste Adm)">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="next-icon-btn" id="nextDockToggleBtn" title="Modo ancorado (lateral, tela cheia)">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>
          </button>
          <button class="next-icon-btn" title="Fechar" data-action="close">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </header>

      <!-- SAUDAÇÃO -->
      <div class="next-greeting-card">
        <div class="next-greeting-text">
          <div class="next-greeting-title">Olá! Pronto para <span class="accent">criar</span>?</div>
          <div class="next-greeting-sub">Sua produtividade começa aqui.</div>
        </div>
        <button class="next-greeting-spark" id="nextDetailsToggle" title="Ver detalhes da licença">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>
        </button>
      </div>

      <!-- ATALHOS RÁPIDOS -->
      <div class="next-shortcuts-card" id="nextShortcutsCard">
        <div class="next-section-head">
          <span>Atalhos rápidos</span>
          <button type="button" class="next-link-btn" id="nextCustomizeBtn">Personalizar</button>
        </div>
        <div class="next-grid" id="nextCommandGrid">
          <button class="next-cmd" data-cmd="Corrigir"><span class="next-cmd-icon">🛠️</span><span class="next-cmd-label">Corrigir</span></button>
          <button class="next-cmd" data-cmd="Refatorar"><span class="next-cmd-icon">⚖️</span><span class="next-cmd-label">Refatorar</span></button>
          <button class="next-cmd" data-cmd="Melhorar"><span class="next-cmd-icon">🎨</span><span class="next-cmd-label">Melhorar</span></button>
          <button class="next-cmd" data-cmd="Explicar"><span class="next-cmd-icon">🔍</span><span class="next-cmd-label">Explicar</span></button>
          <button class="next-cmd" data-cmd="Otimizar"><span class="next-cmd-icon">🚀</span><span class="next-cmd-label">Otimizar</span></button>
          <button class="next-cmd" data-cmd="Segurança"><span class="next-cmd-icon">🛡️</span><span class="next-cmd-label">Segurança</span></button>
          <button class="next-cmd" data-cmd="Copy & Paste"><span class="next-cmd-icon">📋</span><span class="next-cmd-label">Copy & Paste</span></button>
          <button class="next-cmd" data-cmd="Responsivo"><span class="next-cmd-icon">📱</span><span class="next-cmd-label">Responsivo</span></button>
        </div>
      </div>

      <!-- HISTÓRICO DE COMANDOS (escondido, abre via "Histórico" no menu "...") -->
      <div class="next-history-card" id="nextHistoryCard" style="display:none;">
        <div class="next-section-head">
          <span>Histórico de comandos</span>
          <button type="button" class="next-link-btn" id="nextHistoryBackBtn">Voltar</button>
        </div>
        <div class="next-history-list" id="nextHistoryList">
          <div class="next-history-empty">Nenhum comando enviado ainda.</div>
        </div>
      </div>

      <!-- INTEGRAÇÕES: GitHub + Supabase, tudo dentro do painel (nunca mais
           sobrepõe o chat da Lovable). Ocupa o lugar de "Atalhos rápidos". -->
      <div class="next-integration-card" id="nextIntegrationCard" style="display:none;">
        <div class="next-section-head">
          <span>Conectar GitHub e Supabase</span>
          <button type="button" class="next-link-btn" id="nextIntegrationBackBtn">Voltar</button>
        </div>
        <div class="next-integration-done" id="nextIntegrationDone" style="display:none;">✅ Tudo pronto! GitHub e Supabase conectados.</div>
        <div id="nextIntegrationMount"></div>
      </div>

      <!-- NOVIDADES: espelha o que é publicado em vertexpro.site/novidades.
           Ocupa o lugar de "Atalhos rápidos" quando aberto pelo sino. -->
      <div class="next-novidades-card" id="nextNovidadesCard" style="display:none;">
        <div class="next-section-head">
          <span>Novidades</span>
          <button type="button" class="next-link-btn" id="nextNovidadesBackBtn">Voltar</button>
        </div>
        <div class="next-novidades-list" id="nextNovidadesList">
          <div class="next-history-empty">Carregando...</div>
        </div>
      </div>

      <!-- USER CARD (detalhes da licença — escondido, abre via "Ver detalhes" / ícone de brilho) -->
      <div class="next-user-card" id="nextUserCard" style="display:none;">
        <div class="next-user-header">
          <div class="next-user-info">
            <span class="next-user-name" id="nextUserName">—</span>
            <span class="next-pro-badge" id="nextUserBadge">MONTH</span>
          </div>
          <div class="next-user-actions">
            <button class="next-icon-btn small next-exit-btn" id="nextExitBtn" title="Sair / Desconectar">
              <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </button>
          </div>
        </div>

        <div class="next-user-expanded-body" id="nextUserExpandedBody" style="display:flex;">
          <!-- PROGRESS / TEMPO RESTANTE -->
          <div class="next-time-box">
            <div class="next-time-header">
              <span class="next-time-label">
                <svg class="next-icon-inline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Tempo restante
              </span>
              <span class="next-time-value" id="nextRemainingDays">30d 1h 16m</span>
            </div>
            <div class="next-progress-track">
              <div class="next-progress-fill" id="nextProgressFill" style="width: 0%;"></div>
            </div>
            <div class="next-time-footer">
              <span id="nextExpiresFooter">Expira em 25/09/2026</span>
            </div>
          </div>

          <!-- STATS ROW -->
          <div class="next-stats-grid">
            <div class="next-stat-box">
              <div class="next-stat-label">
                <svg class="next-icon-inline" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                COMANDOS
              </div>
              <div class="next-stat-value primary" id="nextCommandsCount">0</div>
            </div>
            <div class="next-stat-box">
              <div class="next-stat-label">
                <svg class="next-icon-inline" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ECONOMIA
              </div>
              <div class="next-stat-value success" id="nextSavingsAmount">R$ 0,00</div>
            </div>
          </div>

          <!-- PREFERÊNCIA PERMANENTE: instrução curta que a Aurora aplica
               sozinha em todo pedido futuro, sem precisar repetir. -->
          <div class="next-prefs-box">
            <div class="next-prefs-label">
              <svg class="next-icon-inline" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Preferência permanente da Aurora
            </div>
            <textarea class="next-prefs-input" id="nextAuroraPrefs" placeholder="Ex: sempre use a paleta azul e branco; responda em português formal..." maxlength="500" rows="2"></textarea>
            <div class="next-prefs-actions">
              <span class="next-prefs-saved" id="nextPrefsSaved" style="display:none;">Salvo ✓</span>
              <button type="button" class="next-link-btn" id="nextPrefsSaveBtn">Salvar</button>
            </div>
          </div>

        <details class="next-engine-settings" id="nextEngineSettings">
          <summary>Skills da Aurora</summary>
          <p>O motor Aurora está sempre ativo. Gerencie aqui as skills personalizadas deste projeto.</p>
          <small>Skills internas: interface, autenticação, dados, imagens e qualidade. Ativadas conforme o pedido.</small>
          <div id="nextEngineSkills"></div>
          <div class="next-job-actions"><button type="button" id="nextSkillInstall">Instalar skill JSON</button><button type="button" id="nextSkillExample">Baixar modelo</button></div>
          <input type="file" id="nextSkillFile" accept=".json,application/json" hidden>
          <span id="nextSkillStatus" role="status"></span>
        </details>

          <!-- BYOK: cliente pode usar a própria chave de API em vez da
               nossa OpenRouter — o custo da chamada passa a ser dele. -->
          <div class="next-prefs-box">
            <div class="next-prefs-label">
              <svg class="next-icon-inline" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Usar minha própria chave de API
              <label class="next-dock-plano-toggle" style="margin-left:auto;">
                <input type="checkbox" id="nextByokToggle">
                <span class="next-dock-plano-slider"></span>
              </label>
            </div>
            <div id="nextByokFields" style="display:none;">
              <input type="password" class="next-prefs-input" id="nextByokKey" placeholder="Chave de API (ex: sk-...)" style="margin-bottom:6px;">
              <input type="text" class="next-prefs-input" id="nextByokModel" placeholder="Modelo (ex: gpt-4o-mini)" style="margin-bottom:6px;">
              <input type="text" class="next-prefs-input" id="nextByokBaseUrl" placeholder="URL base (opcional — padrão: OpenAI)">
              <div class="next-prefs-actions">
                <span class="next-prefs-saved" id="nextByokSaved" style="display:none;">Salvo ✓</span>
                <button type="button" class="next-link-btn" id="nextByokSaveBtn">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CHAT DO MODO ANCORADO: fica sempre visível quando o painel está
           ancorado — abaixo de qualquer outro painel aberto por cima
           (novidades, licença, etc.), nunca escondido. -->
      <div class="next-dock-chat" id="nextDockChat" style="display:none;">
        <div class="next-dock-plano-row">
          <label class="next-dock-plano-toggle">
            <input type="checkbox" id="nextPlanoToggle">
            <span class="next-dock-plano-slider"></span>
          </label>
          <div class="next-dock-plano-texto">
            <span class="next-dock-plano-titulo">Modo Planejamento</span>
            <span class="next-dock-plano-sub">A Aurora só propõe o que vai mudar — você aprova antes de commitar</span>
          </div>
        </div>
        <div class="next-memory-row"><span id="nextMemoryStatus">Contexto por projeto</span><button type="button" id="nextMemoryClear">Limpar contexto</button></div>
        <div id="nextUndoArea" class="next-undo-area" hidden></div>
        <div class="next-dock-chat-messages" id="nextDockChatMessages">
          <div class="next-dock-chat-empty">
            Oi! Eu sou a <b>Aurora</b> 💜 Pode conversar comigo ou pedir pra eu mexer no seu projeto — eu sei diferenciar as duas coisas.
          </div>
        </div>
      </div>

      <!-- STATUS DA EXTENSÃO -->
      <div class="next-status-card">
        <div class="next-status-left">
          <span class="next-status-dot"></span>
          <div class="next-status-text">
            <span class="next-status-title">Status da extensão</span>
            <span class="next-status-sub" id="nextStatusSub">Ativa e pronta para ajudar</span>
          </div>
        </div>
        <button type="button" class="next-status-btn" id="nextStatusActionBtn">Configurar</button>
      </div>

      <!-- COMPOSER -->
      <div class="next-composer">
        <div class="next-composer-label">O que você deseja fazer hoje?</div>
        <div class="vtx-sel-chip" id="nextComposerChip" style="display:none;"></div>
        <div class="next-composer-attach-list" id="nextComposerAttachList" style="display:none;" aria-label="Arquivos anexados"></div>
        <textarea id="nextComposerInput" class="next-composer-textarea" rows="1" placeholder="Digite seu comando..."></textarea>
        <div class="next-composer-toolbar">
          <div class="next-composer-tools">
            <button class="next-icon-btn small" title="Anexar arquivo" id="nextComposerAttach"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
            <button class="next-icon-btn small" title="Ditar por voz" id="nextComposerMic"><svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
            <button class="next-icon-btn small" id="nextComposerTarget" title="Selecionar elemento no Preview"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></button>
            <div class="next-popover-wrap">
              <button class="next-icon-btn small" id="nextMoreBtn" title="Mais opções">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg>
              </button>
              <div class="next-popover next-popover-right" id="nextMorePopover" style="display:none;">
                <button class="next-popover-item" id="nextRefreshBtn" title="Refresh"><svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg><span>Refresh</span></button>
                <button class="next-popover-item" id="nextHistoryMenuBtn" title="History"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg><span>Histórico</span></button>
                <button class="next-popover-item" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span></button>
                <button class="next-popover-item" id="nextDockShield" title="Bloquear o chat da Lovable"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span>Bloquear chat</span></button>
                <button class="next-popover-item" title="Add"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Adicionar</span></button>
                <button class="next-popover-item" id="nextHelpBtn" title="Help"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Ajuda</span></button>
              </div>
            </div>
          </div>
          <button class="next-composer-send" id="nextComposerSend" title="Enviar">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 11.5L21 3l-8.5 18-2.2-7.3L3 11.5z"/></svg>
          </button>
        </div>
      </div>

      <!-- RODAPÉ: MODELO / MOTOR -->
      <div class="next-footer-row">
        <div class="next-popover-wrap next-footer-pill-wrap">
          <button type="button" class="next-footer-pill" id="nextModelsBtn">
            <span class="next-footer-pill-icon"><svg viewBox="0 0 24 24" fill="none"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 7V4M15 7V4M9 20v-3M15 20v-3M7 9H4M7 15H4M20 9h-3M20 15h-3"/></svg></span>
            <span class="next-footer-pill-label" id="nextModelsLabel">Modelos</span>
            <svg class="next-footer-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="next-popover" id="nextModelsPopover" style="display:none;">
            <div class="next-popover-label">Integrações</div>
            <button class="next-popover-item" title="GitHub" data-model="github">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.04-.01-1.89-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.29 9.29 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>
              <span>GitHub</span>
            </button>
            <div class="next-popover-label" style="margin-top:2px;">GitHub abre em</div>
            <div class="next-chatmode-toggle" id="nextGhChatModeToggle">
              <button type="button" class="next-chatmode-opt active" data-ghmode="extension" title="Usar o chat da própria extensão">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>Chat da extensão</span>
              </button>
              <button type="button" class="next-chatmode-opt" data-ghmode="overlay" title="Usar a barra que sobrepõe o chat do GitHub na Lovable">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                <span>Chat sobreposto</span>
              </button>
            </div>
            <div class="next-popover-divider"></div>
            <button class="next-popover-item" id="nextDockDb" title="Banco de dados (Supabase)" data-model="db">
              <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
              <span>Banco de dados</span>
            </button>
          </div>
        </div>
        <div class="next-popover-wrap next-footer-pill-wrap">
          <button type="button" class="next-footer-pill" id="nextEngineBtn">
            <span class="next-footer-dot" id="nextEngineDot"></span>
            <span class="next-footer-pill-label" id="nextEngineLabel">DeepSeek V4.1 Flash</span>
            <svg class="next-footer-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="next-popover" id="nextEnginePopover" style="display:none;">
            <div class="next-popover-label">Modelo de IA</div>
            <button class="next-popover-item" data-engine="gpt-5" data-engine-label="GPT-5 · DeepSeek">
              <span class="next-engine-dot" style="background:#10a37f;"></span>
              <span>GPT-5</span>
            </button>
            <button class="next-popover-item" data-engine="opus-5" data-engine-label="Opus 5 · DeepSeek">
              <span class="next-engine-dot" style="background:#d97757;"></span>
              <span>Opus 5</span>
            </button>
            <button class="next-popover-item" data-engine="gemini" data-engine-label="Gemini · DeepSeek">
              <span class="next-engine-dot" style="background:#4285f4;"></span>
              <span>Gemini</span>
            </button>
            <button class="next-popover-item" data-engine="deepseek-flash" data-engine-label="DeepSeek V4.1 Flash">
              <span class="next-engine-dot" style="background:#7c5cff;"></span>
              <span>DeepSeek V4.1 Flash</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         BARRA GITHUB — edita o projeto via commits no repositório.
         Três estados: desconectado / escolhendo repo / pronto.
         ══════════════════════════════════════════════════════════ -->
    <div class="vtx-gh-bar" id="vtxGhBar" style="display:none;">

      <!-- Estado 1: sem conta GitHub conectada -->
      <div class="vtx-gh-state" id="vtxGhStateDisconnected" style="display:none;">
        <div class="vtx-gh-head">
          <svg class="vtx-gh-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.04-.01-1.89-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.29 9.29 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>
          <span class="vtx-gh-head-text">Conecte o GitHub para editar via IA</span>
          <button class="vtx-gh-x" data-gh-close title="Fechar">×</button>
        </div>
        <button class="vtx-gh-primary-btn" id="vtxGhConnectBtn">
          <span class="btn-text">Conectar GitHub</span>
          <span class="btn-spinner" style="display:none;"></span>
        </button>
      </div>

      <!-- Estado 2: conectado, escolhendo repositório -->
      <div class="vtx-gh-state" id="vtxGhStateRepos" style="display:none;">
        <div class="vtx-gh-head">
          <span class="vtx-gh-head-text">Conectado como <b id="vtxGhLogin"></b></span>
          <button class="vtx-gh-switch" id="vtxGhSwitchBtn">Trocar conta</button>
          <button class="vtx-gh-x" data-gh-close title="Fechar">×</button>
        </div>
        <div class="vtx-gh-auto-hint" id="vtxGhAutoHint" style="display:none;"></div>
        <input type="text" id="vtxGhRepoFilter" class="vtx-gh-filter" placeholder="Filtrar repositórios..." autocomplete="off" />
        <div class="vtx-gh-repo-list" id="vtxGhRepoList"></div>
      </div>

      <!-- Estado 3: pronto para enviar comandos -->
      <div class="vtx-gh-state" id="vtxGhStateReady" style="display:none;">
        <div class="vtx-gh-head">
          <svg class="vtx-gh-icon small" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.04-.01-1.89-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.29 9.29 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>
          <span class="vtx-gh-repo-name" id="vtxGhRepoName"></span>
          <button class="vtx-gh-switch" id="vtxGhChangeRepoBtn">Trocar</button>
          <button class="vtx-gh-x" data-gh-close title="Fechar">×</button>
        </div>
        <div class="vtx-sel-chip" id="vtxSelChip" style="display:none;"></div>
        <textarea id="vtxGhPrompt" class="vtx-gh-textarea" rows="2" placeholder="Descreva a alteração que você quer..."></textarea>
        <div class="vtx-gh-actions">
          <button class="vtx-gh-pick" id="vtxGhAttachBtn" title="Anexar imagem de referência ou arquivo">
            <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input type="file" id="vtxGhFileInput" multiple style="display:none;"
                 accept="image/*,.txt,.md,.json,.csv,.html,.css,.js,.ts,.jsx,.tsx" />
          <button class="vtx-gh-pick" id="vtxGhPickBtn" title="Selecionar elemento no Preview">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
          </button>
          <button class="vtx-gh-send" id="vtxGhSendBtn" title="Enviar pra IA">
            <svg class="send-icon" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            <span class="send-spinner" style="display:none;"></span>
          </button>
        </div>
        <div class="vtx-gh-attach-list" id="vtxGhAttachList" style="display:none;"></div>
        <div class="vtx-gh-msg" id="vtxGhMsg" style="display:none;"></div>
        <div class="vtx-gh-result" id="vtxGhResult" style="display:none;"></div>
      </div>
    </div>
    <!-- ══════════════════════════════════════════════════════════
         BARRA DO BANCO DE DADOS (Supabase do cliente)
         Fluxo em duas etapas: gera o SQL → cliente revisa → aplica.
         Nada roda no banco sem passar pela revisão.
         ══════════════════════════════════════════════════════════ -->
    <div class="vtx-gh-bar" id="vtxDbBar" style="display:none;">

      <div class="vtx-gh-state" id="vtxDbDisconnected" style="display:none;">
        <div class="vtx-gh-head">
          <span class="vtx-gh-head-text">Conecte seu Supabase para criar e editar tabelas</span>
          <button class="vtx-gh-x" data-db-close title="Fechar">×</button>
        </div>
        <button class="vtx-gh-primary-btn" id="vtxDbConnectBtn">
          <span class="btn-text">Conectar Supabase</span>
        </button>
      </div>

      <div class="vtx-gh-state" id="vtxDbProjects" style="display:none;">
        <div class="vtx-gh-head">
          <span class="vtx-gh-head-text">Escolha o projeto</span>
          <button class="vtx-gh-switch" id="vtxDbSwitchBtn">Trocar conta</button>
          <button class="vtx-gh-x" data-db-close title="Fechar">×</button>
        </div>
        <div class="vtx-gh-repo-list" id="vtxDbProjectList"></div>
      </div>

      <div class="vtx-gh-state" id="vtxDbReady" style="display:none;">
        <div class="vtx-gh-head">
          <span class="vtx-gh-repo-name" id="vtxDbProjectName"></span>
          <button class="vtx-gh-switch" id="vtxDbChangeProjectBtn">Trocar</button>
          <button class="vtx-gh-x" data-db-close title="Fechar">×</button>
        </div>
        <textarea id="vtxDbPrompt" class="vtx-gh-textarea" rows="2"
          placeholder="Ex: crie uma tabela de depósitos com valor, status e data"></textarea>
        <div class="vtx-gh-actions">
          <button class="vtx-gh-send" id="vtxDbGenBtn" title="Gerar SQL">
            <svg class="send-icon" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            <span class="send-spinner" style="display:none;"></span>
          </button>
        </div>

        <!-- Revisão: o SQL aparece aqui ANTES de rodar -->
        <div class="vtx-db-preview" id="vtxDbPreview" style="display:none;">
          <div class="vtx-db-explain" id="vtxDbExplain"></div>
          <pre class="vtx-db-sql" id="vtxDbSql" translate="no" lang="en" spellcheck="false"></pre>
          <div class="vtx-db-warn" id="vtxDbWarn" style="display:none;"></div>
          <div class="vtx-db-buttons">
            <button class="vtx-db-cancel" id="vtxDbCancelBtn">Cancelar</button>
            <button class="vtx-db-apply" id="vtxDbApplyBtn" translate="no">Aplicar no banco</button>
          </div>
        </div>
      </div>

      <!-- Mensagem e resultado ficam FORA dos estados: assim o erro
           aparece mesmo na tela de conectar (antes ficavam dentro do
           estado "pronto" e o cliente não via nada acontecer). -->
      <div class="vtx-gh-msg" id="vtxDbMsg" style="display:none;"></div>
      <div class="vtx-gh-result" id="vtxDbResult" style="display:none;"></div>
    </div>
  `;
  
  let isMounted = false;
  function mountRoot() {
    if (document.getElementById('next-widget-root')) return;
    try {
      (document.body || document.documentElement).appendChild(root);
      isMounted = true;
    } catch (e) {}
  }

  mountRoot();
  
  // Garante que o widget não seja destruído por frameworks (React/Next.js/Lovable)
  const observer = new MutationObserver(() => {
    if (isMounted && !document.contains(root)) {
      mountRoot();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountRoot);
  }

  // ============================================================================
  // FLUXO LIMPO: UI + LICENÇA APENAS
  // ============================================================================
  const launcher = root.querySelector('#nextLauncher');
  const app = root.querySelector('#nextApp');
  const dragHandle = root.querySelector('#nextDragHandle');
  const grid = root.querySelector('#nextCommandGrid');
  const licenseModal = root.querySelector('#vertexLicenseModal');
  const licenseForm = root.querySelector('#vertexLicenseForm');
  const licenseInput = root.querySelector('#vertexLicenseInput');
  const licenseMsg = root.querySelector('#vertexLicenseMsg');
  const activateBtn = root.querySelector('#vertexActivateBtn');
  const licenseCloseBtn = root.querySelector('#vertexLicenseCloseBtn');
  const userCard = root.querySelector('#nextUserCard');
  const userExpandedBody = root.querySelector('#nextUserExpandedBody');
  const userBadge = root.querySelector('#nextUserBadge');
  const userName = root.querySelector('#nextUserName');
  const exitBtn = root.querySelector('#nextExitBtn');
  const remainingDaysEl = root.querySelector('#nextRemainingDays');
  const progressFillEl = root.querySelector('#nextProgressFill');
  const expiresFooterEl = root.querySelector('#nextExpiresFooter');
  const commandsCountEl = root.querySelector('#nextCommandsCount');
  const savingsAmountEl = root.querySelector('#nextSavingsAmount');

  let isLicensed = false;
  let activeProfile = null;
  const commandQueue = [];
  let isQueuePaused = false;

  app.style.bottom = '92px';
  app.style.right = '24px';

  // ── Modo ancorado: fixa o painel na lateral, tela cheia, empurrando o
  // conteúdo da página (tela dividida de verdade, não só flutuando por
  // cima). Lembrado entre sessões.
  const DOCK_MODE_KEY = 'vertex_dock_mode';
  const DOCK_WIDTH = 380; // precisa bater com o width de .next-app.docked no CSS
  const dockToggleBtn = root.querySelector('#nextDockToggleBtn');
  function applyDockMode(ligado) {
    app.classList.toggle('docked', ligado);
    dockToggleBtn?.classList.toggle('ativo', ligado);
    document.documentElement.style.transition = 'margin-right .18s ease';
    if (ligado) {
      // limpa posição de arraste anterior pra não brigar com o CSS do modo ancorado
      app.style.left = 'auto'; app.style.top = 'auto';
      app.style.bottom = 'auto'; app.style.right = 'auto';
      // empurra a página de verdade (tela dividida) em vez de só sobrepor
      document.documentElement.style.marginRight = `${DOCK_WIDTH}px`;
    } else {
      app.style.left = 'auto'; app.style.top = 'auto';
      app.style.bottom = '92px'; app.style.right = '24px';
      document.documentElement.style.marginRight = '';
    }
    // atualiza a visibilidade do chat da Aurora (só aparece ancorado +
    // nenhum outro painel aberto por cima)
    if (typeof applyPanel === 'function') applyPanel();
  }
  dockToggleBtn?.addEventListener('click', () => {
    const ligar = !app.classList.contains('docked');
    applyDockMode(ligar);
    chrome.storage.local.set({ [DOCK_MODE_KEY]: ligar }).catch(() => {});
  });
  chrome.storage.local.get([DOCK_MODE_KEY]).then((s) => {
    if (s?.[DOCK_MODE_KEY]) applyDockMode(true);
  }).catch(() => {});

  // ── Chat da Aurora (modo ancorado) ──────────────────────────────────
  const dockChatMessages = root.querySelector('#nextDockChatMessages');
  // "Modo chat completo": além do modo ancorado de verdade, também vale
  // quando o painel compacto já está com GitHub+Supabase conectados e
  // na tela inicial — nesse caso ele se comporta como o ancorado (chat
  // da Aurora com a IA trabalhando) em vez de mostrar Atalhos/Status.
  function chatCompletoNaHome() {
    return currentPanel === 'shortcuts' && !!ghActiveRepo && !!(dbProjectName?.textContent);
  }
  function isDocked() { return app.classList.contains('docked') || chatCompletoNaHome(); }

  root.querySelector('#nextPlanoToggle')?.addEventListener('change', (e) => {
    modoPlanoAtivo = !!e.target.checked;
    chrome.storage.local.set({ vertex_modo_plano: modoPlanoAtivo }).catch(() => {});
  });

  // Validation belongs to the signed proposal, and publishing rechecks GitHub.
  function planControls(plano) {
    const v = plano.validation;
    const labels = {queued:'Na fila do GitHub',in_progress:'Executando build e testes',waiting:'Aguardando GitHub',requested:'Aguardando execução',pending:'Aguardando execução',
      passed: v?.tests === 'not_configured' ? 'Build aprovado. Projeto sem testes configurados.' : 'Build e testes aprovados.',
      failure:'A validação falhou. Confira os detalhes.',cancelled:'Validação cancelada.',timed_out:'A validação excedeu o tempo.',not_found:'Execução não localizada. Gere outro plano.',
      dispatch_failed:'O GitHub recusou a execução.',unverified:'Não foi possível comprovar a validação.',ready:'Configuração pronta. Clique em Validar.',not_started:'Build e testes ainda não executados.'};
    const status = labels[v?.state] || (v?.state ? 'Aguardando validação.' : 'Build e testes ainda não executados.');
    const running = ['queued','in_progress','waiting','requested','pending'].includes(v?.state);
    const details = (v?.steps || []).filter(x => x.conclusion && !['success','skipped'].includes(x.conclusion))
      .map(x=>`${x.name}: ${x.conclusion}`).join('; ');
    const runLink = v?.url && /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(v.url)
      ? `<a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer">Ver execução no GitHub</a>` : '';
    return `<div class="next-ci-result" role="status">${escapeHtml(status)}${details ? '<br>'+escapeHtml(details) : ''}${runLink ? '<br>'+runLink : ''}</div>` +
      (plano.error ? `<div class="next-ci-error">${escapeHtml(plano.error)}</div>` : '') +
      (plano.setupFile ? `<details class="next-ci-setup"><summary>Configuração manual</summary>Se a conta não puder instalar automaticamente, copie o conteúdo para <code>.github/workflows/vertex-validation.yml</code> na branch principal do GitHub. Depois gere outro plano.<button type="button" class="next-plan-btn next-plan-copy-config">Copiar configuração</button></details>` : '') +
      (plano.needsSetup ? '<p class="next-ci-setup">Ativar adiciona um arquivo de configuração ao GitHub. As execuções usam a cota de Actions da conta. Requer permissão para workflows.</p><button type="button" class="next-plan-btn next-plan-setup">Ativar validação no GitHub</button>' : '') +
      `<button type="button" class="next-plan-btn next-plan-validate" ${plano.busy || running || (v && !['ready','not_started'].includes(v.state)) ? 'disabled' : ''}>Validar build e testes</button>` +
      (running || plano.checkpoint ? `<button type="button" class="next-plan-btn next-plan-check" ${plano.busy ? 'disabled' : ''}>Atualizar resultado</button>` : '') +
      `<button type="button" class="next-plan-btn next-plan-apply" ${plano.busy || (plano.requiresValidation && !v?.publishable) ? 'disabled' : ''}>Aprovar commit</button>` +
      `<button type="button" class="next-plan-btn next-plan-cancel" ${plano.busy ? 'disabled' : ''}>Cancelar</button>`;
  }
  function planContextCurrent(plano) {
    return plano.projectKey === getProjectContextKey() && plano.repo === ghActiveRepo && repoResolvedProjectKey === getProjectContextKey();
  }
  async function planOwner() {
    const auth = await ghAuth();
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([auth.licenseKey,auth.deviceId])));
    return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function savePendingPlan(id) {
    const p = pendingPlans[id];
    if (!p) { await chrome.storage.local.remove('vertex_plan_'+id); return; }
    if (!p.owner) p.owner = await planOwner();
    const {timer,busy,...saved} = p;
    await chrome.storage.local.set({['vertex_plan_'+id]:saved});
  }
  async function planRequest(plano, action, extra = {}) {
    if (!planContextCurrent(plano)) throw new Error('O projeto mudou. Volte ao projeto deste plano.');
    const auth = await ghAuth();
    if (plano.owner && plano.owner !== await planOwner()) throw new Error('A licença mudou. Gere um novo plano.');
    const res = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION','github-ai-edit'), {method:'POST',headers:cfgHeaders(),signal:AbortSignal.timeout(90000),
      body:JSON.stringify({...auth,action,files:plano.files,assets:plano.assets || [],plan_token:plano.token,...extra})});
    const result = await res.json();
    if (result.setup_file) plano.setupFile = result.setup_file;
    if (result.plan_token) plano.token = result.plan_token;
    if (Number.isFinite(result.plan_expires_at)) plano.expiresAt = result.plan_expires_at;
    if (result.validation) plano.validation = result.validation;
    if (result.plan_token && ['validation_start','validation_status'].includes(action)) {plano.checkpoint = true;}
    if (!result.ok) {plano.needsSetup = result.code === 'VALIDATION_SETUP_REQUIRED';throw new Error(result.error || 'Falha na validação.');}
    plano.error = '';
    plano.needsSetup = false;
    return result;
  }
  function schedulePlanCheck(id, wrap) {
    const p = pendingPlans[id];
    if (!p || p.timer || !['queued','in_progress','waiting','requested','pending'].includes(p.validation?.state)) return;
    p.timer = setTimeout(async()=>{
      p.timer = null;
      if (!pendingPlans[id] || !planContextCurrent(p) || !wrap.isConnected || p.busy) return;
      p.busy = true;
      try { await planRequest(p,'validation_status'); }
      catch(e) {p.error = e.message;}
      p.busy = false;
      wrap.innerHTML = planControls(p);
      await savePendingPlan(id).catch(()=>{});
      if (!p.error) schedulePlanCheck(id,wrap);
    },5000);
  }
  let restoringPlans = false;
  async function restorePendingPlans() {
    if (restoringPlans || !isDocked() || !ghActiveRepo || repoResolvedProjectKey !== getProjectContextKey()) return;
    restoringPlans = true;
    try {
      const owner = await planOwner();
      const saved = await chrome.storage.local.get(null);
      for (const [key,p] of Object.entries(saved)) {
        if (!key.startsWith('vertex_plan_')) continue;
        if (!p || p.expiresAt < Date.now()) {await chrome.storage.local.remove(key);continue;}
        const id = key.slice('vertex_plan_'.length);
        if (!/^plano_[a-f0-9-]+$/.test(id) || !Array.isArray(p.files)) continue;
        if (pendingPlans[id] || p.owner !== owner || !planContextCurrent(p)) continue;
        pendingPlans[id] = p;
        const paths = p.files.map(f=>escapeHtml(f.path)).join('<br>') + globalThis.VertexAuroraEngine.render(p.engine) + globalThis.VertexCodeReview.render(p.files,p.reviewBase,p.assets);
        addDockChatMessage('ai',`📋 <b>Plano recuperado</b><br>${escapeHtml(p.prompt)}<br>${paths}<div class="next-dock-plan-actions" data-plan-id="${id}">${planControls(p)}</div>`,'plano');
        const wrap = dockChatMessages.querySelector(`[data-plan-id="${id}"]`);
        if (wrap) schedulePlanCheck(id,wrap);
      }
    } finally {restoringPlans = false;}
  }
  dockChatMessages?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.next-plan-btn');
    if (!btn || btn.disabled) return;
    const wrap = btn.closest('.next-dock-plan-actions');
    const id = wrap?.dataset.planId;
    const p = id && pendingPlans[id];
    if (!p || p.busy || undoBusy) return;
    if (btn.classList.contains('next-plan-copy-config')) {
      try {await navigator.clipboard.writeText(p.setupFile.content);btn.textContent='Copiado!';} catch (_) {p.error='Use o arquivo ci/vertex-validation.yml incluído no ZIP.';wrap.innerHTML=planControls(p);}
      return;
    }
    p.busy = true;
    clearTimeout(p.timer);p.timer = null;
    wrap.innerHTML = planControls(p);
    try {
      if (btn.classList.contains('next-plan-cancel')) {
        if (p.checkpoint) await planRequest(p,'validation_cancel');
        if(p.jobId)await settlePlanJob(p.jobId,true);
        const scope = await projectMemoryStore.scope(p.owner,p.repo,p.projectKey);
        const entry = await projectMemoryStore.update(scope,current=>({turns:current.turns.filter(t=>!(t.user===String(p.prompt).slice(0,500) && t.reply.startsWith('[Plano proposto')))}));
        if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {auroraHistory=projectMemoryStore.history(entry);memoryIndicator(entry);}
        delete pendingPlans[id];
        await savePendingPlan(id);
        wrap.innerHTML = '<span class="next-plan-status">Plano descartado. Nenhuma alteração do plano foi publicada.</span>';
        return;
      }
      if (btn.classList.contains('next-plan-apply')) {
        const data = await planRequest(p,'confirm_plan',{reviewAcknowledged:true});
        await rememberCommitResult(data,p.repo,p.projectKey,p.prompt,await projectMemoryStore.scope(p.owner,p.repo,p.projectKey));
        if(p.jobId)await settlePlanJob(p.jobId,false);
        delete pendingPlans[id];await savePendingPlan(id);
        wrap.innerHTML = `<span class="next-plan-status ok">✅ Commit <a href="${escapeHtml(data.commit_url)}" target="_blank" rel="noopener noreferrer">${(data.commit_sha||'').slice(0,7)}</a> aplicado.</span>${data.undo_token ? undoButton(data.commit_sha) : ''}`;
        return;
      }
      p.requiresValidation = true;
      const action = btn.classList.contains('next-plan-setup') ? 'validation_setup' : btn.classList.contains('next-plan-check') ? 'validation_status' : 'validation_start';
      await planRequest(p,action,action === 'validation_setup' ? {setupAcknowledged:true} : {});

    } catch(e) {p.error = e.message || String(e);}
    p.busy = false;
    wrap.innerHTML = planControls(p);
    await savePendingPlan(id).catch(()=>{p.error = 'Não foi possível salvar o plano para recuperação.';wrap.innerHTML=planControls(p);});
    schedulePlanCheck(id,wrap);
  });

  // Memória curta da conversa: guarda o texto puro (sem HTML) das últimas
  // trocas para contexto. Apenas turnos concluídos são persistidos por projeto;
  // tentativas que falham ficam fora da memória durável.
  const AURORA_HISTORY_MAX = 8; // 4 pares pergunta/resposta
  let auroraHistory = [];
  let pendingClarification = null;
  // Planos pendentes de aprovação (Modo Planejamento) — guarda o conteúdo
  // exato gerado pela IA, pra "Aplicar" commitar sem chamar a IA de novo.
  const pendingPlans = {};
  async function engineSkillKey() {
    if(!ghActiveRepo || repoResolvedProjectKey!==getProjectContextKey())throw Error('Conecte o repositório deste projeto para gerenciar skills.');
    return 'vertex_aurora_skills_'+await planOwner()+':'+ghActiveRepo+':'+getProjectContextKey();
  }
  async function readEngineOptions() {
    const key=await engineSkillKey(),r=await chrome.storage.local.get(key);
    return {auroraEngine:true,auroraSkills:globalThis.VertexAuroraEngine.validate(r[key] || [])};
  }
  async function showInstalledSkills() {
    const key=await engineSkillKey(),r=await chrome.storage.local.get(key);
    const skills=globalThis.VertexAuroraEngine.validate(r[key] || []);
    if(key!==await engineSkillKey())return;
    root.querySelector('#nextEngineSkills').innerHTML=skills.length?skills.map(s=>`<div class="next-engine-skill-row"><span>${escapeHtml(s.name)} · ${escapeHtml(s.version)}</span><button type="button" data-remove-skill="${s.id}" aria-label="Remover ${escapeHtml(s.name)}">×</button></div>`).join(''):'<small>Nenhuma skill personalizada neste projeto.</small>';
  }
  const skillStatus=message=>{root.querySelector('#nextSkillStatus').textContent=message;};
  root.querySelector('#nextEngineSettings')?.addEventListener('toggle',e=>{
    if(e.target.open)showInstalledSkills().catch(e=>skillStatus(e.message));
  });
  root.querySelector('#nextSkillInstall')?.addEventListener('click',()=>root.querySelector('#nextSkillFile').click());
  root.querySelector('#nextSkillFile')?.addEventListener('change',async e=>{
    try {
      const file=e.target.files[0];if(!file)return;
      if(file.size>16000)throw Error('O arquivo de skills deve ter no máximo 16 KB.');
      const key=await engineSkillKey();
      const raw=JSON.parse(await file.text());
      const incoming=globalThis.VertexAuroraEngine.validate(Array.isArray(raw)?raw:[raw]);
      const saved=await chrome.storage.local.get(key);
      const skills=globalThis.VertexAuroraEngine.validate([...(saved[key]||[]).filter(s=>!incoming.some(n=>n.id===s.id)),...incoming]);
      if(key!==await engineSkillKey())throw Error('O projeto mudou. Instale novamente no projeto desejado.');
      await chrome.storage.local.set({[key]:skills});
      await showInstalledSkills();skillStatus('Skill instalada neste projeto. Será usada nos próximos comandos.');
    }catch(error){skillStatus(error.message);}finally{e.target.value='';}
  });
  root.querySelector('#nextEngineSkills')?.addEventListener('click',async e=>{
    const button=e.target.closest('[data-remove-skill]');if(!button)return;
    try{const key=await engineSkillKey(),saved=await chrome.storage.local.get(key);await chrome.storage.local.set({[key]:(saved[key]||[]).filter(s=>s.id!==button.dataset.removeSkill)});await showInstalledSkills();skillStatus('Skill removida.');}catch(error){skillStatus(error.message);}
  });
  root.querySelector('#nextSkillExample')?.addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(globalThis.VertexAuroraEngine.example,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='aurora-skill.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  let modoPlanoAtivo = false;
  chrome.storage.local.get('vertex_modo_plano').then((r) => {
    modoPlanoAtivo = r?.vertex_modo_plano === true;
    const toggleEl = root.querySelector('#nextPlanoToggle');
    if (toggleEl) toggleEl.checked = modoPlanoAtivo;
  }).catch(() => {});
  function auroraRecord(role, textoPuro) {
    if (!textoPuro) return;
    auroraHistory.push({ role, content: String(textoPuro).slice(0, 500) });
    if (auroraHistory.length > AURORA_HISTORY_MAX) auroraHistory.shift();
  }

  const projectMemoryStore = globalThis.VertexProjectMemory.create(chrome.storage.local);
  let loadedMemoryScope = null;
  let currentUndo = null;
  let undoBusy = false;
  let undoConfirm = false;
  projectMemoryStore.prune().catch(()=>{});
  async function getMemoryScope(repo=ghActiveRepo, projectKey=getProjectContextKey()) {
    if (!repo || !projectKey) return null;
    return projectMemoryStore.scope(await planOwner(),repo,projectKey);
  }
  function memoryScopeCurrent(scope) {
    return !!scope && scope.repo === ghActiveRepo && scope.projectKey === getProjectContextKey();
  }
  function memoryIndicator(entry={}) {
    const label = root.querySelector('#nextMemoryStatus');
    if (label) label.textContent = entry.page ? `Contexto: ${entry.page.split('/').pop()}` : entry.turns?.length ? 'Contexto desta conversa salvo' : 'Contexto por projeto';
  }
  function undoButton(sha) {
    return `<button type="button" class="next-undo-open" data-commit-sha="${escapeHtml(sha)}">Desfazer alteração</button>`;
  }
  function renderUndo() {
    const areas = root.querySelectorAll('#nextUndoArea,.next-inline-undo');
    const available = currentUndo && currentUndo.expiresAt > Date.now() && memoryScopeCurrent(loadedMemoryScope);
    for (const area of areas) {
    area.hidden = !available;
    if (!available) {area.innerHTML='';continue;}
    area.innerHTML = undoBusy ? '<span>Desfazendo alteração...</span>' : undoConfirm
      ? `<span>Desfazer a alteração ${escapeHtml(currentUndo.sha.slice(0,7))}? Isso restaura o código anterior com um novo commit.</span><div><button type="button" class="next-undo-confirm" data-commit-sha="${escapeHtml(currentUndo.sha)}">Confirmar reversão</button><button type="button" class="next-undo-dismiss">Manter alteração</button></div>`
      : `<span>Última alteração: ${escapeHtml(currentUndo.sha.slice(0,7))}</span>${undoButton(currentUndo.sha)}`;
    }
  }
  async function ensureAuroraMemory() {
    const scope = await getMemoryScope();
    if (!memoryScopeCurrent(scope)) return null;
    if (loadedMemoryScope?.key === scope.key) return scope;
    const entry = await projectMemoryStore.read(scope);
    if (!memoryScopeCurrent(scope) || scope.owner !== await planOwner()) return null;
    loadedMemoryScope = scope;
    auroraHistory = projectMemoryStore.history(entry);
    pendingClarification = null;
    currentUndo = entry.lastUndo || null;
    undoConfirm = false;
    memoryIndicator(entry);renderUndo();
    return scope;
  }
  async function saveSuccessfulTurn(scope,prompt,reply) {
    if (!scope) return;
    const entry = await projectMemoryStore.append(scope,prompt,reply);
    if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {
      loadedMemoryScope = scope;auroraHistory = projectMemoryStore.history(entry);memoryIndicator(entry);
    }
  }
  async function rememberCommitResult(data, repo, projectKey, prompt, scopeSnapshot=null) {
    const scope = scopeSnapshot || await getMemoryScope(repo,projectKey);
    if (!scope) return;
    const previous = await projectMemoryStore.read(scope).catch(()=>({turns:[]}));
    const page = inferEditedPage(data.files_changed);
    const undo = data.undo_token ? {token:data.undo_token,sha:data.commit_sha,previousPage:previous.page || null,expiresAt:Date.now()+7*86400000} : null;
    const reply = `[Commit ${data.commit_sha.slice(0,7)} aplicado. Arquivos: ${(data.files_changed || []).join(', ')}]`;
    if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {loadedMemoryScope=scope;currentUndo=undo;undoConfirm=false;renderUndo();}
    try {
      const entry = await projectMemoryStore.update(scope,current=>({page:page===undefined ? previous.page || null : page,lastUndo:undo,
        turns:[...current.turns.filter(t=>!(t.user===String(prompt).slice(0,500) && t.reply.startsWith('[Plano proposto'))),{user:String(prompt).slice(0,500),reply:reply.slice(0,500),at:Date.now()}].slice(-4)}));
      if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {auroraHistory=projectMemoryStore.history(entry);memoryIndicator(entry);}
    } catch (_) {composerNotice('Commit aplicado, mas não consegui salvar o contexto neste navegador.');}
  }
  root.querySelector('#nextMemoryClear')?.addEventListener('click',async()=>{
    if (activeEdit || undoBusy) {composerNotice('Aguarde a operação atual antes de limpar o contexto.');return;}
    const scope = await ensureAuroraMemory();
    if (!scope) return;
    try {
      const entry = await projectMemoryStore.forget(scope);
      if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {auroraHistory=[];pendingClarification=null;memoryIndicator(entry);composerNotice('Contexto deste projeto apagado.');}
    } catch (_) {composerNotice('Não foi possível apagar o contexto. Tente novamente.');}
  });
  root.addEventListener('click',async e=>{
    const button = e.target.closest('.next-undo-open,.next-undo-confirm,.next-undo-dismiss');
    if (!button || undoBusy) return;
    if (activeEdit) {composerNotice('Aguarde ou cancele a edição atual antes de desfazer.');return;}
    const scope = await ensureAuroraMemory();
    if (!scope || !currentUndo || currentUndo.expiresAt < Date.now()) {composerNotice('Não há alteração recente disponível para desfazer.');return;}
    if (button.classList.contains('next-undo-dismiss')) {undoConfirm=false;renderUndo();return;}
    if (button.classList.contains('next-undo-open')) {
      if (button.dataset.commitSha !== currentUndo.sha) {composerNotice('Este botão pertence a uma alteração anterior. Use a última alteração.');return;}
      undoConfirm=true;renderUndo();(isDocked() ? root.querySelector('#nextUndoArea') : root.querySelector('.next-inline-undo'))?.scrollIntoView({block:'nearest'});return;
    }
    if (!undoConfirm || button.dataset.commitSha !== currentUndo.sha) {composerNotice('O contexto mudou. Selecione novamente a alteração que deseja desfazer.');return;}
    const receipt = {...currentUndo};undoBusy=true;renderUndo();
    try {
      if (!memoryScopeCurrent(scope) || scope.owner !== await planOwner()) throw new Error('O projeto ou a licença mudou. Volte ao projeto da alteração.');
      const auth = await ghAuth();
      const response = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION','github-ai-edit'),{method:'POST',headers:cfgHeaders(),signal:AbortSignal.timeout(90000),
        body:JSON.stringify({...auth,action:'undo_commit',undo_token:receipt.token,undoAcknowledged:true})});
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Não foi possível desfazer a alteração.');
      const patch = {lastUndo:null,page:receipt.previousPage,turns:[{user:'Desfazer a última alteração',reply:`[Alteração ${receipt.sha.slice(0,7)} desfeita no commit ${data.commit_sha.slice(0,7)}. Não reaplicar o pedido anterior.]`,at:Date.now()}]};
      const entry = await projectMemoryStore.update(scope,()=>patch).catch(()=>{composerNotice('Alteração desfeita, mas não consegui salvar o novo contexto neste navegador.');return patch;});
      if (memoryScopeCurrent(scope) && scope.owner === await planOwner()) {
        currentUndo=null;undoConfirm=false;auroraHistory=projectMemoryStore.history(entry);pendingClarification=null;memoryIndicator(entry);
        addDockChatMessage('ai',`↩️ Alteração desfeita. <a href="${escapeHtml(data.commit_url)}" target="_blank" rel="noopener noreferrer">Ver commit de reversão</a>`,'edit');
      }
    } catch (error) {composerNotice(error.message || String(error));}
    finally {undoBusy=false;renderUndo();}
  });

  function messageCopyText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('button, .next-dock-plan-actions').forEach((node) => node.remove());
    clone.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
    clone.querySelectorAll('p, li, pre, div').forEach((node) => node.append('\n'));
    return clone.textContent.trim();
  }

  function addMessageCopyButton(element) {
    if (!element || element.querySelector(':scope > .next-copy-message') || !element.textContent.trim()) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'next-copy-message';
    button.title = 'Copiar resposta';
    button.setAttribute('aria-label', 'Copiar resposta');
    const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
    button.innerHTML = icon;
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = messageCopyText(element);
      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch (_) {
        const focused = document.activeElement;
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(input);
        input.select();
        try { copied = document.execCommand('copy'); } catch (_) {}
        input.remove();
        focused?.focus({ preventScroll: true });
      }
      button.innerHTML = copied ? '✓ Copiado' : 'Tente copiar novamente';
      button.setAttribute('aria-label', copied ? 'Resposta copiada' : 'Falha ao copiar. Tente novamente');
      setTimeout(() => { button.innerHTML = icon; button.setAttribute('aria-label', 'Copiar resposta'); }, 2200);
    });
    element.appendChild(button);
  }

  // Reinsere o botão também quando um plano/progresso vira resultado ou erro.
  const copyObserver = new MutationObserver(() => {
    root.querySelectorAll('.next-dock-msg.ai:not(.next-dock-thinking), #vtxGhMsg, #vtxGhResult')
      .forEach(addMessageCopyButton);
  });
  copyObserver.observe(dockChatMessages, { childList: true, subtree: true });

  function addDockChatMessage(role, text, tipo) {
    if (!dockChatMessages) return;
    const vazio = dockChatMessages.querySelector('.next-dock-chat-empty');
    if (vazio) vazio.remove();
    const bolha = document.createElement('div');
    bolha.className = `next-dock-msg ${role === 'user' ? 'user' : 'ai'}${tipo ? ' ' + tipo : ''}`;
    bolha.innerHTML = text; // já vem escapado/formatado por quem chama
    if (role !== 'user') addMessageCopyButton(bolha);
    dockChatMessages.appendChild(bolha);
    dockChatMessages.scrollTop = dockChatMessages.scrollHeight;
    return bolha;
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Indicador "pensando" — em vez de bolinhas genéricas, mostra uma lista
  // de passos que vai marcando ✓ conforme avança pelas fases reais do
  // pedido. Como o backend não manda progresso em streaming (a resposta
  // só chega pronta no final), o avanço é por tempo estimado — a ORDEM
  // dos passos é sempre a ordem real do pipeline, só o "quando exatamente
  // cada um terminou" é aproximado. O último passo fica girando até a
  // resposta de verdade chegar (nunca finge terminar sem confirmação).
  let dockThinkingShownAt = 0;
  let dockStepTimer = null;
  const DOCK_THINKING_MIN_MS = 700;
  const DOCK_STEPS = ['Analisando o projeto', 'Escolhendo o arquivo certo', 'Gerando as alterações', 'Verificando sintaxe e estilo'];
  const DOCK_STEP_DELAYS = [900, 2600, 6000]; // ms até passar pro próximo passo
  function showDockThinking() {
    if (!dockChatMessages) return;
    const vazio = dockChatMessages.querySelector('.next-dock-chat-empty');
    if (vazio) vazio.remove();
    dockChatMessages.querySelector('#nextDockThinking')?.remove();
    const bolha = document.createElement('div');
    bolha.className = 'next-dock-msg ai next-dock-thinking';
    bolha.id = 'nextDockThinking';
    bolha.innerHTML = '<div class="next-dock-steps">' + DOCK_STEPS.map((label, i) =>
      `<div class="next-dock-step${i === 0 ? ' active' : ''}" data-step="${i}"><span class="next-dock-step-icon"></span><span class="next-dock-step-label">${escapeHtml(label)}</span></div>`
    ).join('') + '</div>';
    dockChatMessages.appendChild(bolha);
    dockChatMessages.scrollTop = dockChatMessages.scrollHeight;
    dockThinkingShownAt = Date.now();

    let stepAtual = 0;
    function ativarProximo() {
      const bolhaAtual = document.getElementById('nextDockThinking');
      if (!bolhaAtual) return; // já foi removida (resposta chegou antes)
      const atual = bolhaAtual.querySelector(`.next-dock-step[data-step="${stepAtual}"]`);
      if (atual) { atual.classList.remove('active'); atual.classList.add('done'); }
      stepAtual++;
      if (stepAtual >= DOCK_STEPS.length) return;
      const proximo = bolhaAtual.querySelector(`.next-dock-step[data-step="${stepAtual}"]`);
      if (proximo) proximo.classList.add('active');
      if (stepAtual < DOCK_STEPS.length - 1) {
        dockStepTimer = setTimeout(ativarProximo, DOCK_STEP_DELAYS[stepAtual]);
      }
    }
    dockStepTimer = setTimeout(ativarProximo, DOCK_STEP_DELAYS[0]);
  }
  // Espera o tempo mínimo (se precisar) e SÓ DEPOIS remove — assim quem
  // chama pode aguardar isso antes de inserir a resposta de verdade, e as
  // bolinhas nunca ficam "presas" acima da resposta já chegada.
  async function hideDockThinking() {
    if (dockStepTimer) { clearTimeout(dockStepTimer); dockStepTimer = null; }
    if (dockThinkingShownAt) {
      const passou = Date.now() - dockThinkingShownAt;
      if (passou < DOCK_THINKING_MIN_MS) {
        await new Promise((r) => setTimeout(r, DOCK_THINKING_MIN_MS - passou));
      }
    }
    dockChatMessages?.querySelector('#nextDockThinking')?.remove();
    dockThinkingShownAt = 0;
  }

  function showStatus(text) {
    statusText.textContent = text;
    statusRow.classList.remove('hidden');
  }

  // ── Barra "Tempo restante": cor por fase ──────────────────────────
  //   roxo     → mais da metade do período
  //   amarelo  → passou da metade
  //   vermelho → falta menos de 1 hora (pulsa)
  //   cinza    → expirado
  const TIME_COLOR_FULL    = '#7c3aed';
  const TIME_COLOR_HALF    = '#eab308';
  const TIME_COLOR_LOW     = '#ef4444';
  const TIME_COLOR_EXPIRED = '#e2e8f0';

  function computeRemaining(expiresAtIso, activatedAtIso) {
    if (!expiresAtIso) {
      return { text: 'Sem expiração', pct: 100, color: TIME_COLOR_FULL, low: false, expired: false };
    }
    const now = Date.now();
    const expiresAtMs = new Date(expiresAtIso).getTime();
    if (Number.isNaN(expiresAtMs)) {
      return { text: '—', pct: 0, color: TIME_COLOR_EXPIRED, low: false, expired: false };
    }
    const diff = expiresAtMs - now;
    if (diff <= 0) {
      return { text: 'Expirado', pct: 0, color: TIME_COLOR_EXPIRED, low: false, expired: true };
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const text  = `${days}d ${hours}h ${mins}m`;

    // Percentual baseado no período total (ativação → expiração)
    const startMs = activatedAtIso ? new Date(activatedAtIso).getTime() : null;
    let pct = 100;
    if (startMs && expiresAtMs > startMs) {
      pct = Math.max(0, Math.min(100, (diff / (expiresAtMs - startMs)) * 100));
    }

    const low = diff <= 3600000;
    let color = TIME_COLOR_FULL;
    if (low) color = TIME_COLOR_LOW;
    else if (startMs && pct <= 50) color = TIME_COLOR_HALF;

    return { text, pct, color, low, expired: false };
  }

  // Atualiza a barra a cada minuto para o tempo correr em tempo real
  let timeTicker = null;
  function refreshTimeBar() {
    if (!activeProfile) return;
    const r = computeRemaining(activeProfile.expiresAtIso, activeProfile.activatedAtIso);
    remainingDaysEl.textContent = r.text;
    if (progressFillEl) {
      progressFillEl.style.width = `${r.pct}%`;
      progressFillEl.style.background = r.color;
      progressFillEl.classList.toggle('is-low', r.low);
    }
    remainingDaysEl.style.color = r.expired ? '#94a3b8' : r.color;
  }
  function startTimeTicker() {
    if (timeTicker) clearInterval(timeTicker);
    refreshTimeBar();
    timeTicker = setInterval(refreshTimeBar, 60000);
  }

  function profileFromPayload(data, key) {
    const expiresRaw   = data.expires_at || data.expiresAt || null;
    const activatedRaw = data.activated_at || data.activatedAt || null;
    let expiresAt = 'Sem expiração';
    if (expiresRaw) {
      const exp = new Date(expiresRaw);
      if (!Number.isNaN(exp.getTime())) expiresAt = exp.toLocaleDateString('pt-BR');
    }
    const r = computeRemaining(expiresRaw, activatedRaw);
    // Nome do cliente: account_name da licença > prefixo do email >
    // "Licença XXXXX" (últimos 5 da chave) como último recurso.
    // Melhor mostrar algo identificável que um "Usuário" genérico.
    const nameFromKey = key ? `Licença ${String(key).slice(-5).toUpperCase()}` : 'Cliente';
    const userName = data.user_name || data.userName || data.account_name
      || (data.email ? String(data.email).split('@')[0] : null)
      || nameFromKey;

    return {
      licenseKey: key,
      userName,
      plan: data.plan || 'PRO',
      expiresAt,
      expiresAtIso: expiresRaw,
      activatedAtIso: activatedRaw,
      remainingDays: r.text,
      commandsCount: String(data.commands_count ?? data.commandsCount ?? '0'),
      savingsAmount: String(data.savings_amount ?? data.savingsAmount ?? 'R$ 0,00')
    };
  }

  function applyProfileData(profile) {
    activeProfile = profile;
    if (!profile) return;
    userName.textContent = profile.userName || 'Cliente';
    userName.title = profile.userName || '';
    expiresFooterEl.textContent = profile.expiresAt === 'Sem expiração'
      ? 'Sem expiração'
      : `Expira em ${profile.expiresAt}`;
    renderUsageStats();
    userBadge.textContent = String(profile.plan || 'PRO').toUpperCase();
    startTimeTicker();
  }

  // ── Device ID ──────────────────────────────────────────────────────
  // A licença é vinculada a um dispositivo. Geramos um UUID uma única vez
  // e guardamos no storage local — o mesmo device sempre reusa o dele.
  let cachedDeviceId = null;
  async function getDeviceId() {
    if (cachedDeviceId) return cachedDeviceId;
    try {
      const saved = await chrome.storage.local.get(['vertex_device_id']);
      if (saved.vertex_device_id) {
        cachedDeviceId = saved.vertex_device_id;
        return cachedDeviceId;
      }
    } catch (_) {}
    const id = (crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cachedDeviceId = id;
    try { await chrome.storage.local.set({ vertex_device_id: id }); } catch (_) {}
    return id;
  }

  async function validateLicense(key) {
    const cfg = window.VERTEX_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      return { success: false, error: 'Configure SUPABASE_URL e SUPABASE_ANON_KEY no config.js.' };
    }
    const fn = cfg.LICENSE_EDGE_FUNCTION || 'license-validate';
    const deviceId = await getDeviceId();
    try {
      const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${cfg.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ licenseKey: key.trim(), deviceId })
      });
      let body = {};
      try { body = await res.json(); } catch (_) {}
      if (!res.ok || !body.success) {
        return { success: false, error: body.error || `Falha ao validar licença (${res.status}).` };
      }
      return { success: true, data: profileFromPayload(body.license || body.data || {}, key.trim()) };
    } catch (err) {
      return { success: false, error: 'Não foi possível conectar ao servidor de licenças.' };
    }
  }

  function openPanelFlow() {
    if (isLicensed) {
      const abrindo = app.style.display === 'none';
      app.style.display = abrindo ? 'flex' : 'none';
      licenseModal.style.display = 'none';
      if (abrindo) playWelcomeSound();
    } else {
      app.style.display = 'none';
      licenseModal.style.display = 'flex';
      setTimeout(() => licenseInput.focus(), 0);
    }
  }

  // ── Launcher arrastável ────────────────────────────────────────────
  // Funciona com mouse e toque. Distingue arraste de clique: só abre o
  // painel se o dedo/mouse praticamente não se moveu.
  let lDragging = false, lMoved = false, lStartX = 0, lStartY = 0, lOffX = 0, lOffY = 0;
  const DRAG_THRESHOLD = 5; // px

  function clampLauncher(x, y) {
    const w = launcher.offsetWidth || 52;
    const h = launcher.offsetHeight || 52;
    // Margem inferior maior no celular: a Lovable tem uma barra fixa
    // no rodapé (Chat / mic / Publish) e o botão não pode cair em cima dela.
    const bottomGuard = window.innerWidth <= 820 ? 84 : 12;
    return {
      x: Math.max(4, Math.min(window.innerWidth - w - 4, x)),
      y: Math.max(4, Math.min(window.innerHeight - h - bottomGuard, y)),
    };
  }

  function setLauncherPos(x, y) {
    const p = clampLauncher(x, y);
    launcher.style.setProperty('left', p.x + 'px', 'important');
    launcher.style.setProperty('top', p.y + 'px', 'important');
    launcher.style.setProperty('right', 'auto', 'important');
    launcher.style.setProperty('bottom', 'auto', 'important');
    return p;
  }

  function onLauncherDown(e) {
    const pt = e.touches ? e.touches[0] : e;
    const rect = launcher.getBoundingClientRect();
    lDragging = true;
    lMoved = false;
    lStartX = pt.clientX;
    lStartY = pt.clientY;
    lOffX = pt.clientX - rect.left;
    lOffY = pt.clientY - rect.top;
    launcher.style.setProperty('transition', 'none', 'important');
  }

  function onLauncherMove(e) {
    if (!lDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    if (!lMoved) {
      const dist = Math.hypot(pt.clientX - lStartX, pt.clientY - lStartY);
      if (dist < DRAG_THRESHOLD) return; // ainda pode ser um clique
      lMoved = true;
    }
    e.preventDefault();
    setLauncherPos(pt.clientX - lOffX, pt.clientY - lOffY);
  }

  async function onLauncherUp() {
    if (!lDragging) return;
    lDragging = false;
    launcher.style.removeProperty('transition');
    if (lMoved) {
      // salva a posição pra manter entre sessões
      const r = launcher.getBoundingClientRect();
      try { await chrome.storage.local.set({ vertex_launcher_pos: { x: r.left, y: r.top } }); } catch (_) {}
      // impede que o clique dispare depois do arraste
      setTimeout(() => { lMoved = false; }, 0);
    }
  }

  launcher.addEventListener('mousedown', onLauncherDown);
  launcher.addEventListener('touchstart', onLauncherDown, { passive: true });
  document.addEventListener('mousemove', onLauncherMove);
  document.addEventListener('touchmove', onLauncherMove, { passive: false });
  document.addEventListener('mouseup', onLauncherUp);
  document.addEventListener('touchend', onLauncherUp);

  // Restaura a posição salva e mantém dentro da tela ao redimensionar
  chrome.storage.local.get(['vertex_launcher_pos']).then(({ vertex_launcher_pos: p }) => {
    if (p && typeof p.x === 'number') setLauncherPos(p.x, p.y);
  }).catch(() => {});
  window.addEventListener('resize', () => {
    if (launcher.style.left) {
      const r = launcher.getBoundingClientRect();
      setLauncherPos(r.left, r.top);
    }
  });

  launcher.addEventListener('click', (e) => {
    if (lMoved) { e.preventDefault(); e.stopPropagation(); return; } // foi arraste, não clique
    openPanelFlow();
  });
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'toggle-panel') openPanelFlow();
    });
  }

  licenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = licenseInput.value.trim();
    if (!key) return;
    activateBtn.disabled = true;
    activateBtn.querySelector('.btn-text').textContent = 'Validando...';
    activateBtn.querySelector('.btn-spinner').style.display = 'inline-block';
    licenseMsg.style.display = 'none';

    const result = await validateLicense(key);

    activateBtn.disabled = false;
    activateBtn.querySelector('.btn-text').textContent = 'Ativar Licença';
    activateBtn.querySelector('.btn-spinner').style.display = 'none';

    if (!result.success) {
      licenseMsg.textContent = result.error || 'Chave inválida.';
      licenseMsg.className = 'vertex-license-msg error';
      licenseMsg.style.display = 'block';
      return;
    }

    isLicensed = true;
    applyProfileData(result.data);
    await chrome.storage.local.set({ vertex_license_key: key, vertex_profile: result.data });
    silentCheckConnections();
    licenseMsg.textContent = '✓ Licença ativada com sucesso!';
    licenseMsg.className = 'vertex-license-msg success';
    licenseMsg.style.display = 'block';
    setTimeout(() => {
      licenseModal.style.display = 'none';
      licenseMsg.style.display = 'none';
      app.style.display = 'flex';
      playWelcomeSound();
    }, 350);
  });

  licenseCloseBtn.addEventListener('click', () => {
    licenseModal.style.display = 'none';
    licenseMsg.style.display = 'none';
  });

  chrome.storage.local.get(['vertex_license_key', 'vertex_profile']).then((saved) => {
    if (saved.vertex_license_key && saved.vertex_profile) {
      isLicensed = true;
      applyProfileData(saved.vertex_profile);
      silentCheckConnections();
    }
  }).catch(() => {});

  exitBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    isLicensed = false;
    activeProfile = null;
    await chrome.storage.local.remove(['vertex_license_key', 'vertex_profile']);
    app.style.display = 'none';
    licenseInput.value = '';
    licenseModal.style.display = 'flex';
    licenseInput.focus();
  });

  // ── Atalhos rápidos: cada botão manda um pedido pronto pelo mesmo
  // caminho do composer principal (GitHub/Banco, com o elemento
  // selecionado se houver um). Reaproveita toda a lógica que já existe
  // (conexão, seleção de repo, etc.) em vez de duplicar nada.
  const ATALHO_PROMPTS = {
    'Corrigir': 'Corrija os erros, bugs e problemas de funcionamento do elemento selecionado (ou do código mais relevante, se nada estiver selecionado).',
    'Refatorar': 'Refatore este código para deixá-lo mais limpo e organizado, sem mudar o comportamento nem a aparência.',
    'Melhorar': 'Melhore o visual (cores, espaçamento, tipografia) deste elemento, deixando mais bonito e profissional.',
    'Explicar': 'Adicione comentários no código explicando o que este trecho faz, sem alterar o funcionamento.',
    'Otimizar': 'Otimize a performance deste código (evite renderizações e cálculos desnecessários).',
    'Segurança': 'Revise e corrija possíveis problemas de segurança neste código (validação de entrada, exposição de dados sensíveis, etc.).',
    'Copy & Paste': 'Melhore a copy (o texto) deste elemento pra ficar mais persuasiva e clara, mantendo o mesmo sentido.',
    'Responsivo': 'Torne este elemento responsivo, funcionando bem em celular, tablet e desktop.',
  };
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.next-cmd');
    if (!btn) return;
    grid.querySelectorAll('.next-cmd').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const promptPronto = ATALHO_PROMPTS[btn.dataset.cmd];
    if (!promptPronto || !composerInput) return;
    composerInput.value = promptPronto;
    await sendFromComposer();
  });

  root.querySelector('[data-action="close"]').addEventListener('click', () => { app.style.display = 'none'; });

  // ── Painel único que alterna entre "Atalhos rápidos", "Licença",
  // "Histórico" e "Integrações" — só um fica visível por vez ──
  const settingsBtn = root.querySelector('#nextSettingsBtn');
  const detailsToggleBtn = root.querySelector('#nextDetailsToggle');
  const shortcutsCard = root.querySelector('#nextShortcutsCard');
  const dockChat = root.querySelector('#nextDockChat');
  const historyCard = root.querySelector('#nextHistoryCard');
  const historyList = root.querySelector('#nextHistoryList');
  const integrationCard = root.querySelector('#nextIntegrationCard');
  const novidadesCard = root.querySelector('#nextNovidadesCard');
  const novidadesList = root.querySelector('#nextNovidadesList');
  let currentPanel = 'shortcuts'; // 'shortcuts' | 'license' | 'history' | 'integration' | 'novidades'

  function applyPanel() {
    // quando GitHub+Supabase já estão conectados e estamos na tela
    // inicial, o card de Atalhos e o de Status somem e dão lugar ao
    // chat completo da Aurora (igual ao modo ancorado) — o cliente já
    // não precisa mais configurar nada, só mandar comando.
    const chatHome = chatCompletoNaHome();
    if (shortcutsCard) shortcutsCard.style.display = (currentPanel === 'shortcuts' && !chatHome) ? 'flex' : 'none';
    if (statusCard) statusCard.style.display = chatHome ? 'none' : 'flex';
    if (userCard) userCard.style.display = currentPanel === 'license' ? 'flex' : 'none';
    if (historyCard) historyCard.style.display = currentPanel === 'history' ? 'flex' : 'none';
    if (integrationCard) integrationCard.style.display = currentPanel === 'integration' ? 'flex' : 'none';
    if (novidadesCard) novidadesCard.style.display = currentPanel === 'novidades' ? 'flex' : 'none';
    // o chat da Aurora fica sempre visível no modo ancorado, e também na
    // tela inicial do painel compacto assim que tudo estiver conectado
    if (dockChat) dockChat.style.display = (app.classList.contains('docked') || chatHome) ? 'flex' : 'none';
    if (currentPanel === 'history') renderHistory();
  }
  // clicar de novo no mesmo painel volta pros atalhos (usado pelos gatilhos manuais)
  function showPanel(name) {
    currentPanel = (currentPanel === name) ? 'shortcuts' : name;
    applyPanel();
  }
  // sempre força o painel pedido, sem alternar — usado pelo fluxo de
  // conexão do GitHub/Supabase, que precisa manter a tela aberta
  // enquanto avança de etapa em etapa
  function forceShowPanel(name) {
    currentPanel = name;
    applyPanel();
  }
  function toggleUserDetails() { showPanel('license'); loadAuroraPreferences(); }
  settingsBtn?.addEventListener('click', toggleUserDetails);

  // ── Preferência permanente da Aurora ────────────────────────────────
  const auroraPrefsInput = root.querySelector('#nextAuroraPrefs');
  const prefsSaveBtn = root.querySelector('#nextPrefsSaveBtn');
  const prefsSavedLabel = root.querySelector('#nextPrefsSaved');
  let auroraPrefsCarregada = false;
  async function loadAuroraPreferences() {
    if (auroraPrefsCarregada || !auroraPrefsInput) return;
    try {
      const auth = await ghAuth();
      const res = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION', 'github-ai-edit'), {
        method: 'POST', headers: cfgHeaders(),
        body: JSON.stringify({ ...auth, action: 'get_preferences' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        auroraPrefsInput.value = data.preferences || '';
        auroraPrefsCarregada = true;
      }
    } catch (_e) { /* silencioso — não trava a tela de licença por isso */ }
  }
  prefsSaveBtn?.addEventListener('click', async () => {
    if (!auroraPrefsInput) return;
    prefsSaveBtn.disabled = true;
    prefsSaveBtn.textContent = 'Salvando...';
    try {
      const auth = await ghAuth();
      const res = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION', 'github-ai-edit'), {
        method: 'POST', headers: cfgHeaders(),
        body: JSON.stringify({ ...auth, action: 'set_preferences', preferences: auroraPrefsInput.value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && prefsSavedLabel) {
        prefsSavedLabel.style.display = '';
        setTimeout(() => { prefsSavedLabel.style.display = 'none'; }, 2500);
      }
    } catch (_e) { /* silencioso */ }
    finally {
      prefsSaveBtn.disabled = false;
      prefsSaveBtn.textContent = 'Salvar';
    }
  });
  detailsToggleBtn?.addEventListener('click', toggleUserDetails);

  // ── BYOK: cliente usa a própria chave de API ────────────────────────
  // Guardado só localmente (chrome.storage.local) — a chave do cliente
  // nunca fica salva no nosso banco, só passa pelo backend na hora da
  // chamada (e nem ali fica persistida).
  const BYOK_KEY = 'vertex_byok';
  const byokToggle = root.querySelector('#nextByokToggle');
  const byokFields = root.querySelector('#nextByokFields');
  const byokKeyInput = root.querySelector('#nextByokKey');
  const byokModelInput = root.querySelector('#nextByokModel');
  const byokBaseUrlInput = root.querySelector('#nextByokBaseUrl');
  const byokSaveBtn = root.querySelector('#nextByokSaveBtn');
  const byokSavedLabel = root.querySelector('#nextByokSaved');
  let byokConfig = { ativo: false, key: '', model: '', baseUrl: '' };

  chrome.storage.local.get(BYOK_KEY).then((r) => {
    const salvo = r?.[BYOK_KEY];
    if (salvo && typeof salvo === 'object') {
      byokConfig = { ativo: !!salvo.ativo, key: salvo.key || '', model: salvo.model || '', baseUrl: salvo.baseUrl || '' };
      if (byokToggle) byokToggle.checked = byokConfig.ativo;
      if (byokFields) byokFields.style.display = byokConfig.ativo ? '' : 'none';
      if (byokKeyInput) byokKeyInput.value = byokConfig.key;
      if (byokModelInput) byokModelInput.value = byokConfig.model;
      if (byokBaseUrlInput) byokBaseUrlInput.value = byokConfig.baseUrl;
    }
  }).catch(() => {});

  byokToggle?.addEventListener('change', (e) => {
    const ativo = !!e.target.checked;
    if (byokFields) byokFields.style.display = ativo ? '' : 'none';
    byokConfig = { ...byokConfig, ativo };
    chrome.storage.local.set({ [BYOK_KEY]: byokConfig }).catch(() => {});
  });

  byokSaveBtn?.addEventListener('click', () => {
    byokConfig = {
      ativo: !!byokToggle?.checked,
      key: byokKeyInput?.value.trim() || '',
      model: byokModelInput?.value.trim() || '',
      baseUrl: byokBaseUrlInput?.value.trim() || '',
    };
    chrome.storage.local.set({ [BYOK_KEY]: byokConfig }).catch(() => {});
    if (byokSavedLabel) {
      byokSavedLabel.style.display = '';
      setTimeout(() => { byokSavedLabel.style.display = 'none'; }, 2500);
    }
  });

  // Monta o bloco de credenciais BYOK pra incluir no corpo do pedido —
  // só manda algo se estiver ativo E tiver chave preenchida.
  function montarByokBody() {
    if (!byokConfig.ativo || !byokConfig.key) return {};
    return {
      iaMode: 'user',
      ia_key: byokConfig.key,
      ia_model: byokConfig.model || undefined,
      ia_base_url: byokConfig.baseUrl || undefined,
    };
  }

  root.querySelector('#nextHistoryBackBtn')?.addEventListener('click', () => showPanel('shortcuts'));
  root.querySelector('#nextIntegrationBackBtn')?.addEventListener('click', () => showPanel('shortcuts'));
  root.querySelector('#nextNovidadesBackBtn')?.addEventListener('click', () => showPanel('shortcuts'));

  // ── Novidades: espelha o que é publicado em vertexpro.site/novidades.
  // Guardado na mesma tabela do Supabase (next-pro), lida direto com a
  // chave anônima — é só changelog público, não precisa de licença.
  const bellBtn = root.querySelector('#nextBellBtn');
  const bellDot = root.querySelector('#nextBellDot');
  let novidadesCache = null;

  function formatNovidadeData(iso) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) { return ''; }
  }

  async function fetchNovidades() {
    const cfg = window.VERTEX_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return [];
    try {
      const res = await fetch(
        `${cfg.SUPABASE_URL}/rest/v1/novidades?select=id,titulo,descricao,created_at&order=created_at.desc&limit=15`,
        { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}` } }
      );
      if (!res.ok) return [];
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  }

  function renderNovidades(lista) {
    if (!novidadesList) return;
    if (!lista.length) {
      novidadesList.innerHTML = '<div class="next-history-empty">Nenhuma novidade publicada ainda.</div>';
      return;
    }
    novidadesList.innerHTML = lista.map(n => `
      <div class="next-novidades-item">
        <div class="next-novidades-title">${(n.titulo || '').replace(/</g, '&lt;')}</div>
        <div class="next-novidades-desc">${(n.descricao || '').replace(/</g, '&lt;')}</div>
        <div class="next-novidades-date">${formatNovidadeData(n.created_at)}</div>
      </div>`).join('');
  }

  // Checa em segundo plano, sem abrir nada — só pra saber se acende a
  // bolinha vermelha no sino (roda ao abrir o painel e também periodicamente).
  async function checkNovidadesBadge() {
    const lista = await fetchNovidades();
    if (!lista.length) return;
    novidadesCache = lista;
    const maisRecente = lista[0];
    const saved = await chrome.storage.local.get(['vertex_last_seen_novidade']).catch(() => ({}));
    const jaViu = saved.vertex_last_seen_novidade === maisRecente.id;
    if (bellDot) bellDot.style.display = jaViu ? 'none' : 'block';
  }

  bellBtn?.addEventListener('click', async () => {
    if (!isLicensed) { openPanelFlow(); return; }
    showPanel('novidades');
    novidadesList.innerHTML = '<div class="next-history-empty">Carregando...</div>';
    const lista = novidadesCache || await fetchNovidades();
    novidadesCache = lista;
    renderNovidades(lista);
    // marca como visto e apaga a bolinha
    if (lista.length) {
      chrome.storage.local.set({ vertex_last_seen_novidade: lista[0].id }).catch(() => {});
    }
    if (bellDot) bellDot.style.display = 'none';
  });

  // primeira checagem ao carregar, e depois a cada 10 minutos (o painel
  // costuma ficar aberto na aba o dia inteiro, então vale repetir)
  checkNovidadesBadge();
  setInterval(checkNovidadesBadge, 10 * 60 * 1000);

  // ── Histórico de comandos enviados pela extensão (persistido) ─────
  let commandHistory = [];
  const SAVINGS_PER_COMMAND = 2;
  const DAILY_PROMPT_LIMIT = 100;
  const DAILY_LIMIT_MESSAGE = 'limite de prompt diário batidos';
  let usageByLicense = {};
  const usageReady = chrome.storage.local.get('vertex_usage_stats').then((saved) => {
    const stats = saved.vertex_usage_stats;
    if (stats && typeof stats === 'object' && !Array.isArray(stats)) usageByLicense = stats;
    renderUsageStats();
  }).catch(() => {});

  function renderUsageStats() {
    if (!activeProfile) return;
    const key = activeProfile.licenseKey;
    const serverCount = Math.max(0, Number.parseInt(activeProfile.commandsCount, 10) || 0);
    const localCount = Math.max(0, Number.parseInt(usageByLicense[key]?.count, 10) || 0);
    const count = Math.max(serverCount, localCount);
    commandsCountEl.textContent = String(count);
    savingsAmountEl.textContent = `R$ ${(count * SAVINGS_PER_COMMAND).toFixed(2).replace('.', ',')}`;
  }

  function usageDay() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type) => parts.find((p) => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  function dailyUsage() {
    const state = usageByLicense[activeProfile?.licenseKey];
    return state?.day === usageDay() ? Math.max(0, Number.parseInt(state.dailyCount, 10) || 0) : 0;
  }

  async function dailyLimitReached() {
    await usageReady;
    return dailyUsage() >= DAILY_PROMPT_LIMIT;
  }

  function showDailyLimit() {
    ghShowMsg(DAILY_LIMIT_MESSAGE, true);
    dbShowMsg(DAILY_LIMIT_MESSAGE, true);
    if (isDocked()) { hideDockThinking(); addDockChatMessage('ai', DAILY_LIMIT_MESSAGE, 'erro'); }
    composerNotice(DAILY_LIMIT_MESSAGE);
  }

  async function markDailyLimit() {
    await usageReady;
    const key = activeProfile?.licenseKey;
    if (key) {
      usageByLicense[key] = { ...usageByLicense[key], day: usageDay(), dailyCount: DAILY_PROMPT_LIMIT };
      chrome.storage.local.set({ vertex_usage_stats: usageByLicense }).catch(() => {});
    }
    showDailyLimit();
  }

  function recordAiCommand(mode, text, serverDailyUsed, commandId, snapshot) {
    if (!text) return Promise.resolve();
    return usageReady.then(() => {
      const key = activeProfile?.licenseKey;
      if (!key) return;
      const seen = usageByLicense[key]?.commandIds || [];
      if (commandId && seen.includes(commandId)) return;
      logCommand(mode,text);
      const baseline = Math.max(0, Number.parseInt(activeProfile.commandsCount, 10) || 0);
      const current = Math.max(0, Number.parseInt(usageByLicense[key]?.count, 10) || 0);
      const day = usageDay();
      const daily = dailyUsage();
      const newDaily = Math.min(DAILY_PROMPT_LIMIT, snapshot ? Math.max(daily, snapshot.day === day ? Number(serverDailyUsed) || 0 : 0) : Math.max(daily + 1, Number(serverDailyUsed) || 0));
      usageByLicense[key] = { count: snapshot ? Math.max(baseline,current,Number.isFinite(snapshot.baseline) ? snapshot.baseline+1 : 0) : Math.max(baseline, current)+1, day, dailyCount: newDaily,commandIds:commandId ? [...seen,commandId].slice(-200) : seen };
      renderUsageStats();
      chrome.storage.local.set({ vertex_usage_stats: usageByLicense }).catch(() => {});
      if (newDaily === DAILY_PROMPT_LIMIT && daily < DAILY_PROMPT_LIMIT) showDailyLimit();
    });
  }
  function formatHistoryTime(ts) {
    try {
      return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }
  function renderHistory() {
    if (!historyList) return;
    if (!commandHistory.length) {
      historyList.innerHTML = '<div class="next-history-empty">Nenhum comando enviado ainda.</div>';
      return;
    }
    historyList.innerHTML = commandHistory.map(h => {
      const icon = h.mode === 'github'
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.04-.01-1.89-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.29 9.29 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>'
        : h.mode === 'lovable'
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21s-6.7-4.35-9.3-8.1C.9 10.1 1.4 6.6 4.2 5c2.2-1.25 4.9-.6 6.3 1.3.4.5.7 1.1.9 1.7.2-.6.5-1.2.9-1.7 1.4-1.9 4.1-2.55 6.3-1.3 2.8 1.6 3.3 5.1 1.5 7.9C18.7 16.65 12 21 12 21z"/></svg>'
        : '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>';
      const texto = (h.text || '').replace(/</g, '&lt;');
      return `<div class="next-history-item">
        <span class="next-history-icon">${icon}</span>
        <div class="next-history-body">
          <div class="next-history-text">${texto}</div>
          <div class="next-history-time">${formatHistoryTime(h.time)}</div>
        </div>
      </div>`;
    }).join('');
  }
  function logCommand(mode, text) {
    if (!text) return;
    commandHistory.unshift({ mode, text, time: Date.now() });
    commandHistory = commandHistory.slice(0, 50);
    chrome.storage.local.set({ vertex_command_history: commandHistory }).catch(() => {});
    if (currentPanel === 'history') renderHistory();
  }
  chrome.storage.local.get(['vertex_command_history']).then((saved) => {
    if (Array.isArray(saved.vertex_command_history)) {
      commandHistory = saved.vertex_command_history;
      if (currentPanel === 'history') renderHistory();
    }
  }).catch(() => {});

  // ── Popovers genéricos (menu "..." e menu "Modelos") ──────────────
  function setupPopover(triggerEl, popoverEl) {
    if (!triggerEl || !popoverEl) return;
    triggerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popoverEl.style.display !== 'none';
      root.querySelectorAll('.next-popover').forEach(p => { p.style.display = 'none'; });
      popoverEl.style.display = isOpen ? 'none' : 'flex';
    });
    popoverEl.addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('click', () => {
    root.querySelectorAll('.next-popover').forEach(p => { p.style.display = 'none'; });
  });
  setupPopover(root.querySelector('#nextMoreBtn'), root.querySelector('#nextMorePopover'));
  setupPopover(root.querySelector('#nextModelsBtn'), root.querySelector('#nextModelsPopover'));
  setupPopover(root.querySelector('#nextEngineBtn'), root.querySelector('#nextEnginePopover'));

  // Opções visuais preservadas; as Edge Functions usam DeepSeek para todas.
  let selectedEngine = 'deepseek-flash';
  const engineLabel = root.querySelector('#nextEngineLabel');
  const engineDot = root.querySelector('#nextEngineDot');
  const enginePopover = root.querySelector('#nextEnginePopover');
  const ENGINE_COLORS = { 'gpt-5': '#10a37f', 'opus-5': '#d97757', 'gemini': '#4285f4', 'deepseek-flash': '#7c5cff' };
  enginePopover?.querySelectorAll('[data-engine]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEngine = btn.dataset.engine;
      if (engineLabel) engineLabel.textContent = btn.dataset.engineLabel;
      if (engineDot) engineDot.style.background = ENGINE_COLORS[selectedEngine] || 'var(--green)';
      enginePopover.style.display = 'none';
    });
  });

  // ── Menu "Modelos": escolher GitHub ou Banco de dados ativa o fluxo.
  // O Supabase sempre abre dentro do painel; o GitHub pode abrir dentro
  // do painel OU na barra clássica que sobrepõe o chat da Lovable,
  // conforme a escolha em "GitHub abre em" ────────────────────────────
  const modelsLabel = root.querySelector('#nextModelsLabel');
  const modelsPopover = root.querySelector('#nextModelsPopover');
  let activeModel = null; // 'github' | 'db' | null — usado pelo composer principal
  let ghChatMode = 'extension'; // 'extension' | 'overlay' — só afeta o GitHub

  const ghChatModeOpts = root.querySelectorAll('[data-ghmode]');
  ghChatModeOpts.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghChatMode = btn.dataset.ghmode;
      ghChatModeOpts.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  function modelLabelFor(m) {
    if (m === 'github') return 'GitHub';
    if (m === 'lovable') return 'Lovable direto';
    return 'Banco de dados';
  }

  modelsPopover?.querySelectorAll('[data-model]').forEach(btn => {
    btn.addEventListener('click', async () => {
      activeModel = btn.dataset.model;
      if (modelsLabel) modelsLabel.textContent = modelLabelFor(activeModel);
      modelsPopover.style.display = 'none';
      // Abre o fluxo — Supabase sempre dentro do card; GitHub dentro do
      // card ou flutuando sobre o chat, conforme o modo escolhido; Lovable
      // direto não precisa de nenhuma configuração, já usa a aba atual.
      if (activeModel === 'github') await ghOpen();
      else if (activeModel === 'lovable') { /* nada a abrir — pronto pra usar */ }
      else await dbOpen();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // FLUXO GITHUB
  // Reutiliza as mesmas edge functions já em produção:
  //   github-oauth  → conectar/desconectar conta
  //   github-repos  → listar e selecionar repositório
  //   github-ai-edit → gerar alteração + commit
  // ══════════════════════════════════════════════════════════════════
  const ghBar          = root.querySelector('#vtxGhBar');
  const ghStateDisc    = root.querySelector('#vtxGhStateDisconnected');
  const ghStateRepos   = root.querySelector('#vtxGhStateRepos');
  const ghStateReady   = root.querySelector('#vtxGhStateReady');
  const ghConnectBtn   = root.querySelector('#vtxGhConnectBtn');
  const ghLoginEl      = root.querySelector('#vtxGhLogin');
  const ghRepoFilter   = root.querySelector('#vtxGhRepoFilter');
  const ghRepoList     = root.querySelector('#vtxGhRepoList');
  const ghRepoName     = root.querySelector('#vtxGhRepoName');
  const ghPrompt       = root.querySelector('#vtxGhPrompt');
  const ghSendBtn      = root.querySelector('#vtxGhSendBtn');
  const ghMsg          = root.querySelector('#vtxGhMsg');
  const ghResult       = root.querySelector('#vtxGhResult');
  [ghMsg, ghResult].filter(Boolean).forEach((element) => copyObserver.observe(element, { childList: true, subtree: true }));
  const ghSwitchBtn    = root.querySelector('#vtxGhSwitchBtn');
  const ghChangeRepoBtn= root.querySelector('#vtxGhChangeRepoBtn');
  const ghAutoHint     = root.querySelector('#vtxGhAutoHint');
  const ghBtnToolbar   = root.querySelector('[title="GitHub"]');

  let ghAllRepos = [];
  let ghActiveRepo = null;
  let repoResolvedProjectKey = null;
  let currentProjectKey = getProjectContextKey();
  let projectCheckEpoch = 0;
  let activeEdit = null;

  function cancelActiveEdit(detach = false) {
    const op = activeEdit;
    if (!op || op.phase === 'publishing' || op.canceled) return;
    op.canceled = true;
    if (op.jobTicket && !detach) {
      cancelServerJob(op.jobTicket).catch(()=>composerNotice('Não consegui confirmar o cancelamento no servidor. Consulte o comando pelo ID; ele não publica commits sozinho.'));
    }
    op.abort.abort();
    op.cancelWait?.();
    if (detach) {if(isDocked())hideDockThinking();setComposerSendState('idle');return;}
    if (op.fromComposer && !composerInput.value.trim()) composerInput.value = op.prompt;
    if (op.statusBubble) op.statusBubble.textContent = 'Publicação cancelada. Nenhum commit foi publicado.';
    ghShowMsg('Publicação cancelada. Nenhum commit foi publicado.');
    if (isDocked() && !op.statusBubble) addDockChatMessage('ai', 'Publicação cancelada. Nenhum commit foi publicado.');
    if (isDocked()) hideDockThinking();
    setComposerSendState('idle');
  }

  function getProjectContextKey() {
    return getLovableProjectId() || `${location.pathname}${location.search}`;
  }

  function checkProjectChange() {
    const nextKey = getProjectContextKey();
    if (nextKey === currentProjectKey) return;
    cancelActiveEdit(true);
    currentProjectKey = nextKey;
    auroraHistory = [];
    pendingClarification = null;
    loadedMemoryScope=null;currentUndo=null;undoConfirm=false;memoryIndicator();renderUndo();
    projectCheckEpoch++;
    ghActiveRepo = null;
    repoResolvedProjectKey = null;
    ghAllRepos = [];
    ghRepoName.textContent = '';
    dbActiveRef = null; dbResolvedProjectKey = null; dbProjectName.textContent = '';
    dbPendingSql = null; dbPendingContext = null; dbPreview.style.display = 'none';
    if (ghBar?.style.display !== 'none') ghBar.style.display = 'none';
    refreshStatusCard();
    if (isLicensed) silentCheckConnections();
  }

  function cfgUrl(fnKey, fallback) {
    const cfg = window.VERTEX_CONFIG || {};
    return `${cfg.SUPABASE_URL}/functions/v1/${cfg[fnKey] || fallback}`;
  }
  function cfgHeaders() {
    const cfg = window.VERTEX_CONFIG || {};
    return {
      'Content-Type': 'application/json',
      'apikey': cfg.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${cfg.SUPABASE_ANON_KEY}`
    };
  }
  async function readEditedPage(repo, projectKey) {
    const scope = await getMemoryScope(repo,projectKey);
    const saved = await projectMemoryStore.read(scope).catch(()=>({}));
    return typeof saved.page === 'string' ? saved.page : null;
  }
  function inferEditedPage(files) {
    const pages = (files || []).filter(path=>/(?:^|\/)(?:pages|routes)\/[^/]+\.(?:tsx|jsx|ts|js)$/i.test(path));
    const components = (files || []).filter(path=>/(?:^|\/)components\/(?!ui\/)[^/]+\.(?:tsx|jsx|ts|js)$/i.test(path));
    return pages.length === 1 ? pages[0] : pages.length > 1 ? null : components.length === 1 ? components[0] : undefined;
  }
  function hasNamedPage(prompt) {
    const p = prompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return /\b(auth|login|cadastro|dashboard|home|inicio)\b/.test(p) ||
      /\b(?:pagina|tela|aba|rota)\s+(?:(?:de|do|da)\s+)?(?![.,!?]|$)[a-z][\w-]+/.test(p);
  }
  function needsPageClarification(prompt) {
    const p = prompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return /^(?:por favor[, ]*)?(?:troqu|substitu|alter|mud|corrij|remov|retir|adicione|coloque)/.test(p) &&
      /\b(texto|frase|titulo|cor|fundo|logo|imagem|icone|botao|layout|campo)\b/.test(p) &&
      !hasNamedPage(prompt);
  }
  async function ghAuth() {
    const saved = await chrome.storage.local.get(['vertex_license_key']);
    return { licenseKey: saved.vertex_license_key, deviceId: await getDeviceId() };
  }

  // Reforça a detecção de "voltei da autorização" sem depender só do
  // postMessage (que costuma falhar no celular quando a aba fica em
  // segundo plano ou a autorização abre como aba nova em vez de popup).
  // Dispara onReturn() quando a aba de autorização fecha OU quando o
  // usuário volta a focar/ver a aba do Lovable — o que vier primeiro.
  function watchOAuthReturn(popupWin, onReturn) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      onReturn();
    };
    const cleanup = () => {
      clearInterval(closedPoll);
      clearTimeout(giveUp);
      clearTimeout(armDelay);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
    const closedPoll = popupWin ? setInterval(() => {
      if (popupWin.closed) finish();
    }, 700) : null;
    const onFocus = () => finish();
    const onVisible = () => { if (document.visibilityState === 'visible') finish(); };
    // Só liga o listener de foco/visibilidade depois de um instante —
    // evita disparar na hora por causa do próprio clique/abertura da aba.
    const armDelay = setTimeout(() => {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisible);
    }, 1200);
    // Não fica escutando pra sempre — desiste depois de 5 minutos.
    const giveUp = setTimeout(cleanup, 5 * 60 * 1000);
    return cleanup;
  }

  function ghShowMsg(text, isError) {
    if (!ghMsg) return;
    if (!text) { ghMsg.style.display = 'none'; ghMsg.textContent = ''; return; }
    ghMsg.textContent = text;
    ghMsg.className = isError ? 'vtx-gh-msg error' : 'vtx-gh-msg';
    ghMsg.style.display = 'block';
  }

  function ghShowState(name) {
    if (ghChatMode === 'overlay') {
      // modo clássico: flutua por cima do chat da Lovable, sem mexer
      // no painel principal (o cliente pode usar os dois ao mesmo tempo)
      if (ghBar.parentElement !== root) root.appendChild(ghBar);
      ghBar.classList.remove('inline');
      ghBar.style.display = 'flex';
      ghStateDisc.style.display  = name === 'disconnected' ? 'flex' : 'none';
      ghStateRepos.style.display = name === 'repos'        ? 'flex' : 'none';
      ghStateReady.style.display = name === 'ready'        ? 'flex' : 'none';
      encaixarBarraSobreChat(ghBar);
      requestAnimationFrame(() => requestAnimationFrame(() => encaixarBarraSobreChat(ghBar)));
      return;
    }
    // modo "chat da extensão" (padrão): mostra dentro do card de integrações
    if (integrationMount && ghBar.parentElement !== integrationMount) integrationMount.appendChild(ghBar);
    ghBar.classList.add('inline');
    forceShowPanel('integration');
    if (dbBar) dbBar.style.display = 'none';
    ghBar.style.display = 'flex';
    ghStateDisc.style.display  = name === 'disconnected' ? 'flex' : 'none';
    ghStateRepos.style.display = name === 'repos'        ? 'flex' : 'none';
    ghStateReady.style.display = name === 'ready'        ? 'flex' : 'none';
  }

  function ghCloseBar() {
    ghBar.style.display = 'none';
    ghShowMsg('');
    if (ghChatMode !== 'overlay') showPanel('shortcuts');
  }
  root.querySelectorAll('[data-gh-close]').forEach(b => b.addEventListener('click', ghCloseBar));

  // Reposiciona a barra flutuante do GitHub exatamente sobre o chat da
  // Lovable (só usado quando o modo "chat sobreposto" está ativo).
  function encaixarBarraSobreChat(barra) {
    if (!barra || barra.style.display === 'none') return;
    const c = acharComposerLovable();
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width < 80 || r.height < 20) return;
    barra.style.position = 'fixed';
    barra.style.left = `${r.left}px`;
    barra.style.top = 'auto';
    barra.style.bottom = `${Math.max(4, window.innerHeight - r.bottom)}px`;
    barra.style.width = `${r.width}px`;
    barra.style.marginLeft = '0';
    barra.style.maxWidth = 'none';
  }
  function reencaixarGhBarSeNecessario() {
    if (ghChatMode === 'overlay' && ghBar && ghBar.style.display !== 'none') {
      encaixarBarraSobreChat(ghBar);
    }
  }
  window.addEventListener('scroll', reencaixarGhBarSeNecessario, true);
  window.addEventListener('resize', reencaixarGhBarSeNecessario);
  try {
    const ghResizeObserver = new ResizeObserver(() => reencaixarGhBarSeNecessario());
    const alvoInicial = acharComposerLovable();
    if (alvoInicial) ghResizeObserver.observe(alvoInicial);
    let ghObsTentativas = 0;
    const ghProcurarChat = setInterval(() => {
      const c = acharComposerLovable();
      if (c) { try { ghResizeObserver.observe(c); } catch (_) {} clearInterval(ghProcurarChat); }
      if (++ghObsTentativas > 20) clearInterval(ghProcurarChat);
    }, 500);
  } catch (_) { /* navegador sem ResizeObserver: os listeners acima bastam */ }

  // ── Detecção automática do repositório ────────────────────────────
  // Não existe um mapeamento oficial entre o UUID do projeto Lovable e o
  // nome do repositório no GitHub. O que dá pra fazer com segurança é
  // pegar o NOME do projeto que a Lovable mostra na tela e casar com o
  // nome do repositório. Quando bate com confiança, seleciona sozinho.
  // ── Detecção do repositório ───────────────────────────────────────
  // Estratégia em duas camadas:
  //  1) LER da própria Lovable — o projeto já é vinculado ao GitHub lá,
  //     então o nome "dono/repo" aparece no DOM (link do GitHub, menu de
  //     configurações, etc). É a fonte confiável.
  //  2) Só se não achar nada, cai no palpite por similaridade de nome.

  // Aceita "dono/repo" com as regras reais de nome do GitHub
  const REPO_RE = /\b([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]{1,100})\b/;

  // Coisas que parecem "a/b" mas não são repositório
  const NOT_REPO = new Set([
    'lovable.dev','lovable.app','github.com','www.github.com',
    'application/json','text/html','image/png','image/jpeg',
  ]);

  function looksLikeRepo(owner, name) {
    const full = `${owner}/${name}`.toLowerCase();
    if (NOT_REPO.has(full)) return false;
    if (owner.length < 1 || name.length < 1) return false;
    if (/^\d+$/.test(owner) && /^\d+$/.test(name)) return false; // "1/2"
    if (name.endsWith('.js') || name.endsWith('.css') || name.endsWith('.png')) return false;
    return true;
  }

  // Procura o repositório vinculado, lendo o que a Lovable já mostra
  function detectRepoFromLovable() {
    // (a) Qualquer link direto pro GitHub — jeito mais confiável
    const links = Array.from(document.querySelectorAll('a[href*="github.com/"]'));
    for (const a of links) {
      if (a.closest('#next-widget-root')) continue;
      const href = a.getAttribute('href') || '';
      const m = href.match(/github\.com\/([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+)/);
      if (m && looksLikeRepo(m[1], m[2])) {
        return { full: `${m[1]}/${m[2].replace(/\.git$/, '')}`, source: 'link do GitHub' };
      }
    }

    // (b) Texto visível no formato dono/repo, em elementos pequenos
    //     (badge, item de menu, cabeçalho) — evita varrer a página toda
    const candidates = Array.from(document.querySelectorAll(
      '[class*="github" i], [data-testid*="github" i], [aria-label*="github" i], ' +
      '[class*="repo" i], [data-testid*="repo" i], header *, [role="menu"] *'
    ));
    for (const el of candidates) {
      if (el.closest('#next-widget-root')) continue;  // ignora a nossa UI
      const txt = (el.textContent || '').trim();
      if (!txt || txt.length > 80) continue;          // blocos grandes: pula
      const m = txt.match(REPO_RE);
      if (m && looksLikeRepo(m[1], m[2])) {
        return { full: `${m[1]}/${m[2]}`, source: 'interface da Lovable' };
      }
    }

    // (c) Atributos que costumam guardar a URL/nome do repositório
    //     mesmo quando ele não está escrito na tela
    const attrEls = Array.from(document.querySelectorAll(
      '[title],[aria-label],[data-repo],[data-repository],[data-github-repo]'
    ));
    for (const el of attrEls) {
      if (el.closest('#next-widget-root')) continue;
      for (const attr of ['data-repo', 'data-repository', 'data-github-repo', 'title', 'aria-label']) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        const m2 = v.match(/github\.com\/([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+)/);
        if (m2 && looksLikeRepo(m2[1], m2[2])) {
          return { full: `${m2[1]}/${m2[2].replace(/\.git$/, '')}`, source: `atributo ${attr}` };
        }
        // formato "dono/repo" puro, só em atributos dedicados a repo
        if (attr.startsWith('data-')) {
          const d = v.trim().match(/^([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+)$/);
          if (d && looksLikeRepo(d[1], d[2])) {
            return { full: `${d[1]}/${d[2]}`, source: `atributo ${attr}` };
          }
        }
      }
    }

    return null;
  }

  function getLovableProjectName(repos = []) {
    const generic = /^(projects?|lovable|dashboard|home|workspace|settings|configurações?)$/i;
    const names = [];
    const addName = (value) => {
      const t = String(value || '').trim();
      if (t.length > 1 && t.length < 80 && !generic.test(t) && !names.includes(t)) names.push(t);
    };
    const sels = [
      '[data-testid="project-name"]', '[data-testid="project-title"]',
      '[data-testid*="project-name" i]', '.project-name',
      'header h1', 'header [class*="title"]',
    ];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && !el.closest('#next-widget-root')) addName(el.textContent);
    }
    // No layout compacto, o nome do projeto fica em um botão no topo,
    // enquanto o título da aba pode ser apenas "Projects".
    const topButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.top >= 0 && rect.top < 180;
      });
    for (const el of topButtons) {
      if (el.closest('#next-widget-root')) continue;
      const t = (el.textContent || '').trim();
      if (/[a-zA-ZÀ-ÿ]/.test(t)) addName(t);
    }
    const fromTitle = (document.title || '').replace(/\s*[-–|]\s*Lovable.*$/i, '').trim();
    addName(fromTitle);
    // Entre vários botões no topo, privilegia o que corresponde
    // exatamente a um repositório visível na conta conectada.
    return names.find(name => findMatchingRepo(repos, name)) || names[0] || null;
  }

  // ── Detecção do repositório vinculado no próprio Lovable ──────────
  // O Lovable guarda o repositório conectado em
  //   /projects/{id}/settings/git/github
  // Como essa página é do MESMO domínio (lovable.dev), a extensão pode
  // lê-la sem esbarrar em cross-origin. É bem mais confiável que tentar
  // adivinhar pelo nome do projeto.

  function getLovableProjectId() {
    const m = location.pathname.match(/\/projects\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }

  // Procura no HTML/DOM qualquer referência a github.com/dono/repo
  function extractRepoFromText(text) {
    if (!text) return null;
    // github.com/owner/repo — ignora caminhos internos do GitHub
    const re = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;
    const ignore = new Set(['orgs','settings','apps','features','about','pricing','login','signup','marketplace','topics','collections','sponsors','site']);
    let m;
    while ((m = re.exec(text)) !== null) {
      const owner = m[1];
      let repo = m[2].replace(/\.git$/, '').replace(/["'<>)\]},;]+$/, '');
      if (ignore.has(owner.toLowerCase())) continue;
      if (!repo || repo.length < 1) continue;
      return `${owner}/${repo}`;
    }
    return null;
  }

  // 2) Abre a página de settings do Git num iframe oculto (mesma origem)
  //    e lê o repositório de lá depois que o React renderizar.
  function findRepoViaSettingsPage(projectId, timeoutMs = 9000) {
    return new Promise((resolve) => {
      const url = `${location.origin}/projects/${projectId}/settings/git/github`;
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;width:900px;height:700px;left:-10000px;top:0;opacity:0;pointer-events:none;border:0;';
      let done = false;

      const finish = (val) => {
        if (done) return;
        done = true;
        clearInterval(poll);
        clearTimeout(killer);
        try { frame.remove(); } catch (_) {}
        resolve(val);
      };

      // O conteúdo é renderizado pelo React, então não basta o onload:
      // ficamos verificando o DOM do iframe até achar o repositório.
      const poll = setInterval(() => {
        try {
          const doc = frame.contentDocument;
          if (!doc || !doc.body) return;
          const link = doc.querySelector('a[href*="github.com/"]');
          if (link) {
            const r = extractRepoFromText(link.getAttribute('href'));
            if (r) return finish(r);
          }
          // A Lovable também mostra as URLs de clone em campos de copiar.
          const fields = Array.from(doc.querySelectorAll('input[value], textarea'))
            .map(el => el.value || el.getAttribute('value') || '').join('\n');
          const r2 = extractRepoFromText(fields) || extractRepoFromText(doc.body.innerText || '');
          if (r2) return finish(r2);
        } catch (_) {
          // se por algum motivo virar cross-origin, desiste em silêncio
          finish(null);
        }
      }, 400);

      const killer = setTimeout(() => finish(null), timeoutMs);
      frame.src = url;
      document.body.appendChild(frame);
    });
  }

  // Orquestra: página atual → settings → (fallback) nome do projeto
  function normalizeName(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira acentos
      .replace(/[^a-z0-9]+/g, '');                       // só letras+números
  }

  // Seleciona automaticamente só quando o nome do projeto bate
  // exatamente com um único repositório. Nomes parecidos ficam para
  // escolha manual, para evitar editar o projeto errado.
  function findMatchingRepo(repos, projectName) {
    if (!projectName || !repos?.length) return null;
    const target = normalizeName(projectName);
    if (target.length < 3) return null;
    const matches = repos.filter(r =>
      normalizeName(String(r.full_name || '').split('/').pop()) === target
    );
    return matches.length === 1 ? matches[0] : null;
  }

  async function findCurrentProjectRepo(repos) {
    let detected = detectRepoFromLovable();
    if (!detected) {
      const pid = getLovableProjectId();
      if (pid) {
        const fromSettings = await findRepoViaSettingsPage(pid);
        if (fromSettings) detected = { full: fromSettings, source: 'settings do Lovable' };
      }
    }
    const projectName = getLovableProjectName(repos);
    if (detected) {
      const match = repos.find(r =>
        r.full_name.toLowerCase() === detected.full.toLowerCase()
      );
      return { match: match || null, detected, projectName };
    }
    return { match: findMatchingRepo(repos, projectName), detected: null, projectName };
  }

  function ghRepoDisplayName(fullName) {
    const name = String(fullName || '').split('/').pop();
    return name || String(fullName || '');
  }

  function ghRenderRepos(filter) {
    const q = (filter || '').toLowerCase();
    const list = ghAllRepos.filter(r => !q || r.full_name.toLowerCase().includes(q));
    if (!list.length) {
      ghRepoList.innerHTML = '<div class="vtx-gh-empty">Nenhum repositório encontrado.</div>';
      return;
    }
    ghRepoList.innerHTML = list.map(r => `
      <button class="vtx-gh-repo-item" data-repo="${r.full_name}" title="${r.full_name}">
        <span class="repo-name">${ghRepoDisplayName(r.full_name)}</span>
        ${r.private ? '<span class="repo-badge">PRIVADO</span>' : ''}
      </button>
    `).join('');
  }

  async function ghCallRepos(payload) {
    const auth = await ghAuth();
    const res = await fetch(cfgUrl('GITHUB_REPOS_FUNCTION', 'github-repos'), {
      method: 'POST',
      headers: cfgHeaders(),
      body: JSON.stringify({ ...auth, ...payload })
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function ghSelectRepo(fullName, isAuto) {
    const projectKey = currentProjectKey;
    ghShowMsg(isAuto ? 'Detectando repositório do projeto...' : 'Selecionando...');
    const { data } = await ghCallRepos({ action: 'select', repoFullName: fullName });
    if (projectKey !== currentProjectKey) return false;
    if (!data.ok) { ghShowMsg(data.error || 'Falha ao selecionar repositório.', true); return false; }
    projectCheckEpoch++;
    ghActiveRepo = fullName;
    repoResolvedProjectKey = projectKey;
    ghRepoName.textContent = ghRepoDisplayName(fullName);
    ghShowState('ready');
    ghShowMsg('');
    maybeChainOrFinish('github');
    return true;
  }

  // Abre o fluxo: decide sozinho qual estado mostrar
  async function ghOpen() {
    if (!isLicensed) { openPanelFlow(); return; }
    checkProjectChange();
    const projectKey = currentProjectKey;

    // Busca o status sem abrir o painel ainda — só força abrir se for
    // realmente preciso configurar algo (não conectado, ou sem repo
    // escolhido). Se já estiver tudo pronto, o usuário digita direto no
    // composer principal, sem esse card aparecer no meio do caminho.
    const { data } = await ghCallRepos({ action: 'list' });
    if (projectKey !== currentProjectKey) return;

    if (!data.ok) {
      if (data.code === 'NOT_CONNECTED') { ghShowState('disconnected'); return; }
      ghShowState('repos');
      ghRepoList.innerHTML = `<div class="vtx-gh-empty">${data.error || 'Falha ao carregar.'}</div>`;
      return;
    }

    ghAllRepos = data.repos || [];
    ghLoginEl.textContent = '@' + (data.github_login || '');

    const { match, detected, projectName } = await findCurrentProjectRepo(ghAllRepos);
    if (projectKey !== currentProjectKey) return;
    if (match) {
      if (data.selected_repo?.toLowerCase() === match.full_name.toLowerCase()) {
        ghActiveRepo = match.full_name;
        repoResolvedProjectKey = projectKey;
        ghRepoName.textContent = ghRepoDisplayName(match.full_name);
        refreshStatusCard();
        return;
      }
      const ok = await ghSelectRepo(match.full_name, true);
      if (ok) return;
    }

    // Um repositório salvo para outro projeto não vale como escolha
    // para a página atual.
    ghActiveRepo = null;
    repoResolvedProjectKey = null;
    ghShowState('repos');
    ghRenderRepos('');
    ghAutoHint.style.display = 'none';

    if (detected) {
      if (ghAllRepos.length) {
        // A Lovable aponta um repo que a conta conectada não enxerga —
        // provavelmente é outra conta GitHub. Avisa em vez de escolher errado.
        ghAutoHint.textContent =
          `A Lovable aponta ${detected.full}, mas essa conta do GitHub não tem acesso a ele. Troque de conta ou escolha abaixo:`;
        ghAutoHint.style.display = 'block';
        return;
      }
    }
    if (projectName) {
      ghAutoHint.textContent = `Não identifiquei com certeza o repositório de "${projectName}". Escolha abaixo:`;
      ghAutoHint.style.display = 'block';
    }
  }

  ghRepoFilter?.addEventListener('input', () => ghRenderRepos(ghRepoFilter.value));

  ghRepoList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.vtx-gh-repo-item');
    if (!btn) return;
    await ghSelectRepo(btn.dataset.repo, false);
  });

  ghChangeRepoBtn?.addEventListener('click', () => {
    ghRenderRepos('');
    ghAutoHint.style.display = 'none';
    ghShowState('repos');
  });

  ghConnectBtn?.addEventListener('click', async () => {
    const auth = await ghAuth();
    ghConnectBtn.disabled = true;
    ghConnectBtn.querySelector('.btn-text').textContent = 'Abrindo GitHub...';
    try {
      const res = await fetch(cfgUrl('GITHUB_OAUTH_FUNCTION', 'github-oauth') + '?action=start', {
        method: 'POST', headers: cfgHeaders(), body: JSON.stringify(auth)
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok || !data.authorize_url) {
        ghShowMsg(data.error || 'Falha ao iniciar conexão.', true);
        return;
      }
      const ghPopup = window.open(data.authorize_url, '_blank', 'width=980,height=760');
      // Espera o callback avisar que conectou (postMessage) OU detecta
      // sozinho quando a aba fecha / o usuário volta pro Lovable.
      let already = false;
      const doRefresh = () => {
        if (already) return;
        already = true;
        setTimeout(ghOpen, 400);
      };
      const onMsg = (ev) => {
        if (ev.data?.type === 'VERTEX_GITHUB_CONNECTED') {
          window.removeEventListener('message', onMsg);
          doRefresh();
        }
      };
      window.addEventListener('message', onMsg);
      watchOAuthReturn(ghPopup, doRefresh);
    } catch (err) {
      ghShowMsg('Erro ao conectar: ' + (err?.message || err), true);
    } finally {
      ghConnectBtn.disabled = false;
      ghConnectBtn.querySelector('.btn-text').textContent = 'Conectar GitHub';
    }
  });

  ghSwitchBtn?.addEventListener('click', async () => {
    const auth = await ghAuth();
    ghShowMsg('Desconectando...');
    try {
      const res = await fetch(cfgUrl('GITHUB_OAUTH_FUNCTION', 'github-oauth') + '?action=disconnect', {
        method: 'POST', headers: cfgHeaders(), body: JSON.stringify(auth)
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) { ghShowMsg(data.error || 'Falha ao desconectar.', true); return; }
      ghAllRepos = []; ghActiveRepo = null;
      ghShowMsg('');
      ghShowState('disconnected');
    } catch (err) {
      ghShowMsg('Erro: ' + (err?.message || err), true);
    }
  });

  // textarea cresce até um limite
  ghPrompt?.addEventListener('input', () => {
    ghPrompt.style.height = 'auto';
    ghPrompt.style.height = Math.min(ghPrompt.scrollHeight, 120) + 'px';
  });
  ghPrompt?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ghSendBtn.click(); }
  });

  // ══════════════════════════════════════════════════════════════════
  // SELETOR VISUAL DE ELEMENTOS
  // A prévia da Lovable roda num iframe de outro domínio
  // (*.lovable.app), então não dá pra tocar no DOM dela daqui.
  // A conversa é por postMessage com o vtx-frame-selector.js, que o
  // Chrome injeta dentro do iframe.
  //
  //   parent → frame : VTX_FRAME_START_SELECT / VTX_FRAME_CANCEL_SELECT
  //   frame → parent : VTX_FRAME_READY / VTX_FRAME_ELEMENT_SELECTED
  // ══════════════════════════════════════════════════════════════════
  const MSG_START     = 'VTX_FRAME_START_SELECT';
  const MSG_CANCEL    = 'VTX_FRAME_CANCEL_SELECT';
  const MSG_SELECTED  = 'VTX_FRAME_ELEMENT_SELECTED';
  const MSG_READY     = 'VTX_FRAME_READY';

  const selChip   = root.querySelector('#vtxSelChip');
  const composerChip = root.querySelector('#nextComposerChip');
  const ghPickBtn = root.querySelector('#vtxGhPickBtn');
  const composerTargetBtn = root.querySelector('#nextComposerTarget');
  function setPickActive(on) {
    ghPickBtn?.classList.toggle('active', on);
    composerTargetBtn?.classList.toggle('active', on);
  }

  let selState = 'idle';       // idle | selecting | selected
  let selContext = null;       // contexto do elemento escolhido

  function findPreviewIframe() {
    const byDomain = Array.from(document.querySelectorAll('iframe')).find(f =>
      f.src && (f.src.includes('lovable.app') || f.src.includes('lovableproject.com')) &&
      f.getBoundingClientRect().width > 200 && f.getBoundingClientRect().height > 150
    );
    if (byDomain) return byDomain;
    // fallback: iframe visível grande o bastante pra ser a prévia
    return Array.from(document.querySelectorAll('iframe')).find(f => {
      if (!f.contentWindow) return false;
      const r = f.getBoundingClientRect();
      return r.width > 300 && r.height > 300;
    }) || null;
  }

  function postToFrame(type) {
    const frame = findPreviewIframe();
    if (!frame || !frame.contentWindow) return false;
    // '*' aqui é seguro: o frame-selector.js valida que a mensagem
    // veio de lovable.dev antes de agir.
    frame.contentWindow.postMessage({ type }, '*');
    return true;
  }

  // Injeta o script no iframe caso o Chrome não tenha injetado sozinho
  // (acontece quando o iframe já estava carregado antes da extensão).
  async function ensureFrameScript() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      const check = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => window.__vtxFrameSelectorActive === true,
      }).catch(() => null);
      if (check?.some(r => r.result === true)) return;
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['vtx-frame-selector.js'],
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 300));
    } catch (_) { /* segue sem travar */ }
  }

  function renderSelChip() {
    const chipEls = [selChip, composerChip].filter(Boolean);
    if (!selContext) {
      chipEls.forEach(el => { el.style.display = 'none'; el.innerHTML = ''; });
      return;
    }
    const c = selContext;
    const txt = (c.text || '').trim();
    const label = txt
      ? `"${txt.slice(0, 38)}${txt.length > 38 ? '…' : ''}"`
      : (c.id ? `#${c.id}` : (c.tag || 'elemento'));
    const html =
      `<span class="chip-ico">🎯</span>` +
      `<span class="chip-tag">${(c.tag || '').toUpperCase()}</span>` +
      `<span class="chip-label">${label}</span>` +
      `<button type="button" class="chip-x" data-chip-clear title="Remover seleção">×</button>`;
    chipEls.forEach(el => { el.style.display = 'flex'; el.innerHTML = html; });
  }

  function clearSelection() {
    selContext = null;
    selState = 'idle';
    setPickActive(false);
    renderSelChip();
  }

  // Delegado no root: pega o "x" tanto no chip da barra do GitHub
  // quanto no chip do chat da própria extensão
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-chip-clear]')) clearSelection();
  });

  async function startSelection() {
    if (selState === 'selecting') { stopSelection(); return; }
    selState = 'selecting';
    setPickActive(true);
    ghShowMsg('Clique num elemento da prévia. ESC cancela.');

    await ensureFrameScript();
    // manda algumas vezes: o script pode ainda estar subindo
    const ping = () => postToFrame(MSG_START);
    if (!ping()) {
      ghShowMsg('Prévia não encontrada. Abra um projeto com a prévia visível.', true);
      selState = 'idle';
      setPickActive(false);
      return;
    }
    setTimeout(ping, 350);
    setTimeout(ping, 900);
  }

  function stopSelection() {
    postToFrame(MSG_CANCEL);
    if (selState === 'selecting') selState = selContext ? 'selected' : 'idle';
    setPickActive(false);
    ghShowMsg('');
  }

  ghPickBtn?.addEventListener('click', startSelection);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selState === 'selecting') stopSelection();
  });

  window.addEventListener('message', (e) => {
    // só aceita mensagens vindas da prévia
    const fromPreview = e.origin.endsWith('.lovable.app')
                     || e.origin.endsWith('.lovableproject.com');
    if (!fromPreview) return;
    if (!e.data || typeof e.data.type !== 'string') return;

    if (e.data.type === MSG_READY && selState === 'selecting') {
      postToFrame(MSG_START);
    }
    if (e.data.type === MSG_SELECTED) {
      selContext = e.data.context || null;
      selState = selContext ? 'selected' : 'idle';
      setPickActive(false);
      ghShowMsg('');
      renderSelChip();
    }
    if (e.data.type === MSG_CANCEL && selState === 'selecting') {
      selState = selContext ? 'selected' : 'idle';
      setPickActive(false);
      ghShowMsg('');
    }
  });

  // ── Anexos: imagem de referência ou arquivo de texto ───────────────
  // Imagens vão pra IA com visão (ela "vê" o print/mockup).
  // Arquivos de texto entram como contexto extra no pedido.
  const ghAttachBtn  = root.querySelector('#vtxGhAttachBtn');
  const ghFileInput  = root.querySelector('#vtxGhFileInput');
  const ghAttachList = root.querySelector('#vtxGhAttachList');
  const composerAttachList = root.querySelector('#nextComposerAttachList');

  const MAX_ANEXOS = 4;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024;
  const MAX_TEXT_BYTES = 5 * 1024 * 1024;
  let ghAnexos = [];                    // [{name, mimeType, isImage, dataUrl|text}]
  let ghResultTimer = null;             // some com o aviso de commit depois de 5s

  function renderAnexos() {
    for (const list of [ghAttachList, composerAttachList]) {
      if (!list) continue;
      list.replaceChildren();
      list.style.display = ghAnexos.length ? 'flex' : 'none';
      ghAnexos.forEach((a, i) => {
        const chip = document.createElement('div');
        chip.className = 'vtx-attach-chip';
        if (a.isImage) {
          const img = document.createElement('img');
          img.src = a.dataUrl;
          img.alt = `Prévia de ${a.name}`;
          chip.appendChild(img);
        } else {
          const icon = document.createElement('span');
          icon.className = 'attach-ico';
          icon.textContent = '📄';
          chip.appendChild(icon);
        }
        const name = document.createElement('span');
        name.className = 'attach-name';
        name.textContent = a.name;
        chip.appendChild(name);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'attach-x';
        remove.dataset.i = String(i);
        remove.title = `Remover ${a.name}`;
        remove.setAttribute('aria-label', remove.title);
        remove.textContent = '×';
        chip.appendChild(remove);
        list.appendChild(chip);
      });
    }
  }

  function removeAnexo(e) {
    const btn = e.target.closest('.attach-x');
    if (!btn) return;
    const index = Number(btn.dataset.i);
    if (!Number.isInteger(index) || index < 0 || index >= ghAnexos.length) return;
    ghAnexos.splice(index, 1);
    renderAnexos();
  }

  function addSentAttachmentPreviews(bubble) {
    if (!bubble || !ghAnexos.length) return;
    const preview = document.createElement('div');
    preview.className = 'next-dock-sent-attachments';
    for (const a of ghAnexos) {
      if (!a.isImage) continue;
      const img = document.createElement('img');
      img.alt = a.name;
      img.title = a.name;
      img.onload = () => {
        img.onload = null;
        try {
          const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          img.src = canvas.toDataURL('image/webp', .8);
        } catch (_) { /* A miniatura original continua visível. */ }
      };
      img.src = a.dataUrl;
      preview.appendChild(img);
    }
    if (preview.childElementCount) bubble.appendChild(preview);
  }

  function lerArquivo(file, comoTexto) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      comoTexto ? fr.readAsText(file) : fr.readAsDataURL(file);
    });
  }

  async function prepararImagem(file) {
    const signature = Array.from(new Uint8Array(await file.slice(0, 12).arrayBuffer()),
      byte => byte.toString(16).padStart(2, '0')).join('');
    const detectedType = signature.startsWith('89504e470d0a1a0a') ? 'image/png'
      : signature.startsWith('ffd8ff') ? 'image/jpeg'
      : signature.startsWith('474946383761') || signature.startsWith('474946383961') ? 'image/gif'
      : signature.startsWith('52494646') && signature.slice(16, 24) === '57454250' ? 'image/webp' : null;
    if (detectedType) return { name: file.name, mimeType: detectedType, size: file.size,
      dataUrl: await lerArquivo(file.slice(0, file.size, detectedType), false) };

    // Galerias móveis podem entregar AVIF/HEIC ou um tipo anunciado que não
    // corresponde aos bytes. Converte apenas se o navegador conseguir decodificar.
    let bitmap;
    try { bitmap = await createImageBitmap(file); }
    catch (_) { throw new Error(`"${file.name}" não pôde ser lida. Envie PNG, JPEG, WebP ou GIF.`); }
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const converted = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .92));
      if (!converted || converted.type !== 'image/webp' || converted.size > MAX_IMAGE_BYTES)
        throw new Error(`"${file.name}" não pôde ser convertida para WebP abaixo de 10 MB.`);
      return { name: file.name.replace(/\.[^.]+$/, '') + '.webp', mimeType: 'image/webp',
        size: converted.size, dataUrl: await lerArquivo(converted, false) };
    } finally { bitmap.close(); }
  }

  ghAttachBtn?.addEventListener('click', () => ghFileInput?.click());

  ghFileInput?.addEventListener('change', async () => {
    const files = Array.from(ghFileInput.files || []);
    ghFileInput.value = '';   // permite reescolher o mesmo arquivo depois

    // ZIP não é suportado por enquanto — avisa em vez de falhar calado
    const zip = files.find(f => /\.zip$/i.test(f.name) || f.type === 'application/zip');
    if (zip) {
      ghAnexos = [];
      renderAnexos();
      ghShowMsg('Arquivos .zip ainda não são suportados. Envie imagens ou arquivos de texto.', true);
      return;
    }

    if (ghAnexos.length + files.length > MAX_ANEXOS) {
      ghShowMsg(`Máximo de ${MAX_ANEXOS} anexos por pedido.`, true);
      return;
    }

    for (const f of files) {
      const isImage = f.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif|avif|heic|heif)$/i.test(f.name);
      if (f.size > (isImage ? MAX_IMAGE_BYTES : MAX_TEXT_BYTES)) {
        ghAnexos = [];
        ghShowMsg(`"${f.name}" passa de ${isImage ? 10 : 5} MB.`, true);
        continue;
      }
      if (isImage && ghAnexos.reduce((n, a) => n + (a.isImage ? a.size : 0), 0) + f.size > MAX_TOTAL_IMAGE_BYTES) {
        ghAnexos = [];
        ghShowMsg('As imagens juntas não podem passar de 20 MB. Remova uma imagem e tente novamente.', true);
        continue;
      }
      try {
        if (isImage) {
          const image = await prepararImagem(f);
          if (ghAnexos.reduce((n, a) => n + (a.isImage ? a.size : 0), 0) + image.size > MAX_TOTAL_IMAGE_BYTES)
            throw new Error('As imagens juntas não podem passar de 20 MB. Remova uma imagem e tente novamente.');
          ghAnexos.push({ ...image, isImage: true });
        } else {
          ghAnexos.push({ name: f.name, mimeType: f.type || 'text/plain', isImage: false, text: await lerArquivo(f, true) });
        }
      } catch (err) {
        ghAnexos = [];
        ghShowMsg(err?.message || `Não consegui ler "${f.name}".`, true);
      }
    }
    renderAnexos();
  });

  ghAttachList?.addEventListener('click', removeAnexo);
  composerAttachList?.addEventListener('click', removeAnexo);

  const jobStages = {...globalThis.VertexAuroraEngine.stages,queued:'Na fila',starting:'Iniciando',quota_accepted:'Comando registrado',analyzing:'Analisando o projeto',selecting_files:'Selecionando arquivos',reading_files:'Lendo arquivos',generating:'Gerando alterações',checking:'Conferindo o código',preparing_plan:'Preparando a proposta',prepared:'Proposta pronta',cancelled:'Cancelado',interrupted:'Execução interrompida'};
  const jobTickets = new Map();
  let restoringAgentJobs = false;
  async function saveJobTicket(ticket) {
    jobTickets.set(ticket.id,ticket);
    await chrome.storage.local.set({['vertex_agent_job_'+ticket.id]:ticket});
  }
  async function jobRequest(ticket,action,payload={},signal) {
    if (ticket.owner !== await planOwner()) throw new Error('A licença mudou. Volte à conta deste comando.');
    const auth=await ghAuth();
    const response=await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION','github-ai-edit'),{method:'POST',headers:cfgHeaders(),signal:signal || AbortSignal.timeout(20000),
      body:JSON.stringify({...payload,...auth,action,job_id:ticket.id,projectKey:ticket.projectKey,expectedRepo:ticket.repo})});
    const data=await response.json();
    if (!data.ok) {const error=new Error(data.error || 'Falha ao consultar o comando.');error.code=data.code;error.definitive=response.status<500;throw error;}
    return data;
  }
  async function settlePlanJob(id,cancel) {
    const ticket=jobTickets.get(id) || (await chrome.storage.local.get('vertex_agent_job_'+id))['vertex_agent_job_'+id];
    if(!ticket)return;
    if(cancel)await jobRequest(ticket,'job_cancel');
    ticket.settled=true;ticket.delivered=true;await saveJobTicket(ticket);
  }
  async function cancelServerJob(ticket) {
    for(let attempt=0;attempt<3;attempt++) {
      try {await jobRequest(ticket,'job_cancel');ticket.delivered=true;ticket.settled=true;await saveJobTicket(ticket);return;}
      catch(error){if(error.code!=='JOB_NOT_FOUND' || attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
    }
  }
  function showJobTicket(ticket,job={}) {
    let card=root.querySelector(`[data-agent-job="${ticket.id}"]`);
    if (!card) {
      const html=`<div class="next-agent-job" data-agent-job="${ticket.id}"><small>Comando ${ticket.id}</small><div class="next-job-state"></div><div class="next-job-trace"></div><div class="next-job-actions"><button type="button" class="next-job-resume">Consultar andamento</button><button type="button" class="next-job-report">Copiar diagnóstico</button></div></div>`;
      if (isDocked()) addDockChatMessage('ai',html,'plano');
      else {const holder=document.createElement('div');holder.innerHTML=html;ghResult.before(holder);}
      card=root.querySelector(`[data-agent-job="${ticket.id}"]`);
    }
    const label=job.status==='failed' ? `Falhou: ${job.error_message || job.error_code || 'consulte o diagnóstico'}` : jobStages[job.stage] || 'Consultando comando';
    if (card) {card.querySelector('.next-job-state').textContent=label;const trace=card.querySelector('.next-job-trace');if(trace)trace.innerHTML=globalThis.VertexAuroraEngine.trace(job.events);}
    clearTimeout(dockStepTimer);dockStepTimer=null;
    const thinking=dockChatMessages?.querySelector('#nextDockThinking');
    if (thinking) thinking.innerHTML=`<span>${escapeHtml(label)}</span>`;
  }
  async function requestAgentJob(op,payload,resumeTicket) {
    await usageReady;
    const usageBaseline=Math.max(Number(activeProfile?.commandsCount)||0,Number(usageByLicense[activeProfile?.licenseKey]?.count)||0);
    const ticket=resumeTicket || {usageBaseline,usageDay:usageDay(),id:crypto.randomUUID(),owner:await planOwner(),repo:op.repo,projectKey:op.projectKey,prompt:(op.prompt || 'Imagem anexada').slice(0,500),createdAt:Date.now(),delivered:false};
    op.jobTicket=ticket;
    await saveJobTicket(ticket);
    showJobTicket(ticket,{stage:'queued'});
    if (!resumeTicket) {
      try {await jobRequest(ticket,'job_start',payload,op.abort.signal);}
      catch(error) {
        // A lost response may still have started the job; retain the ID for consultation.
        ticket.lastError=error.message;if(error.definitive){ticket.delivered=true;ticket.settled=true;}await saveJobTicket(ticket);throw error;
      }
    }
    for (let poll=0;poll<65;poll++) {
      if (op.canceled) throw new Error('Consulta interrompida.');
      const state=await jobRequest(ticket,'job_status',{},op.abort.signal);
      ticket.diagnostic=state.job;await saveJobTicket(ticket);showJobTicket(ticket,state.job);
      if (state.job.command_counted && !ticket.counted) {
        await recordAiCommand('github',ticket.prompt || 'Imagem anexada',state.job.daily_used,ticket.id,{baseline:ticket.usageBaseline,day:state.job.usage_day || ticket.usageDay});
        ticket.counted=true;await saveJobTicket(ticket);
      }
      if (state.job.status==='ready' && state.result) return {status:200,json:async()=>state.result};
      if (['failed','cancelled'].includes(state.job.status)) {
        op.jobTerminal=true;ticket.settled=true;
        return {status:200,json:async()=>state.result || {ok:false,command_id:ticket.id,code:state.job.error_code || 'CANCELLED',error:state.job.error_message || 'Pedido cancelado.'}};
      }
      await new Promise((resolve,reject)=>{
        const stop=()=>{clearTimeout(timer);reject(new Error('Consulta interrompida.'));};
        const timer=setTimeout(()=>{op.abort.signal.removeEventListener('abort',stop);resolve();},3000);
        op.abort.signal.addEventListener('abort',stop,{once:true});
      });
    }
    throw new Error('A consulta foi pausada. Use o identificador para recuperar o andamento.');
  }
  async function restoreAgentJobs() {
    if (restoringAgentJobs || activeEdit || !ghActiveRepo || repoResolvedProjectKey!==getProjectContextKey()) return;
    restoringAgentJobs=true;
    try {
      const owner=await planOwner();const all=await chrome.storage.local.get(null);
      for (const [key,ticket] of Object.entries(all)) {
        if (!key.startsWith('vertex_agent_job_')) continue;
        if (!ticket?.createdAt || Date.now()-ticket.createdAt>86400000) {await chrome.storage.local.remove(key);continue;}
        if (!/^[a-f0-9-]{36}$/.test(ticket.id) || ticket.owner!==owner || ticket.repo!==ghActiveRepo || ticket.projectKey!==getProjectContextKey()) continue;
        jobTickets.set(ticket.id,ticket);
        showJobTicket(ticket,ticket.diagnostic);
        const savedPlan=all['vertex_plan_plano_'+ticket.id];
        if (ticket.settled || pendingPlans['plano_'+ticket.id] || (savedPlan?.owner===owner && savedPlan.expiresAt>Date.now())) continue;
        ticket.delivered=false;
        if (!composerInput.value.trim() && !ghPrompt.value.trim()) {await ghSendPrompt(false,ticket);break;}
      }
    } finally {restoringAgentJobs=false;}
  }
  root.addEventListener('click',async e=>{
    const button=e.target.closest('.next-job-resume,.next-job-report');if(!button)return;
    const id=button.closest('[data-agent-job]')?.dataset.agentJob;
    const ticket=jobTickets.get(id);if(!ticket)return;
    if (ticket.projectKey!==getProjectContextKey() || ticket.repo!==ghActiveRepo) {composerNotice('Volte ao projeto deste comando para consultá-lo.');return;}
    if (button.classList.contains('next-job-resume')) {
      if (activeEdit) {composerNotice('Este comando já está sendo acompanhado.');return;}
      if (ticket.delivered) {try {const state=await jobRequest(ticket,'job_diagnostic');showJobTicket(ticket,state.job);} catch(error){composerNotice(error.message);}return;}
      await ghSendPrompt(false,ticket);return;
    }
    try {
      const {job}=await jobRequest(ticket,'job_diagnostic');
      const report=['Vertex Pro 3.5.1',`Comando: ${job.id}`,`Projeto: ${job.repo}`,`Estado: ${job.status}`,`Etapa: ${job.stage}`,`Início: ${job.created_at}`,`Atualização: ${job.updated_at}`,`Código: ${job.error_code || '-'}`,`Erro: ${job.error_message || '-'}`,
        ...(job.events || []).map(x=>`${x.at}: ${x.stage}`)].join('\n');
      try {await navigator.clipboard.writeText(report);} catch(_) {
        const input=document.createElement('textarea');input.value=report;input.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(input);input.select();
        const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('Não consegui copiar o diagnóstico.');
      }
      button.textContent='Diagnóstico copiado';
    } catch(error) {composerNotice(`Comando ${ticket.id}: ${error.message}`);}
  });

  async function ghSendPrompt(fromComposer = false, resumeJob = null) {
    if (activeEdit || undoBusy) return false;
    const prompt = (resumeJob ? resumeJob.prompt || 'Comando recuperado' : ghPrompt.value || '').trim();
    if (!resumeJob && !prompt && !ghAnexos.length) {
      ghShowMsg('Descreva o que você quer alterar (ou anexe uma imagem de referência).', true);
      return false;
    }
    if (!resumeJob && await dailyLimitReached()) { showDailyLimit(); return false; }
    checkProjectChange();
    if (!ghActiveRepo || repoResolvedProjectKey !== currentProjectKey) {
      await ghOpen();
      if (!ghActiveRepo || repoResolvedProjectKey !== currentProjectKey) {
        ghShowMsg('Escolha o repositório deste projeto antes de enviar.', true);
        return false;
      }
    }

    const memoryScope = await ensureAuroraMemory().catch(()=>null);
    const rememberedPage = await readEditedPage(ghActiveRepo, getProjectContextKey());
    if (!resumeJob && fromComposer && isDocked() && !selContext && !rememberedPage && needsPageClarification(prompt)) {
      pendingClarification = { prompt, repo: ghActiveRepo, projectKey: getProjectContextKey() };
      await hideDockThinking();
      const question = 'Em qual página devo fazer essa alteração? Diga o nome, por exemplo: auth ou login.';
      addDockChatMessage('ai', escapeHtml(question), 'plano');
      auroraRecord('assistant', question);
      ghPrompt.value = '';
      return true;
    }

    const op = { abort: new AbortController(), canceled: false, completed: false, timedOut: false, phase: 'generating',
      fromComposer, prompt, manualApproval: !!resumeJob || (isDocked() && modoPlanoAtivo), requireValidation:false,
      projectKey: getProjectContextKey(), repo: ghActiveRepo, memoryScope };
    activeEdit = op;
    ghSendBtn.disabled = false;
    ghSendBtn.title = 'Cancelar pedido antes do commit';
    ghSendBtn.querySelector('.send-icon').style.display = 'none';
    ghSendBtn.querySelector('.send-spinner').style.display = 'none';
    ghSendBtn.classList.add('cancelable');
    setComposerSendState('cancelable');
    ghShowMsg('');
    clearTimeout(ghResultTimer);
    ghResult.classList.remove('vtx-fade-out');
    ghResult.style.display = 'none';

    try {
      op.timeoutTimer = setTimeout(() => {
        op.timedOut = true;
        op.abort.abort();
      }, 210_000);
      const auth = await ghAuth();
      const engineOptions=resumeJob?{}:await readEngineOptions();
      if(op.projectKey!==getProjectContextKey() || op.repo!==ghActiveRepo)throw Error('O projeto mudou. Envie o pedido novamente.');
      const res = await requestAgentJob(op, {
          prompt: prompt || 'Aplique no site o que a imagem anexada mostra.',
          lastEditedPage: !hasNamedPage(prompt) ? rememberedPage : null,
          selectedElement: selContext || null,
          model: selectedEngine,
          dockedMode: isDocked(),
          modoPlano: op.manualApproval,
          deferCommit: true,
          ...engineOptions,
          requireValidation: false,
          // O texto desta mensagem já está em `prompt`, não repeti-lo no histórico.
          chatHistory: isDocked() ? (fromComposer && auroraHistory.at(-1)?.role === 'user' && auroraHistory.at(-1)?.content === (prompt || '[Imagem anexada]').slice(0, 500)
            ? auroraHistory.slice(0, -1) : auroraHistory) : undefined,
          attachments: ghAnexos.map(a => a.isImage
            ? { name: a.name, mimeType: a.mimeType, isImage: true, dataUrl: a.dataUrl }
            : { name: a.name, mimeType: a.mimeType, isImage: false, text: a.text }),
        },resumeJob);
      let data = await res.json().catch(() => ({}));
      clearTimeout(op.timeoutTimer);
      if (op.canceled) return false;
      if (res.status === 504) throw new Error('O servidor demorou demais para responder. O pedido foi encerrado; envie uma instrução mais específica.');
      if (data.code === 'DAILY_LIMIT') {
        if (op.fromComposer && !composerInput.value.trim()) composerInput.value = prompt;
        await markDailyLimit();
        return false;
      }
      if(op.projectKey!==getProjectContextKey() || op.repo!==ghActiveRepo)throw Error('O projeto mudou. Volte a ele para recuperar este comando.');
      if(data.engine && isDocked())addDockChatMessage('ai',globalThis.VertexAuroraEngine.render(data.engine),'plano');
      // Uma imagem inválida é rejeitada antes de consumir a cota no servidor.
      // The job ID deduplicates local accounting; the server charges once per job.
      if (isDocked()) await hideDockThinking();
      if (op.canceled) return false;

      if (!data.ok) {
        ghShowMsg(data.error || 'Falha ao processar o pedido.', true);
        if (isDocked()) addDockChatMessage('ai', escapeHtml(data.error || 'Falha ao processar o pedido.'), 'erro');
        return false;
      }

      // Modo ancorado + Aurora decidiu que era só conversa — responde no
      // chat e não mexe em nada do projeto (sem commit, sem banner).
      if (data.mode === 'chat') {
        if(op.jobTicket)op.jobTicket.settled=true;
        const reply = data.reply || 'Oi! Como posso ajudar?';
        addDockChatMessage('ai', escapeHtml(reply));
        await saveSuccessfulTurn(op.memoryScope,prompt,reply).catch(()=>{});
        ghAnexos = [];
        renderAnexos();
        ghPrompt.value = '';
        ghPrompt.style.height = 'auto';
        op.completed = true;
        return true;
      }

      const tasksHtml = Array.isArray(data.tasks) && data.tasks.length
          ? '<div class="next-agent-tasks"><b>Etapas do pedido</b>' + data.tasks.map(task =>
            `<div class="next-agent-task"><span>${task.status === 'prepared' ? '☑ Código preparado' : '◷ Pendente'}</span><br>${escapeHtml(task.title)}${task.detail ? `<br><small>${escapeHtml(task.detail)}</small>` : ''}</div>`
          ).join('') + '<small>Build e testes de execução ainda não realizados.</small></div>' : '';

      const reviewHtml = globalThis.VertexCodeReview.render(data.files,data.review_base,data.assets);
      // O backend preparou arquivos sem commitar. No modo comum, há uma
      // janela real para cancelar antes de pedir a publicação ao servidor.
      if (data.mode === 'plan' && (data.requires_manual_review || data.requires_validation)) op.manualApproval = true;
      if (data.mode === 'plan' && !op.manualApproval) {
        if (!data.plan_token || !Array.isArray(data.files) || !data.files.length) {
          ghShowMsg('A proposta chegou incompleta. Envie novamente.', true);
          return false;
        }
        if (isDocked() && (tasksHtml || reviewHtml)) addDockChatMessage('ai', tasksHtml+reviewHtml, 'plano');
        op.phase = 'countdown';
        if (isDocked()) op.statusBubble = addDockChatMessage('ai', 'Alteração preparada. Commit em 6 segundos; toque no quadrado para cancelar.', 'plano');
        else ghShowMsg('Alteração preparada. Commit em 6 segundos; toque no quadrado para cancelar.');
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 6000);
          op.cancelWait = () => { clearTimeout(timer); resolve(); };
        });
        op.cancelWait = null;
        if (op.canceled) return false;
        if (op.projectKey !== getProjectContextKey() || op.repo !== ghActiveRepo) {
          ghShowMsg('O projeto mudou. Envie o pedido novamente.', true);
          if (op.statusBubble) op.statusBubble.textContent = 'O projeto mudou. Envie o pedido novamente.';
          return false;
        }
        op.phase = 'publishing';
        setComposerSendState('loading');
        ghSendBtn.disabled = true;
        ghSendBtn.classList.remove('cancelable');
        ghSendBtn.querySelector('.send-spinner').style.display = 'inline-block';
        if (op.statusBubble) op.statusBubble.textContent = 'Publicando commit...';
        else ghShowMsg('Publicando commit...');
        const confirmation = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION', 'github-ai-edit'), {
          method: 'POST', headers: cfgHeaders(),
          body: JSON.stringify({ ...auth, action: 'confirm_plan', files: data.files, assets: data.assets || [], plan_token: data.plan_token }),
        });
        const result = await confirmation.json().catch(() => ({}));
        if (!result.ok) {
          ghShowMsg(result.error || 'Falha ao publicar o commit.', true);
          if (op.statusBubble) op.statusBubble.textContent = result.error || 'Falha ao publicar o commit.';
          return false;
        }
        if (op.statusBubble) op.statusBubble.textContent = 'Commit publicado.';
        data = { ...data, ...result, mode: 'committed', reasoning: data.reasoning };
      }

      if (data.note && isDocked()) addDockChatMessage('ai', escapeHtml(data.note), 'pensamento');

      // Modo Planejamento: a Aurora já gerou e validou o conteúdo, mas
      // não commitou — mostra um card com o plano e espera o cliente
      // clicar "Aplicar" (ou "Cancelar") antes de mexer no GitHub.
      if (data.mode === 'plan') {
        if (!data.plan_token || !Array.isArray(data.files) || !data.files.length) {
          ghShowMsg('A proposta chegou incompleta. Gere o plano novamente.', true);
          return false;
        }
        if(!isDocked())applyDockMode(true);
        const arquivos = [...(data.files || []).map((f) => f.path), ...(data.assets || []).map((a) => a.path)];
        const criados = new Set(data.files_created || []);
        const listaHtml = arquivos.map((p) => {
          const nome = escapeHtml(p);
          return `<div class="next-dock-plan-file">${criados.has(p) ? '🆕' : '✏️'} ${nome}</div>`;
        }).join('');
        const planoId = 'plano_' + (op.jobTicket?.id || crypto.randomUUID());
        pendingPlans[planoId] = {
          files: data.files, assets: data.assets || [], token: data.plan_token, reviewBase:data.review_base,engine:data.engine,jobId:op.jobTicket?.id,
          repo: ghActiveRepo, projectKey: getProjectContextKey(), prompt,
          requiresValidation:data.requires_validation === true,expiresAt:Date.now()+14*60000,
        };
        await savePendingPlan(planoId).catch(()=>{});
        if (data.reasoning) addDockChatMessage('ai', `💭 ${escapeHtml(data.reasoning)}`, 'pensamento');
        if (data.verification) {
          const n = Number(data.verification.inspected_files) || 0;
          addDockChatMessage('ai', `🔎 Consultei ${n} arquivo(s) relacionado(s) e conferi sintaxe e imports locais.${data.verification.self_repaired ? ' Corrigi uma tentativa antes de propor o plano.' : ''}`, 'pensamento');
        }
        addDockChatMessage(
          'ai',
          `📋 <b>Plano proposto</b> — ${arquivos.length} arquivo(s):<br>${listaHtml}${tasksHtml}${reviewHtml}` +
            (data.requires_manual_review ? '<p>Revise as etapas e eventuais pendências. Aprovar publica somente o código preparado acima.</p>' : '') +
            `<div class="next-dock-plan-actions" data-plan-id="${planoId}">` +
            planControls(pendingPlans[planoId]) +
            `</div>`,
          'plano'
        );
        await saveSuccessfulTurn(op.memoryScope,prompt,`[Plano proposto em ${arquivos.length} arquivo(s), aguardando aprovação; nenhuma alteração aplicada.]`).catch(()=>{});
        ghAnexos = [];
        renderAnexos();
        ghPrompt.value = '';
        ghPrompt.style.height = 'auto';
        op.completed = true;
        return true;
      }

      ghResult.style.display = 'block';
      ghResult.classList.remove('vtx-fade-out');
      const locInfo = data.locator
        ? `<br><small style="opacity:.75">🎯 encontrado em <b>${String(data.locator.path).split('/').pop()}</b> (confiança ${data.locator.score})</small>`
        : data.locator_ambiguous
        ? `<br><small style="opacity:.75">⚠️ elemento ambíguo — a IA usou o contexto como dica</small>`
        : '';
      ghResult.innerHTML = `✅ Commit <a href="${data.commit_url}" target="_blank" rel="noopener noreferrer">${(data.commit_sha||'').slice(0,7)}</a> — ${(data.files_changed||[]).length} arquivo(s).${locInfo} A Lovable atualiza a prévia em instantes.<div class="next-inline-undo next-undo-area" hidden></div>`;
      await rememberCommitResult(data,op.repo,op.projectKey,prompt,op.memoryScope);

      if (isDocked()) {
        // Mostra o raciocínio da Aurora primeiro (o que ela decidiu fazer
        // e por quê), depois a confirmação — assim fica claro que ela
        // pensou antes de mexer, não saiu editando às cegas.
        if (data.reasoning) {
          addDockChatMessage('ai', `💭 ${escapeHtml(data.reasoning)}`, 'pensamento');
        }
        if (data.verification) {
          const n = Number(data.verification.inspected_files) || 0;
          addDockChatMessage('ai', `🔎 Consultei ${n} arquivo(s) relacionado(s) e conferi sintaxe e imports locais.${data.verification.self_repaired ? ' Corrigi uma tentativa antes de preparar o commit.' : ''}`, 'pensamento');
        }
        const arquivos = (data.files_changed || []).map(f => f.split('/').pop()).join(', ');
        addDockChatMessage('ai', `✅ Prontinho! Alterei <b>${(data.files_changed||[]).length}</b> arquivo(s): ${escapeHtml(arquivos)}.<br><a href="${data.commit_url}" target="_blank" rel="noopener noreferrer">Ver commit no GitHub</a>${data.undo_token ? '<br>'+undoButton(data.commit_sha) : ''}`, 'edit');
        // Guarda um resumo curto na memória (não o raciocínio inteiro),
        // só o suficiente pra Aurora lembrar o que já foi feito se o
        // cliente continuar a conversa ("agora faz o mesmo no outro botão").

      }

      // Some sozinho depois de 5s pra não acumular aviso na barra.
      // Guardamos o timer pra um commit novo não herdar o anterior.
      clearTimeout(ghResultTimer);
      // A confirmação do commit fica disponível no resultado e na conversa.

      clearSelection();
      ghAnexos = [];
      renderAnexos();
      ghPrompt.value = '';
      ghPrompt.style.height = 'auto';

      if(op.jobTicket)op.jobTicket.settled=true;
      op.completed = true;
      return true;
    } catch (err) {
      if (op.canceled) return false;
      const message = op.timedOut
        ? 'A consulta demorou demais. O processamento ocorre no servidor; use Consultar andamento para recuperar este comando.'
        : 'Erro: ' + (err?.message || err);
      ghShowMsg(message, true);
      if (isDocked()) { await hideDockThinking(); addDockChatMessage('ai', escapeHtml(message), 'erro'); }
      return false;
    } finally {
      clearTimeout(op.timeoutTimer);
      if (op.jobTicket && (op.completed || op.jobTerminal)) {op.jobTicket.delivered=true;await saveJobTicket(op.jobTicket).catch(()=>{});}
      if (!op.completed) {
        ghAnexos = [];
        renderAnexos();
        if (ghPrompt.value.trim() === prompt) ghPrompt.value = '';
      }
      if (activeEdit === op) activeEdit = null;
      ghSendBtn.disabled = false;
      ghSendBtn.title = 'Enviar pra IA';
      ghSendBtn.classList.remove('cancelable');
      ghSendBtn.querySelector('.send-icon').style.display = '';
      ghSendBtn.querySelector('.send-spinner').style.display = 'none';
    }
  }
  ghSendBtn?.addEventListener('click', () => { if (activeEdit) cancelActiveEdit(); else ghSendPrompt(); });

  // (o clique no botão GitHub agora é tratado no menu "Modelos", que já
  // decide se abre a barra ou não conforme o modo escolhido)

  // ══════════════════════════════════════════════════════════════════
  // BANCO DE DADOS (Supabase do cliente)
  // Regra central: a extensão NUNCA executa SQL direto. Sempre gera,
  // mostra pro cliente revisar, e só aplica quando ele confirma.
  // Comandos que podem perder dados exigem uma segunda confirmação.
  // ══════════════════════════════════════════════════════════════════
  const dbBar        = root.querySelector('#vtxDbBar');
  const dbDisc       = root.querySelector('#vtxDbDisconnected');
  const dbProjects   = root.querySelector('#vtxDbProjects');
  const dbReady      = root.querySelector('#vtxDbReady');
  const dbConnectBtn = root.querySelector('#vtxDbConnectBtn');
  const dbSwitchBtn  = root.querySelector('#vtxDbSwitchBtn');
  const dbProjectList= root.querySelector('#vtxDbProjectList');
  const dbProjectName= root.querySelector('#vtxDbProjectName');
  const dbChangeBtn  = root.querySelector('#vtxDbChangeProjectBtn');
  const dbPrompt     = root.querySelector('#vtxDbPrompt');
  const dbGenBtn     = root.querySelector('#vtxDbGenBtn');
  const dbPreview    = root.querySelector('#vtxDbPreview');
  const dbExplain    = root.querySelector('#vtxDbExplain');
  const dbSqlEl      = root.querySelector('#vtxDbSql');
  const dbWarn       = root.querySelector('#vtxDbWarn');
  const dbApplyBtn   = root.querySelector('#vtxDbApplyBtn');
  const dbCancelBtn  = root.querySelector('#vtxDbCancelBtn');
  const dbMsg        = root.querySelector('#vtxDbMsg');
  const dbResult     = root.querySelector('#vtxDbResult');
  const dockDbBtn    = root.querySelector('#nextDockDb');

  let dbActiveRef = null;
  let dbResolvedProjectKey = null;
  let dbPendingContext = null;
  let dbResolving = false;
  let dbDetectionSignature = '';
  let dbPendingSql = null;
  let dbPendingDestructive = false;

  // ── Reencaixa as barras do GitHub e do Supabase pra dentro do card
  // de integrações — elas deixam de flutuar por cima do chat da
  // Lovable e passam a fazer parte do próprio painel ──────────────────
  const integrationMount = root.querySelector('#nextIntegrationMount');
  if (integrationMount) {
    if (ghBar) { ghBar.classList.add('inline'); integrationMount.appendChild(ghBar); }
    if (dbBar) { dbBar.classList.add('inline'); integrationMount.appendChild(dbBar); }
  }

  const statusCard = root.querySelector('.next-status-card');
  const statusDot = root.querySelector('.next-status-dot');
  const statusSub = root.querySelector('#nextStatusSub');
  const statusActionBtn = root.querySelector('#nextStatusActionBtn');
  const integrationDone = root.querySelector('#nextIntegrationDone');

  function refreshStatusCard() {
    restorePendingPlans().catch(()=>{});
    restoreAgentJobs().catch(()=>{});
    ensureAuroraMemory().catch(()=>{});
    const connected = !!ghActiveRepo && !!(dbProjectName?.textContent);
    statusDot?.classList.toggle('warn', !connected);
    if (statusSub) statusSub.textContent = connected
      ? 'Ativa e pronta para ajudar'
      : 'Conecte o GitHub e o Supabase pra ativar tudo';
    if (statusActionBtn) statusActionBtn.style.display = connected ? 'none' : 'inline-flex';
    if (typeof applyPanel === 'function') applyPanel();
  }
  // estado inicial correto (vermelho + "Configurar") antes de qualquer
  // checagem — evita o "flash" de bolinha verde com botão de configurar
  // aparecendo ao mesmo tempo, que é inconsistente
  refreshStatusCard();

  // Depois de conectar uma das duas integrações, segue pra próxima
  // sozinho; quando as duas estiverem prontas, fecha o card.
  function maybeChainOrFinish(justConnected) {
    refreshStatusCard();
    const ghDone = !!ghActiveRepo;
    const dbDone = !!(dbProjectName?.textContent);
    if (ghDone && dbDone) {
      finishIntegration();
    } else if (justConnected === 'github' && !dbDone) {
      dbOpen();
    } else if (justConnected === 'db' && !ghDone) {
      ghOpen();
    }
  }

  function finishIntegration() {
    if (ghBar) ghBar.style.display = 'none';
    if (dbBar) dbBar.style.display = 'none';
    if (integrationDone) {
      integrationDone.style.display = 'block';
      setTimeout(() => {
        integrationDone.style.display = 'none';
        showPanel('shortcuts');
      }, 1800);
    } else {
      showPanel('shortcuts');
    }
  }

  statusActionBtn?.addEventListener('click', async () => {
    if (!ghActiveRepo) { await ghOpen(); return; }
    if (!dbProjectName?.textContent) { await dbOpen(); return; }
  });

  // Checagem silenciosa, sem abrir nenhum card, só pra saber se já
  // estava tudo conectado de uma sessão anterior (bolinha certa de cara)
  async function silentCheckConnections() {
    const projectKey = currentProjectKey;
    const epoch = projectCheckEpoch;
    try {
      const { data } = await ghCallRepos({ action: 'list' });
      if (epoch !== projectCheckEpoch || projectKey !== getProjectContextKey()) return;
      if (data?.ok) {
        ghAllRepos = data.repos || [];
        const { match } = await findCurrentProjectRepo(ghAllRepos);
        if (epoch !== projectCheckEpoch || projectKey !== getProjectContextKey()) return;
        if (match) {
          const alreadySelected = data.selected_repo?.toLowerCase() === match.full_name.toLowerCase();
          const selected = alreadySelected || (await ghCallRepos({
            action: 'select', repoFullName: match.full_name
          })).data?.ok;
          if (epoch !== projectCheckEpoch || projectKey !== getProjectContextKey()) return;
          if (selected) {
            ghActiveRepo = match.full_name;
            repoResolvedProjectKey = projectKey;
            ghRepoName.textContent = ghRepoDisplayName(match.full_name);
          }
        } else {
          ghActiveRepo = null;
          repoResolvedProjectKey = null;
          ghRepoName.textContent = '';
        }
      }
    } catch (_) {}
    try {
      const d = await dbCall({ action: 'status' });
      if (epoch !== projectCheckEpoch || projectKey !== getProjectContextKey()) return;
      if (d?.ok) await dbResolveProject(d, projectKey);
    } catch (_) {}
    if (epoch === projectCheckEpoch && projectKey === getProjectContextKey()) refreshStatusCard();
  }

  window.addEventListener('popstate', checkProjectChange);
  window.addEventListener('hashchange', checkProjectChange);
  // A Lovable usa navegação interna; pushState não dispara popstate.
  setInterval(checkProjectChange, 750);

  function dbShowMsg(t, err) {
    if (!dbMsg) return;
    if (!t) { dbMsg.style.display = 'none'; dbMsg.textContent = ''; return; }
    dbMsg.textContent = t;
    dbMsg.className = err ? 'vtx-gh-msg error' : 'vtx-gh-msg';
    dbMsg.style.display = 'block';
  }
  function dbState(n) {
    forceShowPanel('integration');
    // só esconde a barra do GitHub se ela estiver "dentro do painel";
    // no modo sobreposto ela flutua por conta própria e não deve sumir
    if (ghBar && ghChatMode !== 'overlay') ghBar.style.display = 'none';
    dbBar.style.display = 'flex';
    dbDisc.style.display     = n === 'disconnected' ? 'flex' : 'none';
    dbProjects.style.display = n === 'projects'     ? 'flex' : 'none';
    dbReady.style.display    = n === 'ready'        ? 'flex' : 'none';
  }
  function dbClose() {
    dbBar.style.display = 'none';
    dbShowMsg('');
    showPanel('shortcuts');
  }
  root.querySelectorAll('[data-db-close]').forEach(b => b.addEventListener('click', dbClose));

  function detectSupabaseProjectRefs() {
    const refs = new Set();
    if (location.hostname !== 'lovable.dev' || !getLovableProjectId()) return [];
    const view = new URLSearchParams(location.search);
    if (view.get('view') !== 'more' || view.get('subview') !== 'cloud') return [];
    for (const link of document.querySelectorAll('a[href]')) {
      if (root.contains(link)) continue;
      try {
        const url = new URL(link.href, location.href);
        if (url.protocol !== 'https:' || url.hostname !== 'supabase.com') continue;
        const match = url.pathname.match(/^\/dashboard\/project\/([a-z0-9]{20})(?:\/|$)/);
        if (match) refs.add(match[1]);
      } catch (_) {}
    }
    return [...refs];
  }

  async function dbMappingKey(projectKey) {
    const auth = await ghAuth();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${auth.licenseKey}|${auth.deviceId}`));
    const owner = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    return `vertex_db_link:${owner}:${projectKey}`;
  }

  async function dbRememberProject(projectKey, ref) {
    const key = await dbMappingKey(projectKey);
    await chrome.storage.local.set({ [key]: ref });
  }

  async function dbResolveProject(data, projectKey) {
    if (projectKey !== getProjectContextKey()) return false;
    const refs = detectSupabaseProjectRefs();
    const key = await dbMappingKey(projectKey);
    const saved = (await chrome.storage.local.get(key))[key];
    // O vínculo visível tem prioridade sobre a associação salva.
    const ref = refs.length === 1 ? refs[0] : refs.length > 1 ? null : saved;
    const project = (data.projects || []).find(p => p.ref === ref);
    if (projectKey !== getProjectContextKey()) return false;
    if (!project) {
      dbActiveRef = null; dbResolvedProjectKey = null; dbProjectName.textContent = '';
      dbPendingSql = null; dbPendingContext = null; dbPreview.style.display = 'none';
      refreshStatusCard(); return false;
    }
    // A lista veio da conta Supabase já autorizada; o backend valida de novo.
    if (dbActiveRef !== project.ref) { dbActiveRef = null; dbResolvedProjectKey = null; dbProjectName.textContent = ''; dbPendingSql = null; dbPendingContext = null; dbPreview.style.display = 'none'; }
    const selected = await dbCall({ action: 'select_project', projectRef: project.ref });
    if (!selected.ok || projectKey !== getProjectContextKey()) return false;
    if (dbActiveRef !== project.ref) { dbPendingSql = null; dbPendingContext = null; dbPreview.style.display = 'none'; }
    dbActiveRef = project.ref; dbResolvedProjectKey = projectKey;
    dbProjectName.textContent = selected.selected.name || project.name;
    await dbRememberProject(projectKey, project.ref);
    if (projectKey !== getProjectContextKey()) return false;
    if (dbBar.style.display !== 'none' && dbProjects.style.display !== 'none') {
      dbProjects.style.display = 'none'; dbReady.style.display = 'flex';
      dbShowMsg('Supabase do projeto identificado e conectado.');
    }
    refreshStatusCard(); return true;
  }

  // A rota Cloud é uma SPA: observar seus links quando o cartão for renderizado.
  setInterval(async () => {
    if (!isLicensed || dbResolving || location.hostname !== 'lovable.dev') return;
    const refs = detectSupabaseProjectRefs();
    const signature = `${getProjectContextKey()}:${refs.join(',')}`;
    if (!refs.length || signature === dbDetectionSignature) return;
    dbResolving = true;
    dbDetectionSignature = signature;
    const key = getProjectContextKey();
    try {
      const d = await dbCall({ action: 'status' });
      if (d.ok && key === getProjectContextKey()) {
        await dbResolveProject(d, key);
        dbDetectionSignature = signature;
      }
    } catch (_) {} finally { dbResolving = false; }
  }, 2000);

  async function dbCall(payload) {
    const projectKey = getProjectContextKey();
    const ref = dbActiveRef;
    const scoped = ['generate', 'schema', 'apply'].includes(payload.action);
    if (scoped && (!ref || dbResolvedProjectKey !== projectKey))
      return { ok: false, error: 'Conecte o Supabase deste projeto antes de continuar.' };
    const auth = await ghAuth();
    if (scoped && (getProjectContextKey() !== projectKey || ref !== dbActiveRef))
      return { ok: false, error: 'O projeto mudou. Gere o pedido novamente.' };
    const res = await fetch(`${(window.VERTEX_CONFIG||{}).SUPABASE_URL}/functions/v1/supabase-db`, {
      method: 'POST', headers: cfgHeaders(),
      body: JSON.stringify({ ...auth, ...payload, ...(scoped ? { projectRef: ref } : {}) })
    });
    return await res.json().catch(() => ({}));
  }

  function dbRenderProjects(list) {
    if (!list?.length) {
      dbProjectList.innerHTML = '<div class="vtx-gh-empty">Nenhum projeto encontrado nessa conta.</div>';
      return;
    }
    dbProjectList.innerHTML = list.map(p => `
      <button class="vtx-gh-repo-item" data-ref="${escapeHtml(p.ref)}" data-name="${escapeHtml(p.name)}">
        <span class="repo-name">${escapeHtml(p.name)}</span>
      </button>`).join('');
  }

  async function dbOpen() {
    if (!isLicensed) { openPanelFlow(); return; }

    // Busca o status sem abrir o painel ainda — só força abrir se for
    // realmente preciso configurar algo (não conectado, ou sem projeto
    // escolhido). Se já estiver tudo pronto, o usuário digita direto no
    // composer principal.
    const projectKey = getProjectContextKey();
    const data = await dbCall({ action: 'status' });
    if (projectKey !== getProjectContextKey()) return;

    if (!data.ok) {
      if (data.code === 'NOT_CONNECTED') { dbState('disconnected'); return; }
      dbState('projects');
      dbProjectList.innerHTML = `<div class="vtx-gh-empty">${data.error || 'Falha ao carregar.'}</div>`;
      return;
    }
    if (await dbResolveProject(data, projectKey)) {
      // Igual ao GitHub: só encadeia/força abrir o painel quando o
      // usuário ACABOU de selecionar agora (veja o listener de clique
      // abaixo). Reabrir com tudo já configurado não deve popar o painel.
      refreshStatusCard();
      return;
    }
    dbState('projects');
    dbProjectList.innerHTML = '<div class="vtx-gh-empty">Carregando...</div>';
    dbRenderProjects(data.projects);
    dbShowMsg('Abra Mais → Cloud na Lovable para identificar o Supabase conectado, ou escolha o projeto abaixo.');
  }

  dbProjectList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.vtx-gh-repo-item');
    if (!btn) return;
    const projectKey = getProjectContextKey();
    const d = await dbCall({ action: 'select_project', projectRef: btn.dataset.ref });
    if (projectKey !== getProjectContextKey()) return;
    if (!d.ok) { dbShowMsg(d.error || 'Falha ao selecionar.', true); return; }
    dbActiveRef = d.selected.ref; dbResolvedProjectKey = projectKey;
    dbPendingSql = null; dbPendingContext = null; dbPreview.style.display = 'none';
    dbProjectName.textContent = d.selected.name;
    await dbRememberProject(projectKey, d.selected.ref);
    dbState('ready');
    maybeChainOrFinish('db');
  });

  dbChangeBtn?.addEventListener('click', async () => {
    dbState('projects');
    dbProjectList.innerHTML = '<div class="vtx-gh-empty">Carregando...</div>';
    const d = await dbCall({ action: 'status' });
    dbRenderProjects(d.projects);
  });

  dbConnectBtn?.addEventListener('click', async () => {
    const auth = await ghAuth();
    dbConnectBtn.disabled = true;
    const txt = dbConnectBtn.querySelector('.btn-text');
    const original = txt ? txt.textContent : '';
    if (txt) txt.textContent = 'Abrindo Supabase...';
    dbShowMsg('');
    try {
      const res = await fetch(`${(window.VERTEX_CONFIG||{}).SUPABASE_URL}/functions/v1/supabase-oauth?action=start`, {
        method: 'POST', headers: cfgHeaders(), body: JSON.stringify(auth)
      });
      const d = await res.json().catch(() => ({}));

      if (!d.ok || !d.authorize_url) {
        dbShowMsg(d.error || `Falha ao iniciar a conexão (HTTP ${res.status}).`, true);
        return;
      }

      const win = window.open(d.authorize_url, '_blank', 'width=980,height=760');
      if (!win) {
        // popup bloqueado é comum no celular — oferece o link direto
        dbShowMsg('O navegador bloqueou a janela. Toque no link para autorizar.', true);
        dbResult.style.display = 'block';
        dbResult.innerHTML = `<a href="${d.authorize_url}" target="_blank" rel="noopener noreferrer">Abrir autorização do Supabase</a>`;
        return;
      }

      const onMsg = (ev) => {
        if (ev.data?.type === 'VERTEX_SUPABASE_CONNECTED') {
          window.removeEventListener('message', onMsg);
          doRefresh();
        }
      };
      let already = false;
      const doRefresh = () => {
        if (already) return;
        already = true;
        dbShowMsg('');
        setTimeout(dbOpen, 500);
      };
      window.addEventListener('message', onMsg);
      watchOAuthReturn(win, doRefresh);
    } catch (err) {
      dbShowMsg('Erro de conexão: ' + (err?.message || err), true);
    } finally {
      dbConnectBtn.disabled = false;
      if (txt) txt.textContent = original || 'Conectar Supabase';
    }
  });

  dbSwitchBtn?.addEventListener('click', async () => {
    const auth = await ghAuth();
    await fetch(`${(window.VERTEX_CONFIG||{}).SUPABASE_URL}/functions/v1/supabase-oauth?action=disconnect`, {
      method: 'POST', headers: cfgHeaders(), body: JSON.stringify(auth)
    }).catch(() => {});
    dbActiveRef = null; dbResolvedProjectKey = null; dbPendingSql = null; dbPendingContext = null;
    dbProjectName.textContent = ''; dbPreview.style.display = 'none'; refreshStatusCard();
    dbState('disconnected');
  });

  // Etapa 1: gerar o SQL (não executa nada)
  async function dbGeneratePrompt() {
    const prompt = (dbPrompt.value || '').trim();
    if (!prompt) { dbShowMsg('Descreva o que você quer no banco.', true); return; }
    if (await dailyLimitReached()) { showDailyLimit(); return false; }
    dbGenBtn.disabled = true;
    dbGenBtn.querySelector('.send-icon').style.display = 'none';
    dbGenBtn.querySelector('.send-spinner').style.display = 'inline-block';
    dbShowMsg('');
    dbPreview.style.display = 'none';
    dbResult.style.display = 'none';

    try {
      const context = { key: getProjectContextKey(), ref: dbActiveRef };
      const d = await dbCall({ action: 'generate', prompt, model: selectedEngine });
      if (context.key !== getProjectContextKey() || context.ref !== dbActiveRef) return false;
      dbPendingContext = context;
      if (d.code === 'DAILY_LIMIT') { await markDailyLimit(); return false; }
      await recordAiCommand('db', prompt);
      if (!d.ok) { dbShowMsg(d.error || 'Falha ao gerar o SQL.', true); return false; }

      if (d.blocked) {
        dbShowMsg('Esse pedido não é permitido: ' + (d.reasons || []).join('; '), true);
        return false;
      }

      dbPendingSql = d.sql;
      dbPendingDestructive = !!d.destructive;
      dbExplain.textContent = d.explicacao || '';
      dbSqlEl.textContent = d.sql;

      if (d.destructive) {
        dbWarn.style.display = 'block';
        dbWarn.innerHTML = '⚠️ <b>Atenção:</b> esse comando pode apagar dados.<br>' +
          (d.reasons || []).map(r => '• ' + r).join('<br>');
        dbApplyBtn.textContent = 'Confirmo, aplicar mesmo assim';
        dbApplyBtn.classList.add('danger');
      } else {
        dbWarn.style.display = 'none';
        dbApplyBtn.textContent = 'Aplicar no banco';
        dbApplyBtn.classList.remove('danger');
      }
      dbPreview.style.display = 'block';
      return true;
    } catch (err) {
      dbShowMsg('Erro: ' + (err?.message || err), true);
      return false;
    } finally {
      dbGenBtn.disabled = false;
      dbGenBtn.querySelector('.send-icon').style.display = '';
      dbGenBtn.querySelector('.send-spinner').style.display = 'none';
    }
  }
  dbGenBtn?.addEventListener('click', dbGeneratePrompt);

  dbCancelBtn?.addEventListener('click', () => {
    dbPreview.style.display = 'none';
    dbPendingSql = null;
    showPanel('shortcuts');
  });

  // Etapa 2: aplicar (só depois da revisão)
  dbApplyBtn?.addEventListener('click', async () => {
    if (!dbPendingSql) return;
    if (!dbPendingContext || dbPendingContext.key !== getProjectContextKey() || dbPendingContext.ref !== dbActiveRef) {
      dbPendingSql = null; dbShowMsg('O projeto mudou. Gere o SQL novamente antes de aplicar.', true); return;
    }
    dbApplyBtn.disabled = true;
    dbApplyBtn.textContent = 'Aplicando...';
    try {
      const d = await dbCall({
        action: 'apply',
        sql: dbPendingSql,
        prompt: (dbPrompt.value || '').trim(),
        confirmDestructive: dbPendingDestructive,
      });

      if (!d.ok) {
        if (d.blocked) dbShowMsg('Bloqueado: ' + (d.reasons || []).join('; '), true);
        else dbShowMsg(d.error || 'Falha ao aplicar.', true);
        return;
      }

      dbPreview.style.display = 'none';
      dbResult.style.display = 'block';
      dbResult.innerHTML = '✅ Aplicado no banco com sucesso.' +
        (d.was_destructive ? '<br><small>Comando destrutivo — registrado no log.</small>' : '');
      dbPrompt.value = '';
      dbPendingSql = null;
      // dá um tempinho pro cliente ver a confirmação antes de fechar
      setTimeout(() => showPanel('shortcuts'), 4000);
    } catch (err) {
      dbShowMsg('Erro: ' + (err?.message || err), true);
    } finally {
      dbApplyBtn.disabled = false;
    }
  });

  // (o clique no botão de banco de dados agora é tratado no menu
  // "Modelos", que já decide se abre a barra ou não conforme o modo)

  // ══════════════════════════════════════════════════════════════════
  // COMPOSER PRINCIPAL — permite mandar o comando pelo chat da própria
  // extensão (além da barra dedicada). Usa o modo escolhido em "Modelos"
  // (GitHub ou Banco de dados) e reaproveita os mesmos fluxos de envio.
  // ══════════════════════════════════════════════════════════════════
  const composerInput = root.querySelector('#nextComposerInput');
  const composerSend   = root.querySelector('#nextComposerSend');
  const SEND_ICON_IDLE = composerSend?.querySelector('svg')?.outerHTML || '';
  const SEND_ICON_LOADING = '<svg class="vtx-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg>';
  const SEND_ICON_CANCEL = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  const SEND_ICON_SUCCESS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  // Estado visual do botão de enviar: 'idle' (seta) | 'loading' (girando,
  // enquanto o comando está sendo processado) | 'sent' (check verde)
  function setComposerSendState(state) {
    if (!composerSend) return;
    composerSend.classList.remove('loading', 'sent', 'cancelable');
    const svg = composerSend.querySelector('svg');
    if (state === 'loading') {
      composerSend.classList.add('loading');
      composerSend.disabled = true;
      if (svg) svg.outerHTML = SEND_ICON_LOADING;
    } else if (state === 'cancelable') {
      composerSend.classList.add('cancelable');
      composerSend.disabled = false;
      composerSend.title = 'Cancelar antes do commit';
      composerSend.setAttribute('aria-label', 'Cancelar antes do commit');
      if (svg) svg.outerHTML = SEND_ICON_CANCEL;
    } else if (state === 'sent') {
      composerSend.classList.add('sent');
      composerSend.disabled = false;
      if (svg) svg.outerHTML = SEND_ICON_SUCCESS;
      setTimeout(() => { if (composerSend.classList.contains('sent')) setComposerSendState('idle'); }, 900);
    } else {
      composerSend.disabled = false;
      composerSend.title = 'Enviar';
      composerSend.setAttribute('aria-label', 'Enviar');
      if (svg) svg.outerHTML = SEND_ICON_IDLE;
    }
  }

  function composerNotice(text) {
    if (!composerInput) return;
    const original = composerInput.placeholder;
    composerInput.placeholder = text;
    setTimeout(() => { composerInput.placeholder = original; }, 3200);
  }

  // ── Lovable direto: em vez de recriar a API privada da Lovable (que
  // pode mudar sem aviso), a gente digita o pedido no próprio campo de
  // chat da Lovable e clica no botão de enviar dela — o JS da própria
  // Lovable monta a requisição certa, com o token certo, sozinho. Isso
  // usa a IA que já vem com o plano do cliente na Lovable, sem gastar
  // nada da nossa cota.
  function findLovableComposer() {
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'))
      .filter(el => {
        if (root.contains(el)) return false; // nunca o nosso próprio painel
        const rect = el.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 20) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
    if (!candidates.length) return null;
    const scored = candidates.map(el => {
      const hint = ((el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
      let score = 0;
      if (/pergunt|descreva|mensage|message|ask|build|edit/.test(hint)) score += 5;
      const rect = el.getBoundingClientRect();
      score += rect.width / 1000; // maior = mais provável ser o composer principal
      return { el, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].el;
  }

  function setNativeValue(el, value) {
    // Truque padrão pra "enganar" o React: o setter nativo do input não
    // dispara o onChange dele, então precisamos chamar o setter original
    // (não o sobrescrito pelo React) e depois disparar o evento manualmente.
    const isTextarea = el.tagName === 'TEXTAREA';
    if (isTextarea || el.tagName === 'INPUT') {
      const proto = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.focus();
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, value);
      } catch (_) { el.textContent = value; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function findLovableSendButton(composerEl) {
    const container = composerEl.closest('form') || composerEl.parentElement?.parentElement || composerEl.parentElement || document.body;
    const buttons = Array.from(container.querySelectorAll('button'));
    const scored = buttons.map(btn => {
      const hint = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.title || '') + ' ' + btn.textContent).toLowerCase();
      let score = 0;
      if (btn.type === 'submit') score += 3;
      if (/enviar|send|submit/.test(hint)) score += 5;
      if (btn.disabled) score -= 100;
      return { btn, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].score > -50 ? scored[0].btn : null;
  }

  async function sendViaLovableNative(text) {
    const composer = findLovableComposer();
    if (!composer) {
      composerNotice('Não encontrei o chat da Lovable nessa aba. Abra o projeto e tente de novo.');
      return false;
    }
    setNativeValue(composer, text);
    await new Promise(r => setTimeout(r, 150));
    const sendBtn = findLovableSendButton(composer);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      return true;
    }
    composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    return true;
  }

  async function sendFromComposer() {
    if (activeEdit || undoBusy) return;
    const text = (composerInput?.value || '').trim();
    if (!text && !ghAnexos.length) return;
    if (await dailyLimitReached()) { showDailyLimit(); return; }
    checkProjectChange();

    // Se o cliente ainda não clicou em "GitHub"/"Banco de dados" nessa
    // sessão mas já tem uma conexão pronta (bolinha verde), usa ela
    // direto — não faz sentido pedir pra escolher de novo toda vez.
    let modo = activeModel;
    if (!modo) {
      if (ghActiveRepo) modo = 'github';
      else if (dbProjectName?.textContent) modo = 'db';
      else if (isDocked()) modo = 'github'; // no modo ancorado, a Aurora responde papo mesmo sem nada conectado ainda
      if (modo) {
        activeModel = modo;
        if (modelsLabel) modelsLabel.textContent = modo === 'github' ? 'GitHub' : 'Banco de dados';
      }
    }

    if (ghAnexos.length && modo !== 'github') {
      composerNotice('Para enviar imagens ou arquivos, selecione GitHub em Modelos.');
      return;
    }
    if (modo === 'github') await ensureAuroraMemory().catch(()=>{});
    let commandText = text;
    if (pendingClarification && modo === 'github') {
      const pending = pendingClarification;
      pendingClarification = null;
      if (pending.projectKey === getProjectContextKey() && pending.repo === ghActiveRepo) {
        if (auroraHistory.at(-2)?.content === pending.prompt.slice(0, 500)) auroraHistory.splice(-2, 2);
        if (/^(?:cancelar|cancela|não quero|nao quero|deixa pra lá|deixa pra la)$/i.test(text)) {
          ghAnexos = [];
          renderAnexos();
          composerInput.value = '';
          if (isDocked()) {
            addDockChatMessage('user', escapeHtml(text));
            addDockChatMessage('ai', 'Pedido descartado. Pode enviar outro comando.');
          }
          return;
        }
        if (text && !/^(?:troqu|substitu|alter|mud|crie|cria|faça|faz|corrij|remov|retir|adicione|coloque)/i.test(text)) {
          commandText = `${pending.prompt} na página ${text.replace(/^(?:(?:é|na|no|a|o|página|tela|aba)\s+)+/i, '').trim()}`;
        } else {
          ghAnexos = [];
          renderAnexos();
        }
      }
    }
    const historyBeforePrompt = auroraHistory.slice();
    const historyScopeBefore = loadedMemoryScope?.key;
    if (isDocked()) {
      const bubble = addDockChatMessage('user', escapeHtml(text || 'Imagem anexada'));
      addSentAttachmentPreviews(bubble);
      if (modo === 'github') auroraRecord('user', text || '[Imagem anexada]');
      showDockThinking();
    }

    if (modo === 'github') {
      if (!ghActiveRepo && !isDocked()) {
        // ainda não escolheu o repositório — abre o card de integração
        // pra concluir a conexão, sem perder o que já foi digitado
        // (só faz isso fora do modo ancorado: ancorado, a Aurora ainda
        // consegue conversar sem repositório nenhum conectado)
        await ghOpen();
        return;
      }
      ghPrompt.value = commandText;
      composerInput.value = '';
      const ok = await ghSendPrompt(true);
      if (!ok && loadedMemoryScope?.key === historyScopeBefore) auroraHistory = historyBeforePrompt;
      setComposerSendState(ok ? 'sent' : 'idle');
      return;
    }

    if (modo === 'db') {
      if (!dbProjectName?.textContent) {
        await dbOpen();
        return;
      }
      // a revisão do SQL antes de aplicar é obrigatória por segurança,
      // então a barra do banco sempre aparece pra essa etapa
      dbState('ready');
      dbPrompt.value = text;
      composerInput.value = '';
      setComposerSendState('loading');
      const ok = await dbGeneratePrompt();
      setComposerSendState(ok ? 'sent' : 'idle');
      if (!ok && await dailyLimitReached()) { composerInput.value = text; return; }
      if (isDocked()) {
        await hideDockThinking();
        addDockChatMessage('ai', ok
          ? 'Gerei o SQL pra esse pedido — dá uma olhada na barra do banco de dados antes de aplicar (nunca aplico sem sua confirmação).'
          : 'Não consegui gerar o SQL pra esse pedido. Dá uma olhada na barra do banco de dados pra ver o motivo.', ok ? 'edit' : 'erro');
      }
      // fica pendente de revisão/confirmação na barra do banco (nunca
      // aplica direto), então deixamos a barra visível pro cliente conferir
      return;
    }

    if (modo === 'lovable') {
      if (!findLovableComposer()) {
        composerNotice('Não encontrei o chat da Lovable nessa aba. Abra o projeto e tente de novo.');
        if (isDocked()) await hideDockThinking();
        return;
      }
      try {
        const auth = await ghAuth();
        const quotaRes = await fetch(cfgUrl('GITHUB_AI_EDIT_FUNCTION', 'github-ai-edit'), {
          method: 'POST', headers: cfgHeaders(), body: JSON.stringify({ ...auth, action: 'consume_prompt' }),
        });
        const quota = await quotaRes.json().catch(() => ({}));
        if (quota.code === 'DAILY_LIMIT') { await markDailyLimit(); return; }
        if (!quota.ok) throw new Error(quota.error || 'Não consegui conferir o limite diário.');
        await recordAiCommand('lovable', text, quota.daily_used);
      } catch (err) {
        ghShowMsg(err?.message || 'Não consegui conferir o limite diário.', true);
        if (isDocked()) { await hideDockThinking(); addDockChatMessage('ai', escapeHtml(err?.message || 'Não consegui conferir o limite diário.'), 'erro'); }
        return;
      }
      composerInput.value = '';
      setComposerSendState('loading');
      const ok = await sendViaLovableNative(text);
      setComposerSendState(ok ? 'sent' : 'idle');
      if (isDocked()) {
        await hideDockThinking();
        addDockChatMessage('ai', ok
          ? 'Mandei esse pedido pro chat nativo da Lovable — ela mesma vai gerar a resposta ali.'
          : 'Não consegui achar o chat da Lovable nessa aba pra mandar o pedido.', ok ? 'edit' : 'erro');
      }
      return;
    }

    // De fato não tem nenhuma integração conectada ainda — avisa de um
    // jeito visível (não só trocando o placeholder, fácil de não notar)
    composerSend?.classList.add('shake');
    setTimeout(() => composerSend?.classList.remove('shake'), 500);
    composerNotice('Escolha "GitHub" ou "Banco de dados" em Modelos pra enviar o comando.');
  }

  composerSend?.addEventListener('click', () => activeEdit ? cancelActiveEdit() : sendFromComposer());
  composerInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!activeEdit) sendFromComposer();
    }
  });

  // ── Refresh / Histórico / Ajuda (menu "...") ───────────────────────
  root.querySelector('#nextRefreshBtn')?.addEventListener('click', () => {
    location.reload();
  });
  root.querySelector('#nextHistoryMenuBtn')?.addEventListener('click', () => {
    root.querySelector('#nextMorePopover').style.display = 'none';
    showPanel('history');
  });
  root.querySelector('#nextHelpBtn')?.addEventListener('click', () => {
    root.querySelector('#nextMorePopover').style.display = 'none';
    window.open('https://wa.me/message/BYSDMLHYTA6EA1', '_blank', 'noopener');
  });

  // ── Target no composer: reaproveita o seletor de elemento do GitHub ──
  root.querySelector('#nextComposerTarget')?.addEventListener('click', startSelection);

  // ── Anexar arquivo no composer: reaproveita o input de arquivo do GitHub ──
  root.querySelector('#nextComposerAttach')?.addEventListener('click', () => ghFileInput?.click());

  // ── Ditar por voz no composer (Web Speech API) ─────────────────────
  const composerMicBtn = root.querySelector('#nextComposerMic');
  let vtxRecognition = null;
  let vtxRecognizing = false;
  composerMicBtn?.addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { composerNotice('Seu navegador não suporta ditado por voz.'); return; }
    if (vtxRecognizing) { vtxRecognition?.stop(); return; }
    vtxRecognition = new SR();
    vtxRecognition.lang = 'pt-BR';
    vtxRecognition.interimResults = false;
    vtxRecognition.maxAlternatives = 1;
    vtxRecognition.onstart = () => { vtxRecognizing = true; composerMicBtn.classList.add('active'); };
    vtxRecognition.onerror = () => {
      vtxRecognizing = false;
      composerMicBtn.classList.remove('active');
      composerNotice('Não foi possível captar o áudio. Verifique a permissão do microfone.');
    };
    vtxRecognition.onend = () => { vtxRecognizing = false; composerMicBtn.classList.remove('active'); };
    vtxRecognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ').trim();
      if (!transcript) return;
      composerInput.value = composerInput.value ? `${composerInput.value} ${transcript}` : transcript;
    };
    try { vtxRecognition.start(); } catch (_) { composerNotice('Não foi possível iniciar o microfone.'); }
  });

  // Aviso rápido no canto da tela. Esta extensão não tinha uma função
  // de toast — a de bloqueio precisava dela, então criamos aqui.
  let toastEl = null, toastTimer = null;
  function showDockToast(texto) {
    if (!toastEl || !document.body.contains(toastEl)) {
      toastEl = document.createElement('div');
      toastEl.id = 'vtx-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = texto;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl?.classList.remove('show'); }, 2600);
  }

  // ══════════════════════════════════════════════════════════════════
  // BLOQUEIO DO CHAT NATIVO DA LOVABLE
  // Evita o cliente mandar comando por engano no chat deles e gastar
  // créditos. O bloqueio é feito com uma camada por cima + intercepção
  // de teclas — sem alterar o DOM da Lovable, então é 100% reversível.
  // ══════════════════════════════════════════════════════════════════
  const shieldBtn = root.querySelector('#nextDockShield');
  // Cada carregamento começa protegido; só o clique libera esta sessão.
  let chatBloqueado = location.hostname === 'lovable.dev';
  let blockOverlay = null;
  let blockPoll = null;

  function acharComposerLovable() {
    if (location.hostname !== 'lovable.dev' || !getLovableProjectId()) return null;
    const sels = [
      '[data-testid="chat-composer"]',
      '[data-testid="chat-input-wrapper"]',
      '#chat-input',
      'form#chat-input',
    ];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && !el.closest('#next-widget-root')) return el;
    }
    // fallback: sobe do textarea até um pai com botões
    const ta = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'))
      .find(e => !e.closest('#next-widget-root') && e.getBoundingClientRect().width > 150);
    if (!ta) return null;
    let el = ta;
    for (let i = 0; i < 6 && el.parentElement; i++) {
      el = el.parentElement;
      if (el.querySelectorAll('button').length >= 2) break;
    }
    return el;
  }

  function posicionarOverlay() {
    const c = acharComposerLovable();
    if (!blockOverlay || !chatBloqueado) return;
    if (!c) { blockOverlay.style.display = 'none'; return; }
    if (!document.body.contains(blockOverlay)) document.body.appendChild(blockOverlay);
    blockOverlay.style.display = 'flex';
    const r = c.getBoundingClientRect();
    Object.assign(blockOverlay.style, {
      left: `${r.left - 4}px`,
      top: `${r.top - 4}px`,
      width: `${r.width + 8}px`,
      height: `${r.height + 8}px`,
    });
  }

  // Intercepta teclas antes de chegarem no chat da Lovable
  function bloquearTecla(e) {
    if (!chatBloqueado) return;
    const c = acharComposerLovable();
    if (!c) return;
    if (c.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function ativarBloqueio() {
    const c = acharComposerLovable();
    // Mantém o bloqueio armado mesmo enquanto a Lovable monta o chat.

    if (!blockOverlay || !document.body.contains(blockOverlay)) {
      blockOverlay = document.createElement('div');
      blockOverlay.id = 'vtx-chat-block';
      blockOverlay.innerHTML =
        '<span class="vtx-block-tag">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">' +
        '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        'Chat bloqueado pelo Vertex Pro</span>';
      document.body.appendChild(blockOverlay);
    }
    // Mostra ANTES de posicionar: se medir enquanto está display:none,
    // as dimensões saem erradas e o overlay não cobre o chat inteiro.
    blockOverlay.style.display = 'flex';
    posicionarOverlay();
    // remede no quadro seguinte, quando o layout já assentou
    requestAnimationFrame(() => requestAnimationFrame(posicionarOverlay));

    // tira o foco caso o cliente já estivesse digitando
    try {
      const ativo = document.activeElement;
      if (ativo && c?.contains(ativo)) ativo.blur();
    } catch (_) {}

    document.addEventListener('keydown', bloquearTecla, true);
    document.addEventListener('keypress', bloquearTecla, true);
    document.addEventListener('paste', bloquearTecla, true);

    // o chat pode se mover (scroll, teclado do celular abrindo)
    if (!blockPoll) blockPoll = setInterval(posicionarOverlay, 400);
    window.addEventListener('scroll', posicionarOverlay, true);
    window.addEventListener('resize', posicionarOverlay);
    return true;
  }

  function desativarBloqueio() {
    if (blockOverlay) { blockOverlay.remove(); blockOverlay = null; }
    document.removeEventListener('keydown', bloquearTecla, true);
    document.removeEventListener('keypress', bloquearTecla, true);
    document.removeEventListener('paste', bloquearTecla, true);
    if (blockPoll) { clearInterval(blockPoll); blockPoll = null; }
    window.removeEventListener('scroll', posicionarOverlay, true);
    window.removeEventListener('resize', posicionarOverlay);
  }

  function aplicarEstadoBloqueio(ligado, avisar) {
    chatBloqueado = !!ligado;
    if (chatBloqueado) {
      ativarBloqueio();
      shieldBtn?.classList.add('ativo');
      shieldBtn?.setAttribute('title', 'Desbloquear o chat da Lovable');
      if (avisar) showDockToast('Chat da Lovable bloqueado.');
    } else {
      desativarBloqueio();
      shieldBtn?.classList.remove('ativo');
      shieldBtn?.setAttribute('title', 'Bloquear o chat da Lovable');
      if (avisar) showDockToast('Chat da Lovable liberado.');
    }
    const label = shieldBtn?.querySelector('span');
    if (label) label.textContent = chatBloqueado ? 'Desbloquear chat' : 'Bloquear chat';
    shieldBtn?.setAttribute('aria-pressed', String(chatBloqueado));
  }

  shieldBtn?.addEventListener('click', () => aplicarEstadoBloqueio(!chatBloqueado, true));

  // Não restaura um desbloqueio antigo: cada abertura começa bloqueada.
  // O polling acompanha montagem tardia e troca de projeto sem liberar o chat.
  aplicarEstadoBloqueio(chatBloqueado, false);

  // Arraste do painel principal
  let dragging = false, offsetX = 0, offsetY = 0;
  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    if (app.classList.contains('docked')) return; // não arrasta no modo ancorado
    dragging = true;
    const rect = app.getBoundingClientRect();
    app.style.right = 'auto'; app.style.bottom = 'auto';
    app.style.left = `${rect.left}px`; app.style.top = `${rect.top}px`;
    offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - app.offsetWidth, e.clientX - offsetX));
    const y = Math.max(0, Math.min(window.innerHeight - app.offsetHeight, e.clientY - offsetY));
    app.style.left = `${x}px`; app.style.top = `${y}px`;
  });
  document.addEventListener('mouseup', () => { dragging = false; });
})();
