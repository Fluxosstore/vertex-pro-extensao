# DeepSeek no Vertex Pro

Projeto Supabase: `rprbzaxywzvxhbbejnli` (`next-pro`).

1. Em **Edge Functions > Secrets**, adicione `DEEPSEEK_API_KEY` com uma chave nova da DeepSeek. Não a coloque em `config.js` nem em arquivos da extensão.
2. As funções `github-ai-edit` (versão 96, publicada em 05/10/2026) e `supabase-db` (versão 43) estão ativas com `verify_jwt` ativado. A extensão envia o JWT público do projeto nas chamadas.
3. O modelo padrão é `deepseek-flash` (DeepSeek V4.1 Flash). O backend usa esse modelo inclusive quando uma versão anterior da extensão envia `gpt-4o`, e aceita imagem no fluxo GitHub.
4. Teste um pedido de texto e outro com imagem usando uma licença válida, e a geração de SQL em um projeto de teste. O SQL gerado ainda exige revisão antes de aplicar.
5. Revogue a chave DeepSeek antiga que estava escrita na versão anterior da função `github-ai-edit`, caso seja diferente da chave nova cadastrada nos Secrets.

A extensão mantém GPT-5, Opus 5 e Gemini no menu, além de DeepSeek. Todas as opções enviam os pedidos ao DeepSeek V4.1 Flash pelas Edge Functions; o menu informa isso ao cliente. A extensão continua usando a URL e a chave pública do Supabase em `config.js`; a chave DeepSeek nunca é enviada ao navegador.

Na lista e no estado selecionado do GitHub, apenas o nome final do repositório é exibido (por exemplo, `next-blue-login`). A identificação completa `proprietário/repositório` continua sendo enviada ao backend para selecionar o repositório certo.

A extensão tenta identificar o repositório vinculado à página atual da Lovable: primeiro lê referências ao GitHub na interface, depois consulta a página de configurações Git do projeto e, por fim, usa uma correspondência exata e única entre o nome visível do projeto e o nome do repositório acessível. Uma seleção salva de outro projeto não é reutilizada automaticamente. Se não houver correspondência segura, a lista fica disponível para escolha manual. Essa detecção depende da interface da Lovable e deve ser conferida no projeto real após instalar a extensão.

Ao navegar para outro projeto na mesma aba, a extensão apaga imediatamente a seleção anterior, consulta o repositório do novo projeto e impede o envio ao GitHub até confirmar o novo destino. Se a detecção falhar, mantém o texto digitado e pede a escolha manual.

No Modo Planejamento, `github-ai-edit` (versão 90) devolve a proposta sem commit. A conversa mostra **Aprovar commit** e **Cancelar**. Fora desse modo, o botão de envio vira um quadrado de cancelamento durante a geração e por 6 segundos após a proposta ficar pronta. Só depois desse prazo a extensão envia a confirmação para publicar o commit; durante a publicação, o botão mostra progresso e o cancelamento já não é garantido. A aprovação usa uma autorização assinada, válida por 15 minutos, vinculada à licença, ao dispositivo, ao repositório, à branch, aos arquivos propostos e ao commit base. Se a branch ou o projeto mudar, é necessário gerar outro plano.

Imagens PNG, JPEG, WebP e GIF anexadas podem virar arquivos reais do site. A função indica à IA um caminho fixo em `/vertex-uploads/`, confere que a edição usa esse caminho e grava o binário em `public/vertex-uploads/` no mesmo commit do componente. Um anexo usado só como referência visual não é colocado no site. Planos pendentes incluem o blob da imagem sem alterar a branch antes da aprovação. Alterações antigas que apontam para um arquivo inexistente precisam ser refeitas com a imagem original anexada.

O painel registra um comando e soma R$ 2,00 à economia estimada ao enviar cada pedido para a IA. Respostas de conversa e planos também contam; aprovar ou cancelar o commit depois não envia outro comando e não duplica a contagem. Geração de SQL e envios pelo chat da Lovable também são registrados. O total histórico de comandos fica em `usage_stats` no Supabase por licença e dia; a extensão também mantém um cache local para resposta imediata. A função `license-validate` versão 24 devolve `commands_count` para sincronizar a UI ao validar a Key.

