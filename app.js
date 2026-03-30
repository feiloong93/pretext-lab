(function(){
'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#canvas'), ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
let dark = true, lang = 'en', params = {}, activeKey = '', raf = null;

// ---- HiDPI canvas ----
function W(){ return canvas.width/dpr; }
function H(){ return canvas.height/dpr; }
function resize(){
  const r = $('#preview').getBoundingClientRect();
  canvas.width = r.width*dpr; canvas.height = r.height*dpr;
  canvas.style.width = r.width+'px'; canvas.style.height = r.height+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',()=>{ resize(); draw(); });
resize();

// ---- Helpers ----
function bg(){ return dark?'#0c0c0c':'#f2f2f2'; }
function clr(){ ctx.fillStyle=bg(); ctx.fillRect(0,0,W(),H()); }
function txt(){ return $('#input-text').value||'Pretext Lab'; }
function hex2rgb(h){ return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)}; }
function isCJK(c){ const u=c.codePointAt(0); return(u>=0x4E00&&u<=0x9FFF)||(u>=0x3400&&u<=0x4DBF)||(u>=0x3000&&u<=0x303F)||(u>=0xFF00&&u<=0xFFEF); }
function wrap(text,font,maxW,lh){
  ctx.font=font; const words=[]; let buf='';
  for(const c of text){ if(c===' '||c==='\n'){if(buf)words.push(buf);if(c==='\n')words.push('\n');buf='';}
    else{if(buf&&isCJK(c)){words.push(buf);buf='';}buf+=c;if(isCJK(c)){words.push(buf);buf='';}}}
  if(buf)words.push(buf);
  const lines=[]; let line='';
  for(const w of words){if(w==='\n'){lines.push(line);line='';continue;}
    const t=line?line+' '+w:w; if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}
  if(line)lines.push(line);
  return{lines,height:lines.length*lh};
}
const FN = 'IBMPlex, sans-serif';

// ---- i18n ----
const i18n = {
  en:{params:'PARAMETERS',cat_layout:'LAYOUT',cat_ascii:'ASCII ART',cat_fx:'INTERACTIVE',cat_style:'STYLE',cat_tool:'TOOLS',
    multicolumn:'Multi-Column',textwrap:'Text Wrap',shrinkwrap:'Shrinkwrap',accordion:'Accordion',richtext:'Rich Text',
    fluid:'Fluid Smoke',torus:'Wireframe Torus',particles:'Char Particles',matrix:'Matrix Rain',
    wave:'Text Wave',typewriter:'Typewriter',gravity:'Gravity Text',morph:'Glitch Morph',
    neon:'Neon Glow',gradient:'Gradient Text',heightpredict:'Height Predict',virtuallist:'Virtual List'},
  zh:{params:'参数调节',cat_layout:'排版布局',cat_ascii:'ASCII 艺术',cat_fx:'交互动效',cat_style:'文字样式',cat_tool:'工具',
    multicolumn:'多栏文字流',textwrap:'文字环绕',shrinkwrap:'收缩包裹',accordion:'手风琴',richtext:'富文本混排',
    fluid:'流体烟雾',torus:'线框甜甜圈',particles:'字符粒子',matrix:'矩阵雨',
    wave:'文字波浪',typewriter:'打字机',gravity:'重力文字',morph:'故障变形',
    neon:'霓虹发光',gradient:'渐变文字',heightpredict:'高度预测',virtuallist:'虚拟列表'}
};
function t(k){ return(i18n[lang]||i18n.en)[k]||k; }
function applyI18n(){ document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);}); $('#btn-lang').textContent=lang==='en'?'中文':'EN'; buildSidebar(); }

// ---- Effects registry ----
const effects = {};
const cats = [
  {key:'cat_layout',items:['multicolumn','textwrap','shrinkwrap','accordion','richtext']},
  {key:'cat_ascii',items:['fluid','torus','particles','matrix']},
  {key:'cat_fx',items:['wave','typewriter','gravity','morph']},
  {key:'cat_style',items:['neon','gradient']},
  {key:'cat_tool',items:['heightpredict','virtuallist']},
];

