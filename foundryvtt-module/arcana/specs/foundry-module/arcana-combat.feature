@foundry @combat @initiative-normal
Feature: Arcana Combat

  Scenario: Roll initiative with 1d8e+mod (normal mode)
    Given a combatant with initiative modifier 3
    And user selects "Normal" initiative option
    When the initiative is rolled
    Then the formula should be "1d8e + 3"
    And the result should be added to combat tracker

  @foundry @combat @initiative-advantage
  Scenario: Roll with advantage (+1d4)
    Given a combatant with initiative modifier 2
    And user selects "Ventaja" initiative option
    When the initiative is rolled
    Then the formula should be "1d8e + 2 + 1d4"
    And the result should be added to combat tracker

  @foundry @combat @initiative-disadvantage
  Scenario: Roll with disadvantage (-1d4)
    Given a combatant with initiative modifier 4
    And user selects "Desventaja" initiative option
    When the initiative is rolled
    Then the formula should be "1d8e + 4 - 1d4"
    And the result should be added to combat tracker

  @foundry @combat @dialog
  Scenario: Dialog shows Normal/Ventaja/Desventaja options
    Given a combatant with name "Goblin Scout"
    When the initiative dialog is rendered
    Then the dialog title should contain "Tirar Iniciativa: Goblin Scout"
    And the dialog should have "Normal" button
    And the dialog should have "Ventaja (+1d4)" button
    And the dialog should have "Desventaja (-1d4)" button

  @foundry @combat @close-dialog
  Scenario: User closes dialog without choosing
    Given a combatant with initiative modifier 0
    And user closes the dialog without selecting any option
    When the initiative dialog is rendered
    Then the initiative should resolve without hanging
    And no initiative roll should be recorded
