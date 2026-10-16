// ---------- modal helpers ----------
function modal(html){$('#modal').innerHTML=html;hydrate($('#modal'));$('#ov').classList.remove('hidden')}
function closeModal(){stopRing();$('#ov').classList.add('hidden');$('#modal').innerHTML=''}
$('#ov').onclick=e=>{if(e.target.id==='ov')closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeMenu()}});
function bindModal(map){Object.entries(map).forEach(([id,fn])=>{const el=$('#modal #'+id);if(el)el.onclick=fn})}
const row=(icon,text)=>`${ic(icon,18)}<span>${text}</span>`;

// ---------- emoji / stickers / labels panel ----------
const EMOJI={
 '😀':'😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖',
 '👍':'👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤝 🙏 💪 👏 🙌 👐 🤲 ✍️ 💅 🫶 🫡 🤌 👀 🧠',
 '❤️':'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 😻 💋 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 🎉 🎊 🎈 🎁',
 '🐶':'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦆 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🐬 🐳 🦈 🌸 🌹 🌻 🌲 🌴 🍀 🌍 ☀️ 🌙 ⛅ 🌧 ⚡ ❄️ 🌈',
 '🍔':'🍏 🍎 🍌 🍉 🍇 🍓 🍑 🍍 🥭 🥑 🍅 🥕 🌽 🥔 🍞 🧀 🍳 🥞 🥓 🍗 🍔 🍟 🍕 🌭 🌮 🌯 🍝 🍜 🍣 🍤 🍦 🍩 🍪 🎂 🍰 🍫 🍬 ☕ 🍵 🥤 🍺 🍷 🥂',
 '⚽':'⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🎮 🎲 🎯 🎵 🎶 🎤 🎧 🎸 🎹 🚗 🚕 🚌 🏍 ✈️ 🚀 🏠 🏝 📱 💻 📷 📺 💡 🔑 🔒 ⏰ 💰 💊 🧸 🏆'
};
const LABELS=['On my way','Thank you','Call me','Okay','Good morning','Good night','Happy birthday','Congratulations','Sorry','Be right back','Busy right now','Love you','Yes','No','Reached home','Please call','Take care'];
const LCOLORS=['blue','green','orange','red','purple','teal','gray'];
const myLabels=()=>{try{return JSON.parse(store.get('mk_labels')||'[]')}catch{return[]}};
let panelTab=null,panelEmoji=null,labelColor='blue',fileMode='send';
function insertAtCursor(t){const s=inp.selectionStart??inp.value.length,e=inp.selectionEnd??inp.value.length;inp.value=inp.value.slice(0,s)+t+inp.value.slice(e);inp.selectionStart=inp.selectionEnd=s+t.length;inp.focus();autosize();syncSendMic()}
function closePanel(){panelTab=null;$('#panel').classList.add('hidden')}
function openPanel(tab){
 const p=$('#panel');
 if(panelTab===tab){closePanel();return}
 panelTab=tab;p.classList.remove('hidden');
 const tabs=`<div class="tabs">${[['emoji','Emoji'],['stickers','Stickers'],['labels','Labels']].map(([k,l])=>`<button data-t="${k}" class="${k===tab?'on':''}">${l}</button>`).join('')}</div>`;
 if(tab==='emoji'){
  const cur=panelEmoji||Object.keys(EMOJI)[0];
  p.innerHTML=tabs+`<div class="tabs">${Object.keys(EMOJI).map(k=>`<button data-cat="${k}" class="${k===cur?'on':''}" style="font-size:20px">${k}</button>`).join('')}</div><div class="grid">${EMOJI[cur].split(' ').map(e=>`<button data-e="${e}">${e}</button>`).join('')}</div>`;
 }else if(tab==='stickers'){
  p.innerHTML=tabs+`<div class="stk">${stickers.map(s=>`<div class="t" data-u="${esc(s.url)}"><img src="${esc(U(s.url))}" alt="Sticker" loading="lazy"><span class="x" data-rm="${esc(s.url)}">${ic('x',12)}</span></div>`).join('')}<div class="t" data-add="1" style="flex-direction:column;color:var(--accent)">${ic('plus',24)}<small>Add</small></div></div>${stickers.length?'':'<p style="color:var(--sub);font-size:13px">Your sticker library is empty. Add pictures or GIFs from your device, or save one from a chat (message menu, Save to stickers). Tap a sticker to send it.</p>'}`;
 }else{
  const mine=myLabels();
  p.innerHTML=tabs+`<div class="labs">${LABELS.map((t,i)=>`<button class="lab ${LCOLORS[i%LCOLORS.length]}" data-l="${esc(t)}" data-lc="${LCOLORS[i%LCOLORS.length]}">${esc(t)}</button>`).join('')}${mine.map((l,i)=>`<span style="display:inline-flex;align-items:center;gap:2px"><button class="lab ${esc(l.c)}" data-l="${esc(l.t)}" data-lc="${esc(l.c)}">${esc(l.t)}</button><button class="ib" data-lx="${i}" aria-label="Remove label" style="padding:2px">${ic('x',14)}</button></span>`).join('')}</div>
  <div style="display:flex;gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap"><input type="text" id="lbT" maxlength="30" placeholder="Create your own label" style="flex:1;min-width:140px"><span id="lbSw">${LCOLORS.map(c=>`<span class="sw lab ${c} ${c===labelColor?'on':''}" data-sw="${c}" style="padding:0"></span>`).join(' ')}</span></div>
  <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" id="lbSend" style="padding:6px 14px">Send</button><button class="btn sec" id="lbSave" style="padding:6px 14px">Save for later</button></div>`;
 }
}
$('#panel').onclick=e=>{
 const g=s=>e.target.closest(s);
 let x;
 if((x=g('[data-t]'))){panelTab=null;openPanel(x.dataset.t);return}
 if((x=g('[data-cat]'))){panelEmoji=x.dataset.cat;panelTab=null;openPanel('emoji');return}
 if((x=g('[data-e]'))){insertAtCursor(x.dataset.e);return}
 if((x=g('[data-rm]'))){e.stopPropagation();emit('sticker:remove',{url:x.dataset.rm},d=>{stickers=(d&&d.stickers)||[];panelTab=null;openPanel('stickers')});return}
 if((x=g('[data-u]'))){const s=stickers.find(s=>s.url===x.dataset.u);if(s){sendMsg({text:'',file:s});closePanel()}return}
 if(g('[data-add]')){pickFile('image/*',null,'sticker');return}
 if((x=g('[data-lx]'))){const l=myLabels();l.splice(+x.dataset.lx,1);store.set('mk_labels',JSON.stringify(l));panelTab=null;openPanel('labels');return}
 if((x=g('[data-l]'))){sendMsg({text:`::label:${x.dataset.lc}:${x.dataset.l}::`});closePanel();return}
 if((x=g('[data-sw]'))){labelColor=x.dataset.sw;document.querySelectorAll('#lbSw .sw').forEach(s=>s.classList.toggle('on',s===x));return}
 const t=()=>($('#lbT').value||'').replace(/::/g,'').trim().slice(0,30);
 if(e.target.id==='lbSend'){const v=t();if(!v){toast('Type the label text first');return}sendMsg({text:`::label:${labelColor}:${v}::`});closePanel();return}
 if(e.target.id==='lbSave'){const v=t();if(!v){toast('Type the label text first');return}const l=myLabels();l.push({t:v,c:labelColor});store.set('mk_labels',JSON.stringify(l.slice(-20)));panelTab=null;openPanel('labels');toast('Label saved');return}
};
$('#btnEmoji').onclick=()=>{if(panelTab)closePanel();else openPanel('emoji')};

