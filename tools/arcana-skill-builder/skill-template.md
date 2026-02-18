---
name: arcana-reference
description: This skill should be used when the user asks to "consultar reglas de ARCANA", "buscar cartas de habilidades u objetos mágicos", "resumir capítulos del manual ARCANA", or "listar arquetipos y contenido derivado del sistema ARCANA".
metadata:
  updated_at: <!-- BUILD:COMPILED-AT -->
---

# ARCANA Reference Skill

## Alcance

- Consulta rápidamente manuales, cartas de habilidades, objetos mágicos y bestiario del sistema ARCANA.
- Extrae listas filtradas o detalla contenido específico mediante la herramienta CLI incluida.
- Mantiene el material organizado con orientación sobre qué archivo abrir según la tarea.

## Cuándo aplicar la skill

- Solicitan describir mecánicas del jugador o director dentro de ARCANA.
- Requieren inventariar o comparar cartas de habilidades, arquetipos u objetos mágicos.
- Necesitan estadísticas o filtros rápidos sobre el compendio (por tag, nivel, requisitos).
- Piden guiar al usuario hacia recursos detallados almacenados en `references/`.

## Herramientas

### arcana-content-searcher

CLI residente en `scripts/arcana-content-searcher/` (Node.js ≥ 18, depende de `js-yaml`).

Pasos rápidos:
1. `cd scripts/arcana-content-searcher`
2. `npm install`
3. `npm run build` (genera `dist/index.js`)

Comandos útiles:

- **Listar cartas filtradas** (tipo, etiquetas, niveles, etc.):  
  `node scripts/arcana-content-searcher/dist/index.js list --kind ability --tag "Bardo" --levels 2,3 --show-slug`
- **Mostrar el detalle de una carta** (id, slug o nombre; opcional `--kind ability|item`):  
  `node scripts/arcana-content-searcher/dist/index.js detail "arquetipo-brujo-pacto-siniestro" --hide-tags`
- **Ver ayuda integrada**:  
  `node scripts/arcana-content-searcher/dist/index.js help`

Puedes definir `ARCANA_DATASET_DIR` para apuntar a YAML externos; por defecto lee `references/`.

## Uso de referencias

- Manual del Jugador: `references/manual-del-jugador/` (capítulos 01-13).
- Manual del Director: `references/manual-del-director/` (guías 01-09).
- Bestiario: `references/bestiario/rango-#.md`.
- Cartas de Habilidades:  
  - Arquetipos consolidados: `references/cartas-de-habilidades/arquetipos/<clase>/`.  
  - Cartas generales: `references/cartas-de-habilidades/<tag>/`.
- Objetos Mágicos: `references/objetos-magicos/nivel-#.yml`.

> Carga únicamente los archivos necesarios para mantener la ventana de contexto liviana.

## Buenas prácticas

- Responde de forma concisa citando secciones relevantes.
- Usa el CLI cuando necesites filtrar o validar datos antes de responder.
- Mantén sincronizada la jerarquía `references/` con el contenido generado automáticamente.

---

<!-- BUILD:INSERT-GENERATED-CONTENT -->