## Lineamientos de arquitectura, diseño y buenas prácticas

Este documento define cómo continuar trabajando en este repositorio de forma consistente, escalable y mantenible. Está orientado a Vanilla JavaScript con arquitectura modular, componentes UI y SPA con routing por hash.

### Objetivos y principios

- **Simplicidad primero (KISS)**: resolver necesidades actuales sin sobre-ingeniería.
- **YAGNI**: no implementar funcionalidades hasta que sean necesarias.
- **SOLID aplicado a front Vanilla**: cada módulo con una sola responsabilidad clara; acoplamiento bajo, cohesión alta.
- **Componentización**: UI y lógica encapsulada por componente/página.
- **Accesibilidad y performance**: UI navegable, rápida, responsiva y estable.

### Estructura de carpetas (alto nivel)

```
config/                      # Datos de configuración (JSON sin comentarios)
docs/                        # Documentación (este documento, manuales, etc.)
src/
  app.js                    # Bootstrap de la app
  app.css                   # Estilos globales y tokens de diseño
  router.js                 # Routing hash-based
  models/                   # Modelos y constantes (p.ej., rules.js)
  services/                 # Servicios (estado global, datos de cartas)
  utils/                    # Utilidades (storage, styles, markdown, dice)
  components/               # Componentes reutilizables (cada uno con su .js y .css)
  pages/                    # Páginas (cada una compuesta por componentes)
index.html                  # Punto de entrada (helpers $, html, fonts, marked CDN)
LICENSE                     # MIT
```

### Componentes UI

- Cada componente en `src/components/Nombre/Nombre.js` y `src/components/Nombre/Nombre.css`.
- El componente debe:
    - exportar una factoría `Component(container, props)` que retorne `{ init, setState, ...opcionales }`.
    - llamar `ensureStyle('./ruta/al/css.css')` en `init()` para cargar su CSS una sola vez.
    - recibir `props` simples y mantener estado interno mínimo; exponer `setState(partial)` para re-render.
    - usar event delegation para elementos dinámicos.
- Ejemplo (patrón abreviado):

```js
import { ensureStyle } from '../../utils/style-utils.js';

const MyComponent = (container, props = {}) => {
    let state = { ...props };

    const render = () => html`<div class="my">...</div>`;

    const bind = () => {
        // event delegation aquí
    };

    return {
        init: () => {
            ensureStyle('./src/components/MyComponent/MyComponent.css');
            container.innerHTML = render();
            bind();
        },
        setState: (partial) => {
            state = { ...state, ...partial };
            container.innerHTML = render();
            bind();
        },
    };
};

export default MyComponent;
```

### Páginas

- Usar `LayoutWithSidebar` para título de página, panel principal, sidebar y footer.
- Mantener la página lo más declarativa posible, delegando UI a componentes.
- Reglas comunes:
    - Título en `main-panel`, sidebar fijo a la izquierda.
    - Reset de scroll al cambiar de ruta (ya implementado en `router.js`).
    - App bar móvil fijo (56px) y drawer para navegación.

### Estilos (CSS)

- Tokens globales en `src/app.css` (variables, botones, modales, footer). No estilos de componente.
- Cada componente/página define su `.css` y lo carga vía `ensureStyle`.
- Usar sintaxis moderna con anidación (nesting) en todos los CSS.
- Responsivo móvil primero. Breakpoints recomendados: 640px, 1000px, 1200px.
- Grillas de cartas: `repeat(auto-fit, minmax(320px, 1fr))` para 2–3 columnas adaptables.
- Z-index: dropdowns/filtros requieren capas altas sobre tarjetas; documentar si supera 1000.
- No reintroducir variables antiguas (e.g., referencias a “pokemon”): usar `--accent-*`, `--brand-link`.

### Estado y servicios

- Estado global mínimo vía `src/services/state-service.js` (observer pattern) sólo cuando haya beneficios claros.
- Persistencia en `localStorage` mediante `src/utils/storage-utils.js`. Serializar/parsear con validaciones ligeras.
- Datos de cartas en `src/services/card-service.js` con cache y filtros; normalizar datos (p.ej., `tags`).
- Constantes y reglas en `src/models/rules.js` (cálculo de derivados, ND de conjuro, límites de suerte, etc.).

### Routing

- Hash-based en `src/router.js` con rutas `#/`.
- Ignorar hashes que no empiecen con `#/` para permitir anchors in-page sin romper el router.
- Scroll to top tras navegar; restaurar scroll interno del panel principal.
- Agregar rutas con carga perezosa de páginas y sus componentes.

### Datos y persistencia