// ---------- uploads (any size up to 100 MB, sent in parts) ----------
function putPart(fid,n,piece,onp){return new Promise(res=>{
 const x=new XMLHttpRequest();x.open('POST',API+'/api/upload/part?fid='+fid+'&n='+n);x.setRequestHeader('Authorization','Bearer '+token);
 x.upload.onprogress=e=>{if(e.lengthComputable&&onp)onp(e.loaded/e.total)};
 x.onload=()=>{let d={};try{d=JSON.parse(x.responseText)}catch{}res(x.status===200?{ok:true}:{error:d.error})};
 x.onerror=()=>res({error:'Network error'});x.send(piece)})}
async function uploadFile(blob,name,type,onp){
 const hdr={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 let st;
 try{st=await (await fetch(API+'/api/upload/start',{method:'POST',headers:hdr,body:JSON.stringify({name,type,size:blob.size})})).json()}catch{return{error:'Upload failed. Check your connection.'}}
 if(!st.fid)return{error:st.error||'Upload failed'};
 const PB=st.partBytes,parts=Math.ceil(blob.size/PB);
 for(let n=0;n<parts;n++){
  const piece=blob.slice(n*PB,Math.min(blob.size,(n+1)*PB));let ok=false,err='';
  for(let a=0;a<3&&!ok;a++){const r=await putPart(st.fid,n,piece,f=>onp&&onp(Math.round((n*PB+f*piece.size)/blob.size*100)));if(r.ok)ok=true;else err=r.error}
  if(!ok)return{error:err||'Upload failed'};
 }
 try{const f=await (await fetch(API+'/api/upload/finish',{method:'POST',headers:hdr,body:JSON.stringify({fid:st.fid})})).json();return f.url?f:{error:f.error||'Upload failed'}}
 catch{return{error:'Upload failed. Check your connection.'}}
}
async function sendFile(blob,name,type,extra){
 if(!cur)return;
 if(blob.size>100*1024*1024){toast('File too large (max 100 MB)');return}
 const chat=cur;
 const f=await uploadFile(blob,name,type,p=>toast('Uploading '+p+'%',60000));
 if(f.error){toast(f.error);return}
 emit('message:send',Object.assign({chat,text:'',file:f,replyTo:reply&&reply.id},extra||{}),d=>{if(d&&d.error)toast(d.error)});
 reply=null;renderReply();toast('Sent');
}
function pickFile(accept,capture,mode){const f=$('#file');fileMode=mode||'send';f.accept=accept;if(capture)f.setAttribute('capture',capture);else f.removeAttribute('capture');f.click()}
$('#file').onchange=async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;closePanel();
 const mode=fileMode;fileMode='send';
 if(mode==='sticker'){
  if(f.size>3*1024*1024){toast('Stickers must be under 3 MB');return}
  const up=await uploadFile(f,f.name,f.type||'image/png',p=>toast('Uploading '+p+'%',60000));
  if(up.error){toast(up.error);return}
  emit('sticker:add',{file:up},d=>{if(d.error){toast(d.error);return}stickers=d.stickers;toast('Sticker added');panelTab=null;openPanel('stickers')});
  return;
 }
 sendFile(f,f.name,f.type||'application/octet-stream',mode==='once'?{once:true}:null);
};
$('#btnAttach').onclick=e=>{
 const el=popMenu(`<button data-a="media">${row('image','Photo or video')}</button><button data-a="once">${row('lock','View-once photo or video')}</button><button data-a="cam">${row('camera','Take a photo')}</button><button data-a="vid">${row('video','Record a video')}</button><button data-a="file">${row('file','Document or file')}</button><button data-a="poll">${row('users','Poll')}</button><hr><button data-a="sched">${row('clock','Schedule a message')}</button><button data-a="ar">${row('pin','AR note')}</button>`,Object.assign(e.currentTarget.getBoundingClientRect().toJSON(),{up:true}));
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();
  ({media:()=>pickFile('image/*,video/*'),once:()=>pickFile('image/*,video/*',null,'once'),cam:()=>pickFile('image/*','environment'),vid:()=>pickFile('video/*','environment'),file:()=>pickFile('*/*'),poll:pollModal,sched:scheduleModal,ar:openAR})[b.dataset.a]()};
};

