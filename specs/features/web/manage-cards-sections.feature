@delta-added
Feature: Sectioned manage view for owned cards

  The "Gestionar" sub-tab of the character sheet's Cards tab splits the owned
  collection into visible sections ordered by card type: activable cards on
  top to make activation and deactivation easier, effect cards below, and
  consumable cards in their own section when the character owns any. The
  corrupted-cards section and the slot controls keep their current behavior.

  Background:
    Given the user is viewing a character's Cards tab
    And the cards library is loaded

  @delta-added @cards @manage @sections
  Scenario: Show activable cards above effect cards
    Given the character owns activable card "Disciplina Monástica"
    And the character owns effect card "Sangre Mágica"
    When the user opens the "Gestionar" view
    Then the section "Cartas Activables (1)" is displayed before the section "Cartas de Efecto (1)"
    And "Disciplina Monástica" is displayed in "Cartas Activables"
    And "Sangre Mágica" is displayed in "Cartas de Efecto"

  @delta-added @cards @manage @sections @activation
  Scenario: Activate and deactivate an activable card from its section
    Given the character owns inactive activable card "Disciplina Monástica"
    And the character owns effect card "Sangre Mágica"
    When the user opens the "Gestionar" view
    And the user activates "Disciplina Monástica"
    Then "Disciplina Monástica" is active
    When the user deactivates "Disciplina Monástica"
    Then "Disciplina Monástica" is inactive
    And "Disciplina Monástica" is displayed in "Cartas Activables"

  @delta-added @cards @manage @sections
  Scenario: Effect cards offer no activation controls
    Given the character owns effect card "Sangre Mágica"
    When the user opens the "Gestionar" view
    Then "Sangre Mágica" is displayed in "Cartas de Efecto"
    And "Sangre Mágica" shows no "Activar" or "Desactivar" control

  @delta-added @cards @manage @sections @consumables
  Scenario: Owned consumable cards get their own section
    Given the character owns consumable card "Poción de Curación Menor"
    When the user opens the "Gestionar" view
    Then the section "Consumibles (1)" is displayed after the section "Cartas de Efecto"
    And "Poción de Curación Menor" is displayed in "Consumibles"

  @delta-added @cards @manage @sections @association
  Scenario: Cross-type links keep resolving their parent
    Given activable card "Artes Marciales" is linked to effect card "Herencia Sobrenatural"
    And the character owns both cards
    When the user opens the "Gestionar" view
    Then "Artes Marciales" is displayed in "Cartas Activables"
    And "Artes Marciales" shows the tag "🔗 Herencia Sobrenatural"
    And "Artes Marciales" does not show "Vinculación pendiente"
    And "Herencia Sobrenatural" is displayed in "Cartas de Efecto"

  @delta-added @cards @manage @sections
  Scenario: Section headers count only the cards they display
    Given the character owns 2 activable cards and 1 effect card
    When the user opens the "Gestionar" view
    Then "Cartas Activables (2)" is displayed
    And "Cartas de Efecto (1)" is displayed

  @delta-added @cards @manage @sections
  Scenario: Empty sections explain there are no cards of that type
    Given the character owns activable card "Disciplina Monástica"
    And the character owns no effect cards
    When the user opens the "Gestionar" view
    Then the section "Cartas de Efecto (0)" is displayed
    And it explains that the character owns no effect cards

  @delta-added @cards @manage @sections @readonly
  Scenario: Readonly sheet keeps the sections without activation controls
    Given the character sheet is readonly
    And the character owns activable card "Disciplina Monástica"
    When the user opens the "Gestionar" view
    Then the section "Cartas Activables (1)" is displayed
    And "Disciplina Monástica" shows no "Activar" or "Desactivar" control
