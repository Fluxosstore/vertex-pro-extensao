// Runs the signed proposal through a fixed workflow; never trusts browser status.
import { VALIDATION_WORKFLOW } from "./validation-workflow.ts";
export { VALIDATION_WORKFLOW };
const WORKFLOW = "vertex-validation.yml";
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW}`;
const SHA = /^[a-f0-9]{40}$/;
export function validationService(token: string, repo: string, branch: string,
  deps: { githubFetch: Function; signPlan: Function; filesHash: Function; decode: Function }) {
  const root = `https://api.github.com/repos/${repo}`;
  async function api(path: string, method = "GET", body?: unknown) {
    return await deps.githubFetch(token, root + path, { method,
      signal: AbortSignal.timeout(15000), headers: { "X-GitHub-Api-Version": "2026-03-10" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  async function data(path: string, method = "GET", body?: unknown) {
    const response = await api(path, method, body);
    if (!response.ok) throw new Error(`GitHub: ${method} ${path.split('?')[0]} (HTTP ${response.status}). Confira permissões e GitHub Actions.`);
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
  async function checkBase(plan: any) {
    const ref = await data(`/git/ref/heads/${encodeURIComponent(branch)}`);
    if (ref.object?.sha !== plan.baseCommitSha) throw new Error("O projeto mudou desde o plano. Gere um novo plano para validar.");
  }
  async function workflowAt(sha: string) {
    const response = await api(`/contents/${WORKFLOW_PATH}?ref=${sha}`);
    if (response.status === 404) return "missing";
    if (!response.ok) throw new Error(`Não consegui verificar a configuração de build (HTTP ${response.status}).`);
    const file = await response.json();
    return file.encoding === "base64" && deps.decode(file.content || "").replace(/\r\n/g, "\n").trim() === VALIDATION_WORKFLOW.trim() ? "ready" : "different";
  }
  async function makeCommit(plan: any, files: any[], assets: any[], message: string) {
    const base = await data(`/git/commits/${plan.baseCommitSha}`);
    if (!SHA.test(base.tree?.sha)) throw new Error("Árvore base inválida.");
    const blobs = [];
    for (const file of files) {
      const blob = await data('/git/blobs', 'POST', {content:file.content, encoding:'utf-8'});
      if (!SHA.test(blob.sha)) throw new Error("GitHub não retornou o arquivo preparado.");
      blobs.push({path:file.path, mode:'100644', type:'blob', sha:blob.sha});
    }
    for (const asset of assets) blobs.push({path:asset.path, mode:'100644', type:'blob', sha:asset.sha});
    const tree = await data('/git/trees', 'POST', {base_tree:base.tree.sha, tree:blobs});
    if (!SHA.test(tree.sha) || tree.sha === base.tree.sha) throw new Error("A proposta não contém alterações.");
    const commit = await data('/git/commits', 'POST', {message, tree:tree.sha, parents:[plan.baseCommitSha]});
    if (!SHA.test(commit.sha)) throw new Error("Commit preparado inválido.");
    return {sha:commit.sha, treeSha:tree.sha};
  }
  async function setup(plan: any) {
    await checkBase(plan);
    const info = await data('');
    if (info.default_branch !== branch) throw new Error("Ative a validação na branch padrão do repositório.");
    const state = await workflowAt(plan.baseCommitSha);
    if (state === 'different') throw new Error(`Já existe ${WORKFLOW_PATH} com outro conteúdo. Não foi sobrescrito.`);
    if (state === 'ready') return {ok:true, plan_expires_at:plan.expiresAt, plan_token:await deps.signPlan({...plan, requiresValidation:true}), validation:{state:'ready'}};
    const commit = await makeCommit(plan, [{path:WORKFLOW_PATH,content:VALIDATION_WORKFLOW}], [], 'Vertex Pro: configurar build e testes [skip ci]');
    const updated = await api(`/git/refs/heads/${encodeURIComponent(branch)}`, 'PATCH', {sha:commit.sha,force:false});
    if (!updated.ok) throw new Error('Não foi possível instalar a validação. Confira proteção de branch e permissão workflow; nenhum plano foi publicado.');
    const next = {...plan, baseCommitSha:commit.sha, requiresValidation:true, expiresAt:Date.now()+3600000};
    delete next.ci;
    return {ok:true, plan_expires_at:next.expiresAt, plan_token:await deps.signPlan(next), validation:{state:'ready'}, setup_commit_url:`https://github.com/${repo}/commit/${commit.sha}`};
  }
  async function findRun(plan: any) {
    const ci = plan.ci;
    if (!ci) return null;
    const matches = (run: any) => run.event === 'workflow_dispatch' && run.head_sha === plan.baseCommitSha &&
      run.display_title === `Vertex validation ${ci.id}` && run.path === WORKFLOW_PATH;
    if (ci.runId) {
      const run = await data(`/actions/runs/${ci.runId}`);
      if (!matches(run)) throw new Error('A execução retornada não pertence a este plano.');
      return run;
    }
    const list = await data(`/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&head_sha=${plan.baseCommitSha}&per_page=100`);
    return list.workflow_runs?.find(matches) || null;
  }
  async function status(plan: any) {
    if (!plan.ci) return {state:'not_started', publishable:false};
    if (plan.ci.cancelled) return {state:'cancelled', publishable:false};
    const run = await findRun(plan);
    if (!run) return {state:Date.now()-plan.ci.startedAt > 120000 ? 'not_found' : 'queued', publishable:false};
    plan.ci.runId = run.id;
    const url = `https://github.com/${repo}/actions/runs/${run.id}`;
    if (run.status !== 'completed') return {state:Date.now()-plan.ci.startedAt > 20*60000 ? 'timed_out' : run.status, publishable:false, url};
    const jobs = await data(`/actions/runs/${run.id}/attempts/${run.run_attempt || 1}/jobs?per_page=100`);
    const job = jobs.jobs?.find((j: any) => j.name === 'Vertex build and tests');
    const steps = (job?.steps || []).map((s: any) => ({name:s.name, status:s.status, conclusion:s.conclusion}));
    const build = steps.find((s: any) => s.name === 'Build')?.conclusion;
    const tests = steps.find((s: any) => s.name === 'Tests')?.conclusion;
    const noTests = steps.find((s: any) => s.name === 'No tests configured')?.conclusion === 'success';
    const publishable = run.conclusion === 'success' && job?.conclusion === 'success' && build === 'success' &&
      (tests === 'success' || (tests === 'skipped' && noTests));
    return {state:publishable ? 'passed' : run.conclusion === 'success' ? 'unverified' : run.conclusion,
      publishable, build:build || 'not_run', tests:noTests ? 'not_configured' : tests || 'not_run', steps, url};
  }
  async function start(plan: any, files: any[], assets: any[]) {
    await checkBase(plan);
    if (plan.ci) return {ok:true, plan_expires_at:plan.expiresAt, plan_token:await deps.signPlan(plan), validation:await status(plan)};
    const state = await workflowAt(plan.baseCommitSha);
    if (state !== 'ready') return {ok:false, code:state === 'missing' ? 'VALIDATION_SETUP_REQUIRED' : 'VALIDATION_CONFIG_CHANGED',
      setup_file:state === 'missing' ? {path:WORKFLOW_PATH,content:VALIDATION_WORKFLOW} : undefined,
      error:state === 'missing' ? 'Ative build e testes neste repositório antes de validar.' : 'A configuração de validação foi modificada; revise o arquivo antes de continuar.'};
    const commit = await makeCommit(plan, files, assets, `${plan.commitMessage}\n\n🤖 Preparado via Vertex Pro`);
    const id = crypto.randomUUID().replace(/-/g,'');
    const next = {...plan, requiresValidation:true, expiresAt:Date.now()+3600000,
      ci:{id,candidateSha:commit.sha,treeSha:commit.treeSha,startedAt:Date.now(),runId:null as number | null}};
    // Keep the checkpoint even after an ambiguous network failure; never blindly dispatch twice.
    try {
      const dispatched = await api(`/actions/workflows/${WORKFLOW}/dispatches`, 'POST',
        {ref:branch,inputs:{candidate_sha:commit.sha,validation_id:id}});
      if (!dispatched.ok) return {ok:false, plan_expires_at:next.expiresAt, plan_token:await deps.signPlan(next), error:`O GitHub recusou a validação (HTTP ${dispatched.status}). Confira Actions e permissões.`, validation:{state:'dispatch_failed',publishable:false}};
      const detail = await dispatched.json().catch(()=>({}));
      if (Number.isSafeInteger(detail.workflow_run_id)) next.ci.runId = detail.workflow_run_id;
    } catch (_) { /* status resolves whether GitHub accepted the dispatch */ }
    return {ok:true, plan_expires_at:next.expiresAt, plan_token:await deps.signPlan(next), validation:{state:'queued',publishable:false}};
  }
  async function cancel(plan: any) {
    const run = await findRun(plan);
    if (run && run.status !== 'completed') await data(`/actions/runs/${run.id}/cancel`, 'POST');
    if (plan.ci) plan.ci.cancelled = true;
    return {ok:true, plan_expires_at:plan.expiresAt, plan_token:await deps.signPlan(plan), validation:{state:'cancelled',publishable:false}};
  }
  async function publish(plan: any) {
    if (!plan.ci || !(await status(plan)).publishable) throw new Error('Build/testes ainda não aprovaram este plano. Nada foi publicado.');
    const commit = await data(`/git/commits/${plan.ci.candidateSha}`);
    if (commit.tree?.sha !== plan.ci.treeSha || commit.parents?.length !== 1 || commit.parents[0].sha !== plan.baseCommitSha)
      throw new Error('O commit validado não corresponde ao plano.');
    const current = await data(`/git/ref/heads/${encodeURIComponent(branch)}`);
    if (current.object?.sha === plan.ci.candidateSha) return plan.ci.candidateSha;
    if (current.object?.sha !== plan.baseCommitSha) throw new Error('O projeto mudou desde o plano. Gere um novo plano.');
    await data(`/git/refs/heads/${encodeURIComponent(branch)}`, 'PATCH', {sha:plan.ci.candidateSha,force:false});
    return plan.ci.candidateSha;
  }
  return {setup,start,status,cancel,publish};
}