// ---------- voice recorder: delete / pause / play back / resume / send ----------
let rec=null;
const fmtDur=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
async function recStart(){
 if(rec||!cur)return;
 if(!window.MediaRecorder||!navigator.mediaDevices){toast('Voice messages are not supported in this browser');return}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch{toast('Allow the microphone to record a voice message');return}
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));
 const mr=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
 rec={mr,stream,chunks:[],mime:mime||mr.mimeType||'audio/webm',acc:0,t0:Date.now(),paused:false,bars:[],lastBar:0,audio:null,url:null,chat:cur};
 const R=rec;mr.ondataavailable=e=>{if(e.data&&e.data.size)R.chunks.push(e.data)};
 try{const AC=window.AudioContext||window.webkitAudioContext;rec.ctx=new AC();const src=rec.ctx.createMediaStreamSource(stream);rec.an=rec.ctx.createAnalyser();rec.an.fftSize=256;src.connect(rec.an)}catch{}
 mr.start(250);
 $('#composer').classList.add('hidden');$('#recbar').classList.remove('hidden','paused');
 $('#rPlay').classList.add('hidden');setIcon($('#rPause'),'pause');$('#rPause').setAttribute('aria-label','Pause');
 rec.tick=setInterval(()=>{if(!rec)return;$('#rTime').textContent=fmtDur(recElapsed());if(recElapsed()>15*60*1000)recSend()},200);
 recDraw();
}
const recElapsed=()=>rec.acc+(rec.paused?0:Date.now()-rec.t0);
function recDraw(){
 if(!rec)return;rec.raf=requestAnimationFrame(recDraw);
 const cv=$('#rWave'),W=cv.clientWidth,H=cv.clientHeight;if(cv.width!==W*2){cv.width=W*2;cv.height=H*2}
 const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
 if(!rec.paused&&rec.an&&Date.now()-rec.lastBar>70){
  const buf=new Uint8Array(rec.an.fftSize);rec.an.getByteTimeDomainData(buf);
  let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));rec.bars.push(m/128);rec.lastBar=Date.now();
 }
 const barW=4,gap=3,n=Math.floor(cv.width/(barW+gap)),bars=rec.bars.slice(-n);
 g.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent');
 bars.forEach((v,i)=>{const h=Math.max(4,v*cv.height*1.6);g.globalAlpha=rec.paused?.5:1;g.fillRect(cv.width-(bars.length-i)*(barW+gap),(cv.height-h)/2,barW,h)});
}
function recPauseResume(){
 if(!rec)return;
 if(!rec.paused){ // pause: allow play back
  rec.mr.pause();rec.acc+=Date.now()-rec.t0;rec.paused=true;rec.mr.requestData();
  $('#recbar').classList.add('paused');$('#rPlay').classList.remove('hidden');setIcon($('#rPlay'),'play');
  setIcon($('#rPause'),'mic');$('#rPause').setAttribute('aria-label','Resume recording');
 }else{ // resume
  recStopPreview();rec.t0=Date.now();rec.paused=false;rec.mr.resume();
  $('#recbar').classList.remove('paused');$('#rPlay').classList.add('hidden');
  setIcon($('#rPause'),'pause');$('#rPause').setAttribute('aria-label','Pause');
 }
}
function recStopPreview(){if(rec&&rec.audio){rec.audio.pause();rec.audio=null}if(rec&&rec.url){URL.revokeObjectURL(rec.url);rec.url=null}if(rec)setIcon($('#rPlay'),'play')}
function recPlay(){
 if(!rec||!rec.paused)return;
 if(rec.audio&&!rec.audio.paused){rec.audio.pause();setIcon($('#rPlay'),'play');return}
 if(!rec.audio){
  rec.url=URL.createObjectURL(new Blob(rec.chunks,{type:rec.mime}));rec.audio=new Audio(rec.url);
  rec.audio.onended=()=>{if(rec&&rec.audio){setIcon($('#rPlay'),'play');rec.audio.currentTime=0}};
 }
 rec.audio.play().catch(()=>toast('Could not play the recording'));setIcon($('#rPlay'),'pause');
}
function recCleanup(){
 if(!rec)return;recStopPreview();clearInterval(rec.tick);cancelAnimationFrame(rec.raf);
 try{rec.stream.getTracks().forEach(t=>t.stop())}catch{}try{rec.ctx&&rec.ctx.close()}catch{}
 $('#recbar').classList.add('hidden');$('#composer').classList.remove('hidden');rec=null;
}
function recCancel(){if(!rec)return;const r=rec;r.mr.onstop=null;try{r.mr.state!=='inactive'&&r.mr.stop()}catch{}recCleanup();toast('Recording deleted')}
function recSend(){
 if(!rec)return;const r=rec,ms=recElapsed();
 if(ms<700){recCancel();toast('Recording too short');return}
 r.mr.onstop=()=>{
  const blob=new Blob(r.chunks,{type:r.mime.split(';')[0]}),chat=r.chat;
  const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
  if(cur!==chat)toast('Sending voice message…');
  recCleanup();sendFile(blob,'voice-message.'+ext,blob.type);
 };
 try{r.mr.state!=='inactive'?r.mr.stop():r.mr.onstop()}catch{recCleanup()}
}
$('#btnMic').onclick=recStart;$('#rDel').onclick=recCancel;$('#rPause').onclick=recPauseResume;$('#rPlay').onclick=recPlay;$('#rSend').onclick=recSend;

// ---------- scheduled messages ----------
function scheduleModal(){
 if(!cur)return;
 const d=new Date(Date.now()+3600e3);d.setMinutes(0,0,0);
 const pad=n=>String(n).padStart(2,'0'),val=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
 modal(`<h3>Schedule a message</h3><p style="color:var(--sub);margin:0 0 8px;font-size:13px">To: ${esc(title(chatById(cur)))}</p>
 <textarea id="sText" rows="3" placeholder="Message">${esc(inp.value)}</textarea>
 <label class="l">Send at</label><input type="datetime-local" id="sAt" value="${val}">
 <div class="err" id="mErr"></div>
 <div class="acts"><button class="btn sec" id="mCancel">Close</button><button class="btn" id="sGo">Schedule</button></div>
 <h4>Your scheduled messages</h4><div id="sList" style="font-size:14px">Loading…</div>`);
 const load=()=>emit('schedule:list',{},r=>{const l=r&&r.items||[];$('#sList').innerHTML=l.length?l.map(i=>{const c=chatById(i.chat);return `<div class="mem"><div class="grow"><b>${new Date(i.at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</b> · ${esc(c?title(c):'chat')}<br><span style="color:var(--sub)">${esc((i.text||'Attachment').slice(0,80))}</span></div><button class="link" data-c="${esc(i.id)}">Cancel</button></div>`}).join(''):'<span style="color:var(--sub)">Nothing scheduled</span>'});
 load();
 bindModal({mCancel:closeModal,sGo:()=>{
  const at=new Date($('#sAt').value).getTime(),text=$('#sText').value;
  emit('message:schedule',{chat:cur,text,at,replyTo:reply&&reply.id},r=>{if(r.error){$('#mErr').textContent=r.error;return}$('#mErr').textContent='';inp.value='';autosize();syncSendMic();toast('Scheduled for '+new Date(at).toLocaleString());$('#sText').value='';load()})}});
 $('#modal').onclick=e=>{const b=e.target.closest('[data-c]');if(b)emit('schedule:cancel',{id:b.dataset.c},()=>load())};
}

