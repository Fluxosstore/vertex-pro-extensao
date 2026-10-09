const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/github-ai-edit/agent-jobs.ts'),'utf8').replace(/^export /gm,''));
const jobs=new Map();let connection={access_token:'ghp_private',selected_repo_full_name:'owner/repo',selected_repo_default_branch:'main'};
const db={from(table){let op='select',patch,filters=[],single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},lt(k,v){filters.push(r=>r[k]<v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},update(p){op='update';patch=p;return q},delete(){op='delete';return q},insert(p){op='insert';patch=p;return q},maybeSingle(){single=true;return q},then(resolve,reject){return Promise.resolve().then(()=>{
 if(table==='github_connections')return {data:structuredClone(connection)};
 if(op==='insert'){
  if(jobs.has(patch.id)||[...jobs.values()].some(r=>r.license_id===patch.license_id&&r.device_id===patch.device_id&&['queued','running'].includes(r.status)))return {data:null,error:{code:'23505'}};
  const row={created_at:new Date().toISOString(),updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString(),deadline_at:new Date(Date.now()+140000).toISOString(),quota_charged:false,...structuredClone(patch)};jobs.set(row.id,row);return {data:structuredClone(row)};
 }
 const rows=[...jobs.values()].filter(r=>filters.every(fn=>fn(r)));
 if(op==='update')rows.forEach(r=>Object.assign(r,structuredClone(patch)));
 if(op==='delete')rows.forEach(r=>jobs.delete(r.id));
 return {data:structuredClone(single?rows[0]||null:rows)};
 }).then(resolve,reject)}};return q}};
const ctx={Date,console};vm.createContext(ctx);vm.runInContext(source,ctx);
let runs=0,charges=0,release,background=[],expectedRepo='owner/repo',refresh=0;
const deps={db,resolveLicense:async(db,key)=>key==='owner'?'license-a':key==='other'?'license-b':null,hash:async x=>JSON.stringify(x),waitUntil:p=>background.push(p),refreshResult:async(result)=>{refresh++;return {...result,plan_token:'renewed'}},run:async(input,execution)=>{
 runs++;assert(input.deferCommit);assert.equal(execution.repo,expectedRepo);assert.equal(execution.token,'ghp_private');charges++;
 await execution.progress('quota_accepted',{used:charges,resets_at:'2026-10-06T03:00:00Z'});
 await new Promise(resolve=>release=resolve);await execution.progress('checking');return Response.json({ok:true,mode:'plan',plan_token:'signed',files:[{path:'a.js',content:'code'}]});
}};
const id='11111111-1111-4111-8111-111111111111';
const input={job_id:id,licenseKey:'owner',deviceId:'device',projectKey:'project-a',expectedRepo:'owner/repo',prompt:'Change logo'};
const call=(action,extra={},overrides={})=>ctx.handleAgentJob({...input,action,...extra},{...deps,...overrides});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let r=await call('job_start');assert(r.ok);assert.equal(r.job.status,'queued');await flush();assert.equal(runs,1);assert.equal(charges,1);assert.equal(jobs.get(id).status,'running');
 r=await call('job_start');assert(r.ok);assert.equal(runs,1);assert.equal(charges,1);
 r=await call('job_start',{prompt:'different'});assert(!r.ok);
 r=await call('job_start',{job_id:'22222222-2222-4222-8222-222222222222'});assert.equal(r.code,'JOB_BUSY');
 r=await call('job_status',{licenseKey:'other'});assert.equal(r.code,'JOB_NOT_FOUND');
 r=await call('job_cancel',{projectKey:'wrong'});assert.equal(r.code,'JOB_NOT_FOUND');assert.equal(jobs.get(id).status,'running');
 connection.selected_repo_full_name='owner/another';release();await Promise.all(background); // No polling/browser needed to finish.
 r=await call('job_status');assert.equal(r.job.status,'ready');assert.equal(r.result.plan_token,'renewed');assert.equal(r.job.usage_day,'2026-10-05');assert.equal(refresh,1);assert.equal(charges,1);
 r=await call('job_diagnostic');assert(!r.result);assert(!JSON.stringify(r).includes('ghp_private'));assert(!JSON.stringify(jobs.get(id)).includes('ghp_private'));assert(!('prompt' in jobs.get(id)));
 r=await call('job_cancel');assert.equal(r.job.status,'cancelled');assert.equal(jobs.get(id).result,null);
 connection.selected_repo_full_name='owner/repo';jobs.clear();background=[];
 await call('job_start');await flush();await call('job_cancel');release();await Promise.all(background);assert.equal(jobs.get(id).status,'cancelled');assert.equal(jobs.get(id).result,null);
 jobs.clear();background=[];
 await call('job_start',{}, {run:async()=>{throw Error('provider Bearer abcdef sk-secret ghp_token')}});await Promise.all(background);
 r=await call('job_diagnostic');assert.equal(r.job.status,'failed');assert(!r.job.error_message.includes('abcdef'));assert(!r.job.error_message.includes('sk-secret'));assert(!r.job.error_message.includes('ghp_token'));
 jobs.clear();background=[];
 const longError='Diagnóstico: '+ 'x'.repeat(6000)+' FIM Bearer sensitive ghp_private';
 await call('job_start',{}, {run:async()=>Response.json({ok:false,error:longError})});await Promise.all(background);
 r=await call('job_status');assert(r.result.error.includes('FIM'));assert(r.job.error_message.includes('FIM'));assert(!r.result.error.includes('sensitive'));assert(!r.result.error.includes('ghp_private'));
 assert(ctx.sanitizeError('x'.repeat(18000)).includes('[Diagnóstico excedeu'));
 jobs.get(id).status='running';jobs.get(id).deadline_at=new Date(Date.now()-1000).toISOString();r=await call('job_status');assert.equal(r.job.error_code,'WORKER_INTERRUPTED');
 jobs.clear();r=await call('job_start',{}, {waitUntil:undefined});assert(!r.ok);assert.equal(jobs.size,0);
 r=await call('job_start',{expectedRepo:'wrong'});assert(!r.ok);assert.equal(jobs.size,0);
 console.log('PASS: persistent result without browser, idempotent starts/single charge, pinned destination, active-job lock, ownership/project isolation, cancellation prevents late result, stale-worker failure, refreshed authorization, secret-free diagnostics.');
})().catch(e=>{console.error(e);process.exit(1)});
