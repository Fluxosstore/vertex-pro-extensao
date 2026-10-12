// Exercise UI recovery, account/project isolation and publication controls without a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
const selected=source.slice(source.indexOf('  function planControls('),source.indexOf("  dockChatMessages?.addEventListener('click', async (e) => {",source.indexOf('  function planControls(')));
const saved={},bubbles=[];let project='project-a',repo='owner/repo',license='one',requests=0;
const ctx={TextEncoder,crypto:require('node:crypto').webcrypto,AbortSignal,Date,setTimeout,clearTimeout,
 escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 getProjectContextKey:()=>project,ghActiveRepo:repo,repoResolvedProjectKey:project,isDocked:()=>true,
 ghAuth:async()=>({licenseKey:license,deviceId:'device'}),cfgUrl:()=>'',cfgHeaders:()=>({}),
 fetch:async()=>{requests++;return {json:async()=>({ok:true,plan_token:'updated',plan_expires_at:123456789,validation:{state:'passed',publishable:true}})}},
 chrome:{storage:{local:{get:async()=>saved,set:async data=>Object.assign(saved,data),remove:async k=>delete saved[k]}}},
 addDockChatMessage:(...args)=>bubbles.push(args),dockChatMessages:{querySelector:()=>null},pendingPlans:{}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../aurora-engine-ui.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../code-review.js'),'utf8'),ctx);vm.runInContext(selected,ctx);
const blocked=p=>/next-plan-apply" disabled/.test(ctx.planControls(p));
(async()=>{
 assert(!ctx.planControls({}).includes('Validar build'));assert(ctx.planControls({}).includes('Aprovar commit'));
 for (const p of [{requiresValidation:true},{checkpoint:true},{requiresValidation:true,validation:{state:'passed',publishable:true}}]) {
   const html=ctx.planControls(p);assert(!html.includes('next-plan-apply'));assert(html.includes('next-plan-cancel'));assert(html.includes('versão anterior'));assert(!/build|testes|next-plan-validate/i.test(html));
 }
 assert(blocked({busy:true}));
 assert(ctx.planControls({error:'<img src=x onerror=alert(1)>'}).includes('&lt;img'));
 assert(!ctx.planControls({validation:{url:'javascript:alert(1)'}}).includes('href='));
 const id='plano_123-ab';const p={repo,projectKey:project,files:[{path:'src/a.js',content:'x'}],token:'old',prompt:'change',expiresAt:Date.now()+60000};ctx.pendingPlans[id]=p;
 await ctx.savePendingPlan(id);delete ctx.pendingPlans[id];await ctx.restorePendingPlans();assert.equal(bubbles.length,1);await ctx.restorePendingPlans();assert.equal(bubbles.length,1);
 delete ctx.pendingPlans[id];license='two';await ctx.restorePendingPlans();assert.equal(bubbles.length,1);await assert.rejects(()=>ctx.planRequest(p,'validation_status'),/licença mudou/);assert.equal(requests,0);
 license='one';project='project-b';await assert.rejects(()=>ctx.planRequest(p,'confirm_plan'),/projeto mudou/);assert.equal(requests,0);
 project='project-a';await ctx.planRequest(p,'validation_status');assert.equal(p.token,'updated');assert.equal(p.expiresAt,123456789);assert(p.validation.publishable);
 console.log('PASS: controls remove CI actions and require regeneration of legacy signed plans, safe rendering, saved plans restored once, account/project isolation, signed checkpoint updated.');
})().catch(e=>{console.error(e);process.exit(1)});
