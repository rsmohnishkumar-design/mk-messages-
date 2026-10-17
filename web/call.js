// ---------- voice / video calls (WebRTC; signaling over the chat socket) ----------
const ICE={iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}]};
let ringT=null,ringChat=null,ringOff=null,callTimer=null,iceCfg=null;
// ICE servers: STUN always, plus the call relay (TURN) when the backend has one, so calls connect on strict networks
async function getIce(){
 if(iceCfg&&iceCfg.exp>Date.now())return iceCfg.v;
 try{const r=await fetch(API+'/api/ice',{headers:{Authorization:'Bearer '+token}}),d=await r.json();if(Array.isArray(d.iceServers)){iceCfg={v:{iceServers:d.iceServers},exp:Date.now()+30*60e3};return iceCfg.v}}catch{}
 return ICE;
}
function renderBanner(){
 const b=$('#callBanner'),st=cur&&callState[cur];
 if(!st||call){b.classList.add('hidden');return}
 b.classList.remove('hidden');
 b.innerHTML=`<span>${st.video?'Video':'Voice'} call in progress, ${st.users.length} in the call</span><button id="bannerJoin">Join</button>`;
 $('#bannerJoin').onclick=()=>joinCall(cur,st.video);
}
// A generated two-tone ringtone played through an <audio> element that is unlocked by the
// first tap anywhere, so it can ring later without a fresh user gesture.
let ringAudio=null,ringVib=null;
function ringtoneUrl(){
 const sr=16000,n=sr*3,pcm=new Int16Array(n);
 for(let i=0;i<n;i++){const t=i/sr,on=t<0.45||(t>=0.65&&t<1.1);
  if(on){const ph=t<0.65?t:t-0.65,env=Math.min(1,ph*40,(0.45-Math.min(ph,0.45))*40+0.2);pcm[i]=Math.round((Math.sin(2*Math.PI*440*t)+Math.sin(2*Math.PI*480*t))*0.22*32767*Math.min(1,env))}}
 const b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
 new Int16Array(b,44).set(pcm);return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
}
function ringUnlock(){
 if(ringAudio)return;
 ringAudio=new Audio(ringtoneUrl());ringAudio.loop=true;ringAudio.muted=true;
 ringAudio.play().then(()=>{ringAudio.pause();ringAudio.currentTime=0;ringAudio.muted=false}).catch(()=>{ringAudio.muted=false});
}
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,ringUnlock,{once:true,capture:true}));
function startRingSound(){
 if(ringAudio){ringAudio.muted=false;ringAudio.currentTime=0;ringAudio.play().catch(()=>beep())}else beep();
 if(navigator.vibrate){navigator.vibrate([500,300,500]);ringVib=setInterval(()=>navigator.vibrate([500,300,500]),3000)}
}
let ringTitleT=null;
async function ringNotify(chat,from,video){
 try{const reg=await navigator.serviceWorker.getRegistration();if(!reg||Notification.permission!=='granted')return;
  await reg.showNotification('Incoming '+(video?'video':'voice')+' call',{body:((users[from]||{}).name||'Someone')+' is calling',tag:'call-'+chat,renotify:true,requireInteraction:true,vibrate:[500,250,500,250,500],icon:'/icon-192.png',badge:'/icon-192.png',data:{chat,call:true},actions:[{action:'answer',title:'Answer'},{action:'decline',title:'Decline'}]})}catch{}
}
async function ringNotifyClear(chat){try{const reg=await navigator.serviceWorker.getRegistration();if(reg)(await reg.getNotifications({tag:'call-'+chat})).forEach(n=>n.close())}catch{}}
function stopRing(){
 if(ringChat!==null)ringNotifyClear(ringChat);clearInterval(ringTitleT);ringTitleT=null;if(typeof updateBadge==='function')updateBadge();
 clearInterval(ringT);clearInterval(ringVib);clearTimeout(ringOff);ringT=null;ringVib=null;ringChat=null;
 if(ringAudio)try{ringAudio.pause();ringAudio.currentTime=0}catch{}
 if(navigator.vibrate)navigator.vibrate(0);
}
function dismissRing(){if(ringChat!==null){stopRing();closeModal()}}
function ringModal(chat,from,video,quiet){
 if(call)return;
 if(ringChat!==null&&$('#rYes'))return;  // already ringing
 stopRing();
 const c=chatById(chat),u=users[from]||{name:'Someone'};
 ringChat=chat;if(!quiet){startRingSound();ringTitleT=setInterval(()=>{document.title=document.title.startsWith('Incoming')?'MK Messages':'Incoming call...'},900);if(document.visibilityState==='hidden')ringNotify(chat,from,video)}
 modal(`<h3>Incoming ${video?'video':'voice'} call</h3><p style="font-size:17px"><b>${esc(u.name)}</b> is calling${c&&c.type==='group'?' in <b>'+esc(c.name)+'</b>':''}.</p><div class="acts"><button class="btn danger" id="rNo">Decline</button><button class="btn" id="rYes">Accept</button></div>`);
 ringOff=setTimeout(()=>{if(ringChat===chat){stopRing();closeModal()}},45000);
 bindModal({rNo:()=>{stopRing();closeModal()},rYes:()=>{stopRing();closeModal();openChat(chat,true);joinCall(chat,video)}});
}
async function joinCall(chat,video){
 if(call){toast('You are already in a call');return}
 if(!navigator.mediaDevices||!window.RTCPeerConnection){toast('Calls are not supported in this browser');return}
 let local;
 try{local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:video?{facingMode:'user'}:false})}
 catch{toast(video?'Allow camera and microphone to start a video call':'Allow the microphone to start a call');return}
 call={chat,video,local,peers:{},muted:false,camOff:false,facing:'user',t0:Date.now(),ice:await getIce(),minimized:false,nav:false};
 store.set('mk_call',JSON.stringify({chat,video,t:Date.now()}));
 showCallUI();callExtras();
 emit('call:join',{chat,video},d=>{
  if(!d||d.error){toast(d&&d.error||'Could not join the call');endCallLocal();return}
  call.video=d.call.video;d.call.users.forEach(u=>makePeer(u,true));renderTiles();
  if(d.unreachable&&d.unreachable.length)toast(d.unreachable.join(', ')+(d.unreachable.length>1?' are':' is')+' offline and '+(d.unreachable.length>1?'have':'has')+' not turned on call alerts, so they may not hear this call.',8000);
 });
}
function makePeer(uid,initiator){
 if(call.peers[uid])return call.peers[uid];
 const pc=new RTCPeerConnection(call.ice||ICE),peer={pc,stream:new MediaStream(),pending:[],cam:true,mic:true};
 call.peers[uid]=peer;
 call.local.getTracks().forEach(t=>pc.addTrack(t,call.local));
 pc.ontrack=e=>{if(e.streams[0])peer.stream=e.streams[0];else peer.stream.addTrack(e.track);renderTiles()};
 pc.onicecandidate=e=>{if(e.candidate)emit('call:signal',{chat:call.chat,to:uid,data:{candidate:e.candidate}})};
 pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')toast('Could not connect to '+((users[uid]||{}).name||'a participant')+'. Their network may block direct calls.')};
 if(initiator)pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>emit('call:signal',{chat:call.chat,to:uid,data:{sdp:pc.localDescription}})).catch(()=>{});
 setTimeout(()=>{if(call&&call.peers[uid]===peer)sendState(uid)},1200);
 renderTiles();return peer;
}
function sendState(to){
 const data={state:{cam:!call.camOff&&call.video,mic:!call.muted}};
 if(to)emit('call:signal',{chat:call.chat,to,data});else Object.keys(call.peers).forEach(u=>emit('call:signal',{chat:call.chat,to:u,data}));
}
async function onSignal({chat,from,data}){
 if(!call||call.chat!==chat)return;
 if(data.state){const p=call.peers[from];if(p){p.cam=!!data.state.cam;p.mic=!!data.state.mic;renderTiles()}return}
 const peer=makePeer(from,false),pc=peer.pc;
 try{
  if(data.sdp){
   await pc.setRemoteDescription(data.sdp);
   peer.pending.splice(0).forEach(c=>pc.addIceCandidate(c).catch(()=>{}));
   if(data.sdp.type==='offer'){const a=await pc.createAnswer();await pc.setLocalDescription(a);emit('call:signal',{chat,to:from,data:{sdp:pc.localDescription}})}
  }else if(data.candidate){
   if(pc.remoteDescription)await pc.addIceCandidate(data.candidate);else peer.pending.push(data.candidate);
  }
 }catch{}
}
function dropPeer(uid){const p=call&&call.peers[uid];if(!p)return;try{p.pc.close()}catch{}delete call.peers[uid];renderTiles()}
function showCallUI(){
 const c=chatById(call.chat);
 $('#call').classList.remove('hidden');$('#callPill').classList.add('hidden');call.minimized=false;if(!call.nav){call.nav=true;navPush('call',()=>minimizeCall(true))}
 $('#callTitle').textContent=(call.video?'Video call · ':'Voice call · ')+(c?title(c):'');
 $('#tiles').innerHTML='';
 $('#cCam').classList.toggle('hidden',!call.video);$('#cFlip').classList.toggle('hidden',!call.video);
 setIcon($('#cMic'),call.muted?'mic-off':'mic',24);setIcon($('#cCam'),call.camOff?'video-off':'video',24);$('#cMic').classList.toggle('off',call.muted);$('#cCam').classList.toggle('off',call.camOff);
 clearInterval(callTimer);callTimer=setInterval(()=>{if(!call)return;const s=Math.floor((Date.now()-call.t0)/1000),t=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');$('#callTime').textContent=t;$('#pillT').textContent=t},1000);
 renderTiles();renderBanner();
}
function renderTiles(){
 if(!call)return;
 const wrap=$('#tiles'),want=[me.id,...Object.keys(call.peers)];
 [...wrap.children].forEach(el=>{if(!want.includes(el.dataset.uid))el.remove()});
 want.forEach(uid=>{
  let el=wrap.querySelector(`[data-uid="${uid}"]`);
  const local=uid===me.id,u=users[uid]||{name:'…'};
  if(!el){
   el=document.createElement('div');el.className='tile';el.dataset.uid=uid;
   el.innerHTML='<video autoplay playsinline></video><div class="noV"></div><div class="nm"></div>';
   wrap.appendChild(el);
  }
  const v=el.querySelector('video'),stream=local?call.local:call.peers[uid].stream;
  if(v.srcObject!==stream){v.srcObject=stream;v.muted=local;v.play&&v.play().catch(()=>{})}
  const hasV=stream.getVideoTracks().length>0&&(local?!call.camOff:call.peers[uid].cam!==false);
  el.classList.toggle('mirror',local&&call.facing==='user');
  const nv=el.querySelector('.noV');nv.style.display=hasV?'none':'flex';nv.innerHTML=avHtml(u.name,u.avatar,false,'lg');
  const muted=local?call.muted:call.peers[uid].mic===false;
  el.querySelector('.nm').innerHTML=esc(local?'You':u.name)+(muted?ic('mic-off',14):'');
 });
 const n=want.length;$('#tiles').style.gridTemplateColumns=n<=1?'1fr':`repeat(auto-fit,minmax(min(100%,${n>4?'200px':'260px'}),1fr))`;
}
$('#cMic').onclick=()=>{if(!call)return;call.muted=!call.muted;call.local.getAudioTracks().forEach(t=>t.enabled=!call.muted);setIcon($('#cMic'),call.muted?'mic-off':'mic',24);$('#cMic').classList.toggle('off',call.muted);sendState();renderTiles()};
$('#cCam').onclick=()=>{if(!call)return;call.camOff=!call.camOff;call.local.getVideoTracks().forEach(t=>t.enabled=!call.camOff);setIcon($('#cCam'),call.camOff?'video-off':'video',24);$('#cCam').classList.toggle('off',call.camOff);sendState();renderTiles()};
$('#cFlip').onclick=async()=>{
 if(!call||!call.video)return;
 const facing=call.facing==='user'?'environment':'user';
 try{
  const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false});
  const nt=s.getVideoTracks()[0],old=call.local.getVideoTracks()[0];
  Object.values(call.peers).forEach(p=>{const snd=p.pc.getSenders().find(x=>x.track&&x.track.kind==='video');if(snd)snd.replaceTrack(nt)});
  if(old){call.local.removeTrack(old);old.stop()}call.local.addTrack(nt);nt.enabled=!call.camOff;call.facing=facing;
  const v=$('#tiles').querySelector(`[data-uid="${me.id}"] video`);if(v){v.srcObject=null;v.srcObject=call.local}renderTiles();
 }catch{toast('Could not switch camera')}
};
function endCallLocal(){
 if(!call)return;
 if(call.nav){call.nav=false;navDone('call')}
 callExtrasStop();store.del('mk_call');$('#callPill').classList.add('hidden');
 Object.values(call.peers).forEach(p=>{try{p.pc.close()}catch{}});
 call.local.getTracks().forEach(t=>t.stop());
 clearInterval(callTimer);call=null;$('#call').classList.add('hidden');$('#tiles').innerHTML='';renderBanner();
}
$('#cEnd').onclick=()=>{if(!call)return;const chat=call.chat;endCallLocal();emit('call:leave',{chat},()=>{})};
$('#btnCallA').onclick=()=>cur&&joinCall(cur,false);
$('#btnCallV').onclick=()=>cur&&joinCall(cur,true);

