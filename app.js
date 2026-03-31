(function(){
'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#canvas'), ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
let dark = true, lang = 'en', params = {}, activeKey = '', raf = null;
let globalImg = null;

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
    const sep=line?(isCJK(w[0])||isCJK(line[line.length-1])?'':' '):'';
    const t=line?line+sep+w:w; if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}
  if(line)lines.push(line);
  return{lines,height:lines.length*lh};
}
const FN = 'IBMPlex, sans-serif';

// ---- Image-driven ASCII helper ----
// When globalImg is set, sample it to get luminance grid for ASCII effects
function getImgLum(cols,rows){
  if(!globalImg) return null;
  const oc=document.createElement('canvas');oc.width=cols;oc.height=rows;
  const ox=oc.getContext('2d');ox.drawImage(globalImg,0,0,cols,rows);
  const id=ox.getImageData(0,0,cols,rows),d=id.data;
  const lum=new Float32Array(cols*rows);
  for(let i=0;i<cols*rows;i++) lum[i]=(0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2])/255;
  return lum;
}

// ---- i18n ----
const i18n = {
  en:{params:'PARAMETERS',postfx:'POST-PROCESSING',cat_layout:'LAYOUT',cat_ascii:'ASCII ART',cat_fx:'INTERACTIVE',cat_tool:'TOOLS',
    upload_img:'📷 Upload Image',
    multicolumn:'Multi-Column',textwrap:'Text Wrap',shrinkwrap:'Shrinkwrap',accordion:'Accordion',richtext:'Rich Text',
    fluid:'Fluid Smoke',torus:'Wireframe Torus',particles:'Char Particles',matrix:'Matrix Rain',
    globe:'ASCII Globe',plasma:'Plasma',starfield:'Starfield',spiral:'Spiral',textshape:'Text Shape',
    tunnel:'ASCII Tunnel',mandelbrot:'Mandelbrot',life:'Game of Life',clock:'ASCII Clock',
    ripple:'Char Ripple',lorenz:'Lorenz Attractor',cube:'Rotating Cube',terrain:'Terrain',dna:'DNA Helix',blackhole:'Black Hole',
    wave:'Text Wave',typewriter:'Typewriter',gravity:'Gravity Text',morph:'Glitch Morph',
    img2ascii:'Image to ASCII',orbit:'Text Orbit',helix:'Text Helix',scatter:'Scatter Type',
    varasci:'Variable ASCII',editorial:'Editorial Engine',masonry:'Masonry',justify:'Justification',
    autogrow:'Auto-Grow Input',bubblewar:'Bubble Showdown',textphysics:'Text Physics',obstacle:'Obstacle Flow',
    kineflow:'Kinetic Flow',textpour:'Text Pour',breathe:'Breathing Type',fontmix:'Font Mixer',textcircle:'Circular Type',
    p_charSize:'Char Size',p_fontSize:'Font Size',p_speed:'Speed',p_color:'Color',p_chars:'Characters',
    p_count:'Count',p_size:'Size',p_intensity:'Intensity',p_scale:'Scale',p_density:'Density',
    p_arms:'Arms',p_rings:'Rings',p_trail:'Trail',p_pull:'Pull',p_length:'Length',p_strands:'Strands',
    p_spread:'Spread',p_radius:'Radius',p_tilt:'Tilt',p_amp:'Amplitude',p_freq:'Frequency',
    p_grav:'Gravity',p_chaos:'Chaos',p_glitch:'Glitch',p_maxW:'Max Width',p_lineHeight:'Line Height',
    p_cols:'Columns',p_gap:'Gap',p_n:'Sections',p_maxIter:'Iterations',p_waves:'Waves',
    p_shape:'Shape',p_ox:'Object X',p_oy:'Object Y',p_os:'Object Size',
    p_width:'Width',p_brightness:'Brightness',p_contrast:'Contrast',p_invert:'Invert',p_charset:'Charset',
    p_R:'Major R',p_r:'Minor R',p_code:'Code Color',p_tag:'Tag Color',
    pp_brightness:'Brightness',pp_contrast:'Contrast',pp_saturate:'Saturation',pp_blur:'Blur',
    pp_hue:'Hue Shift',pp_opacity:'Opacity',pp_noise:'Noise',pp_invert:'Invert'},
  zh:{params:'参数调节',postfx:'后处理',cat_layout:'排版布局',cat_ascii:'ASCII 艺术',cat_fx:'交互动效',cat_tool:'工具',
    upload_img:'📷 上传图片源',
    multicolumn:'多栏文字流',textwrap:'文字环绕',shrinkwrap:'收缩包裹',accordion:'手风琴',richtext:'富文本混排',
    fluid:'流体烟雾',torus:'线框甜甜圈',particles:'字符粒子',matrix:'矩阵雨',
    globe:'ASCII 地球',plasma:'等离子体',starfield:'星空穿越',spiral:'螺旋漩涡',textshape:'字形画',
    tunnel:'ASCII 隧道',mandelbrot:'曼德博分形',life:'生命游戏',clock:'ASCII 时钟',
    ripple:'字符涟漪',lorenz:'洛伦兹吸引子',cube:'旋转立方体',terrain:'地形生成',dna:'DNA 双螺旋',blackhole:'黑洞',
    wave:'文字波浪',typewriter:'打字机',gravity:'重力文字',morph:'故障变形',
    img2ascii:'图片转 ASCII',orbit:'文字轨道',helix:'文字螺旋',scatter:'散射文字',
    varasci:'可变排印 ASCII',editorial:'编辑引擎',masonry:'瀑布流',justify:'对齐对比',
    autogrow:'自增长输入框',bubblewar:'气泡收缩对决',textphysics:'文字物理',obstacle:'障碍绕流',
    kineflow:'动态排版流',textpour:'文字倾泻',breathe:'呼吸字体',fontmix:'字重混排',textcircle:'环形排版',
    p_charSize:'字符大小',p_fontSize:'字号',p_speed:'速度',p_color:'颜色',p_chars:'字符集',
    p_count:'数量',p_size:'尺寸',p_intensity:'强度',p_scale:'缩放',p_density:'密度',
    p_arms:'旋臂',p_rings:'环数',p_trail:'轨迹长度',p_pull:'引力',p_length:'长度',p_strands:'股数',
    p_spread:'扩散',p_radius:'半径',p_tilt:'倾斜',p_amp:'振幅',p_freq:'频率',
    p_grav:'重力',p_chaos:'混乱度',p_glitch:'故障强度',p_maxW:'最大宽度',p_lineHeight:'行高',
    p_cols:'列数',p_gap:'间距',p_n:'分区数',p_maxIter:'迭代次数',p_waves:'波数',
    p_shape:'形状',p_ox:'物体 X',p_oy:'物体 Y',p_os:'物体尺寸',
    p_width:'宽度',p_brightness:'亮度',p_contrast:'对比度',p_invert:'反色',p_charset:'字符集',
    p_R:'主半径',p_r:'副半径',p_code:'代码色',p_tag:'标签色',
    pp_brightness:'亮度',pp_contrast:'对比度',pp_saturate:'饱和度',pp_blur:'模糊',
    pp_hue:'色相偏移',pp_opacity:'不透明度',pp_noise:'噪点',pp_invert:'反色'}
};
function t(k){ return(i18n[lang]||i18n.en)[k]||k; }
function applyI18n(){ document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);}); $('#btn-lang').textContent=lang==='en'?'中文':'EN'; buildSidebar(); buildPostPanel(); }

const effects = {};
const cats = [
  {key:'cat_tool',items:['img2ascii']},
  {key:'cat_layout',items:['multicolumn','textwrap','shrinkwrap','accordion','richtext','editorial','masonry','justify','autogrow','bubblewar','obstacle']},
  {key:'cat_ascii',items:['varasci','fluid','torus','particles','matrix','globe','plasma','starfield','spiral','textshape','tunnel','mandelbrot','life','clock','ripple','lorenz','cube','terrain','dna','blackhole']},
  {key:'cat_fx',items:['wave','typewriter','gravity','morph','orbit','helix','scatter','textphysics','kineflow','textpour','breathe','fontmix','textcircle']},
];

// ---- Sidebar ----
const catCollapsed = {};
function buildSidebar(){
  const el=$('#sb-list'); el.innerHTML='';
  cats.forEach(c=>{
    const open=!catCollapsed[c.key];
    const hasActive=c.items.includes(activeKey);
    const hdr=document.createElement('div');
    hdr.className='sb-cat'+(hasActive?' sb-cat-active':'');
    hdr.innerHTML=`<span class="sb-arrow">${open?'▾':'▸'}</span> ${t(c.key)}`;
    hdr.onclick=()=>{catCollapsed[c.key]=!catCollapsed[c.key];buildSidebar();};
    el.appendChild(hdr);
    if(open) c.items.forEach(k=>{
      const btn=document.createElement('button');
      btn.className='sb-item'+(k===activeKey?' active':'');
      btn.textContent=t(k); btn.onclick=()=>activate(k);
      el.appendChild(btn);
    });
  });
}

// ---- Panel (effect params with i18n labels) ----
function buildPanel(defs){
  const body=$('#panel-body'); body.innerHTML=''; params={};
  (defs||[]).forEach(d=>{
    params[d.key]=d.value;
    const label=t('p_'+d.key)||d.label||d.key;
    const g=document.createElement('div'); g.className='pg';
    if(d.type==='range'){
      g.innerHTML=`<div class="pg-head"><span>${label}</span><span class="pg-val" id="v-${d.key}">${d.value}</span></div><input type="range" min="${d.min}" max="${d.max}" step="${d.step||1}" value="${d.value}">`;
      g.querySelector('input').oninput=e=>{params[d.key]=+e.target.value;$(`#v-${d.key}`).textContent=d.step&&d.step<1?(+e.target.value).toFixed(1):+e.target.value;if(!effects[activeKey]?.animated)draw();};
    }else if(d.type==='select'){
      g.innerHTML=`<div class="pg-head"><span>${label}</span></div><select>${d.options.map(o=>`<option${o===d.value?' selected':''}>${o}</option>`).join('')}</select>`;
      g.querySelector('select').onchange=e=>{params[d.key]=e.target.value;if(!effects[activeKey]?.animated)draw();};
    }else if(d.type==='color'){
      g.innerHTML=`<div class="pg-head"><span>${label}</span><span class="pg-val" id="v-${d.key}">${d.value}</span></div><input type="color" value="${d.value}">`;
      g.querySelector('input').oninput=e=>{params[d.key]=e.target.value;$(`#v-${d.key}`).textContent=e.target.value;if(!effects[activeKey]?.animated)draw();};
    }
    body.appendChild(g);
  });
}

