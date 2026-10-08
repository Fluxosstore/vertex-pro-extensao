// Revert only the signed, published tip commit. Never reset history or overwrite newer work.
export async function undoPublishedCommit(receipt: any, token: string, repo: string, branch: string, githubFetch: Function) {
  const root = `https://api.github.com/repos/${repo}`;
  const shaPattern = /^[a-f0-9]{40}$/;
  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await githubFetch(token,root+path,{method,signal:AbortSignal.timeout(15000),
      ...(body === undefined ? {} : {body:JSON.stringify(body)})});
    if (!response.ok) throw new Error(`Não foi possível desfazer (GitHub HTTP ${response.status}). Confira as permissões e se a branch mudou.`);
    return await response.json();
  }
  if (!shaPattern.test(receipt.commitSha) || !shaPattern.test(receipt.baseCommitSha)) throw new Error('Comprovante de alteração inválido.');
  const original = await api(`/git/commits/${receipt.commitSha}`);
  if (original.parents?.length !== 1 || original.parents[0].sha !== receipt.baseCommitSha)
    throw new Error('O commit não corresponde à alteração assinada pela Aurora.');
  const base = await api(`/git/commits/${receipt.baseCommitSha}`);
  if (!shaPattern.test(base.tree?.sha)) throw new Error('Não foi possível ler a versão anterior do projeto.');
  const refPath = `/git/ref/heads/${encodeURIComponent(branch)}`;
  const ref = await api(refPath);
  const head = ref.object?.sha;
  const marker = `Vertex-Undo: ${receipt.commitSha}`;
  if (head !== receipt.commitSha) {
    // An interrupted response may be retried after the revert was already published.
    if (shaPattern.test(head || '')) {
      const current = await api(`/git/commits/${head}`);
      if (current.parents?.length === 1 && current.parents[0].sha === receipt.commitSha &&
          current.tree?.sha === base.tree.sha && String(current.message || '').split('\n').includes(marker))
        return {sha:head,alreadyUndone:true};
    }
    throw new Error('O projeto recebeu outras alterações. Não vou desfazer este commit por cima delas.');
  }
  const reverted = await api('/git/commits','POST',{
    message:`Vertex Pro: desfazer alteração ${receipt.commitSha.slice(0,7)}\n\n${marker}`,
    tree:base.tree.sha,parents:[receipt.commitSha],
  });
  if (!shaPattern.test(reverted.sha || '')) throw new Error('O GitHub não confirmou o commit de reversão.');
  // A concurrent update makes this a non-fast-forward operation and GitHub rejects it.
  await api(`/git/refs/heads/${encodeURIComponent(branch)}`,'PATCH',{sha:reverted.sha,force:false});
  return {sha:reverted.sha,alreadyUndone:false};
}
