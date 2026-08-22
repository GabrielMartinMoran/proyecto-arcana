# Evals de routing — arcana-reference

Evals estáticos de routing para la skill `arcana-reference`. Verifican que un
agente entienda qué buscar, cómo interpretar la salida mínima del CLI y cómo
continuar con la siguiente fuente cuando la primera no responde.

## Contenido

- `arcana-reference-routing.json` — casos de routing (positivos y negativos),
  casos de activación del trigger y assertions objetivas.
- Este `README.md` — guía de uso y mantenimiento.

## Formato

Cada caso de ruta del JSON usa el contrato del CLI `arcana-content-searcher`
(`node dist/index.js search`):

- `expected_route.status`: uno de `found`, `ambiguous`, `not_found`,
  `invalid_query`.
- `expected_route.kind`: familia del primer resultado (`chapter`, `card`,
  `item`, `creature`, `section`).
- `expected_route.family`: Manual del Jugador, Manual del Director, Cartas,
  Objetos o Bestiario.
- `expected_route.command`: comando real del CLI (sin `cd` duplicado).
- `expectations`: comportamientos verificables de la respuesta del agente.
- `assertions`: checks objetivos ejecutables sobre la salida del CLI o el
  comportamiento documentado.

Los `trigger_cases` evalúan solo la activación (descripción frontmatter de la
skill) con `should_trigger` true/false.

## Uso

Estos evals son estáticos y deterministas: no invocan LLM ni escriben
resultados inventados. Un harness puede:

1. Ejecutar cada `expected_route.command` con el CLI empaquetado.
2. Comprobar `assertions` contra la salida JSON real.
3. Verificar `trigger_cases` contra la descripción de la skill cuando se
   genere.

Referencia: `specs/features/arcana-reference-global-search.feature` y
`.pas/state/active/arcana-reference-search-design-v1.md`.

## Mantenimiento

- Si cambia el índice o el ranking, actualiza los valores esperados con la
  salida real del CLI; no edites a mano sin verificar primero.
- Si cambia el contrato de salida (status, campos) o el nombre del CLI,
  actualiza las `assertions` en el mismo cambio.
- Los casos negativos (typo, ambiguo, no encontrado) son parte del contrato de
  no invención y no deben eliminarse.
