import{m as c}from"./DemwCk8g.js";import{l as $}from"./CGjaQNWU.js";import{m as r,a as d}from"./BtSkwSql.js";import{r as g}from"./C0Eb1h3l.js";const i=async s=>await(await fetch(g(s))).text(),p=s=>{let t="";return t+=`# ${s.name}

`,t+=`**NA:** ${s.na}

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
`),t},l=s=>{switch(s?.type){case"RELOAD":return`${s.qty} [Recarga ${s.qty}+]`;case"USES":case"LONG_REST":return`${s.qty}`;default:return""}},y="/docs/bestiary.yml",I=async()=>{const s=await i(y);let t=[];try{t=$(s).creatures??[]}catch(n){console.error("Error parsing YAML:",n)}return t.map(n=>c(n)).map(p).join(`---

`)},A="/docs/cards.yml",f="/docs/magical-items.yml",M=s=>{if(!s||!s.type)return"N/A";switch(s.type){case"LONG_REST":return`${s.qty??"—"} por día de descanso`;case"RELOAD":return`1 (Recarga ${s.qty??"—"}+)`;case"USES":return`${s.qty??"—"}`;default:return"—"}},h=s=>{let t="";t+=`# ${s.name}

`,t+=`**Nivel:** ${s.level}

`,t+=`**Tipo:** ${s.type.charAt(0).toUpperCase()+s.type.slice(1)}

`,s.cardType==="item"&&(t+=`**Costo:** ${s.cost} de oro

`),t+=`**Descripción:**
${s.description}

`,s.tags&&s.tags.length>0&&(t+=`**Etiquetas:** ${s.tags?s.tags.join(", "):"—"}

`),t+=`**Requerimientos:** ${s.requirements&&s.requirements.length>0?s.requirements.join(", "):"—"}

`;const a=M(s.uses);return a!=="N/A"&&(t+=`**Usos:** ${a}

`),t},m=async(s,t,a)=>{const n=await i(s);let e=[];try{e=$(n)[a]??[]}catch(o){console.error("Error parsing YAML:",o)}return e.map(o=>t(o)).map(h).join(`---

`)},R=async()=>await m(A,r,"cards"),T=async()=>await m(f,d,"items"),E="/docs/gm.md",u=async()=>await i(E),C="/docs/player.md",w=async()=>await i(C);export{w as a,u as b,I as c,R as d,T as e,i as l};
