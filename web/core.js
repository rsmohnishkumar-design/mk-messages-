'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};
const API='https://mk-messages.scratch-2026-10-06-1022eb.workers.dev';
const U=u=>String(u||'').startsWith('/')?API+u:u;

// ---------- icons (inline SVG, no emoji) ----------
const ICONS={
 phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
 video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
 'video-off':'<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/>',
 search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
 more:'<circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/>',
 back:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
 send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
 mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
 'mic-off':'<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
 clip:'<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
 smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
 x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
 pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
 play:'<polygon points="5 3 19 12 5 21 5 3"/>',
 check:'<polyline points="20 6 9 17 4 12"/>',
 checks:'<polyline points="17 6 6 17 1 12"/><polyline points="23 6 12 17"/>',
 plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
 'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
 users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
 camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
 file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
 star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
 copy:'<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
 rotate:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
 bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
 muted:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
 pinned:'<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
 tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
 chevron:'<polyline points="6 9 12 15 18 9"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
};
const ic=(n,s=20)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const setIcon=(el,n,s)=>{el.dataset.i=n;if(s)el.dataset.s=s;el.innerHTML=ic(n,+el.dataset.s||20)};
function hydrate(root){(root||document).querySelectorAll('[data-i]').forEach(e=>{e.innerHTML=ic(e.dataset.i,+e.dataset.s||20)})}

// ---------- state ----------
let token=store.get('mk_token'),me=null,chats=[],users={},cur=null,msgs={},typers={},ws=null,acks={},ackN=0,reply=null,regMode=false,retry=0,filter='',msgFilter='';
let invites=[],stickers=[],found=[],init1=false,pendingJoin=null,pendingOpen=null;
let call=null,callState={},ar=null;
const chatById=id=>chats.find(c=>c.id===id);

// ---------- theme ----------
function applyTheme(){
 const t=store.get('mk_theme')||'auto';
 const dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
 document.documentElement.setAttribute('data-theme',dark?'dark':'light');
}
applyTheme();matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);

function toast(t,ms){const e=$('#toast');e.textContent=t;e.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hidden'),ms||2800)}
function beep(){try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.25);o.start();o.stop(c.currentTime+.25)}catch{}}

