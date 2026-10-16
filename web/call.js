// ---------- voice / video calls (WebRTC; signaling over the chat socket) ----------
const ICE={iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}]};
let ringT=null,ringChat=null,ringOff=null,callTimer=null;
function renderBanner(){
 const b=$('#callBanner'),st=cur&&callState[cur];
 if(!st||call){b.classList.add('hidden');return}
 b.classList.remove('hidden');
 b.innerHTML=`<span>${st.video?'Video':'Voice'} call in progress, ${st.users.length} in the call</span><button id="bannerJoin">Join</button>`;
 $('#bannerJoin').onclick=()=>joinCall(cur,st.video);
}
function stopRing(){clearInterval(ringT);clearTimeout(ringOff);ringT=null;ringChat=null}
function dismissRing(){if(ringChat!==null){stopRing();closeModal()}}
function ringModal(chat,from,video,quiet){
 if(call||ringChat!==null)return;
 const c=chatById(chat),u=users[from]||{name:'Someone'};
 ringChat=chat;if(!quiet){beep();ringT=setInterval(beep,1400)}
 modal(`<h3>Incoming ${video?'video':'voice'} call</h3><p><b>${esc(u.name)}</b> is calling${c&&c.type==='group'?' in <b>'+esc(c.name)+'</b>':''}.</p><div class="acts"><button class="btn danger" id="rNo">Decline</button><button class="btn" id="rYes">Accept</button></div>`);
 ringOff=setTimeout(()=>{if(ringChat===chat){stopRing();closeModal()}},45000);
 bindModal({rNo:()=>{stopRing();closeModal()},rYes:()=>{stopRing();closeModal();openChat(chat,true);joinCall(chat,video)}});
}
async function joinCall(chat,video){
 if(call){toast('You are already in a call');return}
 if(!navigator.mediaDevices||!window.RTCPeerConnection){toast('Calls are not supported in this browser');return}
 let local;
 try{local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:video?{facingMode:'user'}:false})}
 catch{toast(video?'Allow camera and microphone to start a video call':'Allow the microphone to start a call');return}
 call={chat,video,local,peers:{},muted:false,camOff:false,facing:'user',t0:Date.now()};
 showCallUI();
 emit('call:join',{chat,video},d=>{
  if(!d||d.error){toast(d&&d.error||'Could not join the call');endCallLocal();return}
  call.video=d.call.video;d.call.users.forEach(u=>makePeer(u,true));renderTiles();
 });
}
function makePeer(uid,initiator){
 if(call.peers[uid])return call.peers[uid];
 const pc=new RTCPeerConnection(ICE),peer={pc,stream:new MediaStream(),pending:[],cam:true,mic:true};
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
 $('#call').classList.remove('hidden');
 $('#callTitle').textContent=(call.video?'Video call · ':'Voice call · ')+(c?title(c):'');
 $('#tiles').innerHTML='';
 $('#cCam').classList.toggle('hidden',!call.video);$('#cFlip').classList.toggle('hidden',!call.video);
 setIcon($('#cMic'),'mic',24);setIcon($('#cCam'),'video',24);$('#cMic').classList.remove('off');$('#cCam').classList.remove('off');
 clearInterval(callTimer);callTimer=setInterval(()=>{if(!call)return;const s=Math.floor((Date.now()-call.t0)/1000);$('#callTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},1000);
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
 Object.values(call.peers).forEach(p=>{try{p.pc.close()}catch{}});
 call.local.getTracks().forEach(t=>t.stop());
 clearInterval(callTimer);call=null;$('#call').classList.add('hidden');$('#tiles').innerHTML='';renderBanner();
}
$('#cEnd').onclick=()=>{if(!call)return;const chat=call.chat;endCallLocal();emit('call:leave',{chat},()=>{})};
$('#btnCallA').onclick=()=>cur&&joinCall(cur,false);
$('#btnCallV').onclick=()=>cur&&joinCall(cur,true);