// ---- Sidebar ----
function buildSidebar(){
  const el=$('#sb-list'); el.innerHTML='';
  cats.forEach(c=>{
    el.insertAdjacentHTML('beforeend',`<div class="sb-cat">${t(c.key)}</div>`);
    c.items.forEach(k=>{
      const btn=document.createElement('button');
      btn.className='sb-item'+(k===activeKey?' active':'');
      btn.textContent=t(k); btn.onclick=()=>activate(k);
      el.appendChild(btn);
    });
  });
}

// ---- Panel ----
function buildPanel(defs){
  const body=$('#panel-body'); body.innerHTML=''; params={};
  (defs||[]).forEach(d=>{
    params[d.key]=d.value;
    const g=document.createElement('div'); g.className='pg';
    if(d.type==='range'){
      g.innerHTML=`<div class="pg-head"><span>${d.label}</span><span class="pg-val" id="v-${d.key}">${d.value}</span></div><input type="range" min="${d.min}" max="${d.max}" step="${d.step||1}" value="${d.value}">`;
      g.querySelector('input').oninput=e=>{params[d.key]=+e.target.value;$(`#v-${d.key}`).textContent=params[d.key];if(!effects[activeKey]?.animated)draw();};
    }else if(d.type==='select'){
      g.innerHTML=`<div class="pg-head"><span>${d.label}</span></div><select>${d.options.map(o=>`<option${o===d.value?' selected':''}>${o}</option>`).join('')}</select>`;
      g.querySelector('select').onchange=e=>{params[d.key]=e.target.value;if(!effects[activeKey]?.animated)draw();};
    }else if(d.type==='color'){
      g.innerHTML=`<div class="pg-head"><span>${d.label}</span><span class="pg-val" id="v-${d.key}">${d.value}</span></div><input type="color" value="${d.value}">`;
      g.querySelector('input').oninput=e=>{params[d.key]=e.target.value;$(`#v-${d.key}`).textContent=e.target.value;if(!effects[activeKey]?.animated)draw();};
    }
    body.appendChild(g);
  });
}

// ---- Activate ----
function activate(key){
  if(raf){cancelAnimationFrame(raf);raf=null;}
  activeKey=key; const fx=effects[key]; if(!fx)return;
  if(fx.init)fx.init();
  buildPanel(fx.params); buildSidebar();
  if(fx.animated){(function loop(){fx.render();raf=requestAnimationFrame(loop);})();}
  else draw();
}
function draw(){ const fx=effects[activeKey]; if(fx&&!fx.animated)fx.render(); }

// ---- Topbar ----
$('#btn-bg').onclick=()=>{dark=!dark;document.body.classList.toggle('light',!dark);$('#btn-bg').textContent=dark?'◐':'◑';draw();};
$('#btn-lang').onclick=()=>{lang=lang==='en'?'zh':'en';applyI18n();};
$('#btn-export').onclick=()=>{const a=document.createElement('a');a.download='pretext-lab.png';a.href=canvas.toDataURL('image/png');a.click();};
$('#btn-css').onclick=()=>{const css=effects[activeKey]?.css?.()||'/* No CSS for this effect */';navigator.clipboard.writeText(css).then(()=>alert('CSS copied!'));};
$('#input-text').oninput=()=>{const fx=effects[activeKey];if(fx?.init)fx.init();if(!fx?.animated)draw();};

// ============ EFFECTS ============