// ---------- auth ----------
function authMode(){
 $('#phoneWrap').classList.toggle('hidden',!regMode);$('#authNote').classList.toggle('hidden',!regMode);
 $('#aUserL').textContent=regMode?'Username (any name you like)':'Mobile number or username';
 $('#authBtn').textContent=regMode?'Create account':'Sign in';$('#authSub').textContent=regMode?'Create your account':'Sign in to continue';
 $('#authSwitch').textContent=regMode?'Have an account? Sign in':'New here? Create an account';$('#authErr').textContent='';
 $('#aPass').autocomplete=regMode?'new-password':'current-password';
}
$('#showPw').onchange=e=>{$('#aPass').type=e.target.checked?'text':'password'};
$('#authSwitch').onclick=()=>{regMode=!regMode;authMode()};
$('#authForm').onsubmit=async e=>{
 e.preventDefault();$('#authErr').textContent='';$('#authBtn').disabled=true;
 try{
  const body=regMode?{phone:$('#aPhone').value,username:$('#aUser').value,password:$('#aPass').value}:{ident:$('#aUser').value,password:$('#aPass').value};
  const r=await fetch(API+(regMode?'/api/register':'/api/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({error:'Server error'}));
  if(!r.ok||d.error){$('#authErr').textContent=d.error||'Failed';return}
  token=d.token;store.set('mk_token',token);start();
 }catch{$('#authErr').textContent='Network error'}finally{$('#authBtn').disabled=false}
};
async function logout(){
 try{const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(sub){emit('push:unsubscribe',{endpoint:sub.endpoint},()=>{});await sub.unsubscribe()}}catch{}
 store.del('mk_token');token=null;try{ws&&ws.close()}catch{}location.reload();
}

// ---------- socket ----------
function start(){$('#auth').classList.add('hidden');$('#app').classList.remove('hidden');connect()}
function connect(){
 ws=new WebSocket(API.replace(/^http/,'ws')+'/ws?token='+encodeURIComponent(token));
 ws.onopen=()=>{retry=0};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}onEv(m.ev,m.data)};
 ws.onclose=ev=>{
  if(ev.code===4001){store.del('mk_token');location.reload();return}
  setTimeout(connect,Math.min(1000*2**retry++,15000));
 };
}
function emit(ev,data,cb){
 if(!ws||ws.readyState!==1){toast('Reconnecting… try again');return}
 const m={ev,data};
 if(cb){const k=++ackN;m.ack=k;acks['ack:'+k]=cb}
 ws.send(JSON.stringify(m));
}
document.addEventListener('visibilitychange',()=>{if(ws&&ws.readyState===1)emit('app:vis',{v:document.visibilityState==='visible'})});
function onEv(ev,d){
 if(ev.startsWith('ack:')){const f=acks[ev];delete acks[ev];f&&f(d);return}
 switch(ev){
  case 'init':
   callState=d.calls||{};invites=d.invites||[];stickers=d.stickers||[];
   me=d.me;chats=d.chats;d.users.forEach(u=>users[u.id]=u);users[me.id]=me;
   renderMe();renderList();if(cur&&chats.find(c=>c.id===cur))openChat(cur,true);
   emit('app:vis',{v:document.visibilityState==='visible'});
   if(!init1){init1=true;afterInit()}
   break;
  case 'chats':chats=d;renderList();if(cur){if(!chats.find(c=>c.id===cur)){closeChat()}else renderHeader()}break;
  case 'users':d.forEach(u=>users[u.id]=u);if(d.find(u=>u.id===me.id))me=users[me.id];renderMe();renderList();if(cur)renderHeader();renderMsgs(true);break;
  case 'presence':if(users[d.id]){users[d.id].online=d.online;if(d.lastSeen)users[d.id].lastSeen=d.lastSeen;renderList();if(cur)renderHeader()}break;
  case 'message':{
   const l=msgs[d.chat];if(l&&!l.find(x=>x.id===d.id))l.push(d);
   if(d.chat===cur){renderMsgs();if(d.from!==me.id&&!d.system){emit('chat:read',{chat:cur})}}
   else if(d.from&&d.from!==me.id){const c=chats.find(c=>c.id===d.chat);if(!c||!c.muted)beep()}
   break}
  case 'message:update':{const l=msgs[d.chat];const m=l&&l.find(x=>x.id===d.id);if(m){Object.assign(m,d);if(d.chat===cur)renderMsgs(true)}break}
  case 'message:remove':{const l=msgs[d.chat];if(l){msgs[d.chat]=l.filter(x=>x.id!==d.id);if(d.chat===cur)renderMsgs(true)}break}
  case 'chat:read':{const l=msgs[d.chat];if(l){l.forEach(m=>{if(!m.readBy.includes(d.user))m.readBy.push(d.user)});if(d.chat===cur)renderMsgs(true)}break}
  case 'chat:deleted':delete msgs[d];if(cur===d)closeChat();break;
  case 'typing':{
   const k=d.chat+':'+d.user;clearTimeout(typers[k]);
   if(d.typing){typers[k]=setTimeout(()=>{delete typers[k];renderTyping()},4000);typers[k+'n']=d.name}else delete typers[k];
   renderTyping();break}
  case 'call:state':
   if(d.call)callState[d.chat]=d.call;else{delete callState[d.chat];if(ringChat===d.chat)dismissRing()}
   renderBanner();break;
  case 'call:ring':ringModal(d.chat,d.from,d.video);break;
  case 'call:signal':onSignal(d);break;
  case 'call:left':if(call&&call.chat===d.chat)dropPeer(d.user);break;
  case 'pin':if(ar&&ar.chat===d.chat&&!ar.pins.find(x=>x.id===d.id))ar.pins.push(d);if(d.from!==me.id)toast('New AR note from '+((users[d.from]||{}).name||'someone'));break;
  case 'pin:removed':if(ar)ar.pins=ar.pins.filter(x=>x.id!==d.id);break;
  case 'schedule:done':toast(d.error?'Scheduled message failed: '+d.error:'Scheduled message sent');break;
  case 'invite':invites=invites.filter(i=>i.id!==d.id).concat(d);toast(d.fromName+' invited you to join '+d.chatName,5000);break;
 }
}
function afterInit(){
 hydrate();nearbyCheck();pushSync();
 const q=new URLSearchParams(location.search);
 const join=q.get('join')||pendingJoin||store.get('mk_join');if(join){store.del('mk_join');pendingJoin=null;joinPrompt(join)}
 const chat=q.get('chat');
 if(chat&&chatById(chat)){openChat(chat,true);if(q.get('call')&&callState[chat]&&!call)ringModal(chat,callState[chat].users[0],callState[chat].video,true)}
 if(q.has('chat')||q.has('call')||q.has('join'))history.replaceState(null,'',location.pathname);
 if(pushSupported()&&Notification.permission==='default'&&!store.get('mk_alert_dismiss'))$('#alertBanner').classList.remove('hidden');
}

