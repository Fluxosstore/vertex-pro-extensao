# Vertex Pro 3.4.0 — publicada em 06/10/2026

Backend github-ai-edit versão 98 ACTIVE, com verify_jwt=true. Tabela privada de acompanhamento aplicada. Os cinco arquivos publicados foram recuperados e conferidos byte a byte contra o código local. Este pacote substitui a extensão 3.3.0; atualize a extensão e recarregue a aba Lovable.

## Implementado nesta etapa

- Item 4: geração em segundo plano com EdgeRuntime.waitUntil, identificador idempotente, estado/resultado persistidos em tabela privada e recuperação no mesmo navegador, conta e projeto. Consultar não reenvia o prompt nem consome outra cota. Cancelamento descarta a proposta e bloqueia aprovação do plano cancelado.
- Item 5: comparativo por arquivo com adições/remoções e conteúdos completos antes/depois; arquivos novos identificados. Mantido o botão de desfazer da 3.3.0.
- Item 7: identificador por pedido, etapas reais, horário e erro copiáveis, com ocultação de tokens. O diagnóstico não inclui prompt, anexos, código nem credenciais.

A geração tem orçamento de tempo limitado; waitUntil não transforma a função em worker ilimitado. Se o servidor interromper o processo, a consulta seguinte identifica a interrupção após 140 segundos. Não há reexecução automática. O resultado fica recuperável por 24 horas; registros expirados são removidos na próxima requisição autenticada de comandos. Ainda não há agendamento de limpeza independente do tráfego. Propostas podem conter código do repositório, protegido por ausência de privilégios anon/authenticated e acesso exclusivamente via backend autenticando licença/dispositivo/projeto.

O ticket local guarda somente um resumo de até 500 caracteres do pedido para apresentar o histórico. Anexos e o prompt de entrada completo não são persistidos na tabela. O processamento recebe o pedido completo em memória. A proposta recuperada exige aprovação; não publica por conta própria. Propostas já em validação mantêm o checkpoint salvo e não são substituídas por um plano novo ao reabrir.

## Verificado localmente

Executados os testes de agente, jobs, jobs-ui, comparativo, validação, validação-ui, reversão, memória e memória-ui. Os testes usam serviços simulados. O workflow-smoke executou de verdade os passos npm em fixtures locais: sucesso, ausência de testes, build falhando e teste falhando. Não houve alteração em repositórios reais de clientes nem teste hospedado de GitHub Actions.

## Publicação e verificações no Supabase

A conexão foi restabelecida. Antes de publicar, a versão remota 96 foi comparada com a alteração preparada; os auxiliares de validação e reversão foram preservados. Aplicado `supabase/schema/agent-jobs.sql` e publicada a função com index.ts, agent-jobs.ts, plan-validation.ts, validation-workflow.ts e undo-commit.ts.

Confirmados RLS habilitado e forçado, ausência de SELECT para anon/authenticated e acesso de serviço. Uma transação de teste inseriu um comando, verificou a restrição de uma execução ativa por licença/dispositivo e salvou um resultado. Tudo foi revertido: nenhum registro de teste permaneceu.

O advisor registrou a ausência de políticas da tabela como informação: é intencional, pois somente o backend de serviço deve acessá-la. Também apontou avisos preexistentes em funções de licença/estatísticas, fora desta alteração. Referências: [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [search_path de funções](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) e [funções SECURITY DEFINER públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Esses avisos antigos não foram tratados como uma autorização para alterar contratos da API existente.

Uma chamada HTTP real a job_status sem licença retornou 400 com a mensagem esperada, confirmando o novo endpoint e a barreira de autenticação. Nenhum comando de IA foi consumido nesse teste.

Ainda falta validar o fluxo completo com um comando real na extensão e executar o build hospedado em um repositório de teste definido. Os testes locais simulam os serviços externos; não houve mudança em projeto de cliente para testar esta publicação.

## Pesquisa separada: autorização Lovable MCP

A autorização enviada pelo usuário pertence ao Claude. A Vertex precisa do próprio fluxo OAuth; não reaproveitar client_id, redirect_uri, state nem code_challenge do Claude. A documentação oficial aceita clientes locais com callback localhost automaticamente e exige aprovação Lovable do endereço de retorno de clientes web/hospedados. O MCP expõe leitura de código, chat do agente e SQL no Cloud; o catálogo consultado não documenta escrita direta de arquivos. Pedidos de edição pelo agente consomem créditos Lovable. Nenhuma integração OAuth Lovable foi implementada nesta etapa.

Fontes consultadas: https://docs.lovable.dev/integrations/lovable-mcp-server ; https://lovable.dev/mcp ; https://github.com/lovablelabs/mcp ; https://supabase.com/docs/guides/functions/background-tasks .


Atualização de 06/10/2026: corrigido o encerramento prematuro por limite de leituras adicionais. Detalhes e testes na seção final de DEEPSEEK_SETUP.md. Extensão permanece 3.4.0; correção aplicada no servidor.
