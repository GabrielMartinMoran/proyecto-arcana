@application/manual-navigation
Feature: Índice único persistente de manuales
  El jugador y el director de juego necesitan un único índice accesible en
  los manuales `/player` y `/gm`, derivado del Markdown canónico, anclado
  como botón flotante upper-right con un `<nav>` semántico y enlaces
  profundos que se restauran tras la carga asíncrona.

  Scenario: todos los headings tienen IDs GFM únicos; duplicados se sufijan
    Given el servicio `loadMarkdownDocument` procesa el Markdown del manual
    When renderiza cada encabezado de cualquier nivel
    Then añade un atributo `id` siguiendo el algoritmo de slugging de GitHub
    And preserva el prefijo numérico (p. ej. "7. Combate" → id "7-combate")
    And si dos encabezados comparten slug, el segundo se sufijja con "-1", "-2", etc.
    And el parser global de Marked que usan Card y Statblock permanece sin cambios

  Scenario: enlaces hash y deep link se restauran tras carga async y evitan topbar
    Given la página del manual se monta y dispara la carga async del Markdown
    When el usuario llega con un hash en la URL (p. ej. `#7-combate`)
    Then tras la inyección en DOM el componente ejecuta `tick()`
    And localiza el elemento con el `id` correspondiente
    And llama a `element.scrollIntoView({ behavior: "auto", block: "start" })`
    And no usa `behavior: "smooth"` ni asume contenedores numéricos
    And los encabezados del Markdown aplican `scroll-margin-top: calc(var(--top-bar-height) + var(--spacing-md))`

  Scenario: el manual NO renderiza ningún índice en flujo; la única affordance de navegación es el FAB
    Given una página `/player` o `/gm` carga el manual canónico
    When el documento Markdown se inyecta en el DOM
    Then NO aparece ningún `<nav>` etiquetado "Índice del manual" sobre el Markdown
    And NO aparece ningún `<details>` con la lista de H1 del manual
    And el único elemento de navegación del manual es el FAB definido en el escenario siguiente

  Scenario: botón Índice upper-right con emoji decorativo abre <nav id="manual-index-popover">, Escape/clic afuera/enlace, foco apropiado y enlace estilo app
    Given el manual `/player` o `/gm` está cargado con al menos un H1 indexable
    When la página se monta
    Then se muestra un botón con texto visible "📑 Índice" donde el emoji está en `<span aria-hidden="true">📑</span>` y el accesible name del botón es "Índice"
    And el botón tiene `aria-expanded` y `aria-controls="manual-index-popover"`
    And el botón usa posicionamiento fixed con z-index 1002 y touch target mínimo 44px (min-width y min-height)
    And en ancho >1280 su `top` es `var(--spacing-md)` y su `right` es `calc(var(--dice-panel-width) + var(--spacing-md))` (anclado a la derecha del panel de dados, no a la barra lateral)
    And en ancho <=1280 su `top` es `calc(var(--top-bar-height) + var(--spacing-md))` y su `right` es `var(--spacing-md)`
    When el usuario pulsa el botón
    Then se abre un `<nav id="manual-index-popover" aria-label="Índice">` que contiene los mismos `<a href="#id">` derivados de los H1 (excluyendo el primer H1 de título)
    And el `<nav>` NO tiene `role="dialog"` ni fuerza foco en su apertura
    And en >1280 el `<nav>` comparte `right` con el botón y tiene `top: calc(var(--spacing-md) + 52px)` (mantiene el offset vertical de 52px bajo el FAB)
    And en <=1280 el `<nav>` comparte `right` con el botón y tiene `top: calc(var(--top-bar-height) + var(--spacing-md) + 52px)`
    And el `<nav>` tiene `max-height: 60vh` y `max-width` viewport-safe
    And cada enlace `.manual-fab__link` usa `color: var(--text-primary)` (estilo app, no azul de marca) y conserva hover/focus con fondo y subrayado
    And cada `.manual-fab__link` define explícitamente `&:visited { color: var(--text-primary); }` para evitar el azul de marca tras la navegación por fragmentos nativos
    When el usuario pulsa Escape, hace clic fuera del `<nav>`, o activa un enlace
    Then el `<nav>` se cierra y `aria-expanded` vuelve a `false`
    And si el cierre fue por Escape o clic afuera, el foco vuelve al botón
    And si el cierre fue por activación de un enlace, el foco sigue al destino del navegador (no se restaura foco al botón y el navegador gestiona el scroll al fragmento nativo)