O limite é de 100 prompts por licença a cada dia no horário de Brasília (`America/Sao_Paulo`). A tabela `daily_prompt_usage` e a função `consume_daily_prompt` no Supabase fazem a contagem atômica para Aurora e SQL; a mesma transação incrementa `usage_stats.prompt_count`, consultado pelo painel do site. O modo Lovable e a verificação da prévia também passam pela função de cota. Ao atingir 100, a extensão mostra `limite de prompt diário batidos`, bloqueia novas mensagens e volta a permitir no dia seguinte. No modo Lovable, a extensão consome uma vaga antes de encaminhar o pedido ao chat nativo. O total histórico e a economia continuam acumulados; só a cota diária é zerada.

O nome do secret foi confirmado por captura do painel. Ainda falta testar um pedido real com licença válida para verificar que a chave funciona e tem saldo.

Em 01/10/2026, os logs mostraram respostas JSON interrompidas e vazias na geração de edições. A versão 83 solicita trocas pontuais para arquivos existentes, aplica cada troca somente quando o trecho antigo é único, mantém a validação do arquivo final, aumenta o teto de saída para 16 mil tokens nessa etapa e repete uma vez a geração se a resposta vier vazia ou incompleta. Não publica uma resposta parcial.

A versão 84 amplia a investigação por dependências: lê até quatro arquivos relacionados (imports, componentes que importam o arquivo escolhido e vizinhos) como contexto para a edição. Antes de propor o commit, confere a sintaxe de arquivos JS/TS/JSON e se imports relativos novos apontam para arquivos existentes ou criados na mesma proposta. Quando falha, envia o erro à IA para uma tentativa de correção. A conversa mostra o resumo dessas verificações. Isso não executa build nem testes completos do repositório; a confirmação final ainda depende da prévia/CI do projeto.

A versão 85 oferece **Verificar prévia com DeepSeek** após um commit no GitHub. O cliente abre a prévia atualizada da Lovable, clica no botão e confirma o envio; a extensão captura apenas o retângulo visível do iframe, oculta seu painel na captura, reduz a imagem e envia JPEG pela função Supabase à DeepSeek. O resultado informa se a parte visível parece correta, mostra problemas ou assume incerteza. Uma sugestão de correção preenche a conversa e liga o Modo Planejamento, exigindo novo envio e aprovação antes de outro commit. Cada análise enviada à IA consome um dos 100 comandos diários e incrementa os contadores. A função não armazena a captura em Storage nem no GitHub. O botão não garante que o commit já tenha sincronizado na prévia; aguarde a atualização visual antes de clicar. Teste real em um projeto Lovable autenticado ainda é necessário.

Em 01/10/2026, a soma em `usage_stats` estava parada em 8.699 desde 01/09, embora `daily_prompt_usage` tivesse 10 comandos recentes. A função de consumo foi corrigida para incrementar as duas tabelas em uma transação. Foram recompostos esses 10 comandos e quatro commits auditados em 29/09 por licenças ainda existentes; o total confirmado passou a 8.713. Comandos antigos sem registro central verificável não foram inventados. O site pode precisar atualizar seus dados após a mudança.

A versão 86 corrige o erro `referenceContents is not defined` após gerar a alteração. O número de arquivos de referência lidos é guardado fora do laço de tentativas e usado nas respostas de plano e commit; a versão 85 podia falhar nesse ponto.

A versão 87 aceita imagens PNG, JPEG, WebP ou GIF até 10 MB por arquivo e 20 MB no conjunto de um pedido. O aplicativo também reconhece PNG/JPEG/WebP/GIF escolhidos em celulares que informam um tipo genérico. Após uma tentativa que falhou ou foi cancelada, remove os anexos e o texto da tentativa; no chat ancorado, a tentativa malsucedida e o erro não entram no histórico enviado ao DeepSeek. A mensagem seguinte passa a ser interpretada pelo texto enviado naquele momento. Erros de validação de imagem antes do consumo da cota não aumentam a contagem local. Arquivos de texto continuam limitados a 5 MB. Um teste com licença válida e imagem real no celular ainda é recomendado.

A interface mostra os anexos também acima do campo de mensagem do chat, com uma miniatura maior e botão X. Remover em qualquer um dos dois painéis (chat ou barra GitHub) atualiza a mesma lista do pedido. Depois do envio, a conversa exibe uma miniatura reduzida da imagem enviada. É possível enviar um pedido contendo apenas uma imagem. Anexos só são enviados no modo GitHub; ao selecionar outro modo, o chat pede a troca de modo antes de enviar.

