## Code Quality Improvement Plan

Objetivo: elevar la calidad del código a estándar senior, priorizando mantenibilidad, modularidad, coherencia de estilos, y SOLID, sin romper la app.

### Prioridades (de mayor a menor)
1) Componentización y eliminación de duplicación
2) Separación de responsabilidades (páginas vs servicios vs utilidades)
3) Estilos consistentes (CSS nesting, tokens, patrones comunes)
4) Validación y robustez de datos (YAML/JSON)
5) Limpieza de eventos/render (delegación, micro-actualizaciones)
6) Pruebas mínimas (unit/integración) y CI básico

Internacionalización: fuera de alcance por ahora (decisión explícita).

---

### 1) Componentización y DRY
Problema: Footers, historiales (dados/PP), filtros, grids, avatares e imágenes con fallback están duplicados.

Acciones correctas:
- Crear componentes reusables:
  - Footer: `components/Footer/Footer.js` y reutilizar en todas las páginas.
  - HistoryList: estructura común de historiales con slots (botón borrar/undo, mensaje), usado por dados y PP.
  - Panel: wrapper visual unificado (título + contenido) para paneles.
  - Avatar/ImageWithFallback: helper para errores de imágenes sin onerror inline.
  - FiltersPanel: panel de filtros con “limpiar” y debounce.
  - CardGrid: grilla de cartas con slot de acciones.

Resultados esperados:
- Menos líneas repetidas, menos bugs, estilo coherente.

---

### 2) Separación de responsabilidades (SOLID)
Problema: Páginas mezclan lógica de dominio, estado, render y listeners.

Acciones correctas:
- Crear servicios finos:
  - `character-service.js`: sumar/gastar PP, revertir transacciones, normalizar equipo.
  - `bestiary-service.js`, `cards-service.js` (extender el existente) con validaciones ligeras.
- Páginas solo coordinan servicios y componen componentes.
- Dividir `CharactersPage` en submódulos por tab (sheet/cards/config/bio/dice/progress).

Resultados esperados:
- Código más testeable, cambios localizados.

---

### 3) Estilos consistentes
Problema: patrones similares con reglas distintas; mezcla de estilos globales y locales.

Acciones correctas:
- Uso de CSS nesting en todos los archivos de páginas/componentes.
- Consolidar patrones: `.history-log`, `.panel`, `.attrs`/`.attr`, `.hp-wrap`.
- Mantener tokens en `app.css`.

Resultados esperados:
- Coherencia visual, menor complejidad cognitiva.

---

### 4) Validación de datos (YAML/JSON)
Problema: Carga sin validación; errores se detectan tarde.

Acciones correctas:
- Validar shape mínimo al cargar `cards.yml`/`bestiary.yml`.
- Logs claros y fallback benigno.

Resultados esperados:
- Menos roturas silenciosas, mensajes útiles.

---

### 5) Render y listeners
Problema: Re-render completo frecuente y re-bindeo sin necesidad.

Acciones correctas:
- Mantener delegación de eventos a contenedores.
- Donde sea trivial, micro-actualizar (e.g., contadores de usos) sin redibujar todo.

Resultados esperados:
- Mejor rendimiento y menos flicker.

---

### 6) Tests mínimos y CI
Acciones correctas:
- Unit tests: `rules.js`, `dice-utils.js`, validadores YAML.
- Integración: render de bestiario con YAML de ejemplo, generación de `out/bestiary.md`.
- CI simple con Node para correr scripts y validar.

---

### Plan de implementación (fases)
Fase A (quick wins, sin romper UX):
- Footer reusable y reemplazo en páginas.
- ImageWithFallback helper y uso en retratos/avatares (remover onerror inline).
- Unificar CSS de historiales bajo `.history-log` (alias) y preparar `HistoryList`.

Fase B:
- HistoryList y reemplazar en dados/PP.
- FiltersPanel y adopción en bestiario/cartas.

Fase C:
- `character-service.js` con operaciones de PP/equipo y migración.
- Dividir `CharactersPage` en submódulos por tab.

Fase D:
- Validación ligera para YAML y logs.
- Documentar normas en `ARCHITECTURE.md`.

Fase E:
- Tests unitarios básicos y script de CI.

Cada fase debe preservar funcionalidad y pasar una revisión visual/manual rápida.


