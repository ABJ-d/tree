import{O as _,P as w,o as v,e as C,g as a,n as y,r as z,Q as k,b as P,w as B,d as L,v as S,x as F,z as h}from"./modules/vue-BjVLWJtr.js";import{u as x,f as R}from"./slidev/context-BSQwfgHf.js";import{p as M}from"./p5.tree.esm-O3XTDekH.js";import{I as $}from"./slidev/center-B0w_D8O1.js";import"./index-BwPwBZ2v.js";import"./modules/shiki-B8L3s8xZ.js";import"./modules/file-saver-DDYYZubt.js";const D={class:"flex flex-col items-center gap-2"},E={class:"flex items-center gap-2 text-xs font-mono"},G=`#version 300 es
precision mediump float;
uniform sampler2D tex0;
uniform float strength;  // RGB split radius
uniform float vignette;  // falloff intensity
in  vec2 vTexCoord;
out vec4 outColor;
void main() {
  vec2 uv  = vTexCoord;
  vec2 dir = uv - 0.5;          // vector from screen centre
  float d  = length(dir);
  // Chromatic aberration — R pushed out, B pulled in
  float r = texture(tex0, uv + dir * strength * 0.04).r;
  float g = texture(tex0, uv).g;
  float b = texture(tex0, uv - dir * strength * 0.04).b;
  // Radial vignette
  float vig = 1.0 - smoothstep(0.35, 1.0, d * vignette);
  outColor = vec4(r, g, b, 1.0) * vig;
}
`,I={__name:"FxPipeDemo",setup(g){x();const i=z(null),r=k({chroma:!1});let l,o=null,s=null;const p=e=>{r[e]=!r[e],s&&(s.visible=r[e])},b=e=>{let t,c,u;e.setup=function(){e.createCanvas(600,340,e.WEBGL),t=e.createFramebuffer(),o=e.createPanel({speed:{min:0,max:.05,value:.012,step:.001},shininess:{min:1,max:200,value:80,step:1}},{title:"Scene",labels:!0,color:"white",x:10,y:10,width:150}),u=e.createFilterShader(G),s=e.createPanel({strength:{min:0,max:1,value:.4,step:.01},vignette:{min:0,max:3,value:1.4,step:.05}},{target:u,title:"Chroma + Vignette",labels:!0,color:"white",x:170,y:10,width:160}),s.visible=r.chroma,c=Array.from({length:32},(m,d)=>({pos:[e.random(-190,190),e.random(-150,150),e.random(-150,150)],size:e.random(10,28),col:e.color(e.random(80,255),e.random(80,255),e.random(80,255)),type:["box","sphere","torus"][d%3]}))},e.draw=function(){const m=o.speed.value(),d=o.shininess.value();t.begin(),e.background(12,14,22),e.orbitControl(),e.axes({size:160}),e.push(),e.stroke(50,65,85,100),e.grid({size:400}),e.pop();const f=e.frameCount*m;e.pointLight(255,180,80,200*Math.cos(f),-100,200*Math.sin(f)),e.directionalLight(90,150,220,-.4,.6,-1),e.ambientLight(50),c.forEach(n=>{e.push(),e.fill(n.col),e.noStroke(),e.specularMaterial(255),e.shininess(d),e.translate(...n.pos),n.type==="box"?e.box(n.size):n.type==="torus"?e.torus(n.size,n.size*.3):e.sphere(n.size,5,3),e.pop()}),t.end(),e.pipe(t,r.chroma?[u]:[])}};return _(()=>{l=new M(b,i.value)}),w(()=>{o?.dispose(),s?.dispose(),o=s=null,l?.remove()}),(e,t)=>(v(),C("div",D,[a("div",E,[t[1]||(t[1]=a("span",{class:"opacity-40 mr-1"},"post-fx",-1)),a("button",{onClick:t[0]||(t[0]=c=>p("chroma")),class:y(["px-3 py-1 rounded border transition-all duration-150 select-none",r.chroma?"bg-white/15 border-white/40 text-white":"bg-transparent border-white/15 text-white/35 hover:text-white/60"])},"chroma + vignette",2)]),a("div",{ref_key:"container",ref:i,class:"relative rounded-xl shadow-2xl border border-white/10"},null,512),t[2]||(t[2]=a("p",{class:"text-xs opacity-40 italic tracking-wide"}," Orbit freely · tune scene · toggle chromatic aberration ",-1))]))}},U={__name:"slides.md__slidev_18",setup(g){const{$clicksContext:i,$frontmatter:r}=x();return i.setup(),(l,o)=>{const s=I;return v(),P($,S(F(h(R)(h(r),17))),{default:B(()=>[o[0]||(o[0]=a("h2",null,"Post-processing as a pipeline",-1)),o[1]||(o[1]=a("p",null,"Scene to framebuffer. GLSL filter as a live-tunable pass.",-1)),L(s)]),_:1},16)}}};export{U as default};