// ---------- keep the call usable when you leave the screen ----------
function minimizeCall(fromNav){
 if(!call||call.minimized)return;
 if(fromNav!==true&&call.nav){call.nav=false;navDone('call')}else call.nav=false;
 call.minimized=true;$('#call').classList.add('hidden');$('#pillName').textContent=(chatById(call.chat)?title(chatById(call.chat)):'In call');$('#callPill').classList.remove('hidden');
}
function restoreCall(){if(!call)return;showCallUI()}
$('#cMin').onclick=()=>minimizeCall();
$('#callPill').onclick=restoreCall;
// Picture-in-picture: the other person's video keeps floating over other apps
async function togglePip(){
 const vids=[...$('#tiles').querySelectorAll('video')];
 const v=vids.find(x=>x.closest('.tile').dataset.uid!==me.id&&x.videoWidth>0)||vids.find(x=>x.videoWidth>0);
 if(!v){toast('No video to pop out yet');return}
 try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else await v.requestPictureInPicture()}catch{toast('Picture-in-picture is not available in this browser')}
}
$('#cPip').onclick=togglePip;
// Share your screen (computers)
async function stopShare(){
 if(!call||!call.sharing)return;
 const cur=call.local.getVideoTracks()[0];if(cur){cur.stop();call.local.removeTrack(cur)}
 const back=call.camTrack&&call.camTrack.readyState==='live'?call.camTrack:null;
 if(back){call.local.addTrack(back);Object.values(call.peers).forEach(p=>{const snd=p.pc.getSenders().find(x=>x.track&&x.track.kind==='video');if(snd)snd.replaceTrack(back)})}
 call.sharing=false;call.facing='user';$('#cShare').classList.remove('off');renderTiles();
}
$('#cShare').onclick=async()=>{
 if(!call||!call.video)return;
 if(call.sharing){stopShare();return}
 try{
  const s=await navigator.mediaDevices.getDisplayMedia({video:true}),t=s.getVideoTracks()[0],old=call.local.getVideoTracks()[0];
  call.camTrack=old;Object.values(call.peers).forEach(p=>{const snd=p.pc.getSenders().find(x=>x.track&&x.track.kind==='video');if(snd)snd.replaceTrack(t)});
  if(old)call.local.removeTrack(old);call.local.addTrack(t);call.sharing=true;call.facing='screen';t.onended=stopShare;$('#cShare').classList.add('off');renderTiles();
 }catch{toast('Screen sharing was cancelled')}
};
// screen stays on, lock-screen controls, "call in progress" notification, auto picture-in-picture
async function wlAcquire(){try{if(navigator.wakeLock&&call){call.wl=await navigator.wakeLock.request('screen')}}catch{}}
async function ongoingNotify(){
 try{const reg=await navigator.serviceWorker.getRegistration();if(!reg||Notification.permission!=='granted'||!call)return;
  await reg.showNotification('Call in progress',{body:(chatById(call.chat)?title(chatById(call.chat)):'MK Messages')+'. Tap to return.',tag:'ongoing-call',requireInteraction:true,silent:true,icon:'/icon-192.png',badge:'/icon-192.png',data:{chat:call.chat,ongoing:true},actions:[{action:'return',title:'Return to call'},{action:'hangup',title:'Hang up'}]})}catch{}
}
async function ongoingClear(){try{const reg=await navigator.serviceWorker.getRegistration();if(reg)(await reg.getNotifications({tag:'ongoing-call'})).forEach(n=>n.close())}catch{}}
function callExtras(){
 wlAcquire();
 $('#cPip').classList.toggle('hidden',!(call.video&&document.pictureInPictureEnabled));
 $('#cShare').classList.toggle('hidden',!(call.video&&navigator.mediaDevices.getDisplayMedia&&!matchMedia('(pointer:coarse)').matches));
 try{if('mediaSession' in navigator){
  const c=chatById(call.chat);navigator.mediaSession.metadata=new MediaMetadata({title:'MK Messages call',artist:c?title(c):'',artwork:[{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]});
  const h=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch{}};
  h('hangup',()=>$('#cEnd').click());h('togglemicrophone',()=>$('#cMic').click());h('togglecamera',()=>$('#cCam').click());h('enterpictureinpicture',()=>{if(call&&call.video)togglePip()});
 }}catch{}
}
function callExtrasStop(){
 try{if(call&&call.wl)call.wl.release()}catch{}
 ongoingClear();
 try{if(document.pictureInPictureElement)document.exitPictureInPicture()}catch{}
 try{if('mediaSession' in navigator){navigator.mediaSession.metadata=null;['hangup','togglemicrophone','togglecamera','enterpictureinpicture'].forEach(a=>{try{navigator.mediaSession.setActionHandler(a,null)}catch{}})}}catch{}
}
document.addEventListener('visibilitychange',()=>{
 if(!call)return;
 if(document.visibilityState==='visible'){wlAcquire();ongoingClear()}else ongoingNotify();
});
// ---------- come back to a call after the connection dropped or the page was reloaded ----------
async function resumeCall(){
 if(!call)return;
 toast('Reconnecting to the call…',3000);
 Object.keys(call.peers).forEach(u=>{try{call.peers[u].pc.close()}catch{}delete call.peers[u]});
 if(call.local.getTracks().some(t=>t.readyState==='ended')){
  try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:call.video&&!call.sharing?{facingMode:call.facing==='environment'?'environment':'user'}:false});
   call.local.getTracks().forEach(t=>t.stop());call.local=s;call.muted=false;call.camOff=false;setIcon($('#cMic'),'mic',24);$('#cMic').classList.remove('off');setIcon($('#cCam'),'video',24);$('#cCam').classList.remove('off')}catch{toast('Could not use the camera or microphone again');endCallLocal();return}
 }
 renderTiles();
 emit('call:join',{chat:call.chat,video:call.video},d=>{
  if(!d||d.error){toast('The call has ended');endCallLocal();return}
  d.call.users.forEach(u=>makePeer(u,true));renderTiles();
 });
}
function callRecover(){
 let sv=null;try{sv=JSON.parse(store.get('mk_call')||'null')}catch{}
 if(!sv)return;store.del('mk_call');
 if(call||Date.now()-sv.t>3*3600e3||!callState[sv.chat]||!chatById(sv.chat))return;
 const c=chatById(sv.chat);
 modal(`<h3>You were in a call</h3><p>The ${sv.video?'video':'voice'} call in <b>${esc(title(c))}</b> is still going.</p><div class="acts"><button class="btn sec" id="mCancel">Not now</button><button class="btn" id="rcGo">Return to the call</button></div>`);
 bindModal({mCancel:closeModal,rcGo:()=>{closeModal();openChat(sv.chat,true);joinCall(sv.chat,sv.video)}});
}