A versão 88 resolve um envio de imagem rejeitado mesmo com corpo de aproximadamente 373 KB: a extensão identifica o formato pelos bytes e tenta converter imagens que o navegador consegue decodificar, como algumas galerias em AVIF/HEIC, para WebP. O servidor também identifica PNG/JPEG/WebP/GIF pelos bytes e normaliza o MIME anunciado. Se o navegador não conseguir ler a imagem, informa o formato aceito antes do envio. A função ignora a chamada de classificação da IA para comandos de edição inequívocos, limita a leitura do mapa do projeto a 25 segundos e distribui no máximo 110 segundos às chamadas de IA. O cliente encerra uma chamada que ultrapassar 120 segundos, remove o indicador de progresso e mostra o erro; um plano ainda não aprovado não publica commit. Os registros do incidente mostraram rejeição HTTP 400 para a imagem e HTTP 504 `IDLE_TIMEOUT` após cerca de 150 segundos para o comando seguinte. Um teste com a imagem original do cliente e licença válida ainda é necessário.

A versão 89 trata a resposta vazia da DeepSeek na escolha de arquivos. Quando um pedido de autenticação aponta inequivocamente para uma página `auth` ou `login`, a função usa esse caminho e ainda valida a edição gerada. Quando o destino é ambíguo, ela continua consultando a IA; a primeira tentativa pede JSON em texto sem `response_format: json_object`, e uma resposta vazia pode disparar uma segunda tentativa curta. A edição também tenta novamente em texto JSON após resposta vazia no modo JSON. O modo de raciocínio é desativado nessas chamadas estruturadas para preservar o orçamento de saída. O registro do incidente mostrou HTTP 502 após a DeepSeek devolver conteúdo vazio; sem um pedido real com licença válida, não é possível garantir que o modelo conclua a edição seguinte.

A versão 90 retira da conversa e do resultado de commit o botão **Verificar prévia com DeepSeek**, remove a captura de tela da extensão e responde `FEATURE_REMOVED` a chamadas antigas desse recurso. A seleção visual de um elemento no iframe da Lovable continua disponível.

A extensão guarda por sete dias, em armazenamento local, o caminho da única página (ou componente de tela) modificada em um commit confirmado, vinculado ao projeto Lovable e ao repositório GitHub. Um plano apenas proposto ou cancelado não altera a lembrança. Num pedido seguinte sem página explícita, o servidor reutiliza o caminho somente se ele ainda existir no repositório; página explicitamente citada e elemento selecionado têm prioridade. Se não houver página lembrada e o pedido de mudança visual for ambíguo, o chat pergunta o nome da página sem chamar a IA nem consumir a cota. A resposta curta do cliente é combinada com o comando original e enviada uma única vez. A lembrança não é recuperada retroativamente de commits anteriores à instalação desta versão; começa no próximo commit confirmado.

A versão 91 reconhece pedidos explícitos para a **página inicial** (inclusive home e landing page) e usa a rota principal quando seu caminho é inequívoco. O pedido de remover uma frase da página inicial passa à inspeção e validação do arquivo, mesmo se a IA de seleção não devolver arquivos. Se houver mais de uma rota inicial igualmente plausível, a função ainda consulta a IA; ela não escolhe uma rota arbitrária. O erro observado anteriormente ocorreu na etapa de seleção de arquivos e não publicou uma alteração.

## Correção de prompts longos e leitura de código — 02/10/2026

A função `github-ai-edit` versão 92 remove o antigo bloqueio de 4.000 caracteres e aceita comandos com até 60.000 caracteres. O comando e os anexos de texto podem somar até 120 KB. Anexos de texto não são mais cortados silenciosamente em 20.000 caracteres.

Arquivos selecionados são lidos integralmente até 200 KB por arquivo, dentro de um orçamento de 300 KB para pedido, histórico e código. Até oito arquivos podem ser selecionados. O limite anterior de 20 KB substituía arquivos relevantes por avisos, impedindo a IA de ler formulários reais. Agora falhas de leitura e excessos de tamanho encerram a tentativa com mensagem explícita antes da geração, sem enviar placeholders. Para arquivos existentes acima de 20 KB, a função exige trocas pontuais e preserva o restante. Só aceita alterações em arquivos selecionados e lidos.

