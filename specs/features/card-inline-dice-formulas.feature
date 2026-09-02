@web @cards @inline-dice
Feature: Card inline dice formula buttons
  Cards on a character sheet expose safe direct-roll buttons for eligible
  formulas while cards in library-like contexts remain readable prose.

  Background:
    Given a character sheet is displayed

  @rendering @character-sheet
  Scenario: Render a numeric formula in a character-sheet card
    Given the character has an equipped card named "Golpe feroz"
    And the card description contains "Inflige 1d8 + 2 de daño"
    When the user views the equipped card
    Then the description shows a button with visible and accessibility name "1d8 + 2 🎲"
    And the surrounding Markdown prose remains visible

  @rendering @attributes
  Scenario: Render an explicit character attribute formula
    Given the character has Cuerpo equal to 3
    And the equipped card named "Segundo Aliento" has description "Recupera 1d4 + Cuerpo"
    When the user views the equipped card
    Then the description shows a button with visible and accessibility name "1d4 + Cuerpo 🎲"

  @rendering @natural-language @attributes
  Scenario: Preserve the natural possessive wrapper in an attribute formula
    Given the character has Instinto equal to 4
    And the equipped card named "Toque Restaurador" has description "Recupera 1d6 + tu Instinto"
    When the user views the equipped card
    Then the description shows a button with visible and accessibility name "1d6 + tu Instinto 🎲"
    And the roll expression uses Instinto as the normalized variable

  @safety @natural-language @semantic-filtering
  Scenario: Do not parse the unsupported score wrapper
    Given the character has Instinto equal to 4
    And the equipped card named "Texto Natural" has description "Recupera 1d6 + tu puntuación de Instinto"
    When the user views the equipped card
    Then no inline formula button is shown
    And the complete original description remains visible as prose

  @rendering @aliases
  Scenario: Resolve an arcane alias from possessed archetype cards
    And the character has Mente equal to 3 and Presencia equal to 5
    And the character possesses the canonical cards "Estudios Mágicos" and "Pacto Supremo"
    And the equipped card named "Festín Macabro" has description "Recupera 2d6 + Atributo Arcano"
    When the user views the equipped card
    Then the description shows one button with visible and accessibility name "2d6 + Atributo Arcano 🎲"

  @rolling @aliases
  Scenario: Roll an arcane alias using the highest candidate attribute
    Given a character named "Ayla"
    Given the character has Mente equal to 3 and Presencia equal to 5
    And the character possesses the canonical cards "Estudios Mágicos" and "Pacto Supremo"
    And the equipped card named "Festín Macabro" has description "Recupera 2d6 + Atributo Arcano"
    When the user clicks the inline formula button with visible and accessibility name "2d6 + Atributo Arcano 🎲"
    Then the web app rolls the formula with Atributo Arcano equal to 5
    And the roll title is "Ayla: Festín Macabro"

  @rendering @aliases
  Scenario Outline: Resolve a martial alias from a possessed archetype card
    Given the character has <attribute> equal to 4
    And the character possesses the canonical card "<card>"
    And the equipped card named "Desviar" has description "Reduce el daño en 1d4 + Atributo Marcial"
    When the user views the equipped card
    Then the description shows a button with visible and accessibility name "1d4 + Atributo Marcial 🎲"

    Examples:
      | card                  | attribute |
      | Sintonía con el Acero | Cuerpo    |
      | Sintonía Fluida       | Reflejos  |

  @rolling @attributes
  Scenario: Roll a card formula with the current character attribute
    Given a character named "Ayla"
    And the character has Cuerpo equal to 3
    And the equipped card named "Segundo Aliento" has description "Recupera 1d4 + Cuerpo"
    When the user clicks the inline formula button with visible and accessibility name "1d4 + Cuerpo 🎲"
    Then the web app rolls the formula with Cuerpo equal to 3
    And the roll title is "Ayla: Segundo Aliento"
    And no advantage, disadvantage, or roll modal is shown

  @rendering @multiple-formulas
  Scenario: Render multiple eligible formulas in source order
    Given the equipped card named "Enjambre" has description "Ataque 1d8e + Mente. Daño 1d6."
    When the user views the equipped card
    Then the description shows buttons named "1d8💥 + Mente 🎲" and "1d6 🎲"
    And the buttons appear in the same order as the formulas in the prose

  @rendering @rolling @explosive @damage @title @character-sheet
  Scenario: Render and roll an explosive d8 attack without exploding its damage
    Given a character named "Ayla"
    And the character has Presencia equal to 5
    And the equipped card named "Descarga Sobrenatural" has description "Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño."
    When the user views the equipped card
    Then the description shows buttons named "1d8💥 + Presencia 🎲" and "1d8 🎲"
    When the user clicks the inline formula button with visible and accessibility name "1d8💥 + Presencia 🎲"
    Then the web app rolls the expression "1d8e+Presencia"
    And the roll title is "Ayla: Ataque con Descarga Sobrenatural"
    When the user clicks the inline formula button with visible and accessibility name "1d8 🎲"
    Then the web app rolls the expression "1d8"
    And the roll title is "Ayla: Descarga Sobrenatural"

  @rendering @rolling @title @multiple-formulas @character-sheet
  Scenario: Use the attack title only for an explosive card formula
    Given a character named "Ayla"
    And the equipped card named "Enjambre" has description "Ataque 1d8e. Daño 1d6."
    When the user clicks the inline formula button with visible and accessibility name "1d8💥 🎲"
    Then the roll title is "Ayla: Ataque con Enjambre"
    When the user clicks the inline formula button with visible and accessibility name "1d6 🎲"
    Then the roll title is "Ayla: Enjambre"

  @rendering @difficulties @character-sheet
  Scenario: Show a resolved dynamic difficulty beside its card formula
    Given a character named "Ayla" has Instinto equal to 4
    And the equipped card named "Rugido Aterrador" has description "El objetivo debe superar ND 5 + tu Instinto"
    When the user views the equipped card
    Then the difficulty component exposes the formula "ND 5 + tu Instinto"
    And the difficulty component shows the calculated result "ND 9"

  @rendering @difficulties @aliases
  Scenario: Calculate a difficulty from a resolved arcane alias
    Given a character named "Ayla" has Mente equal to 3 and Presencia equal to 5
    And the character possesses the canonical cards "Estudios Mágicos" and "Pacto Supremo"
    And the equipped card named "Manifestación del Patrón" has description "El objetivo debe superar ND 5 + tu Atributo Arcano"
    When the user views the equipped card
    Then the difficulty component shows the calculated result "ND 10"

  @rendering @difficulties @responsive
  Scenario: Show the formula and result on touch devices
    Given a character named "Ayla" has Instinto equal to 4
    And the equipped card named "Rugido Aterrador" has description "El objetivo debe superar ND 5 + tu Instinto"
    When the user views the equipped card on a touch device
    Then the formula "ND 5 + tu Instinto" remains visible
    And the calculated result "ND 9" remains visible

  @rendering @difficulties @responsive
  Scenario: Show the compact result and hover formula on fine-pointer devices
    Given a character named "Ayla" has Instinto equal to 4
    And the equipped card named "Rugido Aterrador" has description "El objetivo debe superar ND 5 + tu Instinto"
    When the user views the equipped card on a fine-pointer device
    Then the calculated result "ND 9" is visible
    And the formula "ND 5 + tu Instinto" is available in the difficulty title and accessible description

  @safety @difficulties @unresolved
  Scenario: Keep an unresolved dynamic difficulty as prose
    Given a character named "Ayla" has Mente equal to 3 and Presencia equal to 5
    And the equipped card named "Manifestación del Patrón" has description "El objetivo debe superar ND 5 + tu Atributo Arcano"
    And the character possesses none of the canonical arcane archetype cards
    When the user views the equipped card
    Then the original formula remains visible as prose
    And no calculated difficulty result is shown

  @safety @semantic-filtering
  Scenario: Do not turn contextual or non-roll numbers into buttons
    Given the equipped card named "Aspecto" has description "Obtienes +1d4 de ventaja, CD 15 y 3 × Instinto"
    When the user views the equipped card
    Then no inline formula button is shown for the advantage modifier
    And no inline formula button is shown for the difficulty
    And no inline formula button is shown for the deterministic arithmetic
    And the original description remains visible

  @rendering @damage-bonus
  Scenario: Render explicit sneak-attack damage after removing the sign
    Given the canonical card "Ataque Furtivo" has description "1d4 de daño adicional"
    When the user views the equipped card
    Then the description shows a button with visible and accessibility name "1d4 🎲"
    And the damage description remains visible
    And the leading plus sign is not treated as part of the roll expression

  @safety @aliases
  Scenario: Do not create a partial roll when an alias has no candidate
    Given the equipped card named "Festín" has description "Recupera 2d6 + Atributo Arcano"
    And the character possesses none of the canonical arcane archetype cards
    When the user views the equipped card
    Then the complete description remains visible as prose
    And no button is shown for only "2d6"

  @rendering @library
  Scenario: Keep library cards as read-only prose
    Given the same card is displayed in the public card library without a character
    When the user views the card
    Then the description shows no inline formula buttons
    And the formula remains visible as text

  @rendering @preview
  Scenario: Keep add-card and custom-card previews as read-only prose
    Given a card preview is displayed in an add-card or custom-card modal
    And the preview description contains "1d6 + Cuerpo"
    When the user views the preview
    Then the description shows no inline formula buttons
    And the original Markdown remains visible

  @security @xss
  Scenario: Preserve card-description safety while rendering buttons
    Given an equipped custom card has description "<img src=x onerror=alert(1)> causa 1d6"
    When the user views the equipped card
    Then the hostile markup is displayed as escaped or sanitized text
    And the description shows a button named "1d6 🎲"
    And no raw event handler from the description is executed

  @rendering @markdown-inline
  Scenario: Keep buttons inline inside a Markdown card paragraph
    Given the equipped card named "Látigo de Espinas" has description "Realizas un ataque de conjuro (1d8e + tu Instinto) a distancia Cercana. Si impactas, infliges 1d6 de daño Cortante.<br>El objetivo debe superar una Tirada de Salvación."
    When the user views the equipped card
    Then the description shows buttons named "1d8💥 + tu Instinto 🎲" and "1d6 🎲"
    And the buttons remain inline with the surrounding paragraph prose
    And the explicit line break remains visible