// ---- Post-processing ----
const post = {brightness:0,contrast:0,saturate:0,blur:0,hue:0,opacity:100,noise:0,invert:false};
const postDefs = [
  {key:'brightness',min:-100,max:100,value:0,step:1},
  {key:'contrast',min:-100,max:100,value:0,step:1},
  {key:'saturate',min:-100,max:100,value:0,step:1},
  {key:'blur',min:0,max:10,value:0,step:0.5},
  {key:'hue',min:0,max:360,value:0,step:1},
  {key:'opacity',min:10,max:100,value:100,step:1},
  {key:'noise',min:0,max:50,value:0,step:1},
];
function buildPostPanel(){
  const body=$('#panel-post'); body.innerHTML='';
  postDefs.forEach(d=>{
    const label=t('pp_'+d.key);
    const g=document.createElement('div'); g.className='pg';
    g.innerHTML=`<div class="pg-head"><span>${label}</span><span class="pg-val" id="vp-${d.key}">${d.value}</span></div><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.value}">`;
    g.querySelector('input').oninput=e=>{post[d.key]=+e.target.value;$(`#vp-${d.key}`).textContent=d.step<1?(+e.target.value).toFixed(1):+e.target.value;applyPost();};
    body.appendChild(g);
  });
  const g=document.createElement('div'); g.className='pg';
  g.innerHTML=`<div class="pg-head"><span>${t('pp_invert')}</span></div><label style="color:var(--dim);font-size:11px;cursor:pointer"><input type="checkbox" id="post-invert" style="margin-right:4px">${lang==='zh'?'启用':'Enable'}</label>`;
  g.querySelector('input').onchange=e=>{post.invert=e.target.checked;applyPost();};
  body.appendChild(g);
}
function applyPost(){
  const f=[];
  if(post.brightness!==0) f.push(`brightness(${1+post.brightness/100})`);
  if(post.contrast!==0) f.push(`contrast(${1+post.contrast/100})`);
  if(post.saturate!==0) f.push(`saturate(${1+post.saturate/100})`);
  if(post.blur>0) f.push(`blur(${post.blur}px)`);
  if(post.hue!==0) f.push(`hue-rotate(${post.hue}deg)`);
  if(post.opacity<100) f.push(`opacity(${post.opacity/100})`);
  if(post.invert) f.push('invert(1)');
  canvas.style.filter=f.length?f.join(' '):'none';
}

// ---- Panel collapse ----
$('#toggle-fx').onclick=()=>{$('#panel-body').classList.toggle('collapsed');const a=$('#toggle-fx .sb-arrow');a.textContent=a.textContent==='▾'?'▸':'▾';};
$('#toggle-post').onclick=()=>{$('#panel-post').classList.toggle('collapsed');const a=$('#toggle-post .sb-arrow');a.textContent=a.textContent==='▾'?'▸':'▾';};

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

// ---- Topbar & events ----
$('#btn-bg').onclick=()=>{dark=!dark;document.body.classList.toggle('light',!dark);$('#btn-bg').textContent=dark?'◐':'◑';draw();};
$('#btn-lang').onclick=()=>{lang=lang==='en'?'zh':'en';applyI18n();buildPanel(effects[activeKey]?.params);};
$('#btn-export-png').onclick=()=>{const fs=canvas.style.filter;canvas.style.filter='none';requestAnimationFrame(()=>{const a=document.createElement('a');a.download='pretext-lab.png';a.href=canvas.toDataURL('image/png');a.click();canvas.style.filter=fs;});};
$('#btn-css').onclick=()=>{const css=effects[activeKey]?.css?.()||'/* No CSS */';navigator.clipboard.writeText(css).then(()=>alert('CSS copied!'));};
$('#input-text').oninput=()=>{const fx=effects[activeKey];if(fx?.init)fx.init();if(!fx?.animated)draw();};

// ---- Image upload ----
$('#input-img').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=ev=>{const img=new Image();img.onload=()=>{globalImg=img;$('#img-name').textContent=f.name;$('#btn-clear-img').hidden=false;
    const fx=effects[activeKey];if(fx?.init)fx.init();if(!fx?.animated)draw();};img.src=ev.target.result;};r.readAsDataURL(f);};
$('#btn-clear-img').onclick=()=>{globalImg=null;$('#img-name').textContent='';$('#btn-clear-img').hidden=true;$('#input-img').value='';
  const fx=effects[activeKey];if(fx?.init)fx.init();if(!fx?.animated)draw();};

// ---- ffmpeg.wasm lazy loader ----
let _ffmpeg=null,_ffmpegLoading=false;
async function getFFmpeg(){
  if(_ffmpeg) return _ffmpeg;
  if(_ffmpegLoading) {while(!_ffmpeg&&_ffmpegLoading) await new Promise(r=>setTimeout(r,300)); if(_ffmpeg)return _ffmpeg; throw new Error('FFmpeg load in progress failed');}
  _ffmpegLoading=true;
  try{
    const mod=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js');
    const util=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js');
    const ff=new mod.FFmpeg();
    ff.on('log',({message})=>console.log('[ffmpeg]',message));
    const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    await ff.load({
      coreURL:await util.toBlobURL(`${base}/ffmpeg-core.js`,'text/javascript'),
      wasmURL:await util.toBlobURL(`${base}/ffmpeg-core.wasm`,'application/wasm'),
    });
    _ffmpeg=ff;
  }catch(e){
    console.error('ffmpeg load error:',e);
    _ffmpegLoading=false;
    throw e;
  }
  return _ffmpeg;
}

// helper: record canvas for N seconds as WebM blob
function recordCanvas(seconds){
  return new Promise(resolve=>{
    const mt=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    const stream=canvas.captureStream(30);
    const rec=new MediaRecorder(stream,{mimeType:mt});
    const ch=[];rec.ondataavailable=e=>{if(e.data.size>0)ch.push(e.data);};
    rec.onstop=()=>resolve(new Blob(ch,{type:'video/webm'}));
    rec.start();setTimeout(()=>rec.stop(),seconds*1000);
  });
}

// helper: download a blob
function dlBlob(blob,name){const a=document.createElement('a');a.download=name;a.href=URL.createObjectURL(blob);a.click();}

// ---- GIF export ----
$('#btn-export-gif').onclick=async()=>{
  const btn=$('#btn-export-gif');if(btn._busy)return;btn._busy=true;
  btn.classList.add('recording');btn.textContent='⏺ 3s...';
  const webm=await recordCanvas(3);
  btn.textContent='⏳ FFmpeg...';
  try{
    const ff=await getFFmpeg();
    await ff.writeFile('in.webm',new Uint8Array(await webm.arrayBuffer()));
    btn.textContent='⏳ GIF...';
    await ff.exec(['-i','in.webm','-vf','fps=15,scale=480:-1:flags=lanczos','-loop','0','out.gif']);
    const out=await ff.readFile('out.gif');
    dlBlob(new Blob([out.buffer],{type:'image/gif'}),'pretext-lab.gif');
    await ff.deleteFile('in.webm');await ff.deleteFile('out.gif');
  }catch(e){
    console.error('GIF export error:',e);
    // fallback: download WebM
    dlBlob(webm,'pretext-lab.webm');
    alert(lang==='zh'?'GIF 编码失败，已导出 WebM 格式。\n提示：首次使用需刷新页面激活跨域隔离。':'GIF encoding failed, exported as WebM.\nTip: Refresh the page to activate cross-origin isolation.');
  }
  btn.classList.remove('recording');btn.textContent='⤓ GIF';btn._busy=false;
};

// ---- MP4 export ----
$('#btn-export-vid').onclick=async()=>{
  const btn=$('#btn-export-vid');
  if(btn._recorder){btn._recorder.stop();return;}
  btn.classList.add('recording');btn._sec=0;btn.textContent='⏹ 0s';
  const mt=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const stream=canvas.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:mt});
  const ch=[];rec.ondataavailable=e=>{if(e.data.size>0)ch.push(e.data);};
  rec.onstop=async()=>{
    clearInterval(btn._timer);btn._recorder=null;
    const webm=new Blob(ch,{type:'video/webm'});
    btn.textContent='⏳ FFmpeg...';
    try{
      const ff=await getFFmpeg();
      await ff.writeFile('in.webm',new Uint8Array(await webm.arrayBuffer()));
      btn.textContent='⏳ MP4...';
      await ff.exec(['-i','in.webm','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','out.mp4']);
      const out=await ff.readFile('out.mp4');
      dlBlob(new Blob([out.buffer],{type:'video/mp4'}),'pretext-lab.mp4');
      await ff.deleteFile('in.webm');await ff.deleteFile('out.mp4');
    }catch(e){
      console.error('MP4 export error:',e);
      dlBlob(webm,'pretext-lab.webm');
      alert(lang==='zh'?'MP4 编码失败，已导出 WebM 格式。\n提示：首次使用需刷新页面激活跨域隔离。':'MP4 encoding failed, exported as WebM.\nTip: Refresh the page to activate cross-origin isolation.');
    }
    btn.classList.remove('recording');btn.textContent='⤓ MP4';
  };
  rec.start();btn._recorder=rec;
  btn._timer=setInterval(()=>{btn._sec++;btn.textContent=`⏹ ${btn._sec}s`;},1000);
};
// ============ EFFECTS ============

