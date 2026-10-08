// Full request handler, signed receipts and simulated GitHub, with no production mutation.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {stripTypeScriptTypes}=require('node:module');
const folder=path.join(__dirname,'../supabase/functions/github-ai-edit');
const code=['aurora-engine.ts','validation-workflow.ts','plan-validation.ts','undo-commit.ts','index.ts'].map(f=>stripTypeScriptTypes(fs.readFileSync(path.join(folder,f),'utf8').replace(/^import .*;\n/gm,'').replace(/^export \{.*\};\n/gm,'').replace(/^export /gm,''))).join('\n');
const base='a'.repeat(40),change='c'.repeat(40),revert='e'.repeat(40),other='f'.repeat(40),baseTree='b'.repeat(40),newTree='d'.repeat(40);
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('base64url');
const sign=value=>{const p=Buffer.from(JSON.stringify(value)).toString('base64url');return p+'.'+crypto.createHmac('sha256','test-only').update(p).digest('base64url')};
function fixture() {
 let current=base,handler,quota=0,deny=false;const calls=[];
 const commits={[base]:{tree:{sha:baseTree},parents:[]},[other]:{tree:{sha:'9'.repeat(40)},parents:[{sha:change}]}};
 const client={from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='licenses'?{id:'license-one',status:'active',device_id:'device'}:table==='github_connections'?{access_token:'fake',selected_repo_full_name:'owner/repo',selected_repo_default_branch:'main'}:{}})};return q;},rpc:async()=>{quota++;return{data:[{allowed:true,used:1}]}}};
 const ctx={Request,Response,TextEncoder,TextDecoder,AbortSignal,atob,btoa,crypto:crypto.webcrypto,console,
 createClient:()=>client,babelParse:()=>({}),Deno:{env:{get:k=>k==='DEEPSEEK_API_KEY'?'': 'test-only'},serve:fn=>handler=fn},
 fetch:async(url,init={})=>{
   assert(url.startsWith('https://api.github.com/'),'Undo must never call AI');
   const p=new URL(url).pathname.replace('/repos/owner/repo',''),body=init.body?JSON.parse(init.body):{};calls.push({p,method:init.method,body});
   let data;
   if(p==='/git/ref/heads/main') data={object:{sha:current}};
   else if(p.startsWith('/git/commits/'))data=commits[p.split('/').pop()];
   else if(p==='/git/blobs')data={sha:'1'.repeat(40)};
   else if(p==='/git/trees')data={sha:newTree};
   else if(p==='/git/commits'){
     const sha=body.tree===baseTree?revert:change;
     commits[sha]={tree:{sha:body.tree},parents:body.parents.map(sha=>({sha})),message:body.message};data={sha};
   } else if(p==='/git/refs/heads/main'){
     assert.notEqual(body.force,true,'History must never be reset');
     if(deny)return Response.json({message:'Branch moved/protected'},{status:422});
     current=body.sha;data={object:{sha:current}};
   } else throw Error('Unexpected '+p);
   return Response.json(data);
 }};
 vm.runInNewContext(code,ctx);
 const invoke=async body=>{const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({licenseKey:'license',deviceId:'device',...body})}));return {status:r.status,...await r.json()}};
 const files=[{path:'src/a.js',content:'const changed=true;'}];
 const plan={licenseId:'license-one',deviceId:'device',repo:'owner/repo',branch:'main',baseCommitSha:base,filesHash:hash(files),assetsHash:hash([]),expiresAt:Date.now()+60000,commitMessage:'Change'};
 return{invoke,calls,get quota(){return quota},publish:()=>invoke({action:'confirm_plan',files,assets:[],plan_token:sign(plan)}),move:()=>current=other,deny:()=>deny=true};
}
(async()=>{
 let f=fixture();let published=await f.publish();assert.equal(published.status,200,JSON.stringify(published));assert(published.undo_token);assert.equal(f.quota,0);
 let undo=await f.invoke({action:'undo_commit',undo_token:published.undo_token,undoAcknowledged:true});assert.equal(undo.status,200,JSON.stringify(undo));assert.equal(undo.commit_sha,revert);assert.equal(f.quota,0);
 const writes=f.calls.filter(c=>c.method==='POST').length;
 undo=await f.invoke({action:'undo_commit',undo_token:published.undo_token,undoAcknowledged:true});assert(undo.already_undone);assert.equal(f.calls.filter(c=>c.method==='POST').length,writes);
 f=fixture();published=await f.publish();f.move();undo=await f.invoke({action:'undo_commit',undo_token:published.undo_token,undoAcknowledged:true});assert.equal(undo.status,409);assert(undo.error.includes('outras alterações'));
 f=fixture();published=await f.publish();f.deny();undo=await f.invoke({action:'undo_commit',undo_token:published.undo_token,undoAcknowledged:true});assert.equal(undo.status,409);
 const receipt={kind:'undo',licenseId:'license-one',deviceId:'device',repo:'owner/repo',branch:'main',commitSha:change,baseCommitSha:base,expiresAt:Date.now()+60000};
 for(const patch of [{repo:'owner/other'},{deviceId:'other'},{licenseId:'other'},{expiresAt:1},{kind:'plan'}]){
   f=fixture();undo=await f.invoke({action:'undo_commit',undoAcknowledged:true,undo_token:sign({...receipt,...patch})});assert.equal(undo.status,400);assert.equal(f.calls.length,0);assert.equal(f.quota,0);
 }
 f=fixture();undo=await f.invoke({action:'undo_commit',undo_token:sign(receipt)});assert.equal(undo.status,400);assert.equal(f.calls.length,0);
 console.log('PASS: commit issues signed undo receipt; revert restores previous tree without history reset, retry idempotent, newer commits/protected branch blocked, owner/device/repo/expiry checks, no AI key or quota needed.');
})().catch(e=>{console.error(e);process.exit(1)});
