/* =========================================================
   CAMPUS MONDE — écrans de la console d'administration et de l'espace étudiant
   (tableau de bord avec graphiques, dossiers, paiements, utilisateurs, notifications,
    profil avec photo obligatoire, nouvelle candidature, sécurité)
   Chargé après app.js : utilise ses fonctions et son état (S, ui, L, N, esc…).
   ========================================================= */

/* ---------- Petits utilitaires ---------- */
const CX_COLORS=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6','#e34948']; // ordre fixe
const dayKey=d=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Brazzaville',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))}catch(e){return String(d).slice(0,10)}};
const nf=n=>new Intl.NumberFormat(lang==='en'?'en-GB':'fr-FR').format(Math.round(n||0)).replace(/ /g,' ');
function rel(d){if(!d)return '—';const s=(Date.now()-new Date(d))/1000;
  if(s<60)return L('à l\'instant','just now');if(s<3600)return L(`il y a ${Math.floor(s/60)} min`,`${Math.floor(s/60)} min ago`);
  if(s<86400)return L(`il y a ${Math.floor(s/3600)} h`,`${Math.floor(s/3600)} h ago`);if(s<86400*7)return L(`il y a ${Math.floor(s/86400)} j`,`${Math.floor(s/86400)} d ago`);return fmtD(d)}
function initials(n){return String(n||'?').replace(/\(.*?\)/g,'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}
function avatar(u,size=36){
  if(!u)return `<span class="av" style="width:${size}px;height:${size}px">?</span>`;
  if(u.photo)return `<img class="av" src="/api/avatar/${u.id}?v=${u.photo}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" loading="lazy">`;
  let h=0;for(const c of String(u.id||u.name))h=(h*31+c.charCodeAt(0))>>>0;
  return `<span class="av" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px;background:${['#244BAA','#2a78d6','#C8540D','#1E7B4A','#6250d6','#B3261E'][h%6]}">${esc(initials(u.name))}</span>`;
}
const cf=k=>(ui.cf=ui.cf||{})[k];
const flag=c=>(CTRY(c)||{}).flag||'';
function pager(key,total,per){const pages=Math.max(1,Math.ceil(total/per));const p=Math.min(pages,Math.max(1,cf(key)||1));
  return {p,from:(p-1)*per,html:pages<=1?'':`<div class="cx-pager"><button class="btn btn-g btn-sm" data-cx="page" data-k="${key}" data-v="${p-1}" ${p<=1?'disabled':''}>‹</button><span class="small">${L('Page','Page')} ${p} / ${pages}</span><button class="btn btn-g btn-sm" data-cx="page" data-k="${key}" data-v="${p+1}" ${p>=pages?'disabled':''}>›</button></div>`}}
function empty(icon,t,sub,cta){return `<div class="cx-empty">${ic(icon,28)}<b>${t}</b>${sub?`<p class="small muted">${sub}</p>`:''}${cta||''}</div>`}

/* ---------- Graphiques SVG (sans bibliothèque externe) ---------- */
// Courbe/aire sur une série unique, avec info-bulle par colonne
function chartLine(pts,{color=CX_COLORS[0],fmt=nf,unit='',bars=false,h=200}={}){
  const n=pts.length||1;const max=Math.max(1,...pts.map(p=>p.v));const nice=(()=>{const e=Math.pow(10,Math.floor(Math.log10(max)));const m=max/e;return(m<=1?1:m<=2?2:m<=5?5:10)*e})();
  const W=480,H=h,pl=12+String(fmt(nice)).length*6.2,pr=10,pt=12,pb=24,iw=W-pl-pr,ih=H-pt-pb;
  const x=i=>pl+(n===1?iw/2:i*iw/(n-1)),y=v=>pt+ih-v/nice*ih,bw=Math.max(3,Math.min(26,iw/n-4));
  let g='';const steps=nice<=5?nice:5;for(let k=0;k<=steps;k++){const v=nice*k/steps,yy=y(v);g+=`<line x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}" class="cx-grid"/><text x="${pl-8}" y="${yy+4}" text-anchor="end" class="cx-ax">${fmt(v)}</text>`}
  const lab=[0,Math.floor((n-1)/2),n-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>pts[i]?`<text x="${bars?pl+(i+.5)*iw/n:x(i)}" y="${H-6}" text-anchor="${n>1&&i===n-1?'end':n>1&&i===0?'start':'middle'}" class="cx-ax">${esc(pts[i].l)}</text>`:'').join('');
  let marks='';
  if(bars)marks=pts.map((p,i)=>{const cx=pl+(i+.5)*iw/n,hh=ih-(y(p.v)-pt);return p.v?`<rect x="${cx-bw/2}" y="${y(p.v)}" width="${bw}" height="${Math.max(0,hh)}" rx="3" fill="${color}"/>`:''}).join('');
  else{const line=pts.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
    marks=`<path d="${line} L${x(n-1)} ${pt+ih} L${x(0)} ${pt+ih}Z" fill="${color}" opacity=".12"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`+
      pts.map((p,i)=>p.v?`<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="2"/>`:'').join('')}
  const hit=pts.map((p,i)=>{const cx=bars?pl+(i+.5)*iw/n:x(i),w=iw/Math.max(1,bars?n:n-1);return `<rect x="${cx-w/2}" y="${pt}" width="${w}" height="${ih}" fill="transparent" class="cx-hit" data-tip="${esc(p.full||p.l)} : <b>${esc(fmt(p.v))}${unit}</b>"/>`}).join('');
  return `<svg class="cx-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Graphique','Chart')}">${g}<line x1="${pl}" x2="${W-pr}" y1="${pt+ih}" y2="${pt+ih}" class="cx-base"/>${marks}${lab}${hit}</svg>`;
}
// Barres horizontales avec valeurs écrites (identité jamais portée par la seule couleur)
function chartBars(items,{fmt=nf,color,total}={}){
  const max=Math.max(1,...items.map(x=>x.v));const tot=total||items.reduce((a,b)=>a+b.v,0)||1;
  return `<div class="cx-bars">${items.map((x,i)=>`<div class="cx-bar ${x.act?'click':''}" ${x.act||''} data-tip="${esc(x.l)} : <b>${esc(fmt(x.v))}</b> (${Math.round(x.v/tot*100)} %)"><div class="cx-bar-l"><span>${x.pre||''}${esc(x.l)}</span><b>${fmt(x.v)}</b></div><div class="cx-bar-t"><i style="width:${x.v/max*100}%;background:${x.c||color||CX_COLORS[0]}"></i></div></div>`).join('')}</div>`;
}
// Anneau avec légende chiffrée
function chartDonut(items,{center='',sub=''}={}){
  const tot=items.reduce((a,b)=>a+b.v,0);const R=62,r=42,C=78;let a0=-Math.PI/2,segs='';
  if(!tot)segs=`<circle cx="${C}" cy="${C}" r="${(R+r)/2}" fill="none" stroke="#E9EDF5" stroke-width="${R-r}"/>`;
  else items.forEach(x=>{if(!x.v)return;const a1=a0+x.v/tot*Math.PI*2-(items.filter(y=>y.v).length>1?.03:0);const big=a1-a0>Math.PI?1:0;
    const p=(a,rr)=>`${(C+rr*Math.cos(a)).toFixed(2)} ${(C+rr*Math.sin(a)).toFixed(2)}`;
    if(x.v===tot)segs+=`<circle cx="${C}" cy="${C}" r="${(R+r)/2}" fill="none" stroke="${x.c}" stroke-width="${R-r}" data-tip="${esc(x.l)} : <b>${x.v}</b>"/>`;
    else segs+=`<path d="M${p(a0,R)} A${R} ${R} 0 ${big} 1 ${p(a1,R)} L${p(a1,r)} A${r} ${r} 0 ${big} 0 ${p(a0,r)}Z" fill="${x.c}" data-tip="${esc(x.l)} : <b>${x.v}</b> (${Math.round(x.v/tot*100)} %)"/>`;
    a0=a1+(items.filter(y=>y.v).length>1?.03:0)});
  return `<div class="cx-donut"><svg viewBox="0 0 156 156" width="156" height="156" role="img" aria-label="${L('Répartition','Breakdown')}">${segs}<text x="78" y="78" text-anchor="middle" class="cx-dn-v">${center}</text><text x="78" y="96" text-anchor="middle" class="cx-ax">${sub}</text></svg>
  <ul>${items.map(x=>`<li ${x.act||''} class="${x.act?'click':''}"><i style="background:${x.c}"></i><span>${esc(x.l)}</span><b>${x.v}</b><em>${tot?Math.round(x.v/tot*100):0} %</em></li>`).join('')}</ul></div>`;
}
function spark(vals,color=CX_COLORS[0]){if(!vals.length)return '';const W=110,H=30,m=Math.max(1,...vals);
  const d=vals.map((v,i)=>`${i?'L':'M'}${(i*W/Math.max(1,vals.length-1)).toFixed(1)} ${(H-2-v/m*(H-4)).toFixed(1)}`).join('');
  return `<svg class="cx-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2"/></svg>`}
function delta(cur,prev){if(!prev&&!cur)return `<span class="cx-d">—</span>`;if(!prev)return `<span class="cx-d up">${L('nouveau','new')}</span>`;
  const p=Math.round((cur-prev)/prev*100);return `<span class="cx-d ${p>0?'up':p<0?'down':''}" title="${L('vs période précédente','vs previous period')}">${p>0?'▲':p<0?'▼':'='} ${Math.abs(p)} %</span>`}

/* Info-bulle partagée */
(function(){const tip=document.createElement('div');tip.id='cx-tip';document.body.appendChild(tip);
  document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.classList.remove('on');return}tip.innerHTML=t.dataset.tip;tip.classList.add('on')});
  document.addEventListener('mousemove',e=>{if(!tip.classList.contains('on'))return;const w=tip.offsetWidth;tip.style.left=Math.min(innerWidth-w-8,e.clientX+14)+'px';tip.style.top=(e.clientY+16)+'px'});
  document.addEventListener('scroll',()=>tip.classList.remove('on'),true)})();