// ---- Multi-Column ----
effects.multicolumn = {
  params:[
    {key:'cols',label:'Columns',type:'range',min:1,max:6,value:3},
    {key:'gap',label:'Gap',type:'range',min:10,max:80,value:30},
    {key:'fontSize',label:'Font Size',type:'range',min:10,max:36,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:48,value:22},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr(); const m=40,tw=W()-m*2,cw=(tw-params.gap*(params.cols-1))/params.cols,
      font=`${params.fontSize}px ${FN}`,lh=params.lineHeight;
    const{lines}=wrap(txt().repeat(10),font,cw,lh);
    ctx.font=font;ctx.textBaseline='top';
    const maxR=Math.floor((H()-m*2)/lh);let li=0;
    for(let c=0;c<params.cols&&li<lines.length;c++){
      const x=m+c*(cw+params.gap);
      if(c>0){ctx.strokeStyle=dark?'#222':'#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-params.gap/2,m);ctx.lineTo(x-params.gap/2,H()-m);ctx.stroke();}
      for(let r=0;r<maxR&&li<lines.length;r++,li++){ctx.fillStyle=params.color;ctx.fillText(lines[li],x,m+r*lh);}
    }
  },
  css(){return`column-count:${params.cols};column-gap:${params.gap}px;font-size:${params.fontSize}px;line-height:${params.lineHeight}px;color:${params.color};`;}
};

// ---- Text Wrap ----
effects.textwrap = {
  params:[
    {key:'ox',label:'Object X',type:'range',min:50,max:600,value:250},
    {key:'oy',label:'Object Y',type:'range',min:50,max:500,value:180},
    {key:'os',label:'Object Size',type:'range',min:30,max:200,value:90},
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:28,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:16,max:40,value:22},
    {key:'color',label:'Color',type:'color',value:'#d4c4a0'},
  ],
  render(){
    clr(); const text=txt().repeat(15),font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,
      m=40,fw=W()-m*2,ox=params.ox,oy=params.oy,os=params.os;
    ctx.fillStyle=dark?'#1a1a1a':'#e0e0e0';ctx.beginPath();ctx.arc(ox,oy,os/2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=dark?'#333':'#bbb';ctx.stroke();
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    let y=m,rem=text;
    while(y<H()-m&&rem.length>0){
      let lw=fw,x=m;
      if(y+lh>oy-os/2-8&&y<oy+os/2+8){const ind=ox+os/2+12-m;if(ind>0&&ind<fw){x=m+ind;lw=fw-ind;}}
      let line='';for(const c of rem){if(ctx.measureText(line+c).width>lw)break;line+=c;}
      rem=rem.slice(line.length);ctx.fillText(line,x,y);y+=lh;
    }
  }
};

// ---- Shrinkwrap ----
effects.shrinkwrap = {
  params:[
    {key:'maxW',label:'Max Width',type:'range',min:100,max:800,value:400},
    {key:'fontSize',label:'Font Size',type:'range',min:12,max:36,value:18},
    {key:'lineHeight',label:'Line Height',type:'range',min:18,max:48,value:28},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,{lines}=wrap(txt(),font,params.maxW,lh);
    ctx.font=font;let mw=0;lines.forEach(l=>{const w=ctx.measureText(l).width;if(w>mw)mw=w;});
    const p=20,bw=mw+p*2,bh=lines.length*lh+p*2,bx=(W()-bw)/2,by=(H()-bh)/2;
    ctx.strokeStyle=dark?'#333':'#ccc';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.strokeRect((W()-params.maxW)/2,by-12,params.maxW,bh+24);ctx.setLineDash([]);
    ctx.strokeStyle=params.color;ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle=dark?'#555':'#999';ctx.font='11px monospace';ctx.textBaseline='top';
    ctx.fillText(`max: ${params.maxW}px`,(W()-params.maxW)/2,by-18);
    ctx.fillStyle=params.color;ctx.fillText(`fit: ${Math.round(mw)}px`,bx,by-8);
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l,bx+p,by+p+i*lh));
  }
};

// ---- Accordion ----
effects.accordion = {
  _o:0,_k:0,animated:true,
  params:[
    {key:'n',label:'Sections',type:'range',min:2,max:8,value:4},
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:22,value:13},
    {key:'speed',label:'Speed',type:'range',min:1,max:10,value:4},
    {key:'color',label:'Accent',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const n=params.n,font=`${params.fontSize}px ${FN}`,lh=params.fontSize+8,
      w=Math.min(480,W()-60),x=(W()-w)/2,hh=34;
    const txts=['Pretext 可以在不触发 DOM 回流的情况下精确计算文本高度。',
      '支持所有语言：中文、日文、阿拉伯文、emoji，甚至混合双向文本。',
      'prepare() 做一次性分析，layout() 是纯算术热路径。',
      '可以渲染到 Canvas、SVG、WebGL，甚至服务端。',
      '实现真正的虚拟列表，不需要先渲染再测量。',
      '文字环绕浮动元素：逐行设置不同宽度。',
      '收缩包裹：找到最紧凑的容器宽度。',
      '手风琴动画：预计算内容高度，丝滑展开。'];
    let y=50;
    for(let i=0;i<n;i++){
      const open=i===this._o,{lines}=wrap(txts[i%txts.length],font,w-20,lh),ch=open?lines.length*lh+14:0;
      ctx.fillStyle=open?(dark?'#1c1c1c':'#f0f0f0'):(dark?'#141414':'#fafafa');
      ctx.fillRect(x,y,w,hh);ctx.strokeStyle=dark?'#262626':'#ddd';ctx.strokeRect(x,y,w,hh);
      ctx.fillStyle=open?params.color:(dark?'#777':'#888');ctx.font=`600 12px ${FN}`;ctx.textBaseline='middle';
      ctx.fillText(`Section ${i+1}`,x+10,y+hh/2);ctx.fillText(open?'−':'+',x+w-20,y+hh/2);y+=hh;
      if(open){ctx.fillStyle=dark?'#111':'#f8f8f8';ctx.fillRect(x,y,w,ch);ctx.strokeRect(x,y,w,ch);
        ctx.font=font;ctx.fillStyle=dark?'#999':'#555';ctx.textBaseline='top';
        lines.forEach((l,li)=>ctx.fillText(l,x+10,y+7+li*lh));y+=ch;}
    }
    this._k+=params.speed*.004;if(this._k>1){this._k=0;this._o=(this._o+1)%n;}
  }
};

