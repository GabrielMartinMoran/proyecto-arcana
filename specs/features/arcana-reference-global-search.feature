Feature: Búsqueda global y routing de la referencia ARCANA
  Como agente que consulta el sistema ARCANA
  Quiero recibir las fuentes relevantes ordenadas y poder continuar con la siguiente
  Cuando una fuente no responde a la intención original

  @arcana-reference @routing @manual
  Scenario: Enrutar una regla del jugador por tema
    Given el índice global de contenido está generado
    When el agente busca "¿Qué es Ventaja?"
    Then recibe la sección relevante del Manual del Jugador como primera fuente
    And la respuesta incluye una ruta y un heading verificables

  @arcana-reference @routing @cards
  Scenario: Listar cartas filtradas sin cargar resultados innecesarios
    Given el índice global de contenido está generado
    When el agente busca cartas de Bardo de nivel 2 y 3
    Then recibe solo referencias ordenadas de las cartas coincidentes
    And la respuesta no incluye el contenido completo de cada carta

  @arcana-reference @routing @cards @regression
  Scenario: Resolver el nombre canónico de una carta
    Given el índice global de contenido está generado
    When el agente busca "Pacto Supremo"
    Then recibe la carta con el slug "pacto-supremo"
    And no recibe el slug obsoleto "arquetipo-brujo-pacto-siniestro"

  @arcana-reference @routing @items
  Scenario: Buscar objetos mágicos por nivel y etiqueta
    Given el índice global de contenido está generado
    When el agente busca objetos de nivel 3 con etiqueta Utilidad
    Then recibe referencias ordenadas de objetos que cumplen ambos filtros

  @arcana-reference @routing @bestiary
  Scenario: Encontrar una criatura sin conocer su rango
    Given el índice global de contenido está generado
    When el agente busca "Liche"
    Then recibe la ruta y sección del Liche como primera fuente
    And no necesita inspeccionar manualmente todos los rangos

  @arcana-reference @routing @fallback
  Scenario: Continuar con la siguiente fuente cuando la primera no sirve
    Given la búsqueda devuelve varias fuentes ordenadas por confianza
    And el agente abre la primera fuente
    When determina que esa fuente no responde a la intención original
    Then conserva la consulta original y abre la siguiente fuente ordenada
    And no presenta la primera fuente como respuesta normativa

  @arcana-reference @routing @ambiguity
  Scenario: Pedir selección cuando hay fuentes igualmente plausibles
    Given existen resultados de familias distintas con confianza similar
    When el agente busca un término ambiguo
    Then recibe el estado "ambiguous"
    And recibe solo las mejores alternativas con sus rutas

  @arcana-reference @safety @negative
  Scenario: Declarar que no existe una fuente suficiente
    Given ninguna coincidencia supera el umbral de confianza
    When el agente realiza una búsqueda
    Then recibe el estado "not_found"
    And no inventa una regla ni una fuente

  @arcana-reference @build @privacy
  Scenario: Generar el índice sin depender de IA o red
    Given no hay autorización explícita para usar un proveedor LLM
    When se genera la referencia ARCANA
    Then no se realizan llamadas de red
    And el índice determinista queda disponible para la búsqueda

  @arcana-reference @semantic @cards
  Scenario: Encontrar una carta por la evidencia de su descripción
    Given el índice incluye contenido searchable de cartas
    When el agente busca "qué atributo usa el lanzamiento arcanista"
    Then "Afinidad Arcana" aparece entre las primeras fuentes
    And la coincidencia no depende únicamente de la palabra "Arcanista"

  @arcana-reference @semantic @items
  Scenario: Encontrar un objeto por su descripción
    Given el índice incluye contenido searchable de objetos
    When el agente busca "cómo imbuir un arma con magia"
    Then "Arma Enriquecida" aparece entre las primeras fuentes
    And una carta genérica con la palabra "Arma" no desplaza la evidencia relevante

  @arcana-reference @semantic @manual
  Scenario: Encontrar el coste de adquirir una carta
    Given el índice incluye el texto de las secciones del manual
    When el agente busca "cuánto cuesta adquirir una carta al subir de nivel"
    Then "Adquirir Nueva Carta" aparece entre las primeras fuentes
    And la sección contiene la evidencia del coste

  @arcana-reference @ranking @coverage
  Scenario: No aceptar una coincidencia por un único término genérico
    Given la consulta contiene varios términos significativos
    When solo una palabra genérica coincide con una fuente
    Then la fuente no se clasifica como una respuesta encontrada confiable
    And se devuelve una sugerencia explícita o "not_found"

  @arcana-reference @normalization @negative
  Scenario: No hacer substring de acrónimos cortos dentro de palabras
    Given no existe un alias canónico para "LS"
    When el agente busca "LS"
    Then no recibe objetos o cartas solo porque contienen "ls" dentro de otra palabra
    And no se inventa el significado del acrónimo

  @arcana-reference @category @cards
  Scenario: Priorizar la carta raíz al buscar un arquetipo
    Given existen una carta raíz y cartas de nivel del arquetipo Céfiro
    When el agente busca "Céfiro"
    Then la carta raíz del arquetipo aparece antes que las cartas de nivel
    And el conjunto restante conserva las cartas del arquetipo