// ---- Multi-Column ----
effects.multicolumn = {
  params:[
    {key:'cols',label:'Columns',type:'range',min:1,max:6,value:3},
    {key:'gap',label:'Gap',type:'range',min:10,max:80,value:30},
    {key:'fontSize',label:'Font Size',type:'range',min:10,max:36,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:48,value:22},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
  _t:0,animated:true,
  params:[
    {key:'ox',label:'Object X',type:'range',min:50,max:600,value:250},
    {key:'oy',label:'Object Y',type:'range',min:50,max:500,value:180},
    {key:'os',label:'Object Size',type:'range',min:30,max:200,value:90},
    {key:'shape',label:'Shape',type:'select',options:['circle','square','diamond'],value:'circle'},
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:28,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:16,max:40,value:22},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=.005;
    const text=txt().repeat(15),font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,
      m=40,fw=W()-m*2,ox=params.ox,oy=params.oy+Math.sin(this._t*3)*8,os=params.os;
    // draw shape
    ctx.fillStyle=dark?'#1a1a1a':'#e0e0e0';ctx.strokeStyle=dark?'#333':'#bbb';ctx.lineWidth=1;
    if(params.shape==='circle'){ctx.beginPath();ctx.arc(ox,oy,os/2,0,Math.PI*2);ctx.fill();ctx.stroke();}
    else if(params.shape==='square'){ctx.fillRect(ox-os/2,oy-os/2,os,os);ctx.strokeRect(ox-os/2,oy-os/2,os,os);}
    else{ctx.beginPath();ctx.moveTo(ox,oy-os/2);ctx.lineTo(ox+os/2,oy);ctx.lineTo(ox,oy+os/2);ctx.lineTo(ox-os/2,oy);ctx.closePath();ctx.fill();ctx.stroke();}
    // label
    ctx.fillStyle=dark?'#444':'#aaa';ctx.font='10px monospace';ctx.textBaseline='top';ctx.textAlign='center';
    ctx.fillText('float',ox,oy-os/2-14);
    ctx.fillText(`layoutNextLine()`,ox,oy+os/2+4);ctx.textAlign='left';
    // wrap text around shape
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    let y=m,rem=text;
    while(y<H()-m&&rem.length>0){
      let lw=fw,x=m;
      // check collision with shape
      const lineTop=y,lineBot=y+lh;
      if(lineBot>oy-os/2-8&&lineTop<oy+os/2+8){
        let shapeLeft,shapeRight;
        if(params.shape==='circle'){const dy=Math.abs((lineTop+lineBot)/2-oy);const dx=dy<os/2?Math.sqrt((os/2)*(os/2)-dy*dy):0;shapeLeft=ox-dx;shapeRight=ox+dx;}
        else if(params.shape==='diamond'){const dy=Math.abs((lineTop+lineBot)/2-oy);const ratio=1-dy/(os/2);shapeLeft=ox-ratio*os/2;shapeRight=ox+ratio*os/2;}
        else{shapeLeft=ox-os/2;shapeRight=ox+os/2;}
        if(shapeRight>m&&shapeLeft<m+fw){
          const indent=shapeRight+12-m;if(indent>0&&indent<fw){x=m+indent;lw=fw-indent;}
        }
      }
      let line='';for(const c of rem){if(ctx.measureText(line+c).width>lw)break;line+=c;}
      rem=rem.slice(line.length);
      // highlight narrowed lines
      if(x>m){ctx.fillStyle=dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.03)';ctx.fillRect(x-2,y,lw+4,lh);ctx.fillStyle=params.color;}
      ctx.fillText(line,x,y);y+=lh;
    }
  }
};

// ---- Shrinkwrap ----
effects.shrinkwrap = {
  params:[
    {key:'maxW',label:'Max Width',type:'range',min:100,max:800,value:400},
    {key:'fontSize',label:'Font Size',type:'range',min:12,max:36,value:18},
    {key:'lineHeight',label:'Line Height',type:'range',min:18,max:48,value:28},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:4},
    {key:'color',label:'Accent',type:'color',value:'#ffffff'},
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
    {key:'color',label:'Text',type:'color',value:'#ffffff'},
    {key:'code',label:'Code',type:'color',value:'#7ec8a0'},
    {key:'tag',label:'Tag',type:'color',value:'#ffffff'},
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:7},
    {key:'intensity',label:'Intensity',type:'range',min:1,max:10,value:5},
    {key:'chars',label:'Characters',type:'select',options:['blocks','ascii','custom'],value:'blocks'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const map={blocks:' ░▒▓█',ascii:' .:-=+*#%@',custom:' '+[...new Set([...txt()])].join('')};
    const chars=map[params.chars]||map.blocks;
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    const imgLum=getImgLum(cols,rows);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const nx=col/cols*4,ny=row/rows*4;
      let n;
      if(imgLum){n=imgLum[row*cols+col];}
      else{const v=(Math.sin(nx*2+this._t)*Math.cos(ny*3-this._t*.7)+Math.sin(nx*ny+this._t*.5)+Math.cos(nx*1.5-ny*2+this._t*1.3))/3;n=Math.pow((v+1)/2,1/params.intensity);}
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'R',label:'Major R',type:'range',min:40,max:200,value:110},
    {key:'r',label:'Minor R',type:'range',min:15,max:100,value:45},
    {key:'chars',label:'Characters',type:'select',options:['shading','custom'],value:'shading'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'chars',label:'Characters',type:'select',options:['kanji','latin','symbols','custom'],value:'kanji'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:7},
    {key:'chars',label:'Characters',type:'select',options:['katakana','chinese','custom'],value:'katakana'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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
  init(){this._ci=0;this._t=0;this._blink=0;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:52,value:24},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'maxW',label:'Max Width',type:'range',min:200,max:800,value:500},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const allChars=[...txt()],total=allChars.length;
    this._t+=params.speed*.04;
    if(this._t>1){this._t-=1;this._ci++;if(this._ci>total)this._ci=0;}
    this._blink+=.05;
    const text=allChars.slice(0,this._ci).join(''),font=`${params.fontSize}px ${FN}`,lh=params.fontSize+10;
    const{lines}=wrap(text,font,params.maxW,lh);
    const x0=(W()-params.maxW)/2,y0=H()/2-lines.length*lh/2;
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l,x0,y0+i*lh));
    // cursor: always at end of last line
    const li=lines.length-1;if(li>=0){
      const lastLine=lines[li];ctx.font=font;
      const curX=x0+ctx.measureText(lastLine).width+2;
      const curY=y0+li*lh;
      if(Math.sin(this._blink*4)>0){ctx.fillStyle=params.color;ctx.fillRect(curX,curY,2,params.fontSize);}
    }
  }
};

// ---- Gravity Text ----
effects.gravity = {
  _chars:[],_ok:false,_shattered:false,animated:true,
  init(){this._ok=false;this._shattered=false;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:18,max:64,value:36},
    {key:'grav',label:'Gravity',type:'range',min:1,max:20,value:5},
    {key:'chaos',label:'Chaos',type:'range',min:1,max:20,value:8},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const text=[...txt()],fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;
    if(!this._ok||this._chars.length!==text.length*3){
      const ws=text.map(c=>ctx.measureText(c).width);
      const tw=ws.reduce((a,b)=>a+b,0);
      let x0=(W()-tw)/2;
      this._chars=[];
      text.forEach((c,i)=>{
        // each char splits into 3 fragments
        const cx=x0+ws[i]/2,cy=H()/3;
        for(let f=0;f<3;f++){
          const offx=(f-1)*fs*.2,offy=(f===0?-1:f===1?0:1)*fs*.25;
          this._chars.push({c,x:cx+offx,y:cy+offy,vx:(Math.random()-.5)*params.chaos*.5,
            vy:-Math.random()*2,rot:0,vrot:(Math.random()-.5)*.15*params.chaos,
            a:1,frag:f,origX:cx+offx,origY:cy+offy,fallen:false,scale:f===1?1:.6+Math.random()*.3});
        }
        x0+=ws[i];
      });
      this._ok=true;this._shattered=false;
      setTimeout(()=>{this._shattered=true;},800);
    }
    const floor=H()-40,{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    this._chars.forEach(p=>{
      if(this._shattered){
        p.vy+=params.grav*.08;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;
        if(p.y>floor){p.y=floor;p.vy*=-.3;p.vx*=.9;p.vrot*=.8;
          if(Math.abs(p.vy)<.5){p.vy=0;p.fallen=true;}}
        p.a=Math.max(.15,1-(p.y/floor)*.5);
      }
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.font=`600 ${fs*p.scale}px ${FN}`;
      ctx.fillStyle=`rgba(${r},${g},${b},${p.a})`;
      ctx.fillText(p.c,0,0);ctx.restore();
    });
    ctx.textAlign='left';
    // ground line
    ctx.strokeStyle=dark?'#222':'#ddd';ctx.beginPath();ctx.moveTo(0,floor);ctx.lineTo(W(),floor);ctx.stroke();
    // reset when all fallen
    if(this._shattered&&this._chars.every(p=>p.fallen)){
      setTimeout(()=>{this._ok=false;},1500);
    }
  }
};

// ---- Glitch Morph ----
effects.morph = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:36,max:120,value:64},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'glitch',label:'Glitch',type:'range',min:1,max:30,value:10},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
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

// ---- ASCII Globe ----
effects.globe = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:16,value:8},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:4},
    {key:'chars',label:'Characters',type:'select',options:['shading','custom'],value:'shading'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.008;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const cx=cols/2,cy=rows/2,R=Math.min(cx,cy)*.75;
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):'.,-~:;=!*#$@';
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=(i-cx)/R,y=(j-cy)/(R*.5);
      if(x*x+y*y>1)continue;
      const z=Math.sqrt(1-x*x-y*y);
      const lon=Math.atan2(x,z)+this._t,lat=Math.asin(y);
      const u=lon*2,v=lat*3;
      const land=(Math.sin(u*3+v*2)+Math.sin(u*5-v*3)+Math.cos(u*2+v*5))*.33;
      const n=(z*.6+.4)*((land+1)/2);
      ctx.fillStyle=`rgba(${r},${g},${b},${n*.85+.15})`;
      ctx.fillText(chars[Math.floor(Math.max(0,Math.min(1,n))*(chars.length-1))],i*cw,j*cs);
    }
  }
};

// ---- Plasma ----
effects.plasma = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:18,value:9},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:6},
    {key:'scale',label:'Scale',type:'range',min:1,max:20,value:8},
    {key:'chars',label:'Characters',type:'select',options:['shading','custom'],value:'shading'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.012;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' .:;+=xX$&#@';const sc=params.scale*.5;
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=i/cols*sc,y=j/rows*sc,t=this._t;
      const v=(Math.sin(x*3+t)+Math.sin(y*4-t*.7)+Math.sin((x+y)*2+t*1.3)+Math.sin(Math.sqrt(x*x+y*y)*4-t))/4;
      const n=(v+1)/2;
      const hue=(n*360+this._t*30)%360;
      ctx.fillStyle=`hsla(${hue},70%,55%,${n*.7+.3})`;
      ctx.fillText(chars[Math.floor(n*(chars.length-1))],i*cw,j*cs);
    }
  }
};


// ---- Starfield ----
effects.starfield = {
  _stars:[],_ok:false,animated:true,
  params:[
    {key:'count',label:'Stars',type:'range',min:50,max:500,value:200},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:6},
    {key:'charSize',label:'Char Size',type:'range',min:6,max:18,value:10},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  init(){this._ok=false;},
  render(){
    clr();const cx=W()/2,cy=H()/2;
    if(!this._ok||this._stars.length!==params.count){
      this._stars=Array.from({length:params.count},()=>({x:(Math.random()-.5)*W()*2,y:(Math.random()-.5)*H()*2,z:Math.random()*1000}));this._ok=true;}
    const chars=params.chars==='custom'?([...new Set([...txt()])].join('')||'.+*#@'):'.+*#@';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${params.charSize}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    this._stars.forEach(s=>{s.z-=params.speed*2;if(s.z<=1){s.z=1000;s.x=(Math.random()-.5)*W()*2;s.y=(Math.random()-.5)*H()*2;}
      const sx=cx+s.x/s.z*200,sy=cy+s.y/s.z*200,br=1-s.z/1000;
      if(sx>0&&sx<W()&&sy>0&&sy<H()){ctx.fillStyle=`rgba(${r},${g},${b},${br})`;
        ctx.fillText(chars[Math.floor(br*(chars.length-1))],sx,sy);}});
    ctx.textAlign='left';
  }
};


