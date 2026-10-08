const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const helpers=source.slice(source.indexOf('  const projectMemoryStore ='),source.indexOf('  function messageCopyText('));
const pageHelpers=source.slice(source.indexOf('  function inferEditedPage('),source.indexOf('  function hasNamedPage('));
const memory=fs.readFileSync(path.join(__dirname,'../project-memory.js'),'utf8');
const data={};const storage={get:async k=>structuredClone(k===null?data:{[k]:data[k]}),set:async d=>Object.assign(data,structuredClone(d)),remove:async k=>delete data[k]};
function session(){
 let project='a',owner='owner-a',click,clear;const messages=[],notices=[],requests=[];
 const area={innerHTML:'',hidden:true,scrollIntoView(){}};const label={textContent:''};
 const ctx={TextEncoder,AbortSignal,crypto:require('node:crypto').webcrypto,chrome:{storage:{local:storage}},Date,
 ghActiveRepo:'owner/repo',getProjectContextKey:()=>project,planOwner:async()=>owner,
 escapeHtml:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;'),auroraHistory:[],pendingClarification:null,activeEdit:null,
 root:{querySelector:selector=>selector==='#nextMemoryClear'?{addEventListener:(type,fn)=>clear=fn}:selector==='#nextMemoryStatus'?label:area,querySelectorAll:()=>[area],addEventListener:(type,fn)=>click=fn},
 composerNotice:t=>notices.push(t),isDocked:()=>true,ghAuth:async()=>({licenseKey:'fake',deviceId:'fake'}),cfgUrl:()=>'',cfgHeaders:()=>({}),
 fetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return{json:async()=>({ok:true,commit_sha:'e'.repeat(40),commit_url:'https://github.com/owner/repo/commit/'+'e'.repeat(40)})}},
 addDockChatMessage:(...args)=>messages.push(args)};
 vm.createContext(ctx);vm.runInContext(memory,ctx);vm.runInContext(pageHelpers+helpers,ctx);
 return {ctx,area,label,requests,notices,setProject:p=>project=p,setOwner:o=>owner=o,clear:()=>clear(),click:(type,sha)=>click({target:{closest:()=>({classList:{contains:c=>c===type},dataset:{commitSha:sha}})}})};
}
(async()=>{
 let s=session(),scope=await s.ctx.ensureAuroraMemory();await s.ctx.saveSuccessfulTurn(scope,'Cor da auth','Concluído');
 const commit={commit_sha:'c'.repeat(40),undo_token:'signed',files_changed:['src/pages/Auth.tsx']};
 await s.ctx.rememberCommitResult(commit,'owner/repo','a','Troque a cor',scope);assert(!s.area.hidden);assert(s.label.textContent.includes('Auth.tsx'));
 s.ctx.auroraHistory.push({role:'user',content:'FAILED IMAGE REQUEST'}); // Failed turns never call the durable-success recorder.
 s=session();scope=await s.ctx.ensureAuroraMemory();assert(!s.ctx.auroraHistory.some(m=>m.content.includes('FAILED')));assert(s.area.innerHTML.includes('Desfazer alteração'));
 s.setProject('b');await s.ctx.ensureAuroraMemory();assert.equal(s.ctx.auroraHistory.length,0);assert(s.area.hidden);
 s.setProject('a');s.setOwner('owner-b');await s.ctx.ensureAuroraMemory();assert.equal(s.ctx.auroraHistory.length,0);assert(s.area.hidden);
 s.setOwner('owner-a');await s.ctx.ensureAuroraMemory();await s.click('next-undo-open','bad');assert.equal(s.requests.length,0);
 await s.click('next-undo-open',commit.commit_sha);assert.equal(s.requests.length,0);assert(s.area.innerHTML.includes('Confirmar reversão'));
 await s.click('next-undo-confirm',commit.commit_sha);assert.equal(s.requests.length,1);assert(s.requests[0].undoAcknowledged);assert.equal(s.requests[0].action,'undo_commit');assert(s.area.hidden);assert(s.ctx.auroraHistory.some(m=>m.content.includes('desfeita')));
 await s.clear();assert.equal(s.ctx.auroraHistory.length,0);
 console.log('PASS: successful-only memory survives reload, account/project switches reset context, old undo button rejected, explicit confirmation before undo, reverted change removed from active memory, clear context.');
})().catch(e=>{console.error(e);process.exit(1)});
