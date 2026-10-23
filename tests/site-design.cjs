const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const src=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/github-ai-edit/site-design.ts'),'utf8')).replace(/^export /gm,'');
const ctx={AbortSignal,fetch:undefined};vm.createContext(ctx);vm.runInContext(src+';this.api={isSiteBuildRequest,resolveImageUrls,fallbackImageUrl,DESIGN_GUIDE}',ctx);
const {isSiteBuildRequest:b,resolveImageUrls:r,fallbackImageUrl:fb,DESIGN_GUIDE:g}=ctx.api;
(async()=>{
 for(const p of ['crie um site para minha padaria','Monte uma landing page de advocacia','faça uma página de contato','deixe o site mais bonito','quero uma loja de roupas','o site está feio, refaça o design'])assert(b(p),p);
 for(const p of ['troque o texto do botão para Comprar','mude a cor do título para azul','corrija o erro no formulário'])assert(!b(p),p);
 assert(g.includes('IMAGENS')&&g.includes('loremflickr'));
 assert.match(fb('https://images.unsplash.com/photo-x?w=1600&q=80'),/^https:\/\/picsum\.photos\/seed\/[a-z0-9]+\/1600\/1056$/);
 const good='https://images.unsplash.com/photo-good?w=800',bad='https://images.unsplash.com/photo-bad?w=800';
 const fetchFn=async u=>u===good?{ok:true,headers:{get:()=> 'image/jpeg'},body:{cancel(){}}}:{ok:false,status:404,headers:{get:()=> 'text/html'},body:null};
 const files=[{path:'src/A.tsx',content:`<img src="${good}"/><img src="${bad}"/><img src="${bad}"/>`},{path:'src/b.md',content:bad}];
 const out=await r(files,fetchFn);assert.equal(out.replaced,1);assert(!files[0].content.includes(bad));assert(files[0].content.includes(good));assert(files[0].content.includes('picsum.photos'));assert.equal(files[1].content,bad);
 const thrown=await r([{path:'x.tsx',content:`"${bad}"`}],async()=>{throw Error('rede')});assert.equal(thrown.replaced,1);
 console.log('PASS: site-build detection, design guide, broken stock-image URLs replaced.');
})().catch(e=>{console.error(e);process.exit(1)});
