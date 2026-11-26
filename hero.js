import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id);
const hero=$('hero');
const goTab=k=>{if(window.showTab)window.showTab(k)};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer=null;
if(!reduce){try{renderer=new THREE.WebGLRenderer({antialias:true})}catch(e){renderer=null}}

if(!renderer){
  hero.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>goTab(b.dataset.a==='how'?'t3':'t1'));
}else{
  hero.classList.add('gl');
  run();
}

function run(){
const cv=renderer.domElement;hero.prepend(cv);
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x0b0908,1);
const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
scene.environmentIntensity=.42;
const camera=new THREE.PerspectiveCamera(30,1,10,30000);
const key=new THREE.DirectionalLight(0xe6ecff,2.4);scene.add(key);
const block=new THREE.Group();scene.add(block);
const U={uPtr:{value:new THREE.Vector3()},uK:{value:0},uS:{value:1}};
const aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());

/* ---------- procedural brick textures ---------- */
function shade(hex,v){const n=parseInt(hex.slice(1),16);const c=[n>>16&255,n>>8&255,n&255].map(x=>Math.max(0,Math.min(255,Math.round(x+v))));return `rgb(${c[0]},${c[1]},${c[2]})`}
function lcg(seed){let r=seed%2147483647;if(r<=0)r+=2147483646;return()=>{r=r*16807%2147483647;return r/2147483647}}
function mkNoise(seed){const r=lcg(seed),N=64,G=new Float32Array(N*N);for(let i=0;i<G.length;i++)G[i]=r();
  const sm=t=>t*t*(3-2*t);
  const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi),x0=((xi%N)+N)%N,y0=((yi%N)+N)%N,x1=(x0+1)%N,y1=(y0+1)%N;
    const a=G[y0*N+x0],b=G[y0*N+x1],c=G[y1*N+x0],d=G[y1*N+x1];return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy};
  return (x,y)=>n(x,y)*.55+n(x*2.1,y*2.1)*.3+n(x*4.3,y*4.3)*.15;}
