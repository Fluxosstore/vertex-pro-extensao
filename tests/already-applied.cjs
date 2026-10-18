// node tests/already-applied.cjs — o aviso "já foi aplicada" não pode aparecer quando a IA só pede informação.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const src = fs.readFileSync(path.join(__dirname, '../supabase/functions/github-ai-edit/index.ts'), 'utf8');
const start = src.indexOf('function looksAlreadyApplied');
const end = src.indexOf('\nasync function handleCommand', start);
const fn = new Function(stripTypeScriptTypes(src.slice(start, end)) + '; return looksAlreadyApplied;')();
const askedInfo = "Não consegui atender o pedido porque não foi informado qual ícone deve substituir o selecionado. Me diga qual ícone você quer (ex.: 'Square' do lucide-react, que já está importado no projeto). Nada foi alterado nesta execução.";
assert.equal(fn(askedInfo), false);
assert.equal(fn('Qual ícone você quer usar? O lucide-react já está instalado.'), false);
assert.equal(fn('O texto já foi trocado para "Nexus Lovable" no arquivo.'), true);
assert.equal(fn('O título já está com o texto pedido.'), true);
assert.equal(fn('A alteração já está aplicada.'), true);
assert.equal(fn(''), false);
console.log('PASS: aviso de alteração já aplicada só quando a IA afirma isso; pedidos de informação seguem como pergunta.');