// ---------- menus ----------
$('#btnSideMore').onclick=e=>{
 const n=invites.length;
 const el=popMenu(`<button data-a="grp">${row('users','Create or join a group')}</button><button data-a="inv">${row('user-plus','Invite member')}</button><button data-a="ivs">${row('bell','Invitations')}${n?`<span class="cnt">${n}</span>`:''}</button><button data-a="star">${row('star','Starred messages')}</button><button data-a="calls">${row('phone','Call history')}</button>${me.isAdmin?`<button data-a="adm">${row('gear','Admin dashboard')}</button>`:''}<hr><button data-a="set">${row('gear','Settings')}</button>`,e.currentTarget.getBoundingClientRect());
 el.dataset.menu=1;
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();({grp:groupModal,inv:()=>inviteModal(),ivs:invitationsModal,star:starModal,calls:callsModal,adm:adminModal,set:settingsModal})[b.dataset.a]()};
};
$('#btnMore').onclick=e=>{
 const c=chatById(cur);if(!c)return;
 const el=popMenu(`<button data-a="info">${row('info',c.type==='group'?'Group info':'Contact info')}</button>${c.type==='group'?`<button data-a="invite">${row('user-plus','Invite member')}</button>`:''}<button data-a="media">${row('image','Media and files')}</button><button data-a="pin">${row('pinned',c.pinned?'Unpin chat':'Pin chat')}</button><button data-a="mute">${row('muted',c.muted?'Unmute':'Mute')}</button><button data-a="ttl">${row('clock','Disappearing messages')}</button><button data-a="ar">${row('pin','AR notes')}</button><button data-a="sched">${row('clock','Scheduled messages')}</button><hr><button data-a="exp">${row('download','Export chat')}</button><button data-a="clear">${row('trash','Clear chat')}</button>`,e.currentTarget.getBoundingClientRect());
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();
  if(b.dataset.a==='info')infoModal();
  if(b.dataset.a==='invite')inviteModal(c.id);
  if(b.dataset.a==='media')galleryModal();
  if(b.dataset.a==='pin')emit('chat:pref',{chat:cur,pinned:!c.pinned});
  if(b.dataset.a==='mute')emit('chat:pref',{chat:cur,muted:!c.muted});
  if(b.dataset.a==='ttl')ttlModal();
  if(b.dataset.a==='ar')openAR();
  if(b.dataset.a==='sched')scheduleModal();
  if(b.dataset.a==='exp')exportChat();
  if(b.dataset.a==='clear'&&confirm('Clear all messages for you?')){emit('chat:clear',{chat:cur});msgs[cur]=[];renderMsgs()}};
};
async function authDownload(path,filename){
 try{const r=await fetch(API+path,{headers:{Authorization:'Bearer '+token}});if(!r.ok){toast('Download failed');return}
  const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
 catch{toast('Download failed')}
}
function exportChat(){
 const c=chatById(cur);if(!c)return;
 emit('chat:history',{chat:cur,all:true},d=>{
  if(!d||!d.messages){toast('Could not export');return}
  const lines=d.messages.filter(m=>!m.deleted).map(m=>{
   const w=new Date(m.ts).toLocaleString(),n=m.system?'':((users[m.from]||{}).name||'Unknown')+': ';
   const lb=LABEL_RE.exec(m.text||'');
   return `[${w}] ${n}${lb?lb[2]:m.text||(m.poll?'Poll: '+m.poll.q:m.file?'['+(m.once?'view-once media':m.file.name)+']':'')}`;
  });
  const blob=new Blob([title(c)+' - exported '+new Date().toLocaleString()+'\n\n'+lines.join('\n')],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MK Messages - '+title(c).replace(/[^\w\- ]/g,'_')+'.txt';document.body.appendChild(a);a.click();a.remove();toast('Chat exported (text only)');
 });
}
function starModal(){
 modal(`<h3>Starred messages</h3><div id="stList">Loading…</div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);bindModal({mCancel:closeModal});
 emit('star:list',{},d=>{const l=(d&&d.results)||[];$('#stList').innerHTML=l.length?l.map(r=>{const c=chatById(r.chat);return `<div class="mem" data-hit="${esc(r.chat)}|${esc(r.id)}" style="cursor:pointer"><div class="grow"><b>${esc(c?title(c):'Chat')}</b> <small style="color:var(--sub)">${fmtDay(r.ts)}</small><br><span style="color:var(--sub)">${esc(((users[r.from]||{}).name||'')+': '+r.text)}</span></div></div>`}).join(''):'<p style="color:var(--sub)">No starred messages yet. Open a message menu and choose Star.</p>'});
 $('#modal').onclick=e=>{const x=e.target.closest('[data-hit]');if(x){const [c,i]=x.dataset.hit.split('|');jumpToMsg(c,i)}};
}
function callsModal(){
 modal(`<h3>Call history</h3><div id="clList">Loading…</div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);bindModal({mCancel:closeModal});
 emit('calls:history',{},d=>{const l=(d&&d.items)||[];$('#clList').innerHTML=l.length?l.map(r=>{const c=chatById(r.chat);return `<div class="mem"><div class="grow"><b style="${r.call.missed?'color:var(--danger)':''}">${esc(r.text)}</b><br><small style="color:var(--sub)">${esc(c?title(c):'Chat')} · ${new Date(r.ts).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</small></div>${c?`<button class="btn" data-cb="${esc(r.chat)}|${r.call.video?1:0}" style="padding:6px 12px">${ic(r.call.video?'video':'phone',16)}</button>`:''}</div>`}).join(''):'<p style="color:var(--sub)">No calls yet.</p>'});
 $('#modal').onclick=e=>{const x=e.target.closest('[data-cb]');if(x){const [c,v]=x.dataset.cb.split('|');closeModal();openChat(c,true);joinCall(c,v==='1')}};
}
function ttlModal(){
 const c=chatById(cur);if(!c)return;
 const opts=[[0,'Off'],[86400,'24 hours'],[604800,'7 days'],[7776000,'90 days']];
 modal(`<h3>Disappearing messages</h3><p style="color:var(--sub);font-size:13px">New messages in this chat are deleted for everyone after the time you choose.${c.type==='group'?' Only admins can change this.':''}</p>${opts.map(([v,l])=>`<label class="setrow" style="cursor:pointer"><input type="radio" name="ttl" value="${v}" style="width:auto" ${(c.ttl||0)===v?'checked':''}><span class="grow">${l}</span></label>`).join('')}<div class="err" id="mErr"></div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal});
 $('#modal').onchange=e=>{if(e.target.name==='ttl')emit('chat:ttl',{chat:cur,ttl:+e.target.value},d=>{if(d&&d.error){ttlModal();$('#mErr').textContent=d.error}else toast('Updated')})};
}
function galleryModal(){
 modal(`<h3>Media and files</h3><div id="gl">Loading…</div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);bindModal({mCancel:closeModal});
 emit('media:list',{chat:cur},d=>{
  const l=(d&&d.items)||[];
  $('#gl').innerHTML=l.length?`<div class="gal">${l.map(i=>{const f=i.file,u=esc(U(f.url));
   if(/^image\//.test(f.type))return `<div class="g"><img data-lb="${u}" src="${u}" alt="" loading="lazy"></div>`;
   if(/^video\//.test(f.type))return `<div class="g"><video src="${u}" preload="metadata" controls></video></div>`;
   return `<a class="g" href="${u}" target="_blank" rel="noopener" download="${esc(f.name)}" style="flex-direction:column;color:var(--text);text-decoration:none">${ic(/^audio\//.test(f.type)?'mic':'file',22)}<span>${esc(f.name.slice(0,22))}</span></a>`}).join('')}</div>`:'<p style="color:var(--sub)">No photos, videos or files in this chat yet.</p>';
 });
 $('#modal').onclick=e=>{const x=e.target.closest('[data-lb]');if(x){e.preventDefault();lbList=[x.dataset.lb];lbI=0;$('#lb').classList.remove('hidden');lbShow()}};
}
function pollModal(){
 modal(`<h3>Create a poll</h3><input type="text" id="plQ" maxlength="200" placeholder="Question"><div id="plO" style="margin-top:8px"></div><button class="link" id="plAdd">Add option</button>
 <label class="l" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="plM" style="width:auto"> Allow several answers</label><div class="err" id="mErr"></div><div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="plGo">Send poll</button></div>`);
 const add=()=>{const n=document.querySelectorAll('#plO input').length;if(n>=8)return;const i=document.createElement('input');i.type='text';i.maxLength=80;i.placeholder='Option '+(n+1);i.style.marginBottom='6px';$('#plO').appendChild(i)};
 add();add();
 bindModal({mCancel:closeModal,plAdd:add,plGo:()=>{
  const q=$('#plQ').value.trim(),opts=[...document.querySelectorAll('#plO input')].map(i=>i.value.trim()).filter(Boolean);
  if(!q||opts.length<2){$('#mErr').textContent='Add a question and at least two options';return}
  sendMsg({poll:{q,opts,multi:$('#plM').checked}});closeModal();
 }});
}

// ---------- group: create or join ----------
function groupModal(){
 modal(`<h3>Join a group</h3><input type="text" id="gNum" inputmode="numeric" maxlength="6" placeholder="6-digit group code"><div class="err" id="mErr"></div>
 <div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="gJoin">Join</button></div>
 <hr><h3>Create a group</h3><p style="color:var(--sub);font-size:13px;margin:0 0 8px">You become the admin of any group you create.</p>
 <input type="text" id="gName" placeholder="Group name" maxlength="40" style="margin-bottom:8px"><input type="text" id="gDesc" placeholder="Description (optional)" maxlength="200">
 <label class="l" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="gOnly" style="width:auto"> Only I (admin) can post</label>
 <div class="acts"><button class="btn" id="gCreate">Create group</button></div>`);
 const join=()=>emit('group:join',{number:$('#gNum').value},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();if(d.pending){toast('Request sent. An admin of '+d.name+' must approve it.',6000);return}openChat(d.chat.id)});
 $('#gNum').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();join()}});
 bindModal({mCancel:closeModal,gJoin:join,gCreate:()=>emit('group:create',{name:$('#gName').value,description:$('#gDesc').value,onlyAdminPosts:$('#gOnly').checked},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();openChat(d.chat.id);toast('Group code: '+d.chat.number,6000)})});
}
function joinPrompt(code){
 modal(`<h3>Join this group?</h3><p>Someone shared the group code <b>${esc(code)}</b> with you.</p><div class="err" id="mErr"></div><div class="acts"><button class="btn sec" id="mCancel">Not now</button><button class="btn" id="jGo">Join group</button></div>`);
 bindModal({mCancel:closeModal,jGo:()=>emit('group:join',{number:code},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();if(d.pending){toast('Request sent. An admin of '+d.name+' must approve it.',6000);return}openChat(d.chat.id)})});
}