function brickCanvas(base,mortar,seed,bump){
  const SZ=720,K=1.5,c=document.createElement('canvas');c.width=c.height=SZ;const g=c.getContext('2d');
  const rnd=lcg(seed),bw=120,bh=40,gap=6,jit=()=>(rnd()-.5)*2;
  const m=document.createElement('canvas');m.width=m.height=SZ;const mg=m.getContext('2d');
  mg.fillStyle='#000';mg.fillRect(0,0,SZ,SZ);mg.fillStyle='#fff';
  g.scale(K,K);mg.scale(K,K);
  g.fillStyle=mortar;g.fillRect(0,0,480,480);
  const tint=[];
  for(let row=0;row<12;row++){const off=row%2?bw/2:0;
    for(let i=-1;i<=4;i++){const x=i*bw+off+gap/2,y=row*bh+gap/2,w=bw-gap,h=bh-gap,v=(rnd()-.5)*46,burn=rnd();
      const e=1.3,P=[[x+jit()*e,y+jit()*e],[x+w*.5+jit(),y+jit()*.8],[x+w+jit()*e,y+jit()*e],[x+w+jit()*.8,y+h*.5+jit()],[x+w+jit()*e,y+h+jit()*e],[x+w*.5+jit(),y+h+jit()*.8],[x+jit()*e,y+h+jit()*e],[x+jit()*.8,y+h*.5+jit()]];
      if(rnd()<.35){const k=Math.floor(rnd()*4)*2;P[k][0]+=(k<4?1:-1)*(2+rnd()*3);P[k][1]+=(k%4?-1:1)*(1+rnd()*2.5)}
      for(const ctx of [g,mg]){ctx.beginPath();P.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
      g.fillStyle=bump?shade('#b0b0b0',v*.3):shade(base,v);g.fill();mg.fill();
      if(!bump){
        g.save();g.beginPath();P.forEach((q,j)=>j?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.clip();
        const ns=1+Math.floor(rnd()*3);
        for(let q=0;q<ns;q++){g.fillStyle=`rgba(${rnd()<.6?'30,12,8':'210,150,100'},${.08+rnd()*.14})`;g.beginPath();g.ellipse(x+rnd()*w,y+rnd()*h,10+rnd()*34,3+rnd()*8,0,0,6.3);g.fill()}
        if(burn>.7){g.fillStyle='rgba(25,10,8,.25)';g.fillRect(x,y,w,h*.35)}
        g.restore();
        g.lineWidth=1.1;g.strokeStyle='rgba(255,230,200,.22)';g.beginPath();g.moveTo(P[0][0]+1,P[0][1]+1);g.lineTo(P[2][0]-1,P[2][1]+1);g.stroke();
        g.strokeStyle='rgba(0,0,0,.32)';g.beginPath();g.moveTo(P[6][0]+1,P[6][1]-.5);g.lineTo(P[4][0]-1,P[4][1]-.5);g.stroke();
      }
    }}
  const img=g.getImageData(0,0,SZ,SZ),d=img.data,md=mg.getImageData(0,0,SZ,SZ).data,N1=mkNoise(seed+3),N2=mkNoise(seed+11),r2=lcg(seed*7+1);
  for(let y=0;y<SZ;y++)for(let x=0;x<SZ;x++){const i=(y*SZ+x)*4,isB=md[i]>127;
    const big=N1(x/38,y/38)-.5,fine=N2(x/3.2,y/3.2)-.5,mid=N1(x/11+9,y/11+4)-.5;
    let f=isB?1+big*.34+mid*.18+fine*.26:1+big*.18+fine*.5+mid*.1;
    const sp=r2();
    if(isB&&sp<.014)f*=.5; else if(sp>.992)f*=1.28; else if(!isB&&sp<.05)f*=.78;
    if(bump&&!isB)f*=.38;
    d[i]=Math.max(0,Math.min(255,d[i]*f));d[i+1]=Math.max(0,Math.min(255,d[i+1]*f));d[i+2]=Math.max(0,Math.min(255,d[i+2]*f));}
  g.setTransform(1,0,0,1,0,0);g.putImageData(img,0,0);
  const r3=lcg(seed+99);
  for(let k=0;k<(bump?260:150);k++){const px=r3()*SZ,py=r3()*SZ,pr=.8+r3()*2.2;
    g.fillStyle=bump?'rgba(0,0,0,.7)':'rgba(25,10,6,.55)';g.beginPath();g.ellipse(px,py,pr,pr*.8,0,0,6.3);g.fill();
    if(!bump){g.fillStyle='rgba(255,225,190,.18)';g.beginPath();g.ellipse(px+.4,py+pr*.7,pr*.8,pr*.4,0,0,6.3);g.fill()}}
  return c;
}
function mkTex(c,srgb){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=aniso;return t}
const PAL={nav:['#33231e','#5f544c'],A:['#8f3a27','#a89a8c'],B:['#8a5e1f','#ab9f8a'],C:['#573026','#8e8176'],D:['#7d2f31','#a6978d'],E:['#34495c','#8d969c']};
try{const bc=brickCanvas('#8f3a27','#a89a8c',4242,false);window.__brickURL=bc.toDataURL('image/jpeg',.82);window.dispatchEvent(new Event('brickurl'))}catch(e){}
const bumpTex=mkTex(brickCanvas('','',7,true),false);
const brickTex={};let n0=0;for(const k in PAL)brickTex[k]=mkTex(brickCanvas(PAL[k][0],PAL[k][1],977*(++n0)+13,false),true);

function brickMat(k){
  const m=new THREE.MeshPhysicalMaterial({map:brickTex[k],bumpMap:bumpTex,bumpScale:5,roughness:.8,metalness:0,clearcoat:.18,clearcoatRoughness:.5,envMapIntensity:1,emissive:new THREE.Color(1,.45,.15),emissiveIntensity:0,color:new THREE.Color(.74,.74,.74)});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;\nuniform vec3 uPtr;uniform float uK;uniform float uS;')
      .replace('#include <opaque_fragment>','float gd=distance(vWP.xy,uPtr.xy)/(300.0*uS);outgoingLight+=vec3(1.0,.5,.2)*.2*uK*exp(-1.6*gd*gd);\n#include <opaque_fragment>');
  };
  return m;
}

/* ---------- geometry helpers ---------- */
function insetPoly(P,d){
  const n=P.length;let A=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];A+=a[0]*b[1]-b[0]*a[1]}
  const sg=A>0?1:-1,L=[];
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
    L.push({p:[a[0]-dy/l*sg*d,a[1]+dx/l*sg*d],d:[dx/l,dy/l]})}
  return P.map((_,i)=>{const l1=L[(i+n-1)%n],l2=L[i],den=l1.d[0]*l2.d[1]-l1.d[1]*l2.d[0];
    if(Math.abs(den)<1e-6)return l2.p.slice();
    const t=((l2.p[0]-l1.p[0])*l2.d[1]-(l2.p[1]-l1.p[1])*l2.d[0])/den;
    return [l1.p[0]+l1.d[0]*t,l1.p[1]+l1.d[1]*t]});
}
function roundedShape(pts,r){
  const n=pts.length,sh=new THREE.Shape();
  for(let i=0;i<n;i++){const p0=pts[(i+n-1)%n],p1=pts[i],p2=pts[(i+1)%n];
    const v1=[p0[0]-p1[0],p0[1]-p1[1]],v2=[p2[0]-p1[0],p2[1]-p1[1]],l1=Math.hypot(v1[0],v1[1])||1,l2=Math.hypot(v2[0],v2[1])||1;
    const rr=Math.min(r,l1*.45,l2*.45),a=[p1[0]+v1[0]/l1*rr,p1[1]+v1[1]/l1*rr],b=[p1[0]+v2[0]/l2*rr,p1[1]+v2[1]/l2*rr];
    if(i===0)sh.moveTo(a[0],a[1]);else sh.lineTo(a[0],a[1]);
    sh.quadraticCurveTo(p1[0],p1[1],b[0],b[1]);
  }
  sh.closePath();return sh;
}
function brickUV(geo,cx,cy,T){
  const pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){const X=pos.getX(i)+cx,Y=cy-pos.getY(i);
    if(Math.abs(nor.getZ(i))>.5)uv.setXY(i,X/T,Y/T);else uv.setXY(i,(X+Y)/T,pos.getZ(i)/T*2.5)}
  uv.needsUpdate=true;
}

