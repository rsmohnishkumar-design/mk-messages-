// ---------- AR notes: sticky notes pinned to a real-world spot ----------
// A note stores the GPS spot where it was left, the compass direction and tilt the phone
// was pointing, and roughly how far away the object was. Group members who stand near
// that spot see it float in their camera view, in the same direction.
const R_E=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI,wrap180=a=>((a%360)+540)%360-180;
function dest(lat,lng,hdg,d){const a=rad(hdg),dl=d/R_E,p1=rad(lat),l1=rad(lng);const p2=Math.asin(Math.sin(p1)*Math.cos(dl)+Math.cos(p1)*Math.sin(dl)*Math.cos(a));const l2=l1+Math.atan2(Math.sin(a)*Math.sin(dl)*Math.cos(p1),Math.cos(dl)-Math.sin(p1)*Math.sin(p2));return{lat:deg(p2),lng:deg(l2)}}
function rel(a,b){const dx=rad(b.lng-a.lng)*Math.cos(rad((a.lat+b.lat)/2))*R_E,dy=rad(b.lat-a.lat)*R_E;return{d:Math.hypot(dx,dy),brg:(deg(Math.atan2(dx,dy))+360)%360}}
function pinTarget(p){const t=dest(p.lat,p.lng,p.heading,p.dist);return{lat:t.lat,lng:t.lng,h:p.dist*Math.tan(rad(p.pitch))}}
function camPose(alpha,beta,gamma){const x=rad(beta),y=rad(gamma),z=rad(alpha),cY=Math.cos(y),sY=Math.sin(y),cZ=Math.cos(z),sZ=Math.sin(z),sX=Math.sin(x),cX=Math.cos(x);const vx=-cZ*sY-sZ*sX*cY,vy=-sZ*sY+cZ*sX*cY,vz=-cX*cY;return{heading:(deg(Math.atan2(vx,vy))+360)%360,pitch:deg(Math.asin(Math.max(-1,Math.min(1,vz))))}}
const AR_HFOV=54;
const NOTE_COLORS={yellow:'#ffe27a',blue:'#9cc9ff',green:'#a8e6b0',pink:'#ffb3c7',orange:'#ffc88a'};
function arProject(p,pose,pos,W,H){
 const t=pinTarget(p),r=rel(pos,t),az=wrap180(r.brg-pose.heading);
 const el=deg(Math.atan2(t.h,Math.max(r.d,0.5))),tanH=Math.tan(rad(AR_HFOV/2)),tanV=tanH*H/W;
 const vfov=deg(2*Math.atan(tanV)),dEl=el-pose.pitch;
 const x=W/2+(W/2)*Math.tan(rad(az))/tanH,y=H/2-(H/2)*Math.tan(rad(dEl))/tanV;
 return{x,y,d:r.d,az,vis:Math.abs(az)<AR_HFOV/2+6&&Math.abs(dEl)<vfov/2+6&&r.d<=60};
}
window.__ar={dest,rel,pinTarget,camPose,arProject};
const arOri=e=>{
 if(!ar||e.alpha==null)return;
 if(e.type==='deviceorientationabsolute')ar.abs=true;else if(ar.abs)return;
 const c=camPose(e.alpha,e.beta,e.gamma);
 const h=e.webkitCompassHeading!=null?e.webkitCompassHeading:c.heading,old=ar.pose;
 ar.pose={heading:old?(old.heading+0.3*wrap180(h-old.heading)+360)%360:h,pitch:old?old.pitch+0.3*(c.pitch-old.pitch):c.pitch};
};
async function openAR(){
 if(!cur||ar)return;
 const c=chatById(cur);
 ar={chat:cur,pos:null,pose:null,pins:[],nodes:{},raf:0,stream:null,watch:null,abs:false};
 $('#ar').classList.remove('hidden');$('#arTitle').textContent='AR notes · '+title(c);
 $('#arStat').textContent='Starting camera, GPS and compass…';
 try{if(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission)await DeviceOrientationEvent.requestPermission()}catch{}
 addEventListener('deviceorientationabsolute',arOri,true);addEventListener('deviceorientation',arOri,true);
 if(navigator.geolocation)ar.watch=navigator.geolocation.watchPosition(p=>{if(ar)ar.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy}},e=>{if(ar)ar.gpsErr=e.code===1?'Allow location access to use AR notes':'GPS unavailable'},{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
 else ar.gpsErr='This device has no GPS';
 try{ar.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const v=$('#arVid');v.srcObject=ar.stream;v.play().catch(()=>{})}catch{ar.noCam=true;toast('Camera not available. You can still read and pin notes.')}
 emit('pin:list',{chat:cur},d=>{if(ar&&d&&d.pins)ar.pins=d.pins});
 arLoop();
}
function closeAR(){
 if(!ar)return;
 cancelAnimationFrame(ar.raf);removeEventListener('deviceorientationabsolute',arOri,true);removeEventListener('deviceorientation',arOri,true);
 if(ar.watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(ar.watch);
 if(ar.stream)ar.stream.getTracks().forEach(t=>t.stop());
 $('#arVid').srcObject=null;$('#arLayer').innerHTML='';$('#ar').classList.add('hidden');ar=null;
}
function arLoop(){
 if(!ar)return;ar.raf=requestAnimationFrame(arLoop);
 const box=$('#ar'),W=box.clientWidth,H=box.clientHeight,layer=$('#arLayer');
 $('#arStat').textContent=[ar.pos?'GPS accuracy '+Math.round(ar.pos.acc)+' m':(ar.gpsErr||'Waiting for GPS…'),ar.pose?'heading '+Math.round(ar.pose.heading)+'°':'compass…'].join(' · ');
 const ids=new Set(ar.pins.map(p=>p.id));
 Object.keys(ar.nodes).forEach(k=>{if(!ids.has(k)){ar.nodes[k].remove();delete ar.nodes[k]}});
 ar.pins.forEach(p=>{
  let n=ar.nodes[p.id];
  if(!n){n=ar.nodes[p.id]=document.createElement('div');n.className='arn';n.style.background=NOTE_COLORS[p.emoji]||NOTE_COLORS.yellow;n.innerHTML=`<b>${esc(p.text)}</b><small></small>`;layer.appendChild(n);n.onclick=()=>arNoteInfo(p)}
  if(!ar.pos||!ar.pose){n.style.display='none';return}
  const q=arProject(p,ar.pose,ar.pos,W,H);
  if(!q.vis){n.style.display='none';return}
  n.style.display='block';
  const s=Math.max(.55,Math.min(1.25,3/Math.max(q.d,2)+.35));
  n.style.transform=`translate(${q.x}px,${q.y}px) translate(-50%,-100%) scale(${s})`;
  n.querySelector('small').textContent=((users[p.from]||{}).name||'Someone')+' · '+(q.d<10?q.d.toFixed(1):Math.round(q.d))+' m away';
 });
}
function arNoteInfo(p){
 const u=users[p.from]||{name:'Someone'},c=chatById(p.chat),can=p.from===me.id||(c&&c.admin===me.id);
 modal(`<h3>AR note</h3><div style="border-left:6px solid ${NOTE_COLORS[p.emoji]||NOTE_COLORS.yellow};padding-left:10px;white-space:pre-wrap">${esc(p.text)}</div><p style="color:var(--sub);font-size:13px">Left by ${esc(u.name)} · ${new Date(p.ts).toLocaleString()}</p>${p.photo?`<img src="${esc(U(p.photo))}" style="width:100%;border-radius:8px" alt="Photo of the spot">`:''}<div class="acts">${can?'<button class="btn danger" id="pDel">Delete</button>':''}<button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal,pDel:()=>emit('pin:delete',{chat:p.chat,id:p.id},d=>{toast(d.error||'Note deleted');closeModal()})});
}
function arPlaceModal(){
 if(!ar)return;
 if(!ar.pos){toast(ar.gpsErr||'Still finding your location. Try again in a moment.');return}
 let color='yellow';
 modal(`<h3>Pin a note here</h3><p style="color:var(--sub);font-size:13px;margin:0 0 8px">Point the circle at the object, then write the note. Only members of <b>${esc(title(chatById(ar.chat)))}</b> will see it.</p>
 <textarea id="pText" rows="3" maxlength="200" placeholder="e.g. Turn the stove to low for 10 minutes"></textarea>
 <div style="margin:10px 0;display:flex;gap:8px" id="pCol">${Object.entries(NOTE_COLORS).map(([k,v])=>`<span class="sw ${k==='yellow'?'on':''}" data-k="${k}" style="background:${v}"></span>`).join('')}</div>
 <label class="l">Distance to the object: <b id="pDv">2.0</b> m</label><input type="range" id="pDist" min="0.5" max="10" step="0.5" value="2" style="width:100%">
 <label class="l" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pPhoto" style="width:auto" ${ar.noCam?'disabled':'checked'}> Attach a photo of the spot</label>
 <div class="err" id="mErr"></div><div class="acts"><button class="btn sec" id="mCancel">Cancel</button><button class="btn" id="pGo">Pin note</button></div>`);
 $('#pCol').onclick=e=>{const s=e.target.closest('.sw');if(!s)return;color=s.dataset.k;$('#pCol').querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===s))};
 $('#pDist').oninput=e=>{$('#pDv').textContent=(+e.target.value).toFixed(1)};
 bindModal({mCancel:closeModal,pGo:async()=>{
  const text=$('#pText').value.trim();if(!text){$('#mErr').textContent='Write a note first';return}
  $('#pGo').disabled=true;let photo=null;
  if($('#pPhoto').checked&&ar.stream){
   try{const v=$('#arVid'),c=document.createElement('canvas'),sc=Math.min(1,640/v.videoWidth);c.width=v.videoWidth*sc;c.height=v.videoHeight*sc;c.getContext('2d').drawImage(v,0,0,c.width,c.height);
    const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.6));const f=await uploadFile(b,'spot.jpg','image/jpeg');if(f.url)photo=f.url}catch{}
  }
  const pose=ar.pose||{heading:0,pitch:0};
  emit('pin:create',{chat:ar.chat,text,emoji:color,lat:ar.pos.lat,lng:ar.pos.lng,acc:ar.pos.acc,heading:pose.heading,pitch:pose.pitch,dist:+$('#pDist').value,photo},d=>{
   if(d.error){$('#mErr').textContent=d.error;$('#pGo').disabled=false;return}
   closeModal();toast('Note pinned');
  });
 }});
}
function drawRadar(cv){
 if(!cv||!ar)return;
 const W=cv.width,c=W/2,g=cv.getContext('2d'),cs=getComputedStyle(document.documentElement),sub=cs.getPropertyValue('--sub').trim(),line=cs.getPropertyValue('--line').trim(),txt=cs.getPropertyValue('--text').trim();
 g.clearRect(0,0,W,W);g.font='13px system-ui';g.textAlign='center';g.fillStyle=sub;
 if(!ar.pos){g.fillText('Waiting for GPS…',c,c);cv._pts=[];return}
 const pts=ar.pins.map(p=>{const r=rel(ar.pos,pinTarget(p));return{p,d:r.d,b:rad(r.brg)}});
 const maxD=Math.max(20,...pts.map(x=>x.d))*1.15,R=c-18;
 g.strokeStyle=line;g.lineWidth=1;[.5,1].forEach(f=>{g.beginPath();g.arc(c,c,R*f,0,7);g.stroke()});
 g.beginPath();g.moveTo(c,c-R);g.lineTo(c,c+R);g.moveTo(c-R,c);g.lineTo(c+R,c);g.stroke();
 g.fillStyle=sub;g.fillText('N',c,12);g.fillText(Math.round(maxD/2)+' m',c+R*.5+16,c-4);g.fillText(Math.round(maxD)+' m',c+R-14,c-4);
 if(ar.pose){const h=rad(ar.pose.heading);g.fillStyle='rgba(59,130,246,.22)';g.beginPath();g.moveTo(c,c);g.arc(c,c,R,h-Math.PI/2-.45,h-Math.PI/2+.45);g.closePath();g.fill()}
 g.fillStyle=txt;g.beginPath();g.arc(c,c,5,0,7);g.fill();
 cv._pts=pts.map(x=>{const px=c+Math.sin(x.b)*x.d/maxD*R,py=c-Math.cos(x.b)*x.d/maxD*R;g.fillStyle=NOTE_COLORS[x.p.emoji]||NOTE_COLORS.yellow;g.strokeStyle='#222';g.lineWidth=1.5;g.beginPath();g.arc(px,py,8,0,7);g.fill();g.stroke();return{x:px,y:py,p:x.p}});
}
function arListModal(){
 if(!ar)return;
 const pins=ar.pins.slice().reverse();
 const listHtml=pins.length?pins.map(p=>{
  const u=users[p.from]||{name:'Someone'};let dist='';
  if(ar.pos){const r=rel(ar.pos,pinTarget(p));dist=r.d<1000?Math.round(r.d)+' m away':(r.d/1000).toFixed(1)+' km away'}
  return `<div class="mem" data-id="${esc(p.id)}" style="cursor:pointer"><span class="sw" style="background:${NOTE_COLORS[p.emoji]||NOTE_COLORS.yellow};border-radius:6px"></span><div class="grow"><b>${esc(p.text.slice(0,70))}</b><br><span style="color:var(--sub);font-size:12px">${esc(u.name)}${dist?' · '+dist:''}</span></div></div>`}).join(''):'<p style="color:var(--sub)">No notes yet. Tap "Pin a note" while pointing at something.</p>';
 modal(`<h3>Notes in this chat</h3><div class="seg" id="arTabs" style="margin-bottom:10px"><button class="on" data-t="list">List</button><button data-t="radar">Radar</button></div><div id="arPane">${listHtml}</div><div class="acts"><button class="btn" id="mCancel">Close</button></div>`);
 bindModal({mCancel:closeModal});
 let timer=null;
 const stop=()=>{clearInterval(timer);timer=null};
 $('#arTabs').onclick=e=>{
  const b=e.target.closest('[data-t]');if(!b)return;
  document.querySelectorAll('#arTabs button').forEach(x=>x.classList.toggle('on',x===b));stop();
  if(b.dataset.t==='list'){$('#arPane').innerHTML=listHtml;return}
  $('#arPane').innerHTML='<canvas id="radar" width="320" height="320" style="width:100%;max-width:320px;display:block;margin:0 auto"></canvas><p style="color:var(--sub);font-size:12px;text-align:center">Top of the circle is north. The blue wedge is where your phone points. Tap a dot to read the note. Useful when GPS is rough indoors.</p>';
  const cv=$('#radar');drawRadar(cv);timer=setInterval(()=>{if(!$('#radar'))return stop();drawRadar($('#radar'))},500);
  cv.onclick=ev=>{const r=cv.getBoundingClientRect(),k=cv.width/r.width,x=(ev.clientX-r.left)*k,y=(ev.clientY-r.top)*k;const hit=(cv._pts||[]).find(q=>Math.hypot(q.x-x,q.y-y)<16);if(hit)arNoteInfo(hit.p)};
 };
 $('#modal').onclick=e=>{const el=e.target.closest('.mem[data-id]');if(el){const p=ar.pins.find(x=>x.id===el.dataset.id);if(p)arNoteInfo(p)}};
}
$('#arClose').onclick=closeAR;$('#arPlace').onclick=arPlaceModal;$('#arList').onclick=arListModal;
function nearbyCheck(){
 if(!navigator.permissions||!navigator.geolocation)return;
 navigator.permissions.query({name:'geolocation'}).then(s=>{
  if(s.state!=='granted')return;
  navigator.geolocation.getCurrentPosition(p=>{
   const pos={lat:p.coords.latitude,lng:p.coords.longitude};let found=0,left=chats.length;
   chats.forEach(c=>emit('pin:list',{chat:c.id},d=>{
    ((d&&d.pins)||[]).forEach(x=>{if(rel(pos,pinTarget(x)).d<=40)found++});
    if(--left===0&&found)toast(found+' AR note'+(found>1?'s':'')+' near you. Open a chat, then the menu, then AR notes.',6000);
   }));
  },()=>{},{maximumAge:60000,timeout:8000});
 }).catch(()=>{});
}
