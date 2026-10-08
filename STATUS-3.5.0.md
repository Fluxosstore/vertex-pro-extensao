# Vertex Pro 3.5.0 — Motor Aurora v1

Publicado em 07/10/2026: função github-ai-edit v99 ACTIVE, verify_jwt=true. Os seis arquivos foram recuperados e conferidos byte a byte. Chamada HTTP real sem licença foi recusada; nenhum comando de cliente foi executado.

## O que foi construído

O motor executa no backend. A extensão envia o pedido atual e skills declarativas do projeto; acompanha eventos reais e apresenta a proposta, revisão, tokens informados e controles de validação/publicação. O motor continua usando a API DeepSeek configurada; não treina outro modelo nem cria consciência.

1. Coordenador: conecta seleção de arquivos e tarefas ao registro de skills. Reutiliza a investigação, contexto por projeto e etapas já existentes. Skills internas de interface e qualidade são sempre selecionadas; autenticação, dados e imagens entram conforme os sinais do pedido/contexto.
2. Skills versionadas: cinco internas e até quatro personalizadas por conta/dispositivo, repositório e projeto, instaladas por JSON no painel. Skills personalizadas são instruções limitadas, não plugins executáveis; não concedem shell, SQL, tokens ou permissão de publicação. Permanecem neste navegador; não há sincronização entre dispositivos.
3. Implementador: lê código em snapshot fixo, solicita contexto adicional, prepara mudanças e passa pelas verificações existentes de sintaxe, imports, tamanho e edição exata.
4. Revisor independente: outra chamada ao modelo recebe pedido e antes/depois completos. Resposta inválida/timeout/contexto grande resulta em revisão incompleta, nunca em aprovação automática. Problemas concretos retornam ao implementador; há no máximo duas chamadas ao revisor e tentativas limitadas de reparo. A revisão é uma avaliação por IA, não prova de correção.
5. Validação: com o motor ligado, o servidor assina planos exigindo GitHub Actions. O cliente não remove essa exigência omitindo o toggle na confirmação. A aprovação fica bloqueada até validação bem-sucedida do commit candidato. Se o workflow não estiver instalado, o cliente recebe os controles existentes para instalá-lo. Testes são executados quando o projeto os configura; a ausência é indicada explicitamente.
6. Acompanhamento: lista de eventos reais, skills/versões, findings do revisor, total de chamadas e tokens reportados. Sem estimativa monetária inventada e sem exposição de raciocínio interno. O resultado continua recuperável pelo ID original sem nova cobrança do comando.

## Uso

Atualize a extensão para 3.5.0 e recarregue a aba Lovable. Abra **Motor Aurora · skills e revisão**. O motor fica ligado por padrão nesta versão. É possível desativá-lo; a preferência anterior de validação avulsa é preservada.

Em **Baixar modelo**, obtenha o JSON de uma skill. Edite nome, versão e instruções e use **Instalar skill JSON**. O id deve começar com `custom-`; cada skill aceita até 2.500 caracteres. O botão × remove a skill do projeto. Não coloque chaves ou senhas nas instruções: elas serão enviadas ao modelo junto do pedido.

## Limites e etapas ainda necessárias

- O worker atual continua sendo uma Edge Function com orçamento de execução de 110 segundos e detecção de interrupção do job. Não há worker persistente com retomada de cada ferramenta após queda do processo.
- Máximo de 12 chamadas de IA por execução; o motor interrompe novas chamadas após atingir 250 mil tokens informados pelo provedor. Essa verificação ocorre entre chamadas, não prevê o custo da próxima resposta. Se o provedor não informar usage, a interface indica contagem parcial. Não há orçamento em reais por cliente.
- A revisão recebe até 420 KB de pedido/antes/depois. Contexto maior ou prazo insuficiente exige revisão manual. Mantidos os limites de arquivos, anexos, etapas e leitura existentes.
- O ambiente isolado disponível é o workflow GitHub Actions de build/testes. Ainda não há terminal interativo para o agente nem ambiente gráfico/browser próprio para explorar o site.
- A skill de dados reconhece dependências de backend, mas este executor GitHub não executa SQL nem confirma registros de usuários. O modo de banco autorizado já existente permanece separado.
- Autocorreção nesta versão corrige **as mudanças preparadas para o projeto do cliente**. Não altera nem publica o próprio código da Aurora. O ciclo de autodesenvolvimento do motor (reprodução, patch em branch separada, avaliações, aprovação e rollout/rollback) ainda requer um repositório do próprio motor e um executor persistente configurados. Não foi ativado nesta entrega.

## Verificação

Testes locais com serviços simulados: revisão aprovada, reparo seguido de nova revisão, reprovação repetida, JSON inválido, orçamento e timeout, validação de skills, isolamento por cliente/projeto, mudança de projeto durante upload, XSS na apresentação, contagem de tokens e bloqueio do commit sem CI. Reexecutados testes de geração, jobs, recuperação, validação, reversão, memória e comparativo; sem regressões encontradas.

Nenhum prompt real de cliente ou credencial privada foi usado para os testes. O fluxo completo hospedado no GitHub e a interface em navegador Android ainda precisam de teste real. O pacote contém fontes e testes; não há garantia de equivalência a um agente com ambiente de desenvolvimento completo.

Contagem de tokens segue os campos `usage.prompt_tokens` e `usage.completion_tokens` da documentação oficial: https://api-docs.deepseek.com/api/create-chat-completion/ .