// ---- Rich Text ----
effects.richtext = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:32,value:17},
    {key:'maxW',label:'Max Width',type:'range',min:200,max:800,value:500},
    {key:'color',label:'Text',type:'color',value:'#d4c4a0'},
    {key:'code',label:'Code',type:'color',value:'#7ec8a0'},
    {key:'tag',label:'Tag',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const fs=params.fontSize,segs=[
      {t:'Pretext 使用 ',s:'n'},{t:'prepare()',s:'c'},{t:' 做一次性分析，然后 ',s:'n'},
      {t:'layout()',s:'c'},{t:' 纯算术计算。支持 ',s:'n'},{t:'中文',s:'t'},{t:' ',s:'n'},
      {t:'English',s:'t'},{t:' ',s:'n'},{t:'العربية',s:'t'},
      {t:' 和 emoji 🚀。不触发 DOM 回流，实现 60fps 渲染。',s:'n'}];
    const x0=(W()-params.maxW)/2;let x=x0,y=H()/2-50;const lh=fs+10;
    ctx.textBaseline='top';
    segs.forEach(seg=>{
      ctx.font=seg.s==='c'?`${fs-1}px monospace`:seg.s==='t'?`600 ${fs}px ${FN}`:`${fs}px ${FN}`;
      for(const ch of seg.t){
        const w=ctx.measureText(ch).width;if(x+w>x0+params.maxW){x=x0;y+=lh;}
        if(seg.s==='c'){ctx.fillStyle=dark?'#152015':'#e8f5e8';ctx.fillRect(x-2,y-1,w+4,fs+3);}
        if(seg.s==='t'){ctx.fillStyle=dark?'#221a10':'#fdf5e8';ctx.fillRect(x-1,y,w+2,fs+2);}
        ctx.fillStyle=seg.s==='c'?params.code:seg.s==='t'?params.tag:params.color;
        ctx.fillText(ch,x,y);x+=w;
      }
    });
  }
};

// ---- Fluid Smoke ----
effects.fluid = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:6,max:24,value:11},
    {key:'speed',label:'Speed',type:'range',min:1,max:20,value:7},
    {key:'intensity',label:'Intensity',type:'range',min:1,max:10,value:5},
    {key:'chars',label:'Characters',type:'select',options:['blocks','ascii','custom'],value:'blocks'},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const map={blocks:' ░▒▓█',ascii:' .:-=+*#%@',custom:' '+[...new Set([...txt()])].join('')};
    const chars=map[params.chars]||map.blocks;
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const nx=col/cols*4,ny=row/rows*4;
      const v=(Math.sin(nx*2+this._t)*Math.cos(ny*3-this._t*.7)+Math.sin(nx*ny+this._t*.5)+Math.cos(nx*1.5-ny*2+this._t*1.3))/3;
      const n=Math.pow((v+1)/2,1/params.intensity);
      ctx.fillStyle=`rgba(${r},${g},${b},${n*.9+.1})`;
      ctx.fillText(chars[Math.floor(n*(chars.length-1))],col*cw,row*cs);
    }
  }
};

