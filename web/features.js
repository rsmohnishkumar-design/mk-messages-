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
async function sendFile(blob,name,type){
 if(!cur)return;
 if(blob.size>100*1024*1024){toast('File too large (max 100 MB)');return}
 const chat=cur;
 const f=await uploadFile(blob,name,type,p=>toast('Uploading '+p+'%',60000));
 if(f.error){toast(f.error);return}
 emit('message:send',{chat,text:'',file:f,replyTo:reply&&reply.id},d=>{if(d&&d.error)toast(d.error)});
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
 sendFile(f,f.name,f.type||'application/octet-stream');
};
$('#btnAttach').onclick=e=>{
 const el=popMenu(`<button data-a="media">${row('image','Photo or video')}</button><button data-a="cam">${row('camera','Take a photo')}</button><button data-a="vid">${row('video','Record a video')}</button><button data-a="file">${row('file','Document or file')}</button><hr><button data-a="sched">${row('clock','Schedule a message')}</button><button data-a="ar">${row('pin','AR note')}</button>`,Object.assign(e.currentTarget.getBoundingClientRect().toJSON(),{up:true}));
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();
  ({media:()=>pickFile('image/*,video/*'),cam:()=>pickFile('image/*','environment'),vid:()=>pickFile('video/*','environment'),file:()=>pickFile('*/*'),sched:scheduleModal,ar:openAR})[b.dataset.a]()};
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
 mr.ondataavailable=e=>{if(e.data&&e.data.size)rec.chunks.push(e.data)};
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
 const el=popMenu(`<button data-a="grp">${row('users','Create or join a group')}</button><button data-a="inv">${row('user-plus','Invite member')}</button><button data-a="ivs">${row('bell','Invitations')}${n?`<span class="cnt">${n}</span>`:''}</button><hr><button data-a="set">${row('gear','Settings')}</button>`,e.currentTarget.getBoundingClientRect());
 el.dataset.menu=1;
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();({grp:groupModal,inv:()=>inviteModal(),ivs:invitationsModal,set:settingsModal})[b.dataset.a]()};
};
$('#btnMore').onclick=e=>{
 const c=chatById(cur);if(!c)return;
 const el=popMenu(`<button data-a="info">${row('info',c.type==='group'?'Group info':'Contact info')}</button>${c.type==='group'?`<button data-a="invite">${row('user-plus','Invite member')}</button>`:''}<button data-a="pin">${row('pinned',c.pinned?'Unpin chat':'Pin chat')}</button><button data-a="mute">${row('muted',c.muted?'Unmute':'Mute')}</button><button data-a="ar">${row('pin','AR notes')}</button><button data-a="sched">${row('clock','Scheduled messages')}</button><hr><button data-a="clear">${row('trash','Clear chat')}</button>`,e.currentTarget.getBoundingClientRect());
 el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closeMenu();
  if(b.dataset.a==='info')infoModal();
  if(b.dataset.a==='invite')inviteModal(c.id);
  if(b.dataset.a==='pin')emit('chat:pref',{chat:cur,pinned:!c.pinned});
  if(b.dataset.a==='mute')emit('chat:pref',{chat:cur,muted:!c.muted});
  if(b.dataset.a==='ar')openAR();
  if(b.dataset.a==='sched')scheduleModal();
  if(b.dataset.a==='clear'&&confirm('Clear all messages for you?')){emit('chat:clear',{chat:cur});msgs[cur]=[];renderMsgs()}};
};

