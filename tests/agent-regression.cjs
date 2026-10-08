// Node 24+: node tests/agent-regression.cjs. All service calls are simulated.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const source = ['aurora-engine.ts','agent-jobs.ts','validation-workflow.ts','plan-validation.ts','undo-commit.ts','index.ts'].map(f => stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../supabase/functions/github-ai-edit/'+f), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export \{.*\};\n/gm,'').replace(/^export /gm,''))).join('\n');
async function scenario(mode = 'complete', requireValidation = false, execution = undefined) {
  const files = { 'src/a.js': 'const title = "old";', 'src/b.js': 'const enabled = false;' };
  const limited=['budget-finish','budget-stop','budget-partial','duplicate-reads','reselect-cache'].includes(mode);
  if(limited){for(const name of ['aa','ab','ac','ad'])files['src/'+name+'.js']='const placeholder=0;';for(let i=0;i<4;i++)files['src/extra/x'+i+'.js']='const extra'+i+'=0;';}
  const calls = [];
  let handler, editRound = 0, quota = 0, jobStatus='ready',selectorCount=0,reviewRound=0;
  const client = {
    from(table) {
      const q = { select(){return q}, eq(){return q}, async maybeSingle(){
        return {data: table === 'vertex_agent_jobs' ? {status:jobStatus} : table === 'licenses' ? {id:'test',status:'active'} : table === 'github_connections' ?
          {access_token:'test-only',selected_repo_full_name:'test/repo',selected_repo_default_branch:'main'} :
          {map_json:Object.fromEntries(Object.keys(files).map(p=>[p,{exports:[],imports:[]}]))}};
      }};
      return q;
    },
    async rpc(){quota++;return {data:[{allowed:true,used:1}]}}
  };
  const ctx = { console:{log(){},error(){}}, TextEncoder, TextDecoder, Request, Response, AbortSignal, atob, btoa,
    crypto:require('node:crypto').webcrypto, createClient:()=>client,
    // Fixtures are plain JS; exercise syntax rejection without network dependencies.
    babelParse:text=>new vm.Script(text),
    Deno:{env:{get:()=> 'test-only'},serve:fn=>handler=fn},
    fetch:async(url,opts={})=>{
      calls.push({url,opts}); let result;
      if(url.includes('api.deepseek.com')) {
        const request=JSON.parse(opts.body), system=request.messages[0].content, user=request.messages[1].content;
        if(system.includes('REVISOR INDEPENDENTE')) {
          reviewRound++;const review=JSON.parse(user.split("\n\nResponda APENAS")[0]);assert(review.files.some(f=>f.path==='src/a.js'&&f.before.includes('old')));
          result=mode==='engine-invalid'?{verdict:'pass',findings:'wrong'}:
            (mode==='engine-blocked'||(mode==='engine-repair'&&reviewRound===1))?{verdict:'block',findings:[{path:'src/a.js',severity:'blocking',message:'O título deve ser fixed para atender ao pedido.'}]}:{verdict:'pass',findings:[]};
        }else if(system.includes('mapa de arquivos')) {selectorCount++;result={files:[mode==='reselect-cache'&&selectorCount>1?'src/b.js':'src/a.js'],tasks:['Ativar opção','Alterar título e criar painel']};}
        else {
          editRound++;
          if(limited){
            const editA={files:[{path:'src/a.js',edits:[{old_text:'"old"',new_text:'"new"'}]}],tasks:[{id:'step-1',status:'prepared',files:['src/a.js']},{id:'step-2',status:'pending',files:[]}],continue_work:false};
            if(mode==='budget-finish'||mode==='budget-stop'){
              if(editRound<=4)result={request_files:['src/extra/x'+(editRound-1)+'.js']};
              else {assert(user.includes('ETAPA FINAL'));result=mode==='budget-finish'?editA:{request_files:['src/extra/x3.js']};}
            }else if(mode==='budget-partial'){
              if(editRound===1)result={...editA,continue_work:true};
              else result={request_files:['src/extra/x'+Math.min(3,editRound-2)+'.js']};
            }else if(mode==='duplicate-reads'){
              if(editRound<5)result={request_files:['src/a.js']};
              else if(editRound===5)result={request_files:['src/extra/x0.js']};
              else result=editA;
            }else if(mode==='reselect-cache'){
              if(editRound<=2)result={request_files:['src/extra/x'+(editRound-1)+'.js']};
              else if(editRound===3)result={files:[],note:'Não encontrei o elemento nesses arquivos.'};
              else if(editRound===4)result={request_files:['src/extra/x0.js']};
              else if(editRound===5)result={request_files:['src/extra/x2.js']};
              else result={...editA,files:[{path:'src/b.js',edits:[{old_text:'false',new_text:'true'}]}],tasks:[]};
            }
          }else if(mode==='outside') result={request_files:['../../secret.ts']};
          else if(editRound===1) result={request_files:['src/b.js']};
          else if(editRound===2) {
            assert(user.includes('### src/b.js\n```\nconst enabled = false;'));
            result={files:[{path:'src/b.js',edits:[{old_text:'false',new_text:'true'}]}],tasks:[{id:'step-1',status:'prepared',files:['src/b.js']},{id:'step-2',status:'pending',files:[]}],continue_work:mode==='complete'||mode.startsWith('engine-')};
          } else {
            assert(user.includes('const enabled = true;'),'Next stage must read staged code');
            result={files:[{path:'src/a.js',edits:[{old_text:'"old"',new_text:mode==='engine-repair'&&editRound>3?'"fixed"':'"new"'}]},{path:'src/new.js',content:'const panel = 1;'}],tasks:[{id:'step-1',status:'prepared',files:['src/b.js']},{id:'step-2',status:'prepared',files:['src/a.js','src/new.js']}],continue_work:false};
          }
        }
        return Response.json({usage:{prompt_tokens:100,completion_tokens:30},choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]});
      }
      if(url.includes('/git/ref/'))result={object:{sha:'base'}};
      else if(url.includes('/git/commits/'))result={tree:{sha:'tree'}};
      else if(url.includes('/git/trees/'))result={tree:Object.keys(files).map(path=>({type:'blob',path}))};
      else if(url.includes('/contents/')) {
        assert(url.endsWith('?ref=base'),'Reads must be pinned to base commit');
        const p=decodeURIComponent(url.split('/contents/')[1].split('?')[0]);
        if(!files[p])return new Response('',{status:404});
        result={encoding:'base64',size:Buffer.byteLength(files[p]),content:Buffer.from(files[p]).toString('base64')};
      } else throw Error('Unexpected operation '+url);
      return Response.json(result);
    }
  };
  vm.runInNewContext(source,ctx);
  const invoke=async body=>{const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({licenseKey:'test',deviceId:'test',...body})}));return {status:r.status,data:await r.json()}};
  const initial={prompt:'Corrija a opção e crie um painel com o novo título.',deferCommit:!execution,requireValidation,auroraEngine:mode.startsWith('engine-')};
  const response=execution ? await (async()=>{const r=await ctx.handleCommand(new Request('https://test.invalid',{method:'POST'}),execution,{licenseKey:'test',deviceId:'test',...initial});return{status:r.status,data:await r.json()}})() : await invoke(initial);
  return {...response,reviewRound,setJobStatus:s=>jobStatus=s,calls,selectorCount,editRound,get quota(){return quota},invoke};
}
(async()=>{
  let r=await scenario();assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.files.length,3);assert(r.data.tasks.every(t=>t.status==='prepared'));assert.equal(r.data.agent.stages,2);assert.equal(r.data.agent.extra_reads,0);assert.equal(r.quota,1);assert(r.data.files_created.includes('src/new.js'));assert(!r.data.requires_manual_review);assert(!r.calls.some(c=>c.url.includes('github.com')&&c.opts.method==='POST'));
  r=await scenario('partial');assert.equal(r.status,200);assert(r.data.requires_manual_review);assert.equal(r.data.tasks[1].status,'pending');const rejected=await r.invoke({action:'confirm_plan',files:r.data.files,assets:r.data.assets,plan_token:r.data.plan_token});assert.equal(rejected.status,409);
  r=await scenario('complete',true);assert(r.data.requires_validation);let check=await r.invoke({action:'confirm_plan',reviewAcknowledged:true,files:r.data.files,assets:r.data.assets,plan_token:r.data.plan_token});assert.equal(check.status,409);check=await r.invoke({action:'validation_start',files:r.data.files,assets:r.data.assets,plan_token:r.data.plan_token});assert.equal(check.data.code,'VALIDATION_SETUP_REQUIRED');assert.equal(r.quota,1);check=await r.invoke({action:'validation_status',files:[{path:'src/a.js',content:'tampered'}],assets:r.data.assets,plan_token:r.data.plan_token});assert.equal(check.status,400);
  const stages=[];r=await scenario('complete',false,{jobId:'job-test',repo:'test/repo',branch:'main',token:'test-only',progress:async stage=>stages.push(stage)});assert.equal(r.data.mode,'plan');assert.equal(r.data.review_base['src/a.js'],'const title = \"old\";');assert.equal(r.data.review_base['src/new.js'],null);assert(stages.includes('quota_accepted'));assert(stages.includes('checking'));r.setJobStatus('cancelled');const cancelled=await r.invoke({action:'confirm_plan',files:r.data.files,assets:r.data.assets,plan_token:r.data.plan_token});assert.equal(cancelled.status,409);
  r=await scenario('outside');assert.equal(r.status,422);assert(!r.calls.some(c=>c.url.includes('secret')));
  for(const mode of ['budget-finish','budget-partial','duplicate-reads','reselect-cache']) {
    r=await scenario(mode);assert.equal(r.status,200,mode+': '+JSON.stringify(r.data));assert.equal(r.quota,1);assert(r.data.requires_manual_review);assert(!r.calls.some(c=>c.url.includes('github.com')&&c.opts.method==='POST'));
    if(mode.startsWith('budget')){assert.equal(r.data.agent.extra_reads,3);assert(!r.calls.some(c=>c.url.includes('/contents/src/extra/x3.js')));assert(r.editRound<=6);}
    if(mode==='budget-partial'){assert.equal(r.data.files.length,1);assert.equal(r.data.files[0].content,'const title = "new";');assert(r.data.note.includes('Parte do pedido'));assert.equal(r.data.tasks[1].status,'pending');}
    if(mode==='duplicate-reads')assert.equal(r.data.agent.extra_reads,1);
    if(mode==='reselect-cache'){assert.equal(r.selectorCount,2);assert.equal(r.data.agent.extra_reads,3);assert.equal(r.calls.filter(c=>c.url.includes('/contents/src/extra/x0.js')).length,1);}
  }
  r=await scenario('budget-stop');assert.equal(r.status,422);assert.equal(r.data.code,'READ_CONTEXT_INCOMPLETE');assert(!r.data.error.includes('Finalize'));assert.equal(r.selectorCount,1);assert.equal(r.quota,1);assert.equal(r.editRound,5);
  for(const mode of ['engine-pass','engine-repair','engine-blocked','engine-invalid']) {
    r=await scenario(mode);assert.equal(r.quota,1);assert(!r.calls.some(c=>c.url.includes('github.com')&&c.opts.method==='POST'));
    if(mode==='engine-blocked'){assert.equal(r.status,422);assert.equal(r.reviewRound,2);assert.equal(r.data.engine.review.status,'blocked');continue;}
    assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.requires_validation,false,'Engine must not force CI');
    assert.equal(r.data.engine.usage.requests,r.calls.filter(c=>c.url.includes('api.deepseek.com')).length);assert(r.data.engine.usage.complete);
    if(mode==='engine-invalid'){assert(r.data.requires_manual_review);assert.equal(r.data.engine.review.status,'incomplete');}
    else {assert.equal(r.data.engine.review.status,'passed');if(mode==='engine-repair'){assert.equal(r.reviewRound,2);assert(r.data.files.find(f=>f.path==='src/a.js').content.includes('fixed'));assert(r.data.engine.events.some(e=>e.stage==='repairing'));}}
  }
  console.log('PASS: additional read/promotion, pinned snapshot, two staged steps, new component, one quota charge, no commit before approval, mandatory review of partial result, blocked forbidden reads.');
})().catch(e=>{console.error(e);process.exit(1)});
