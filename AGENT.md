# AGENT — Operativa y buenas prácticas para agentes que trabajen en este repositorio

Este documento describe el modus operandi, convenciones, técnicas de depuración y recomendaciones que debe seguir un agente (humano o automatizado) para trabajar de forma coherente, segura y productiva en el repositorio `proyecto-arcana`. Está pensado para que futuros agentes reproduzcan el mismo nivel de calidad, claridad y cuidado demostrado en recientes cambios.

Índice
1. Principios generales
2. Flujo de trabajo y checklist antes de editar
3. Convenciones de componentes y ciclo de vida
4. Manejo de estado y actualizaciones (setState vs updates parciales)
5. Event binding y prevención de fugas
6. Evitar re-render globales: estrategias recomendadas
7. Debugging y telemetría local
8. Persistencia y eventos cruzados
9. Commit messages y documentación de cambios
10. Ejemplos concretos de patrones correctos
11. Qué hacer ante regresiones o loops
12. Checks automatizables y script de ejemplo

---

## 1. Principios generales
- Sé conservador con cambios que afectan el ciclo de vida o listeners: las fugas y loops son las causas más frecuentes de bugs.
- Prefiere cambios incrementales y revertibles. Haz 1–2 intentos para arreglar un bug; si no queda claro, pide clarificaciones.
- Mantén la UX: evitar pérdida de foco, parpadeo y bloqueos perceptibles.
- Prioriza la seguridad del dato — no perder persistencia por optimizaciones UI.

## 2. Flujo de trabajo y checklist antes de editar
Antes de tocar código:
- Leer `ARCHITECTURE.md` y entender el patrón de componentes.
- Localizar los archivos relevantes (usar `find_path`/`grep`).
- Abrir y revisar el componente, sus `init()`, `setState()` y si expone `destroy()`.
- Buscar dónde se persiste el dato (ej. `StorageUtils`) y qué eventos globales existen (`arcana:save`).
- Planificar cambios mínimos y preparar pruebas manuales para foco, persistencia y rendimiento.

Checklist rápido:
- ¿Expones/uses `setState`, `init`, `destroy`?
- ¿Evitas re-renderizar contenedores enteros por cada `input`?
- ¿Los listeners son idempotentes y se limpian al desmontar?
- ¿No creas llamadas recursivas entre componentes?

## 3. Convenciones de componentes y ciclo de vida
- Factoria componente: `Component(container, props)` devuelve `{ init, setState, ...opcionales }`.
- `init()`:
  - Llamar `ensureStyle('./ruta/al/css.css')`.
  - Renderizar el markup inicial con `container.innerHTML = render()`.
  - Llamar `bind()` para listeners (event delegation preferente).
- `setState(partial)`:
  - Mezclar estado: `state = { ...state, ...partial }`.
  - Actualizar únicamente las partes necesarias (preferible) o llamar a `update()` para re-render.
- `destroy()` (recomendado):
  - Quitar listeners globales y del `container`.
  - Llamar `destroy()` análogo en subcomponentes montados.
- Evitar dependencias por referencia y documentar si se usa mutación por motivos de rendimiento.

## 4. Manejo de estado y actualizaciones
- Estrategia por defecto: no re-renderizar contenedores enteros en cada cambio de input.
- Patrones recomendados:
  - Updates parciales: exponer `updateCharacter(partial)` y `updateDerived(partial)`.
  - Componentes hijos deben exponer `setState(partial)` para actualizaciones locales.
  - Para cambios locali (inputs): actualizar el `state` local y sólo persistir en blur o en commit (`change`).
- Evita notificar al padre en cada `input`. Usar `input` para UX y `change`/`blur` para persistir.
- Si debes notificar el padre en cada `input`, usa debounce (ej. 150–300 ms) y asegúrate de no provocar reentranicas.

## 5. Event binding y prevención de fugas
- Usar event delegation en vez de listeners por fila cuando la lista es dinámica.
- Registrar listeners de forma idempotente:
  - Mantener referencias a handlers en la instancia DOM (p. ej. `container.__myHandlers`) y siempre remover antes de reasignar.
