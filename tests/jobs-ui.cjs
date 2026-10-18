const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const selected=source.slice(source.indexOf('  const jobStages ='),source.indexOf('  async function ghSendPrompt('));
const counter=source.slice(source.indexOf('  function recordAiCommand('),source.indexOf('  function formatHistoryTime('));
const data={},requests=[],resumes=[],logs=[];let owner='owner-a',project='project-a',failStart=false;
const storage={set:async d=>Object.assign(data,structuredClone(d)),get:async k=>structuredClone(k===null?data:{[k]:data[k]}),remove:async k=>delete data[k]};
const ctx={IS_PANEL:false,panelIsActive:()=>false,console,Date,crypto:require('node:crypto').webcrypto,AbortController,AbortSignal,setTimeout,clearTimeout,Map,Promise,
 activeProfile:{licenseKey:'private',commandsCount:'10'},usageByLicense:{private:{count:10,day:'2026-10-06',dailyCount:3}},usageReady:Promise.resolve(),DAILY_PROMPT_LIMIT:100,
 usageDay:()=> '2026-10-06',dailyUsage:()=>ctx.usageByLicense.private.dailyCount,logCommand:(...a)=>logs.push(a),renderUsageStats(){},showDailyLimit(){},
 chrome:{storage:{local:storage}},planOwner:async()=>owner,ghAuth:async()=>({licenseKey:'private',deviceId:'device'}),cfgUrl:()=>'',cfgHeaders:()=>({}),
 root:{addEventListener(){},querySelector:()=>null},addDockChatMessage(){},isDocked:()=>true,dockStepTimer:null,dockChatMessages:{querySelector:()=>null},escapeHtml:s=>s,
 composerInput:{value:''},ghPrompt:{value:''},pendingPlans:{},activeEdit:null,ghActiveRepo:'owner/repo',repoResolvedProjectKey:'project-a',getProjectContextKey:()=>project,
 ghSendPrompt:async(from,ticket)=>resumes.push(ticket.id),
 fetch:async(url,opts)=>{const b=JSON.parse(opts.body);requests.push(b);if(failStart&&b.action==='job_start')throw Error('Network disconnected');return {status:200,json:async()=>({ok:true,job:{id:b.job_id,status:b.action==='job_start'?'queued':'ready',stage:'prepared',command_counted:b.action!=='job_start',daily_used:4,usage_day:'2026-10-06'},result:{ok:true,mode:'plan',files:[]}})}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../aurora-engine-ui.js'),'utf8'),ctx);vm.runInContext(counter+selected,ctx);
const op=()=>({repo:'owner/repo',projectKey:'project-a',prompt:'Change logo',abort:new AbortController()});
(async()=>{
 let operation=op();let r=await ctx.requestAgentJob(operation,{prompt:'Change logo'});assert.equal((await r.json()).mode,'plan');assert.equal(ctx.usageByLicense.private.count,11);assert.equal(ctx.usageByLicense.private.dailyCount,4);assert.equal(requests.filter(x=>x.action==='job_start').length,1);
 // Restore the same ID, even if license validation has already reported this server total.
 const ticket=structuredClone(operation.jobTicket);ticket.counted=false;ctx.activeProfile.commandsCount='11';await ctx.requestAgentJob(op(),{},ticket);assert.equal(ctx.usageByLicense.private.count,11);assert.equal(ctx.usageByLicense.private.dailyCount,4);assert.equal(logs.length,1);assert.equal(requests.filter(x=>x.action==='job_start').length,1);
 await ctx.restoreAgentJobs();assert.equal(resumes.length,1);project='project-b';ctx.repoResolvedProjectKey=project;await ctx.restoreAgentJobs();assert.equal(resumes.length,1);project='project-a';ctx.repoResolvedProjectKey=project;
 owner='owner-b';await assert.rejects(()=>ctx.jobRequest(ticket,'job_status'),/licença mudou/);await ctx.restoreAgentJobs();assert.equal(resumes.length,1);owner='owner-a';
 await ctx.cancelServerJob(ticket);assert(ticket.settled);assert.equal(requests.at(-1).action,'job_cancel');
 failStart=true;operation=op();await assert.rejects(()=>ctx.requestAgentJob(operation,{prompt:'Change logo'}),/Network disconnected/);assert(data['vertex_agent_job_'+operation.jobTicket.id]);assert(!operation.jobTicket.delivered);
 await ctx.recordAiCommand('github','Recovered yesterday',88,'yesterday-id',{baseline:10,day:'2026-10-05'});assert.equal(ctx.usageByLicense.private.dailyCount,4);assert.equal(ctx.usageByLicense.private.count,11);
 console.log('PASS: reload polls same ID without resending, quota/UI count deduplicated against server baseline, day rollover, owner/project isolation, retained ticket on lost response, confirmed cancellation.');
})().catch(e=>{console.error(e);process.exit(1)});