// ---------- group: create or join ----------
function groupModal(){
 modal(`<h3>Join a group</h3><input type="text" id="gNum" inputmode="numeric" maxlength="6" placeholder="6-digit group code"><div class="err" id="mErr"></div>
 <div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="gJoin">Join</button></div>
 <hr><h3>Create a group</h3><p style="color:var(--sub);font-size:13px;margin:0 0 8px">You become the admin of any group you create.</p>
 <input type="text" id="gName" placeholder="Group name" maxlength="40" style="margin-bottom:8px"><input type="text" id="gDesc" placeholder="Description (optional)" maxlength="200">
 <label class="l" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="gOnly" style="width:auto"> Only I (admin) can post</label>
 <div class="acts"><button class="btn" id="gCreate">Create group</button></div>`);
 const join=()=>emit('group:join',{number:$('#gNum').value},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();openChat(d.chat.id)});
 $('#gNum').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();join()}});
 bindModal({mCancel:closeModal,gJoin:join,gCreate:()=>emit('group:create',{name:$('#gName').value,description:$('#gDesc').value,onlyAdminPosts:$('#gOnly').checked},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();openChat(d.chat.id);toast('Group code: '+d.chat.number,6000)})});
}
function joinPrompt(code){
 modal(`<h3>Join this group?</h3><p>Someone shared the group code <b>${esc(code)}</b> with you.</p><div class="err" id="mErr"></div><div class="acts"><button class="btn sec" id="mCancel">Not now</button><button class="btn" id="jGo">Join group</button></div>`);
 bindModal({mCancel:closeModal,jGo:()=>emit('group:join',{number:code},d=>{if(d.error){$('#mErr').textContent=d.error;return}closeModal();openChat(d.chat.id)})});
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
  if(a)emit('invite:accept',{id:a.dataset.ac},r=>{invites=invites.filter(i=>i.id!==a.dataset.ac);if(r.error){toast(r.error);draw();return}closeModal();openChat(r.chat.id)});
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
 if(c.type==='dm'){const u=other(c);modal(`<h3>${esc(u.name)}</h3><p style="color:var(--sub)">${esc(u.phone?'+'+u.phone:'')}${u.phone?' · ':''}${esc(lastSeen(u))}</p><p>${esc(u.about||'')}</p><div class="acts"><button class="btn sec" id="mCancel">Close</button></div>`);bindModal({mCancel:closeModal});return}
 const manage=c.admin===me.id;
 modal(`<h3>${esc(c.name)}</h3><p style="color:var(--sub)">${esc(c.description||'')}</p>
 <div style="text-align:center;color:var(--sub);font-size:13px">Group code. Share it so others can join.</div><div class="num">${esc(c.number)}</div>
 <div style="text-align:center"><button class="link" id="gCopy">Copy code</button>${manage?' · <button class="link" id="gRegen">New code</button>':''} · <button class="link" id="gInv">Invite member</button></div>
 <h4>${c.members.length} members, ${c.members.filter(id=>(users[id]||{}).online).length} online</h4>
 ${c.members.map(id=>{const u=users[id]||{name:'Unknown'};return `<div class="mem"${id!==me.id?` data-dm="${esc(id)}" style="cursor:pointer"`:''}>${avHtml(u.name,u.avatar,u.online,'sm')}<div class="grow">${esc(u.name)}${id===me.id?' (you)':''}${id===c.admin?' <small style="color:var(--accent)">group admin</small>':''}<br><small style="color:var(--sub)">${esc(lastSeen(u))}</small></div>${manage&&id!==c.admin?`<button class="link" data-rm="${esc(id)}">Remove</button>`:''}</div>`}).join('')}
 ${manage?`<label class="l" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="gOnly" style="width:auto" ${c.onlyAdminPosts?'checked':''}> Only admin can post</label>`:''}
 <div class="acts"><button class="btn sec" id="gLeave">Leave</button>${manage?'<button class="btn danger" id="gDel">Delete group</button>':''}<button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal,
  gCopy:()=>{navigator.clipboard&&navigator.clipboard.writeText(c.number).then(()=>toast('Code copied'))},
  gInv:()=>inviteModal(c.id),
  gRegen:()=>{if(confirm('Generate a new code? The old one stops working.'))emit('group:regenerate',{chat:c.id},()=>closeModal())},
  gLeave:()=>{if(confirm('Leave this group?'))emit('group:leave',{chat:c.id},()=>closeModal())},
  gDel:()=>{if(confirm('Delete this group for everyone?'))emit('group:delete',{chat:c.id},()=>closeModal())}});
 const o=$('#modal #gOnly');if(o)o.onchange=()=>emit('group:update',{chat:c.id,onlyAdminPosts:o.checked});
 $('#modal').onclick=e=>{
  const b=e.target.closest('[data-rm]');
  if(b){if(confirm('Remove this member?'))emit('group:remove',{chat:c.id,user:b.dataset.rm},()=>closeModal());return}
  const m=e.target.closest('[data-dm]');
  if(m){const u=users[m.dataset.dm];if(u)emit('dm:open',{user:u.id},d=>{if(d.chat){closeModal();openChat(d.chat.id)}})}
 };
}
$('#hInfo').onclick=infoModal;

// ---------- settings ----------
function settingsModal(){
 const theme=store.get('mk_theme')||'auto';
 const perm=pushSupported()?Notification.permission:'unsupported';
 const alerts=perm==='granted'?'On. Calls and messages will alert you when the app is closed.':perm==='denied'?'Blocked. Allow notifications for this site in your browser settings.':perm==='unsupported'?'Not supported here. On iPhone, add MK Messages to your Home Screen first.':'Off. Turn on so calls ring when the app is closed.';
 modal(`<h3>Settings</h3>
 <div class="setrow" style="cursor:pointer" id="sProf">${avHtml(me.name,me.avatar)}<div class="grow"><b>${esc(me.name)}</b><small>${esc(me.phone?'+'+me.phone:'Add your mobile number')}</small></div>${ic('chevron',18)}</div>
 <div class="setrow"><div class="grow"><b>Theme</b></div><div class="seg" id="sTheme">${[['light','Light'],['dark','Dark'],['auto','Device']].map(([k,l])=>`<button data-th="${k}" class="${k===theme?'on':''}">${l}</button>`).join('')}</div></div>
 <div class="setrow"><div class="grow"><b>Call and message alerts</b><small>${esc(alerts)}</small></div>${perm==='default'?'<button class="btn" id="sAlert" style="padding:6px 12px">Turn on</button>':perm==='granted'?'<button class="btn sec" id="sAlert" style="padding:6px 12px">Refresh</button>':''}</div>
 ${installEv||(isIOS&&!standalone)?`<div class="setrow"><div class="grow"><b>Install app</b><small>${installEv?'Add MK Messages to your device':'Share, then Add to Home Screen'}</small></div>${installEv?'<button class="btn" id="sInst" style="padding:6px 12px">Install</button>':''}</div>`:''}
 <div class="acts" style="margin-top:18px;justify-content:space-between"><button class="btn sec" id="mCancel">Close</button><button class="btn danger" id="sOut">${row('logout','Log out')}</button></div>`);
 bindModal({mCancel:closeModal,sProf:()=>profileModal(),sOut:()=>{if(confirm('Log out of MK Messages on this device?'))logout()},
  sAlert:async()=>{await enablePush();settingsModal()},
  sInst:async()=>{installEv.prompt();await installEv.userChoice.catch(()=>{});installEv=null;settingsModal()}});
 $('#sTheme').onclick=e=>{const b=e.target.closest('[data-th]');if(!b)return;store.set('mk_theme',b.dataset.th);applyTheme();document.querySelectorAll('#sTheme button').forEach(x=>x.classList.toggle('on',x===b))};
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
