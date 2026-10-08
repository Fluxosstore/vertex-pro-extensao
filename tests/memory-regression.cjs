const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../project-memory.js'),'utf8');
const data={};const storage={get:async k=>structuredClone(k===null?data:{[k]:data[k]}),set:async d=>Object.assign(data,structuredClone(d)),remove:async k=>delete data[k]};
const ctx={TextEncoder,crypto:require('node:crypto').webcrypto};vm.createContext(ctx);vm.runInContext(source,ctx);let now=10000;const store=ctx.VertexProjectMemory.create(storage,ctx.crypto,()=>now);
(async()=>{
 const a=await store.scope('account-a','owner/repo','project-a'),b=await store.scope('account-a','owner/repo','project-b'),c=await store.scope('account-b','owner/repo','project-a');
 await store.append(a,'Troque auth','Commit aplicado',{page:'src/pages/Auth.tsx',lastUndo:{token:'opaque',sha:'abc'}});
 assert.equal((await store.read(b)).turns.length,0);assert.equal((await store.read(c)).turns.length,0);
 const restored=ctx.VertexProjectMemory.create(storage,ctx.crypto,()=>now);assert.equal((await restored.read(a)).page,'src/pages/Auth.tsx');
 await Promise.all([store.append(a,'a','ok'),store.append(a,'b','ok')]);assert.equal((await store.read(a)).turns.length,3);
 for(let i=0;i<10;i++)await store.append(a,'prompt'+i,'reply'+i);
 const e=await store.read(a);assert.equal(e.turns.length,4);assert.equal(store.history(e).length,8);assert.equal(e.turns[3].user,'prompt9');
 await store.forget(a);assert.equal((await store.read(a)).turns.length,0);assert.equal((await store.read(a)).page,null);assert((await store.read(a)).lastUndo);
 now+=8*86400000;assert.equal((await store.read(a)).turns.length,0);assert.equal((await store.read(a)).lastUndo,undefined);await store.prune();assert.equal(Object.keys(data).length,0);
 for(let i=0;i<22;i++){now++;await store.append(await store.scope('account-a','repo','project'+i),'hello','ok');}
 await store.prune();assert.equal(Object.keys(data).length,20);
 console.log('PASS: project/account isolation, reload recovery, serialized local updates, bounded history, explicit forget keeps undo, expiry and pruning.');
})().catch(e=>{console.error(e);process.exit(1)});