// ---- Spiral ----
effects.spiral = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:16,value:8},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'arms',label:'Arms',type:'range',min:1,max:8,value:3},
    {key:'density',label:'Density',type:'range',min:50,max:500,value:200},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.015;
    const cx=W()/2,cy=H()/2,maxR=Math.min(cx,cy)*.85;
    const chars=params.chars==='custom'?([...new Set([...txt()])].join('')||'.+*#@$'):'.+*#@$';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${params.charSize}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    for(let a=0;a<params.arms;a++){const off=a/params.arms*Math.PI*2;
      for(let i=0;i<params.density;i++){const t=i/params.density;
        const angle=t*Math.PI*6+off+this._t;const rad=t*maxR;
        const x=cx+Math.cos(angle)*rad,y=cy+Math.sin(angle)*rad;
        const br=t*.7+.3;
        ctx.fillStyle=`rgba(${r},${g},${b},${br})`;
        ctx.fillText(chars[Math.floor(br*(chars.length-1))],x,y);}}
    ctx.textAlign='left';
  }
};


// ---- Text Shape ----
effects.textshape = {
  _pts:null,_lastText:'',_lastFs:0,_lastCs:0,
  params:[
    {key:'fontSize',label:'Shape Font',type:'range',min:60,max:300,value:150},
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  init(){this._pts=null;this._lastText='';},
  render(){
    const text=txt().slice(0,6)||'ABC';
    const cs=params.charSize;
    if(!this._pts||this._lastText!==text||this._lastFs!==params.fontSize||this._lastCs!==cs){
      // use offscreen canvas to sample text shape
      this._lastText=text;this._lastFs=params.fontSize;this._lastCs=cs;
      const fs=params.fontSize;
      const oc=document.createElement('canvas');
      oc.width=Math.ceil(W());oc.height=Math.ceil(H());
      const ox=oc.getContext('2d');
      ox.fillStyle='#000';ox.fillRect(0,0,oc.width,oc.height);
      ox.font=`900 ${fs}px ${FN}`;ox.textBaseline='middle';ox.textAlign='center';
      ox.fillStyle='#fff';ox.fillText(text,oc.width/2,oc.height/2);
      const id=ox.getImageData(0,0,oc.width,oc.height);
      this._pts=[];const step=Math.max(2,Math.floor(cs*.8));
      for(let y=0;y<id.height;y+=step)for(let x=0;x<id.width;x+=step){
        if(id.data[(y*id.width+x)*4]>128)this._pts.push({x,y});}
    }
    clr();
    const fill=[...new Set([...txt()])].join('')||'PRETEXT';
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';ctx.fillStyle=params.color;
    let ci=0;
    this._pts.forEach(p=>{ctx.fillText(fill[ci%fill.length],p.x,p.y);ci++;});
  }
};


// ---- ASCII Tunnel ----
effects.tunnel = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:16,value:8},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:6},
    {key:'rings',label:'Rings',type:'range',min:5,max:30,value:15},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.02;
    const cx=W()/2,cy=H()/2,maxR=Math.min(cx,cy);
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' .:-=+*#%@';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${params.charSize}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    for(let ring=params.rings;ring>=1;ring--){
      const t=(ring/params.rings+this._t*.1)%1;
      const rad=t*maxR;const segs=Math.floor(12+ring*3);
      const br=1-t;
      for(let s=0;s<segs;s++){const a=s/segs*Math.PI*2;
        const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*.7;
        ctx.fillStyle=`rgba(${r},${g},${b},${br})`;
        ctx.fillText(chars[Math.floor(br*(chars.length-1))],x,y);}}
    ctx.textAlign='left';
  }
};


// ---- Mandelbrot ----
effects.mandelbrot = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'speed',label:'Zoom Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'maxIter',label:'Iterations',type:'range',min:20,max:200,value:60},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.003;
    const cs=params.charSize,cw=cs*.5,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' .`-~:;=+*#%@$';
    const zoom=2+Math.sin(this._t)*.8;
    const ox=-0.745,oy=0.186;
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      let cr=ox+(i-cols/2)/(cols/2)*zoom,ci=oy+(j-rows/2)/(rows/2)*zoom*.6;
      let zr=0,zi=0,n=0;
      while(zr*zr+zi*zi<4&&n<params.maxIter){const t=zr*zr-zi*zi+cr;zi=2*zr*zi+ci;zr=t;n++;}
      if(n>=params.maxIter)continue;
      const v=n/params.maxIter;
      ctx.fillStyle=`rgba(${r},${g},${b},${v*.9+.1})`;
      ctx.fillText(chars[Math.floor(v*(chars.length-1))],i*cw,j*cs);
    }
  }
};


// ---- Game of Life ----
effects.life = {
  _grid:null,_cols:0,_rows:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:4},
    {key:'density',label:'Init Density',type:'range',min:1,max:9,value:4},
    {key:'chars',label:'Characters',type:'select',options:['blocks','custom'],value:'blocks'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  _fc:0,
  init(){this._grid=null;this._fc=0;},
  render(){
    clr();const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    if(!this._grid||this._cols!==cols||this._rows!==rows){
      this._cols=cols;this._rows=rows;
      this._grid=new Uint8Array(cols*rows);
      for(let i=0;i<cols*rows;i++)this._grid[i]=Math.random()<params.density*.1?1:0;
    }
    this._fc++;
    if(this._fc%Math.max(1,Math.round(11-params.speed))===0){
      const next=new Uint8Array(cols*rows);
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        let nb=0;
        for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){
          if(!di&&!dj)continue;
          const ni=(i+di+cols)%cols,nj=(j+dj+rows)%rows;
          nb+=this._grid[nj*cols+ni];}
        const alive=this._grid[j*cols+i];
        next[j*cols+i]=(alive&&(nb===2||nb===3))||(!alive&&nb===3)?1:0;
      }
      this._grid=next;
    }
    const chars=params.chars==='custom'?([...new Set([...txt()])].join('')||'█'):'█';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      if(this._grid[j*cols+i]){ctx.fillStyle=`rgb(${r},${g},${b})`;
        ctx.fillText(chars[(i+j)%chars.length],i*cw,j*cs);}
    }
  }
};


// ---- ASCII Clock ----
effects.clock = {
  animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:12,value:6},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const cs=params.charSize,cw=cs*.6,cx=W()/2,cy=H()/2,R=Math.min(cx,cy)*.7;
    const now=new Date(),h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds(),ms=now.getMilliseconds();
    const customCh=params.chars==='custom'?([...new Set([...txt()])].join('')||'●'):null;const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    // dial
    for(let i=0;i<60;i++){const a=(i/60)*Math.PI*2-Math.PI/2;
      const rr=i%5===0?R:R*.95;const ch=customCh?customCh[i%customCh.length]:(i%5===0?'●':'·');
      ctx.fillStyle=`rgba(${r},${g},${b},${i%5===0?1:.4})`;
      ctx.fillText(ch,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}
    // numbers
    ctx.font=`bold ${cs*2}px ${FN}`;ctx.fillStyle=params.color;
    for(let i=1;i<=12;i++){const a=(i/12)*Math.PI*2-Math.PI/2;
      ctx.fillText(i.toString(),cx+Math.cos(a)*R*.82,cy+Math.sin(a)*R*.82);}
    // hands
    const drawHand=(angle,len,ch,alpha)=>{const steps=Math.floor(len/cs);
      for(let j=0;j<steps;j++){const t=j/steps;
        ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
        ctx.fillText(ch,cx+Math.cos(angle)*len*t,cy+Math.sin(angle)*len*t);}};
    const sa=(s+ms/1000)/60*Math.PI*2-Math.PI/2;
    const ma=(m+s/60)/60*Math.PI*2-Math.PI/2;
    const ha=(h+(m/60))/12*Math.PI*2-Math.PI/2;
    drawHand(ha,R*.5,'█',1);
    drawHand(ma,R*.65,'▓',.9);
    drawHand(sa,R*.8,'·',.6);
    ctx.fillStyle=params.color;ctx.fillText('●',cx,cy);
    ctx.textAlign='left';
  }
};


// ---- Char Ripple ----
effects.ripple = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:16,value:8},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'waves',label:'Waves',type:'range',min:1,max:10,value:3},
    {key:'amp',label:'Amplitude',type:'range',min:1,max:20,value:8},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.02;
    const cs=params.charSize,cw=cs*.6,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const cx=cols/2,cy=rows/2;
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' ~≈∽∿≋';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const dx=i-cx,dy=(j-cy)*2;const dist=Math.sqrt(dx*dx+dy*dy);
      const v=(Math.sin(dist*.3-this._t*2)+Math.sin(dist*.5-this._t*1.5+1))/2;
      const n=(v+1)/2;
      const yOff=Math.sin(dist*.4-this._t*2)*params.amp*.1;
      ctx.fillStyle=`rgba(${r},${g},${b},${n*.8+.1})`;
      ctx.fillText(chars[Math.floor(n*(chars.length-1))],i*cw,j*cs+yOff);
    }
  }
};


// ---- Lorenz Attractor ----
effects.lorenz = {
  _pts:[],_ok:false,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:6},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:4},
    {key:'trail',label:'Trail',type:'range',min:100,max:3000,value:800},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  init(){this._pts=[];this._ok=false;this._x=0.1;this._y=0;this._z=0;},
  render(){
    clr();const dt=0.005*params.speed,sigma=10,rho=28,beta=8/3;
    for(let i=0;i<8;i++){
      const dx=sigma*(this._y-this._x)*dt;
      const dy=(this._x*(rho-this._z)-this._y)*dt;
      const dz=(this._x*this._y-beta*this._z)*dt;
      this._x+=dx;this._y+=dy;this._z+=dz;
      this._pts.push({x:this._x,y:this._y,z:this._z});
    }
    while(this._pts.length>params.trail)this._pts.shift();
    const chars=params.chars==='custom'?([...new Set([...txt()])].join('')||'.·:+*#@'):'.·:+*#@';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${params.charSize}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    const cx=W()/2,cy=H()/2,sc=Math.min(W(),H())/60;
    this._pts.forEach((p,i)=>{const t=i/this._pts.length;
      ctx.fillStyle=`rgba(${r},${g},${b},${t})`;
      ctx.fillText(chars[Math.floor(t*(chars.length-1))],cx+p.x*sc,cy+(p.z-25)*sc);});
    ctx.textAlign='left';
  }
};


