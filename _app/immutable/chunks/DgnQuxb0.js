import{m as $}from"./W6WjCfrW.js";import{l as m}from"./CGjaQNWU.js";import{m as p,a as d}from"./CWpSJPs7.js";import{r as g}from"./0dRoseId.js";const n=async s=>await(await fetch(g(s))).text(),y=s=>{let t="";return t+=`# ${s.name}

`,t+=`**NA:** ${s.tier}

`,s.behavior&&(t+=`**Comportamiento:** ${s.behavior}

`),s.languages&&s.languages.length>0&&(t+=`**Lenguas:** ${s.languages.join(", ")}

`),t+=`## Atributos
`,t+=`- **Cuerpo:** ${s.attributes.body}
`,t+=`- **Reflejos:** ${s.attributes.reflexes}
`,t+=`- **Mente:** ${s.attributes.mind}
`,t+=`- **Instinto:** ${s.attributes.instinct}
`,t+=`- **Presencia:** ${s.attributes.presence}

`,t+=`## Estadísticas
`,t+=`- **Salud Máxima:** ${s.stats.maxHealth}
`,t+=`- **Exquiva:** ${s.stats.evasion.value}${s.stats.evasion.note?` (${s.stats.evasion.note})`:""}
`,t+=`- **Mitigación Física:** ${s.stats.physicalMitigation.value}${s.stats.physicalMitigation.note?` (${s.stats.physicalMitigation.note})`:""}
`,t+=`- **Mitigación Mágica:** ${s.stats.magicalMitigation.value}${s.stats.magicalMitigation.note?` (${s.stats.magicalMitigation.note})`:""}
`,t+=`- **Velocidad:** ${s.stats.speed.value}${s.stats.speed.note?` (${s.stats.speed.note})`:""}

`,t+=`- **Iniciativa:** ${s.attributes.reflexes}

`,s.attacks&&s.attacks.length>0&&(t+=`## Ataques
`,s.attacks.forEach(a=>{t+=`- **${a.name}:** Modificador de ataque: +${a.bonus}. Daño: ${a.damage}${a.note?` (${a.note})`:""}
`}),t+=`
`),s.traits&&s.traits.length>0&&(t+=`## Rasgos
`,s.traits.forEach(a=>{t+=`- **${a.name}:** ${a.detail}
`}),t+=`
`),s.actions&&s.actions.length>0&&(t+=`## Acciones
`,s.actions.forEach(a=>{t+=`- **${a.name}:** ${a.detail}${a.uses?` (Usos: ${l(a.uses)})`:""}
`}),t+=`
`),s.reactions&&s.reactions.length>0&&(t+=`## Reacciones
`,s.reactions.forEach(a=>{t+=`- **${a.name}:** ${a.detail}${a.uses?` (Usos: ${l(a.uses)})`:""}
`}),t+=`
`),t},l=s=>{switch(s?.type){case"RELOAD":return`${s.qty} [Recarga ${s.qty}+]`;case"USES":case"LONG_REST":return`${s.qty}`;default:return""}},A="/docs/bestiary.yml",R=async()=>{const s=await n(A);let t=[];try{t=m(s).creatures??[]}catch(o){console.error("Error parsing YAML:",o)}return t.map(o=>$(o)).map(y).join(`---

`)},h="/docs/cards.yml",M="/docs/magical-items.yml",f=s=>{if(!s||!s.type)return"N/A";switch(s.type){case"LONG_REST":return`${s.qty??"—"} por día de descanso`;case"RELOAD":return`1 (Recarga ${s.qty??"—"}+)`;case"USES":return`${s.qty??"—"}`;default:return"—"}},u=s=>{const t=[];return t.push(s.name),t.push(s.level.toString()),t.push(s.type),t.push(s.description),t.push(s.tags?s.tags.join(", "):"—"),t.push(s.requirements?s.requirements.join(", "):"—"),t.push(f(s.uses)),s.cardType==="item"&&t.push(s.cost.toString()),`| ${t.join(" | ")} |`},E=s=>{const t=["Nombre","Nivel","Tipo","Descripción","Etiquetas","Requerimientos","Usos"];s[0].cardType==="item"&&t.push("Costo (oro)");const a=s.map(u);return`| **${t.join("** | **")}** |
| --- | --- | --- | --- | --- | --- | --- |
${a.join(`
`)}`},r=async(s,t,a)=>{const o=await n(s);let e=[];try{e=m(o)[a]??[]}catch(i){console.error("Error parsing YAML:",i)}const c=e.map(i=>t(i));return E(c)},v=async()=>await r(h,p,"cards"),I=async()=>await r(M,d,"items"),b="/docs/gm.md",q=async()=>await n(b),L="/docs/player.md",S=async()=>await n(L);export{S as a,q as b,R as c,v as d,I as e,n as l};