Pedidos compostos com mais de 400 caracteres e pedidos que citam caminhos do projeto passam pela seleção contextual; palavras como “login” em uma restrição não acionam o atalho de escolha de página. Caminhos citados entram prioritariamente na lista de candidatos, e a instrução do seletor exige respeitar as restrições do pedido inteiro. Observações da IA sobre itens pendentes aparecem no chat.

A extensão 3.0.1 inclui ícone de copiar nas respostas, erros e resultados de planos, nos modos compacto e ancorado, com alternativa de cópia para navegadores que bloqueiam a API de clipboard. É necessário instalar/recarregar a extensão e atualizar a aba Lovable para receber o botão; a função no Supabase já atende a versão anterior.

Verificação: testes com APIs simuladas confirmaram comando acima de 4.000 caracteres preservado até o final, código de 90 KB completo, aplicação de troca pontual preservando o restante, geração de plano sem commit, recusa explícita acima dos limites e bloqueio de edição em arquivo não lido. Testes de DOM confirmaram cópia de texto e erros, quebras de linha, atualização de resultados, ausência de botões duplicados e alternativa de clipboard. Sintaxe JS/TS conferida. A execução real do cliente não foi repetida; não foi alterado seu projeto durante a investigação.

## Supabase identificado por projeto Lovable — extensão 3.0.2

Após o OAuth Supabase, a extensão identifica links `https://supabase.com/dashboard/project/REF` na tela Lovable `?view=more&subview=cloud`, fora do próprio painel da extensão. Um único identificador precisa corresponder a um projeto listado pela conta autorizada. O nome exibido vem do Supabase. Nomes iguais não são usados como critério. A associação é salva localmente por licença, dispositivo e projeto Lovable; na primeira identificação pode ser necessário abrir Mais → Cloud. Se o cartão não expuser um link ou houver ambiguidade, continua disponível a seleção manual. Nenhuma API privada da Lovable ou chave secreta do projeto é lida por essa detecção.

Ao navegar para outro projeto, o nome/ref do banco e SQL pendente são limpos. Cada ação de banco envia o ref resolvido para aquela aba; a função `supabase-db` versão 43 valida acesso à ref com a conta autorizada, evitando depender da última seleção global feita em outra aba. A aplicação de SQL exige o mesmo contexto em que foi gerada. Seleções manuais também são lembradas por projeto.

Verificado com DOM e APIs simulados: identificação por ref com nomes iguais, associação salva, troca de projeto, links ambíguos, falta de autorização, nome oficial e destino fixado por requisição. Sintaxe JS/TS verificada. A detecção no DOM autenticado real da Lovable ainda depende do link estar disponível no cartão Cloud dessa versão da interface.

## Bloqueio padrão do chat Lovable — extensão 3.0.3

Cada carregamento da Lovable começa com o bloqueio do chat nativo ativo. O cliente pode liberá-lo pelo item “Desbloquear chat” no menu de três pontos; o desbloqueio dura a sessão da página. Recarregar inicia uma nova sessão bloqueada, inclusive se versões anteriores salvaram a preferência como desativada. O bloqueio aguarda a montagem tardia do composer, acompanha sua posição e oculta a camada quando o composer desaparece. A detecção fica restrita a projetos em lovable.dev. Teste de DOM verificou início bloqueado, montagem tardia, clique para desbloquear/rebloquear, novo carregamento e ausência de bloqueio em outros sites.

## Correção de criação de componentes — 05/10/2026 (publicada na versão 93)

A validação distingue arquivos existentes de novos usando a árvore completa do repositório. Um componente novo proposto durante a geração pode ser incluído com `content` completo mesmo sem aparecer na seleção inicial. Arquivos existentes continuam exigindo seleção e leitura prévias; caminhos com diferença apenas de maiúsculas/minúsculas não são tratados como novos. A correção mantém as verificações de sintaxe, imports, tamanho e revisão do plano. Árvore incompleta, falha de leitura de arquivo existente, caminhos proibidos ou arquivo novo com `edits` são recusados.

