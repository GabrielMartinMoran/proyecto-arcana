@web @statblock @inline-dice
Feature: Web statblock inline dice formula buttons
  Web statblocks render dice formulas inside creature prose as direct roll buttons.
  Inline formula roll titles use the format "<creature name>: <source name>".

  Background:
    Given a creature statblock is displayed in the web app

  @rendering
  Scenario: Render a dice formula in an action detail as a button
    Given an action named "Golpe brutal" has detail "Inflige 1d6 de daño"
    When the user views the statblock actions
    Then the action detail shows a button labeled "1d6"
    And the surrounding prose remains visible as text

  @rendering @multiple-formulas
  Scenario: Render multiple formulas in one ability detail
    Given an action named "Explosión arcana" has detail "Inflige 1d6 + 5 + 4d2 y luego 2d6 + 3"
    When the user views the statblock actions
    Then the action detail shows a button labeled "1d6 + 5 + 4d2"
    And the action detail shows a button labeled "2d6 + 3"
    And the buttons appear in the same order as the formulas in the prose

  @rolling
  Scenario: Click an inline formula button to roll with creature-prefixed source title
    Given a creature named "Bestia ígnea"
    And an action named "Golpe brutal" has detail "Inflige 1d8+1 de daño"
    When the user clicks the inline formula button labeled "1d8+1"
    Then the web app rolls the expression "1d8+1" directly
    And the roll title is "Bestia ígnea: Golpe brutal"
    And no advantage, disadvantage, or roll modal is shown

  @attack-notes
  Scenario: Render and roll a formula in an attack note
    Given a creature named "Bestia ígnea"
    And an attack named "Mordida" has note "El objetivo sangra 1d6 + 2"
    When the user views the statblock attacks
    Then the attack note shows a button labeled "1d6 + 2"
    When the user clicks the inline formula button labeled "1d6 + 2"
    Then the web app rolls the expression "1d6+2" directly
    And the roll title is "Bestia ígnea: Mordida"

  @traits @reactions @interactions
  Scenario Outline: Render inline formula buttons in requested statblock fields
    Given a <field> named "<name>" has detail "<detail>"
    When the user views the statblock
    Then the <field> detail shows a button labeled "<button>"

    Examples:
      | field       | name             | detail                    | button  |
      | trait       | Sangre ígnea     | Al ser golpeado causa 1d6 | 1d6     |
      | reaction    | Contraataque     | Responde con 2d6 + 3      | 2d6 + 3 |
      | interaction | Amenaza arcana   | Fuerza una tirada de 3d4  | 3d4     |

  @behavior @stat-notes
  Scenario: Render inline formula buttons in behavior and stat notes
    Given the creature behavior contains "Prefiere usar 1d6 trucos"
    And the creature speed note contains "Corre 2d6 metros extra"
    When the user views the statblock
    Then the behavior text shows a button labeled "1d6"
    And the speed note shows a button labeled "2d6"

  @attack-notes @behavior @stat-notes @rolling
  Scenario Outline: Inline formula rolls use creature-prefixed source titles
    Given a creature named "Bestia ígnea"
    And the statblock contains a formula in <source>
    When the user clicks that inline formula button
    Then the web app rolls the formula directly
    And the roll title is "<expectedTitle>"

    Examples:
      | source          | expectedTitle                |
      | a trait         | Bestia ígnea: Sangre ígnea   |
      | an attack note  | Bestia ígnea: Mordida        |
      | a reaction      | Bestia ígnea: Contraataque   |
      | an interaction  | Bestia ígnea: Amenaza arcana |
      | behavior text   | Bestia ígnea: Comportamiento |
      | the speed note  | Bestia ígnea: Velocidad      |

  @non-matches
  Scenario: Do not render buttons for non-formula numbers or invalid dice-like text
    Given an action named "Texto técnico" has detail "Tiene CD 15, rango 6, código abc1d6 y texto 1d6abc"
    When the user views the statblock actions
    Then the action detail shows no inline formula buttons
    And the original text remains visible

  @xss
  Scenario: Preserve XSS safety while rendering inline formula buttons
    Given a trait named "Texto hostil" has detail "<img src=x onerror=alert(1)> causa 1d6"
    When the user views the statblock traits
    Then the hostile markup is displayed as escaped text
    And the trait detail shows a button labeled "1d6"
    And no raw HTML from the trait detail is executed

  @foundry-embedded
  Scenario: Inline formula rolls reuse the direct roll service in Foundry embedded mode
    Given the statblock is displayed inside Foundry embedded mode
    And a creature named "Bestia ígnea"
    And an action named "Descarga" has detail "Inflige 2d6"
    When the user clicks the inline formula button labeled "2d6"
    Then the web app rolls the expression "2d6" directly
    And the same precalculated roll broadcast path used by direct damage rolls is used
    And the roll title is "Bestia ígnea: Descarga"

  @existing-damage
  Scenario: Existing attack damage button remains unchanged
    Given an attack has a damage formula already rendered by the statblock damage button
    When the user views the statblock attacks
    Then the attack damage still uses its existing direct damage roll button
    And no duplicate inline button is added for that attack damage field
