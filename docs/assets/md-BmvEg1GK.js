import{_ as i}from"./slidev/CodeBlockWrapper.vue_vue_type_script_setup_true_lang-AXLoc8L9.js";import{o as p,b as c,w as a,g as s,d,m as u,D as e,v as m,x as f,z as l}from"./modules/vue-BjVLWJtr.js";import{I as k}from"./slidev/center-DzVjPLWC.js";import{u as h,f as x}from"./slidev/context-BCxU3aGJ.js";import"./modules/unplugin-icons-Ce21uO26.js";import"./index-CzysBikQ.js";import"./modules/shiki-B8L3s8xZ.js";const C={__name:"slides.md__slidev_11",setup(g){const{$clicksContext:t,$frontmatter:r}=h();return t.setup(),(b,n)=>{const o=i;return p(),c(k,m(f(l(x)(l(r),10))),{default:a(()=>[n[1]||(n[1]=s("h3",null,"Under the hood — 1×1 FBO + pick matrix",-1)),d(o,u({},{title:"",ranges:[]}),{default:a(()=>[...n[0]||(n[0]=[s("pre",{class:"shiki shiki-themes vitesse-dark vitesse-light slidev-code",style:{"--shiki-dark":"#dbd7caee","--shiki-light":"#393a34","--shiki-dark-bg":"#121212","--shiki-light-bg":"#ffffff"}},[s("code",{class:"language-text"},[s("span",{class:"line"},[s("span",null,"colorPick(mouseX, mouseY, drawFn)")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │")]),e(`
`),s("span",{class:"line"},[s("span",null,"  ├─ save P and V matrices   (fbo.begin() would overwrite both)")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │")]),e(`
`),s("span",{class:"line"},[s("span",null,"  ├─ enter 1×1 framebuffer")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │    restore V               (orbitControl / camera transform)")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │    narrow P to one pixel   applyPickMatrix(P, x, y, w, h)")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │    background(0)           clear → id 0 = miss")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │    drawFn()                scene rendered flat, depth-tested")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │")]),e(`
`),s("span",{class:"line"},[s("span",null,"  ├─ gl.readPixels(0,0,1,1)   one RGBA pixel")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │    id = R | (G << 8) | (B << 16)")]),e(`
`),s("span",{class:"line"},[s("span",null,"  │")]),e(`
`),s("span",{class:"line"},[s("span",null,"  └─ fbo.end()                 P + V + full state restored automatically")])])],-1)])]),_:1},16),n[2]||(n[2]=s("blockquote",null,[s("p",null,[e("The FBO is "),s("strong",null,"1×1"),e(" — the pick matrix transforms the projection so the pixel at "),s("em",null,"(x, y)"),e(" maps to the entire viewport. Depth test picks the nearest object, not draw order."),s("br"),e(" FBO is lazily allocated on first call and released on sketch removal.")])],-1))]),_:1},16)}}};export{C as default};
