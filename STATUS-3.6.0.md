# Vertex Pro 3.6.0 — painel lateral nativo do Chrome

- Clicar no ícone abre o painel nativo do Chrome (com cabeçalho e X do próprio navegador), como a extensão Nexa Cloud. O chat da Lovable/prévia continua na aba; o painel conversa com ela por mensagens (estado da página, repositório, seleção na prévia, bloqueio do chat).
- Enquanto o painel nativo da aba está aberto, o widget dentro da página fica escondido (volta em ~7 s depois de fechar o painel).
- Celular (Chrome Android não tem `sidePanel`) e falha ao abrir: usa o painel dentro da página, como antes.
- Menu "⋮" do painel: "Abrir dentro da página".
- Novos arquivos: `sidepanel.html`, `sidepanel-boot.js`, `sidepanel.css`. Permissão nova: `sidePanel`.
- Teste: `python3 tests/sidepanel-smoke.py` (Playwright com a extensão carregada). `sidePanel.open` em si só pode ser confirmado no Chrome de verdade.
