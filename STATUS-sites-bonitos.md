# Sites bonitos (backend github-ai-edit)

- Novo `site-design.ts`: detecta pedidos de criar/refazer site ou página e injeta um guia de design moderno (navbar, hero com imagem, cards, galeria, depoimentos, CTA, rodapé, tipografia, cores, responsivo, acessibilidade) no prompt de edição. Pedidos de ajuste pontual continuam com as regras antigas (só um lembrete curto de capricho).
- Imagens: a IA usa fotos de banco gratuito por URL (Unsplash/LoremFlickr). O servidor confere cada URL antes de montar o commit e troca as quebradas por uma foto garantida (picsum).
- Pedidos de criar/refazer site usam o modelo forte do gateway.
- Teste: `node tests/site-design.cjs`. Requer deploy da função `github-ai-edit` (e `NEXA_MODEL` configurado).
