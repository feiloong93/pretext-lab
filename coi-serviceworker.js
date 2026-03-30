/*! coi-serviceworker - enables SharedArrayBuffer on GitHub Pages */
if(typeof window==='undefined'){
  self.addEventListener("install",()=>self.skipWaiting());
  self.addEventListener("activate",(e)=>e.waitUntil(self.clients.claim()));
  self.addEventListener("fetch",(e)=>{
    if(e.request.cache==="only-if-cached"&&e.request.mode!=="same-origin")return;
    e.respondWith(fetch(e.request).then((r)=>{
      if(r.status===0)return r;
      const h=new Headers(r.headers);
      h.set("Cross-Origin-Embedder-Policy","credentialless");
      h.set("Cross-Origin-Opener-Policy","same-origin");
      return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
    }).catch((err)=>console.error(err)));
  });
}else{
  (async()=>{
    if(window.crossOriginIsolated)return;
    if(!('serviceWorker' in navigator))return;
    const reg=await navigator.serviceWorker.register(window.document.currentScript.src);
    if(reg.active&&!navigator.serviceWorker.controller){window.location.reload();}
    else if(!reg.active){
      const sw=reg.installing||reg.waiting;
      if(sw)sw.addEventListener("statechange",function(){if(this.state==="activated")window.location.reload();});
    }
  })();
}
