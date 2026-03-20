@bug @filter-persistence
Feature: Persistencia de filtros de etiquetas en galería de cartas

  @bug @filter-persistence
  Scenario: Múltiples etiquetas persisten correctamente al recargar
    Given el usuario está en la galería de cartas
    And la página tiene cartas con etiquetas "fuego" y "magia"
    When el usuario selecciona la etiqueta "fuego"
    And el usuario selecciona la etiqueta "magia"
    Then la URL debe contener "tags=fuego" Y "tags=magia" como parámetros separados
    When el usuario recarga la página
    Then el filtro de etiquetas debe mostrar "2 filtradas"
    And el checkbox "fuego" debe estar seleccionado
    And el checkbox "magia" debe estar seleccionado
    And las cartas filtradas deben ser las que coinciden

  @bug @filter-persistence
  Scenario: Múltiples niveles persisten correctamente al recargar
    Given el usuario está en la galería de cartas
    When el usuario selecciona el nivel 1
    And el usuario selecciona el nivel 2
    Then la URL debe contener "level=1" Y "level=2" como parámetros separados
    When el usuario recarga la página
    Then el filtro de niveles debe mostrar "2 filtradas"
