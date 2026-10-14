@delta-added
Feature: Initiative Roll Advantage Default

  The character sheet "Configuración" tab exposes a "Ventaja en iniciativa"
  setting. When enabled, the initiative roll button opens the dice roll modal
  with Ventaja preselected — the same mechanism skills with hasAdvantage use.
  Legacy characters without the flag default to Normal.

  Background:
    Given a character sheet is open for editing

  @delta-added @web @character-sheet @initiative
  Scenario: Enabling the setting marks the character's initiative advantage
    Given the character has no initiative advantage
    When the user enables "Ventaja en iniciativa" in the Configuración tab
    Then the character initiative advantage flag is enabled
    And the character change is propagated for persistence

  @delta-added @web @character-sheet @initiative
  Scenario: Legacy characters default to Normal initiative rolls
    Given a stored character without an initiative advantage flag
    When the character is loaded
    Then the initiative advantage flag defaults to normal

  @delta-added @web @character-sheet @initiative
  Scenario: Initiative roll opens with Ventaja preselected
    Given the character has initiative advantage enabled
    When the user clicks the initiative roll button
    Then the dice roll modal opens with "Ventaja" preselected

  @delta-added @web @character-sheet @initiative @regression
  Scenario: Initiative roll opens Normal when the setting is off
    Given the character has initiative advantage disabled
    When the user clicks the initiative roll button
    Then the dice roll modal opens with "Normal" preselected

  @delta-added @web @character-sheet @initiative @regression
  Scenario: Attribute rolls are not affected by the initiative setting
    Given the character has initiative advantage enabled
    When the user clicks an attribute roll button
    Then the dice roll modal opens with "Normal" preselected
