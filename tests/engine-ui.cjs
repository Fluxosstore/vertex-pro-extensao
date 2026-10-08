const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const content=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const source=content.slice(content.indexOf('  async function readEngineOptions()'),content.indexOf('  let modoPlanoAtivo = false;'));
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{assert.equal((await ctx.readEngineOptions()).auroraEngine,true);assert.equal((await ctx.readEngineOptions()).auroraSkills,undefined);for(const id of ['nextSkillInstall','nextSkillFile','nextEngineToggle','nextBuildToggle'])assert(!content.includes(id));console.log('PASS: automatic engine, no client skill installation or toggles.');})().catch(e=>{console.error(e);process.exit(1)});
