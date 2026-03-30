/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
// This service worker enables SharedArrayBuffer by setting COOP/COEP headers
if(typeof window==='undefined'){
  self.addEventListener("install",()=>self.skipWaiting());
  self.addEventListener("activate",(e)=>e.waitUntil(self.clients.claim()));
  self.addEventListener("fetch",(e)=>{
    if(e.request.cache==="only-if-cached"&&e.request.mode!=="same-origin")return;
    e.respondWith(fetch(e.request).then((r)=>{
      if(r.status===0)return r;
      const h=new Headers(r.headers);
      h.set("Cross-Origin-Embedder-Policy","require-corp");
      h.set("Cross-Origin-Opener-Policy","same-origin");
      return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
    }).catch((err)=>console.error(err)));
  });
}else{
  (async()=>{
    if(window.crossOriginIsolated!==false)return;
    const r=await navigator.serviceWorker.register(window.document.currentScript.src);
    if(r.active&&!navigator.serviceWorker.controller){window.location.reload();}
    else if(!r.active){r.addEventListener("updatefound",()=>r.installing.addEventListener("statechange",function(){if(this.state==="activated")window.location.reload();}));}
  })();
}