// ---- Rotating Cube ----
effects.cube = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:4},
    {key:'size',label:'Size',type:'range',min:30,max:200,value:80},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const cs=params.charSize,cw=cs*.5,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const zb=new Float32Array(cols*rows).fill(-1e9);
    const sb=new Array(cols*rows).fill(' ');
    const cx=W()/2,cy=H()/2,sz=params.size;
    const cA=Math.cos(this._t),sA=Math.sin(this._t),cB=Math.cos(this._t*.7),sB=Math.sin(this._t*.7);
    const chars=params.chars==='custom'?([...new Set([...txt()])].join('')||'.:-=+*#@'):'.:-=+*#@';const{r,g,b}=hex2rgb(params.color);
    const project=(x0,y0,z0,ch)=>{
      const y1=y0*cA-z0*sA,z1=y0*sA+z0*cA;
      const x2=x0*cB+z1*sB,z2=-x0*sB+z1*cB;
      const sc=300/(z2+300);
      const px=Math.floor((cx+x2*sc)/cw),py=Math.floor((cy+y1*sc)/cs);
      if(px>=0&&px<cols&&py>=0&&py<rows){const i=py*cols+px;
        if(z2>zb[i]){zb[i]=z2;sb[i]=ch;}}
    };
    const step=3;
    for(let u=-sz;u<=sz;u+=step)for(let v=-sz;v<=sz;v+=step){
      project(u,v,-sz,'#');project(u,v,sz,'@');
      project(u,-sz,v,'+');project(u,sz,v,'=');
      project(-sz,u,v,':');project(sz,u,v,'*');
    }
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const idx=j*cols+i;if(zb[idx]>-1e9){
        const br=(zb[idx]+sz)/(sz*2)*.7+.3;
        ctx.fillStyle=`rgba(${r},${g},${b},${br})`;
        ctx.fillText(sb[idx],i*cw,j*cs);}
    }
  }
};


// ---- Terrain ----
effects.terrain = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'scale',label:'Scale',type:'range',min:1,max:20,value:8},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.005;
    const cs=params.charSize,cw=cs*.5,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' .·:;=+*#%@█';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const sc=params.scale*.3;const imgLum=getImgLum(cols,rows);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      let n;
      if(imgLum){n=imgLum[j*cols+i];}
      else{const nx=(i/cols)*sc+this._t,ny=(j/rows)*sc;const v=(Math.sin(nx*3+ny*2)+Math.sin(nx*5.3-ny*3.7)+Math.cos(nx*2.1+ny*4.8)+Math.sin(nx*ny*2+this._t))/4;n=(v+1)/2;}
      const h=n>.7?`rgba(${r},${g},${b},1)`:n>.5?`rgba(${r},${g},${b},.7)`:n>.3?`rgba(60,120,180,${n+.2})`:`rgba(30,80,160,${n+.3})`;
      ctx.fillStyle=h;
      ctx.fillText(chars[Math.floor(n*(chars.length-1))],i*cw,j*cs);
    }
  }
};