O teste de regressão reproduziu a criação de `src/components/IndicationsPanel.tsx` junto à edição de `src/pages/Index.tsx`, e verificou a recusa de arquivos existentes não lidos, colisões de nome, caminhos inválidos, tamanho excessivo, duplicatas e árvore incompleta. Após restabelecer o acesso em 05/10/2026, a correção foi publicada como versão 93 de `github-ai-edit`. A função está ACTIVE e o código remoto foi conferido contra o arquivo local. Esta correção de backend não exige reinstalar a extensão. O pedido real do cliente deve ser reenviado.

## Investigação adicional e execução por etapas — extensão 3.1.0

O agente pode solicitar até quatro arquivos existentes por rodada, em até duas rodadas adicionais. Cada arquivo é lido integralmente no mesmo commit base da proposta. Um arquivo de referência pode ser promovido a arquivo de trabalho; caminhos fora do projeto, configurações protegidas e excesso de contexto são recusados. Mantêm-se oito arquivos de trabalho, 200 KB por arquivo e orçamento de 300 KB de contexto.

A seleção propõe até oito tarefas. A geração pode preparar até três etapas dentro do prazo da requisição, reaproveitando o código atualizado de cada etapa validada. Cada etapa passa pelas verificações existentes de sintaxe e imports. As etapas são reunidas numa única proposta/commit, sem publicar commits intermediários. As chamadas internas adicionais não consomem novos comandos da cota diária.

A conversa mostra tarefas com código preparado e tarefas pendentes, inclusive antes da contagem para publicação automática. Uma proposta parcial sempre exige aprovação manual, mesmo fora do Modo Planejamento. O servidor inclui essa exigência na autorização assinada e recusa confirmação sem reconhecimento explícito da revisão. Nenhuma tarefa é considerada preparada somente por faltar um relatório.

Verificação: `node tests/agent-regression.cjs` (Node 24) exercita o handler completo com serviços simulados: leitura adicional/promoção, snapshot fixado por commit, duas etapas, novo componente, cota única, ausência de commit antes da confirmação e bloqueio de publicação automática de plano parcial. As fixtures usam JavaScript simples; não substituem testes reais num projeto Lovable.

Build/testes de execução ainda não são executados pela extensão. A próxima integração precisa criar uma branch temporária vinculada ao plano, rodar os scripts do projeto num executor isolado/CI, coletar o resultado do commit exato e liberar publicação após revisão. A função atual não oferece esse executor; não foi instalado workflow nem alterado um repositório de cliente nesta entrega.

Publicação: `github-ai-edit` versão 94 ACTIVE, autenticação JWT mantida e código remoto conferido contra o arquivo local. Para ver as etapas e aprovar resultados parciais, instale a extensão 3.1.0 e recarregue a aba Lovable.

## Build/testes reais e recuperação do plano — extensão 3.2.0

O chat oferece **Build e testes antes de publicar**. Ao marcar, o plano exige uma execução válida e aprovação manual; desmarcar depois não remove a exigência de um plano já assinado. As ações de instalar, validar, consultar, cancelar e aprovar não chamam a IA nem consomem comandos adicionais. A preferência passa a ficar ligada após iniciar/ativar uma validação, podendo ser desligada para pedidos futuros.

No primeiro plano, clique **Validar build e testes** e, quando solicitado, **Ativar validação no GitHub**. Este último botão cria um commit contendo somente `.github/workflows/vertex-validation.yml` na branch padrão, com o arquivo fixo incluído em `ci/vertex-validation.yml` neste ZIP. A instalação precisa de permissão para escrever workflows e respeita proteção de branch. Arquivo existente com outro conteúdo não é sobrescrito. Se o token não tiver permissão, a interface permite copiar a configuração e instalá-la manualmente; após instalação manual, gere outro plano. A instalação automática reemite o plano sobre o commit de configuração, preservando as alterações propostas.

Ao validar, o servidor prepara um commit com os arquivos exatos da proposta, sem atualizar a branch do site, e dispara o workflow por `workflow_dispatch`. O runner do GitHub faz checkout desse SHA, instala dependências, executa build e os testes existentes. Não cria branches de teste nem dispara push do código proposto antes da aprovação. A configuração usa runner hospedado, permissão de leitura, credenciais de checkout não persistidas e nenhum secret da aplicação. As execuções usam a cota de GitHub Actions da conta.

