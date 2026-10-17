// ---------- startup ----------
authMode();hydrate();syncSendMic();
if('serviceWorker' in navigator){
 addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
 navigator.serviceWorker.addEventListener('message',e=>{
  const d=e.data||{};
  if(d.type==='hangup'&&call){$('#cEnd').click();return}
  if(d.type==='open'&&d.ongoing&&call){restoreCall();return}
  if(d.type==='open'&&chatById(d.chat)){openChat(d.chat,true);if(d.call&&callState[d.chat]&&!call)ringModal(d.chat,callState[d.chat].users[0],callState[d.chat].video,true)}
 });
}
{const q=new URLSearchParams(location.search);if(q.get('join')&&!token)store.set('mk_join',q.get('join'))}
if(token){cacheLoad();showLock();start()}
