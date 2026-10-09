const JOB_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TABLE = 'vertex_agent_jobs';
export async function handleAgentJob(body: any, deps: any) {
  const {db,resolveLicense,hash,run,waitUntil,refreshResult} = deps;
  const deviceId = String(body.deviceId || '').trim();
  const licenseKey = String(body.licenseKey || '').trim();
  if (!deviceId || !licenseKey) return {ok:false,error:'Licença e dispositivo obrigatórios.'};
  const licenseId = await resolveLicense(db,licenseKey,deviceId);
  if (!licenseId) return {ok:false,error:'Licença inválida ou expirada.'};
  const id = String(body.job_id || '');
  if (!JOB_ID.test(id)) return {ok:false,error:'Identificador de comando inválido.'};
  const owned = () => db.from(TABLE).select('*').eq('id',id).eq('license_id',licenseId).eq('device_id',deviceId).maybeSingle();
  const update = (patch: any) => db.from(TABLE).update({...patch,updated_at:new Date().toISOString()}).eq('id',id).eq('license_id',licenseId).eq('device_id',deviceId);
  // Each authenticated job request cleans expired results and detects interrupted workers.
  await db.from(TABLE).delete().lt('expires_at',new Date().toISOString());
  await db.from(TABLE).update({status:'failed',stage:'interrupted',error_code:'WORKER_INTERRUPTED',
    error_message:'A execução foi interrompida ou excedeu o prazo. Nenhum commit foi publicado.',updated_at:new Date().toISOString()})
    .eq('license_id',licenseId).eq('device_id',deviceId).in('status',['queued','running']).lt('deadline_at',new Date().toISOString());
  let read = await owned();
  if (read.error) throw new Error('Não foi possível consultar o registro do comando.');
  let job = read.data;
  if (body.action === 'job_start') {
    const projectKey = String(body.projectKey || '').slice(0,200);
    if (!projectKey) return {ok:false,error:'Projeto Lovable obrigatório.'};
    const input: any = {};
    for (const key of ['prompt','attachments','selectedElement','lastEditedPage','chatHistory','dockedMode','requireValidation','modoPlano','auroraEngine','auroraSkills'])
      if (body[key] !== undefined) input[key] = body[key];
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length>60000 || JSON.stringify(input).length>29_000_000) return {ok:false,error:'Comando vazio ou acima dos limites permitidos.'};
    // This context can only be passed by server code, never by JSON from the browser.
    input.deferCommit = true;
    const requestHash = await hash({projectKey,input});
    if (job) {
      if (job.request_hash !== requestHash || job.project_key !== projectKey) return {ok:false,error:'Este identificador já pertence a outro pedido.'};
      return {ok:true,job:publicJob(job)};
    }
    if (typeof waitUntil !== 'function') return {ok:false,error:'Processamento em segundo plano indisponível. Nenhum comando foi iniciado.'};
    const {data:connection,error} = await db.from('github_connections').select('access_token,selected_repo_full_name,selected_repo_default_branch')
      .eq('license_id',licenseId).eq('device_id',deviceId).maybeSingle();
    if (error || !connection?.access_token || !connection.selected_repo_full_name) return {ok:false,error:'Conecte o GitHub e selecione o repositório deste projeto.'};
    if (String(body.expectedRepo || '') !== connection.selected_repo_full_name) return {ok:false,error:'O repositório selecionado mudou. Reconecte o projeto antes de enviar.'};
    const row = {id,license_id:licenseId,device_id:deviceId,project_key:projectKey,repo:connection.selected_repo_full_name,
      branch:connection.selected_repo_default_branch || 'main',request_hash:requestHash,status:'queued',stage:'queued',events:[{stage:'queued',at:new Date().toISOString()}]};
    const inserted = await db.from(TABLE).insert(row).select('*').maybeSingle();
    if (inserted.error) {
      read = await owned();
      if (read.data?.request_hash === requestHash) return {ok:true,job:publicJob(read.data)};
      if(inserted.error.code!=='23505')throw new Error('Não foi possível registrar o comando.');
      return {ok:false,code:'JOB_BUSY',error:'Já existe um comando em processamento nesta licença e dispositivo. Aguarde ou cancele-o.'};
    }
    job = inserted.data;
    if (!job) throw new Error('O comando não foi registrado.');
    const execute = async () => {
      let stage = 'starting';
      const events = [...job.events,{stage,at:new Date().toISOString()}];
      try {
      const claim = await update({status:'running',stage:'starting'}).eq('status','queued').select('id').maybeSingle();
      if (claim.error || !claim.data) return;
      async function progress(next: string, quota?: any) {
        if (quota) {const charged=await update({quota_charged:true,daily_used:quota.used,usage_day:quota.resets_at?new Date(Date.parse(quota.resets_at)-12*3600000).toISOString().slice(0,10):null});if(charged.error)throw new Error('Falha ao registrar a contagem do comando.');}
        const state = await owned();
        if (state.error || state.data?.status !== 'running') throw new Error('Comando cancelado ou interrompido.');
        if (Date.now() >= Date.parse(state.data.deadline_at)) throw new Error('Prazo de execução esgotado.');
        stage = next;events.push({stage,at:new Date().toISOString()});
        const changed = await update({stage,events:events.slice(-24)}).eq('status','running');
        if (changed.error) throw new Error('Não foi possível registrar o andamento do comando.');
      }
        const response = await run({...input,licenseKey,deviceId},
          {jobId:id,repo:row.repo,branch:row.branch,token:connection.access_token,progress});
        const result = await response.json();
        const state = result.ok ? 'ready' : 'failed';
        const errorMessage = result.ok ? null : sanitizeError(result.error || 'Falha ao preparar o comando.');
        if(!result.ok)result.error=errorMessage;
        const saved=await update({status:state,stage:result.ok?'prepared':stage,result,
          error_code:result.ok?null:result.code || `HTTP_${response.status}`,error_message:errorMessage,
          events:[...events,{stage:state,at:new Date().toISOString()}].slice(-24)}).eq('status','running');
        if(saved.error)throw new Error('Não foi possível salvar o resultado do comando.');
      } catch (e) {
        await update({status:'failed',stage,error_code:'EXECUTION_FAILED',error_message:sanitizeError(e instanceof Error?e.message:String(e)),
          events:[...events,{stage:'failed',at:new Date().toISOString()}].slice(-24)}).in('status',['queued','running']);
      }
    };
    waitUntil(execute());
    return {ok:true,job:publicJob(job)};
  }
  if (!job || job.project_key !== String(body.projectKey || '')) return {ok:false,code:'JOB_NOT_FOUND',error:'Comando não encontrado para este projeto, licença e dispositivo.'};
  if (body.action === 'job_cancel') {
    // Even a completed proposal can be discarded; no job ever publishes a commit.
    const cancelled=await update({status:'cancelled',stage:'cancelled',result:null,error_code:null,error_message:null}).in('status',['queued','running','ready']);
    if(cancelled.error)throw new Error('Não foi possível cancelar o comando.');
    job = (await owned()).data || job;
  }
  let result = job.result;
  if (job.status === 'ready' && result && body.action === 'job_status') result = await refreshResult(result,job);
  return {ok:true,job:publicJob(job),...(body.action==='job_status' && result ? {result:{...result,command_id:id,command_counted:job.quota_charged,daily_used:job.daily_used}} : {})};
}
function sanitizeError(value: string) {
  const clean=String(value).replace(/Bearer\s+\S+/gi,'Bearer [oculto]').replace(/\b(?:sk-|ghp_|gho_)[A-Za-z0-9_-]+/g,'[chave oculta]');
  return clean.length>16000 ? clean.slice(0,16000)+'\n[Diagnóstico excedeu o limite; consulte os detalhes da revisão.]' : clean;
}
function publicJob(job: any) {
  return {id:job.id,status:job.status,stage:job.stage,repo:job.repo,branch:job.branch,project_key:job.project_key,
    created_at:job.created_at,updated_at:job.updated_at,expires_at:job.expires_at,deadline_at:job.deadline_at,
    error_code:job.error_code,error_message:sanitizeError(job.error_message || ''),events:job.events,
    command_counted:job.quota_charged,daily_used:job.daily_used,usage_day:job.usage_day};
}