Suporte inicial: projetos npm com `package.json`, `package-lock.json` e script `build` na raiz, usando Node 22. Testes usam `test:ci` de preferência ou `test`, com Vitest sem modo watch. Projetos sem script de testes mostram **Build aprovado. Projeto sem testes configurados.**; isso não é apresentado como testes aprovados. Monorepos, outros gerenciadores, versões incompatíveis de Node e builds que exigem variáveis privadas precisam de adaptação antes de usar este workflow fixo. Nenhum secret é copiado automaticamente.

O servidor vincula a execução ao identificador assinado, workflow e commit base. Antes de publicar, consulta novamente os resultados e confirma que a branch não mudou, então publica exatamente o commit testado. Falha, cancelamento, timeout, resposta incompleta ou execução de outro plano bloqueiam publicação. A interface mostra etapas que falharam e link para os logs no GitHub. Ausência de teste é indicada explicitamente; não bloqueia um build válido após revisão manual.

Planos ficam salvos localmente por licença/dispositivo, projeto e repositório. Ao recarregar e reconectar o mesmo projeto, a conversa recupera o plano e consulta a execução em andamento. O runner continua mesmo se a página fechar. Essa recuperação se aplica à fase de validação e aprovação; geração de IA anterior à criação do plano ainda não é um trabalho persistido no servidor. A autorização dura 15 minutos para um plano comum, até uma hora após preparar a validação; o workflow tem limite de 15 minutos e a interface encerra a espera após 20 minutos.

Verificação desta entrega: regressões do agente e do serviço GitHub simulado, publicação bloqueada para build pendente/falho, integridade do plano, mudança de branch, cancelamento, configuração ausente/modificada, permissões, recuperação e isolamento de conta/projeto. Os comandos reais do YAML foram executados localmente em fixtures npm com sucesso, sem testes, build falhando e teste falhando. Não foi disparada uma execução na conta GitHub de um cliente nesta entrega; a validação hospedada depende da ativação no repositório.

Referências técnicas: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event ; https://docs.github.com/en/rest/actions/workflow-runs ; https://github.com/actions/checkout ; https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents .

Publicação da versão 3.2.0: backend `github-ai-edit` versão 95 ACTIVE, JWT mantido, os três arquivos remotos conferidos contra as fontes locais. Nenhum workflow foi instalado automaticamente em repositórios de clientes durante esta entrega; a ativação ocorre pelo botão na extensão.

## Desfazer a última alteração e memória por projeto — extensão 3.3.0

Após um novo commit confirmado pela Aurora, a resposta oferece **Desfazer alteração**. O cliente confirma **Confirmar reversão** para restaurar o código anterior. O servidor emite uma autorização assinada vinculada à licença, dispositivo, repositório, branch, commit publicado e seu pai, válida por sete dias. A reversão cria um novo commit com a árvore anterior, preservando o histórico. Não usa reset nem force-push e não chama a IA, portanto não consome outro comando diário.

Só é possível desfazer a alteração enquanto ela for o último commit da branch. Qualquer alteração posterior da Lovable, de outro cliente ou de um colaborador impede a reversão automática. A atualização usa fast-forward obrigatório para também bloquear uma corrida durante a operação. Uma resposta interrompida pode ser reenviada sem criar outra reversão se o commit de reversão já for o atual. Proteções de branch são respeitadas. O recurso vale para commits novos que retornem a autorização assinada; commits antigos não recebem autorização retroativa. Apenas código e arquivos do repositório são revertidos, não mudanças já executadas no banco de dados.

A conversa guarda localmente as quatro últimas trocas concluídas (até 500 caracteres por mensagem), a página editada e a última autorização de reversão, separadas por licença/dispositivo, repositório e projeto Lovable. O contexto dura sete dias desde a última atividade e mantém até vinte projetos no navegador. Não sincroniza entre dispositivos. Anexos e imagens não são guardados nessa memória. Tentativas que falham não são adicionadas ao histórico persistido. Planos propostos são identificados como ainda não aplicados; aprovação substitui a lembrança do plano pelo resultado confirmado, e cancelamento remove a lembrança da proposta.

