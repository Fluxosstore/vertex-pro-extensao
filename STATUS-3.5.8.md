# Vertex Pro 3.5.8

- Novo cartão "PENSANDO..." no chat: contador de segundos, "Ver detalhes"/"Ocultar detalhes", botão Cancelar e lista de etapas reais (check verde nas concluídas, círculo girando na atual, tempo por etapa).
- Respostas com rótulo AURORA, hora e botões "Ver detalhes" (como ela pensou), "N arquivos" e copiar.
- Correções no servidor (função github-ai-edit): imagens externas com query string (ex.: pravatar.cc/100?img=11) são identificadas pela URL completa; aprovação de planos com imagem anexada não falha mais por ordem de chaves do jsonb.
- Sintaxe verificada e testes de regressão executados; engine-regression.cjs já falhava antes (texto "etapa separada" não existe mais na interface).
