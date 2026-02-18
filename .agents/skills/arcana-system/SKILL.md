---
name: arcana-reference
description: This skill should be used when the user asks to "consultar reglas de ARCANA", "buscar cartas de habilidades u objetos mágicos", "resumir capítulos del manual ARCANA", or "listar arquetipos y contenido derivado del sistema ARCANA".
metadata:
  updated_at: Wed, 18 Feb 2026 19:49:44 GMT
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
- [Arquetipo — Combatiente — Nivel 1](references/cartas-de-habilidades/arquetipos/combatiente/arquetipo-nivel-1.yml)
- [Combatiente — Nivel 1](references/cartas-de-habilidades/arquetipos/combatiente/nivel-1.yml)
- [Combatiente — Nivel 2](references/cartas-de-habilidades/arquetipos/combatiente/nivel-2.yml)
- [Combatiente — Nivel 3](references/cartas-de-habilidades/arquetipos/combatiente/nivel-3.yml)
- [Combatiente — Nivel 4](references/cartas-de-habilidades/arquetipos/combatiente/nivel-4.yml)
- [Combatiente — Nivel 5](references/cartas-de-habilidades/arquetipos/combatiente/nivel-5.yml)
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
- [Arquetipo — Brujo — Nivel 1](references/cartas-de-habilidades/arquetipos/brujo/arquetipo-nivel-1.yml)
- [Brujo — Nivel 1](references/cartas-de-habilidades/arquetipos/brujo/nivel-1.yml)
- [Brujo — Nivel 2](references/cartas-de-habilidades/arquetipos/brujo/nivel-2.yml)
- [Brujo — Nivel 3](references/cartas-de-habilidades/arquetipos/brujo/nivel-3.yml)
- [Brujo — Nivel 4](references/cartas-de-habilidades/arquetipos/brujo/nivel-4.yml)
- [Arquetipo — Hechicero — Nivel 1](references/cartas-de-habilidades/arquetipos/hechicero/arquetipo-nivel-1.yml)
- [Hechicero — Nivel 1](references/cartas-de-habilidades/arquetipos/hechicero/nivel-1.yml)
- [Hechicero — Nivel 2](references/cartas-de-habilidades/arquetipos/hechicero/nivel-2.yml)
- [Hechicero — Nivel 3](references/cartas-de-habilidades/arquetipos/hechicero/nivel-3.yml)
- [Hechicero — Nivel 4](references/cartas-de-habilidades/arquetipos/hechicero/nivel-4.yml)
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