// ---- Wireframe Torus ----
effects.torus = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:18,value:9},
    {key:'speed',label:'Speed',type:'range',min:1,max:20,value:5},
    {key:'R',label:'Major R',type:'range',min:40,max:200,value:110},
    {key:'r',label:'Minor R',type:'range',min:15,max:100,value:45},
    {key:'chars',label:'Characters',type:'select',options:['shading','custom'],value:'shading'},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();this._t+=params.speed*.007;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const zb=new Float32Array(cols*rows).fill(-1e9),lb=new Float32Array(cols*rows);
    const map={shading:'.,-~:;=!*#$@',custom:[...new Set([...txt()])].join('')||'@#*=:.'};
    const chars=map[params.chars]||map.shading;
    const A=this._t,B=this._t*.5,cA=Math.cos(A),sA=Math.sin(A),cB=Math.cos(B),sB=Math.sin(B);
    const cx=W()/2,cy=H()/2,R=params.R,r2=params.r;
    for(let th=0;th<6.28;th+=.07)for(let ph=0;ph<6.28;ph+=.02){
      const ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph);
      const x0=(R+r2*ct)*cp,y0=(R+r2*ct)*sp,z0=r2*st;
      const y1=y0*cA-z0*sA,z1=y0*sA+z0*cA,x2=x0*cB+z1*sB,z2=-x0*sB+z1*cB;
      const sc=280/(z2+380),px=Math.floor((cx+x2*sc)/cw),py=Math.floor((cy+y1*sc)/cs);
      if(px>=0&&px<cols&&py>=0&&py<rows){const i=py*cols+px;if(z2>zb[i]){zb[i]=z2;lb[i]=(ct*cp*sB-st*sA-ct*sp*cB+cA*st*cB+1)/2;}}
    }
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const i=row*cols+col;if(zb[i]>-1e9){const v=lb[i];
        ctx.fillStyle=`rgba(${r},${g},${b},${v*.8+.2})`;ctx.fillText(chars[Math.floor(v*(chars.length-1))],col*cw,row*cs);}
    }
  }
};

// ---- Char Particles ----
effects.particles = {
  _p:[],_ok:false,animated:true,
  params:[
    {key:'count',label:'Count',type:'range',min:30,max:400,value:150},
    {key:'size',label:'Size',type:'range',min:8,max:30,value:14},
    {key:'speed',label:'Speed',type:'range',min:1,max:10,value:3},
    {key:'chars',label:'Characters',type:'select',options:['kanji','latin','symbols','custom'],value:'kanji'},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  init(){this._ok=false;this._p=[];},
  render(){
    clr();const map={kanji:'永和平光風雲山水火金木土天地人心夢星月花',latin:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      symbols:'◆◇○●□■△▽★☆♠♣♥♦',custom:[...new Set([...txt()])].join('')||'Pretext'};
    const chars=map[params.chars]||map.kanji;
    if(!this._ok||this._p.length!==params.count){
      this._p=Array.from({length:params.count},()=>({x:Math.random()*W(),y:Math.random()*H(),
        vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,ch:chars[Math.floor(Math.random()*chars.length)],
        s:params.size*(.5+Math.random()),a:.3+Math.random()*.7,rot:Math.random()*6.28}));this._ok=true;}
    const{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    this._p.forEach(p=>{p.x+=p.vx*params.speed;p.y+=p.vy*params.speed;p.rot+=.015*params.speed;
      if(p.x<0)p.x=W();if(p.x>W())p.x=0;if(p.y<0)p.y=H();if(p.y>H())p.y=0;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.font=`${p.s}px ${FN}`;ctx.fillStyle=`rgba(${r},${g},${b},${p.a})`;
      ctx.fillText(p.ch,0,0);ctx.restore();});
    ctx.textAlign='left';
  }
};

// ---- Matrix Rain ----
effects.matrix = {
  _d:[],_clear:true,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:8,max:22,value:13},
    {key:'speed',label:'Speed',type:'range',min:1,max:20,value:7},
    {key:'chars',label:'Characters',type:'select',options:['katakana','chinese','custom'],value:'katakana'},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  init(){this._d=[];this._clear=true;},
  render(){
    if(this._clear){clr();this._clear=false;}
    ctx.fillStyle=dark?'rgba(12,12,12,.06)':'rgba(242,242,242,.06)';ctx.fillRect(0,0,W(),H());
    const cs=params.charSize,cols=Math.floor(W()/cs);
    const map={katakana:'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789',
      chinese:'天地人和风云山水火金木土心梦星月花鸟龙凤',custom:[...new Set([...txt()])].join('')||'PRETEXT'};
    const chars=map[params.chars]||map.katakana;
    while(this._d.length<cols)this._d.push(Math.random()*-50);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let i=0;i<cols;i++){
      const ch=chars[Math.floor(Math.random()*chars.length)],y=this._d[i]*cs;
      ctx.fillStyle=`rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+40,255)},1)`;ctx.fillText(ch,i*cs,y);
      ctx.fillStyle=`rgba(${r},${g},${b},.5)`;ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*cs,y-cs);
      this._d[i]+=params.speed*.12;if(this._d[i]*cs>H()&&Math.random()>.92)this._d[i]=0;
    }
  }
};

