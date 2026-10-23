/** Criação de sites: guia de design moderno + imagens reais verificadas pelo servidor. */

const BUILD_VERB = /\b(cri[ae]r?|crie|criar|mont[ae]r?|monte|fa[çc]a|fazer|ger[ae]r?|gere|constru[ai]r?|construa|desenvolv\w*|quero|preciso|adicion[ae]r?|adicione|nov[ao])\b/i;
const BUILD_NOUN = /\b(site|landing|p[áa]gina|pagina|loja|e-?commerce|portf[óo]lio|portfolio|blog|card[áa]pio|dashboard|painel|home|hero|se[çc][ãa]o|secao|galeria|institucional|app|aplicativo|sistema|cat[áa]logo)\b/i;
const REDESIGN = /redesign|redesenh|refa[çc]a o (design|visual|layout)|melhor\w* (o )?(design|visual|layout)|deix\w+ .{0,25}?(bonit|moderno|profissional|elegante|atraente)|\b(feio|feia|simples demais|sem gra[çc]a)\b|\bmoderniz|profissionaliz/i;

export function isSiteBuildRequest(prompt: string): boolean {
  const p = String(prompt || "");
  if (REDESIGN.test(p)) return true;
  return BUILD_VERB.test(p) && BUILD_NOUN.test(p);
}

export const DESIGN_GUIDE = `

MODO CRIAÇÃO/REDESIGN DE SITE (este pedido cria ou refaz páginas): entregue um resultado que pareça feito por um designer profissional, no nível de um site moderno de 2025 — nunca um esqueleto, nunca uma página só de texto. As regras de "só altere o necessário" valem para ajustes pontuais; aqui você pode (e deve) escrever a página inteira, mantendo apenas dados, handlers, rotas e lógica já existentes.
- ESTRUTURA mínima de uma página inicial: (1) navbar fixa/sticky com logo, links e botão de destaque, translúcida (backdrop-blur) e com menu mobile funcional; (2) hero grande (min-h-[80vh]) com imagem de fundo + overlay em gradiente, título enorme (text-4xl md:text-6xl, font-bold, tracking-tight), subtítulo e 2 botões (principal e secundário); (3) faixa de provas/números ou logos; (4) seção de serviços/produtos/benefícios em grade de cards (rounded-2xl, borda suave, sombra, ícone, hover:-translate-y-1 transition); (5) seção sobre com imagem ao lado do texto (alternando lados); (6) galeria ou portfólio; (7) depoimentos; (8) CTA final com fundo de cor/gradiente; (9) rodapé organizado em colunas com contatos e links. Adapte ao tipo de negócio (loja: vitrine de produtos com preço; restaurante: cardápio; consultório: serviços e agendamento; etc.).
- LAYOUT: container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; seções com py-16 md:py-24; muito espaço em branco; grid responsivo (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6/8); mobile-first, sem overflow horizontal. Alterne fundos (branco, cinza muito claro, cor da marca) para dar ritmo.
- COR E TIPOGRAFIA: escolha UMA cor de marca coerente com o assunto (não use roxo→azul genérico por padrão) mais neutros (slate/zinc/stone). Contraste legível (AA). Hierarquia clara: título de seção text-3xl md:text-4xl font-bold, eyebrow pequeno em caixa-alta com a cor da marca acima do título, parágrafos text-base/lg com text-muted/slate-600 e leading-relaxed. Se o projeto já tem tokens de tema (bg-primary, text-foreground, bg-muted, etc.) ou componentes shadcn (Button, Card, Badge), USE-OS; senão use classes Tailwind diretas.
- ACABAMENTO: botões grandes e arredondados com hover/active/focus-visible, transições (transition-all duration-300), sombras suaves, gradientes sutis, selo/badge no hero, cantos arredondados consistentes, ícones lucide-react SOMENTE se já aparecem em imports do projeto (senão use emoji ou SVG inline), scroll-smooth, estados de hover em cards e imagens (group + group-hover:scale-105 com overflow-hidden). Nada de animações pesadas ou bibliotecas novas.
- IMAGENS (obrigatório): use imagens reais em hero, seções e cards (no mínimo 1 hero + 4 outras por página). Prefira primeiro imagens já existentes no projeto ou anexadas. Quando não houver, use fotos de banco gratuito por URL: (a) https://images.unsplash.com/photo-<ID>?auto=format&fit=crop&w=1600&q=80 SOMENTE se tiver certeza absoluta do ID; (b) caso contrário https://loremflickr.com/<largura>/<altura>/<palavra1>,<palavra2>?lock=<n> com 1-2 palavras-chave EM INGLÊS bem específicas do assunto (ex.: pizza,restaurant) e um lock diferente para cada imagem (1,2,3…). O servidor verifica cada URL e troca as quebradas, mas escolha bem as palavras-chave. Use <img> com alt descritivo em português, loading="lazy", className="w-full h-full object-cover", em contêineres com aspect-ratio (aspect-[4/3], aspect-video) e rounded-2xl. Nunca deixe caixas cinza vazias nem placeholders de "imagem aqui".
- CONTEÚDO: textos reais, persuasivos e específicos do assunto, em português do Brasil — nada de "Lorem ipsum", "Título aqui" ou "Seu texto". Nomes, preços e depoimentos de exemplo devem ser plausíveis e fáceis de trocar; não invente dados verificáveis (CNPJ, endereço real, métricas oficiais) e não cite pessoas reais.
- ACESSIBILIDADE: HTML semântico (header, nav, main, section, footer), um único h1, labels em formulários, alt nas imagens, foco visível.
- ORGANIZAÇÃO: divida em componentes (src/components/<Nome>.tsx) e monte na página existente (ex.: src/pages/Index.tsx) seguindo as rotas do projeto; mantenha cada arquivo com imports válidos. Se criar uma página nova, registre a rota no arquivo de rotas existente. Não toque em package.json nem em arquivos de configuração.`;

