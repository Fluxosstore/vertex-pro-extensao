/* Declarative skills and evidence-only execution display. No eval or tool grants. */
(() => {
  const escape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stages = {coordinating:'Coordenador',analyzing:'Mapa do projeto',selecting_files:'Seleção de arquivos',reading_files:'Investigação',generating:'Implementação',checking:'Conferência de código',reviewing:'Revisor independente',repairing:'Autocorreção',review_passed:'Revisão concluída',review_blocked:'Problema encontrado pelo revisor',review_incomplete:'Revisão manual necessária',preparing_plan:'Proposta preparada',prepared:'Aguardando validação e aprovação'};
  function validate(raw) {
    if(!Array.isArray(raw)||raw.length>4)throw Error('Use uma lista com no máximo 4 skills.');
    const ids=new Set();
    return raw.map(s=>{
      if(!s||typeof s!=='object'||Object.keys(s).some(k=>!['id','name','version','instructions'].includes(k))||typeof s.id!=='string'||!/^custom-[a-z0-9-]{1,40}$/.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>80||typeof s.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s.version)||typeof s.instructions!=='string'||!s.instructions.trim()||s.instructions.length>2500)throw Error('Skill inválida. Use o modelo JSON; instruções têm limite de 2.500 caracteres.');
      ids.add(s.id);return {id:s.id,name:s.name.trim(),version:s.version,instructions:s.instructions.trim()};
    });
  }
  function trace(events) {
    const entries=(Array.isArray(events)?events:[]).filter(e=>stages[e?.stage]).slice(-8);
    return entries.length?'<ol class="next-engine-trace">'+entries.map(e=>`<li>${escape(stages[e.stage])}</li>`).join('')+'</ol>':'';
  }
  function render(engine) {
    if(!engine)return '';
    const review=engine.review||{},u=engine.usage||{};
    const label={passed:'Revisão por IA concluída',blocked:'Revisor encontrou problemas',incomplete:'Revisão por IA incompleta',pending:'Revisão por IA pendente'}[review.status]||'Revisão pendente';
    const tokens=Number(u.prompt_tokens||0)+Number(u.completion_tokens||0);
    return `<details class="next-engine-summary" open><summary>Motor Aurora · ${escape(engine.version)}</summary><p>${escape(label)}.</p><div class="next-engine-skills">${(engine.skills||[]).map(s=>`<span>${escape(s.name)} · ${escape(s.version)}</span>`).join('')}</div>${trace(engine.events)}${review.note?`<p>${escape(review.note)}</p>`:''}${(review.findings||[]).map(f=>`<p><b>${escape(f.path)}</b>: ${escape(f.message)}</p>`).join('')}<small>${Number(u.requests)||0} chamadas à IA · ${tokens.toLocaleString('pt-BR')} tokens${u.complete?' informados pelo provedor':' contabilizados parcialmente'}<br>Custo monetário não calculado. Nenhuma atualização automática do motor.</small></details>`;
  }
  globalThis.VertexAuroraEngine={validate,trace,render,stages,example:[{id:'custom-interface',name:'Padrões da interface',version:'1.0.0',instructions:'Preserve o design do projeto e confira rótulos acessíveis nos novos controles.'}]};
})();