- `config/cards.yml` y `config/example-characters.json` sin comentarios (YAML/JSON válidos).
- Cartas: `attribute` y `cooldown` eliminados. `reload` es `{ display, type: 'ROUND'|'LONG_REST'|'ROLL'|null, qty: number|null }`.
- Bestiario en `config/bestiary.yml` con estructura normalizada (ver código y script de export a Markdown).
- Guardar personajes en `localStorage` por colección del usuario; soportar export/import JSON individual.

### Utilidades clave

- `style-utils.js`: `ensureStyle`/`ensureStyles` para evitar cargas duplicadas de CSS.
- `markdown-utils.js`: fetch/render Markdown con Marked, TOC H1/H2, links relativos dentro de la SPA, anchors y smooth scroll.
- `dice-utils.js`: parseo de notación (`1d6`, `2d4`), evaluación de fórmulas, uso en `RollModal` (1d6 base; ventaja +1d4; desventaja −1d4).
- `storage-utils.js`: get/set seguros con manejo de errores y claves namespaced.

### Manuales Markdown

- Renderizar con `MarkdownDoc` y pasar TOC al sidebar mediante `LayoutWithSidebar`/`SidebarComponent`.
- Links `.md` relativos deben rutear dentro de la SPA; anchors in-page con smooth scroll sin cambiar `location.hash` (para permitir recarga).

### Gestión de personajes

- Página `CharactersPage` renderiza la lista y el editor, pero apoyándose en helpers y servicios.
- Pestañas: “Hoja” (atributos, derivados, PP, oro, equipo, salud/temporal, suerte), “Cartas”, “Configuración” (modificadores, retrato), “Bio”, “Notas”.
- Derived: Salud, Velocidad, Esquiva, ND de Conjuro (Mente/Instinto = 5 + atributo) y Suerte máx con modificadores.
- UI de cartas: usar `CardComponent` de forma consistente y ordenar por nivel y nombre.
- Reglas de elegibilidad y activación en el editor; cartas de tipo “Efecto” no son activables.

### Cartas y filtros

- `CardComponent` define todo el contenido visible (sin modal), setea `--accent` según primer tag.
- `actionsRenderer` permite inyectar acciones contextuales (Activar/Desactivar/Añadir/Quitar/No activable).
- `FiltersComponent` ofrece búsqueda, nivel, tipo y `tags` con dropdown de checkboxes y “Limpiar”.
- Filtros de Bestiario se renderizan con `BestiaryFilters` pero comparten estilos.
- En la hoja de personaje, filtros colapsables y “Solo elegibles” activado por defecto en “Añadir a colección”.

### Accesibilidad y UX

- Modal accesible: foco inicial, cierre con ESC, `aria-*` apropiado.
- Botones y enlaces con `aria-label` cuando el texto no sea explícito.
- Contrastes adecuados; inputs y botones con targets táctiles suficientes.
- Mantener consistencia visual (bordes, radios, espaciado) con los tokens globales.

### Rendimiento

- Event delegation para listas dinámicas (cartas, índices de TOC, etc.).
- Evitar re-renderizar contenedores grandes por cambios locales; encapsular y actualizar por secciones.
- Cargar CSS una sola vez por componente (`ensureStyle`).
- Cache de datos (cartas) y pre-computar facets (`tags`).

### Calidad, commits y PRs

- Mensajes de commit en inglés, preferentemente **Conventional Commits**:
    - `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`
    - Ej.: `feat(characters): add spell ND and temp hp`
- Revisiones de código: mantener funciones cortas, nombres descriptivos, early-returns, manejar errores con logs claros.
- Comentarios escuetos y con foco en el “por qué”. Evitar comentarios triviales.
- Lint: mantener CSS y JS sin warnings obvios; no introducir reglas de formato que contradigan el estilo existente.

### Definición de “Hecho” (Checklist)

- [ ] Componentes con `init()` y `ensureStyle` funcionando.
- [ ] CSS con anidación moderna y responsivo probado (360–400, 768, 1024+).
- [ ] Navegación y scroll reseteado entre páginas; drawer móvil funcionando.
- [ ] Estado persistente cuando aplica; migraciones simples para datos viejos.
- [ ] Accesibilidad básica (teclado, foco, labels).
- [ ] Performance: sin flickers; dropdowns por encima de tarjetas (z-index correcto).
- [ ] Cartas ordenadas por nivel en todas las vistas.
- [ ] Import/export de personaje individual probados.

### Cómo agregar una nueva página (resumen)

1. Crear `src/pages/NuevaPage/NuevaPage.js` y `.css`.
2. Usar `LayoutWithSidebar`, setear `pageTitle`, e inicializar contenido con componentes.
3. Cargar estilos con `ensureStyle` en `init()`.
4. Registrar ruta en `src/app.js`/`router.js`.
5. Probar en mobile/desktop y verificar scroll y drawer.

### Cómo crear un nuevo componente (resumen)