/* ---------- layout state ---------- */
let W=0,H=0,S=1,TS=1,bw=0,bh=0,navH=0,pw=0,ph=0,portrait=false,depth=0,bevel=0;
const pageCv=document.createElement('canvas'),navCv=document.createElement('canvas');
let pageTex=null,navTex=null;
const pieces=[];
const ORDER=['nav','A','B','C','D','E'];
const CELLS={A:['TL','tAB','J0','bAD','BL'],B:['tAB','tBC','J1','J0'],C:['tBC','tCE','J2','J1'],D:['J0','J1','J2','bDE','bAD'],E:['tCE','TR','BR','bDE','J2']};
const BASE={TL:[0,0],TR:[1,0],BL:[0,1],BR:[1,1],tAB:[.22,0],tBC:[.515,0],tCE:[.84,0],bAD:[.34,1],bDE:[.865,1],J0:[.385,.72],J1:[.48,.62],J2:[.716,.49]};
const DRIFT={tAB:[.03,0,13,0],tBC:[.03,0,17,1.7],tCE:[.03,0,11,3.1],bAD:[.03,0,15,4.2],bDE:[.03,0,19,5.5],J0:[.03,.05,12,.6],J1:[.03,.05,16,2.4],J2:[.03,.05,14,4.9]};
const JUNC=['J0','J1','J2'];

/* ---------- UI state ---------- */
let hov=null,navHov=null,btns=new Map(),navBtns=new Map();
const DEFS=['В/Ц','Водопотребность','Подвижность','Влажность заполнителей','Класс прочности'];

