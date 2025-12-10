import"../chunks/DsnmJJEf.js";import"../chunks/DYkEFMcb.js";import{o as ce,h as ve,e as E,s as D}from"../chunks/DDMpRfKd.js";import{p as de,b as d,a as n,d as me,ac as ue,g as f,e as b,F as o,ad as S,j as r,r as y,t as F,c as V,f as T,ae as pe}from"../chunks/Cg1s0EoG.js";import{i as L}from"../chunks/MZe84WCl.js";import{s as G,b as fe}from"../chunks/D1fKtWIY.js";import{i as _e}from"../chunks/9Ega0Btb.js";import{S as H}from"../chunks/D59KR5KQ.js";import{R as z}from"../chunks/D0Jl2iZ1.js";import{m as he}from"../chunks/W6WjCfrW.js";import{l as be}from"../chunks/CGjaQNWU.js";import{b as ye}from"../chunks/CIC3-VAl.js";var ge=d('<meta name="viewport" content="width=device-width, initial-scale=1"/>'),we=d('<div class="tabs svelte-1smdv23"><button>YAML</button> <button>Ficha</button> <div class="spacer svelte-1smdv23"></div> <button title="Copiar enlace" class="svelte-1smdv23">🔗</button> <button title="Descargar YAML" class="svelte-1smdv23">⬇️</button></div>'),Le=d("<!> <!>",1),Ae=d('<div class="status svelte-1smdv23">No hay una criatura válida para mostrar. Edita el YAML primero.</div>'),Ue=d('<div class="sheet svelte-1smdv23"><!></div>'),Me=d('<div class="error svelte-1smdv23"> </div>'),Re=d('<div class="ok svelte-1smdv23">Creatura válida: <strong> </strong> </div>'),Ee=d('<div class="editor svelte-1smdv23"><label for="yaml-area" class="visually-hidden svelte-1smdv23">YAML de criatura</label> <textarea id="yaml-area" class="svelte-1smdv23"></textarea> <!></div>'),Se=d("<!> <!>",1),Ce=d('<div class="status svelte-1smdv23">No hay una criatura válida para mostrar. Edita el YAML primero.</div>'),Pe=d('<div class="sheet svelte-1smdv23"><!></div>'),Te=d('<div class="embedded-npc svelte-1smdv23"><!> <!></div>');function Ge(J,K){de(K,!1);let A=S("yaml"),p=S(""),C=S(null),v=S(void 0),g=S(!1),P=null;const Q=400;let U=null;const q=2e3;let x=0;const Y=`# Ejemplo de criatura (editar aquí)
name: Goblin
tier: 1
attributes:
  body: 2
  reflexes: 3
  mind: 1
  instinct: 2
  presence: 1
stats:
  maxHealth: 8
  evasion:
    value: 1
    note: null
  physicalMitigation:
    value: 0
    note: null
  magicalMitigation:
    value: 0
    note: null
  speed:
    value: 6
    note: null
languages: []
attacks:
  - name: Mordisco
    bonus: 1
    damage: 1d6
    note: null
traits:
  - name: Astuto
    detail: Sumar +1 a iniciativas en grupo
actions:
  - name: Ataque múltiple
    detail: Ataca dos veces
    uses: null
reactions: []
interactions: []
behavior: Actúa en pequeños grupos para emboscar.
img: null
`,{isInsideFoundry:W,syncCreatureState:X}=ye(),Z=a=>{o(v,a),W()&&X(r(v))};function O(a){if(o(C,null),!a||!a.trim()){o(v,void 0);return}try{const e=be(a);let t=null;if(e&&typeof e=="object"&&Array.isArray(e.creatures))t=e.creatures[0]??null;else if(e&&typeof e=="object")t=e;else throw new Error("YAML no contiene un objeto válido de criatura.");if(!t)throw new Error("No se encontró una criatura en el YAML proporcionado.");const m=he(t);Z(m)}catch(e){o(v,void 0);const t=e&&e.message?e.message:String(e);o(C,`Error al parsear YAML: ${t}`)}}function $(a){const e=a.target.value;o(p,e),P&&clearTimeout(P),P=setTimeout(()=>{O(e),P=null},Q);try{const t=Date.now(),m=()=>{try{const i=encodeURIComponent(e),s=new URL(window.location.href);i&&i.length>0?s.searchParams.set("yaml",i):s.searchParams.delete("yaml"),r(g)&&s.searchParams.set("readonly","1"),history.replaceState(history.state,"",s.toString()),x=Date.now()}catch{}};if(t-x>=q)U&&(clearTimeout(U),U=null),m();else{const i=q-(t-x);U||(U=setTimeout(()=>{m(),U=null},i))}}catch{}}ce(()=>{try{const a=new URL(window.location.href),e=a.searchParams.get("yaml"),t=a.searchParams.get("readonly");if(o(g,t==="1"),e)try{o(p,decodeURIComponent(e))}catch{o(p,Y)}else o(p,Y)}catch{o(p,Y),o(g,!1)}r(g)&&o(A,"sheet"),O(r(p))});function ee(){const a=new Blob([r(p)],{type:"text/yaml"}),e=URL.createObjectURL(a),t=document.createElement("a");t.href=e,t.download=`${(r(v)?.name??"creature").replace(/\s+/g,"_")}.yml`,document.body.appendChild(t),t.click(),t.remove(),URL.revokeObjectURL(e)}function ae(){try{const a=encodeURIComponent(r(p)),e=new URL(window.location.href);a&&a.length>0?e.searchParams.set("yaml",a):e.searchParams.delete("yaml"),r(g)&&e.searchParams.set("readonly","1");const t=e.toString();navigator.clipboard.writeText(t),alert("Enlace copiado al portapapeles.")}catch(a){console.warn("[embedded npc] copyShareURL failed",a),alert("No se pudo copiar la URL.")}}_e();var k=Te();ve(a=>{var e=ge();ue.title="NPC Custom (embebido)",n(a,e)});var B=b(k);{var te=a=>{var e=we(),t=b(e);let m;var i=f(t,2);let s;var l=f(i,4),u=f(l,2);y(e),F((w,M)=>{m=G(t,1,"svelte-1smdv23",null,m,w),s=G(i,1,"svelte-1smdv23",null,s,M)},[()=>({active:r(A)==="yaml"}),()=>({active:r(A)==="sheet"})]),E("click",t,()=>o(A,"yaml")),E("click",i,()=>o(A,"sheet")),E("click",l,ae),E("click",u,ee),n(a,e)};L(B,a=>{r(g)||a(te)})}var re=f(B,2);{var se=a=>{var e=Ue(),t=b(e);{var m=s=>{var l=Le(),u=T(l);H(u,{get creature(){return r(v)}});var w=f(u,2);z(w,{}),n(s,l)},i=s=>{var l=Ae();n(s,l)};L(t,s=>{r(v)?s(m):s(i,!1)})}y(e),n(a,e)},oe=a=>{var e=V(),t=T(e);{var m=s=>{var l=Ee(),u=f(b(l),2);pe(u);var w=f(u,2);{var M=c=>{var _=Me(),R=b(_,!0);y(_),F(()=>D(R,r(C))),n(c,_)},h=c=>{var _=V(),R=T(_);{var le=j=>{var N=Re(),I=f(b(N)),ne=b(I,!0);y(I);var ie=f(I);y(N),F(()=>{D(ne,r(v).name),D(ie,` (tier ${r(v).tier??""})`)}),n(j,N)};L(R,j=>{r(v)&&j(le)},!0)}n(c,_)};L(w,c=>{r(C)?c(M):c(h,!1)})}y(l),fe(u,()=>r(p),c=>o(p,c)),E("input",u,$),n(s,l)},i=s=>{var l=Pe(),u=b(l);{var w=h=>{var c=Se(),_=T(c);H(_,{get creature(){return r(v)}});var R=f(_,2);z(R,{}),n(h,c)},M=h=>{var c=Ce();n(h,c)};L(u,h=>{r(v)?h(w):h(M,!1)})}y(l),n(s,l)};L(t,s=>{r(A)==="yaml"?s(m):s(i,!1)},!0)}n(a,e)};L(re,a=>{r(g)?a(se):a(oe,!1)})}y(k),n(J,k),me()}export{Ge as component};