// ---- Text Wave ----
effects.wave = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:20,max:80,value:42},
    {key:'amp',label:'Amplitude',type:'range',min:3,max:80,value:25},
    {key:'freq',label:'Frequency',type:'range',min:1,max:20,value:7},
    {key:'speed',label:'Speed',type:'range',min:1,max:20,value:5},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();this._t+=params.speed*.03;const text=txt(),fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';
    const chars=[...text];let tw=0;const ws=chars.map(c=>{const w=ctx.measureText(c).width;tw+=w;return w;});
    let x=(W()-tw)/2;const cy=H()/2,{r,g,b}=hex2rgb(params.color);
    chars.forEach((c,i)=>{const off=Math.sin(i/chars.length*params.freq+this._t)*params.amp;
      const a=.5+Math.sin(i*.5+this._t)*.5;
      ctx.fillStyle=`rgba(${r},${g},${b},${Math.max(.2,a)})`;ctx.fillText(c,x,cy+off);x+=ws[i];});
  },
  css(){return`font-size:${params.fontSize}px;color:${params.color};\n@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(${params.amp}px)}}\nanimation:wave ${1/params.speed*2}s ease-in-out infinite;`;}
};

// ---- Typewriter ----
effects.typewriter = {
  _ci:0,_t:0,_blink:0,animated:true,
  init(){this._ci=0;this._t=0;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:52,value:24},
    {key:'speed',label:'Speed',type:'range',min:1,max:20,value:5},
    {key:'maxW',label:'Max Width',type:'range',min:200,max:800,value:500},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();this._t+=params.speed*.04;this._blink+=.08;
    if(this._t>1){this._t=0;this._ci++;if(this._ci>[...txt()].length)this._ci=0;}
    const text=[...txt()].slice(0,this._ci).join(''),font=`${params.fontSize}px ${FN}`,lh=params.fontSize+10;
    const{lines}=wrap(text,font,params.maxW,lh);
    const x0=(W()-params.maxW)/2,y0=H()/2-lines.length*lh/2;
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l,x0,y0+i*lh));
    if(Math.sin(this._blink*3)>0){const last=lines[lines.length-1]||'';ctx.font=font;
      ctx.fillRect(x0+ctx.measureText(last).width+2,y0+(lines.length-1)*lh,2,params.fontSize);}
  }
};

// ---- Gravity Text ----
effects.gravity = {
  _chars:[],_ok:false,animated:true,
  init(){this._ok=false;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:18,max:64,value:36},
    {key:'grav',label:'Gravity',type:'range',min:1,max:20,value:5},
    {key:'bounce',label:'Bounce',type:'range',min:1,max:9,value:6},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const text=[...txt()],fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;
    if(!this._ok||this._chars.length!==text.length){
      let x0=(W()-text.length*fs*.7)/2;
      this._chars=text.map((c,i)=>({c,x:x0+i*fs*.7,y:40,vy:0}));this._ok=true;}
    const floor=H()-50,{r,g,b}=hex2rgb(params.color),bnc=params.bounce/10;
    this._chars.forEach(c=>{c.vy+=params.grav*.1;c.y+=c.vy;
      if(c.y+fs>floor){c.y=floor-fs;c.vy=-c.vy*bnc;if(Math.abs(c.vy)<.5)c.vy=0;}
      ctx.fillStyle=`rgba(${r},${g},${b},${.4+(c.y/floor)*.6})`;ctx.textBaseline='top';ctx.fillText(c.c,c.x,c.y);});
    ctx.strokeStyle=dark?'#222':'#ddd';ctx.beginPath();ctx.moveTo(0,floor);ctx.lineTo(W(),floor);ctx.stroke();
  }
};