function fnt(px,w){return `${w||500} ${px}px "Golos Text",system-ui,sans-serif`}
function drawPage(){
  const dpr=Math.min(2,Math.max(1.5,window.devicePixelRatio||1));
  if(pageCv.width!==Math.round(pw*dpr)||pageCv.height!==Math.round(ph*dpr)){pageCv.width=Math.round(pw*dpr);pageCv.height=Math.round(ph*dpr)}
  const g=pageCv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,pw,ph);
  g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=16*TS;g.shadowOffsetY=2*TS;
  const L=portrait?.07*pw:.055*pw;
  let hs=portrait?Math.min(.15*pw,.1*ph):Math.min(.078*pw,.2*ph);
  g.font=fnt(hs,600);g.letterSpacing=(-.04*hs)+'px';{const mw=g.measureText('по кирпичику.').width,av=pw-L*1.4;if(mw>av)hs*=av/mw}
  g.textBaseline='alphabetic';g.textAlign='left';
  {const ss0=Math.max(14,portrait?16*TS:25*TS),yA=.135*ph+hs*1.25+hs*.98,sA=yA+hs*.52,bh0=Math.max(40,46*TS);
   g.font=fnt(hs,600);g.letterSpacing=(-.04*hs)+'px';const hw=g.measureText('по кирпичику.').width;
   const px0=L-26*TS,py0=.135*ph-34*TS,pw0=Math.min(pw-px0-10,Math.max(hw,portrait?pw*.8:pw*.5)+52*TS),ph0=sA+3*ss0*1.5+ss0*.6+bh0+30*TS-py0;
   const sc=g.shadowColor,sb=g.shadowBlur;g.shadowColor='transparent';g.fillStyle='rgba(20,11,8,.66)';g.beginPath();g.roundRect(px0,py0,pw0,ph0,12*TS);g.fill();
   g.strokeStyle='rgba(255,200,150,.18)';g.lineWidth=1;g.stroke();g.shadowColor=sc;g.shadowBlur=sb;}
  g.font=fnt(Math.max(12,16*TS),600);g.letterSpacing=(.16*Math.max(12,16*TS))+'px';g.fillStyle='rgba(255,236,218,.9)';
  g.fillText('ИИ ДЛЯ ТЕХНОЛОГА СТРОЙМАТЕРИАЛОВ',L,.135*ph);
  g.letterSpacing=(-.04*hs)+'px';g.font=fnt(hs,600);
  const y1=.135*ph+hs*1.25,y2=y1+hs*.98;
  g.fillStyle='#fbf1e6';g.fillText('Считаем',L,y1);
  g.fillStyle='#ffb77d';g.fillText('по кирпичику.',L,y2);
  g.letterSpacing='0px';
  const ss=Math.max(14,portrait?16*TS:25*TS);g.font=fnt(ss,500);g.fillStyle='rgba(255,244,232,.95)';
  const s1=y2+hs*.52;
  const sub=portrait?['Состав бетона, контроль партии','и причины дефектов. Формулы считают,','ИИ разбирает, технолог решает.']:['Состав бетона, контроль партии и причины дефектов.','Формулы считают, ИИ разбирает, технолог решает.'];
  sub.forEach((t,i)=>{g.fillText(t,L,s1+i*ss*1.5);g.fillText(t,L,s1+i*ss*1.5)});
  const by=s1+sub.length*ss*1.5+ss*.6,bwid=Math.max(150,176*TS),bhei=Math.max(40,46*TS);
  btns.clear();
  g.shadowColor='transparent';
  g.fillStyle=hov==='demo'?'#ff8a3d':'#f8eee3';
  g.beginPath();g.roundRect(L,by,bwid,bhei,6*TS);g.fill();
  g.fillStyle='#1b1210';g.font=fnt(Math.max(14,16*TS),600);g.textAlign='center';g.fillText('Открыть демо',L+bwid/2,by+bhei/2+Math.max(14,16*TS)*.34);
  btns.set('demo',{x:L,y:by,w:bwid,h:bhei});
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=8*TS;
  g.textAlign='left';g.fillStyle='#fbf1e6';g.font=fnt(Math.max(14,16*TS),500);
  const lx=L+bwid+24*TS,lt='Как это работает →',lw=g.measureText(lt).width,ly=by+bhei/2+Math.max(14,16*TS)*.34;
  g.fillText(lt,lx,ly);
  if(hov==='how'){g.fillRect(lx,ly+4*TS,lw,Math.max(1.5,1.5*TS))}
  btns.set('how',{x:lx-6,y:by,w:lw+12,h:bhei});
  g.shadowColor='transparent';
  g.font=fnt(Math.max(11,14*TS),500);g.letterSpacing='.05em';g.fillStyle='rgba(255,236,218,.75)';
  g.textAlign='left';g.fillText('© TechMaster AI, учебный проект',L,.93*ph);
  if(!portrait){g.textAlign='right';g.fillText('ГОСТ 7473 · ГОСТ 27006 · ГОСТ 18105',pw-.045*pw,.93*ph)}
  g.letterSpacing='0px';
  pageTex.needsUpdate=true;
}
function drawNav(){
  const dpr=Math.min(2,Math.max(1.5,window.devicePixelRatio||1));
  if(navCv.width!==Math.round(bw*dpr)||navCv.height!==Math.round(navH*dpr)){navCv.width=Math.round(bw*dpr);navCv.height=Math.round(navH*dpr)}
  const g=navCv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,bw,navH);
  navBtns.clear();
  const cy=navH/2,fs=Math.max(14,15.5*TS),m=Math.max(16,.03*bw);
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=6*TS;
  const ms=Math.max(18,22*TS);g.fillStyle='#ff7a2f';g.beginPath();g.roundRect(m,cy-ms/2,ms,ms,4*TS);g.fill();
  g.fillStyle='#2b1510';g.fillRect(m+ms*.28,cy-ms*.22,ms*.44,ms*.1);g.fillRect(m+ms*.28,cy+ms*.12,ms*.44,ms*.1);
  g.fillStyle='#fbf1e6';g.font=fnt(fs*1.08,600);g.textAlign='left';g.textBaseline='middle';
  g.fillText('TechMaster AI',m+ms+10*TS,cy);
  let x=bw*(portrait?.5:.34);
  if(!portrait||bw>520){
    [['Расчёт','t1'],['Диагностика','t2'],['Методика','t3']].forEach(([t,k])=>{
      g.font=fnt(fs,500);const w=g.measureText(t).width;
      g.fillStyle=navHov===k?'#ffffff':'rgba(255,236,218,.62)';g.fillText(t,x,cy);
      navBtns.set(k,{x:x-10,y:0,w:w+20,h:navH});x+=w+34*TS;
    });
  }
  g.font=fnt(fs,600);const dt='Демо',dw=g.measureText(dt).width,bwi=dw+28*TS,bhi=Math.max(30,34*TS),bx=bw-m-bwi;
  g.shadowColor='transparent';
  g.strokeStyle=navHov==='t1d'?'#ff8a3d':'rgba(255,236,218,.45)';g.lineWidth=1.3;g.beginPath();g.roundRect(bx,cy-bhi/2,bwi,bhi,5*TS);g.stroke();
  g.fillStyle=navHov==='t1d'?'#ff8a3d':'#fbf1e6';g.textAlign='center';g.fillText(dt,bx+bwi/2,cy);
  navBtns.set('t1d',{x:bx,y:cy-bhi/2,w:bwi,h:bhi});
  navTex.needsUpdate=true;
}