Ao mudar de projeto/conta, a extensão carrega somente o contexto correspondente. O backend trata o histórico como contexto e dá prioridade ao comando atual, sem reaplicar pedidos anteriores. **Limpar contexto** apaga a lembrança da conversa/página daquele projeto, mantendo a autorização de reversão. Após desfazer, a memória passa a registrar a reversão e restaura a página lembrada antes da edição. A associação antiga de páginas, que não incluía licença, não é importada para evitar mistura entre contas.

Verificação: handler completo com GitHub simulado confirmou emissão da autorização, reversão, repetição sem duplicação, bloqueio de commits posteriores, branch protegida, licença/dispositivo/repositório incorretos, expiração e ausência de nova cobrança/IA. Testes do armazenamento e interface confirmaram recuperação após reload, limites/expiração, isolamento por projeto e conta, exclusão de tentativas falhas, confirmação explícita para desfazer e limpeza do contexto. Nenhum commit real de cliente foi revertido durante esta entrega.

Publicação da extensão 3.3.0: backend `github-ai-edit` versão 96 ACTIVE, JWT preservado e quatro arquivos remotos conferidos. Reinstale/recarregue a extensão e atualize a aba Lovable para receber o botão de reversão e a memória por projeto.


## Recuperação, comparativo e diagnóstico — extensão 3.4.0

Publicado em 06/10/2026: github-ai-edit v97 ACTIVE, JWT preservado, cinco fontes remotas conferidas. Aplicada tabela vertex_agent_jobs com RLS e acesso exclusivo do serviço.

O envio registra um identificador e prepara a proposta no servidor. Fechar a aba não depende mais de manter a requisição de geração aberta; ao voltar ao mesmo projeto/conta, o cliente consulta o mesmo identificador. Consultas não chamam a IA nem consomem outro comando. Propostas recuperadas exigem aprovação. Cancelar impede a entrega de um resultado tardio e bloqueia a aprovação daquele plano.

A proposta apresenta diferenças por arquivo e os conteúdos completos antes/depois. Comparativos extensos têm resumo explícito, com o código completo disponível em seções expansíveis. O botão Copiar diagnóstico fornece ID, etapas e erro, sem incluir prompt, código ou credenciais.

O resultado é recuperável por 24 horas no mesmo navegador. A geração continua sujeita ao limite de duração da função; interrupções viram erro identificado, sem repetir o pedido automaticamente. Registros expirados são removidos no próximo acesso autenticado ao serviço. Consulte STATUS-3.4.0.md para os testes, limites e publicação. O teste completo na extensão e o build hospedado em repositório de teste ainda não foram executados.


## Correção do limite de leituras — backend v98, 06/10/2026

Corrigida falha em que a mensagem interna sobre duas rodadas de leitura era exibida ao cliente como erro final. A execução agora admite até três rodadas adicionais de leitura de rede, mantém o limite de oito arquivos e o orçamento de contexto/tempo, e reserva a última tentativa de geração para finalizar. Pedidos de arquivos já presentes não consomem outra rodada; arquivos originais lidos no mesmo commit são reutilizados caso o seletor tente outro conjunto. Arquivos de referência podem ser promovidos sem nova leitura de rede.

Ao esgotar a investigação, a instrução de conclusão volta à IA. Se ela insistir em pedir arquivos, uma proposta parcial já validada é preservada e exige revisão manual. Sem código validado, o pedido encerra com READ_CONTEXT_INCOMPLETE e mensagem voltada ao cliente, sem expor a instrução interna. Não publica alterações parciais automaticamente. A consulta de um comando que já falhou não o reexecuta; é necessário enviar um novo pedido para usar a correção.

Verificado com serviços simulados: três leituras seguidas de conclusão, insistência após o limite, preservação de etapa validada, pedidos repetidos do mesmo arquivo, reescolha com reutilização de leitura, uma única cobrança por pedido e ausência de commit automático. Regressões de jobs e validação também passaram. Publicado github-ai-edit v98 ACTIVE com JWT mantido, cinco fontes remotas conferidas. A extensão permanece 3.4.0: esta correção é no servidor e não exige reinstalação.


## 3.5.0 — Motor Aurora

Backend github-ai-edit v99 publicado em 07/10/2026. Leia STATUS-3.5.0.md para funcionamento, testes e limitações. O motor fica ativo por padrão na extensão nova; requer validação do commit candidato pelo workflow GitHub Actions antes da aprovação. Skills personalizadas podem ser instaladas por JSON por projeto.
