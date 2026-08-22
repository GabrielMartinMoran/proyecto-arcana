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

<!-- BUILD:INSERT-GENERATED-CONTENT -->