/* ---------- pieces ---------- */
function makePiece(id){
  const mat=brickMat(id==='nav'?'nav':id);
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),mat);
  const tm=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false}));
  const group=new THREE.Group();group.add(mesh,tm);block.add(group);
  return {id,mat,mesh,tm,group,cx:0,cy:0,hw:1,hh:1,ox:0,oy:0,z:0,vz:0,rx:0,vrx:0,ry:0,vry:0,hl:0,fly:null,delayOut:0,delayIn:0};
}
ORDER.forEach(id=>pieces.push(makePiece(id)));
const P=Object.fromEntries(pieces.map(p=>[p.id,p]));

function buildPiece(p,poly,texW,texH,tex,ox,oy){
  const ins=insetPoly(poly,7*S);
  let cx=0,cy=0;ins.forEach(q=>{cx+=q[0];cy+=q[1]});cx/=ins.length;cy/=ins.length;
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  const loc=ins.map(q=>{mnx=Math.min(mnx,q[0]);mxx=Math.max(mxx,q[0]);mny=Math.min(mny,q[1]);mxy=Math.max(mxy,q[1]);return [q[0]-cx,-(q[1]-cy)]});
  const sh=roundedShape(loc,20*S);
  const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:5});
  eg.translate(0,0,-depth/2);
  brickUV(eg,cx+ox,cy+oy,440*S);
  p.mesh.geometry.dispose();p.mesh.geometry=eg;
  const sg=new THREE.ShapeGeometry(sh,5);
  const pos=sg.attributes.position,suv=sg.attributes.uv;
  for(let i=0;i<pos.count;i++){suv.setXY(i,(pos.getX(i)+cx)/texW,1-(cy-pos.getY(i))/texH)}
  suv.needsUpdate=true;
  p.tm.geometry.dispose();p.tm.geometry=sg;p.tm.position.z=depth/2+bevel+.6;
  p.tm.material.map=tex;p.tm.material.needsUpdate=false;
  p.cx=cx+ox;p.cy=cy+oy;p.hw=(mxx-mnx)/2;p.hh=(mxy-mny)/2;
}