// ---------- helpers ----------
const initials=n=>(String(n||'?').trim()[0]||'?').toUpperCase();
function avHtml(name,avatar,online,cls){return `<div class="av ${cls||''}" style="${avatar?`background-image:url('${esc(avatar)}')`:''}">${avatar?'':esc(initials(name))}${online?'<span class="dot"></span>':''}</div>`}
function other(c){return users[c.members.find(m=>m!==me.id)]||{name:'Unknown'}}
function title(c){return c.type==='group'?c.name:other(c).name}
function fmtTime(ts){return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function fmtDay(ts){const d=new Date(ts),t=new Date();if(d.toDateString()===t.toDateString())return fmtTime(ts);if(t-d<6048e5)return d.toLocaleDateString([],{weekday:'short'});return d.toLocaleDateString()}
function lastSeen(u){if(u.online)return 'online';return u.lastSeen?'last seen '+fmtDay(u.lastSeen)+' '+fmtTime(u.lastSeen):''}
const LABEL_RE=/^::label:(\w+):(.{1,40})::$/;
function preview(m){
 if(!m)return 'No messages yet';if(m.deleted)return 'Message deleted';if(m.system)return m.text;
 const who=m.from===me.id?'You: ':'';
 const lb=LABEL_RE.exec(m.text||'');
 return who+(lb?lb[2]:m.text||(m.file?(/^audio\//.test(m.file.type)?'Voice message':/^image\//.test(m.file.type)?'Photo':/^video\//.test(m.file.type)?'Video':m.file.name):''));
}
function linkify(t){return esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')}

// ---------- chat list + merged search ----------
function renderMe(){const e=$('#meAv');e.outerHTML=avHtml(me.name,me.avatar).replace('class="av ','id="meAv" title="Profile" class="av ');$('#meAv').onclick=profileModal}
let findT=null,findSeq=0;
function renderList(){
 const q=filter.trim(),ql=q.toLowerCase();
 const list=chats.filter(c=>!ql||title(c).toLowerCase().includes(ql)).sort((a,b)=>(b.pinned-a.pinned)||((b.last?b.last.ts:0)-(a.last?a.last.ts:0)));
 let h=list.map(c=>{
  const av=c.type==='group'?avHtml(c.name):avHtml(other(c).name,other(c).avatar,other(c).online);
  return `<div class="ci ${c.id===cur?'sel':''}" data-id="${esc(c.id)}">${av}<div class="mid"><div class="nm"><span style="overflow:hidden;text-overflow:ellipsis">${esc(title(c))}</span>${c.pinned?ic('pinned',14):''}${c.muted?ic('muted',14):''}</div><div class="lm">${esc(preview(c.last))}</div></div><div class="rt">${c.last?fmtDay(c.last.ts):''}${c.unread?`<br><span class="badge">${c.unread}</span>`:''}</div></div>`}).join('');
 if(q){
  const people=found.filter(u=>!chats.some(c=>c.type==='dm'&&c.members.includes(u.id)&&ql&&title(c).toLowerCase()===u.name.toLowerCase()));
  if(/^\d{6}$/.test(q))h+=`<div class="sect">Group code</div><div class="ci" data-join="${esc(q)}"><div class="av">${ic('users',20)}</div><div class="mid"><div class="nm">Join group with code ${esc(q)}</div></div></div>`;
  if(people.length)h+=`<div class="sect">People on MK Messages</div>`+people.map(u=>`<div class="ci" data-user="${esc(u.id)}">${avHtml(u.name,u.avatar,u.online)}<div class="mid"><div class="nm">${esc(u.name)}</div><div class="lm">${esc(u.phone?'+'+u.phone:'')} · tap to message</div></div></div>`).join('');
  else if(q.length>=3&&!list.length&&!/^\d{6}$/.test(q))h+=`<div class="empty">No chats or people found for "${esc(q)}".<br>Search a full mobile number or exact username.</div>`;
 }
 $('#chatlist').innerHTML=h||'<div class="empty">No chats yet.<br>Open the menu to create or join a group, or search a number to message someone.</div>';
}
$('#chatlist').onclick=e=>{
 const el=e.target.closest('.ci');if(!el)return;
 if(el.dataset.id)openChat(el.dataset.id);
 else if(el.dataset.user)emit('dm:open',{user:el.dataset.user},d=>{if(d.error){toast(d.error);return}$('#search').value='';filter='';found=[];openChat(d.chat.id)});
 else if(el.dataset.join)emit('group:join',{number:el.dataset.join},d=>{if(d.error){toast(d.error);return}$('#search').value='';filter='';found=[];openChat(d.chat.id)});
};
$('#search').oninput=e=>{
 filter=e.target.value;found=[];renderList();
 clearTimeout(findT);const q=filter.trim();if(q.length<3)return;
 const seq=++findSeq;findT=setTimeout(()=>emit('user:find',{q},d=>{if(seq===findSeq&&d&&d.users){found=d.users;d.users.forEach(u=>users[u.id]=users[u.id]||u);renderList()}}),300);
};

// ---------- chat ----------
function openChat(id,keep){
 cur=id;reply=null;msgFilter='';$('#msgSearch').value='';$('#msgSearchBar').classList.add('hidden');
 $('#app').classList.add('chat');$('#placeholder').classList.add('hidden');$('#chatpane').classList.remove('hidden');
 renderHeader();renderReply();renderList();closePanel();renderBanner();
 emit('chat:history',{chat:id},d=>{
  if(cur!==id)return;
  if(d.error){toast(d.error);return}
  msgs[id]=d.messages;renderMsgs(true);emit('chat:read',{chat:id});
 });
 if(!keep&&matchMedia('(min-width:761px)').matches)$('#input').focus();
}
function closeChat(){cur=null;closePanel();renderBanner();$('#app').classList.remove('chat');$('#chatpane').classList.add('hidden');$('#placeholder').classList.remove('hidden');renderList()}
$('#btnBack').onclick=closeChat;
function renderHeader(){
 const c=chatById(cur);if(!c)return;
 const av=c.type==='group'?avHtml(c.name):avHtml(other(c).name,other(c).avatar,other(c).online);
 $('#hAv').outerHTML=av.replace('class="av ','id="hAv" class="av ');
 $('#hName').textContent=title(c);
 $('#hSub').dataset.base=c.type==='group'?c.members.length+' members, '+c.members.filter(id=>(users[id]||{}).online).length+' online'+(c.onlyAdminPosts?' · only admin can post':''):lastSeen(other(c));
 renderTyping();
}
function renderTyping(){
 const names=Object.keys(typers).filter(k=>k.startsWith(cur+':')&&!k.endsWith('n')).map(k=>typers[k+'n']);
 $('#typing').textContent=names.length?names.join(', ')+(names.length>1?' are':' is')+' typing…':'';
 const s=$('#hSub');s.textContent=s.dataset.base||'';
}
function ticks(m,c){
 if(m.from!==me.id||m.system)return '';
 const others=c.members.filter(x=>x!==me.id);
 const read=others.length&&others.every(x=>m.readBy.includes(x));
 const deliv=(m.deliveredTo||[]).length>1;
 return `<span class="tick ${read?'read':''}">${ic(deliv||read?'checks':'check',15)}</span>`;
}
function fmtSize(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function fileHtml(f){
 if(!f||!f.url)return '';
 const u=esc(U(f.url)),t=f.type||'';
 if(t.startsWith('image/'))return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${esc(f.name)}"></a>`;
 if(t.startsWith('video/'))return `<video src="${u}" controls playsinline preload="metadata"></video>`;
 if(t.startsWith('audio/'))return `<div class="voice"><small>Voice message</small><audio src="${u}" controls preload="metadata"></audio></div>`;
 return `<a class="file" href="${u}" target="_blank" rel="noopener" download="${esc(f.name)}">${ic('file',22)}<span>${esc(f.name)}<br><small style="color:var(--sub)">${fmtSize(f.size)}</small></span></a>`;
}
function textHtml(t){
 const s=t.trim(),lb=LABEL_RE.exec(s);
 if(lb)return `<span class="lab ${esc(lb[1])}">${esc(lb[2])}</span>`;
 if(!/\s/.test(s)&&/^https:\/\/(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)\//i.test(s))return `<img src="${esc(s)}" alt="GIF">`;
 return `<div class="txt">${linkify(t)}</div>`;
}
function renderMsgs(keepPos){
 const c=chatById(cur),box=$('#msgs');if(!c)return;
 const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
 const top=box.scrollTop,q=msgFilter.toLowerCase();
 const list=(msgs[cur]||[]).filter(m=>!q||(m.text||'').toLowerCase().includes(q));
 box.innerHTML=list.map(m=>{
  if(m.system)return `<div class="sysmsg">${esc(m.text)}</div>`;
  const mine=m.from===me.id,u=users[m.from]||{name:'Unknown'};
  let h='';
  if(c.type==='group'&&!mine)h+=`<div class="sender">${esc(u.name)}</div>`;
  if(m.forwarded)h+='<div class="fwd">Forwarded</div>';
  if(m.replyTo)h+=`<div class="quote"><b>${esc((users[m.replyTo.from]||{}).name||'')}</b><br>${esc(m.replyTo.text)}</div>`;
  if(m.deleted)h+='<div class="del">This message was deleted</div>';
  else{h+=fileHtml(m.file);if(m.text)h+=textHtml(m.text)}
  const rc=Object.entries(m.reactions||{}).map(([e,a])=>`<span>${esc(e)}${a.length>1?' '+a.length:''}</span>`).join('');
  if(rc)h+=`<div class="react">${rc}</div>`;
  h+=`<div class="meta">${(m.starredBy||[]).includes(me.id)?ic('star',12):''}${m.edited?'edited':''}<span>${fmtTime(m.ts)}</span>${ticks(m,c)}</div>`;
  return `<div class="row ${mine?'me':''}"><div class="b" data-id="${esc(m.id)}">${m.deleted?'':`<button class="dd" data-act="menu" aria-label="Message options">${ic('chevron',16)}</button>`}${h}</div></div>`;
 }).join('')||'<div class="empty">No messages yet. Say hello.</div>';
 if(atBottom||!keepPos)box.scrollTop=box.scrollHeight;else box.scrollTop=top;
}
$('#msgs').onclick=e=>{
 const b=e.target.closest('.b');if(!b||!e.target.closest('[data-act=menu]'))return;
 msgMenu(b.dataset.id,e.target.closest('[data-act=menu]').getBoundingClientRect());
};
// long-press (touch) or right-click opens the message menu
(function(){
 const box=$('#msgs');let t=null,fired=0,sx=0,sy=0;
 const open=(b,x,y)=>{fired=Date.now();msgMenu(b.dataset.id,{left:x,right:x,top:y,bottom:y,pt:true})};
 box.addEventListener('touchstart',e=>{
  const b=e.target.closest('.b');if(!b||e.touches.length!==1)return;
  const p=e.touches[0];sx=p.clientX;sy=p.clientY;clearTimeout(t);
  t=setTimeout(()=>{open(b,sx,sy);if(navigator.vibrate)navigator.vibrate(15)},450);
 },{passive:true});
 box.addEventListener('touchmove',e=>{const p=e.touches[0];if(Math.abs(p.clientX-sx)>10||Math.abs(p.clientY-sy)>10)clearTimeout(t)},{passive:true});
 box.addEventListener('touchcancel',()=>clearTimeout(t),{passive:true});
 box.addEventListener('touchend',e=>{clearTimeout(t);if(Date.now()-fired<700&&e.cancelable)e.preventDefault()});
 box.addEventListener('contextmenu',e=>{const b=e.target.closest('.b');if(!b)return;e.preventDefault();if(Date.now()-fired>800)open(b,e.clientX,e.clientY)});
})();
let menuAt=0;
function popMenu(html,rect){
 closeMenu();
 const m=document.createElement('div');m.className='menu';m.id='menu';m.innerHTML=html;document.body.appendChild(m);
 const w=m.offsetWidth,h=m.offsetHeight;
 const x=rect.pt?rect.left-w/2:rect.up?rect.left:rect.left-w+30,y=rect.up?rect.top-h-6:rect.pt?rect.top-h/2:rect.bottom;
 m.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';
 m.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+'px';
 menuAt=Date.now();return m;
}
function closeMenu(){const m=$('#menu');if(m)m.remove()}
document.addEventListener('click',e=>{if(Date.now()-menuAt<500)return;if(!e.target.closest('.menu')&&!e.target.closest('[data-act=menu]')&&!e.target.closest('[data-menu]'))closeMenu()});
function msgMenu(mid,rect){
 const c=chatById(cur),m=(msgs[cur]||[]).find(x=>x.id===mid);if(!m||m.deleted)return;
 const mine=m.from===me.id,canAll=mine||c.admin===me.id;
 const emo=['👍','❤️','😂','😮','😢','🙏'].map(x=>`<button data-r="${x}">${x}</button>`).join('');
 const el=popMenu(`<div class="emo">${emo}</div><button data-a="reply">Reply</button>${m.text?'<button data-a="copy">Copy</button>':''}<button data-a="star">${(m.starredBy||[]).includes(me.id)?'Remove star':'Star'}</button><button data-a="fwd">Forward</button>${m.file&&/^image\//.test(m.file.type)?'<button data-a="stk">Save to stickers</button>':''}${mine&&m.text&&!LABEL_RE.test(m.text)?'<button data-a="edit">Edit</button>':''}<hr><button data-a="delme">Delete for me</button>${canAll?'<button data-a="delall">Delete for everyone</button>':''}`,rect);
 el.onclick=ev=>{
  const b=ev.target.closest('button');if(!b)return;closeMenu();
  if(b.dataset.r){const mineR=(m.reactions||{})[b.dataset.r]||[];emit('message:react',{chat:cur,id:mid,emoji:mineR.includes(me.id)?'':b.dataset.r});return}
  switch(b.dataset.a){
   case 'reply':reply=m;renderReply();$('#input').focus();break;
   case 'copy':navigator.clipboard&&navigator.clipboard.writeText(m.text).then(()=>toast('Copied'));break;
   case 'star':emit('message:star',{chat:cur,id:mid});break;
   case 'fwd':forwardModal(m);break;
   case 'stk':emit('sticker:add',{file:m.file},d=>{if(d.error){toast(d.error);return}stickers=d.stickers;toast('Saved to stickers')});break;
   case 'edit':{const t=prompt('Edit message',m.text);if(t&&t.trim())emit('message:edit',{chat:cur,id:mid,text:t});break}
   case 'delme':emit('message:delete',{chat:cur,id:mid,everyone:false});break;
   case 'delall':emit('message:delete',{chat:cur,id:mid,everyone:true});break;
  }
 };
}
function renderReply(){
 $('#replybar').classList.toggle('hidden',!reply);
 if(reply)$('#replyText').textContent=((users[reply.from]||{}).name||'')+': '+(reply.text||(reply.file?'Attachment':''));
}
$('#replyX').onclick=()=>{reply=null;renderReply()};
$('#btnMsgSearch').onclick=()=>{$('#msgSearchBar').classList.toggle('hidden');$('#msgSearch').focus();msgFilter='';$('#msgSearch').value='';renderMsgs()};
$('#msgSearch').oninput=e=>{msgFilter=e.target.value;renderMsgs()};

// ---------- composer ----------
const inp=$('#input');let typingOn=false,typingT;
function autosize(){inp.style.height='auto';const h=inp.scrollHeight;inp.style.height=Math.min(h,120)+'px';inp.style.overflowY=h>120?'auto':'hidden'}
function syncSendMic(){const has=inp.value.trim().length>0;$('#btnSend').classList.toggle('hidden',!has);$('#btnMic').classList.toggle('hidden',has)}
inp.addEventListener('input',()=>{
 autosize();syncSendMic();
 if(!cur)return;
 if(!typingOn){typingOn=true;emit('typing',{chat:cur,typing:true})}
 clearTimeout(typingT);typingT=setTimeout(()=>{typingOn=false;emit('typing',{chat:cur,typing:false})},2000);
});
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendText()}});
$('#btnSend').onclick=sendText;
function sendMsg(data){emit('message:send',Object.assign({chat:cur,replyTo:reply&&reply.id},data),d=>{if(d&&d.error)toast(d.error)});reply=null;renderReply()}
function sendText(){
 const text=inp.value;if(!text.trim()||!cur)return;
 sendMsg({text});
 inp.value='';autosize();syncSendMic();
 clearTimeout(typingT);if(typingOn){typingOn=false;emit('typing',{chat:cur,typing:false})}
}