- Si enlazas a `window`/`document`, siempre quitar en `destroy()`.
- Cuando hagas `container.innerHTML = render()`, asegúrate de desmontar subcomponentes y sus listeners antes de reemplazar el DOM.

## 6. Evitar re-render globales: estrategias
- Parcheo in-place:
  - Si la estructura DOM no cambia (mismo número de filas), actualiza sólo `value` de inputs y restaura la selección.
- Montaje condicional:
  - Mantener `mountedComponents` y reutilizarlos si es posible (`comp.setState({...})`).
- Señalización y eventos:
  - Para persistir sin re-render: emitir evento `arcana:save` con payload y dejar que la página lo persista.
- Reentrancy guards:
  - Usar flags (`suppressOnUpdate`, `suppressNotify`, `suppressUpdateCharacter`) cuando se hacen actualizaciones programáticas para evitar loops.

## 7. Debugging y telemetría local
- Incluir utilidades ligeras para medir renders (ya existe `src/utils/debug-utils.js`):
  - `logRender(component, meta)`, `instrumentRender(name, fn)`, `addRenderCounterBadge(container)`.
  - Activar con `?debug=renders` o `localStorage['arcana:debug:renders']='1'`.
- Principios:
  - Loggear entradas y timings en renders y handlers clave (`SheetTab.update`, `EquipmentList.setState`, `CharactersPage.update`).
  - Añadir badges visuales en componentes cuyo re-render quieras contar.
- Qué registrar:
  - Frecuencia de `setState` y `update`.
  - Duración de montaje de subcomponentes.
  - Eventos globales (`arcana:save`) con payload.

## 8. Persistencia y eventos cruzados
- Persistir personajes en `localStorage` mediante `StorageUtils.save()` y `StorageUtils.load()`.
- Para cambios locales que no deben provocar re-renders (ej. typing en listas), emitir eventos globales:
  - `window.dispatchEvent(new CustomEvent('arcana:save', { detail: { id, updatedCharacter } }))`
  - `CharactersPage` escucha `arcana:save` y persiste de forma centralizada.
- Normalizar payloads: aceptar `equipmentList` o `updatedCharacter` y mergear seguridad en `CharactersPage`.

## 9. Commit messages y documentación de cambios
- Usar Conventional Commits:
  - `feat(characters): improve equipment editing without losing focus`
  - `fix(progress): update pp-spent indicator on spend`
  - `refactor(sheet): expose updateCharacter/updateDerived`
- Incluir en PR:
  - Descripción del problema original.
  - Cambios realizados, por qué y riesgos.
  - Cómo probar manualmente (pasos reproducibles).
  - Si aplica, notas de migración de datos.

## 10. Ejemplos de patrones correctos (resumen)
- Event delegation y in-place patching (EquipmentList):
  - Delegated `input` handler updates state in-place.
  - Notify parent only on `change`.
  - Patch DOM values when `setState` y la estructura no cambia, preservando caret.
- Exponer updates parciales (CharacterSheet/SheetTab):
  - `sheet.updateCharacter({ hp: 10 })` — actualiza inputs / subcomponentes, no re-render completo.
  - `sheet.updateDerived({ salud: 12 })` — notifica DerivedStatsPanel y AttributesPanel si aplica.
- Global persistencia:
  - Componentes emiten `arcana:save` con `updatedCharacter`, page escucha y hace `save()`.

## 11. Qué hacer ante regresiones o loops
- Si notás un loop (stack overflow o ejecución repetida):
  1. Buscar llamadas recursivas en la traza y mapear flujo (ej. child.onChange -> parent.onUpdate -> child.setState -> child.onChange).
  2. Añadir guards temporales (`suppressNotify`) para confirmar origen.
  3. Cambiar `onChange` para notificar sólo en commits (`change`) y usar debounce si se requiere UX persistente.
  4. Añadir logs con `DebugUtils` y reproducir con `?debug=renders`.