function pointsAt(t,pn,pk){
  const out={},asp=pw/ph;
  for(const k in BASE){
    let [x,y]=BASE[k];const d=DRIFT[k];
    if(d){x+=Math.sin(t*6.2832/d[2]+d[3])*d[0];if(d[1])y+=Math.sin(t*6.2832/(d[2]*.8)+d[3]+1)*d[1];
      if(pn&&JUNC.includes(k)){const dx=(x-pn[0])*asp,dy=y-pn[1],dd=Math.hypot(dx,dy);
        if(dd<.6){const f=.05*(1-dd/.6)*pk/(dd||1);x+=dx/asp*f;y+=dy*f}}}
    out[k]=portrait?[y,x]:[x,y];
  }
  return out;
}
let ptrPanel=null,ptrFade=0;
function rebuild(t){
  const pts=pointsAt(t,ptrPanel,ptrFade);
  for(const id of ['A','B','C','D','E']){
    const poly=CELLS[id].map(n=>[pts[n][0]*pw,pts[n][1]*ph]);
    buildPiece(P[id],poly,pw,ph,pageTex,0,navH);
  }
}
function buildNav(){
  buildPiece(P.nav,[[0,0],[bw,0],[bw,navH],[0,navH]],bw,navH,navTex,0,0);
}
function placePieces(){
  pieces.forEach((p,i)=>{
    const lx=p.cx-bw/2,ly=bh/2-p.cy;
    p.base=new THREE.Vector3(lx,ly,0);
    const r=Math.random;
    const dir=new THREE.Vector2(lx,ly).normalize();if(!isFinite(dir.x))dir.set(0,1);
    p.fly={fx:(dir.x*(500+r()*300)+(r()-.5)*200)*S,fy:(dir.y*(250+r()*250)-250-r()*200)*S,fz:(420+r()*380)*S,g:(700+r()*400)*S,
      axis:new THREE.Vector3(r()-.5,r()-.5,r()-.5).normalize(),ang:2+r()*1.6};
  });
}

/* ---------- panel hit planes ---------- */
const panelPlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());panelPlane.visible=false;block.add(panelPlane);
const navPlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());navPlane.visible=false;block.add(navPlane);

/* ---------- sliver ("Назад") ---------- */
const sliver={mesh:null,s:0,tgt:0,hov:false,rx:0,vrx:0,ry:0,vry:0,cx:0,cy:0,k:1};
const slMat=new THREE.MeshPhysicalMaterial({map:brickTex.nav,bumpMap:bumpTex,bumpScale:4,roughness:.5,metalness:0,clearcoat:.8,clearcoatRoughness:.15,iridescence:.35,iridescenceIOR:1.3,iridescenceThicknessRange:[250,650],envMapIntensity:1.2});
function buildSliver(){
  if(sliver.mesh){scene.remove(sliver.mesh);sliver.mesh.geometry.dispose()}
  const k=W/1918;sliver.k=k;
  const pts=[[.147,.243],[.252,.169],[.287,.277],[.151,.258]].map(q=>[q[0]*W,q[1]*H]);
  let cx=0,cy=0;pts.forEach(q=>{cx+=q[0];cy+=q[1]});cx/=4;cy/=4;
  const sh=roundedShape(pts.map(q=>[q[0]-cx,-(q[1]-cy)]),10*k);
  const g=new THREE.ExtrudeGeometry(sh,{depth:11*k,bevelEnabled:true,bevelThickness:2.6*k,bevelSize:2.6*k,bevelSegments:3,curveSegments:5});
  g.translate(0,0,-5.5*k);brickUV(g,cx,cy,440*Math.max(S,.5));
  const m=new THREE.Mesh(g,slMat);m.position.set(cx-W/2,H/2-cy,0);m.visible=false;scene.add(m);
  sliver.mesh=m;sliver.cx=cx;sliver.cy=cy;
}

/* ---------- resize ---------- */
function layout(){
  W=hero.clientWidth;H=hero.clientHeight;if(!W||!H)return;
  renderer.setSize(W,H,false);
  camera.aspect=W/H;camera.position.set(0,0,(H/2)/Math.tan(THREE.MathUtils.degToRad(15)));camera.updateProjectionMatrix();
  key.position.set(-W*.45,H*.7,900);
  portrait=W/H<.95;
  const mx=W<640?16:W*.055,my=W<640?16:H*.085;
  bw=W-2*mx;bh=H-2*my;S=Math.max(bw/1730,.5);TS=portrait?Math.max(bw/620,.6):Math.max(S,.62);
  depth=13*S;bevel=2.6*S;U.uS.value=S;
  navH=Math.max(.108*bh,54);pw=bw;ph=bh-navH;
  if(pageTex)pageTex.dispose();if(navTex)navTex.dispose();
  pageCv.width=pageCv.height=navCv.width=navCv.height=1;
  pageTex=new THREE.CanvasTexture(pageCv);pageTex.colorSpace=THREE.SRGBColorSpace;pageTex.anisotropy=aniso;
  navTex=new THREE.CanvasTexture(navCv);navTex.colorSpace=THREE.SRGBColorSpace;navTex.anisotropy=aniso;
  drawPage();drawNav();
  panelPlane.scale.set(pw,ph,1);panelPlane.position.set(0,bh/2-navH-ph/2,depth/2+bevel+2);
  navPlane.scale.set(bw,navH,1);navPlane.position.set(0,bh/2-navH/2,depth/2+bevel+2);
  buildNav();rebuild(clock);placePieces();buildSliver();
  block.updateMatrixWorld(true);
}