// ---------- invite member (find a person, or share the group code) ----------
function inviteModal(chatId){
 const groups=chats.filter(c=>c.type==='group');
 if(!groups.length){toast('Create or join a group first');return}
 let sel=chatId&&groups.find(g=>g.id===chatId)?chatId:(cur&&groups.find(g=>g.id===cur)?cur:groups[0].id);
 const link=()=>location.origin+'/?join='+chatById(sel).number;
 const draw=()=>{
  const g=chatById(sel);
  modal(`<h3>Invite member</h3>
  <label class="l">Group</label><select id="iGroup">${groups.map(x=>`<option value="${esc(x.id)}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
  <h4>Invite someone already on MK Messages</h4>
  <div style="display:flex;gap:6px"><input type="text" id="iQ" placeholder="Mobile number or username"><button class="btn" id="iFind">Find</button></div>
  <div id="iRes" style="margin-top:8px"></div>
  <hr><h4>Or share the group code</h4>
  <div class="num">${esc(g.number)}</div>
  <p style="color:var(--sub);font-size:13px;text-align:center;margin:0 0 8px">Anyone with this code can join ${esc(g.name)}.</p>
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn sec" id="iCode">${row('copy','Copy code')}</button><button class="btn sec" id="iLink">${row('share','Copy invite link')}</button>${navigator.share?`<button class="btn" id="iShare">${row('share','Share')}</button>`:''}</div>
  <div class="acts"><button class="btn sec" id="mCancel">Close</button></div>`);
  $('#iGroup').onchange=e=>{sel=e.target.value;draw()};
  const find=()=>{const q=$('#iQ').value.trim();if(!q)return;emit('user:find',{q},d=>{
   const u=d&&d.users&&d.users[0];
   $('#iRes').innerHTML=u?`<div class="mem">${avHtml(u.name,u.avatar,u.online,'sm')}<div class="grow">${esc(u.name)}<br><small style="color:var(--sub)">${esc(u.phone?'+'+u.phone:'')}</small></div><button class="btn" id="iSend" style="padding:6px 14px">Invite</button></div>`:'<span style="color:var(--sub)">No one on MK Messages matches that number or username.</span>';
   const b=$('#iSend');if(b)b.onclick=()=>emit('invite:send',{chat:sel,user:u.id},r=>{if(r.error){toast(r.error);return}b.disabled=true;b.textContent='Invited';toast('Invitation sent to '+r.name)});
  })};
  $('#iFind').onclick=find;$('#iQ').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();find()}});
  const cp=(t,m)=>navigator.clipboard?navigator.clipboard.writeText(t).then(()=>toast(m)):toast(t);
  bindModal({mCancel:closeModal,iCode:()=>cp(g.number,'Code copied'),iLink:()=>cp(link(),'Invite link copied'),iShare:()=>navigator.share({title:'Join '+g.name+' on MK Messages',text:'Join "'+g.name+'" on MK Messages with code '+g.number,url:link()}).catch(()=>{})});
 };
 draw();
}
function invitationsModal(){
 modal(`<h3>Invitations</h3><div id="ivList"></div><div class="acts"><button class="btn sec" id="mCancel">Close</button></div>`);
 const draw=()=>{$('#ivList').innerHTML=invites.length?invites.map(i=>`<div class="mem"><div class="grow"><b>${esc(i.chatName)}</b><br><small style="color:var(--sub)">Invited by ${esc(i.fromName)}</small></div><button class="btn" data-ac="${esc(i.id)}" style="padding:6px 12px">Join</button><button class="btn sec" data-dc="${esc(i.id)}" style="padding:6px 12px">Decline</button></div>`).join(''):'<p style="color:var(--sub)">No pending invitations.</p>'};
 draw();bindModal({mCancel:closeModal});
 $('#modal').onclick=e=>{
  const a=e.target.closest('[data-ac]'),d=e.target.closest('[data-dc]');
  if(a)emit('invite:accept',{id:a.dataset.ac},r=>{invites=invites.filter(i=>i.id!==a.dataset.ac);if(r.error){toast(r.error);draw();return}closeModal();if(r.pending){toast('Request sent. An admin of '+r.name+' must approve it.',6000);return}openChat(r.chat.id)});
  if(d)emit('invite:decline',{id:d.dataset.dc},()=>{invites=invites.filter(i=>i.id!==d.dataset.dc);draw()});
 };
}

// ---------- forward / profile / info ----------
function forwardModal(m){
 modal(`<h3>Forward to</h3>${chats.map(c=>`<div class="mem" style="cursor:pointer" data-id="${esc(c.id)}">${c.type==='group'?avHtml(c.name,null,false,'sm'):avHtml(other(c).name,other(c).avatar,false,'sm')}<div class="grow">${esc(title(c))}</div></div>`).join('')||'<div class="empty">No chats</div>'}<div class="acts"><button class="btn sec" id="mCancel">Cancel</button></div>`);
 bindModal({mCancel:closeModal});
 $('#modal').onclick=e=>{const el=e.target.closest('.mem');if(!el)return;
  emit('message:send',{chat:el.dataset.id,text:m.text,file:m.file,forwarded:true},d=>{toast(d&&d.error?d.error:'Forwarded')});closeModal()};
}
function profileModal(){
 modal(`<h3>Your profile</h3><div style="text-align:center">${avHtml(me.name,me.avatar,false,'lg')}<br><button class="link" id="pPic">Change photo</button><input type="file" id="pFile" accept="image/*" class="hidden"></div>
 <label class="l">Username (shown to everyone)</label><input type="text" id="pName" maxlength="30" value="${esc(me.name)}">
 <label class="l">Mobile number</label><input type="tel" id="pPhone" value="${esc(me.phone?'+'+me.phone:'')}" placeholder="With country code">
 <label class="l">About</label><input type="text" id="pAbout" maxlength="120" value="${esc(me.about)}">
 <div class="err" id="mErr"></div>
 <div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="pSave">Save</button></div>`);
 let avatar;
 $('#pFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),s=Math.min(img.width,img.height);x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,128,128);avatar=c.toDataURL('image/jpeg',.8);toast('Photo ready. Tap Save.')};img.src=URL.createObjectURL(f)};
 bindModal({mCancel:closeModal,pPic:()=>$('#pFile').click(),pSave:()=>{
  const d={name:$('#pName').value,about:$('#pAbout').value,phone:$('#pPhone').value};if(avatar)d.avatar=avatar;
  emit('profile:update',d,r=>{if(r&&r.error){$('#mErr').textContent=r.error;return}if(r&&r.user){me=r.user;users[me.id]=me}renderMe();renderList();closeModal()})}});
}
function infoModal(){
 const c=chatById(cur);if(!c)return;
 if(c.type==='dm'){
  const u=other(c),blocked=(me.blocked||[]).includes(u.id);
  modal(`<h3>${esc(u.name)}</h3><p style="color:var(--sub)">${esc(u.phone?'+'+u.phone:'')}${u.phone?' · ':''}${esc(lastSeen(u))}</p><p>${esc(u.about||'')}</p><div class="acts" style="justify-content:flex-start"><button class="btn sec" id="bBlock">${blocked?'Unblock':'Block'}</button><button class="btn sec" id="bReport">Report</button><span style="flex:1"></span><button class="btn" id="mCancel">Close</button></div>`);
  bindModal({mCancel:closeModal,
   bBlock:()=>{if(!blocked&&!confirm('Block '+u.name+'? They will not be able to message or call you.'))return;emit('user:block',{user:u.id,on:!blocked},d=>{me.blocked=d.blocked;users[me.id]=me;toast(blocked?'Unblocked':'Blocked');closeModal()})},
   bReport:()=>{const r=prompt('Why are you reporting '+u.name+'? (an admin will review it)');if(r!==null)emit('user:report',{user:u.id,chat:c.id,reason:r},d=>{toast(d&&d.ok?'Report sent to the admin':'Could not send the report');closeModal()})}});
  return;
 }
 const owner=c.admin===me.id,mgr=owner||(c.admins||[]).includes(me.id);
 modal(`<div style="text-align:center">${avHtml(c.name,c.icon&&U(c.icon),false,'lg')}${mgr?'<br><button class="link" id="gIcon">Change group photo</button><input type="file" id="gIconF" accept="image/*" class="hidden">':''}</div>
 <h3 style="text-align:center;margin-top:8px">${esc(c.name)}</h3><p style="color:var(--sub);text-align:center">${esc(c.description||'')}</p>
 ${c.announce?`<div class="setrow"><div class="grow"><b>Pinned announcement</b><small>${esc(c.announce.text)}</small></div>${mgr?'<button class="link" id="gUnpin">Unpin</button>':''}</div>`:''}
 <div style="text-align:center;color:var(--sub);font-size:13px">Group code. Share it so others can join.</div><div class="num">${esc(c.number)}</div>
 <div style="text-align:center"><button class="link" id="gCopy">Copy code</button>${mgr?' · <button class="link" id="gRegen">New code</button>':''} · <button class="link" id="gInv">Invite member</button></div>
 ${mgr?`<div class="setrow"><label class="grow" for="gOnly"><b>Only admins can post</b></label><input type="checkbox" id="gOnly" style="width:auto" ${c.onlyAdminPosts?'checked':''}></div><div class="setrow"><label class="grow" for="gAppr"><b>Admin approval to join</b><small>New people wait until an admin approves them.</small></label><input type="checkbox" id="gAppr" style="width:auto" ${c.approval?'checked':''}></div>`:''}
 <div id="reqBox"></div>
 <h4>${c.members.length} members, ${c.members.filter(id=>(users[id]||{}).online).length} online</h4>
 ${c.members.map(id=>{const u=users[id]||{name:'Unknown'},isOwner=id===c.admin,isAdm=(c.admins||[]).includes(id);return `<div class="mem"${id!==me.id?` data-dm="${esc(id)}" style="cursor:pointer"`:''}>${avHtml(u.name,u.avatar,u.online,'sm')}<div class="grow">${esc(u.name)}${id===me.id?' (you)':''}${isOwner?' <small style="color:var(--accent)">owner</small>':isAdm?' <small style="color:var(--accent)">admin</small>':''}<br><small style="color:var(--sub)">${esc(lastSeen(u))}</small></div>${owner&&!isOwner?`<button class="link" data-adm="${esc(id)}|${isAdm?0:1}">${isAdm?'Remove admin':'Make admin'}</button>`:''}${mgr&&!isOwner&&!(isAdm&&!owner)?`<button class="link" data-rm="${esc(id)}">Remove</button>`:''}</div>`}).join('')}
 <div class="acts"><button class="btn sec" id="gLeave">Leave</button>${owner?'<button class="btn danger" id="gDel">Delete group</button>':''}<button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal,
  gCopy:()=>{navigator.clipboard&&navigator.clipboard.writeText(c.number).then(()=>toast('Code copied'))},
  gInv:()=>inviteModal(c.id),
  gUnpin:()=>emit('group:pin',{chat:c.id,id:null},()=>closeModal()),
  gIcon:()=>$('#gIconF').click(),
  gRegen:()=>{if(confirm('Generate a new code? The old one stops working.'))emit('group:regenerate',{chat:c.id},()=>closeModal())},
  gLeave:()=>{if(confirm('Leave this group?'))emit('group:leave',{chat:c.id},()=>closeModal())},
  gDel:()=>{if(confirm('Delete this group for everyone?'))emit('group:delete',{chat:c.id},()=>closeModal())}});
 const f=$('#gIconF');if(f)f.onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const img=new Image();img.onload=async()=>{
   const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d'),s=Math.min(img.width,img.height);x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,256,256);
   const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.85)),up=await uploadFile(blob,'group.jpg','image/jpeg');
   if(up.error){toast(up.error);return}emit('group:update',{chat:c.id,icon:up.url},d=>{toast(d&&d.error||'Group photo updated');closeModal()});
  };img.src=URL.createObjectURL(file);
 };
 const o=$('#gOnly');if(o)o.onchange=()=>emit('group:update',{chat:c.id,onlyAdminPosts:o.checked},()=>{});
 const ap=$('#gAppr');if(ap)ap.onchange=()=>emit('group:update',{chat:c.id,approval:ap.checked},()=>{});
 if(mgr&&c.requests)emit('group:requests',{chat:c.id},r=>{const l=(r&&r.requests)||[];if(l.length&&$('#reqBox'))$('#reqBox').innerHTML=`<h4>Join requests (${l.length})</h4>`+l.map(q=>`<div class="mem">${avHtml(q.user.name,q.user.avatar,false,'sm')}<div class="grow">${esc(q.user.name)}<br><small style="color:var(--sub)">${q.user.phone?'+'+esc(q.user.phone):''}</small></div><button class="btn" data-ap="${esc(q.user.id)}|1" style="padding:6px 12px">Approve</button><button class="btn sec" data-ap="${esc(q.user.id)}|0" style="padding:6px 12px">Decline</button></div>`).join('')});
 $('#modal').onclick=e=>{
  const g=s=>e.target.closest(s);let x;
  if((x=g('[data-rm]'))){if(confirm('Remove this member?'))emit('group:remove',{chat:c.id,user:x.dataset.rm},()=>closeModal());return}
  if((x=g('[data-adm]'))){const [u,on]=x.dataset.adm.split('|');emit('group:admin',{chat:c.id,user:u,on:on==='1'},d=>{if(d&&d.error)toast(d.error);closeModal()});return}
  if((x=g('[data-ap]'))){const [u,ok]=x.dataset.ap.split('|');emit('group:approve',{chat:c.id,user:u,ok:ok==='1'},d=>{if(d&&d.error)toast(d.error);closeModal()});return}
  if((x=g('[data-dm]'))){const u=users[x.dataset.dm];if(u)emit('dm:open',{user:u.id},d=>{if(d.chat){closeModal();openChat(d.chat.id)}})}
 };
}
$('#hInfo').onclick=infoModal;