// ---- Glitch Morph ----
effects.morph = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:36,max:120,value:64},
    {key:'speed',label:'Speed',type:'range',min:1,max:10,value:3},
    {key:'glitch',label:'Glitch',type:'range',min:1,max:30,value:10},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();this._t+=params.speed*.015;const text=[...txt()].slice(0,14).join(''),fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';
    const tw=ctx.measureText(text).width,x0=(W()-tw)/2,cy=H()/2,{r,g,b}=hex2rgb(params.color);
    for(let layer=3;layer>=0;layer--){let x=x0;
      [...text].forEach((c,i)=>{const w=ctx.measureText(c).width;
        const dx=Math.sin(i*1.5+this._t+layer)*params.glitch*(layer*.3);
        const dy=Math.cos(i*2+this._t*1.3+layer)*params.glitch*(layer*.3);
        ctx.fillStyle=layer===0?`rgb(${r},${g},${b})`:`rgba(${r},${g},${b},${.12/layer})`;
        ctx.fillText(c,x+dx,cy+dy);x+=w;});}
  }
};

// ---- Neon Glow ----
effects.neon = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:30,max:100,value:56},
    {key:'glow',label:'Glow',type:'range',min:2,max:40,value:15},
    {key:'pulse',label:'Pulse',type:'range',min:0,max:10,value:3},
    {key:'color',label:'Color',type:'color',value:'#ff6ec7'},
  ],
  render(){
    clr();this._t+=.03;const text=txt(),fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';ctx.textAlign='center';
    const cx=W()/2,cy=H()/2,pulse=1+Math.sin(this._t*params.pulse)*.2;
    for(let i=4;i>=0;i--){ctx.shadowColor=params.color;ctx.shadowBlur=params.glow*pulse*(i+1)*.4;
      ctx.fillStyle=i===0?params.color:`rgba(0,0,0,0)`;ctx.fillText(text,cx,cy);}
    ctx.shadowBlur=0;ctx.textAlign='left';
  },
  css(){return`font-size:${params.fontSize}px;color:${params.color};\ntext-shadow:0 0 ${params.glow}px ${params.color},0 0 ${params.glow*2}px ${params.color};`;}
};

// ---- Gradient Text ----
effects.gradient = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:30,max:100,value:56},
    {key:'angle',label:'Angle',type:'range',min:0,max:360,value:135},
    {key:'c1',label:'Color 1',type:'color',value:'#c8a46e'},
    {key:'c2',label:'Color 2',type:'color',value:'#e8d5b0'},
    {key:'c3',label:'Color 3',type:'color',value:'#8a6d3b'},
  ],
  render(){
    clr();const text=txt(),fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';ctx.textAlign='center';
    const cx=W()/2,cy=H()/2,tw=ctx.measureText(text).width,rad=params.angle*Math.PI/180;
    const grd=ctx.createLinearGradient(cx-tw/2*Math.cos(rad),cy-tw/2*Math.sin(rad),cx+tw/2*Math.cos(rad),cy+tw/2*Math.sin(rad));
    grd.addColorStop(0,params.c1);grd.addColorStop(.5,params.c2);grd.addColorStop(1,params.c3);
    ctx.fillStyle=grd;ctx.fillText(text,cx,cy);ctx.textAlign='left';
  },
  css(){return`font-size:${params.fontSize}px;\nbackground:linear-gradient(${params.angle}deg,${params.c1},${params.c2},${params.c3});\n-webkit-background-clip:text;\n-webkit-text-fill-color:transparent;`;}
};