/* ---------- pointer ---------- */
const rc=new THREE.Raycaster();
const ndc=new THREE.Vector2();let inside=false,ptrX=0,ptrY=0,lastHit=null;
hero.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));inside=true});
hero.addEventListener('pointerleave',()=>{inside=false;hov=null;navHov=null;cv.style.cursor=''});
hero.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));inside=true;pick()});

let mode='in',mt=0,view='main';
function inRect(r,x,y){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}
function pick(){
  rc.setFromCamera(ndc,camera);
  let nh=null,nn=null;
  if(mode==='idle'&&view==='main'){
    let h=rc.intersectObject(panelPlane)[0];
    if(h){const x=h.uv.x*pw,y=(1-h.uv.y)*ph;for(const [k,r] of btns)if(inRect(r,x,y))nh=k}
    h=rc.intersectObject(navPlane)[0];
    if(h){const x=h.uv.x*bw,y=(1-h.uv.y)*navH;for(const [k,r] of navBtns)if(inRect(r,x,y))nn=k}
  }
  if(nh!==hov){hov=nh;drawPage()}
  if(nn!==navHov){navHov=nn;drawNav()}
  cv.style.cursor=(nh||nn)?'pointer':'';
}
hero.addEventListener('click',()=>{
  if(mode!=='idle'||view!=='main')return;
  pick();
  if(hov==='demo'){flyTo('t1')}
  else if(hov==='how'){shatter()}
  else if(navHov){flyTo(navHov==='t1d'?'t1':navHov)}
});

/* ---------- shatter / back ---------- */
const defs=$('defs'),back=$('back');
function shatter(){
  view='defs';mode='out';mt=0;
  pieces.forEach((p,i)=>p.delayOut=i*.04);
  setTimeout(()=>{if(view==='defs'){defs.classList.add('on');defs.setAttribute('aria-hidden','false')}},280);
  setTimeout(()=>{if(view==='defs'){sliver.tgt=1;back.classList.add('on')}},300);
}
function flyTo(k){
  if(reduce||mode!=='idle'){goTab(k);return}
  goTab(k);
}
function out(){if(mode!=='idle')return;view='fly';mode='out';mt=0;pieces.forEach((p,i)=>p.delayOut=i*.035);start()}
function enter(){view='main';mode='in';mt=0;pieces.forEach((p,i)=>p.delayIn=i?.03+i*.03:0);start()}
function goBack(){
  view='main';mode='in';mt=0;defs.classList.remove('on');defs.setAttribute('aria-hidden','true');
  sliver.tgt=0;back.classList.remove('on');sliver.hov=false;
  pieces.forEach((p,i)=>p.delayIn=i?.03+i*.03:0);
}
back.addEventListener('click',goBack);
back.addEventListener('pointerenter',()=>sliver.hov=true);
back.addEventListener('pointerleave',()=>sliver.hov=false);

/* ---------- main loop ---------- */
let clock=0,last=performance.now(),acc=0,visible=true,running=false,tiltX=0,tiltY=0,tgtX=0,tgtY=0;
const qH=new THREE.Quaternion(),qT=new THREE.Quaternion(),eu=new THREE.Euler(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),tmpV=new THREE.Vector3(),loc=new THREE.Vector3();
const easeBack=u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2)};
function spring(o,k,v,tg,dt){const n=Math.ceil(dt/.008);const h=dt/n;for(let i=0;i<n;i++){o[v]+=(-170*(o[k]-tg)-19*o[v])*h;o[k]+=o[v]*h}}

