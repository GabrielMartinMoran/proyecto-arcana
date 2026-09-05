---
name: arcana-reference
description: >-
  Consulta el sistema de reglas ARCANA y responde con citas verificables.
  Activa en español o inglés cuando el usuario pregunte por reglas o rules,
  manuales o manuals, capítulos o chapters, mecánicas o mechanics, cartas de
  habilidades o cards, arquetipos o archetypes, linajes o lineages, dotes o
  feats, sinergias o synergies, objetos mágicos o magic items, criaturas o
  creatures, NPCs, bestiario o bestiary, o diseño de criaturas o creature
  design, incluso si no dice "arcana-reference".
---

# ARCANA Reference

Busca con el CLI incluido y responde citando la fuente exacta. No adivines
capítulos ni rutas: primero consulta el índice global.

## Flujo

1. **Clasifica la intención**: regla de jugador, regla de director, carta,
   objeto, criatura o diseño de criaturas.
2. **Busca** desde el directorio real del CLI (`scripts/arcana-content-searcher/`):

   ```bash
   cd scripts/arcana-content-searcher
   node dist/index.js search --query "<tu consulta>"
   ```

   Añade filtros cuando la intención los declare: `--kind`, `--level`, `--tag`,
   `--source`, `--limit 3`. El CLI ya viene empaquetado: no necesitas instalar
   dependencias ni compilarlo.

3. **Abre solo la fuente devuelta**: el campo `source` es una ruta `ruta#ancla`
   relativa a la raíz de la skill. No cargues el documento completo ni el
   índice: abre únicamente esa sección o esa entrada YAML.
4. **Responde citando** la sección que acabas de leer, con la misma ruta y
   heading del resultado.

## Familias disponibles

| Familia               | Dónde se abre                       | Ejemplo de consulta                                              |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Manual del Jugador    | `references/manual-del-jugador/`    | `search --query "qué es Ventaja"`                                |
| Manual del Director   | `references/manual-del-director/`   | `search --query "diseñar criaturas con PPF" --source gm.md`      |
| Cartas de habilidades | `references/cartas-de-habilidades/` | `search --query "Bardo" --kind card --level 3`                   |
| Objetos mágicos       | `references/objetos-magicos/`       | `search --query "Utilidad" --kind item --level 3 --tag Utilidad` |
| Bestiario             | `references/bestiario/`             | `search --query "Liche"`                                         |

Ejemplos ejecutables (desde el directorio del CLI):

- Regla de jugador: `node dist/index.js search --query "qué es Ventaja"` — sección
  `references/manual-del-jugador/03-mecanicas-de-juego.md#ayuda-ventaja-y-desventaja`.
- Cartas por clase y nivel: `node dist/index.js search --query "Bardo" --kind card --level 2` —
  cartas de `references/cartas-de-habilidades/arquetipos/bardo/nivel-2.yml`.
- Carta exacta: `node dist/index.js search --query "Pacto Supremo"` — carta con slug
  canónico `pacto-supremo` en `references/cartas-de-habilidades/arquetipos/brujo/arquetipo-nivel-1.yml`.
- Objetos con filtros: `node dist/index.js search --query "Utilidad" --kind item --level 3 --tag Utilidad`.
- Criatura sin conocer su rango: `node dist/index.js search --query "Liche"` —
  `references/bestiario/rango-6.md#liche`.
- Diseño avanzado (PPF): `node dist/index.js search --query "PPF" --source gm.md`.

Para catálogos de cartas y objetos conserva también `list` y `detail`:

- `node dist/index.js list --kind ability --tag "Bardo" --levels 2,3 --show-slug`
- `node dist/index.js detail "pacto-supremo"`

## Salida del buscador (contrato mínimo)

Por defecto `search` devuelve JSON compacto: no incluye el documento completo
ni el score.

```json
{
	"status": "found",
	"results": [
		{
			"rank": 1,
			"confidence": "high",
			"kind": "creature",
			"name": "Liche",
			"source": "references/bestiario/rango-6.md#liche"
		}
	],
	"nextAction": "Abrir el resultado 1 y responder citando esa sección."
}
```

- `status`: `found`, `ambiguous`, `not_found` o `invalid_query`.
- Cada resultado: `rank`, `confidence` (`high`/`medium`/`low`), `kind`, `name` y `source` (`ruta#ancla`).
- `nextAction`: qué hacer con el resultado.
- Para depurar coincidencias, añade `--explain` (expone score, campos y tipo de
  coincidencia). Eso es solo para depuración: no lo pidas en cada consulta.