/* ---------- Données du tableau de bord ---------- */
function periodDays(){return {7:7,30:30,90:90,365:365}[ui.dper||30]||30}
function series(dates,days,valueOf){
  // regroupe par jour (ou par mois sur 12 mois) sur la période, en heure de Brazzaville
  const byMonth=days>=365,out=[],idx={};const now=new Date();
  if(byMonth){for(let k=11;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth()-k,1);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');idx[key]=out.length;
      out.push({k:key,l:d.toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{month:'short'}),full:d.toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{month:'long',year:'numeric'}),v:0})}}
  else for(let k=days-1;k>=0;k--){const d=new Date(Date.now()-k*864e5);const key=dayKey(d);idx[key]=out.length;
    out.push({k:key,l:d.toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{day:'2-digit',month:'short'}),full:d.toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long'}),v:0})}
  dates.forEach(x=>{if(!x.d)return;const k=byMonth?dayKey(x.d).slice(0,7):dayKey(x.d);if(k in idx)out[idx[k]].v+=valueOf?valueOf(x):1});
  return out;
}
const STAGES=[
  {k:'todo',fr:'À traiter',en:'To process',s:['submitted','review']},
  {k:'inc',fr:'Pièces à compléter',en:'Documents required',s:['incomplete']},
  {k:'inst',fr:'Chez l\'établissement',en:'With institution',s:['ready','transmitted','pending']},
  {k:'adm',fr:'Admis / inscrits',en:'Admitted / enrolled',s:['admitted','predeparture','enrolled']},
  {k:'closed',fr:'Clôturés',en:'Closed',s:['refused','withdrawn','closed']}];
const stageColor=i=>i<4?CX_COLORS[i]:'#9AA3B5';

function adDash(u){
  const A=myApps(u),days=periodDays(),since=Date.now()-days*864e5,prevSince=since-days*864e5;
  const sub=A.map(a=>({a,d:a.submitted||(a.history.find(h=>h.s==='submitted')||{}).at})).filter(x=>x.d);
  const inP=sub.filter(x=>new Date(x.d)>=since),inPrev=sub.filter(x=>new Date(x.d)>=prevSince&&new Date(x.d)<since);
  const mgr=can.seeAll(u);
  const pays=(S.payments&&S.payments.length?S.payments:A.flatMap(a=>(a.payments||[]).map(p=>Object.assign({appRef:a.ref},p))));
  const paid=pays.filter(p=>p.status==='paid');const pIn=paid.filter(p=>new Date(p.paidAt)>=since),pPrev=paid.filter(p=>new Date(p.paidAt)>=prevSince&&new Date(p.paidAt)<since);
  const sum=l=>l.reduce((a,b)=>a+(b.amount||0),0);const cur=(S.pay&&S.pay.currency)||'XAF';
  const decided=A.filter(a=>a.decision&&['admitted','refused'].includes(a.decision.value));const adm=decided.filter(a=>a.decision.value==='admitted').length;
  const lead=A.map(a=>{const s=a.history.find(h=>h.s==='submitted'),r=a.history.find(h=>['ready','transmitted'].includes(h.s));return s&&r?(new Date(r.at)-new Date(s.at))/864e5:null}).filter(x=>x!==null);
  const avgLead=lead.length?lead.reduce((a,b)=>a+b,0)/lead.length:null;
  const sSub=series(inP.map(x=>({d:x.d})),days),sPay=series(pIn.map(p=>({d:p.paidAt,v:p.amount})),days,x=>x.v);
  const st=STAGES.map((g,i)=>({l:N(g),v:A.filter(a=>g.s.includes(a.status)).length,c:stageColor(i),act:`data-cx="goApps" data-v="${g.k}"`}));
  const reached=k=>A.filter(a=>a.history.some(h=>k.includes(h.s))).length;
  const funnel=[[L('Soumis','Submitted'),['submitted']],[L('En vérification','Under review'),['review','incomplete','ready']],[L('Validés','Validated'),['ready']],[L('Transmis','Sent'),['transmitted']],[L('Admis','Admitted'),['admitted']],[L('Inscrits','Enrolled'),['enrolled']]].map(x=>({l:x[0],v:reached(x[1])}));
  const byC=COUNTRIES.filter(c=>c.feat||A.some(a=>a.country===c.id)).map(c=>({l:N(c),pre:(c.flag||'')+' ',v:A.filter(a=>a.country===c.id).length,act:`data-cx="goApps" data-c="${c.id}"`})).sort((a,b)=>b.v-a.v);
  const byM=Object.keys(PAYM).map((m,i)=>({l:N(PAYM[m]),v:paid.filter(p=>p.method===m).length,c:CX_COLORS[i]}));
  const agents=S.users.filter(x=>x.role==='agent').map(g=>{const mine=A.filter(a=>a.agent===g.id);return {g,open:mine.filter(a=>!['refused','withdrawn','closed','enrolled'].includes(a.status)).length,todo:mine.filter(a=>['submitted','review'].includes(a.status)).length,done:mine.filter(a=>['ready','transmitted','pending','admitted','enrolled','predeparture'].includes(a.status)).length}});
  const stale=A.filter(a=>!['closed','withdrawn','enrolled','refused'].includes(a.status)&&(Date.now()-new Date(a.history[a.history.length-1].at))>3*864e5);
  const per=[[7,L('7 jours','7 days')],[30,L('30 jours','30 days')],[90,L('90 jours','90 days')],[365,L('12 mois','12 months')]];
  const kpi=(label,val,d,sp,icn,go)=>`<button class="cx-kpi click" ${go||''}><div class="cx-kpi-h"><span>${ic(icn,16)} ${label}</span><em class="cx-go">→</em></div><b>${val}</b><div class="cx-kpi-f">${d||''}${sp||''}</div></button>`;
  const cnt=(n,k,f,cur)=>`<span data-count="${n}" data-ck="${k}" data-fmt="${f||'int'}"${cur?` data-cur="${cur}"`:''}>${f==='money'?money(n,cur):f==='pct'?n+' %':nf(n)}</span>`;
  return `<div class="cx-head"><div><h2>${L('Tableau de bord','Dashboard')}</h2><p class="small muted">${L('Bonjour','Hello')} ${esc(u.name.split(' ')[0])} · <span id="cx-live" class="cx-live"><i></i>${L('En direct','Live')} · ${L('actualisé à','updated at')} ${new Date().toLocaleTimeString(lang==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'})} · ${L('prochaine mise à jour dans','next update in')} <em>60 s</em></span></p></div>
   <div class="cx-tools"><div class="seg">${per.map(p=>`<button class="${(ui.dper||30)===p[0]?'on':''}" data-cx="dper" data-v="${p[0]}">${p[1]}</button>`).join('')}</div><button class="btn btn-g btn-sm" data-cx="refresh" title="${L('Actualiser','Refresh')}">↻</button></div></div>
  <div class="cx-kpis">
   ${kpi(L('Dossiers soumis','Files submitted'),cnt(inP.length,'d-sub'),delta(inP.length,inPrev.length),spark(sSub.map(x=>x.v)),'folder','data-cx="go" data-v="apps"')}
   ${mgr?kpi(L('Frais encaissés','Fees collected'),cnt(sum(pIn),'d-pay','money',cur==='XAF'?'FCFA':cur),delta(sum(pIn),sum(pPrev)),spark(sPay.map(x=>x.v),CX_COLORS[2]),'receipt','data-cx="go" data-v="pay"'):kpi(L('Mes dossiers ouverts','My open files'),cnt(A.filter(a=>!['refused','withdrawn','closed','enrolled'].includes(a.status)).length,'d-open'),'','','folder','data-cx="go" data-v="apps"')}
   ${kpi(L('Taux d\'admission','Admission rate'),decided.length?cnt(Math.round(adm/decided.length*100),'d-adm','pct'):'—',`<span class="cx-d">${adm}/${decided.length} ${L('décisions','decisions')}</span><span class="cx-ring" style="--p:${decided.length?adm/decided.length*100:0}"></span>`,'','chart','data-cx="goApps" data-v="adm"')}
   ${kpi(L('Délai moyen de traitement','Avg. processing time'),avgLead===null?'—':(avgLead<1?L('< 1 jour','< 1 day'):nf(avgLead)+L(' j',' d')),`<span class="cx-d">${L('soumission → validation','submission → validation')}</span>`,'','clock','data-cx="go" data-v="apps"')}
  </div>
  <div class="cx-pipe">${STAGES.map((g,i)=>{const n=A.filter(a=>g.s.includes(a.status)).length;return `<button data-cx="goApps" data-v="${g.k}" title="${L('Voir ces dossiers','View these files')}"><i style="background:${stageColor(i)}"></i><span>${N(g)}</span><b>${cnt(n,'p-'+g.k)}</b><u style="--w:${A.length?n/A.length*100:0}%;--c:${stageColor(i)}"></u></button>`}).join('')}</div>
  <div class="cx-grid2">
   <div class="card flat"><h3>${ic('chart')} ${L('Dossiers soumis','Files submitted')} <span class="muted small">· ${per.find(p=>p[0]===(ui.dper||30))[1]}</span></h3>${inP.length?chartLine(sSub,{color:CX_COLORS[0]}):empty('chart',L('Aucun dossier soumis sur la période','No files submitted in this period'))}</div>
   ${mgr?`<div class="card flat"><h3>${ic('receipt')} ${L('Encaissements','Payments collected')} <span class="muted small">· ${cur==='XAF'?'FCFA':cur}</span></h3>${pIn.length?chartLine(sPay,{color:CX_COLORS[2],bars:true,unit:' '+(cur==='XAF'?'FCFA':cur)}):empty('receipt',L('Aucun paiement sur la période','No payments in this period'))}</div>`:`<div class="card flat"><h3>${ic('users')} ${L('Ma file de travail','My queue')}</h3>${chartBars(st)}</div>`}
  </div>
  <div class="cx-grid3">
   <div class="card flat"><h3>${ic('folder')} ${L('Répartition des dossiers','Files by stage')}</h3>${chartDonut(st,{center:A.length,sub:L('dossiers','files')})}</div>
   <div class="card flat"><h3>${ic('globe')} ${L('Destinations','Destinations')}</h3>${chartBars(byC)}</div>
   <div class="card flat"><h3>${ic('receipt')} ${L('Moyens de paiement','Payment methods')}</h3>${paid.length?chartBars(byM)+`<p class="small muted" style="margin-top:10px">${paid.length} ${L('paiements confirmés','confirmed payments')} · ${money(sum(paid),cur)}</p>`:empty('receipt',L('Aucun paiement confirmé','No confirmed payments'))}</div>
  </div>
  <div class="cx-grid2">
   <div class="card flat"><h3>${ic('sliders')} ${L('Entonnoir de traitement','Processing funnel')}</h3><div class="cx-funnel">${funnel.map((f,i)=>`<div><span>${f.l}</span><div class="cx-funnel-t"><i style="width:${funnel[0].v?f.v/funnel[0].v*100:0}%"></i></div><b>${f.v}</b><em>${i&&funnel[0].v?Math.round(f.v/funnel[0].v*100)+' %':''}</em></div>`).join('')}</div></div>
   <div class="card flat"><h3>${ic('users')} ${L('Charge des agents','Officer workload')}</h3>${agents.length?`<table class="cx-tbl"><thead><tr><th>${L('Agent','Officer')}</th><th>${L('En cours','Open')}</th><th>${L('À traiter','To process')}</th><th>${L('Traités','Done')}</th></tr></thead><tbody>${agents.map(x=>`<tr><td><div class="cx-who">${avatar(x.g,28)}<span>${esc(x.g.name)}</span></div></td><td><b>${x.open}</b></td><td>${x.todo?`<span class="tag warn">${x.todo}</span>`:'0'}</td><td>${x.done}</td></tr>`).join('')}</tbody></table>`:empty('users',L('Aucun agent','No officers'))}</div>
  </div>
  <div class="cx-grid2">
   ${ivDashCard()}
   <div class="card flat"><h3>${ic('clock')} ${L('À relancer — sans action depuis 3 jours','Follow up — idle for 3 days')} ${stale.length?`<span class="tag warn">${stale.length}</span>`:''}</h3>${stale.length?stale.slice(0,8).map(a=>`<div class="cx-row click" data-act="openFile" data-id="${a.id}">${avatar(USER(a.uid),32)}<div><b>${esc(a.ref)}</b> · ${esc(USER(a.uid)?.name||'')}<div class="small muted">${rel(a.history[a.history.length-1].at)}</div></div>${stTag(a.status)}</div>`).join(''):empty('check',L('Tout est à jour','All up to date'))}</div>
  </div>
  <div class="cx-grid1">
   <div class="card flat"><h3>${ic('history')} ${L('Activité récente','Recent activity')}</h3>${(S.audit||[]).length?S.audit.slice(0,8).map(x=>`<div class="cx-feed"><i></i><div><b>${esc(x.action)}</b><div class="small muted">${esc(x.user)} · ${esc(x.target)} · ${rel(x.at)}</div></div></div>`).join(''):A.slice().sort((a,b)=>new Date(b.history[b.history.length-1].at)-new Date(a.history[a.history.length-1].at)).slice(0,8).map(a=>{const h=a.history[a.history.length-1];return `<div class="cx-feed"><i></i><div><b>${esc(a.ref)} → ${N(STATUS[h.s])}</b><div class="small muted">${esc(h.by)} · ${rel(h.at)}</div></div></div>`}).join('')||empty('history',L('Aucune activité','No activity'))}</div>
  </div>`;
}

/* ---------- Dossiers ---------- */
function adApps(u){
  const all=myApps(u);const stg=cf('stg')||'';const q=(cf('q')||'').toLowerCase();
  let A=all.filter(a=>{const cu=USER(a.uid)||{};const t=((cu.name||'')+' '+(cu.email||'')+' '+a.ref).toLowerCase();const g=STAGES.find(x=>x.k===stg);
    return(!q||t.includes(q))&&(!g||g.s.includes(a.status))&&(!cf('c')||a.country===cf('c'))&&(!cf('ag')||a.agent===cf('ag'))&&(!cf('pay')||(cf('pay')==='paid'?!!paidOf(a):!paidOf(a)))});
  const upd=a=>new Date(a.history[a.history.length-1].at);const so=cf('sort')||'recent';
  A.sort((a,b)=>so==='old'?upd(a)-upd(b):so==='ref'?a.ref.localeCompare(b.ref):so==='name'?(USER(a.uid)?.name||'').localeCompare(USER(b.uid)?.name||''):upd(b)-upd(a));
  const pg=pager('pApps',A.length,15);const agents=S.users.filter(x=>x.role==='agent');
  const sel=(k,opts,ph)=>`<select data-cf="${k}"><option value="">${ph}</option>${opts.map(o=>`<option value="${o[0]}" ${cf(k)===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  return `<div class="cx-head"><div><h2>${L('Dossiers','Applications')}</h2><p class="small muted">${A.length} ${L('dossier(s)','file(s)')}${A.length!==all.length?` ${L('sur','of')} ${all.length}`:''}${can.seeAll(u)?'':' · '+L('uniquement ceux qui vous sont affectés','only those assigned to you')}</p></div>${can.export(u)?`<button class="btn btn-g btn-sm" data-act="exportCsv">${ic('download',18)} ${L('Exporter CSV','Export CSV')}</button>`:''}</div>
  <div class="cx-chips"><button class="${!stg?'on':''}" data-cx="cf" data-k="stg" data-v="">${L('Tous','All')} <b>${all.length}</b></button>${STAGES.map((g,i)=>`<button class="${stg===g.k?'on':''}" data-cx="cf" data-k="stg" data-v="${g.k}"><i style="background:${stageColor(i)}"></i>${N(g)} <b>${all.filter(a=>g.s.includes(a.status)).length}</b></button>`).join('')}</div>
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="q" placeholder="${L('Nom, e-mail ou référence…','Name, email or reference…')}" value="${esc(cf('q')||'')}"></div>
   ${sel('c',COUNTRIES.map(c=>[c.id,(c.flag?c.flag+' ':'')+N(c)]),L('Tous pays','All countries'))}
   ${can.seeAll(u)?sel('ag',agents.map(g=>[g.id,g.name]),L('Tous agents','All officers')):''}
   ${payOn()||S.payments?.length?sel('pay',[['paid',L('Frais payés','Fee paid')],['unpaid',L('Non payés','Not paid')]],L('Paiement','Payment')):''}
   ${sel('sort',[['old',L('Plus anciens','Oldest')],['ref',L('Référence','Reference')],['name',L('Candidat','Applicant')]],L('Plus récents','Most recent'))}</div>
  ${A.length?`<div class="tbl-w"><table class="cx-tbl"><thead><tr><th>${L('Candidat','Applicant')}</th><th>${L('Programme','Programme')}</th><th>${L('Pièces','Docs')}</th><th>${L('Paiement','Payment')}</th><th>${L('Agent','Officer')}</th><th>${L('Statut','Status')}</th><th>${L('Activité','Activity')}</th></tr></thead><tbody>${A.slice(pg.from,pg.from+15).map(a=>{const cu=USER(a.uid)||{},p=PROG(a.prog);const req=requiredDocs(a);const ok=req.filter(k=>{const d=latest(a,k);return d&&d.status==='ok'}).length,have=req.filter(k=>a.docs.some(d=>d.type===k)).length;const py=paidOf(a);
    return `<tr class="click" data-act="openFile" data-id="${a.id}"><td><div class="cx-who">${avatar(cu,34)}<div><b>${esc(cu.name||'')}</b><div class="small muted">${esc(a.ref)}</div></div></div></td><td>${esc(p?N(p):'—')}<div class="small muted">${flag(a.country)} ${esc(INST(a.inst)?.name||'')}</div></td><td><div class="cx-mini" title="${ok} ${L('conformes','compliant')} / ${have} ${L('déposées','uploaded')} / ${req.length} ${L('requises','required')}"><i style="width:${req.length?ok/req.length*100:0}%"></i></div><span class="small muted">${ok}/${req.length}</span></td><td>${py?`<span class="tag ok">${L('Payé','Paid')}</span>`:`<span class="tag grey">${L('Non payé','Unpaid')}</span>`}</td><td class="small">${a.agent?esc(USER(a.agent)?.name||''):`<span class="muted">${L('Non affecté','Unassigned')}</span>`}</td><td>${stTag(a.status)}</td><td class="small muted">${rel(a.history[a.history.length-1].at)}</td></tr>`}).join('')}</tbody></table></div>${pg.html}`:empty('folder',L('Aucun dossier ne correspond','No matching files'),L('Modifiez les filtres ou la recherche.','Change the filters or search.'),`<button class="btn btn-g btn-sm" data-cx="reset">${L('Réinitialiser les filtres','Reset filters')}</button>`)}`;
}

/* ---------- Paiements + réglages ---------- */
function adPay(u){
  const P=(S.payments||[]).slice();const cfg=S.pay||{};const cur=cfg.currency||'XAF';const q=(cf('pq')||'').toLowerCase();
  const F=P.filter(p=>(!cf('pst')||p.status===cf('pst'))&&(!cf('pm')||p.method===cf('pm'))&&(!q||(p.ref+' '+p.appRef+' '+(p.candidate||'')+' '+p.phone).toLowerCase().includes(q)));
  const paid=P.filter(p=>p.status==='paid');const month=paid.filter(p=>dayKey(p.paidAt).slice(0,7)===dayKey(new Date()).slice(0,7));
  const tried=P.filter(p=>['paid','failed'].includes(p.status)).length;const pg=pager('pPay',F.length,15);
  const sum=l=>l.reduce((a,b)=>a+b.amount,0);
  const C=(n,k,f)=>`<span data-count="${n}" data-ck="${k}" data-fmt="${f||'int'}" data-cur="${cur==='XAF'?'FCFA':cur}">${f==='money'?money(n,cur):f==='pct'?n+' %':nf(n)}</span>`;
  const tiles=[[L('Total encaissé','Total collected'),C(sum(paid),'pa-t','money'),'receipt','paid'],[L('Ce mois-ci','This month'),C(sum(month),'pa-m','money'),'calendar','paid'],[L('Paiements confirmés','Confirmed payments'),C(paid.length,'pa-n'),'check','paid'],[L('En attente','Pending'),C(P.filter(p=>p.status==='pending').length,'pa-p'),'clock','pending'],[L('Taux de réussite','Success rate'),tried?C(Math.round(paid.length/tried*100),'pa-r','pct'):'—','chart','failed']];
  const sel=(k,opts,ph)=>`<select data-cf="${k}"><option value="">${ph}</option>${opts.map(o=>`<option value="${o[0]}" ${cf(k)===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  return `<div class="cx-head"><div><h2>${L('Paiements','Payments')}</h2><p class="small muted">${L('Frais de dossier réglés par Mobile Money ou carte bancaire.','Application fees paid by Mobile Money or bank card.')} ${cfg.mode==='simulation'?`<span class="tag warn">${L('Mode simulation','Simulation mode')}</span>`:`<span class="tag ok">${L('Paiements réels','Live payments')}</span>`}</p></div><button class="btn btn-g btn-sm" data-cx="payCsv">${ic('download',18)} ${L('Exporter CSV','Export CSV')}</button></div>
  <div class="cx-kpis k5">${tiles.map(t=>`<button class="cx-kpi click ${cf('pst')===t[3]?'sel':''}" data-cx="cf" data-k="pst" data-v="${cf('pst')===t[3]?'':t[3]}"><div class="cx-kpi-h"><span>${ic(t[2],16)} ${t[0]}</span><em class="cx-go">⌕</em></div><b>${t[1]}</b></button>`).join('')}</div>
  ${u.role==='admin'?`<form class="card flat cx-settings" data-form="paySettings"><h3>${ic('sliders')} ${L('Réglages des frais de dossier','Application fee settings')}</h3>
   <div class="cx-set-row"><div class="f"><label>${L('Montant des frais','Fee amount')} (${cur==='XAF'?'FCFA':cur})</label><input name="fee" type="number" min="0" step="500" value="${cfg.fee||0}" required><span class="small muted">${L('0 = aucun paiement demandé','0 = no payment required')}</span></div>
   <div class="f"><label>${L('Moyens de paiement proposés','Payment methods offered')}</label><div class="cx-checks">${Object.keys(PAYM).map(m=>`<label><input type="checkbox" name="m_${m}" ${(cfg.methods||[]).includes(m)?'checked':''}> ${pmBadge(m)} ${N(PAYM[m])}</label>`).join('')}</div></div>
   <div><button class="btn btn-b">${L('Enregistrer','Save')}</button></div></div></form>`:''}
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="pq" placeholder="${L('Référence, dossier, candidat, téléphone…','Reference, file, applicant, phone…')}" value="${esc(cf('pq')||'')}"></div>${sel('pst',Object.keys(PAYST).map(s=>[s,N(PAYST[s])]),L('Tous statuts','All statuses'))}${sel('pm',Object.keys(PAYM).map(m=>[m,N(PAYM[m])]),L('Tous moyens','All methods'))}</div>
  ${F.length?`<div class="tbl-w"><table class="cx-tbl"><thead><tr><th>Date</th><th>${L('Transaction','Transaction')}</th><th>${L('Dossier / candidat','File / applicant')}</th><th>${L('Moyen','Method')}</th><th style="text-align:right">${L('Montant','Amount')}</th><th>${L('Statut','Status')}</th><th></th></tr></thead><tbody>${F.slice(pg.from,pg.from+15).map(p=>`<tr><td class="small">${fmtD(p.created,1)}</td><td><b class="mono">${esc(p.ref)}</b><div class="small muted">${esc(p.providerRef||'')}</div></td><td><a href="#" data-act="openFile" data-id="${p.app}">${esc(p.appRef||'')}</a><div class="small muted">${esc(p.candidate||'')}</div></td><td>${pmBadge(p.method)}${p.phone?`<div class="small muted">${esc(p.phone)}</div>`:''}</td><td style="text-align:right"><b>${money(p.amount,p.currency)}</b></td><td>${payTag(p.status)}${p.note?`<div class="small muted">${esc(p.note)}</div>`:''}</td><td>${u.role==='admin'&&p.status==='paid'?`<button class="btn btn-g btn-sm" data-cx="refund" data-v="${p.id}">${L('Rembourser','Refund')}</button>`:''}</td></tr>`).join('')}</tbody></table></div>${pg.html}`:empty('receipt',L('Aucun paiement','No payments'),L('Les paiements des candidats apparaîtront ici.','Applicant payments will appear here.'))}`;
}

/* ---------- Utilisateurs ---------- */
function adUsers(u){
  const R=cf('role')||'';const q=(cf('uq')||'').toLowerCase();
  const U=S.users.filter(x=>(!R||x.role===R)&&(!q||(x.name+' '+x.email).toLowerCase().includes(q)));
  const cnt=r=>S.users.filter(x=>x.role===r).length;const pg=pager('pUsers',U.length,15);
  const roleC={candidat:'grey',agent:'',responsable:'or',admin:'ok'};
  const work=x=>x.role==='candidat'?S.apps.filter(a=>a.uid===x.id&&a.status!=='draft').length:x.role==='agent'?S.apps.filter(a=>a.agent===x.id&&!['refused','withdrawn','closed','enrolled'].includes(a.status)).length:'—';
  return `<div class="cx-head"><div><h2>${L('Utilisateurs & rôles','Users & roles')}</h2><p class="small muted">${S.users.length} ${L('comptes','accounts')}</p></div></div>
  <div class="cx-kpis k4">${[['candidat','user'],['agent','users'],['responsable','shield'],['admin','lock']].map(([r,i])=>`<button class="cx-kpi click ${R===r?'sel':''}" data-cx="cf" data-k="role" data-v="${R===r?'':r}"><div class="cx-kpi-h"><span>${ic(i,16)} ${N(ROLES[r])}${r==='candidat'?'s':''}</span><em class="cx-go">⌕</em></div><b><span data-count="${cnt(r)}" data-ck="u-${r}">${cnt(r)}</span></b></button>`).join('')}</div>
  <div class="cx-split"><div>
   <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="uq" placeholder="${L('Nom ou e-mail…','Name or email…')}" value="${esc(cf('uq')||'')}"></div>${R?`<button class="btn btn-g btn-sm" data-cx="cf" data-k="role" data-v="">${L('Tous les rôles','All roles')} ✕</button>`:''}</div>
   ${U.length?`<div class="tbl-w"><table class="cx-tbl"><thead><tr><th>${L('Utilisateur','User')}</th><th>${L('Rôle','Role')}</th><th>${L('Dossiers','Files')}</th><th>${L('Créé','Created')}</th></tr></thead><tbody>${U.slice(pg.from,pg.from+15).map(x=>`<tr><td><div class="cx-who">${avatar(x,36)}<div><b>${esc(x.name)}</b> ${x.verified?`<span title="${L('E-mail vérifié','Email verified')}" class="cx-ok">${ic('check',14)}</span>`:`<span class="tag warn">${L('non vérifié','unverified')}</span>`}<div class="small muted">${esc(x.email)}</div></div></div></td><td>${x.role==='candidat'||x.id===u.id?`<span class="tag ${roleC[x.role]}">${N(ROLES[x.role])}</span>`:`<select data-role="${x.id}" class="cx-sel">${['agent','responsable','admin'].map(r=>`<option value="${r}" ${x.role===r?'selected':''}>${N(ROLES[r])}</option>`).join('')}</select>`}</td><td>${work(x)}</td><td class="small muted">${fmtD(x.created)}</td></tr>`).join('')}</tbody></table></div>${pg.html}`:empty('users',L('Aucun utilisateur','No users'))}
  </div>
  <form class="card flat" data-form="addStaff"><h3>${ic('plus')} ${L('Créer un compte personnel','Create a staff account')}</h3><div class="f"><label>${L('Nom complet','Full name')}</label><input name="name" required></div><div class="f"><label>${L('E-mail professionnel','Work email')}</label><input name="email" type="email" required></div><div class="f"><label>${L('Rôle','Role')}</label><select name="role"><option value="agent">${N(ROLES.agent)}</option><option value="responsable">${N(ROLES.responsable)}</option><option value="admin">${N(ROLES.admin)}</option></select></div><p class="small muted">${L('Comptes nominatifs uniquement. Un mot de passe temporaire est envoyé par e-mail.','Named accounts only. A temporary password is emailed.')}</p><button class="btn btn-b" style="width:100%">${L('Créer le compte','Create account')}</button></form></div>`;
}

/* ---------- Notifications envoyées ---------- */
function mailKind(m){if(/code|mot de passe|réinitialisation/i.test(m.subj))return 'sec';if(/^\[Interne\]/.test(m.subj))return 'int';return 'cand'}
function adOut(u){
  const K=cf('mk')||'';const q=(cf('mq')||'').toLowerCase();
  const M=S.outbox.filter(m=>(!K||mailKind(m)===K)&&(!q||(m.to+' '+m.subj+' '+m.body).toLowerCase().includes(q)));
  const kinds=[['',L('Toutes','All'),'mail'],['cand',L('Candidats','Applicants'),'user'],['int',L('Interne','Internal'),'users'],['sec',L('Sécurité','Security'),'lock']];
  const pg=pager('pOut',M.length,20);const smtp=S.outbox.some(m=>m.sent);
  return `<div class="cx-head"><div><h2>${L('Notifications envoyées','Sent notifications')}</h2><p class="small muted">${L('Les e-mails contiennent un résumé non sensible et invitent à se connecter. Aucun document n\'est joint ; les codes sont masqués.','Emails contain a non-sensitive summary and invite users to log in. No documents attached; codes are masked.')}</p></div>${smtp?'':`<span class="tag warn" title="${L('Sans SMTP, les e-mails sont écrits dans le journal du serveur.','Without SMTP, emails are written to the server log.')}">${L('SMTP non configuré','SMTP not configured')}</span>`}</div>
  <div class="cx-chips">${kinds.map(k=>`<button class="${K===k[0]?'on':''}" data-cx="cf" data-k="mk" data-v="${k[0]}">${ic(k[2],14)} ${k[1]} <b>${k[0]?S.outbox.filter(m=>mailKind(m)===k[0]).length:S.outbox.length}</b></button>`).join('')}</div>
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="mq" placeholder="${L('Destinataire, objet ou contenu…','Recipient, subject or content…')}" value="${esc(cf('mq')||'')}"></div></div>
  ${M.length?`<div class="cx-list">${M.slice(pg.from,pg.from+20).map(m=>{const k=mailKind(m);return `<details class="cx-mail"><summary><span class="cx-mi ${k}">${ic(k==='sec'?'lock':k==='int'?'users':'mail',16)}</span><div class="cx-mail-m"><b>${esc(m.subj)}</b><span class="small muted">${esc(m.to)}</span></div><span class="tag ${m.sent?'ok':'grey'}">${m.sent?L('Envoyé','Sent'):L('Journal local','Local log')}</span><span class="small muted cx-when" title="${fmtD(m.at,1)}">${rel(m.at)}</span></summary><p>${esc(m.body)}</p><p class="small muted">${fmtD(m.at,1)}</p></details>`}).join('')}</div>${pg.html}`:empty('mail',L('Aucune notification','No notifications'))}`;
}

/* ---------- Demandes d'information ---------- */
function adLeads(){
  const q=(cf('lq')||'').toLowerCase();const C=S.contacts.filter(c=>!q||(c.name+' '+c.email+' '+c.msg+' '+c.dest).toLowerCase().includes(q));const pg=pager('pLeads',C.length,12);
  return `<div class="cx-head"><div><h2>${L('Demandes d\'information','Enquiries')}</h2><p class="small muted">${S.contacts.length} ${L('demande(s) reçue(s) via le formulaire de contact','enquiries received via the contact form')}</p></div></div>
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="lq" placeholder="${L('Nom, e-mail, destination, message…','Name, email, destination, message…')}" value="${esc(cf('lq')||'')}"></div></div>
  ${C.length?`<div class="cx-cards">${C.slice(pg.from,pg.from+12).map(c=>{const tel=String(c.phone||'').replace(/[^\d+]/g,'');return `<div class="card flat cx-lead"><div class="cx-who">${avatar({name:c.name,id:c.email},38)}<div><b>${esc(c.name)}</b><div class="small muted">${rel(c.at)} · <span class="tag">${esc(c.kind||'—')}</span>${c.dest?` · ${esc(c.dest)}`:''}</div></div></div><p>${esc(c.msg)}</p><div class="cx-actions"><a class="btn btn-g btn-sm" href="mailto:${esc(c.email)}">${ic('mail',16)} ${esc(c.email)}</a>${tel?`<a class="btn btn-g btn-sm" href="tel:${esc(tel)}">${esc(c.phone)}</a><a class="btn btn-g btn-sm" href="https://wa.me/${esc(tel.replace('+',''))}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div></div>`}).join('')}</div>${pg.html}`:empty('inbox',L('Aucune demande','No enquiries'),L('Les messages du formulaire Contact apparaîtront ici.','Contact form messages will appear here.'))}`;
}

/* ---------- Journal d'activité ---------- */
function adAudit(){
  const q=(cf('aq')||'').toLowerCase();const X=S.audit.filter(x=>!q||(x.user+' '+x.action+' '+x.target).toLowerCase().includes(q));const pg=pager('pAudit',X.length,30);
  let last='';const rows=X.slice(pg.from,pg.from+30).map(x=>{const d=dayKey(x.at);const h=d!==last?`<div class="cx-day">${new Date(x.at).toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>`:'';last=d;
    return h+`<div class="cx-feed"><i></i><div><b>${esc(x.action)}</b><div class="small muted">${new Date(x.at).toLocaleTimeString(lang==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'})} · ${esc(x.user)} · ${esc(x.target)}</div></div></div>`}).join('');
  return `<div class="cx-head"><div><h2>${L('Journal d\'activité','Activity log')}</h2><p class="small muted">${L('Toutes les actions sensibles sont tracées (300 dernières).','All sensitive actions are logged (latest 300).')}</p></div></div>
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="aq" placeholder="${L('Utilisateur, action, dossier…','User, action, file…')}" value="${esc(cf('aq')||'')}"></div></div>
  <div class="card flat">${rows||empty('list',L('Aucune entrée','No entries'))}</div>${pg.html}`;
}

/* =========================================================
   Espace étudiant
   ========================================================= */
function stChecklist(u,apps){
  const p=u.profile||{};const items=[[!!u.photo,L('Photo de profil','Profile photo'),'profile'],[['first','last','dob','nat','country','city','phone'].every(k=>p[k]),L('Informations personnelles','Personal details'),'profile'],[u.verified,L('E-mail vérifié','Email verified'),'security'],[apps.some(a=>a.status!=='draft'),L('Première candidature soumise','First application submitted'),'new']];
  const done=items.filter(x=>x[0]).length;
  return `<div class="card flat st-hero"><div class="st-hero-a">${avatar(u,72)}<div><h2 style="margin:0">${L('Bonjour','Hello')} ${esc(p.first||u.name.split(' ')[0])}</h2><p class="small muted" style="margin:4px 0 10px">${esc(u.email)}</p><div class="cx-mini big"><i style="width:${done/items.length*100}%"></i></div><span class="small"><b>${done}/${items.length}</b> ${L('étapes de votre compte terminées','account steps completed')}</span></div></div>
  <ul class="st-check">${items.map(x=>`<li class="${x[0]?'ok':''}"><span>${x[0]?ic('check',14):''}</span>${x[0]?x[1]:`<a href="#" data-act="ctab" data-id="${x[2]}">${x[1]}</a>`}</li>`).join('')}</ul></div>`;
}
function stApps(u){
  const apps=S.apps.filter(a=>a.uid===u.id);
  const card=a=>{const p=PROG(a.prog),i=INST(a.inst);const req=requiredDocs(a);const have=req.filter(k=>a.docs.some(d=>d.type===k)).length;
    const pi=PATH.indexOf(a.status);const steps=[L('Projet','Project'),L('Pièces','Docs')].concat(payOn()?[L('Paiement','Payment')]:[]).concat([L('Soumis','Submitted'),L('Traitement','Review'),L('Décision','Decision')]);
    const reached=a.status==='draft'?(!a.prog?0:have<req.length?1:payOn()&&!paidOf(a)?2:(payOn()?3:2)):(pi<0?steps.length-1:Math.min(steps.length-1,(payOn()?3:2)+(pi>=2?(pi>=4?2:1):0)));
    return `<div class="card flat st-app click" data-act="openApp" data-id="${a.id}"><div class="st-app-h"><span class="st-flag">${flag(a.country)||'🎓'}</span><div style="flex:1"><b>${esc(p?N(p):L('Programme à choisir','Programme to choose'))}</b><div class="small muted">${esc(i?i.name:'')}${a.country?' · '+N(CTRY(a.country)):''} · ${esc(a.ref)}</div></div>${stTag(a.status)}</div>
      <ol class="st-steps">${steps.map((s,k)=>`<li class="${k<reached?'done':k===reached?'on':''}"><i></i><span>${s}</span></li>`).join('')}</ol>
      <div class="st-app-f small muted"><span>${ic('clip',14)} ${have}/${req.length} ${L('pièces','documents')}</span>${paidOf(a)?`<span>${ic('receipt',14)} ${L('Frais payés','Fee paid')}</span>`:payOn()&&a.status==='draft'?`<span>${ic('receipt',14)} ${L('Frais à régler','Fee due')}</span>`:''}<span>${ic('clock',14)} ${rel(a.history[a.history.length-1].at)}</span><span class="st-go">${a.status==='draft'?L('Continuer →','Continue →'):L('Voir le dossier →','View file →')}</span></div></div>`};
  return `${stChecklist(u,apps)}<div class="cx-head" style="margin-top:22px"><h2>${L('Mes candidatures','My applications')}</h2><button class="btn btn-o btn-sm" data-act="ctab" data-id="new">${ic('plus',16)} ${L('Nouvelle candidature','New application')}</button></div>
  ${apps.length?`<div class="st-apps">${apps.map(card).join('')}</div>`:empty('folder',L('Aucune candidature pour le moment','No applications yet'),L('Choisissez une formation pour commencer votre dossier.','Choose a programme to start your file.'),`<button class="btn btn-o" data-act="ctab" data-id="new">${L('Commencer une candidature','Start an application')}</button>`)}`;
}
function stNew(u){
  const drafts=S.apps.filter(a=>a.uid===u.id&&a.status==='draft');const c=cf('nc')||'';const lv=cf('nl')||'';const q=(cf('nq')||'').toLowerCase();
  const P=S.programs.filter(p=>{const i=INST(p.inst)||{};return(!c||i.country===c)&&(!lv||p.level===lv)&&(!q||(N(p)+' '+i.name+' '+i.city).toLowerCase().includes(q))});
  return `<div class="cx-head"><div><h2>${L('Nouvelle candidature','New application')}</h2><p class="small muted">${L('Choisissez la formation qui vous intéresse. Votre dossier est enregistré en brouillon à chaque étape.','Choose the programme you want. Your file is saved as a draft at every step.')}</p></div></div>
  ${drafts.length?`<div class="alert info" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>${L('Vous avez','You have')} ${drafts.length} ${L('brouillon(s) en cours','draft(s) in progress')} : ${drafts.map(d=>`<b>${esc(d.ref)}</b>`).join(', ')}</span><button class="btn btn-b btn-sm" data-act="openApp" data-id="${drafts[0].id}">${L('Reprendre le brouillon','Resume draft')}</button></div>`:''}
  <div class="cx-chips nc-chips"><button class="${!c?'on':''}" data-cx="cf" data-k="nc" data-v="">${ic('globe',15)} ${L('Toutes destinations','All destinations')}</button>${COUNTRIES.filter(x=>x.feat).map(x=>`<button class="${c===x.id?'on':''}" data-cx="cf" data-k="nc" data-v="${x.id}"><i class="nc-code" style="background:${x.grad}">${x.code}</i>${N(x)}</button>`).join('')}
   <label class="nc-more ${c&&!CTRY(c)?.feat?'on':''}">${ic('globe',15)}<select data-cf="nc" aria-label="${L('Choisir un pays','Choose a country')}"><option value="">${L('Autres pays…','Other countries…')}</option>${REGIONS.map(r=>`<optgroup label="${L(r[1],r[2])}">${COUNTRIES.filter(x=>x.reg===r[0]).map(x=>{const n=S.programs.filter(p=>(INST(p.inst)||{}).country===x.id).length;return `<option value="${x.id}" ${c===x.id?'selected':''}>${N(x)}${n?` (${n})`:''}</option>`}).join('')}</optgroup>`).join('')}</select></label></div>
  <div class="cx-filters"><div class="cx-search">${ic('search',16)}<input data-cf="nq" placeholder="${L('Formation, établissement, ville…','Programme, institution, city…')}" value="${esc(cf('nq')||'')}"></div><select data-cf="nl"><option value="">${L('Tous niveaux','All levels')}</option><option value="licence" ${lv==='licence'?'selected':''}>Licence / Bachelor</option><option value="master" ${lv==='master'?'selected':''}>Master</option></select></div>
  ${P.length?`<div class="st-progs">${P.map(p=>{const i=INST(p.inst)||{};return `<div class="card flat st-prog"><div class="st-prog-h"><span class="st-flag">${flag(i.country)}</span><span class="tag">${p.level==='master'?'Master':'Licence / Bachelor'}</span>${p.open?`<span class="tag ok">${L('Candidatures ouvertes','Open')}</span>`:''}</div><h3>${esc(N(p))}</h3><p class="small muted">${esc(i.name||'')} · ${esc(i.city||'')}</p><div class="st-prog-m small"><span>${ic('book',14)} ${p.lang==='EN'?L('Anglais','English'):L('Français','French')}</span>${p.dur?`<span>${ic('calendar',14)} ${esc(p.dur)}</span>`:''}${p.period?`<span>${ic('clock',14)} ${esc(p.period)}</span>`:''}</div><button class="btn btn-o" style="width:100%" data-cx="startApp" data-v="${p.id}">${L('Choisir cette formation','Choose this programme')}</button></div>`}).join('')}</div>`:(c&&!q&&!lv?`<div class="nc-empty"><span class="nc-big" style="background:${(CTRY(c)||{}).grad}">${(CTRY(c)||{}).code||''}</span><div><h3>${L('Formations sur demande','Programmes on request')} — ${esc(N(CTRY(c)||{fr:c,en:c}))}</h3><p>${L('Aucune formation n’est encore publiée pour ce pays. Votre conseiller vous présente les écoles et universités adaptées à votre profil, puis crée la formation dans votre dossier.','No programme is published for this country yet. Your adviser presents suitable schools and universities, then adds the programme to your file.')}</p><div class="btn-row"><a class="btn btn-o btn-sm" href="#" data-act="ctab" data-id="rdv">${ic('calendar',16)} ${L('Prendre rendez-vous','Book a meeting')}</a><a class="btn btn-g btn-sm" href="#pays-${c}">${L('Voir la page du pays','See country page')}</a></div></div></div>`:empty('search',L('Aucune formation ne correspond','No matching programme')))}
  <p class="small muted" style="margin-top:18px">${L('Vous ne trouvez pas votre formation ?','Can\'t find your programme?')} <a href="#" data-cx="startApp" data-v="">${L('Commencer sans choisir maintenant','Start without choosing now')}</a> · <a href="#contact">${L('Parler à un conseiller','Talk to an advisor')}</a></p>`;
}
function profileView(u){
  const p=u.profile||{};const fld=(k,l,t,ph,req=true)=>`<div class="f"><label>${l}${req?' *':''}</label><input name="${k}" type="${t||'text'}" value="${esc(p[k]||'')}" ${ph?`placeholder="${ph}"`:''} ${req?'required':''}></div>`;
  const fields=['first','last','dob','nat','country','city','phone'];const done=fields.filter(k=>p[k]).length+(u.photo?1:0);
  return `<div class="cx-head"><div><h2>${L('Mon profil','My profile')}</h2><p class="small muted">${L('Ces informations figurent sur votre dossier et votre reçu de dépôt.','This information appears on your file and submission receipt.')}</p></div><span class="tag ${done===8?'ok':'warn'}">${done===8?L('Profil complet','Profile complete'):`${done}/8 ${L('complété','completed')}`}</span></div>
  <div class="st-prof">
   <div class="card flat st-photo"><h3>${ic('camera')} ${L('Photo de profil','Profile photo')} <span class="req">*</span></h3>
    <div class="st-photo-box ${u.photo?'':'missing'}">${u.photo?`<img src="/api/avatar/${u.id}?v=${u.photo}" alt="${L('Votre photo','Your photo')}">`:`<span>${ic('user',48)}</span>`}</div>
    ${u.photo?'':`<div class="alert err small" style="margin:12px 0 0">${L('Photo obligatoire pour soumettre une candidature.','Photo required to submit an application.')}</div>`}
    <label class="btn btn-${u.photo?'g':'o'}" style="width:100%;margin-top:12px;cursor:pointer">${ic('camera',16)} ${u.photo?L('Changer la photo','Change photo'):L('Ajouter ma photo','Add my photo')}<input type="file" accept="image/jpeg,image/png" data-photo="1" hidden></label>
    <ul class="small muted st-rules"><li>${L('Photo d\'identité récente, visage de face','Recent passport-style photo, face forward')}</li><li>${L('Fond clair et uni, sans lunettes de soleil','Plain light background, no sunglasses')}</li><li>${L('JPG ou PNG, 2 Mo maximum, 150 × 150 px minimum','JPG or PNG, max 2 MB, min 150 × 150 px')}</li></ul></div>
   <form class="card flat" data-form="profile"><h3>${ic('user')} ${L('Informations personnelles','Personal details')}</h3><p class="small muted">${L('Nom et prénoms tels qu\'indiqués sur votre pièce d\'identité.','Name exactly as shown on your ID document.')}</p>
    <div class="row2">${fld('first',L('Prénom(s)','First name(s)'))}${fld('last',L('Nom','Last name'))}</div>
    <div class="row2">${fld('dob',L('Date de naissance','Date of birth'),'date')}${fld('nat',L('Nationalité','Nationality'),'text','Congolaise')}</div>
    <div class="row2">${fld('country',L('Pays de résidence','Country of residence'),'text','Congo')}${fld('city',L('Ville','City'),'text','Brazzaville')}</div>
    <div class="row2">${fld('phone',L('Téléphone (indicatif international)','Phone (international format)'),'tel','+242 06 000 00 00')}${fld('emergency',L('Personne à contacter en cas d\'urgence','Emergency contact'),'text','',false)}</div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-b">${L('Enregistrer','Save')}</button></div></form>
  </div>`;
}
function stMail(u){
  const M=S.outbox.filter(m=>m.to===u.email);const unread=new Set(M.filter(m=>!m.read).map(m=>m.id));
  if(unread.size){api('POST','/api/outbox/read').catch(()=>{});S.outbox.forEach(m=>{if(m.to===u.email)m.read=true})}
  const today=dayKey(new Date());let last='';
  return `<div class="cx-head"><div><h2>${L('Notifications','Notifications')}</h2><p class="small muted">${L('Copie des e-mails envoyés à votre adresse. Ils ne contiennent jamais vos documents.','Copies of emails sent to you. They never contain your documents.')}</p></div>${unread.size?`<span class="tag or">${unread.size} ${L('nouvelle(s)','new')}</span>`:''}</div>
  ${M.length?`<div class="cx-list">${M.map(m=>{const d=dayKey(m.at);const g=d===today?L('Aujourd\'hui','Today'):new Date(m.at).toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric'});const h=g!==last?`<div class="cx-day">${g}</div>`:'';last=g;
    const k=/paiement/i.test(m.subj)?'receipt':/message/i.test(m.subj)?'chat':/décision|admis/i.test(m.subj)?'check':/code|mot de passe/i.test(m.subj)?'lock':'mail';
    return h+`<div class="st-note ${unread.has(m.id)?'new':''}"><span class="cx-mi cand">${ic(k,16)}</span><div><b>${esc(m.subj.replace(/^Campus Monde — /,''))}</b><p>${esc(m.body)}</p></div><span class="small muted cx-when" title="${fmtD(m.at,1)}">${rel(m.at)}</span></div>`}).join('')}</div>`:empty('bell',L('Aucune notification','No notifications'),L('Vous serez prévenu ici à chaque étape de votre dossier.','You will be notified here at each step of your file.'))}`;
}
function stSecurity(u){
  return `<div class="cx-head"><div><h2>${L('Sécurité','Security')}</h2><p class="small muted">${L('Gérez l\'accès à votre compte et vos données personnelles.','Manage access to your account and personal data.')}</p></div></div>
  <div class="st-sec">
   <div class="card flat"><h3>${ic('user')} ${L('Mon compte','My account')}</h3><table><tbody><tr><th>E-mail</th><td>${esc(u.email)} ${u.verified?`<span class="tag ok">${ic('check',12)} ${L('vérifié','verified')}</span>`:`<span class="tag warn">${L('non vérifié','not verified')}</span>`}</td></tr><tr><th>${L('Compte créé le','Created on')}</th><td>${fmtD(u.created)}</td></tr><tr><th>${L('Rôle','Role')}</th><td>${N(ROLES[u.role])}</td></tr></tbody></table></div>
   <form class="card flat" data-form="chpw"><h3>${ic('lock')} ${L('Changer mon mot de passe','Change my password')}</h3><div class="f"><label>${L('Mot de passe actuel','Current password')}</label><input name="current" type="password" autocomplete="current-password" required></div><div class="row2"><div class="f"><label>${L('Nouveau mot de passe','New password')}</label><input name="pw" type="password" autocomplete="new-password" minlength="8" required></div><div class="f"><label>${L('Confirmer','Confirm')}</label><input name="pw2" type="password" autocomplete="new-password" required></div></div><p class="small muted">${L('8 caractères minimum dont 1 chiffre. Vos autres sessions seront déconnectées.','At least 8 characters including 1 digit. Your other sessions will be logged out.')}</p><button class="btn btn-b">${L('Mettre à jour','Update')}</button></form>
   <div class="card flat"><h3>${ic('shield')} ${L('Sessions','Sessions')}</h3><p class="small">${L('Un appareil perdu ou partagé ? Déconnectez toutes les sessions ouvertes, y compris celle-ci.','Lost or shared device? Log out of every open session, including this one.')}</p><button class="btn btn-g" data-act="logoutAll">${L('Déconnecter toutes les sessions','Log out of all sessions')}</button></div>
   <div class="card flat"><h3>${ic('download')} ${L('Mes données','My data')}</h3><p class="small">${L('Téléchargez une copie de vos données (profil, candidatures, historique). Pour une suppression, contactez Campus Monde.','Download a copy of your data (profile, applications, history). For deletion, contact Campus Monde.')}</p><div class="cx-actions"><a class="btn btn-g" href="/api/me/export" target="_blank" rel="noopener">${L('Télécharger (JSON)','Download (JSON)')}</a><a class="btn btn-g" href="#contact">${L('Demander la suppression','Request deletion')}</a></div></div>
  </div>`;
}

/* ---------- Actions propres à ces écrans ---------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-cx]');if(!t)return;e.preventDefault();const v=t.dataset.v;
  switch(t.dataset.cx){
    case 'cf':ui.cf=ui.cf||{};ui.cf[t.dataset.k]=v;Object.keys(ui.cf).filter(k=>k[0]==='p'&&/^p[A-Z]/.test(k)).forEach(k=>ui.cf[k]=1);rerender();break;
    case 'page':ui.cf=ui.cf||{};ui.cf[t.dataset.k]=+v;rerender();scrollTo(0,0);break;
    case 'reset':ui.cf={};rerender();break;
    case 'dper':ui.dper=+v;rerender();break;
    case 'refresh':await load().catch(()=>{});rerender();toast(L('Données actualisées.','Data refreshed.'));break;
    case 'goApps':ui.cf=Object.assign(ui.cf||{},{stg:v||'',c:t.dataset.c||'',pApps:1});ui.atab='apps';rerender();scrollTo(0,0);break;
    case 'startApp':newApp(v||null);break;
    case 'refund':{const note=prompt(L('Motif et référence du remboursement (obligatoire) :','Refund reason and reference (required):'));if(!note)return;run(()=>api('POST',`/api/payments/${v}/refund`,{note}),L('Paiement marqué comme remboursé.','Payment marked as refunded.'));break}
    case 'payCsv':{const rows=[['Date','Transaction','Réf. prestataire','Dossier','Candidat','Moyen','Téléphone','Montant','Devise','Statut','Payé le','Note']].concat((S.payments||[]).map(p=>[p.created,p.ref,p.providerRef,p.appRef,p.candidate,N(PAYM[p.method]||{fr:p.method,en:p.method}),p.phone,p.amount,p.currency,N(PAYST[p.status]||{fr:p.status,en:p.status}),p.paidAt||'',p.note||'']));
      const csv='﻿'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""').replace(/^([=+\-@])/,"'$1")+'"').join(';')).join('\r\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`campus-monde-paiements-${dayKey(new Date())}.csv`;document.body.appendChild(a);a.click();a.remove();break}
  }
});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.cf)return;ui.cf=ui.cf||{};ui.cf[t.dataset.cf]=t.value;Object.keys(ui.cf).filter(k=>/^p[A-Z]/.test(k)).forEach(k=>ui.cf[k]=1);
  clearTimeout(window._cxd);window._cxd=setTimeout(()=>{const pos=t.selectionStart;rerender();const n=document.querySelector(`[data-cf="${t.dataset.cf}"]`);if(n&&n.tagName==='INPUT'){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},t.tagName==='SELECT'?0:250)});
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.photo)return;const f=t.files[0];if(!f)return;
  if(!/\.(jpe?g|png)$/i.test(f.name)){ui.msg={t:'err',m:L('Format refusé : photo JPG ou PNG uniquement.','Format rejected: JPG or PNG photo only.')};rerender();return}
  if(f.size>2*1024*1024){ui.msg={t:'err',m:L('Photo trop volumineuse (2 Mo maximum).','Photo too large (max 2 MB).')};rerender();return}
  const fd=new FormData();fd.append('file',f);toast(L('Envoi de la photo…','Uploading photo…'));run(()=>api('POST','/api/profile/photo',fd,true),L('Photo de profil enregistrée.','Profile photo saved.'))});
document.addEventListener('submit',async e=>{const fm=e.target;if(!['paySettings','chpw'].includes(fm.dataset.form))return;e.preventDefault();e.stopImmediatePropagation();
  const d=Object.fromEntries(new FormData(fm));
  if(fm.dataset.form==='paySettings'){const methods=Object.keys(PAYM).filter(m=>fm.elements['m_'+m]&&fm.elements['m_'+m].checked);run(()=>api('PATCH','/api/settings',{fee:parseInt(d.fee,10)||0,methods}),L('Réglages des paiements enregistrés.','Payment settings saved.'));return}
  if(fm.dataset.form==='chpw'){if(!checkRequired(fm,[['current',L('Mot de passe actuel','Current password')],['pw',L('Nouveau mot de passe','New password')],['pw2',L('Confirmer','Confirm')]]))return;
    if(d.pw!==d.pw2){ui.msg={t:'err',m:L('Les deux mots de passe ne correspondent pas.','The two passwords do not match.')};rerender();scrollTo(0,0);return}
    run(()=>api('POST','/api/auth/password',{current:d.current,pw:d.pw}),L('Mot de passe modifié.','Password changed.'))}
},true);

/* Mise à jour automatique du tableau de bord (toutes les 60 s, onglet visible uniquement) */
setInterval(async()=>{try{if(document.visibilityState!=='visible'||typeof route==='undefined'||route!=='admin'||(ui.atab||'dash')!=='dash'||!ME()||document.querySelector('#modal.open'))return;
  const y=scrollY;await load();rerender();scrollTo(0,y)}catch(e){}},60000);

/* =========================================================
   Entretiens avec un conseiller
   ========================================================= */
const IVM={presentiel:{fr:'Au bureau',en:'At the office',d:{fr:'211, av. de la Base, Batignolles (arrêt Bopaka), Brazzaville',en:'211, av. de la Base, Batignolles (Bopaka stop), Brazzaville'},i:'building'},visio:{fr:'Visioconférence',en:'Video call',d:{fr:'Lien envoyé par e-mail avant le rendez-vous',en:'Link emailed before the meeting'},i:'laptop'},telephone:{fr:'Téléphone',en:'Phone',d:{fr:'Un conseiller vous appelle',en:'An adviser calls you'},i:'chat'}};
const IVT={orientation:{fr:'Orientation et choix des études',en:'Guidance and study choices'},dossier:{fr:'Constitution du dossier',en:'Preparing the application'},visa:{fr:'Visa et départ',en:'Visa and departure'},financement:{fr:'Financement et bourses',en:'Funding and scholarships'},autre:{fr:'Autre question',en:'Other question'}};
const IVS={requested:{fr:'À confirmer',en:'To confirm',c:'warn'},confirmed:{fr:'Confirmé',en:'Confirmed',c:'ok'},done:{fr:'Réalisé',en:'Done',c:''},no_show:{fr:'Absent',en:'No-show',c:'err'},cancelled:{fr:'Annulé',en:'Cancelled',c:'grey'}};
const ivTag=s=>`<span class="tag ${(IVS[s]||{}).c||''}">${N(IVS[s]||{fr:s,en:s})}</span>`;
const ivUser=id=>USER(id)||(S.ivUsers||[]).find(x=>x.id===id);
const bz=(d,o)=>{try{return new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',Object.assign({timeZone:'Africa/Brazzaville'},o)).format(new Date(d))}catch(e){return fmtD(d,1)}};
const bzTime=d=>bz(d,{hour:'2-digit',minute:'2-digit'});
const bzDay=d=>bz(d,{weekday:'long',day:'numeric',month:'long'});
const upcoming=l=>l.filter(x=>['requested','confirmed'].includes(x.status)&&new Date(x.slot).getTime()+x.duration*6e4>Date.now());
function ics(iv){const f=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const end=new Date(new Date(iv.slot).getTime()+iv.duration*6e4);
  const loc=iv.mode==='presentiel'?N(IVM.presentiel.d):iv.mode==='visio'?(iv.link||L('Visioconférence','Video call')):L('Appel téléphonique','Phone call');
  const t=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Campus Monde//Entretiens//FR','BEGIN:VEVENT',`UID:${iv.id}@campusmonde`,`DTSTAMP:${f(new Date())}`,`DTSTART:${f(iv.slot)}`,`DTEND:${f(end)}`,`SUMMARY:Campus Monde — ${N(IVT[iv.topic]||IVT.autre)}`,`LOCATION:${loc.replace(/,/g,'\\,')}`,`DESCRIPTION:${L('Entretien','Interview')} ${iv.ref} (${N(IVM[iv.mode])})`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/calendar'}));a.download=`campus-monde-${iv.ref}.ics`;document.body.appendChild(a);a.click();a.remove()}

async function ivLoadSlots(force){if(ui.ivSlots&&!force)return;ui.ivSlots={loading:1};try{const r=await api('GET','/api/interviews/slots');ui.ivSlots={list:r.slots,cfg:r.settings}}catch(e){ui.ivSlots={err:e.message}}if((ui.ctab||'')==='rdv')rerender()}
function stRdv(u){
  const mine=(S.interviews||[]).filter(x=>x.uid===u.id);const next=upcoming(mine)[0];const past=mine.filter(x=>x!==next);
  const head=`<div class="cx-head"><div><h2>${L('Mon entretien avec un conseiller','My meeting with an adviser')}</h2><p class="small muted">${L('Un entretien gratuit pour faire le point sur votre projet d\'études, votre dossier ou votre départ.','A free meeting to discuss your study plans, your application or your departure.')}</p></div></div>`;
  const hist=past.length?`<h3 style="margin-top:24px">${L('Historique','History')}</h3><div class="cx-list">${past.map(x=>`<div class="st-note"><span class="cx-mi cand">${ic(IVM[x.mode]?.i||'calendar',16)}</span><div><b>${bzDay(x.slot)} · ${bzTime(x.slot)}</b><p>${N(IVT[x.topic]||IVT.autre)} · ${N(IVM[x.mode]||{fr:x.mode,en:x.mode})} · ${esc(x.ref)}</p></div>${ivTag(x.status)}</div>`).join('')}</div>`:'';
  if(next){const st=ivUser(next.staff);
    return head+`<div class="card flat iv-next"><div class="iv-date"><span>${bz(next.slot,{month:'short'})}</span><b>${bz(next.slot,{day:'numeric'})}</b><em>${bz(next.slot,{weekday:'short'})}</em></div>
     <div class="iv-body"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">${bzTime(next.slot)} · ${N(IVT[next.topic]||IVT.autre)}</h3>${ivTag(next.status)}</div>
      <p class="small muted" style="margin:4px 0 12px">${bzDay(next.slot)} · ${next.duration} min · ${L('heure de Brazzaville','Brazzaville time')} · ${esc(next.ref)}</p>
      <div class="iv-facts"><div>${ic(IVM[next.mode].i,18)}<div><b>${N(IVM[next.mode])}</b><span class="small muted">${next.mode==='visio'&&next.link?`<a href="${esc(next.link)}" target="_blank" rel="noopener">${L('Rejoindre la visioconférence','Join the video call')}</a>`:next.mode==='telephone'?L('Au','On')+' '+esc(next.phone):N(IVM[next.mode].d)}</span></div></div>
       <div>${ic('user',18)}<div><b>${st?esc(st.name):L('Conseiller attribué à la confirmation','Adviser assigned on confirmation')}</b><span class="small muted">${next.status==='requested'?L('En attente de confirmation par Campus Monde','Awaiting confirmation by Campus Monde'):L('Rendez-vous confirmé','Meeting confirmed')}</span></div></div></div>
      ${next.message?`<p class="small" style="margin-top:12px"><b>${L('Votre message :','Your message:')}</b> ${esc(next.message)}</p>`:''}
      <div class="cx-actions" style="margin-top:14px"><button class="btn btn-g btn-sm" data-cx="ivIcs" data-v="${next.id}">${ic('calendar',16)} ${L('Ajouter à mon agenda','Add to my calendar')}</button><button class="btn btn-g btn-sm" data-cx="ivCancel" data-v="${next.id}">${L('Annuler le rendez-vous','Cancel the meeting')}</button></div></div></div>`+hist}
  const sl=ui.ivSlots;if(!sl)ivLoadSlots();
  const cfg=(sl&&sl.cfg)||S.iv||{};const modes=(cfg.modes||['presentiel']);const f=ui.ivf=ui.ivf||{};if(!f.mode||!modes.includes(f.mode))f.mode=modes[0];f.topic=f.topic||'orientation';
  if(cfg.enabled===false)return head+empty('calendar',L('Prise de rendez-vous momentanément fermée','Booking temporarily closed'),L('Contactez Campus Monde par téléphone ou WhatsApp.','Contact Campus Monde by phone or WhatsApp.'),`<a class="btn btn-o" href="#contact">${L('Nous contacter','Contact us')}</a>`)+hist;
  let slotsHtml='';
  if(!sl||sl.loading)slotsHtml=`<p class="muted small">${L('Chargement des créneaux…','Loading slots…')}</p>`;
  else if(sl.err)slotsHtml=`<div class="alert err">${esc(sl.err)}</div>`;
  else if(!sl.list.length)slotsHtml=empty('calendar',L('Aucun créneau libre pour le moment','No free slot at the moment'),L('Revenez bientôt ou contactez-nous.','Check back soon or contact us.'));
  else{const days={};sl.list.forEach(s=>{const k=dayKey(s);(days[k]=days[k]||[]).push(s)});const keys=Object.keys(days);if(!f.day||!days[f.day])f.day=keys[0];
    slotsHtml=`<div class="iv-days">${keys.map(k=>`<button type="button" class="${f.day===k?'on':''}" data-cx="ivDay" data-v="${k}"><em>${bz(days[k][0],{weekday:'short'})}</em><b>${bz(days[k][0],{day:'numeric'})}</b><span>${bz(days[k][0],{month:'short'})}</span><small>${days[k].length} ${L('libres','free')}</small></button>`).join('')}</div>
     <div class="iv-times">${days[f.day].map(s=>`<button type="button" class="${f.slot===s?'on':''}" data-cx="ivSlot" data-v="${s}">${bzTime(s)}</button>`).join('')}</div>`}
  return head+`<form class="card flat iv-book" data-form="ivBook" novalidate>
   <div class="iv-step"><span>1</span><h3>${L('Sujet de l\'entretien','Topic')}</h3></div>
   <div class="cx-chips">${Object.keys(IVT).map(k=>`<button type="button" class="${f.topic===k?'on':''}" data-cx="ivTopic" data-v="${k}">${N(IVT[k])}</button>`).join('')}</div>
   <div class="iv-step"><span>2</span><h3>${L('Type d\'entretien','Meeting type')}</h3></div>
   <div class="pm-grid">${modes.map(m=>`<button type="button" class="pm-opt ${f.mode===m?'on':''}" data-cx="ivMode" data-v="${m}">${ic(IVM[m].i,22)}<b>${N(IVM[m])}</b><span class="small muted">${N(IVM[m].d)}</span></button>`).join('')}</div>
   ${f.mode==='telephone'?`<div class="f" style="max-width:360px;margin-top:12px"><label>${L('Numéro à appeler','Number to call')} *</label><input name="phone" type="tel" value="${esc(f.phone||(u.profile||{}).phone||'')}" required></div>`:''}
   <div class="iv-step"><span>3</span><h3>${L('Date et heure','Date and time')} <span class="small muted">· ${cfg.duration||30} min · ${L('heure de Brazzaville','Brazzaville time')}</span></h3></div>
   ${slotsHtml}
   <div class="f" style="margin-top:16px"><label>${L('Message pour le conseiller (facultatif)','Message for the adviser (optional)')}</label><textarea name="message" rows="3" maxlength="1000" placeholder="${L('Ex. : je vise un master en informatique au Canada pour septembre 2027.','E.g. I am aiming for a master\'s in computer science in Canada for September 2027.')}">${esc(f.message||'')}</textarea></div>
   <div class="iv-sum"><div>${f.slot?`<b>${bzDay(f.slot)} · ${bzTime(f.slot)}</b><span class="small muted">${N(IVM[f.mode])} · ${N(IVT[f.topic])}</span>`:`<span class="muted">${L('Choisissez un créneau ci-dessus','Choose a slot above')}</span>`}</div><button class="btn btn-o" ${f.slot?'':'disabled'}>${L('Réserver mon entretien','Book my meeting')}</button></div>
  </form>`+hist;
}
function adIv(u){
  const all=(S.interviews||[]).slice().sort((a,b)=>new Date(a.slot)-new Date(b.slot));const v=cf('ivv')||'up';
  const now=Date.now(),today=dayKey(new Date());
  const L1={up:upcoming(all),todo:all.filter(x=>x.status==='requested'),hist:all.filter(x=>!upcoming([x]).length).reverse()}[v]||[];
  const staff=S.users.filter(x=>x.role!=='candidat');const c=S.iv||{};
  const k=[[L('À confirmer','To confirm'),all.filter(x=>x.status==='requested'&&new Date(x.slot)>now).length,'clock'],[L('Aujourd\'hui','Today'),upcoming(all).filter(x=>dayKey(x.slot)===today).length,'calendar'],[L('7 prochains jours','Next 7 days'),upcoming(all).filter(x=>new Date(x.slot)-now<7*864e5).length,'calendar'],[L('Réalisés (60 j)','Done (60 d)'),all.filter(x=>x.status==='done').length,'check']];
  let last='';const rows=L1.map(x=>{const cu=ivUser(x.uid)||{};const d=dayKey(x.slot);const h=d!==last?`<div class="cx-day">${d===today?L('Aujourd\'hui','Today')+' · ':''}${bzDay(x.slot)}</div>`:'';last=d;const open=['requested','confirmed'].includes(x.status);
    return h+`<div class="card flat iv-row"><div class="iv-time"><b>${bzTime(x.slot)}</b><span class="small muted">${x.duration} min</span></div>
     <div class="iv-who">${avatar(cu,40)}<div><b>${esc(cu.name||'')}</b><div class="small muted">${esc(cu.email||'')}${x.phone?' · '+esc(x.phone):''}</div><div class="small" style="margin-top:4px"><span class="tag">${ic(IVM[x.mode]?.i||'calendar',12)} ${N(IVM[x.mode]||{fr:x.mode,en:x.mode})}</span> <span class="tag grey">${N(IVT[x.topic]||IVT.autre)}</span> <span class="muted">${esc(x.ref)}</span></div>${x.message?`<p class="small iv-msg">« ${esc(x.message)} »</p>`:''}
      ${x.mode==='visio'&&open?`<div class="iv-link"><input data-ivlink="${x.id}" value="${esc(x.link||'')}" placeholder="https://meet… ${L('lien de visioconférence','video link')}"><button class="btn btn-g btn-sm" data-cx="ivLink" data-v="${x.id}">${L('Enregistrer','Save')}</button></div>`:x.link?`<a class="small" href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:''}
      ${(x.notes||[]).map(n=>`<div class="small muted iv-note">${esc(n.text)} — ${esc(n.author)}, ${rel(n.at)}</div>`).join('')}</div></div>
     <div class="iv-side">${ivTag(x.status)}<select class="cx-sel" data-ivstaff="${x.id}" ${open?'':'disabled'}><option value="">${L('Conseiller…','Adviser…')}</option>${staff.map(s=>`<option value="${s.id}" ${x.staff===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
      <div class="cx-actions">${x.status==='requested'?`<button class="btn btn-o btn-sm" data-cx="ivSt" data-v="${x.id}:confirmed">${L('Confirmer','Confirm')}</button>`:''}${x.status==='confirmed'?`<button class="btn btn-b btn-sm" data-cx="ivSt" data-v="${x.id}:done">${L('Réalisé','Done')}</button><button class="btn btn-g btn-sm" data-cx="ivSt" data-v="${x.id}:no_show">${L('Absent','No-show')}</button>`:''}${open?`<button class="btn btn-g btn-sm" data-cx="ivCancel" data-v="${x.id}">${L('Annuler','Cancel')}</button>`:''}<button class="btn btn-g btn-sm" data-cx="ivNote" data-v="${x.id}" title="${L('Ajouter une note','Add a note')}">+ ${L('Note','Note')}</button></div></div></div>`}).join('');
  const dn=['',L('Lun','Mon'),L('Mar','Tue'),L('Mer','Wed'),L('Jeu','Thu'),L('Ven','Fri'),L('Sam','Sat'),L('Dim','Sun')];
  return `<div class="cx-head"><div><h2>${L('Entretiens','Meetings')}</h2><p class="small muted">${L('Rendez-vous d\'orientation réservés par les candidats depuis leur espace.','Guidance meetings booked by applicants from their area.')} ${c.enabled===false?`<span class="tag err">${L('Réservations fermées','Booking closed')}</span>`:`<span class="tag ok">${L('Réservations ouvertes','Booking open')}</span>`}</p></div></div>
  <div class="cx-kpis k4">${k.map((t,i)=>`<button class="cx-kpi click" data-cx="cf" data-k="ivv" data-v="${['todo','up','up','hist'][i]}"><div class="cx-kpi-h"><span>${ic(t[2],16)} ${t[0]}</span><em class="cx-go">→</em></div><b><span data-count="${t[1]}" data-ck="iv-${i}">${t[1]}</span></b></button>`).join('')}</div>
  ${u.role==='admin'?`<details class="card flat cx-settings" ${ui.ivSetOpen?'open':''}><summary><h3 style="display:inline">${ic('sliders')} ${L('Disponibilités et réglages','Availability and settings')}</h3> <span class="small muted">${(c.days||[]).map(d=>dn[d]).join(', ')} · ${esc(c.hours||'')} · ${c.duration} min</span></summary><form data-form="ivSettings" style="margin-top:14px">
   <label class="cx-checks" style="margin-bottom:12px"><span><input type="checkbox" name="enabled" ${c.enabled!==false?'checked':''}> <b>${L('Réservations ouvertes aux candidats','Booking open to applicants')}</b></span></label>
   <div class="f"><label>${L('Jours de rendez-vous','Meeting days')}</label><div class="cx-checks">${[1,2,3,4,5,6,7].map(d=>`<label><input type="checkbox" name="d${d}" ${(c.days||[]).includes(d)?'checked':''}> ${dn[d]}</label>`).join('')}</div></div>
   <div class="row2"><div class="f"><label>${L('Plages horaires (heure de Brazzaville)','Time ranges (Brazzaville time)')}</label><input name="hours" value="${esc(c.hours||'')}" placeholder="09:00-12:00,14:00-17:00"></div><div class="f"><label>${L('Types d\'entretien proposés','Meeting types offered')}</label><div class="cx-checks">${Object.keys(IVM).map(m=>`<label><input type="checkbox" name="m_${m}" ${(c.modes||[]).includes(m)?'checked':''}> ${N(IVM[m])}</label>`).join('')}</div></div></div>
   <div class="cx-set4"><div class="f"><label>${L('Durée (min)','Length (min)')}</label><input name="duration" type="number" min="15" max="120" step="5" value="${c.duration||30}"></div><div class="f"><label>${L('Délai minimum (heures)','Minimum notice (hours)')}</label><input name="notice" type="number" min="0" max="168" value="${c.notice??24}"></div><div class="f"><label>${L('Réservable jusqu\'à (jours)','Bookable up to (days)')}</label><input name="horizon" type="number" min="1" max="90" value="${c.horizon||21}"></div><div class="f"><label>${L('Conseillers en parallèle','Advisers in parallel')}</label><input name="capacity" type="number" min="1" max="10" value="${c.capacity||1}"></div></div>
   <button class="btn btn-b">${L('Enregistrer les disponibilités','Save availability')}</button></form></details>`:''}
  <div class="cx-chips"><button class="${v==='up'?'on':''}" data-cx="cf" data-k="ivv" data-v="up">${L('À venir','Upcoming')} <b>${upcoming(all).length}</b></button><button class="${v==='todo'?'on':''}" data-cx="cf" data-k="ivv" data-v="todo">${L('À confirmer','To confirm')} <b>${all.filter(x=>x.status==='requested').length}</b></button><button class="${v==='hist'?'on':''}" data-cx="cf" data-k="ivv" data-v="hist">${L('Historique','History')} <b>${all.filter(x=>!upcoming([x]).length).length}</b></button></div>
  ${rows||empty('calendar',L('Aucun entretien','No meetings'),v==='up'?L('Les rendez-vous réservés par les candidats apparaîtront ici.','Meetings booked by applicants will appear here.'):'')}`;
}
function ivDashCard(){const up=upcoming(S.interviews||[]).sort((a,b)=>new Date(a.slot)-new Date(b.slot)).slice(0,6);
  return `<div class="card flat"><h3>${ic('calendar')} ${L('Prochains entretiens','Upcoming meetings')} ${up.filter(x=>x.status==='requested').length?`<span class="tag warn">${up.filter(x=>x.status==='requested').length} ${L('à confirmer','to confirm')}</span>`:''}</h3>${up.length?up.map(x=>{const cu=ivUser(x.uid)||{};return `<div class="cx-row click" data-act="atab" data-id="iv">${avatar(cu,32)}<div><b>${esc(cu.name||'')}</b><div class="small muted">${bzDay(x.slot)} · ${bzTime(x.slot)} · ${N(IVM[x.mode]||{fr:'',en:''})}</div></div>${ivTag(x.status)}</div>`}).join(''):empty('calendar',L('Aucun entretien à venir','No upcoming meetings'))}</div>`}

document.addEventListener('click',e=>{const t=e.target.closest('[data-cx]');if(!t)return;const v=t.dataset.v;const f=ui.ivf=ui.ivf||{};
  const keep=()=>{const fm=document.querySelector('form[data-form=ivBook]');if(fm){if(fm.elements.message)f.message=fm.elements.message.value;if(fm.elements.phone)f.phone=fm.elements.phone.value}};
  switch(t.dataset.cx){
    case 'ivTopic':keep();f.topic=v;rerender();break;
    case 'ivMode':keep();f.mode=v;rerender();break;
    case 'ivDay':keep();f.day=v;f.slot=null;rerender();break;
    case 'ivSlot':keep();f.slot=v;rerender();break;
    case 'ivIcs':ics(S.interviews.find(x=>x.id===v));break;
    case 'ivCancel':if(!confirm(L('Annuler ce rendez-vous ?','Cancel this meeting?')))return;ui.ivSlots=null;run(()=>api('POST',`/api/interviews/${v}/cancel`),L('Rendez-vous annulé.','Meeting cancelled.'));break;
    case 'ivSt':{const [id,s]=v.split(':');run(()=>api('PATCH',`/api/interviews/${id}`,{status:s}),{confirmed:L('Entretien confirmé — le candidat est prévenu par e-mail.','Meeting confirmed — the applicant is notified by email.'),done:L('Entretien marqué comme réalisé.','Meeting marked as done.'),no_show:L('Absence enregistrée.','No-show recorded.')}[s]);break}
    case 'ivLink':{const i=document.querySelector(`[data-ivlink="${v}"]`);run(()=>api('PATCH',`/api/interviews/${v}`,{link:i?i.value.trim():''}),L('Lien enregistré.','Link saved.'));break}
    case 'ivNote':{const n=prompt(L('Note interne sur cet entretien :','Internal note on this meeting:'));if(n)run(()=>api('PATCH',`/api/interviews/${v}`,{note:n}),L('Note ajoutée.','Note added.'));break}
  }});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.ivstaff!==undefined)run(()=>api('PATCH',`/api/interviews/${t.dataset.ivstaff}`,{staff:t.value||null}),L('Conseiller attribué.','Adviser assigned.'))});
document.addEventListener('submit',async e=>{const fm=e.target;if(!['ivBook','ivSettings'].includes(fm.dataset.form))return;e.preventDefault();e.stopImmediatePropagation();const d=Object.fromEntries(new FormData(fm));
  if(fm.dataset.form==='ivBook'){const f=ui.ivf||{};if(!f.slot){ui.msg={t:'err',m:L('Choisissez un créneau.','Choose a slot.')};rerender();return}
    if(f.mode==='telephone'&&!checkRequired(fm,[['phone',L('Numéro à appeler','Number to call')]]))return;
    try{await api('POST','/api/interviews',{slot:f.slot,mode:f.mode,topic:f.topic,message:d.message||'',phone:d.phone||''});ui.ivf={};ui.ivSlots=null;await load();ui.msg={t:'ok',m:L('Votre demande d\'entretien est enregistrée. Vous recevrez une confirmation par e-mail.','Your meeting request is saved. You will receive a confirmation by email.')};rerender();scrollTo(0,0)}
    catch(err){ui.msg={t:'err',m:err.message};if(err.status===409){ui.ivSlots=null;f.slot=null}rerender();scrollTo(0,0)}return}
  if(fm.dataset.form==='ivSettings'){ui.ivSetOpen=1;const days=[1,2,3,4,5,6,7].filter(x=>fm.elements['d'+x].checked);const modes=Object.keys(IVM).filter(m=>fm.elements['m_'+m].checked);
    run(()=>api('PATCH','/api/settings/interviews',{enabled:fm.elements.enabled.checked,days,hours:d.hours,modes,duration:+d.duration,notice:+d.notice,horizon:+d.horizon,capacity:+d.capacity}),L('Disponibilités enregistrées.','Availability saved.'))}
},true);
/* Images du site absentes : on masque l'image cassée pour laisser l'illustration de remplacement */
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.closest('.photo')){t.style.display='none';t.closest('.photo').classList.add('noimg')}},true);

/* =========================================================
   Écrans de connexion (espace étudiant et back-office)
   ========================================================= */
function authShell(kind,inner){
  const isA=kind==='admin';const nP=(S.programs||[]).length,nI=(S.institutions||[]).length;
  const pts=isA?[['shield',L('Double authentification','Two-factor authentication'),L('Un code à usage unique est demandé à chaque connexion.','A one-time code is required at every login.')],['list',L('Actions tracées','Every action logged'),L('Chaque consultation et modification est enregistrée dans le journal.','Every view and change is recorded in the log.')],['users',L('Accès par rôle','Role-based access'),L('Agents, responsables et administrateurs voient uniquement ce qui les concerne.','Officers, managers and admins only see what concerns them.')]]
    :[['globe',L('Candidatez en ligne','Apply online'),L('Partout dans le monde, depuis Brazzaville.','Anywhere in the world, from Brazzaville.')],['chart',L('Suivez votre dossier','Track your file'),L('Chaque étape et chaque message, en temps réel.','Every step and every message, in real time.')],['calendar',L('Un conseiller attitré','A dedicated adviser'),L('Réservez un entretien au bureau, en visio ou par téléphone.','Book a meeting at the office, by video or by phone.')],['lock',L('Paiement sécurisé','Secure payment'),'MTN Mobile Money, Airtel Money, Visa, Mastercard.']];
  return `<section class="au ${kind}"><div class="au-in">
   <aside class="au-side">${isA?'':`<div class="au-bg">${ph('etudiant-ordinateur','',1)}</div>`}<i class="au-o1"></i><i class="au-o2"></i>
    <span class="au-kicker">${isA?L('Console d\'administration','Admin console'):L('Espace étudiant','Student area')}</span>
    <h2>${isA?L('Le back-office de Campus Monde','The Campus Monde back-office'):L('Votre projet d\'études <em>à l\'étranger</em> commence ici','Your study-<em>abroad</em> project starts here')}</h2>
    <ul class="au-pts">${pts.map(p=>`<li><span>${ic(p[0],18)}</span><div><b>${p[1]}</b><small>${p[2]}</small></div></li>`).join('')}</ul>
    ${isA?`<p class="au-note">${ic('alert',16)} ${L('Accès réservé au personnel habilité. Toute tentative de connexion est enregistrée.','Restricted to authorised staff. Every login attempt is logged.')}</p>`
     :`<div class="au-dest">${[['ville-montreal','Canada','Canada'],['ville-paris','France','France'],['ville-bruxelles','Belgique','Belgium'],['ville-rabat','Maroc','Morocco']].map(d=>`<a href="#pays-${d[1]==='Canada'?'canada':d[1]==='France'?'france':d[1]==='Belgique'?'belgique':'maroc'}" class="au-d">${ph(d[0],'',1)}<span>${L(d[1],d[2])}</span></a>`).join('')}</div><div class="au-pay"><span>MTN MoMo</span><span>Airtel Money</span><span>Visa</span><span>Mastercard</span></div><div class="au-stats"><div><b>${COUNTRIES.length}</b><span>${L('pays','countries')}</span></div><div><b>${nI}</b><span>${L('établissements','institutions')}</span></div><div><b>${nP}</b><span>${L('formations','programmes')}</span></div></div>`}
   </aside>
   <div class="au-main"><div class="au-card">${inner}</div><p class="au-foot small muted">${ic('lock',14)} ${L('Connexion chiffrée · vos données restent confidentielles','Encrypted connection · your data stays confidential')} · <a href="#legal">${L('Confidentialité','Privacy')}</a></p></div>
  </div></section>`;
}
const auMsg=()=>ui.msg?`<div class="alert ${ui.msg.t}">${ui.msg.m}</div>`:'';
const inp=(icn,attrs,eye)=>`<div class="inp">${ic(icn,18)}<input ${attrs}>${eye?`<button type="button" class="pw-eye" data-cx="pwEye" aria-label="${L('Afficher le mot de passe','Show password')}">${ic('eye',18)}</button>`:''}</div>`;
const otp=(auto=true)=>`<div class="otp" data-auto="${auto?1:0}">${[0,1,2,3,4,5].map(i=>`<input inputmode="numeric" maxlength="1" autocomplete="${i?'off':'one-time-code'}" aria-label="${L('Chiffre','Digit')} ${i+1}" data-otp="${i}">`).join('')}</div><input type="hidden" name="code">`;
function authStudent(){
  const t=ui.auth||'login';
  const seg=`<div class="au-seg"><button class="${t==='login'?'on':''}" data-act="auth" data-id="login">${L('Connexion','Log in')}</button><button class="${t==='register'?'on':''}" data-act="auth" data-id="register">${L('Créer un compte','Sign up')}</button></div>`;
  let f='';
  if(t==='login')f=`${seg}<span class="au-eyebrow">${L('Espace étudiant','Student area')}</span><h1>${L('Bon retour <em>parmi nous</em>','Welcome <em>back</em>')}</h1><p class="au-lead">${L('Retrouvez votre dossier, vos messages et votre prochain rendez-vous.','Find your file, your messages and your next meeting.')}</p>${auMsg()}
   <form data-form="login" novalidate><div class="f"><label>${L('Adresse e-mail','Email address')}</label>${inp('mail','name="email" type="email" required autocomplete="username" placeholder="vous@exemple.com"')}</div>
   <div class="f"><label class="au-lbl2">${L('Mot de passe','Password')}<a href="#" data-act="auth" data-id="forgot" class="small">${L('Mot de passe oublié ?','Forgot password?')}</a></label>${inp('lock','name="pw" type="password" required autocomplete="current-password" placeholder="'+L('Votre mot de passe','Your password')+'"',1)}</div>
   <button class="btn btn-b au-btn">${L('Se connecter','Log in')}<span class="au-arr">→</span></button></form>
   <p class="au-alt">${L('Pas encore de compte ?','No account yet?')} <a href="#" data-act="auth" data-id="register">${L('Créer un compte gratuitement','Create a free account')}</a></p>`;
  if(t==='register')f=`${seg}<span class="au-eyebrow">${L('Inscription','Sign up')}</span><h1>${L('Créez votre <em>compte</em>','Create your <em>account</em>')}</h1><div class="au-tags"><span>${ic('check',14)}${L('Gratuit','Free')}</span><span>${ic('clock',14)}${L('2 minutes','2 minutes')}</span><span>${ic('mail',14)}${L('Code par e-mail','Code by email')}</span></div>${auMsg()}
   <form data-form="register" novalidate><div class="row2"><div class="f"><label>${L('Prénom(s)','First name(s)')} <i class="req">*</i></label>${inp('user','name="first" required autocomplete="given-name" placeholder="'+L('Ex. Grâce','e.g. Grace')+'"')}</div><div class="f"><label>${L('Nom','Last name')} <i class="req">*</i></label>${inp('user','name="last" required autocomplete="family-name" placeholder="'+L('Ex. Mabiala','e.g. Mabiala')+'"')}</div></div>
   <div class="f"><label>${L('Adresse e-mail','Email address')} <i class="req">*</i></label>${inp('mail','name="email" type="email" required autocomplete="email" placeholder="vous@exemple.com"')}</div>
   <div class="f"><label>${L('Mot de passe','Password')} <i class="req">*</i></label>${inp('lock','name="pw" type="password" required minlength="8" autocomplete="new-password" data-strength="1" placeholder="'+L('8 caractères min., dont 1 chiffre','min. 8 characters, incl. 1 digit')+'"',1)}<div class="pw-meter"><i></i><i></i><i></i><i></i></div><span class="small muted pw-hint">${L('Utilisez au moins 8 caractères dont un chiffre.','Use at least 8 characters including a digit.')}</span></div>
   <label class="chk au-chk"><input type="checkbox" name="consent" required> <span>${L('J\'accepte la <a href="#legal">politique de confidentialité</a> <i class="req">*</i>','I accept the <a href="#legal">privacy policy</a> <i class="req">*</i>')}</span></label>
   <label class="chk au-chk"><input type="checkbox" name="mkt"> <span>${L('Recevoir les actualités de Campus Monde (facultatif)','Receive Campus Monde news (optional)')}</span></label>
   <button class="btn btn-o au-btn">${L('Créer mon compte','Create my account')}<span class="au-arr">→</span></button></form>
   <p class="au-alt">${L('Déjà inscrit ?','Already registered?')} <a href="#" data-act="auth" data-id="login">${L('Se connecter','Log in')}</a></p>`;
  if(t==='forgot')f=`<a href="#" class="au-back small" data-act="auth" data-id="login">← ${L('Retour à la connexion','Back to login')}</a><div class="au-ico">${ic('lock',26)}</div><h1>${L('Mot de passe oublié','Forgot password')}</h1>`+(ui.resetFor
    ?`<p class="muted">${L('Saisissez le code envoyé à','Enter the code sent to')} <b>${esc(ui.resetFor)}</b> ${L('et choisissez un nouveau mot de passe.','and choose a new password.')}</p>${auMsg()}<form data-form="reset" novalidate><div class="f"><label>${L('Code à 6 chiffres','6-digit code')}</label>${otp(false)}</div><div class="f"><label>${L('Nouveau mot de passe','New password')}</label>${inp('lock','name="pw" type="password" required minlength="8" autocomplete="new-password" data-strength="1"',1)}<div class="pw-meter"><i></i><i></i><i></i><i></i></div></div><button class="btn btn-b au-btn">${L('Réinitialiser mon mot de passe','Reset my password')}</button></form>`
    :`<p class="muted">${L('Indiquez votre e-mail : si un compte existe, vous recevrez un code de réinitialisation.','Enter your email: if an account exists, you will receive a reset code.')}</p>${auMsg()}<form data-form="forgot" novalidate><div class="f"><label>E-mail</label>${inp('mail','name="email" type="email" required autocomplete="email" placeholder="vous@exemple.com"')}</div><button class="btn btn-b au-btn">${L('Recevoir un code','Send me a code')}</button></form>`);
  return authShell('student',f);
}
function authVerify(u){
  const left=Math.max(0,Math.ceil(((ui.resendAt||0)-Date.now())/1000));
  return authShell('student',`<div class="au-ico">${ic('mail',26)}</div><h1>${L('Vérifiez votre adresse e-mail','Verify your email address')}</h1><p class="muted">${L('Nous avons envoyé un code à 6 chiffres à','We sent a 6-digit code to')} <b>${esc(u.email)}</b>. ${L('Il expire dans 15 minutes.','It expires in 15 minutes.')}</p>${auMsg()}
   <form data-form="verify" novalidate><div class="f">${otp()}</div><button class="btn btn-o au-btn">${L('Vérifier mon adresse','Verify my email')}</button></form>
   <p class="au-alt">${L('Rien reçu ? Vérifiez vos spams ou','Nothing received? Check your spam or')} ${left?`<span class="muted" id="au-resend" data-left="${left}">${L('renvoyez dans','resend in')} ${left} s</span>`:`<a href="#" data-cx="resend">${L('renvoyez le code','resend the code')}</a>`} · <a href="#" data-act="logout">${L('Se déconnecter','Log out')}</a></p>`);
}
function authAdmin(){
  return authShell('admin',`<div class="au-ico adm">${ic('shield',26)}</div><h1>${L('Connexion au back-office','Back-office login')}</h1><p class="muted">${L('Utilisez votre adresse professionnelle Campus Monde.','Use your Campus Monde work email.')}</p>
   ${ME()?`<div class="alert info">${L('Vous êtes connecté en tant que candidat.','You are logged in as an applicant.')} <a href="#" data-act="logout">${L('Se déconnecter','Log out')}</a></div>`:''}${auMsg()}
   <form data-form="login" data-staff="1" novalidate><div class="f"><label>${L('E-mail professionnel','Work email')}</label>${inp('mail','name="email" type="email" required autocomplete="username" placeholder="prenom.nom@campusmonde.cg"')}</div>
   <div class="f"><label>${L('Mot de passe','Password')}</label>${inp('lock','name="pw" type="password" required autocomplete="current-password" placeholder="••••••••"',1)}</div>
   <button class="btn btn-b au-btn">${L('Continuer','Continue')}</button></form>
   <div class="au-steps"><span class="on">1. ${L('Identifiants','Credentials')}</span><span>2. ${L('Code de sécurité','Security code')}</span></div>`);
}
function authMfa(){
  return authShell('admin',`<div class="au-ico adm">${ic('shield',26)}</div><h1>${L('Vérification en deux étapes','Two-step verification')}</h1><p class="muted">${L('Saisissez le code à 6 chiffres envoyé à votre adresse e-mail professionnelle. Il expire dans 10 minutes.','Enter the 6-digit code sent to your work email. It expires in 10 minutes.')}</p>${auMsg()}
   <form data-form="mfa" novalidate><div class="f">${otp()}</div><button class="btn btn-b au-btn">${L('Valider et accéder à la console','Confirm and open the console')}</button></form>
   <div class="au-steps"><span class="done">1. ${L('Identifiants','Credentials')} ✓</span><span class="on">2. ${L('Code de sécurité','Security code')}</span></div>
   <p class="au-alt"><a href="#" data-act="cancelMfa">${L('Annuler et revenir à la connexion','Cancel and go back to login')}</a></p>`);
}

/* Cases du code à 6 chiffres */
function otpSync(){document.querySelectorAll('.otp').forEach(o=>{const h=o.parentElement.querySelector('input[name=code]')||o.closest('form').querySelector('input[name=code]');if(!h)return;
  const v=(h.value||'').replace(/\D/g,'').slice(0,6);o.querySelectorAll('input').forEach((x,i)=>x.value=v[i]||'');o.classList.toggle('full',v.length===6)});
  const first=document.querySelector('.otp input');if(first&&!document.querySelector('.otp input:focus')&&!first.value&&!document.querySelector('.au-main input:focus'))try{first.focus({preventScroll:true})}catch(e){}}
function otpCollect(o){const h=o.closest('form').querySelector('input[name=code]');const v=[...o.querySelectorAll('input')].map(x=>x.value).join('');h.value=v;o.classList.toggle('full',v.length===6);
  if(v.length===6&&o.dataset.auto==='1'){const fm=o.closest('form');setTimeout(()=>{if(fm.isConnected)fm.requestSubmit()},120)}}
document.addEventListener('input',e=>{const t=e.target;
  if(t.dataset&&t.dataset.otp!==undefined){const o=t.closest('.otp');const d=t.value.replace(/\D/g,'');
    if(d.length>1){const all=[...o.querySelectorAll('input')];d.split('').slice(0,6-(+t.dataset.otp)).forEach((c,i)=>{const x=all[+t.dataset.otp+i];if(x)x.value=c});(all[Math.min(5,+t.dataset.otp+d.length)]||t).focus()}
    else{t.value=d;if(d){const n=o.querySelector(`[data-otp="${+t.dataset.otp+1}"]`);if(n)n.focus()}}otpCollect(o);return}
  if(t.dataset&&t.dataset.strength){const v=t.value;const sc=(v.length>=8)+(/\d/.test(v))+(/[A-Z]/.test(v)&&/[a-z]/.test(v))+(/[^A-Za-z0-9]/.test(v)||v.length>=12);
    const m=t.closest('.f').querySelector('.pw-meter');if(m){m.dataset.s=v?sc:0}const h=t.closest('.f').querySelector('.pw-hint');
    if(h)h.textContent=!v?L('Utilisez au moins 8 caractères dont un chiffre.','Use at least 8 characters including a digit.'):v.length<8||!/\d/.test(v)?L('Trop court : 8 caractères min. dont 1 chiffre.','Too short: min. 8 characters incl. 1 digit.'):[,,L('Correct','Fair'),L('Bon mot de passe','Good password'),L('Excellent mot de passe','Excellent password')][sc]||''}
});
document.addEventListener('keydown',e=>{const t=e.target;if(!t.dataset||t.dataset.otp===undefined)return;const o=t.closest('.otp');
  if(e.key==='Backspace'&&!t.value){const p=o.querySelector(`[data-otp="${+t.dataset.otp-1}"]`);if(p){p.value='';p.focus();otpCollect(o)}}
  if(e.key==='ArrowLeft'){const p=o.querySelector(`[data-otp="${+t.dataset.otp-1}"]`);if(p)p.focus()}
  if(e.key==='ArrowRight'){const n=o.querySelector(`[data-otp="${+t.dataset.otp+1}"]`);if(n)n.focus()}});
document.addEventListener('paste',e=>{const t=e.target;if(!t.dataset||t.dataset.otp===undefined)return;e.preventDefault();const d=(e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);const o=t.closest('.otp');
  o.querySelectorAll('input').forEach((x,i)=>x.value=d[i]||'');(o.querySelectorAll('input')[Math.min(5,d.length)]).focus();otpCollect(o)});
document.addEventListener('click',e=>{const t=e.target.closest('[data-cx]');if(!t)return;
  if(t.dataset.cx==='pwEye'){const i=t.parentElement.querySelector('input');i.type=i.type==='password'?'text':'password';t.classList.toggle('on',i.type==='text');i.focus()}
  if(t.dataset.cx==='resend'){ui.resendAt=Date.now()+60000;run(()=>api('POST','/api/auth/resend'),L('Un nouveau code vous a été envoyé.','A new code has been sent.'))}
  if(t.dataset.cx==='go'){ui.atab=t.dataset.v;if(t.dataset.k){ui.cf=Object.assign(ui.cf||{},{[t.dataset.k]:t.dataset.f||''})}rerender();scrollTo(0,0)}
});

/* =========================================================
   Cases dynamiques : chiffres animés, mise à jour en direct
   ========================================================= */
const cxPrev={};
function cxFmt(el,v){const f=el.dataset.fmt;if(f==='money')return nf(v)+' '+(el.dataset.cur||'FCFA');if(f==='pct')return Math.round(v)+' %';return nf(v)}
function cxAfter(){
  document.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count||0,k=el.dataset.ck||el.textContent;const from=k in cxPrev?cxPrev[k]:0;cxPrev[k]=to;
    if(from===to||matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=cxFmt(el,to);return}
    const t0=performance.now(),d=Math.min(900,350+Math.abs(to-from)*40);el.classList.add('counting');
    const step=n=>{const p=Math.min(1,(n-t0)/d),e=1-Math.pow(1-p,3);el.textContent=cxFmt(el,from+(to-from)*e);if(p<1)requestAnimationFrame(step);else{el.textContent=cxFmt(el,to);el.classList.remove('counting');if(from!==to&&from!==0)el.closest('.cx-kpi,.cx-pipe button')?.classList.add('bump')}};requestAnimationFrame(step)});
  otpSync();
  const live=document.getElementById('cx-live');if(live)live.dataset.at=Date.now();
  const r=document.getElementById('au-resend');if(r&&!r._t){r._t=setInterval(()=>{const left=Math.ceil(((ui.resendAt||0)-Date.now())/1000);if(!r.isConnected){clearInterval(r._t);return}if(left<=0){clearInterval(r._t);rerender()}else r.textContent=L('renvoyez dans','resend in')+' '+left+' s'},1000)}
}
setInterval(()=>{const l=document.getElementById('cx-live');if(!l)return;const s=Math.max(0,60-Math.round((Date.now()-(+l.dataset.at||Date.now()))/1000));const t=l.querySelector('em');if(t)t.textContent=s+' s'},1000);

/* =========================================================
   Photos du site : encarts promotionnels, crédits, gestion
   ========================================================= */
function promoHome(){
  const cities=[['ville-montreal','Montréal','canada'],['ville-quebec','Québec','canada'],['ville-paris','Paris','france'],['ville-strasbourg','Strasbourg','france'],['ville-nancy','Nancy','france'],['ville-bruxelles','Bruxelles','belgique'],['ville-rabat','Rabat','maroc']];
  const insts=(S.institutions||[]).filter(i=>S.photos&&S.photos['inst-'+i.id]).slice(0,7);
  const yr=new Date().getFullYear()+1;
  return `<section class="block promo-cities"><div class="wrap">
    <div class="head-row"><div><span class="kicker">${L('Destinations','Destinations')}</span><h2>${L('Votre <em>future ville</em> étudiante','Your <em>future</em> student city')}</h2></div><a class="link" href="#etudier">${L('Comparer les destinations','Compare destinations')}</a></div>
    <div class="city-mosaic">${cities.map((c,i)=>`<a class="city-tile ${i===0?'big':''}" href="#pays-${c[2]}">${ph(c[0],'',1)}<span class="city-lbl"><b>${c[1]}</b><small>${N(CTRY(c[2])||{fr:'',en:''})}</small></span></a>`).join('')}</div>
  </div></section>
  <section class="promo-banner"><div class="promo-bg">${ph('campus')}</div><div class="wrap promo-in">
    <span class="promo-badge">${L('Rentrée','Intake')} ${yr}</span>
    <h2>${L('Les candidatures sont <em>ouvertes</em>','Applications are <em>open</em>')}</h2>
    <p>${L('Constituez votre dossier en ligne, réglez les frais par MTN Mobile Money, Airtel Money ou carte, et suivez chaque étape depuis votre espace étudiant.','Build your file online, pay the fee by MTN Mobile Money, Airtel Money or card, and follow every step from your student area.')}</p>
    <ul class="promo-pts"><li>${ic('check',16)} ${L('Dossier vérifié par un conseiller','File checked by an adviser')}</li><li>${ic('check',16)} ${L('Entretien d\'orientation gratuit','Free guidance meeting')}</li><li>${ic('check',16)} ${L('Suivi en temps réel','Real-time tracking')}</li></ul>
    <div class="btn-row"><a class="btn btn-o btn-lg" href="#candidater">${L('Déposer ma candidature','Apply now')}</a><a class="btn btn-ghost-w btn-lg" href="#espace-rdv">${ic('calendar',18)} ${L('Prendre rendez-vous','Book a meeting')}</a></div>
  </div></section>
  ${insts.length?`<section class="block"><div class="wrap">
    <div class="head-row"><div><span class="kicker">${L('Établissements présentés','Featured institutions')}</span><h2>${L('Des campus reconnus, <em>à portée de dossier</em>','Renowned campuses, <em>within reach</em>')}</h2></div><a class="link" href="#etablissements">${L('Tous les établissements','All institutions')}</a></div>
    <div class="uni-strip">${insts.map(i=>`<a class="uni-card" href="#etab-${i.id}"><div class="uni-ph">${ph('inst-'+i.id,'',1)}<span class="uni-flag">${esc(N(CTRY(i.country)||{fr:'',en:''}))}</span></div><div class="uni-b"><b>${esc(i.name)}</b><span>${esc(i.city)}</span></div></a>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">${L('Établissements présentés à titre informatif ; le statut de notre relation est indiqué sur chaque fiche.','Institutions listed for information; our relationship status is shown on each page.')}</p>
  </div></section>`:''}
  <section class="promo-depart"><div class="wrap promo-depart-in"><div class="pd-ph">${ph('aeroport')}</div><div class="pd-txt">
    <span class="kicker">${L('Accompagnement complet','Full support')}</span><h2>${L('Du premier rendez-vous <em>jusqu\'à l\'embarquement</em>','From the first meeting <em>to boarding</em>')}</h2>
    <ol class="pd-steps"><li><b>${L('Orientation','Guidance')}</b><span>${L('Un conseiller vous aide à choisir le pays et la formation.','An adviser helps you choose the country and programme.')}</span></li><li><b>${L('Admission','Admission')}</b><span>${L('Dossier vérifié, transmis, suivi jusqu\'à la décision.','File checked, sent and followed up until the decision.')}</span></li><li><b>${L('Départ','Departure')}</b><span>${L('Visa, logement et conseils pratiques avant le vol.','Visa, housing and practical tips before your flight.')}</span></li></ol>
    <a class="btn btn-b btn-lg" href="#services">${L('Découvrir nos services','Discover our services')}</a></div></div></section>`;
}
function photoCredits(){const P=S&&S.photos;if(!P)return '';
  return `<h2>${L('Crédits photos','Photo credits')}</h2><p>${L('Les photographies du site proviennent de Wikimedia Commons et sont utilisées selon leur licence libre (CC0, CC BY ou CC BY-SA). Les licences CC BY-SA s\'appliquent aux photos elles-mêmes.','Site photographs come from Wikimedia Commons and are used under their free licence (CC0, CC BY or CC BY-SA). CC BY-SA terms apply to the photos themselves.')}</p>
  <ul class="credits">${Object.entries(P).map(([k,p])=>`<li><b>${esc(p.title)}</b> — ${esc(p.author)}, <a href="${p.licenseUrl}" target="_blank" rel="noopener">${esc(p.license)}</a>, <a href="${p.page}" target="_blank" rel="noopener">Wikimedia Commons</a></li>`).join('')}</ul>`}
function photoCreditsBody(){const P=S&&S.photos;if(!P)return '';
  return `<p>${L('Les photographies du site proviennent de Wikimedia Commons et sont utilisées selon leur licence libre (CC0, CC BY ou CC BY-SA). Les licences CC BY-SA s\'appliquent aux photos elles-mêmes.','Site photographs come from Wikimedia Commons and are used under their free licence (CC0, CC BY or CC BY-SA). CC BY-SA terms apply to the photos themselves.')}</p>
  <div class="cr-grid">${Object.entries(P).map(([k,p])=>`<figure class="cr-card"><a class="cr-img" href="${p.page}" target="_blank" rel="noopener"><img src="${p.local?`photos/${k}.jpg`:p.url}" alt="" loading="lazy"></a><figcaption><b>${esc(p.title)}</b><span>© ${esc(p.author)}</span><span class="cr-l"><a href="${p.licenseUrl}" target="_blank" rel="noopener">${esc(p.license)}</a><a href="${p.page}" target="_blank" rel="noopener">Commons ↗</a></span></figcaption></figure>`).join('')}</div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-print]')){e.preventDefault();window.print();return}});
(function(){let raf=0;const spy=()=>{raf=0;const secs=[...document.querySelectorAll('.lg-sec')];if(!secs.length)return;let cur=secs[0].id;for(const x of secs){if(x.getBoundingClientRect().top<160)cur=x.id}
  document.querySelectorAll('.lg-toc [data-goto]').forEach(b=>b.classList.toggle('on',b.dataset.goto===cur));
  const m=document.querySelector('.lg-main'),bar=document.querySelector('.lg-prog i');if(m&&bar){const r=m.getBoundingClientRect();const p=Math.min(1,Math.max(0,(innerHeight*.35-r.top)/(r.height-innerHeight*.35)));bar.style.transform=`scaleX(${p})`}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(spy)},{passive:true});addEventListener('hashchange',()=>setTimeout(spy,60));setTimeout(spy,300)})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(!b)return;e.preventDefault();const t=document.getElementById(b.dataset.goto);if(t){const y=t.getBoundingClientRect().top+scrollY-110;scrollTo({top:y,behavior:'smooth'})}});