function frame(now){
  if(!visible||!hero.clientWidth||pieces.some(p=>!p.base)){running=false;return}
  const dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;mt+=dt;acc+=dt;
  // global tilt
  const nx=inside?ndc.x:0,nyd=inside?-ndc.y:0;
  tgtY=(nx*7-1.2)*Math.PI/180;tgtX=(nyd*5.5-.8)*Math.PI/180;
  const a=1-Math.exp(-dt/.3);tiltX+=(tgtX-tiltX)*a;tiltY+=(tgtY-tiltY)*a;
  block.rotation.set(tiltX,tiltY,0);block.updateMatrixWorld(true);
  // pointer in panel space + glow
  ptrFade+=((inside&&mode==='idle'?1:0)-ptrFade)*(1-Math.exp(-dt/.25));
  U.uK.value=ptrFade;
  let hovered=null,rel=null;
  if(inside){
    rc.setFromCamera(ndc,camera);
    if(rc.ray.intersectPlane(plane,tmpV))U.uPtr.value.copy(tmpV);
    const hp=rc.intersectObject(panelPlane)[0];
    if(hp)ptrPanel=[hp.uv.x,1-hp.uv.y];else ptrPanel=null;
    if(mode==='idle'&&view==='main'){
      const hit=rc.intersectObjects(pieces.map(p=>p.mesh),false)[0];
      if(hit){hovered=pieces.find(p=>p.mesh===hit.object);loc.copy(hit.point);block.worldToLocal(loc);
        rel=[Math.max(-1,Math.min(1,(loc.x-hovered.base.x)/hovered.hw)),Math.max(-1,Math.min(1,(loc.y-hovered.base.y)/hovered.hh))]}
    }
    pick();
  }else ptrPanel=null;
  if(acc>=1/45&&!(mode==='out'&&mt>1.5)){acc=0;rebuild(clock);placePiecesPos()}
  // piece springs + fly
  let allIn=true;
  pieces.forEach((p,i)=>{
    const isH=p===hovered,lift=(p.id==='nav'?32:50)*S;
    spring(p,'z','vz',isH?lift:0,dt);
    spring(p,'rx','vrx',isH?-rel[1]*.24:0,dt);
    spring(p,'ry','vry',isH?rel[0]*.24:0,dt);
    p.hl+=((isH?1:0)-p.hl)*(1-Math.exp(-dt/.12));
    p.mat.envMapIntensity=1+.9*p.hl;p.mat.emissiveIntensity=.07*p.hl;
    let e=0;
    if(mode==='out'){const u=Math.min(1,Math.max(0,(mt-p.delayOut)/.72));e=u*u*u;}
    else if(mode==='in'){const u=Math.min(1,Math.max(0,(mt-p.delayIn)/.72));e=1-easeBack(u);if(u<1)allIn=false}
    p.e=e;
    const f=p.fly;
    p.group.position.set(p.base.x+f.fx*e,p.base.y+f.fy*e-f.g*e*e,p.z+f.fz*e);
    qT.setFromAxisAngle(f.axis,f.ang*e);eu.set(p.rx,p.ry,0);qH.setFromEuler(eu);
    p.group.quaternion.copy(qT).multiply(qH);
    p.group.visible=!(mode==='out'&&e>=.999);
  });
  if(mode==='in'&&allIn&&mt>.1){mode='idle'}
  // sliver
  sliver.s+=(sliver.tgt-sliver.s)*(1-Math.exp(-dt/.12));
  if(sliver.mesh){
    const s=Math.max(.0001,sliver.s);sliver.mesh.visible=sliver.s>.01;sliver.mesh.scale.setScalar(s);
    const wob=Math.sin(clock*6.28)*.035,wob2=Math.sin(clock*5.2+1)*.03;
    spring(sliver,'rx','vrx',sliver.hov?-.14:0,dt);spring(sliver,'ry','vry',sliver.hov?.1:0,dt);
    sliver.mesh.rotation.set(.08+wob2+sliver.rx,-.16+wob+sliver.ry,0);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
function placePiecesPos(){
  pieces.forEach(p=>{p.base.set(p.cx-bw/2,bh/2-p.cy,0)});
}
function start(){if(!running){running=true;last=performance.now();requestAnimationFrame(frame)}}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start()},{threshold:0}).observe(hero);
new ResizeObserver(()=>{if(!hero.clientWidth)return;layout();if(visible)start()}).observe(hero);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(pageTex){drawPage();drawNav()}});
layout();pieces.forEach(p=>p.delayIn=p.id==='nav'?0:.03+ORDER.indexOf(p.id)*.03);
start();
window.__tm={pieces,shatter,goBack,enter,flyTo,out,get mode(){return mode}};
}