## Fallback: si la primera fuente no responde

1. Conserva la consulta original; no la reescribas ni la "mejores".
2. Marca esa fuente como insuficiente para la intención.
3. Abre la siguiente referencia en orden de `rank` (2, 3, ...).
4. No presentes la primera fuente como normativa.
5. Si agotas la lista, declara la ausencia con `not_found`.

## Reglas de respuesta

- **Cita verificable**: responde con `ruta#ancla` de la fuente que leíste.
- **No inventes** reglas, cartas, objetos, criaturas ni rangos.
- **Ambigüedad**: si `status` es `ambiguous`, muestra las alternativas con su
  `source` y pide elegir; no resuelvas por el usuario sin verificar.
- **Fuzzy**: la coincidencia fuzzy tiene confianza `medium` como máximo; abre la
  fuente real antes de afirmar cualquier cosa.
- **No encontrado**: con `not_found` declara que no hay una fuente suficiente y
  ofrece solo las sugerencias verificadas que devuelva el CLI.
- **Consulta inválida**: con `invalid_query` pide términos o reformula con un
  término concreto de la consulta original.

---

## Manual del Jugador

- [1. Filosofía de Diseño](references/manual-del-jugador/01-filosofia-de-diseno.md)
- [2. Creación de Personajes](references/manual-del-jugador/02-creacion-de-personajes.md)
- [3. Mecánicas de Juego](references/manual-del-jugador/03-mecanicas-de-juego.md)
- [4. El Sistema de Cartas](references/manual-del-jugador/04-el-sistema-de-cartas.md)
- [5. Exploración](references/manual-del-jugador/05-exploracion.md)
- [6. Interacción Social](references/manual-del-jugador/06-interaccion-social.md)
- [7. Combate](references/manual-del-jugador/07-combate.md)
- [8. Estados y Condiciones](references/manual-del-jugador/08-estados-y-condiciones.md)
- [9. Progresión del Personaje](references/manual-del-jugador/09-progresion-del-personaje.md)
- [10. Tiempo Entre Aventuras](references/manual-del-jugador/10-tiempo-entre-aventuras.md)
- [11. Equipo y Economía](references/manual-del-jugador/11-equipo-y-economia.md)
- [12. Reglas Narrativas Avanzadas](references/manual-del-jugador/12-reglas-narrativas-avanzadas.md)
- [13. Un Ejemplo de Juego](references/manual-del-jugador/13-un-ejemplo-de-juego.md)

## Manual del Director

- [Guía para el Director de Juego](references/manual-del-director/01-guia-para-el-director-de-juego.md)
- [Otorgar Puntos de Progreso (PP)](references/manual-del-director/02-otorgar-puntos-de-progreso-pp.md)
- [El Pacto de Caos](references/manual-del-director/03-el-pacto-de-caos.md)
- [Guía de Recompensas: Tesoro y Equipo](references/manual-del-director/04-guia-de-recompensas-tesoro-y-equipo.md)
- [Establecer Niveles de Dificultad (ND) para Pruebas de Habilidad](references/manual-del-director/05-establecer-niveles-de-dificultad-nd-para-pruebas-de-habilidad.md)
- [Diseñar Criaturas y Encuentros](references/manual-del-director/06-disenar-criaturas-y-encuentros.md)
- [Parte 1: Diseñar Encuentros](references/manual-del-director/07-parte-1-disenar-encuentros.md)
- [Parte 2: Diseño Avanzado de Criaturas](references/manual-del-director/08-parte-2-diseno-avanzado-de-criaturas.md)
- [Guía de Diseño de Conjuros y Habilidades](references/manual-del-director/09-guia-de-diseno-de-conjuros-y-habilidades.md)

## Cartas de Habilidades

