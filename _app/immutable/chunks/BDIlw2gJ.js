import{m as r}from"./W6WjCfrW.js";import{l as m}from"./CGjaQNWU.js";import{m as p,a as g}from"./DF-fq5rF.js";import{r as d}from"./BHfqdo5F.js";const o=async s=>await(await fetch(d(s))).text(),y=s=>{let t="";return t+=`# ${s.name}

`,t+=`**Rango:** ${s.tier}

`,s.behavior&&(t+=`**Comportamiento:** ${s.behavior}

`),s.languages&&s.languages.length>0?t+=`**Lenguas:** ${s.languages.join(", ")}

`:t+=`**Lenguas:** Ninguna

`,t+=`## Atributos
`,t+=`- **Cuerpo:** ${s.attributes.body}
`,t+=`- **Reflejos:** ${s.attributes.reflexes}
`,t+=`- **Mente:** ${s.attributes.mind}
`,t+=`- **Instinto:** ${s.attributes.instinct}
`,t+=`- **Presencia:** ${s.attributes.presence}

`,t+=`## Estadísticas
`,t+=`- **Salud Máxima:** ${s.stats.maxHealth}
`,t+=`- **Esquiva:** ${s.stats.evasion.value}${s.stats.evasion.note?` (${s.stats.evasion.note})`:""}
`,t+=`- **Mitigación Física:** ${s.stats.physicalMitigation.value}${s.stats.physicalMitigation.note?` (${s.stats.physicalMitigation.note})`:""}
`,t+=`- **Mitigación Mágica:** ${s.stats.magicalMitigation.value}${s.stats.magicalMitigation.note?` (${s.stats.magicalMitigation.note})`:""}
`,t+=`- **Velocidad:** ${s.stats.speed.value}${s.stats.speed.note?` (${s.stats.speed.note})`:""}

`,t+=`- **Iniciativa:** ${s.attributes.reflexes}

`,s.attacks&&s.attacks.length>0&&(t+=`## Ataques
`,s.attacks.forEach(a=>{t+=`- **${a.name}:** +${a.bonus} para golpear. Daño: ${a.damage}${a.note?` (${a.note})`:""}
`}),t+=`
`),s.traits&&s.traits.length>0&&(t+=`## Rasgos
`,s.traits.forEach(a=>{t+=`- **${a.name}:** ${a.detail}
`}),t+=`
`),s.actions&&s.actions.length>0&&(t+=`## Acciones
`,s.actions.forEach(a=>{t+=`- **${a.name}:** ${a.detail}${a.uses?` (Usos: ${e(a.uses)})`:""}
`}),t+=`
`),s.reactions&&s.reactions.length>0&&(t+=`## Reacciones
`,s.reactions.forEach(a=>{t+=`- **${a.name}:** ${a.detail}${a.uses?` (Usos: ${e(a.uses)})`:""}
`}),t+=`
`),s.interactions&&s.interactions.length>0&&(t+=`## Interacciones
`,s.interactions.forEach(a=>{t+=`- **${a.name}:** ${a.detail}${a.uses?` (Usos: ${e(a.uses)})`:""}
`}),t+=`
`),t},e=s=>{switch(s?.type){case"RELOAD":return`${s.qty} [Recarga ${s.qty}+]`;case"USES":case"LONG_REST":return`${s.qty}`;default:return""}},h="/docs/bestiary.yml",T=async()=>{const s=await o(h);let t=[];try{t=m(s).creatures??[]}catch(n){console.error("Error parsing YAML:",n)}return t.map(n=>r(n)).map(y).join(`---

`)},A="/docs/cards.yml",f="/docs/magical-items.yml",M=s=>{if(!s||!s.type)return"N/A";switch(s.type){case"LONG_REST":return`${s.qty??"—"} por día de descanso`;case"RELOAD":return`1 (Recarga ${s.qty??"—"}+)`;case"USES":return`${s.qty??"—"}`;default:return"—"}},E=s=>{const t=[];return t.push(s.name),t.push(s.level.toString()),t.push(s.type),t.push(s.description),t.push(s.tags?s.tags.join(", "):"—"),t.push(s.requirements?s.requirements.join(", "):"—"),t.push(M(s.uses)),s.cardType==="item"&&t.push(s.cost.toString()),`| ${t.join(" | ")} |`},u=s=>{const t=["Nombre","Nivel","Tipo","Descripción","Etiquetas","Requerimientos","Usos"];s[0].cardType==="item"&&t.push("Costo (oro)");const a=s.map(E);return`| **${t.join("** | **")}** |
| --- | --- | --- | --- | --- | --- | --- |
${a.join(`
`)}`},$=async(s,t,a)=>{const n=await o(s);let l=[];try{l=m(n)[a]??[]}catch(i){console.error("Error parsing YAML:",i)}const c=l.map(i=>t(i));return u(c)},I=async()=>await $(A,p,"cards"),v=async()=>await $(f,g,"items"),b="/docs/gm.md",S=async()=>await o(b),L="/docs/player.md",q=async()=>await o(L);export{q as a,S as b,T as c,I as d,v as e,o as l};
