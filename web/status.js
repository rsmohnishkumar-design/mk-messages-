// ---------- Status (24-hour photo, video and text updates) ----------
let stData={groups:[],users:{}},stTab='chats',sv=null;
const ST_BG=['#1e66d0','#0b3d91','#7b3fe4','#c2185b','#00897b','#ef6c00','#37474f'];
function stMine(){return stData.groups.find(g=>g.user===me.id)}
function stUnseen(g){return g.items.some(i=>!i.viewed)}
function stLoad(){if(!token)return;emit('status:list',{},d=>{if(!d||!d.groups)return;stData=d;(d.users||[]).forEach(u=>users[u.id]=users[u.id]||u);if(stTab==='status')stRender();stBadge()})}
function stBadge(){const n=stData.groups.filter(g=>g.user!==me.id&&stUnseen(g)).length;const b=$('#stDot');if(b){b.textContent=n||'';b.classList.toggle('hidden',!n)}}
function stAv(u,ring){return `<div class="stav ${ring}">${avHtml(u.name,u.avatar,false)}</div>`}
function stRender(){
 const box=$('#statuslist');if(!box)return;
 const mine=stMine(),others=stData.groups.filter(g=>g.user!==me.id);
 const fresh=others.filter(stUnseen),seen=others.filter(g=>!stUnseen(g));
 const row=g=>{const u=users[g.user]||{name:'Unknown'},last=g.items[g.items.length-1];return `<div class="ci" data-st="${esc(g.user)}">${stAv(u,stUnseen(g)?'new':'seen')}<div class="mid"><div class="nm">${esc(u.name)}</div><div class="lm">${g.items.length} update${g.items.length>1?'s':''} · ${fmtDay(last.ts)}</div></div></div>`};
 box.innerHTML=`<div class="ci" data-st-me="1">${stAv(me,mine?'mine':'')}<div class="mid"><div class="nm">My status</div><div class="lm">${mine?mine.items.length+' update'+(mine.items.length>1?'s':'')+' · tap to view':'Tap to add a status update'}</div></div><button class="ib" id="stAdd" data-i="plus" aria-label="Add status"></button></div>`
 +(fresh.length?`<div class="sect">Recent updates</div>`+fresh.map(row).join(''):'')
 +(seen.length?`<div class="sect">Viewed updates</div>`+seen.map(row).join(''):'')
 +(!others.length?'<p class="empty">Status updates from people you chat with appear here for 24 hours.</p>':'');
 hydrate(box);
}
function stSetTab(t){
 stTab=t;
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
 $('#chatlist').classList.toggle('hidden',t!=='chats');$('#search').classList.toggle('hidden',t!=='chats');
 $('#statuslist').classList.toggle('hidden',t!=='status');$('#stFab').classList.toggle('hidden',t!=='status');
 if(t==='status'){stRender();stLoad()}
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>stSetTab(b.dataset.tab));
$('#statuslist').onclick=e=>{
 if(e.target.closest('#stAdd')){stCompose();return}
 const me1=e.target.closest('[data-st-me]');if(me1){const g=stMine();g?stOpen(me.id):stCompose();return}
 const r=e.target.closest('[data-st]');if(r)stOpen(r.dataset.st);
};
$('#stFab').onclick=()=>stCompose();