export const DESIGN_LIGHT = `

DESIGN: ao ajustar o visual, mantenha o padrão existente do projeto, mas capriche — espaçamento generoso, hierarquia tipográfica clara, cantos arredondados e transições suaves. Se o usuário pedir uma imagem, use anexos/caminhos fornecidos ou, na falta deles, uma foto de banco gratuito por URL (https://images.unsplash.com/photo-<ID>?auto=format&fit=crop&w=1200&q=80 só com ID certo; ou https://loremflickr.com/1200/800/<palavras-em-inglês>?lock=<n>).`;

const IMG_URL = /https:\/\/(?:images\.unsplash\.com|loremflickr\.com|picsum\.photos)\/[^\s"'`)<>\\]+/g;

function hashSeed(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function fallbackImageUrl(url: string): string {
  const w = Number(url.match(/[?&]w=(\d{2,4})/)?.[1] || url.match(/\/(\d{3,4})\/(\d{3,4})(?:[/?]|$)/)?.[1] || 1200);
  const h = Number(url.match(/[?&]h=(\d{2,4})/)?.[1] || url.match(/\/(\d{3,4})\/(\d{3,4})(?:[/?]|$)/)?.[2] || Math.round(w * 0.66));
  return `https://picsum.photos/seed/${hashSeed(url)}/${Math.min(w, 2000)}/${Math.min(h, 2000)}`;
}

async function imageWorks(url: string, fetchFn: typeof fetch): Promise<boolean> {
  try {
    const res = await fetchFn(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(5000), headers: { accept: "image/*" } });
    const ok = res.ok && /^image\//i.test(res.headers.get("content-type") || "");
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return ok;
  } catch { return false; }
}

/** Confere as URLs de fotos de banco geradas pela IA e troca as quebradas por uma foto garantida. */
export async function resolveImageUrls(
  files: Array<{ path: string; content: string }>,
  fetchFn: typeof fetch = fetch,
): Promise<{ checked: number; replaced: number }> {
  const urls = new Set<string>();
  for (const f of files) {
    if (!/\.(tsx|jsx|ts|js|html|css)$/.test(f.path)) continue;
    for (const m of f.content.matchAll(IMG_URL)) urls.add(m[0]);
  }
  const list = [...urls].slice(0, 40);
  const bad = new Map<string, string>();
  await Promise.all(list.map(async (u) => {
    if (u.startsWith("https://picsum.photos/")) return;
    if (!(await imageWorks(u, fetchFn))) bad.set(u, fallbackImageUrl(u));
  }));
  if (!bad.size) return { checked: list.length, replaced: 0 };
  for (const f of files) {
    if (!/\.(tsx|jsx|ts|js|html|css)$/.test(f.path)) continue;
    for (const [from, to] of bad) if (f.content.includes(from)) f.content = f.content.split(from).join(to);
  }
  return { checked: list.length, replaced: bad.size };
}