1. Carpeta `src/components/Nuevo/Nuevo.js` y `.css`.
2. Factoría con `{ init, setState }` y render declarativo.
3. Cargar estilos con `ensureStyle`.
4. Exponer `props` necesarios y callbacks.
5. Usar event delegation para elementos dinámicos.

### Futuras extensiones sugeridas

- Temas (oscuro/claro) con los mismos tokens.
- Tests ligeros de utilidades (dice, markdown, storage).
- Telemetría opcional (mediciones de performance y errores en producción).

---

### Actualizaciones operativas y mejora continua

A continuación se consolidan las prácticas operativas y las herramientas introducidas para mantener la calidad en el tiempo. Estas prácticas deben seguirse y, si se detectan incumplimientos, el equipo debe alinearlas progresivamente sin romper la app (mejora continua incremental).

#### API mínima recomendada para componentes
Además de `init()` y `setState(partial)`, se recomienda que los componentes complejos expongan:
- `destroy()` — limpiar listeners y subcomponentes.
- Actualizaciones parciales: `updateCharacter(partial)` y `updateDerived(partial)` (cuando aplique) para parchear datos sin re-render completo.

#### Guards para evitar reentradas y loops
- Usar banderas como `suppressOnUpdate`, `suppressNotify`, `suppressUpdateCharacter` cuando se hagan actualizaciones programáticas que puedan disparar callbacks (ej. `child.setState()`).
- Patrón: setear la bandera antes de la actualización y quitarla en un `finally` para garantizar no dejar el sistema en estado suprimido.

#### Patrón para listas editables (ej.: EquipmentList)
- Event delegation en el `container`.
- Actualizar `state.items` in-place durante `input` y notificar al padre sólo en `change` (commit) o `blur`.
- Para cambios estructurales (añadir/eliminar filas) re-renderizar la estructura y re-bindear listeners.
- Si se requiere guardado "live" usar debounce (150–300 ms) y evitar notificar en cada `input`.

#### Evento global de persistencia: `arcana:save`
- Estándar para persistencia desde subcomponentes sin provocar re-render ni loops.
- Payloads aceptados:
  - `{ id, equipmentList }`
  - `{ id, updatedCharacter }`
  - o `{ id, <partialFields> }`
- `CharactersPage` escucha `arcana:save` y hace merge + `StorageUtils.save()` centralizado.

#### Mounted components y parcheo in-place
- Mantener `mountedComponents` y reutilizar subcomponentes con `comp.setState(...)`.
- Si se reemplaza el contenedor con `innerHTML`, primero llamar `destroy()` en subcomponentes y limpiar listeners.

#### Debugging y telemetría local
- Usar `src/utils/debug-utils.js`:
  - Activar con `?debug=renders` o `localStorage['arcana:debug:renders']='1'`.
  - Helpers: `logRender`, `instrumentRender`, `addRenderCounterBadge`.
- Usar logs y badges para detectar renders excesivos y hotspots.

#### Checks automatizables
- Existe `scripts/checks.js` con heurísticas (listeners sin cleanup, innerHTML abundante, posibles loops).
- Ejecutar: `npm run checks`.
- Integrar en CI para detectar regresiones de arquitectura.

#### Binding idempotente y cleanup
- Guardar handlers en `container.__handlers` y quitar antes de re-asignar.
- Evitar listeners fugaces en `window/document` sin `destroy()`.

#### Router y teardown
- Recomendamos que el `router` invoque `currentPageApi?.destroy?.()` antes de montar la nueva ruta.

### Mejora continua (operativa)
- Si cualquier check o revisión detecta incumplimiento de estas prácticas:
  - Priorizar corrección incremental con PRs pequeños.
  - Evitar cambios disruptivos: preferir parches que no rompan la UX ni la persistencia.
  - Documentar en el PR el motivo del cambio, evidencia (logs/debug) y pasos para probar.
- Metodología:
  1. Detectar (checks/PR review/manual).
  2. Reproducir localmente con `?debug=renders`.
  3. Aplicar corrección mínima (1–2 cambios).
  4. Ejecutar `npm run checks` y pruebas manuales de foco/persistencia.
  5. Merge y monitoreo breve en entorno de desarrollo.

---

Apéndice: checklist rápido para revisar un PR del UI
- ¿Se evitan re-render completos en handlers de input?
- ¿Se preserva el foco en inputs al editar?
- ¿Se desmontan listeners al reemplazar DOM?
- ¿No hay loops entre `onChange`/`onUpdate`/`setState`?
- ¿Hay logs/mediciones si se tocó rendimiento?
- ¿Commit message claro y pruebas manuales descritas?

---

Ante cualquier duda, mantener la consistencia con los componentes existentes y priorizar claridad, mantenibilidad y seguridad de los datos. Si se detecta que alguna práctica no se está cumpliendo, alinear el código siguiendo estas guías de forma incremental y segura para no romper la aplicación.
