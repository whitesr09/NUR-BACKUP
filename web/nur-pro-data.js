/* NUR Pro: pure settings and geometry, independent of personal tracking data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NurProData=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const KEY='nur-studio-pro-v1',VERSION=1;
const IDS=['light','prayers','tasks','muhasaba','rhythm','archive','goals','focus'];
const STYLES=['classic','slim','thick','wavy','squiggly','segmented','liquid'];
const TARGETS=['light','prayers','tasks','muhasaba','rhythm'];
const PRESETS={
 original:{name:'Original NUR',order:IDS,hidden:[],sizes:{},quick:['prayers','tasks','focus','history']},
 study:{name:'Study',order:['focus','tasks','goals','light','prayers','muhasaba','rhythm','archive'],hidden:[],sizes:{focus:'hero',tasks:'wide'},quick:['focus','tasks','goals','notes']},
 worship:{name:'Worship',order:['light','prayers','muhasaba','tasks','rhythm','focus','goals','archive'],hidden:[],sizes:{light:'hero',prayers:'wide'},quick:['prayers','muhasaba','history','tasks']},
 minimal:{name:'Minimal',order:IDS,hidden:['rhythm','archive','goals','focus'],sizes:{},quick:['prayers','tasks','focus','history']}
};
const clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const choice=(v,values,fallback)=>values.includes(v)?v:fallback;
const clamp=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():null;
const defaults=()=>({version:VERSION,theme:'inherit',accent:null,font:'system',fontName:null,background:'inherit',blur:0,radius:20,shadow:1,density:'comfortable',fontScale:1,motion:'system',motionSpeed:1,haptics:true,refresh:'system',progress:Object.fromEntries(TARGETS.map(x=>[x,{style:'classic',thickness:6,glow:0}])),order:IDS.slice(),hidden:[],sizes:{},quick:PRESETS.original.quick.slice(),preset:'original'});
function normalize(value){
 const d=defaults();if(!obj(value))return d;
 const order=Array.isArray(value.order)?value.order.filter((x,i,a)=>IDS.includes(x)&&a.indexOf(x)===i):[];
 const sizes={};if(obj(value.sizes))for(const id of IDS)if(['compact','normal','wide','hero'].includes(value.sizes[id]))sizes[id]=value.sizes[id];
 const progress={};for(const id of TARGETS){const v=obj(value.progress?.[id])?value.progress[id]:{};progress[id]={style:choice(v.style,STYLES,'classic'),thickness:Math.round(clamp(v.thickness,2,20,6)),glow:Math.round(clamp(v.glow,0,16,0))};}
 return {version:VERSION,theme:choice(value.theme,['inherit','amoled'],d.theme),accent:hex(value.accent),font:choice(value.font,['system','sans','serif','custom'],d.font),fontName:typeof value.fontName==='string'?value.fontName.slice(0,80):null,background:choice(value.background,['inherit','none','custom'],d.background),blur:Math.round(clamp(value.blur,0,24,0)),radius:Math.round(clamp(value.radius,8,32,20)),shadow:clamp(value.shadow,0,2,1),density:choice(value.density,['compact','comfortable','spacious'],d.density),fontScale:Math.round(clamp(value.fontScale,.9,1.25,1)*20)/20,motion:choice(value.motion,['system','full','reduced'],d.motion),motionSpeed:Math.round(clamp(value.motionSpeed,.5,2,1)*10)/10,haptics:value.haptics!==false,refresh:choice(value.refresh,['system','high'],d.refresh),progress,order:[...order,...IDS.filter(x=>!order.includes(x))],hidden:Array.isArray(value.hidden)?IDS.filter(x=>x!=='light'&&value.hidden.includes(x)):[],sizes,quick:Array.isArray(value.quick)?[...new Set(value.quick.filter(x=>['prayers','tasks','muhasaba','focus','goals','history','notes','money','light'].includes(x)))].slice(0,5):d.quick,preset:choice(value.preset,Object.keys(PRESETS),'original')};
}
function preset(input,id){if(!PRESETS[id])throw Error('Unknown layout preset');const p=PRESETS[id];return normalize({...normalize(input),order:p.order,hidden:p.hidden,sizes:p.sizes,quick:p.quick,preset:id});}
function move(order,id,step){const out=order.slice(),i=out.indexOf(id),j=i+step;if(i<0||j<0||j>=out.length)return out;[out[i],out[j]]=[out[j],out[i]];return out;}
function color(rgb){const h=hex(rgb);if(!h)return null;return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
function luminance(rgb){const c=color(rgb);if(!c)return 0;const a=c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
function ink(rgb){return luminance(rgb)>.179?'#171717':'#ffffff';}
function geometry(style,percent){
 const p=clamp(percent,0,100,0),points=[];const count=120;
 for(let i=0;i<=count;i++){const x=i/count*100;const y=style==='wavy'?50+Math.sin(x*Math.PI/12)*17:style==='squiggly'?50+Math.sin(x*Math.PI/4)*13:50;points.push((i?'L':'M')+x.toFixed(3)+' '+y.toFixed(3));}
 return {path:points.join(' '),percent:p,dash:style==='segmented'?'3 2':null,stroke:style==='slim'?3:style==='thick'?14:6};
}
function ring(style){const count=240,points=[];for(let i=0;i<=count;i++){const a=-Math.PI/2+i/count*Math.PI*2,r=style==='wavy'?42+Math.sin(i/count*Math.PI*16)*2.5:style==='squiggly'?42+Math.sin(i/count*Math.PI*36)*2:42;points.push((i?'L':'M')+(50+r*Math.cos(a)).toFixed(3)+' '+(50+r*Math.sin(a)).toFixed(3));}return points.join(' ')+' Z';}
function validateAsset(file,bytes){const kind=file?.kind;if(!['font','background'].includes(kind)||!bytes||typeof bytes.length!=='number')throw Error('Invalid asset');const max=kind==='font'?5*1024*1024:8*1024*1024;if(!bytes.length||bytes.length>max)throw Error('Asset exceeds the size limit');const h=Array.from(bytes.slice(0,12));if(kind==='font'){const sig=String.fromCharCode(...h.slice(0,4));if(!['wOFF','wOF2','OTTO','ttcf'].includes(sig)&&!(h[0]===0&&h[1]===1&&h[2]===0&&h[3]===0))throw Error('Choose a valid TTF, OTF, WOFF or WOFF2 font');}else{const png=h.slice(0,8).join(',')==='137,80,78,71,13,10,26,10',jpg=h[0]===255&&h[1]===216&&h[2]===255,webp=String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP';if(!png&&!jpg&&!webp)throw Error('Choose a PNG, JPEG or WebP image');}return true;}
return {KEY,VERSION,IDS,STYLES,TARGETS,PRESETS,defaults,normalize,preset,move,hex,luminance,ink,geometry,ring,validateAsset};
});