// ---------- settings ----------
function settingsModal(){
 const theme=store.get('mk_theme')||'auto';
 const perm=pushSupported()?Notification.permission:'unsupported';
 const alerts=perm==='granted'?'On. Calls and messages will alert you when the app is closed.':perm==='denied'?'Blocked. Allow notifications for this site in your browser settings.':perm==='unsupported'?'Not supported here. On iPhone, add MK Messages to your Home Screen first.':'Off. Turn on so calls ring when the app is closed.';
 const nb=(me.blocked||[]).length;
 modal(`<h3>Settings</h3>
 <div class="setrow" style="cursor:pointer" id="sProf">${avHtml(me.name,me.avatar)}<div class="grow"><b>${esc(me.name)}</b><small>${esc(me.phone?'+'+me.phone:'Add your mobile number')}</small></div>${ic('chevron',18)}</div>
 <div class="setrow"><div class="grow"><b>Theme</b></div><div class="seg" id="sTheme">${[['light','Light'],['dark','Dark'],['auto','Device']].map(([k,l])=>`<button data-th="${k}" class="${k===theme?'on':''}">${l}</button>`).join('')}</div></div>
 <div class="setrow"><div class="grow"><b>Call and message alerts</b><small>${esc(alerts)}</small></div>${perm==='default'?'<button class="btn" id="sAlert" style="padding:6px 12px">Turn on</button>':perm==='granted'?'<button class="btn sec" id="sAlert" style="padding:6px 12px">Refresh</button>':''}</div>
 <div class="setrow"><div class="grow"><b>Hide last seen and online</b><small>Others will not see when you were last online. You will not see theirs either way.</small></div><input type="checkbox" id="sHide" style="width:auto" ${me.hideSeen?'checked':''}></div>
 <div class="setrow" style="cursor:pointer" id="sLock"><div class="grow"><b>App lock</b><small>${store.get('mk_pin')?'On. Asks for your PIN when you come back.':'Off. Protect the app with a PIN.'}</small></div>${ic('chevron',18)}</div>
 <div class="setrow" style="cursor:pointer" id="sBlk"><div class="grow"><b>Blocked contacts</b><small>${nb?nb+' blocked':'None'}</small></div>${ic('chevron',18)}</div>
 ${me.isAdmin?`<div class="setrow" style="cursor:pointer" id="sAdm"><div class="grow"><b>Admin dashboard</b><small>Usage, reports, backups</small></div>${ic('chevron',18)}</div>`:''}
 ${installEv||(isIOS&&!standalone)?`<div class="setrow"><div class="grow"><b>Install app</b><small>${installEv?'Add MK Messages to your device':'Share, then Add to Home Screen'}</small></div>${installEv?'<button class="btn" id="sInst" style="padding:6px 12px">Install</button>':''}</div>`:''}
 <div class="acts" style="margin-top:18px;justify-content:space-between"><button class="btn sec" id="mCancel">Close</button><button class="btn danger" id="sOut">${row('logout','Log out')}</button></div>`);
 bindModal({mCancel:closeModal,sProf:()=>profileModal(),sLock:appLockModal,sBlk:blockedModal,sAdm:adminModal,sOut:()=>{if(confirm('Log out of MK Messages on this device?'))logout()},
  sAlert:async()=>{await enablePush();settingsModal()},
  sInst:async()=>{installEv.prompt();await installEv.userChoice.catch(()=>{});installEv=null;settingsModal()}});
 $('#sHide').onchange=e=>emit('privacy:set',{hideSeen:e.target.checked},()=>toast(e.target.checked?'Your last seen and online status are hidden':'Your last seen and online status are visible'));
 $('#sTheme').onclick=e=>{const b=e.target.closest('[data-th]');if(!b)return;store.set('mk_theme',b.dataset.th);applyTheme();document.querySelectorAll('#sTheme button').forEach(x=>x.classList.toggle('on',x===b))};
}
function blockedModal(){
 const l=(me.blocked||[]).map(id=>users[id]).filter(Boolean);
 modal(`<h3>Blocked contacts</h3>${l.length?l.map(u=>`<div class="mem">${avHtml(u.name,u.avatar,false,'sm')}<div class="grow">${esc(u.name)}</div><button class="btn sec" data-ub="${esc(u.id)}" style="padding:6px 12px">Unblock</button></div>`).join(''):'<p style="color:var(--sub)">You have not blocked anyone.</p>'}<div class="acts"><button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal});
 $('#modal').onclick=e=>{const b=e.target.closest('[data-ub]');if(b)emit('user:block',{user:b.dataset.ub,on:false},d=>{me.blocked=d.blocked;users[me.id]=me;blockedModal()})};
}
// ---------- app lock (PIN) ----------
const pinHash=async p=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mk:'+p)))].map(b=>b.toString(16).padStart(2,'0')).join('');
let lastHidden=0;
function showLock(){if(!store.get('mk_pin')||!token)return;$('#lock').classList.remove('hidden');$('#lockPin').value='';$('#lockErr').textContent='';setTimeout(()=>$('#lockPin').focus(),50)}
async function tryUnlock(){if(await pinHash($('#lockPin').value)===store.get('mk_pin')){$('#lock').classList.add('hidden')}else{$('#lockErr').textContent='Wrong PIN';$('#lockPin').value=''}}
$('#lockGo').onclick=tryUnlock;$('#lockPin').addEventListener('keydown',e=>{if(e.key==='Enter')tryUnlock()});
$('#lockOut').onclick=()=>{if(confirm('Log out? You will need your password to sign in again.'))logout()};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')lastHidden=Date.now();else if(store.get('mk_pin')&&Date.now()-lastHidden>30000)showLock()});
function appLockModal(){
 const on=!!store.get('mk_pin');
 modal(`<h3>App lock</h3><p style="color:var(--sub);font-size:13px">${on?'Enter your current PIN to change or turn it off.':'Choose a 4 to 8 digit PIN. MK Messages will ask for it when you come back after 30 seconds away.'}</p>
 ${on?'<label class="l">Current PIN</label><input type="password" id="pnOld" inputmode="numeric" maxlength="8">':''}
 <label class="l">${on?'New PIN (leave empty to turn off)':'New PIN'}</label><input type="password" id="pnNew" inputmode="numeric" maxlength="8">
 ${on?'':'<label class="l">Repeat PIN</label><input type="password" id="pnNew2" inputmode="numeric" maxlength="8">'}
 <div class="err" id="mErr"></div><div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="pnGo">Save</button></div>`);
 bindModal({mCancel:closeModal,pnGo:async()=>{
  const n=$('#pnNew').value;
  if(on){if(await pinHash($('#pnOld').value)!==store.get('mk_pin')){$('#mErr').textContent='Current PIN is wrong';return}
   if(!n){store.del('mk_pin');toast('App lock is off');closeModal();return}}
  if(!/^\d{4,8}$/.test(n)){$('#mErr').textContent='Use 4 to 8 digits';return}
  if(!on&&n!==$('#pnNew2').value){$('#mErr').textContent='The PINs do not match';return}
  store.set('mk_pin',await pinHash(n));toast('App lock is on');closeModal();
 }});
}
// ---------- admin dashboard ----------
function adminModal(){
 modal(`<h3>Admin dashboard</h3><div id="admBody">Loading…</div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);bindModal({mCancel:closeModal});
 const load=()=>emit('admin:stats',{},d=>{
  if(!d||d.error){$('#admBody').textContent=(d&&d.error)||'Could not load';return}
  const mb=n=>(n/1048576).toFixed(1)+' MB';
  $('#admBody').innerHTML=`<div class="stats">${[['Users',d.users],['Groups',d.groups],['Direct chats',d.dms],['Messages',d.messages],['Online now',d.online],['Files',d.files],['Storage',mb(d.bytes)],['Alert devices',d.pushDevices]].map(([k,v])=>`<div><b>${v}</b><small>${k}</small></div>`).join('')}</div>
  <h4>Backups</h4><p style="color:var(--sub);font-size:13px;margin:0 0 6px">${d.backupsOn?'A copy of all accounts, groups and messages is saved automatically every day and kept for 30 days. Files and photos are not included.':'Backup storage is not connected.'}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bkNow">Back up now</button><button class="btn sec" id="bkDl">Download full backup</button></div>
  ${d.backups.map(b=>`<div class="mem"><div class="grow">${esc(b.name.slice(5))}<br><small style="color:var(--sub)">${b.size?Math.round(b.size/1024)+' KB':''}</small></div><button class="btn sec" data-snap="${esc(b.name)}" style="padding:6px 12px">${ic('download',16)}</button></div>`).join('')}
  <h4>Call relay</h4><p style="color:var(--sub);font-size:13px;margin:0">${d.relayOn?'On. Calls can connect even on strict networks.':'Off. Calls connect directly, which fails on some mobile and office networks. Add TURN_KEY_ID and TURN_KEY_API_TOKEN to the backend to turn it on.'}</p>
  <h4>Reports (${d.reports.length})</h4>${d.reports.length?d.reports.map(r=>`<div class="mem" style="align-items:flex-start"><div class="grow"><b>${esc(r.userName||'?')}</b> reported by ${esc(r.fromName||'?')}<br><span style="color:var(--sub)">${esc(r.reason||'No reason given')}</span>${r.recent.length?`<br><small style="color:var(--sub)">Recent: ${esc(r.recent.slice(-2).join(' / '))}</small>`:''}</div><button class="btn ${r.banned?'sec':'danger'}" data-ban="${esc(r.user)}|${r.banned?0:1}" style="padding:6px 10px">${r.banned?'Unban':'Ban'}</button><button class="btn sec" data-dis="${esc(r.id)}" style="padding:6px 10px">Dismiss</button></div>`).join(''):'<p style="color:var(--sub);font-size:13px">No reports.</p>'}
  <h4>People (${d.people.length})</h4>${d.people.slice(0,60).map(p=>`<div class="mem"><div class="grow">${esc(p.name)}${p.admin?' <small style="color:var(--accent)">admin</small>':''}${p.banned?' <small style="color:var(--danger)">banned</small>':''}<br><small style="color:var(--sub)">${p.phone?'+'+esc(p.phone)+' · ':''}${p.lastSeen?fmtDay(p.lastSeen):''}</small></div>${p.admin?'':`<button class="btn sec" data-ban="${esc(p.id)}|${p.banned?0:1}" style="padding:6px 10px">${p.banned?'Unban':'Ban'}</button>`}</div>`).join('')}`;
  $('#bkNow').onclick=()=>emit('admin:snapshot',{},r=>{toast(r&&r.error||'Backup saved');load()});
  $('#bkDl').onclick=()=>authDownload('/api/admin/backup','mk-messages-backup-'+new Date().toISOString().slice(0,10)+'.json');
 });
 load();
 $('#modal').onclick=e=>{
  const s=e.target.closest('[data-snap]'),b=e.target.closest('[data-ban]'),x=e.target.closest('[data-dis]');
  if(s)authDownload('/api/admin/backup?snap='+encodeURIComponent(s.dataset.snap),'mk-messages-'+s.dataset.snap.slice(5)+'.json.gz');
  if(b){const [u,on]=b.dataset.ban.split('|');if(on!=='1'||confirm('Ban this person? They will be logged out and cannot sign in.'))emit('admin:ban',{user:u,on:on==='1'},r=>{toast(r&&r.error||'Done');load()})}
  if(x)emit('admin:dismiss',{id:x.dataset.dis},()=>load());
 };
}

