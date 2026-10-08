// Exercise installed skills across account/repository/project changes using real UI handlers.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const content=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const source=content.slice(content.indexOf('  let auroraEngineActive=true;'),content.indexOf('  let modoPlanoAtivo = false;'));
const saved={},elements={};let owner='owner-a',project='p-a';
const node=id=>elements[id]??=( {checked:false,disabled:false,innerHTML:'',textContent:'',addEventListener(type,fn){this[type]=fn;},click(){}} );
const ctx={console,Blob,URL,setTimeout,Error,document:{createElement:()=>({click(){}})},
 chrome:{storage:{local:{get:async key=>({[key]:saved[key]}),set:async data=>Object.assign(saved,structuredClone(data))}}},
 root:{querySelector:node},planOwner:async()=>owner,ghActiveRepo:'owner/repo',repoResolvedProjectKey:project,getProjectContextKey:()=>project,validarBuildAtivo:false,
 escapeHtml:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;')};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../aurora-engine-ui.js'),'utf8'),ctx);vm.runInContext(source,ctx);
const skill={id:'custom-layout',name:'Layout',version:'1.0.0',instructions:'Preserve espaçamentos.'};
const upload=async(raw,read=()=>JSON.stringify(raw))=>node('#nextSkillFile').change({target:{files:[{size:100,text:async()=>read()}],value:'fake'}});
(async()=>{
 let options=await ctx.readEngineOptions();assert(options.auroraEngine);assert(node('#nextBuildToggle').disabled);assert(node('#nextBuildToggle').checked);
 await upload([skill]);options=await ctx.readEngineOptions();assert.equal(options.auroraSkills.length,1);assert(node('#nextSkillStatus').textContent.includes('instalada'));
 project='p-b';ctx.repoResolvedProjectKey=project;assert.equal((await ctx.readEngineOptions()).auroraSkills.length,0);
 project='p-a';ctx.repoResolvedProjectKey=project;owner='owner-b';assert.equal((await ctx.readEngineOptions()).auroraSkills.length,0);owner='owner-a';
 await upload([{...skill,tools:['exec']}]);assert(node('#nextSkillStatus').textContent.includes('inválida'));assert.equal((await ctx.readEngineOptions()).auroraSkills.length,1);
 await upload([skill],()=>{project='p-b';ctx.repoResolvedProjectKey=project;return JSON.stringify([skill]);});assert(node('#nextSkillStatus').textContent.includes('projeto mudou'));assert.equal((await ctx.readEngineOptions()).auroraSkills.length,0);
 project='p-a';ctx.repoResolvedProjectKey=project;await node('#nextEngineSkills').click({target:{closest:()=>({dataset:{removeSkill:'custom-layout'}})}});assert.equal((await ctx.readEngineOptions()).auroraSkills.length,0);
 await node('#nextEngineToggle').change({target:{checked:false}});assert.equal((await ctx.readEngineOptions()).auroraEngine,false);assert(!node('#nextBuildToggle').disabled);assert(!node('#nextBuildToggle').checked);
 console.log('PASS: default CI gate, skill install/remove, owner/project isolation, invalid tool-grant rejection, project change during upload, disable preserves standalone build preference.');
})().catch(e=>{console.error(e);process.exit(1)});
