// Real validation service with simulated GitHub; no customer repos or credentials.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const dir=path.join(__dirname,'../supabase/functions/github-ai-edit');
const source=['validation-workflow.ts','plan-validation.ts'].map(f=>stripTypeScriptTypes(fs.readFileSync(path.join(dir,f),'utf8').replace(/^import .*;\n/gm,'').replace(/^export \{.*\};\n/gm,'').replace(/^export /gm,''))).join('\n');
const context={Response,AbortSignal,crypto:require('node:crypto').webcrypto,Date};vm.createContext(context);vm.runInContext(source,context);
const workflow=vm.runInContext('VALIDATION_WORKFLOW',context);
assert.equal(workflow,fs.readFileSync(path.join(__dirname,'../ci/vertex-validation.yml'),'utf8'));
const base='a'.repeat(40),candidate='c'.repeat(40),tree='d'.repeat(40);
function scenario(options={}) {
 let plan={baseCommitSha:base,commitMessage:'Change title',requiresValidation:true,expiresAt:Date.now()+60000};
 const calls=[];let current=base,mode='queued',installed=options.installed??true,title,runSha=base,missingTests=false,denyPatch=false;
 const fetch=async(token,url,init)=>{
   const u=new URL(url),p=u.pathname.replace('/repos/test/repo',''),body=init.body?JSON.parse(init.body):null;calls.push({p,method:init.method,body});
   let data;
   if(p==='/git/ref/heads/main')data={object:{sha:current}};
   else if(p==='')data={default_branch:'main'};
   else if(p.startsWith('/contents/')) {if(!installed)return new Response('',{status:404});data={encoding:'base64',content:Buffer.from(installed==='different'?'modified':workflow).toString('base64')}}
   else if(p.startsWith('/git/commits/')&&init.method==='GET')data={tree:{sha:p.endsWith(candidate)?tree:'b'.repeat(40)},parents:[{sha:base}]};
   else if(p==='/git/blobs')data={sha:'e'.repeat(40)};
   else if(p==='/git/trees')data={sha:tree};
   else if(p==='/git/commits')data={sha:candidate};
   else if(p==='/git/refs/heads/main') {if(denyPatch)return new Response('',{status:403});current=body.sha;installed=true;data={object:{sha:current}};}
   else if(p.endsWith('/dispatches')) {title='Vertex validation '+body.inputs.validation_id;assert.equal(body.inputs.candidate_sha,candidate);data={workflow_run_id:7};}
   else if(p==='/actions/runs/7') data={id:7,event:'workflow_dispatch',head_sha:runSha,path:'.github/workflows/vertex-validation.yml',display_title:title,status:mode==='queued'?'queued':'completed',conclusion:mode,run_attempt:1};
   else if(p.endsWith('/jobs')) data={jobs:[{name:'Vertex build and tests',conclusion:mode,steps:[{name:'Build',conclusion:mode},{name:'Tests',conclusion:missingTests?'skipped':mode},{name:'No tests configured',conclusion:missingTests?'success':'skipped'}]}]};
   else if(p.endsWith('/cancel')) {mode='cancelled';return new Response(null,{status:202});}
   else if(p.endsWith('/runs'))data={workflow_runs:[]};
   else throw Error('Unexpected '+p);
   return Response.json(data);
 };
 const service=context.validationService('fake','test/repo','main',{githubFetch:fetch,signPlan:async p=>JSON.stringify(p),filesHash:async()=>'',decode:s=>Buffer.from(s,'base64').toString()});
 return {service,calls,get plan(){return plan},update:r=>{plan=JSON.parse(r.plan_token)},mode:m=>mode=m,drift:()=>current='f'.repeat(40),wrongRun:()=>runSha='f'.repeat(40),noTests:()=>missingTests=true,deny:()=>denyPatch=true};
}
(async()=>{
 let s=scenario();await assert.rejects(()=>s.service.publish(s.plan),/não aprovaram/);
 let r=await s.service.start(s.plan,[{path:'src/App.js',content:'const x=1;'}],[]);s.update(r);
 assert(!s.calls.some(c=>c.method==='PATCH'),'Preparing/starting validation must not update site branch');
 assert.equal((await s.service.status(s.plan)).publishable,false);
 await assert.rejects(()=>s.service.publish(s.plan));
 const dispatched=s.calls.filter(c=>c.p.endsWith('/dispatches')).length;await s.service.start(s.plan,[],[]);assert.equal(s.calls.filter(c=>c.p.endsWith('/dispatches')).length,dispatched,'Resuming must not dispatch again');
 s.mode('failure');assert.equal((await s.service.status(s.plan)).publishable,false);await assert.rejects(()=>s.service.publish(s.plan));
 s.mode('success');assert.equal((await s.service.status(s.plan)).publishable,true);
 s.noTests();assert.equal((await s.service.status(s.plan)).tests,'not_configured');
 assert.equal(await s.service.publish(s.plan),candidate);
 assert.equal(s.calls.filter(c=>c.method==='PATCH').length,1);
 s=scenario();r=await s.service.start(s.plan,[{path:'src/App.js',content:'x'}],[]);s.update(r);s.mode('success');s.wrongRun();await assert.rejects(()=>s.service.publish(s.plan),/não pertence/);
 s=scenario();r=await s.service.start(s.plan,[{path:'src/App.js',content:'x'}],[]);s.update(r);s.mode('success');s.drift();await assert.rejects(()=>s.service.publish(s.plan),/mudou/);
 s=scenario();r=await s.service.start(s.plan,[{path:'src/App.js',content:'x'}],[]);s.update(r);s.update(await s.service.cancel(s.plan));assert.equal((await s.service.status(s.plan)).state,'cancelled');await assert.rejects(()=>s.service.publish(s.plan));
 s=scenario({installed:false});r=await s.service.start(s.plan,[],[]);assert.equal(r.code,'VALIDATION_SETUP_REQUIRED');assert(!s.calls.some(c=>c.method==='POST'));
 r=await s.service.setup(s.plan);s.update(r);assert.equal(s.plan.baseCommitSha,candidate);assert.equal(s.plan.requiresValidation,true);
 s=scenario({installed:'different'});await assert.rejects(()=>s.service.setup(s.plan),/Não foi sobrescrito/);assert(!s.calls.some(c=>c.method==='POST'));
 s=scenario({installed:false});s.deny();await assert.rejects(()=>s.service.setup(s.plan),/permissão workflow/);
 console.log('PASS: exact candidate, no branch changes before approval, queued/failed builds blocked, missing tests explicit, run identity and base drift checked, cancellation, setup and permissions, no duplicate dispatch on resume.');
})().catch(e=>{console.error(e);process.exit(1)});
