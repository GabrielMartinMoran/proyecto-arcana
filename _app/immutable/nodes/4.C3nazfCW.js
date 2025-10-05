import"../chunks/DsnmJJEf.js";import{d as C,o as I,s as L}from"../chunks/DEyIqfax.js";import{p as w,b as T,aa as q,g as p,t as R,a as x,d as D,e as c,j as y,r as m,K as S}from"../chunks/4UBXq5Sj.js";import{r as U}from"../chunks/DSiDMBNC.js";import{m as F}from"../chunks/DemwCk8g.js";import{l as u}from"../chunks/CGjaQNWU.js";import{m as j,a as N}from"../chunks/D5qFhXHN.js";const n=async a=>await(await fetch(U(a))).text(),H="/docs/ai-gm-prompt.md",G=async()=>await n(H),O=a=>{let t="";return t+=`# ${a.name}

`,t+=`**NA:** ${a.na}

`,a.behavior&&(t+=`**Comportamiento:** ${a.behavior}

`),a.languages&&a.languages.length>0&&(t+=`**Lenguas:** ${a.languages.join(", ")}

`),t+=`## Atributos
`,t+=`- **Cuerpo:** ${a.attributes.body}
`,t+=`- **Reflejos:** ${a.attributes.reflexes}
`,t+=`- **Mente:** ${a.attributes.mind}
`,t+=`- **Instinto:** ${a.attributes.instinct}
`,t+=`- **Presencia:** ${a.attributes.presence}

`,t+=`## Estadísticas
`,t+=`- **Salud Máxima:** ${a.stats.maxHealth}
`,t+=`- **Exquiva:** ${a.stats.evasion.value}${a.stats.evasion.note?` (${a.stats.evasion.note})`:""}
`,t+=`- **Mitigación Física:** ${a.stats.physicalMitigation.value}${a.stats.physicalMitigation.note?` (${a.stats.physicalMitigation.note})`:""}
`,t+=`- **Mitigación Mágica:** ${a.stats.magicalMitigation.value}${a.stats.magicalMitigation.note?` (${a.stats.magicalMitigation.note})`:""}
`,t+=`- **Velocidad:** ${a.stats.speed.value}${a.stats.speed.note?` (${a.stats.speed.note})`:""}

`,t+=`- **Iniciativa:** ${a.attributes.reflexes}

`,a.attacks&&a.attacks.length>0&&(t+=`## Ataques
`,a.attacks.forEach(s=>{t+=`- **${s.name}:** Modificador de ataque: +${s.bonus}. Daño: ${s.damage}${s.note?` (${s.note})`:""}
`}),t+=`
`),a.traits&&a.traits.length>0&&(t+=`## Rasgos
`,a.traits.forEach(s=>{t+=`- **${s.name}:** ${s.detail}
`}),t+=`
`),a.actions&&a.actions.length>0&&(t+=`## Acciones
`,a.actions.forEach(s=>{t+=`- **${s.name}:** ${s.detail}${s.uses?` (Usos: ${$(s.uses)})`:""}
`}),t+=`
`),a.reactions&&a.reactions.length>0&&(t+=`## Reacciones
`,a.reactions.forEach(s=>{t+=`- **${s.name}:** ${s.detail}${s.uses?` (Usos: ${$(s.uses)})`:""}
`}),t+=`
`),t},$=a=>{switch(a?.type){case"RELOAD":return`${a.qty} [Recarga ${a.qty}+]`;case"USES":case"LONG_REST":return`${a.qty}`;default:return""}},Y="/docs/bestiary.yml",z=async()=>{const a=await n(Y);let t=[];try{t=u(a).creatures??[]}catch(e){console.error("Error parsing YAML:",e)}return t.map(e=>F(e)).map(O).join(`---

`)},B="/docs/cards.yml",k="/docs/magical-items.yml",J=a=>{if(!a||!a.type)return"N/A";switch(a.type){case"LONG_REST":return`${a.qty??"—"} por día de descanso`;case"RELOAD":return`1 (Recarga ${a.qty??"—"}+)`;case"USES":return`${a.qty??"—"}`;default:return"—"}},K=a=>{let t="";t+=`# ${a.name}

`,t+=`**Nivel:** ${a.level}

`,t+=`**Tipo:** ${a.type.charAt(0).toUpperCase()+a.type.slice(1)}

`,a.cardType==="item"&&(t+=`**Costo:** ${a.cost} de oro

`),t+=`**Descripción:**
${a.description}

`,a.tags&&a.tags.length>0&&(t+=`**Etiquetas:** ${a.tags?a.tags.join(", "):"—"}

`),t+=`**Requerimientos:** ${a.requirements&&a.requirements.length>0?a.requirements.join(", "):"—"}

`;const s=J(a.uses);return s!=="N/A"&&(t+=`**Usos:** ${s}

`),t},v=async(a,t,s)=>{const e=await n(a);let o=[];try{o=u(e)[s]??[]}catch(i){console.error("Error parsing YAML:",i)}return o.map(i=>t(i)).map(K).join(`---

`)},V=async()=>await v(B,j,"cards"),Q=async()=>await v(k,N,"items"),W="/docs/gm.md",X=async()=>await n(W),Z="/docs/player.md",aa=async()=>await n(Z),ta=async(a,t)=>{try{await navigator.clipboard.writeText(y(t)),alert("Prompt copiado al portapapeles")}catch(s){console.error("Failed to copy text: ",s),alert("Error al copiar el prompt al portapapeles")}};var sa=T(`<section class="svelte-2504y"><h1>IA como Director de Juego</h1> <p>A continuación hay un prompt que puede ser utilizado para probar Arcana utilizado a una AI como
		Director de Juego.</p> <p>Para utilizarla, simplemente copia el prompt, pegalo en tu AI favorita y ¡a disfrutar del juego!</p> <div class="prompt-header svelte-2504y"><h2>Prompt</h2> <button>Copiar Prompt</button></div> <pre class="svelte-2504y"> </pre></section>`);function ca(a,t){w(t,!0);let s=q("");const e=async()=>{const[f,b,h,M,_,E]=await Promise.all([G(),aa(),X(),z(),V(),Q()]);let l=f;const P=[{variable:"player_manual",value:b},{variable:"game_master_manual",value:h},{variable:"bestiary",value:M},{variable:"cards_list",value:_},{variable:"magical_items",value:E}];for(const g of P)l=l.replace(`{{${g.variable}}}`,g.value);S(s,l,!0)};I(async()=>await e());var o=sa(),r=p(c(o),6),i=p(c(r),2);i.__click=[ta,s],m(r);var d=p(r,2),A=c(d,!0);m(d),m(o),R(()=>L(A,y(s))),x(a,o),D()}C(["click"]);export{ca as component};