// ---- composer ----
function stCompose(){
 modal(`<h3>New status</h3><div class="row" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="stT">Text</button><button class="btn sec" id="stP">Photo or video</button><button class="btn sec" id="stC">Camera</button></div><div class="row"><button class="btn sec" id="mCancel">Cancel</button></div>`);
 $('#mCancel').onclick=()=>closeModal();
 $('#stT').onclick=stText;
 $('#stP').onclick=()=>{closeModal();stPick('image/*,video/*')};
 $('#stC').onclick=()=>{closeModal();stPick('image/*,video/*','environment')};
}
function stPick(accept,cap){const f=$('#stFile');f.accept=accept;if(cap)f.setAttribute('capture',cap);else f.removeAttribute('capture');f.click()}
function stText(){
 let bg=ST_BG[0];
 modal(`<h3>Text status</h3><div id="stPrev" class="stprev" style="background:${bg}"><textarea id="stTx" maxlength="700" placeholder="Type a status"></textarea></div><div class="swatches">${ST_BG.map((c,i)=>`<button class="sw ${i?'':'on'}" data-c="${c}" style="background:${c}" aria-label="Colour ${i+1}"></button>`).join('')}</div><div class="err" id="mErr"></div><div class="row"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="stGo">Post</button></div>`);
 $('#mCancel').onclick=()=>closeModal();
 $('#stPrev').querySelector('textarea').focus();
 document.querySelectorAll('.swatches .sw').forEach(b=>b.onclick=()=>{bg=b.dataset.c;$('#stPrev').style.background=bg;document.querySelectorAll('.swatches .sw').forEach(x=>x.classList.toggle('on',x===b))});
 $('#stGo').onclick=()=>{const text=$('#stTx').value.trim();if(!text){$('#mErr').textContent='Write something first';return}
  emit('status:post',{kind:'text',text,bg},d=>{if(d&&d.error){$('#mErr').textContent=d.error;return}closeModal();toast('Status posted');stLoad()})};
}
$('#stFile').onchange=async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 if(f.size>100*1024*1024){toast('File too large (max 100 MB)');return}
 const url=URL.createObjectURL(f),isV=/^video\//.test(f.type);
 modal(`<h3>New status</h3><div class="stmedia">${isV?`<video src="${url}" controls playsinline muted></video>`:`<img src="${url}" alt="Preview">`}</div><input type="text" id="stCap" maxlength="200" placeholder="Add a caption"><div class="err" id="mErr"></div><div class="row"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="stGo">Post</button></div>`);
 $('#mCancel').onclick=()=>closeModal();
 $('#stGo').onclick=async()=>{
  const go=$('#stGo');go.disabled=true;go.textContent='Uploading…';
  const up=await uploadFile(f,f.name||'status',f.type||'application/octet-stream',p=>{go.textContent='Uploading '+p+'%'});
  if(up.error){$('#mErr').textContent=up.error;go.disabled=false;go.textContent='Post';return}
  emit('status:post',{kind:'media',file:up,text:$('#stCap').value},d=>{if(d&&d.error){$('#mErr').textContent=d.error;go.disabled=false;go.textContent='Post';return}closeModal();toast('Status posted');stLoad()});
 };
};

