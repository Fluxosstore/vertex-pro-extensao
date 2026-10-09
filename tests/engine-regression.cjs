const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{stripTypeScriptTypes}=require('node:module');
const context={Date,TextEncoder,Set,JSON,Error};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/github-ai-edit/aurora-engine.ts'),'utf8').replace(/^export /gm,'')),context);
const ui={};vm.createContext(ui);vm.runInContext(fs.readFileSync(path.join(__dirname,'../aurora-engine-ui.js'),'utf8'),ui);
(async()=>{
 const skill={id:'custom-accessibility',name:'Acessibilidade',version:'1.0.0',instructions:'Preserve rótulos.'};
 for(const validate of [context.validateAuroraSkills,ui.VertexAuroraEngine.validate]){
  assert.equal(validate([skill])[0].id,skill.id);
  for(const invalid of [[{...skill,tools:['shell']}],[{...skill,instructions:'x'.repeat(2501)}],[skill,skill],[{...skill,id:'react'}]])assert.throws(()=>validate(invalid));
 }
 let engine=context.createAuroraEngine({auroraEngine:true,prompt:'Corrija login e usuário no banco',auroraSkills:[skill]},Date.now()+110000);
 assert(engine.snapshot().skills.some(s=>s.id==='auth'));assert(engine.snapshot().skills.some(s=>s.id==='data'));assert.equal(engine.customContext,'');assert(!engine.snapshot().skills.some(s=>s.id.startsWith('custom-')));
 for(const id of ['reasoning','coding','debugging','design','seo','quality'])assert(engine.snapshot().skills.some(s=>s.id===id));
 const defaults=context.createAuroraEngine({auroraEngine:false,auroraSkills:[{tools:['shell']}],prompt:'Troque o texto'},Date.now()+110000);assert(defaults.enabled);assert.equal(defaults.snapshot().skills.length,10);
 for(let i=0;i<12;i++){engine.beginCall();engine.usage({prompt_tokens:10,completion_tokens:5});}assert.throws(()=>engine.beginCall(),/orçamento/);assert.equal(engine.snapshot().usage.prompt_tokens,120);
 engine=context.createAuroraEngine({auroraEngine:true,prompt:'x'},Date.now()+1000);let calls=0;
 assert.equal((await engine.review([{path:'a',content:'x'}],{a:'y'},async()=>{calls++;return '{}'})).status,'incomplete');assert.equal(calls,0);
 engine=context.createAuroraEngine({auroraEngine:true,prompt:'x'},Date.now()+110000);
 assert.equal((await engine.review([{path:'a',content:'x'}],{a:'y'},async()=>JSON.stringify({verdict:'pass',findings:[{path:'outside',severity:'warning',message:'x'}]}))).status,'incomplete');
 assert.equal((await engine.review([{path:'a',content:'x'}],{a:'y'},async()=>JSON.stringify({verdict:'pass',findings:[{path:'a',severity:'blocking',message:'x'}]}))).status,'incomplete');
 // Asset existence is established by the server inventory, not by omitted code excerpts.
 for(const complete of [true,false]) {
  const e=context.createAuroraEngine({prompt:'Use fotos reais'},Date.now()+110000);
  const result=await e.review([{path:'quiz.tsx',content:'const photos=["/assets/present.jpg","/assets/missing.jpg","/assets/upload.png"];'}],{},async(system,user)=>{
   const payload=JSON.parse(user);assert.equal(payload.assets.complete,complete);assert(payload.assets.paths.includes('public/assets/upload.png'));
   assert(system.includes('são warning'));return JSON.stringify({verdict:'block',findings:[{path:'quiz.tsx',severity:'blocking',message:'Foto obrigatória ausente.'}],missing_assets:['public/assets/present.jpg','public/assets/missing.jpg','public/assets/upload.png','public/assets/invented.jpg','public/../secret.jpg']});
  },{assets:{complete,paths:['public/assets/present.jpg','public/assets/upload.png']}});
  assert.equal(result.status,'blocked');assert.equal(JSON.stringify(result.missing_assets),JSON.stringify(complete?['public/assets/missing.jpg']:[]));
 }
 const warning=context.createAuroraEngine({prompt:'Ajuste grid'},Date.now()+110000);
 assert.equal((await warning.review([{path:'grid.tsx',content:'const unused=1;'}],{},async()=>JSON.stringify({verdict:'pass',findings:[{path:'grid.tsx',severity:'warning',message:'Limpeza opcional.'}]}))).status,'passed');
 const html=ui.VertexAuroraEngine.render({version:'1',skills:[{name:'<img src=x>',version:'1'}],review:{status:'passed',findings:[{path:'<script>',message:'<svg onload=x>'}]},usage:{requests:1,complete:false},events:[{stage:'<script>'},{stage:'reviewing'}]});
 assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(html.includes('parcialmente'));assert(html.includes('Revisor independente'));assert(html.includes('etapa separada'));
 console.log('PASS: skill schema/tool boundary, request budget, timeout, reviewer schema fail-closed, honest token reporting, escaped UI.');
})().catch(e=>{console.error(e);process.exit(1)});
