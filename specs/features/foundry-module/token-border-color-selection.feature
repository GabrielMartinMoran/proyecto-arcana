@foundry-module @token-color @actor-config-modal @web-to-foundry
Feature: Token border color selection in the Arcana actor configuration
  The border color of generated tokens is configurable per actor while keeping
  black for characters and red for NPCs as the defaults.

  Background:
    Given the Arcana system is loaded in Foundry VTT

  @delta-added @defaults @character
  Scenario: Character tokens keep a black border by default
    Given a character actor without a configured token border color
    When the Arcana web sheet generates the token image
    Then the generated token border color is "#000000"

  @delta-added @defaults @npc
  Scenario: NPC tokens keep a red border by default
    Given an npc actor without a configured token border color
    When the Arcana web sheet generates the token image
    Then the generated token border color is "#990000"

  @delta-added @palette
  Scenario Outline: Each palette color is applied to the generated token
    Given an actor with token border color "<name>"
    When the Arcana web sheet generates the token image
    Then the generated token border color is "<hex>"

    Examples:
      | name      | hex     |
      | black     | #000000 |
      | red       | #990000 |
      | green     | #27a241 |
      | yellow    | #e6b800 |
      | orange    | #d35400 |
      | gray      | #9aa0a6 |
      | lightblue | #2b89fb |
      | purple    | #7800ff |

  @delta-added @actor-config-modal
  Scenario: Configuration dialog shows the border colors visually
    Given an Arcana actor sheet is open
    When the user opens the actor configuration dialog
    Then the selector shows the eight border colors visually
    And the currently configured color is highlighted

  @delta-added @persistence
  Scenario: The chosen color persists per actor
    Given an Arcana actor sheet is open
    And the user selects the green border color in the configuration dialog
    When the dialog is saved
    Then the actor stores the green token border color
    And reopening the configuration dialog highlights green

  @delta-added @live-update
  Scenario: Changing the color updates the token without reloading the iframe
    Given an Arcana actor sheet with an embedded iframe is open
    When the user selects the orange border color in the configuration dialog
    Then the web sheet regenerates the token image with border "#d35400"
    And Foundry updates the actor prototype token and the placed tokens
    And the iframe is not force reloaded

  @delta-added @hydration
  Scenario: Reopening the sheet uses the stored color
    Given an actor with token border color orange
    When the Arcana actor sheet is opened
    Then the iframe URL includes the orange border color
    And the generated token image uses border "#d35400"

  @delta-added @validation
  Scenario: Invalid stored colors fall back to the actor type default
    Given an actor whose stored token border color is not in the palette
    When the Arcana web sheet generates the token image
    Then the generated token border color is the default for its actor type

  @delta-added @compatibility
  Scenario: Legacy silver color ids keep working after the palette rename
    Given an actor whose stored token border color is the legacy id "silver"
    When the Arcana web sheet generates the token image
    Then the generated token border color is "#9aa0a6"
