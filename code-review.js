(() => {
  if (globalThis.VertexCodeReview) return;
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function diff(before,after) {
    const a=String(before??'').split('\n'),b=String(after).split('\n');
    if(before===null)a.length=0;
    let start=0,endA=a.length,endB=b.length;
    while(start<endA&&start<endB&&a[start]===b[start])start++;
    while(endA>start&&endB>start&&a[endA-1]===b[endB-1]){endA--;endB--;}
    const left=a.slice(start,endA),right=b.slice(start,endB),rows=[];
    for(let i=Math.max(0,start-3);i<start;i++)rows.push({type:' ',text:a[i]});
    if(left.length*right.length<=120000){
      const cols=right.length+1,dp=new Uint32Array((left.length+1)*cols);
      for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--)
        dp[i*cols+j]=left[i]===right[j]?1+dp[(i+1)*cols+j+1]:Math.max(dp[(i+1)*cols+j],dp[i*cols+j+1]);
      let i=0,j=0;
      while(i<left.length||j<right.length){
        if(i<left.length&&j<right.length&&left[i]===right[j]){rows.push({type:' ',text:left[i++]});j++;}
        else if(j<right.length&&(i===left.length||dp[i*cols+j+1]>=dp[(i+1)*cols+j]))rows.push({type:'+',text:right[j++]});
        else rows.push({type:'-',text:left[i++]});
      }
    }else{
      for(const text of left)rows.push({type:'-',text});
      for(const text of right)rows.push({type:'+',text});
    }
    for(let i=endB;i<Math.min(b.length,endB+3);i++)rows.push({type:' ',text:b[i]});
    return {rows,added:rows.filter(x=>x.type==='+').length,removed:rows.filter(x=>x.type==='-').length};
  }
  function render(files,base,assets=[]) {
    if(!Array.isArray(files)||!base)return '';
    return '<section class="next-code-review"><b>Alterações propostas</b><small>Verde: adicionado · vermelho: removido</small>'+files.map(f=>{
      if(!Object.hasOwn(base,f.path))return `<p>${esc(f.path)}: versão anterior indisponível.</p>`;
      const previous=base[f.path];const d=diff(previous,f.content);
      const rows=d.rows.slice(0,240).map(r=>`<span class="next-diff-${r.type==='+'?'add':r.type==='-'?'remove':'context'}">${r.type}${esc(r.text)}</span>`).join('\n');
      return `<details class="next-file-review"><summary>${esc(f.path)} ${previous===null?'(novo)':''} <em>+${d.added} −${d.removed}</em></summary><pre class="next-diff">${rows}</pre>`+
        (d.rows.length>240?'<small>Comparativo resumido. Abra os conteúdos completos abaixo.</small>':'')+
        `<details><summary>Antes — conteúdo completo</summary><pre>${previous===null?'Arquivo novo; não existia.':esc(previous)}</pre></details>`+
        `<details><summary>Depois — conteúdo completo</summary><pre>${esc(f.content)}</pre></details></details>`;
    }).join('')+(assets.length?`<p>Imagens incluídas: ${assets.map(a=>esc(a.path)).join(', ')}</p>`:'')+'</section>';
  }
  globalThis.VertexCodeReview={diff,render};
})();
