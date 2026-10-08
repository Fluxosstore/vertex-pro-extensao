> Atualização 3.5.1: motor Aurora sempre ativo; skills nas configurações; novos comandos sem exigência de build/CI. Veja STATUS-3.5.1.md.

# Vertex Pro — extensão e Motor Aurora

Repositório privado da extensão Vertex Pro 3.5.0. Importação do pacote entregue em 07/10/2026, preservando seus 43 arquivos.

## Estrutura

- `manifest.json`, `content.js`, `content.css`, `background.js`: extensão Chrome.
- `aurora-engine-ui.js`, `project-memory.js`, `code-review.js`: skills, acompanhamento, memória e comparação de alterações.
- `supabase/functions/`: fontes das funções backend incluídas no pacote.
- `supabase/schema/`: definição da tabela de acompanhamento dos comandos.
- `tests/`: verificações locais com serviços externos simulados.
- `ci/vertex-validation.yml`: template de validação para projetos de clientes; não publica esta extensão.

## Instalar a extensão

Baixe e extraia este repositório. No Chrome, abra a página de extensões, ative o modo de desenvolvedor e carregue a pasta que contém `manifest.json` como extensão descompactada. Recarregue a aba da Lovable após atualizar.

## Testes locais

Use Node.js 24 ou superior:

```bash
for test_file in tests/*.cjs; do node "$test_file" || exit 1; done
```

O teste opcional `python3 tests/workflow-smoke.py` usa npm em fixtures locais. Os testes simulados não substituem a validação hospedada do GitHub nem o teste no navegador Android.

## Backend e evolução

A versão importada corresponde ao Motor Aurora v1 e às fontes entregues com `github-ai-edit` v99. Criar um commit neste repositório não publica funções no Supabase nem atualiza automaticamente a extensão instalada.

Leia `STATUS-3.5.0.md` e `DEEPSEEK_SETUP.md` antes de alterar ou publicar. O motor tem skills declarativas, revisão independente e reparos limitados; ainda não possui worker persistente com terminal/navegador nem autoatualização do próprio código.

Mantenha mudanças futuras em branches e revise os testes e o diff antes de publicar. Chaves privadas ficam nos secrets do servidor; não coloque secrets de produção no Git. `config.js` contém a configuração pública utilizada pela extensão.