// ---- Height Predict ----
effects.heightpredict = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:36,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:48,value:22},
    {key:'maxW',label:'Width',type:'range',min:100,max:800,value:380},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const font=`${params.fontSize}px ${FN}`,lh=params.lineHeight;
    const{lines,height}=wrap(txt(),font,params.maxW,lh);
    const x0=(W()-params.maxW)/2,y0=50;
    ctx.strokeStyle=params.color;ctx.lineWidth=1;ctx.strokeRect(x0,y0,params.maxW,height);
    ctx.fillStyle=params.color;ctx.font='11px monospace';ctx.textBaseline='middle';
    ctx.fillText(`${Math.round(height)}px`,x0+params.maxW+8,y0+height/2);
    ctx.textBaseline='top';ctx.fillText(`${params.maxW}px`,x0+params.maxW/2-20,y0+height+6);
    ctx.fillStyle=dark?'#555':'#999';ctx.fillText(`${lines.length} lines`,x0+params.maxW+8,y0-2);
    ctx.font=font;ctx.fillStyle=dark?'#999':'#444';ctx.textBaseline='top';
    lines.forEach((l,i)=>{ctx.fillText(l,x0+4,y0+i*lh);
      if(i>0){ctx.strokeStyle=dark?'#1a1a1a':'#eee';ctx.beginPath();ctx.moveTo(x0,y0+i*lh);ctx.lineTo(x0+params.maxW,y0+i*lh);ctx.stroke();}});
  }
};

// ---- Virtual List ----
effects.virtuallist = {
  _sy:0,animated:true,
  params:[
    {key:'items',label:'Total Items',type:'range',min:100,max:5000,step:100,value:1000},
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:18,value:13},
    {key:'cw',label:'Width',type:'range',min:200,max:550,value:340},
    {key:'speed',label:'Scroll Speed',type:'range',min:1,max:10,value:3},
    {key:'color',label:'Color',type:'color',value:'#c8a46e'},
  ],
  render(){
    clr();const msgs=['Hey, pretext 真的能预测文本高度吗？','是的，prepare + layout 两行搞定。',
      '那虚拟列表就不需要先渲染再测量了？','对，纯算术，0.09ms 搞定 500 条。',
      '支持中文吗？','支持所有语言，包括 emoji 🚀。',
      'Amazing! No more layout thrashing.','性能提升太大了，60fps 无压力。'];
    const font=`${params.fontSize}px ${FN}`,lh=params.fontSize+6,cw=params.cw,pad=8,
      x0=(W()-cw)/2,viewH=H()-60,y0=30;
    ctx.font=font;const items=[];let totalH=0;
    for(let i=0;i<params.items;i++){const text=`[${i}] ${msgs[i%msgs.length]}`;
      const{lines}=wrap(text,font,cw-pad*2-30,lh);const h=lines.length*lh+pad*2+6;
      items.push({text,lines,h,y:totalH});totalH+=h+3;}
    this._sy+=params.speed;if(this._sy>totalH-viewH)this._sy=0;
    ctx.strokeStyle=dark?'#222':'#ddd';ctx.strokeRect(x0,y0,cw,viewH);
    ctx.save();ctx.beginPath();ctx.rect(x0,y0,cw,viewH);ctx.clip();
    let rendered=0;
    for(let i=0;i<items.length;i++){const it=items[i],iy=it.y-this._sy+y0;
      if(iy+it.h<y0)continue;if(iy>y0+viewH)break;
      const left=i%2===0,bw=Math.min(cw-50,cw*.75),bx=left?x0+6:x0+cw-bw-6;
      ctx.fillStyle=left?(dark?'#161616':'#f5f5f5'):(dark?'#1c1810':'#fdf8f0');
      ctx.beginPath();ctx.roundRect(bx,iy+1,bw,it.h-2,6);ctx.fill();
      ctx.font=font;ctx.fillStyle=left?(dark?'#999':'#555'):params.color;ctx.textBaseline='top';
      it.lines.forEach((l,li)=>ctx.fillText(l,bx+pad,iy+pad+li*lh));rendered++;}
    ctx.restore();
    ctx.fillStyle=dark?'#555':'#999';ctx.font='10px monospace';ctx.textBaseline='top';
    ctx.fillText(`Total: ${params.items} | Visible: ${rendered} | Scroll: ${Math.round(this._sy)}px`,x0,y0+viewH+6);
  }
};

// ============ BOOT ============
activeKey='wave';
buildSidebar();
buildPanel(effects.wave.params);
applyI18n();
activate('wave');

})();