// ---- viewer ----
function stOpen(uid){
 const queue=[...stData.groups.filter(g=>g.user===uid||g.user!==me.id&&stUnseen(g)&&g.user!==uid)];
 const idx=queue.findIndex(g=>g.user===uid);if(idx<0)return;
 const start=queue[idx],order=[start,...queue.filter(g=>g!==start)];
 let first=0;if(uid!==me.id){const n=start.items.findIndex(i=>!i.viewed);first=n<0?0:n}
 sv={order,gi:0,ii:first,t:null,start:0,dur:5000,paused:false,left:5000};
 $('#sv').classList.remove('hidden');navPush('status',()=>stClose(true));stShow();
}
function stClose(fromNav){
 if(!sv)return;clearTimeout(sv.t);const v=$('#svBody video');if(v)v.pause();sv=null;
 $('#sv').classList.add('hidden');$('#svBody').innerHTML='';
 if(fromNav!==true)navDone('status');
 if(stTab==='status')stRender();stBadge();
}
function stCur(){return sv&&sv.order[sv.gi]}
function stShow(){
 const g=stCur();if(!g)return stClose();
 const it=g.items[sv.ii],u=users[g.user]||{name:'Unknown'},own=g.user===me.id;
 clearTimeout(sv.t);
 $('#svBars').innerHTML=g.items.map((x,i)=>`<i class="${i<sv.ii?'done':''}"><b id="svb${i}"></b></i>`).join('');
 $('#svWho').innerHTML=avHtml(u.name,u.avatar,false,'sm')+`<div><b>${esc(own?'My status':u.name)}</b><div class="when">${fmtDay(it.ts)}</div></div>`;
 $('#svDel').classList.toggle('hidden',!own);$('#svViews').classList.toggle('hidden',!own);
 if(own)$('#svViews').textContent=(it.views||[]).length+' view'+((it.views||[]).length===1?'':'s');
 const body=$('#svBody');
 if(it.kind==='text'){body.innerHTML=`<div class="svtext" style="background:${esc(it.bg)}"><p>${esc(it.text)}</p></div>`;stRun(5000)}
 else if(/^video\//.test(it.file.type)){
  body.innerHTML=`<video src="${esc(U(it.file.url))}" playsinline autoplay></video>${it.text?`<div class="svcap">${esc(it.text)}</div>`:''}`;
  const v=body.querySelector('video');v.onloadedmetadata=()=>stRun(Math.min(60000,(v.duration||10)*1000));v.onerror=()=>stNext();v.play().catch(()=>{v.muted=true;v.play().catch(()=>{})});
 }else{body.innerHTML=`<img src="${esc(U(it.file.url))}" alt="">${it.text?`<div class="svcap">${esc(it.text)}</div>`:''}`;stRun(5000)}
 if(!own&&!it.viewed){it.viewed=true;emit('status:view',{id:it.id})}
}
function stRun(ms){
 if(!sv)return;sv.dur=ms;sv.left=ms;sv.start=Date.now();sv.paused=false;
 const bar=$('#svb'+sv.ii);if(bar){bar.style.transition='none';bar.style.width='0';void bar.offsetWidth;bar.style.transition=`width ${ms}ms linear`;bar.style.width='100%'}
 clearTimeout(sv.t);sv.t=setTimeout(stNext,ms);
}
function stHold(on){
 if(!sv)return;const bar=$('#svb'+sv.ii),v=$('#svBody video');
 if(on&&!sv.paused){sv.paused=true;sv.left=Math.max(200,sv.dur-(Date.now()-sv.start));clearTimeout(sv.t);if(bar){const w=bar.getBoundingClientRect().width/bar.parentElement.getBoundingClientRect().width;bar.style.transition='none';bar.style.width=(w*100)+'%'}if(v)v.pause()}
 else if(!on&&sv.paused){sv.paused=false;sv.dur=sv.left;sv.start=Date.now();if(bar){void bar.offsetWidth;bar.style.transition=`width ${sv.left}ms linear`;bar.style.width='100%'}if(v)v.play().catch(()=>{});sv.t=setTimeout(stNext,sv.left)}
}
function stNext(){if(!sv)return;const g=stCur();if(sv.ii<g.items.length-1){sv.ii++}else if(sv.gi<sv.order.length-1){sv.gi++;sv.ii=0}else return stClose();stShow()}
function stPrev(){if(!sv)return;if(sv.ii>0)sv.ii--;else if(sv.gi>0){sv.gi--;sv.ii=0}stShow()}
(()=>{
 const z=$('#svBody');let down=0,held=false,timer;
 z.addEventListener('pointerdown',e=>{down=Date.now();held=false;timer=setTimeout(()=>{held=true;stHold(true)},250)});
 const up=e=>{clearTimeout(timer);if(held){stHold(false);return}if(!down)return;down=0;const r=z.getBoundingClientRect();(e.clientX-r.left<r.width/3)?stPrev():stNext()};
 z.addEventListener('pointerup',up);z.addEventListener('pointercancel',()=>{clearTimeout(timer);if(held)stHold(false)});
})();
$('#svX').onclick=()=>stClose();
$('#svDel').onclick=()=>{const g=stCur(),it=g&&g.items[sv.ii];if(!it||!confirm('Delete this status update?'))return;
 emit('status:delete',{id:it.id},d=>{if(d&&d.error){toast(d.error);return}g.items.splice(sv.ii,1);if(!g.items.length){stData.groups=stData.groups.filter(x=>x!==g);stClose();stRender();return}if(sv.ii>=g.items.length)sv.ii=g.items.length-1;stShow()})};
$('#svViews').onclick=()=>{const g=stCur(),it=g&&g.items[sv.ii];if(!it)return;stHold(true);
 modal(`<h3>Viewed by ${(it.views||[]).length}</h3><div class="list">${(it.views||[]).length?it.views.map(v=>{const u=users[v.user]||{name:'Someone'};return `<div class="mem">${avHtml(u.name,u.avatar,false,'sm')}<div class="grow">${esc(u.name)}</div><small style="color:var(--sub)">${fmtDay(v.ts)}</small></div>`}).join(''):'<p style="color:var(--sub)">No views yet.</p>'}</div><div class="row"><button class="btn" id="mCancel">Close</button></div>`);
 $('#mCancel').onclick=()=>{closeModal();stHold(false)}};