function adPhotosCard(u){if(!u||u.role!=='admin'||!S.photos)return '';const P=Object.entries(S.photos);const loc=P.filter(x=>x[1].local).length;
  return `<h3 style="margin-top:30px">${L('Photos du site','Site photos')}</h3><div class="card flat">
   <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><p class="small" style="margin:0">${loc}/${P.length} ${L('photos copiées sur le serveur.','photos copied to the server.')} ${loc<P.length?L('Les autres s\'affichent depuis Wikimedia Commons. Copiez-les avant la mise en ligne pour ne plus dépendre d\'un site externe.','The others are shown from Wikimedia Commons. Copy them before going live so the site no longer depends on an external site.'):L('Le site ne dépend d\'aucun site externe pour ses photos.','The site no longer depends on an external site for its photos.')}</p>
   <button class="btn btn-b btn-sm" data-cx="photoSync">${ic('download',16)} ${L('Copier les photos sur le serveur','Copy photos to the server')}</button></div>
   <div class="ph-admin">${P.map(([k,p])=>`<div><div class="ph-admin-i">${ph(k,'',1)}</div><b class="small">${esc(k)}.jpg</b><span class="small muted">${esc(p.author)} · ${esc(p.license)}</span><span class="tag ${p.local?'ok':'grey'}">${p.local?L('Sur le serveur','On server'):'Wikimedia'}</span></div>`).join('')}</div>
   <p class="small muted" style="margin-top:12px">${L('Pour remplacer une photo par la vôtre, déposez un fichier JPG du même nom dans public/photos/ (pensez à adapter le crédit dans src/photos.php). Pour toute personne reconnaissable, un accord écrit est obligatoire.','To replace a photo with your own, put a JPG with the same name in public/photos/ (and update the credit in src/photos.php). Written consent is required for any recognisable person.')}</p></div>`}
if(typeof adCat==='function'){const _adCat=adCat;adCat=function(u){return _adCat(u)+adPhotosCard(u||ME())}}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-cx="photoSync"]');if(!t)return;e.preventDefault();t.disabled=true;t.textContent=L('Copie en cours…','Copying…');
  try{const r=await api('POST','/api/admin/photos/sync',{});const v=Object.values(r.result);const ko=v.filter(x=>x==='échec').length;await load();ui.msg={t:ko?'err':'ok',m:ko?L(`${v.length-ko} photo(s) copiée(s), ${ko} échec(s) : vérifiez que le serveur a accès à Internet.`,`${v.length-ko} copied, ${ko} failed: check the server has Internet access.`):L('Toutes les photos sont maintenant sur le serveur.','All photos are now on the server.')}}catch(err){ui.msg={t:'err',m:err.message}}rerender();scrollTo(0,0)});