- Si hay pérdida de foco:
  - Confirmar si se está re-renderizando el contenedor del input; evitar `innerHTML = ...` en ese container o parchear in-place.

---

Apéndice: checklist rápido para revisar un PR del UI
- ¿Se evitan re-render completos en handlers de input?
- ¿Se preserva el foco en inputs al editar?
- ¿Se desmontan listeners al reemplazar DOM?
- ¿No hay loops entre `onChange`/`onUpdate`/`setState`?
- ¿Hay logs/mediciones si se tocó rendimiento?
- ¿Commit message claro y pruebas manuales descritas?

---

Con esto tenés una guía reproducible que cualquiera (agente o humano) puede seguir para mantener la app consistente, evitar regresiones y garantizar una buena experiencia usuario mientras se trabaja en mejoras o correcciones.

## 12. Checks automatizables y script de ejemplo

Para ayudar en revisiones automáticas y detectar problemas comunes (listeners duplicados, re-renders excesivos, handlers no idempotentes), recomendamos añadir un pequeño conjunto de checks que se puedan ejecutar en CI o localmente.

Checks sugeridos (automatizables)
- Buscar duplicados de `addEventListener` en un mismo archivo y reportar lugares que no usan `removeEventListener` o referencias almacenadas (heurística por presencia de `container.__`).
- Contar ocurrencias de `container.innerHTML =` por componente para evitar re-renders masivos.
- Encontrar componentes que no exponen `destroy()` pero usan `window.addEventListener` o `document.addEventListener`.
- Detectar llamadas directas entre `onChange` -> `onUpdate` -> `updateCharacter` (búsqueda heurística de cadenas que puedan indicar bucles).
- Medir tiempo de render aproximado invocando funciones de render en un entorno simulado (usar instrumentRender en modo debug).

Script de ejemplo (concepto)
- A modo ilustrativo, un script Node simple que hace búsquedas en el código para detectar patrones. No es perfecto, pero sirve como punto de partida:

  1) Crear `scripts/checks.js` con lógica básica (ejemplo en pseudocódigo):
     - Recorrer `src/**/*.{js,jsx}`.
     - Para cada archivo:
       - Contar `addEventListener` y `removeEventListener` — si hay `add` sin `remove`, anotar.
       - Contar `innerHTML =` — si supera un umbral por archivo, reportar.
       - Buscar `onChange` seguido (en el mismo archivo) por `onUpdate` o `updateCharacter` (heurística simple).
     - Imprimir un resumen con severidad y ubicación.

  2) Ejecutar localmente:
     - `node scripts/checks.js` o añadirlo a `package.json` como `npm run checks`.

Ejemplo reducido (pseudocódigo; poner en `scripts/checks.js`):
- Nota: aquí se muestra la idea; adaptar según herramientas de tu stack (esp. si querés usar `eslint` con reglas custom).
  - Leer árbol `src/`.
  - Para cada `.js`:
    - const content = fs.readFileSync(path, 'utf8');
    - const addCount = (content.match(/\\.addEventListener\\(/g) || []).length;
    - const removeCount = (content.match(/\\.removeEventListener\\(/g) || []).length;
    - if (addCount > removeCount) report(`Possible missing removeEventListener in ${path}`);
    - const innerHTMLCount = (content.match(/innerHTML\\s*=\\s*/g) || []).length;
    - if (innerHTMLCount > 2) report(`Multiple innerHTML assignments in ${path}: ${innerHTMLCount}`);
    - Heurística loop: if (content.includes('onChange') && content.includes('onUpdate') && content.includes('updateCharacter')) warn.

Integración en CI (opcional)
- Añadir paso `npm run checks` en `ci` para bloquear PRs con hallazgos severos.
- Complementar con pruebas manuales guiadas (documentadas en el PR) para UX (foco, persistencia, performance).

---

Si querés, creo el script inicial `scripts/checks.js` y lo commiteo en el repo con un `npm run checks` en `package.json`. Eso te dará una base concreta que luego podemos mejorar (p. ej., migrarlo a `eslint` o `grep` más avanzados).