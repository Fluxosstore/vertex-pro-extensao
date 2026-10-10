# Vertex Pro 3.5.5

- Seleção de imagem por src/currentSrc/alt e referência de configuração, incluindo listas mapeadas. Classes genéricas não bastam. Destinos repetidos ou não identificados são interrompidos sem editar outro local. Captura inclui alt e currentSrc. Leitura inicial limitada a 64 candidatos, em lotes de seis e sob o prazo da execução.
- Elemento selecionado compartilhado com implementador e revisor. Binários em public/vertex-uploads são descritos como preparados pelo servidor para o commit aprovado.
- Publicação registrada no resultado do job após atualizar a branch: SHA, link, data e evento published. Repetir confirmação já registrada retorna o recibo; cancelar comando publicado orienta reversão. Status ready permanece por compatibilidade do schema, stage published distingue a publicação. Histórico dura conforme retenção existente (24h); comandos anteriores não são reclassificados. Falha de auditoria após commit é explicitada sem informar falsamente falha na publicação.
- Planos sem validação obrigatória não exibem controles de build. Modo Planejamento e revisão de entregas parciais permanecem.
- Não foi feita publicação no projeto de nenhum cliente nem validação visual do site do cliente.
