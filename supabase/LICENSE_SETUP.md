# Configuração

A extensão usa o projeto Supabase `rprbzaxywzvxhbbejnli`.

## Edge functions usadas (já publicadas)
- `license-validate` — valida a chave e vincula ao dispositivo
- `github-oauth` — conecta/desconecta a conta GitHub (por dispositivo)
- `github-repos` — lista e seleciona repositório
- `github-ai-edit` — gera a alteração e faz o commit

## Esquema da tabela `licenses`
`key`, `plan`, `status`, `expires_at`, `device_id`, `account_name`

A função `license-validate` é retrocompatível: aceita tanto
`{ key, device_id }` (extensão 5.x) quanto `{ licenseKey, deviceId }`
(esta extensão), e responde com `ok` e `success` ao mesmo tempo.