// ---------- alerts (Web Push) + install ----------
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const b64uToBytes=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
async function enablePush(){
 if(!pushSupported()){toast('This browser cannot show alerts. On iPhone, add MK Messages to your Home Screen first.',6000);return false}
 const perm=await Notification.requestPermission();
 if(perm!=='granted'){toast('Alerts are blocked. Allow notifications for this site in your browser settings.',6000);return false}
 return pushSync(true);
}
async function pushSync(force){
 if(!pushSupported()||Notification.permission!=='granted')return false;
 try{
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){const k=await (await fetch(API+'/api/push/key')).json();sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(k.key)})}
  emit('push:subscribe',{sub:sub.toJSON()},d=>{if(d&&d.error&&force)toast(d.error)});
  if(force)toast('Alerts are on');
  return true;
 }catch(e){if(force)toast('Could not turn on alerts: '+(e.message||'unknown error'),6000);return false}
}
$('#alertOn').onclick=async()=>{if(await enablePush())$('#alertBanner').classList.add('hidden')};
$('#alertX').onclick=()=>{store.set('mk_alert_dismiss','1');$('#alertBanner').classList.add('hidden')};
let installEv=null;
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEv=e});
addEventListener('appinstalled',()=>{installEv=null;toast('MK Messages installed')});