- [Linaje — Nivel 1](references/cartas-de-habilidades/linaje/nivel-1.yml)
- [Dote — Nivel 1](references/cartas-de-habilidades/dote/nivel-1.yml)
- [Dote — Nivel 2](references/cartas-de-habilidades/dote/nivel-2.yml)
- [Arquetipo — Pícaro — Nivel 1](references/cartas-de-habilidades/arquetipos/picaro/arquetipo-nivel-1.yml)
- [Pícaro — Nivel 1](references/cartas-de-habilidades/arquetipos/picaro/nivel-1.yml)
- [Pícaro — Nivel 2](references/cartas-de-habilidades/arquetipos/picaro/nivel-2.yml)
- [Pícaro — Nivel 3](references/cartas-de-habilidades/arquetipos/picaro/nivel-3.yml)
- [Pícaro — Nivel 4](references/cartas-de-habilidades/arquetipos/picaro/nivel-4.yml)
- [Pícaro — Nivel 5](references/cartas-de-habilidades/arquetipos/picaro/nivel-5.yml)
- [Combatiente — Nivel 1](references/cartas-de-habilidades/combatiente/nivel-1.yml)
- [Combatiente — Nivel 2](references/cartas-de-habilidades/combatiente/nivel-2.yml)
- [Combatiente — Nivel 3](references/cartas-de-habilidades/combatiente/nivel-3.yml)
- [Combatiente — Nivel 4](references/cartas-de-habilidades/combatiente/nivel-4.yml)
- [Combatiente — Nivel 5](references/cartas-de-habilidades/combatiente/nivel-5.yml)
- [Arquetipo — Coloso — Nivel 1](references/cartas-de-habilidades/arquetipos/coloso/arquetipo-nivel-1.yml)
- [Coloso — Nivel 1](references/cartas-de-habilidades/arquetipos/coloso/nivel-1.yml)
- [Coloso — Nivel 2](references/cartas-de-habilidades/arquetipos/coloso/nivel-2.yml)
- [Coloso — Nivel 3](references/cartas-de-habilidades/arquetipos/coloso/nivel-3.yml)
- [Coloso — Nivel 4](references/cartas-de-habilidades/arquetipos/coloso/nivel-4.yml)
- [Coloso — Nivel 5](references/cartas-de-habilidades/arquetipos/coloso/nivel-5.yml)
- [Arquetipo — Céfiro — Nivel 1](references/cartas-de-habilidades/arquetipos/cefiro/arquetipo-nivel-1.yml)
- [Céfiro — Nivel 1](references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml)
- [Céfiro — Nivel 2](references/cartas-de-habilidades/arquetipos/cefiro/nivel-2.yml)
- [Céfiro — Nivel 3](references/cartas-de-habilidades/arquetipos/cefiro/nivel-3.yml)
- [Céfiro — Nivel 4](references/cartas-de-habilidades/arquetipos/cefiro/nivel-4.yml)
- [Céfiro — Nivel 5](references/cartas-de-habilidades/arquetipos/cefiro/nivel-5.yml)
- [Arcanista — Nivel 1](references/cartas-de-habilidades/arcanista/nivel-1.yml)
- [Arcanista — Nivel 2](references/cartas-de-habilidades/arcanista/nivel-2.yml)
- [Arcanista — Nivel 3](references/cartas-de-habilidades/arcanista/nivel-3.yml)
- [Arcanista — Nivel 4](references/cartas-de-habilidades/arcanista/nivel-4.yml)
- [Arcanista — Nivel 5](references/cartas-de-habilidades/arcanista/nivel-5.yml)
- [Arquetipo — Mago — Nivel 1](references/cartas-de-habilidades/arquetipos/mago/arquetipo-nivel-1.yml)
- [Mago — Nivel 1](references/cartas-de-habilidades/arquetipos/mago/nivel-1.yml)
- [Mago — Nivel 2](references/cartas-de-habilidades/arquetipos/mago/nivel-2.yml)
- [Mago — Nivel 3](references/cartas-de-habilidades/arquetipos/mago/nivel-3.yml)
- [Mago — Nivel 4](references/cartas-de-habilidades/arquetipos/mago/nivel-4.yml)
- [Mago — Nivel 5](references/cartas-de-habilidades/arquetipos/mago/nivel-5.yml)
- [Arquetipo — Brujo — Nivel 1](references/cartas-de-habilidades/arquetipos/brujo/arquetipo-nivel-1.yml)
- [Brujo — Nivel 1](references/cartas-de-habilidades/arquetipos/brujo/nivel-1.yml)
- [Brujo — Nivel 2](references/cartas-de-habilidades/arquetipos/brujo/nivel-2.yml)
- [Brujo — Nivel 3](references/cartas-de-habilidades/arquetipos/brujo/nivel-3.yml)
- [Brujo — Nivel 4](references/cartas-de-habilidades/arquetipos/brujo/nivel-4.yml)
- [Brujo — Nivel 5](references/cartas-de-habilidades/arquetipos/brujo/nivel-5.yml)
- [Arquetipo — Hechicero — Nivel 1](references/cartas-de-habilidades/arquetipos/hechicero/arquetipo-nivel-1.yml)
- [Hechicero — Nivel 1](references/cartas-de-habilidades/arquetipos/hechicero/nivel-1.yml)
- [Hechicero — Nivel 2](references/cartas-de-habilidades/arquetipos/hechicero/nivel-2.yml)
- [Hechicero — Nivel 3](references/cartas-de-habilidades/arquetipos/hechicero/nivel-3.yml)
- [Hechicero — Nivel 4](references/cartas-de-habilidades/arquetipos/hechicero/nivel-4.yml)
- [Hechicero — Nivel 5](references/cartas-de-habilidades/arquetipos/hechicero/nivel-5.yml)
- [Arquetipo — Sacerdote — Nivel 1](references/cartas-de-habilidades/arquetipos/sacerdote/arquetipo-nivel-1.yml)
- [Sacerdote — Nivel 1](references/cartas-de-habilidades/arquetipos/sacerdote/nivel-1.yml)
- [Sacerdote — Nivel 2](references/cartas-de-habilidades/arquetipos/sacerdote/nivel-2.yml)
- [Sacerdote — Nivel 3](references/cartas-de-habilidades/arquetipos/sacerdote/nivel-3.yml)
- [Sacerdote — Nivel 4](references/cartas-de-habilidades/arquetipos/sacerdote/nivel-4.yml)
- [Sacerdote — Nivel 5](references/cartas-de-habilidades/arquetipos/sacerdote/nivel-5.yml)
- [Arquetipo — Druida — Nivel 1](references/cartas-de-habilidades/arquetipos/druida/arquetipo-nivel-1.yml)
- [Druida — Nivel 1](references/cartas-de-habilidades/arquetipos/druida/nivel-1.yml)
- [Druida — Nivel 2](references/cartas-de-habilidades/arquetipos/druida/nivel-2.yml)
- [Druida — Nivel 3](references/cartas-de-habilidades/arquetipos/druida/nivel-3.yml)
- [Druida — Nivel 4](references/cartas-de-habilidades/arquetipos/druida/nivel-4.yml)
- [Druida — Nivel 5](references/cartas-de-habilidades/arquetipos/druida/nivel-5.yml)
- [Arquetipo — Bardo — Nivel 1](references/cartas-de-habilidades/arquetipos/bardo/arquetipo-nivel-1.yml)
- [Bardo — Nivel 1](references/cartas-de-habilidades/arquetipos/bardo/nivel-1.yml)
- [Bardo — Nivel 2](references/cartas-de-habilidades/arquetipos/bardo/nivel-2.yml)
- [Bardo — Nivel 3](references/cartas-de-habilidades/arquetipos/bardo/nivel-3.yml)
- [Bardo — Nivel 4](references/cartas-de-habilidades/arquetipos/bardo/nivel-4.yml)
- [Bardo — Nivel 5](references/cartas-de-habilidades/arquetipos/bardo/nivel-5.yml)
- [Arquetipo — Monje — Nivel 1](references/cartas-de-habilidades/arquetipos/monje/arquetipo-nivel-1.yml)
- [Monje — Nivel 1](references/cartas-de-habilidades/arquetipos/monje/nivel-1.yml)
- [Monje — Nivel 2](references/cartas-de-habilidades/arquetipos/monje/nivel-2.yml)
- [Monje — Nivel 3](references/cartas-de-habilidades/arquetipos/monje/nivel-3.yml)
- [Monje — Nivel 4](references/cartas-de-habilidades/arquetipos/monje/nivel-4.yml)
- [Monje — Nivel 5](references/cartas-de-habilidades/arquetipos/monje/nivel-5.yml)
- [Sinergia — Nivel 4](references/cartas-de-habilidades/sinergia/nivel-4.yml)

## Objetos Mágicos

- [Objetos Mágicos — Nivel 1](references/objetos-magicos/nivel-1.yml)
- [Objetos Mágicos — Nivel 2](references/objetos-magicos/nivel-2.yml)
- [Objetos Mágicos — Nivel 3](references/objetos-magicos/nivel-3.yml)
- [Objetos Mágicos — Nivel 4](references/objetos-magicos/nivel-4.yml)
- [Objetos Mágicos — Nivel 5](references/objetos-magicos/nivel-5.yml)
- [Objetos Mágicos — Nivel 6](references/objetos-magicos/nivel-6.yml)

## Bestiario

- [Bestiario — Rango 1](references/bestiario/rango-1.md)
- [Bestiario — Rango 2](references/bestiario/rango-2.md)
- [Bestiario — Rango 3](references/bestiario/rango-3.md)
- [Bestiario — Rango 4](references/bestiario/rango-4.md)
- [Bestiario — Rango 5](references/bestiario/rango-5.md)
- [Bestiario — Rango 6](references/bestiario/rango-6.md)