// ---- DNA Helix ----
effects.dna = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:6,max:18,value:10},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'length',label:'Length',type:'range',min:10,max:60,value:30},
    {key:'chars',label:'Characters',type:'select',options:['dna','custom'],value:'dna'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.02;
    const cx=W()/2,cy=H()/2,amp=Math.min(W(),H())*.25;
    const pairs=params.chars==='custom'?([...new Set([...txt()])].join('')||'ATCG'):'ATCG';
    const{r,g,b}=hex2rgb(params.color);
    ctx.font=`bold ${params.charSize}px monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
    const n=params.length;
    for(let i=0;i<n;i++){
      const t=i/n;const y=cy+(t-.5)*H()*.8;
      const phase=t*Math.PI*4+this._t;
      const x1=cx+Math.sin(phase)*amp;
      const x2=cx-Math.sin(phase)*amp;
      const z=Math.cos(phase);
      const a1=z>0?.9:.3,a2=z>0?.3:.9;
      const c1=pairs[i%pairs.length],c2=pairs[(i+2)%pairs.length];
      ctx.fillStyle=`rgba(${r},${g},${b},${a1})`;ctx.fillText(c1,x1,y);
      ctx.fillStyle=`rgba(${r},${g},${b},${a2})`;ctx.fillText(c2,x2,y);
      if(i%2===0){const steps=6;
        for(let s=1;s<steps;s++){const st=s/steps;
          const bx=x1+(x2-x1)*st;
          const ba=Math.abs(z)*.3+.1;
          ctx.fillStyle=`rgba(${r},${g},${b},${ba})`;ctx.fillText('─',bx,y);}}
    }
    ctx.textAlign='left';
  }
};


// ---- Black Hole ----
effects.blackhole = {
  _t:0,animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:4,max:14,value:7},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:5},
    {key:'pull',label:'Pull',type:'range',min:1,max:10,value:5},
    {key:'chars',label:'Characters',type:'select',options:['default','custom'],value:'default'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const cs=params.charSize,cw=cs*.5,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const cx=cols/2,cy=rows/2;
    const chars=params.chars==='custom'?(' '+[...new Set([...txt()])].join('')):' .·:;+=*#%@';const{r,g,b}=hex2rgb(params.color);
    ctx.font=`${cs}px monospace`;ctx.textBaseline='top';
    const pull=params.pull*.15;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const dx=i-cx,dy=(j-cy)*1.8;
      const dist=Math.sqrt(dx*dx+dy*dy)+.1;
      const eventH=6;
      if(dist<eventH)continue;
      const warp=pull/dist;
      const angle=Math.atan2(dy,dx)+warp+this._t*.3;
      const v=(Math.sin(angle*4+dist*.3-this._t)+1)/2;
      const fade=Math.min(1,dist/30);
      const bright=v*fade;
      // accretion disk glow
      const diskDist=Math.abs(dist-20);
      const diskGlow=diskDist<8?1-diskDist/8:0;
      const finalBr=Math.min(1,bright+diskGlow*.5);
      if(finalBr<.05)continue;
      const hue=(angle*30+this._t*20)%360;
      ctx.fillStyle=diskGlow>.1?`hsla(${hue},80%,60%,${finalBr})`:`rgba(${r},${g},${b},${finalBr})`;
      ctx.fillText(chars[Math.floor(finalBr*(chars.length-1))],i*cw,j*cs);
    }
  }
};

// ---- Text Orbit ----
effects.orbit = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:60,value:28},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:3},
    {key:'radius',label:'Radius',type:'range',min:50,max:300,value:150},
    {key:'tilt',label:'Tilt',type:'range',min:0,max:80,value:30},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.015;
    const text=[...txt()],fs=params.fontSize,cx=W()/2,cy=H()/2,R=params.radius;
    const tilt=params.tilt/90;const{r,g,b}=hex2rgb(params.color);
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';ctx.textAlign='center';
    // sort by z for depth
    const items=text.map((c,i)=>{
      const angle=i/text.length*Math.PI*2+this._t;
      const x=cx+Math.cos(angle)*R;
      const z=Math.sin(angle);
      const y=cy+z*R*tilt;
      return{c,x,y,z,angle};
    }).sort((a,b)=>a.z-b.z);
    items.forEach(p=>{
      const sc=.5+((p.z+1)/2)*.5;
      const a=.2+((p.z+1)/2)*.8;
      ctx.font=`600 ${fs*sc}px ${FN}`;
      ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillText(p.c,p.x,p.y);
    });
    ctx.textAlign='left';
  }
};

// ---- Text Helix ----
effects.helix = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:10,max:40,value:18},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:4},
    {key:'strands',label:'Strands',type:'range',min:1,max:4,value:2},
    {key:'spread',label:'Spread',type:'range',min:50,max:300,value:150},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.02;
    const text=[...txt()],fs=params.fontSize,cx=W()/2,amp=params.spread;
    const{r,g,b}=hex2rgb(params.color);
    ctx.font=`600 ${fs}px ${FN}`;ctx.textBaseline='middle';ctx.textAlign='center';
    const totalH=H()*.8,y0=H()*.1;
    for(let s=0;s<params.strands;s++){
      const phaseOff=s/params.strands*Math.PI*2;
      text.forEach((c,i)=>{
        const t=i/text.length;
        const y=y0+t*totalH;
        const phase=t*Math.PI*4+this._t+phaseOff;
        const x=cx+Math.sin(phase)*amp;
        const z=Math.cos(phase);
        const a=z>0?.9:.25;
        const sc=.6+((z+1)/2)*.4;
        ctx.font=`600 ${fs*sc}px ${FN}`;
        ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
        ctx.fillText(c,x,y);
      });
    }
    ctx.textAlign='left';
  }
};

// ---- Scatter Type ----
effects.scatter = {
  _chars:[],_ok:false,_phase:0,animated:true,
  init(){this._ok=false;this._phase=0;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:18,max:64,value:32},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:20,value:4},
    {key:'spread',label:'Spread',type:'range',min:50,max:400,value:200},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const text=[...txt()],fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;
    if(!this._ok||this._chars.length!==text.length){
      const ws=text.map(c=>ctx.measureText(c).width);
      const tw=ws.reduce((a,b)=>a+b,0);
      let x=(W()-tw)/2;
      this._chars=text.map((c,i)=>{
        const homeX=x+ws[i]/2,homeY=H()/2;
        const angle=Math.random()*Math.PI*2,dist=params.spread*(0.5+Math.random());
        x+=ws[i];
        return{c,homeX,homeY,scatterX:homeX+Math.cos(angle)*dist,scatterY:homeY+Math.sin(angle)*dist,
          rot:(Math.random()-.5)*2,w:ws[i]};
      });
      this._ok=true;this._phase=0;
    }
    this._phase+=params.speed*.008;
    const cycle=this._phase%2;// 0-1: gather, 1-2: scatter
    const t=cycle<1?cycle:2-cycle;// 0→1→0 eased
    const ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    const{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    this._chars.forEach(p=>{
      const x=p.scatterX+(p.homeX-p.scatterX)*ease;
      const y=p.scatterY+(p.homeY-p.scatterY)*ease;
      const rot=p.rot*(1-ease);
      const a=.3+ease*.7;
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);
      ctx.font=`600 ${fs}px ${FN}`;
      ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillText(p.c,0,0);ctx.restore();
    });
    ctx.textAlign='left';
  }
};

// ---- Image to ASCII ----
effects.img2ascii = {
  params:[
    {key:'width',label:'ASCII Width',type:'range',min:40,max:200,value:100},
    {key:'brightness',label:'Brightness',type:'range',min:-100,max:100,value:0},
    {key:'contrast',label:'Contrast',type:'range',min:-100,max:100,value:0},
    {key:'invert',label:'Invert',type:'select',options:['no','yes'],value:'no'},
    {key:'charset',label:'Charset',type:'select',options:['detailed','standard','blocks','binary','custom'],value:'detailed'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();
    if(!globalImg){ctx.fillStyle=params.color;ctx.font=`14px ${FN}`;ctx.textBaseline='middle';ctx.textAlign='center';
      ctx.fillText(lang==='zh'?'请先在左侧上传图片':'Upload an image from the left panel first',W()/2,H()/2);
      ctx.fillStyle=dark?'#444':'#aaa';ctx.font=`11px ${FN}`;
      ctx.fillText(lang==='zh'?'点击「📷 上传图片源」按钮':'Click the "📷 Upload Image" button',W()/2,H()/2+22);
      ctx.textAlign='left';return;}
    const img=globalImg,aw=params.width,ar=0.55,ah=Math.round((img.height/img.width)*aw*ar);
    const oc=document.createElement('canvas');oc.width=aw;oc.height=ah;
    const ox=oc.getContext('2d');ox.drawImage(img,0,0,aw,ah);
    const id=ox.getImageData(0,0,aw,ah),d=id.data;
    const gradients={detailed:"$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
      standard:"@%#*+=-:. ",blocks:"█▓▒░ ",binary:"01",custom:([...new Set([...txt()])].join('')||'@')+" "};
    const grad=gradients[params.charset]||gradients.detailed;const nL=grad.length;
    const cf=(259*(params.contrast+255))/(255*(259-params.contrast));
    let ascii='';
    for(let y=0;y<ah;y++){let line='';for(let x=0;x<aw;x++){const i=(y*aw+x)*4;
      let lum=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
      if(params.invert==='yes')lum=255-lum;
      lum=Math.max(0,Math.min(255,cf*(lum-128)+128+params.brightness));
      line+=grad[Math.round((lum/255)*(nL-1))];}ascii+=line+'\n';}
    const cs=Math.min(Math.floor(W()/aw),Math.floor(H()/(ah*1.1)),14);
    ctx.font=`${Math.max(3,cs)}px monospace`;ctx.textBaseline='top';ctx.fillStyle=params.color;
    const lines=ascii.split('\n');const lh=Math.max(3,cs);
    const x0=Math.max(0,(W()-aw*cs*.6)/2),y0=Math.max(0,(H()-ah*lh)/2);
    for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x0,y0+i*lh);
  }
};

// ---- Variable Typographic ASCII (inspired by chenglou.me/pretext/variable-typographic-ascii) ----
effects.varasci = {
  _t:0,_particles:[],_attractors:[],animated:true,
  params:[
    {key:'charSize',label:'Char Size',type:'range',min:5,max:16,value:8},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'count',label:'Count',type:'range',min:20,max:200,value:80},
    {key:'chars',label:'Characters',type:'select',options:['shading','custom'],value:'shading'},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  init(){
    this._particles=Array.from({length:200},()=>({x:Math.random()*800,y:Math.random()*600,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,life:Math.random()}));
    this._attractors=[{x:200,y:200,s:120},{x:500,y:300,s:80}];
  },
  render(){
    clr();this._t+=params.speed*.008;
    const cs=params.charSize,cw=cs*.55,cols=Math.floor(W()/cw),rows=Math.floor(H()/cs);
    const field=new Float32Array(cols*rows);
    // update particles
    this._particles.forEach(p=>{
      this._attractors.forEach(a=>{const dx=a.x-p.x,dy=a.y-p.y,d=Math.sqrt(dx*dx+dy*dy)+1;p.vx+=dx/d*.3;p.vy+=dy/d*.3;});
      p.vx*=.95;p.vy*=.95;p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W())p.vx*=-1;if(p.y<0||p.y>H())p.vy*=-1;
      const ci=Math.floor(p.x/cw),ri=Math.floor(p.y/cs);
      if(ci>=0&&ci<cols&&ri>=0&&ri<rows){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const ni=ci+dx,nj=ri+dy;if(ni>=0&&ni<cols&&nj>=0&&nj<rows){const d=Math.sqrt(dx*dx+dy*dy);field[nj*cols+ni]+=Math.max(0,1-d/3);}}}
    });
    // update attractors
    this._attractors.forEach((a,i)=>{a.x=W()/2+Math.sin(this._t+i*2)*W()*.3;a.y=H()/2+Math.cos(this._t*1.3+i)*H()*.3;});
    // normalize
    let mx=0;for(let i=0;i<field.length;i++)if(field[i]>mx)mx=field[i];
    if(mx>0)for(let i=0;i<field.length;i++)field[i]/=mx;
    // render proportional panel
    const map={shading:'.,-~:;=!*#$@',custom:[...new Set([...txt()])].join('')||'@#*=:.'};
    const chars=map[params.chars]||map.shading;
    const{r,g,b}=hex2rgb(params.color);
    // left half: proportional (Georgia)
    const hw=Math.floor(cols/2);
    ctx.textBaseline='top';
    for(let j=0;j<rows;j++)for(let i=0;i<hw;i++){
      const v=field[j*cols+i];if(v<.02)continue;
      const ci=Math.floor(v*(chars.length-1));
      ctx.font=v>.6?`bold ${cs}px Georgia`:v>.3?`italic ${cs}px Georgia`:`${cs}px Georgia`;
      ctx.fillStyle=`rgba(${r},${g},${b},${v})`;
      ctx.fillText(chars[ci],i*cw,j*cs);
    }
    // right half: monospace
    for(let j=0;j<rows;j++)for(let i=hw;i<cols;i++){
      const v=field[j*cols+i];if(v<.02)continue;
      const ci=Math.floor(v*(chars.length-1));
      ctx.font=`${cs}px monospace`;
      ctx.fillStyle=`rgba(${r},${g},${b},${v})`;
      ctx.fillText(chars[ci],i*cw,j*cs);
    }
    // divider
    ctx.strokeStyle=dark?'#333':'#ccc';ctx.beginPath();ctx.moveTo(W()/2,0);ctx.lineTo(W()/2,H());ctx.stroke();
    ctx.fillStyle=dark?'#555':'#999';ctx.font='10px monospace';ctx.textBaseline='top';
    ctx.fillText('PROPORTIONAL',10,6);ctx.fillText('MONOSPACE',W()/2+10,6);
  }
};

// ---- Editorial Engine (inspired by chenglou.me/pretext/editorial-engine) ----
effects.editorial = {
  _t:0,_orbs:[],animated:true,
  init(){this._orbs=[{x:W()*.3,y:H()*.3,r:60,vx:1.2,vy:0.8},{x:W()*.7,y:H()*.6,r:45,vx:-0.9,vy:1.1}];},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:24,value:14},
    {key:'lineHeight',label:'Line Height',type:'range',min:16,max:36,value:21},
    {key:'cols',label:'Columns',type:'range',min:1,max:3,value:2},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const m=30,font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,text=txt().repeat(20);
    const tw=W()-m*2,cw=(tw-(params.cols-1)*20)/params.cols;
    // move orbs
    this._orbs.forEach(o=>{
      o.x+=o.vx*params.speed;o.y+=o.vy*params.speed;
      if(o.x-o.r<0||o.x+o.r>W()){o.vx*=-1;}
      if(o.y-o.r<0||o.y+o.r>H()){o.vy*=-1;}
      // draw orb
      const grd=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
      grd.addColorStop(0,dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.05)');
      grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=dark?'#333':'#ccc';ctx.stroke();
    });
    // flow text around orbs in columns
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    let rem=text;
    for(let c=0;c<params.cols&&rem.length>0;c++){
      const cx=m+c*(cw+20);let y=m;
      while(y<H()-m&&rem.length>0){
        let lw=cw,x=cx;
        // check orb collision
        this._orbs.forEach(o=>{
          if(y+lh>o.y-o.r&&y<o.y+o.r){
            const dy=Math.abs(y+lh/2-o.y);
            if(dy<o.r){const dx=Math.sqrt(o.r*o.r-dy*dy);
              const orbL=o.x-dx,orbR=o.x+dx;
              if(orbL>cx&&orbL<cx+cw){lw=orbL-cx-8;if(lw<30)lw=cw;}
              else if(orbR>cx&&orbR<cx+cw){x=orbR+8;lw=cx+cw-orbR-8;if(lw<30){x=cx;lw=cw;}}
            }
          }
        });
        let line='';for(const ch of rem){if(ctx.measureText(line+ch).width>lw)break;line+=ch;}
        rem=rem.slice(line.length);ctx.fillText(line,x,y);y+=lh;
      }
      // column divider
      if(c<params.cols-1){ctx.strokeStyle=dark?'#1a1a1a':'#eee';ctx.beginPath();ctx.moveTo(cx+cw+10,m);ctx.lineTo(cx+cw+10,H()-m);ctx.stroke();}
    }
  }
};

// ---- Masonry (inspired by chenglou.me/pretext/masonry) ----
effects.masonry = {
  _cards:null,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:10,max:18,value:12},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:28,value:18},
    {key:'cols',label:'Columns',type:'range',min:2,max:5,value:3},
    {key:'gap',label:'Gap',type:'range',min:4,max:20,value:8},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  init(){this._cards=null;},
  render(){
    clr();
    const texts=[
      'Pretext 可以在不触发 DOM 回流的情况下精确计算文本高度。',
      'prepare() does the one-time work: normalize whitespace, segment the text, apply glue rules.',
      '支持所有语言：中文、日文、阿拉伯文、emoji 🚀，甚至混合双向文本。',
      'layout() is the cheap hot path: pure arithmetic over cached widths.',
      '实现真正的虚拟列表，不需要先渲染再测量。0.09ms 搞定 500 条。',
      'The returned height is the crucial last piece for unlocking web UI\'s.',
      '文字环绕浮动元素：逐行设置不同宽度，layoutNextLine() 一行一行来。',
      'walkLineRanges() gives you line widths and cursors without building text strings.',
      '收缩包裹：找到最紧凑的容器宽度，CSS 做不到的事。',
      'Zero layout reflow. You could shrinkwrap 10,000 bubbles and the browser wouldn\'t blink.',
      txt().slice(0,80)||'Custom text goes here.',
      '可以渲染到 Canvas、SVG、WebGL，甚至服务端。',
    ];
    const font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,gap=params.gap,nc=params.cols;
    const m=20,totalW=W()-m*2,colW=(totalW-(nc-1)*gap)/nc;
    const colH=new Array(nc).fill(m);
    ctx.font=font;
    const{r,g,b}=hex2rgb(params.color);
    texts.forEach((text,ti)=>{
      // find shortest column
      let minC=0;for(let c=1;c<nc;c++)if(colH[c]<colH[minC])minC=c;
      const x=m+minC*(colW+gap),y=colH[minC];
      const{lines}=wrap(text,font,colW-16,lh);
      const cardH=lines.length*lh+16;
      // card bg
      ctx.fillStyle=dark?'#141414':'#f8f8f8';
      ctx.beginPath();ctx.roundRect(x,y,colW,cardH,6);ctx.fill();
      ctx.strokeStyle=dark?'#222':'#e0e0e0';ctx.stroke();
      // text
      ctx.fillStyle=`rgba(${r},${g},${b},.85)`;ctx.font=font;ctx.textBaseline='top';
      lines.forEach((l,li)=>ctx.fillText(l,x+8,y+8+li*lh));
      colH[minC]=y+cardH+gap;
    });
  }
};

// ---- Justification Comparison (inspired by chenglou.me/pretext/justification) ----
effects.justify = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:12,max:24,value:15},
    {key:'lineHeight',label:'Line Height',type:'range',min:16,max:36,value:22},
    {key:'maxW',label:'Max Width',type:'range',min:150,max:400,value:260},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();
    const text=txt().repeat(3)||'The quick brown fox jumps over the lazy dog. '.repeat(5);
    const font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,mw=params.maxW;
    const{r,g,b}=hex2rgb(params.color);
    const modes=['Left','Center','Justify'];
    const gap=30,totalW=modes.length*mw+(modes.length-1)*gap;
    const x0=(W()-totalW)/2,y0=40;
    ctx.font=font;
    modes.forEach((mode,mi)=>{
      const bx=x0+mi*(mw+gap);
      // header
      ctx.fillStyle=dark?'#555':'#999';ctx.font='10px monospace';ctx.textBaseline='top';
      ctx.fillText(mode.toUpperCase(),bx,y0-16);
      // border
      ctx.strokeStyle=dark?'#222':'#ddd';ctx.strokeRect(bx,y0,mw,H()-y0*2);
      // wrap text
      ctx.font=font;
      const{lines}=wrap(text,font,mw-16,lh);
      ctx.textBaseline='top';
      lines.forEach((line,li)=>{
        if(li*lh+y0+8>H()-y0)return;
        const tw=ctx.measureText(line).width;
        if(mode==='Left'){
          ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillText(line,bx+8,y0+8+li*lh);
        }else if(mode==='Center'){
          ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillText(line,bx+8+(mw-16-tw)/2,y0+8+li*lh);
        }else{
          // justify: spread words
          const words=line.split(/\s+/);
          if(words.length<=1||li===lines.length-1){ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillText(line,bx+8,y0+8+li*lh);return;}
          const wordsW=words.map(w=>ctx.measureText(w).width);
          const totalWordsW=wordsW.reduce((a,b)=>a+b,0);
          const extraSpace=(mw-16-totalWordsW)/(words.length-1);
          let wx=bx+8;
          ctx.fillStyle=`rgb(${r},${g},${b})`;
          words.forEach((w,wi)=>{ctx.fillText(w,wx,y0+8+li*lh);wx+=wordsW[wi]+extraSpace;});
        }
      });
    });
  }
};

// ---- Auto-Grow Input ----
effects.autogrow = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:12,max:36,value:16},
    {key:'lineHeight',label:'Line Height',type:'range',min:16,max:48,value:24},
    {key:'maxW',label:'Max Width',type:'range',min:150,max:600,value:400},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const text=txt(),font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,mw=params.maxW;
    const{lines,height}=wrap(text,font,mw,lh);
    const pad=12,bw=mw+pad*2,bh=height+pad*2;
    const bx=(W()-bw)/2,by=(H()-bh)/2;
    // textarea box
    ctx.fillStyle=dark?'#141414':'#fafafa';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();
    ctx.strokeStyle=dark?'#333':'#ccc';ctx.stroke();
    // text
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l,bx+pad,by+pad+i*lh));
    // cursor
    const last=lines[lines.length-1]||'';
    ctx.fillStyle=params.color;ctx.globalAlpha=Math.sin(Date.now()*.005)>.0?1:0;
    ctx.fillRect(bx+pad+ctx.measureText(last).width+2,by+pad+(lines.length-1)*lh,2,params.fontSize);
    ctx.globalAlpha=1;
    // metrics
    ctx.fillStyle=dark?'#555':'#999';ctx.font='10px monospace';ctx.textBaseline='top';
    ctx.fillText(`height: ${Math.round(height)}px | lines: ${lines.length} | width: ${mw}px`,bx,by+bh+8);
    ctx.fillText(lang==='zh'?'← 高度由 pretext 纯算术预测，无 DOM 回流':'← Height predicted by pretext, zero DOM reflow',bx,by+bh+22);
    // animated resize indicator
    ctx.setLineDash([3,3]);ctx.strokeStyle=dark?'#333':'#bbb';
    ctx.strokeRect(bx-4,by-4,bw+8,bh+8);ctx.setLineDash([]);
  }
};

// ---- Bubble Showdown (CSS fit-content vs pretext shrinkwrap) ----
effects.bubblewar = {
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:20,value:13},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:30,value:19},
    {key:'maxW',label:'Max Width',type:'range',min:150,max:500,value:280},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,mw=params.maxW;
    const msgs=[txt().slice(0,60)||'Hey, did you see the new Pretext library?',
      'It measures text without the DOM. Pure JavaScript arithmetic.',
      '支持中文、韩文、阿拉伯文、emoji 🚀 全部搞定。',
      'The shrinkwrap demo is wild — CSS can\'t do that.'];
    const gap=40,colW=(W()-gap*3)/2;
    // Left: CSS fit-content simulation
    ctx.fillStyle=dark?'#555':'#999';ctx.font='10px monospace';ctx.textBaseline='top';
    ctx.fillText('CSS fit-content',gap,20);
    ctx.fillText('Pretext shrinkwrap',gap*2+colW,20);
    let ly=40,ry=40;
    msgs.forEach((msg,mi)=>{
      ctx.font=font;
      const{lines}=wrap(msg,font,mw,lh);
      // CSS: width = widest line
      let maxLW=0;lines.forEach(l=>{const w=ctx.measureText(l).width;if(w>maxLW)maxLW=w;});
      const cssBW=Math.min(maxLW+20,colW);
      const cssH=lines.length*lh+16;
      // draw CSS bubble
      const cx1=mi%2===0?gap:gap+colW-cssBW;
      ctx.fillStyle=mi%2===0?(dark?'#1a1a1a':'#f0f0f0'):(dark?'#1a1810':'#fdf8f0');
      ctx.beginPath();ctx.roundRect(cx1,ly,cssBW,cssH,8);ctx.fill();
      ctx.font=font;ctx.fillStyle=`rgba(${hex2rgb(params.color).r},${hex2rgb(params.color).g},${hex2rgb(params.color).b},.85)`;ctx.textBaseline='top';
      lines.forEach((l,li)=>ctx.fillText(l,cx1+10,ly+8+li*lh));
      // wasted pixels indicator
      const lastW=ctx.measureText(lines[lines.length-1]).width;
      const waste=Math.round(cssBW-10-lastW);
      if(waste>20){ctx.fillStyle='rgba(255,80,80,.15)';ctx.fillRect(cx1+10+lastW,ly+8+(lines.length-1)*lh,waste,lh);
        ctx.fillStyle='rgba(255,80,80,.5)';ctx.font='8px monospace';ctx.fillText(`${waste}px`,cx1+10+lastW+2,ly+8+(lines.length-1)*lh);}
      ly+=cssH+8;
      // Pretext: binary search tightest width
      let lo=params.fontSize*2,hi=mw,best=mw;
      const targetLines=lines.length;
      while(lo<=hi){const mid=Math.floor((lo+hi)/2);const{lines:tl}=wrap(msg,font,mid,lh);
        if(tl.length<=targetLines){best=mid;hi=mid-1;}else lo=mid+1;}
      const ptBW=best+20;
      const ptH=lines.length*lh+16;
      const cx2=mi%2===0?gap*2+colW:gap*2+colW*2-ptBW;
      ctx.fillStyle=mi%2===0?(dark?'#1a1a1a':'#f0f0f0'):(dark?'#1a1810':'#fdf8f0');
      ctx.beginPath();ctx.roundRect(cx2,ry,ptBW,ptH,8);ctx.fill();
      ctx.font=font;ctx.fillStyle=`rgba(${hex2rgb(params.color).r},${hex2rgb(params.color).g},${hex2rgb(params.color).b},.85)`;ctx.textBaseline='top';
      const{lines:ptLines}=wrap(msg,font,best,lh);
      ptLines.forEach((l,li)=>ctx.fillText(l,cx2+10,ry+8+li*lh));
      ry+=ptH+8;
    });
  }
};

// ---- Obstacle Flow (text flowing around multiple obstacles) ----
effects.obstacle = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:11,max:22,value:14},
    {key:'lineHeight',label:'Line Height',type:'range',min:14,max:32,value:20},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const text=txt().repeat(20),font=`${params.fontSize}px ${FN}`,lh=params.lineHeight,m=30,fw=W()-m*2;
    // 3 moving obstacles
    const obs=[
      {x:W()*.25+Math.sin(this._t)*60,y:H()*.25+Math.cos(this._t*1.3)*40,r:50},
      {x:W()*.65+Math.cos(this._t*.8)*50,y:H()*.5+Math.sin(this._t*1.1)*50,r:40},
      {x:W()*.4+Math.sin(this._t*1.5)*70,y:H()*.75+Math.cos(this._t*.7)*30,r:35},
    ];
    // draw obstacles
    obs.forEach((o,i)=>{
      const grd=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
      grd.addColorStop(0,`hsla(${i*120+this._t*20},60%,50%,.15)`);grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=`hsla(${i*120+this._t*20},60%,50%,.3)`;ctx.stroke();
    });
    // flow text
    ctx.font=font;ctx.fillStyle=params.color;ctx.textBaseline='top';
    let y=m,rem=text;
    while(y<H()-m&&rem.length>0){
      let lw=fw,x=m;
      // check all obstacles
      obs.forEach(o=>{
        if(y+lh>o.y-o.r-4&&y<o.y+o.r+4){
          const dy=Math.abs(y+lh/2-o.y);
          if(dy<o.r){const dx=Math.sqrt(o.r*o.r-dy*dy);
            const oL=o.x-dx,oR=o.x+dx;
            if(oR>x&&oL<x+lw){
              if(oL-x>x+lw-oR){lw=oL-x-6;}
              else{const newX=oR+6;lw-=(newX-x);x=newX;}
            }
          }
        }
      });
      if(lw<20){y+=lh;continue;}
      let line='';for(const c of rem){if(ctx.measureText(line+c).width>lw)break;line+=c;}
      rem=rem.slice(line.length);ctx.fillText(line,x,y);y+=lh;
    }
  }
};

// ---- Text Physics (letters with gravity, collision, bounce) ----
effects.textphysics = {
  _chars:[],_ok:false,animated:true,
  init(){this._ok=false;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:18,max:60,value:32},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'grav',label:'Gravity',type:'range',min:0,max:20,value:5},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();const text=[...txt()],fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;
    if(!this._ok||this._chars.length!==text.length){
      const ws=text.map(c=>ctx.measureText(c).width);
      const tw=ws.reduce((a,b)=>a+b,0);
      let x=(W()-tw)/2;
      this._chars=text.map((c,i)=>{
        const cx=x+ws[i]/2;x+=ws[i];
        return{c,x:cx,y:H()/3,vx:(Math.random()-.5)*8*params.speed,vy:(Math.random()-1)*6*params.speed,
          w:ws[i],rot:0,vrot:(Math.random()-.5)*.2,grounded:false};
      });
      this._ok=true;
    }
    const floor=H()-30,{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    // physics step
    this._chars.forEach(p=>{
      if(!p.grounded){
        p.vy+=params.grav*.15;p.vx*=.995;
        p.x+=p.vx*params.speed*.3;p.y+=p.vy*params.speed*.3;p.rot+=p.vrot*params.speed;
        // floor
        if(p.y+fs/2>floor){p.y=floor-fs/2;p.vy*=-.4;p.vrot*=.7;
          if(Math.abs(p.vy)<1){p.vy=0;p.vx*=.9;p.vrot*=.5;if(Math.abs(p.vx)<.3)p.grounded=true;}}
        // walls
        if(p.x<fs/2){p.x=fs/2;p.vx*=-.6;}
        if(p.x>W()-fs/2){p.x=W()-fs/2;p.vx*=-.6;}
      }
      // char-char collision (simple)
      this._chars.forEach(q=>{if(p===q)return;
        const dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<fs*.6&&d>0){const nx=dx/d,ny=dy/d;const push=.5;p.vx+=nx*push;p.vy+=ny*push;q.vx-=nx*push;q.vy-=ny*push;}
      });
      const a=p.grounded?.6:1;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.font=`600 ${fs}px ${FN}`;ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillText(p.c,0,0);ctx.restore();
    });
    ctx.textAlign='left';
    // floor
    ctx.strokeStyle=dark?'#222':'#ddd';ctx.beginPath();ctx.moveTo(0,floor);ctx.lineTo(W(),floor);ctx.stroke();
    // auto reset
    if(this._chars.every(p=>p.grounded)){setTimeout(()=>{this._ok=false;},2000);}
  }
};

// ---- Kinetic Flow (inspired by @antonin.work — text reflows with animated width) ----
effects.kineflow = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:48,value:24},
    {key:'lineHeight',label:'Line Height',type:'range',min:18,max:60,value:34},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.008;
    const text=txt(),font=`600 ${params.fontSize}px ${FN}`,lh=params.lineHeight;
    const minW=120,maxW=Math.min(W()-60,600);
    const w=minW+(maxW-minW)*((Math.sin(this._t)+1)/2);
    const{lines}=wrap(text,font,w,lh);
    const bx=(W()-w)/2,by=(H()-lines.length*lh)/2;
    // animated container
    ctx.strokeStyle=dark?'#333':'#ccc';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.strokeRect(bx-8,by-8,w+16,lines.length*lh+16);ctx.setLineDash([]);
    // text with per-line fade
    ctx.font=font;ctx.textBaseline='top';
    const{r,g,b}=hex2rgb(params.color);
    lines.forEach((l,i)=>{
      const a=.4+.6*Math.sin(i*.5+this._t*3)*.5+.5;
      ctx.fillStyle=`rgba(${r},${g},${b},${Math.max(.3,a)})`;
      ctx.fillText(l,bx,by+i*lh);
    });
    // width indicator
    ctx.fillStyle=dark?'#444':'#aaa';ctx.font='10px monospace';ctx.textBaseline='top';
    ctx.fillText(`${Math.round(w)}px`,bx,by+lines.length*lh+14);
  }
};

// ---- Text Pour (inspired by @lucas__crespo — text pouring down like liquid) ----
effects.textpour = {
  _t:0,_chars:[],_ok:false,animated:true,
  init(){this._ok=false;this._t=0;},
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:48,value:22},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:3},
    {key:'spread',label:'Spread',type:'range',min:10,max:200,value:80},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.02;
    const text=[...txt()],fs=params.fontSize;
    ctx.font=`600 ${fs}px ${FN}`;
    if(!this._ok){
      const ws=text.map(c=>ctx.measureText(c).width);
      const tw=ws.reduce((a,b)=>a+b,0);
      let x=(W()-tw)/2;
      this._chars=text.map((c,i)=>{
        const homeX=x+ws[i]/2,homeY=H()/2;
        x+=ws[i];
        return{c,homeX,homeY,x:homeX,y:-fs-Math.random()*H(),vy:0,delay:i*.08,w:ws[i],arrived:false};
      });
      this._ok=true;
    }
    const{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    this._chars.forEach(p=>{
      if(this._t>p.delay&&!p.arrived){
        p.vy+=.4*params.speed;
        p.y+=p.vy;
        p.x=p.homeX+Math.sin(p.y*.02)*params.spread*.3;
        if(p.y>=p.homeY){p.y=p.homeY;p.x=p.homeX;p.vy=0;p.arrived=true;}
      }
      const a=p.arrived?1:Math.min(1,(p.y+H())/(H()));
      ctx.font=`600 ${fs}px ${FN}`;
      ctx.fillStyle=`rgba(${r},${g},${b},${Math.max(.1,a)})`;
      ctx.fillText(p.c,p.x,p.y);
    });
    ctx.textAlign='left';
    if(this._chars.every(p=>p.arrived)){setTimeout(()=>{this._ok=false;this._t=0;},2000);}
  }
};

// ---- Breathing Type (inspired by @contemporarytype — font weight oscillates) ----
effects.breathe = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:24,max:100,value:52},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.015;
    const text=[...txt()],fs=params.fontSize;
    const{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    const cx=W()/2,cy=H()/2;
    // measure total width at normal weight
    ctx.font=`400 ${fs}px ${FN}`;
    const ws=text.map(c=>ctx.measureText(c).width);
    const tw=ws.reduce((a,b)=>a+b,0);
    let x=cx-tw/2;
    text.forEach((c,i)=>{
      const phase=this._t+i*.3;
      const breath=(Math.sin(phase)+1)/2; // 0-1
      const weight=Math.round(100+breath*800); // 100-900
      const scale=.85+breath*.3;
      const a=.4+breath*.6;
      ctx.save();
      ctx.translate(x+ws[i]/2,cy);
      ctx.scale(1,scale);
      ctx.font=`${weight} ${fs}px ${FN}`;
      ctx.textAlign='center';
      ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillText(c,0,0);
      ctx.restore();
      x+=ws[i];
    });
    ctx.textAlign='left';
  }
};

// ---- Font Mixer (inspired by @antonin.work — each line different weight/style) ----
effects.fontmix = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:14,max:40,value:20},
    {key:'lineHeight',label:'Line Height',type:'range',min:18,max:50,value:28},
    {key:'maxW',label:'Max Width',type:'range',min:200,max:700,value:450},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const text=txt().repeat(5),fs=params.fontSize,lh=params.lineHeight,mw=params.maxW;
    const styles=['100','300','400','600','700','900'];
    const italics=[false,true,false,false,true,false];
    const{r,g,b}=hex2rgb(params.color);
    // wrap with base font
    ctx.font=`${fs}px ${FN}`;
    const{lines}=wrap(text,`${fs}px ${FN}`,mw,lh);
    const x0=(W()-mw)/2,y0=(H()-lines.length*lh)/2;
    ctx.textBaseline='top';
    lines.forEach((l,i)=>{
      const si=Math.floor((i+this._t*2)%styles.length);
      const italic=italics[si]?'italic ':'';
      ctx.font=`${italic}${styles[si]} ${fs}px ${FN}`;
      const a=.5+.5*Math.sin(i*.7+this._t*3);
      ctx.fillStyle=`rgba(${r},${g},${b},${Math.max(.3,a)})`;
      ctx.fillText(l,x0,y0+i*lh);
    });
  }
};

// ---- Circular Type (inspired by @jaymehoffman — text arranged in a circle) ----
effects.textcircle = {
  _t:0,animated:true,
  params:[
    {key:'fontSize',label:'Font Size',type:'range',min:10,max:36,value:16},
    {key:'radius',label:'Radius',type:'range',min:50,max:300,value:150},
    {key:'speed',label:'Speed',type:'range',min:0.1,step:0.1,max:10,value:2},
    {key:'rings',label:'Rings',type:'range',min:1,max:5,value:3},
    {key:'color',label:'Color',type:'color',value:'#ffffff'},
  ],
  render(){
    clr();this._t+=params.speed*.01;
    const text=[...txt()],fs=params.fontSize,cx=W()/2,cy=H()/2;
    const{r,g,b}=hex2rgb(params.color);
    ctx.textBaseline='middle';ctx.textAlign='center';
    for(let ring=0;ring<params.rings;ring++){
      const R=params.radius+ring*fs*2.2;
      const dir=ring%2===0?1:-1;
      const circumference=2*Math.PI*R;
      const charAngle=fs*.7/R;
      const totalChars=Math.min(text.length*3,Math.floor(circumference/(fs*.6)));
      for(let i=0;i<totalChars;i++){
        const angle=i*charAngle*dir+this._t*dir*(1+ring*.3);
        const x=cx+Math.cos(angle)*R;
        const y=cy+Math.sin(angle)*R;
        const ch=text[i%text.length];
        const a=.3+.7*((Math.sin(angle+this._t)+1)/2);
        ctx.save();ctx.translate(x,y);ctx.rotate(angle+Math.PI/2*dir);
        ctx.font=`${fs}px ${FN}`;
        ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
        ctx.fillText(ch,0,0);ctx.restore();
      }
    }
    ctx.textAlign='left';
  }
};

// ============ BOOT ============
activeKey='wave';
buildSidebar();
buildPanel(effects.wave.params);
applyI18n();
activate('wave');


buildPostPanel();

})();