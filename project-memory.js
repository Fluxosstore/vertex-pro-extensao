(() => {
  if (globalThis.VertexProjectMemory) return;
  const TTL = 7 * 86400000;
  const PREFIX = 'vertex_project_memory_';
  function create(storage, cryptoApi = crypto, now = () => Date.now()) {
    const queues = new Map();
    async function scope(owner, repo, projectKey) {
      if (!owner || !repo || !projectKey) return null;
      const digest = await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([owner,repo,projectKey])));
      const key = PREFIX + [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
      return {key,owner,repo,projectKey};
    }
    async function read(scope) {
      if (!scope) return {turns:[]};
      const entry = (await storage.get(scope.key))[scope.key];
      if (!entry || entry.owner !== scope.owner || entry.repo !== scope.repo || entry.projectKey !== scope.projectKey ||
          !Number.isFinite(entry.at) || now()-entry.at > TTL) return {turns:[]};
      return {...entry,turns:Array.isArray(entry.turns) ? entry.turns.filter(t=>t && typeof t.user==='string' && typeof t.reply==='string').slice(-4) : []};
    }
    function update(scope, change) {
      if (!scope) return Promise.resolve({turns:[]});
      const previous = queues.get(scope.key) || Promise.resolve();
      const job = previous.catch(()=>{}).then(async()=>{
        const current = await read(scope);
        const next = {...current,...change(current),owner:scope.owner,repo:scope.repo,projectKey:scope.projectKey,at:now()};
        await storage.set({[scope.key]:next});
        return next;
      });
      queues.set(scope.key,job);
      job.finally(()=>{if(queues.get(scope.key)===job)queues.delete(scope.key);}).catch(()=>{});
      return job;
    }
    function append(scope,user,reply,patch={}) {
      return update(scope,current=>({...patch,turns:[...current.turns,{user:String(user||'').slice(0,500),reply:String(reply||'').slice(0,500),at:now()}].slice(-4)}));
    }
    const history = entry => entry.turns.flatMap(t=>[{role:'user',content:t.user},{role:'assistant',content:t.reply}]);
    const forget = scope => update(scope,()=>({turns:[],page:null}));
    async function prune() {
      const all = await storage.get(null);
      const entries = Object.entries(all).filter(([k])=>k.startsWith(PREFIX)).sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0));
      for (let i=0;i<entries.length;i++) if(i>=20 || now()-(entries[i][1]?.at||0)>TTL) await storage.remove(entries[i][0]);
    }
    return {scope,read,update,append,history,forget,prune};
  }
  globalThis.VertexProjectMemory = {create};
})();
