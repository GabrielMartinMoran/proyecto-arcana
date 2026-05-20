@foundry-module @health-sync @foundry-v14
Feature: Foundry v14 bidirectional health synchronization
  Character health stays synchronized between the Arcana web sheet and Foundry actors after the Foundry 14 migration.

  @web-to-foundry @character
  Scenario: web character health updates the Foundry character actor
    Given a Foundry character actor is linked to an Arcana embedded character sheet
    When the web character sheet changes current health to 7 and maximum health to 12
    Then the Foundry actor health value is 7
    And the Foundry actor health maximum is 12
    And the actor token health bar is redrawn

  @foundry-to-web @character
  Scenario: Foundry actor health updates the embedded web character sheet
    Given a Foundry character actor sheet is open with an embedded Arcana character iframe
    When the Foundry actor health changes to current health 4 and maximum health 10
    Then the embedded web character sheet displays current health 4
    And the embedded web character sheet displays maximum health 10
    And the iframe is not force reloaded

  @url-classification @character
  Scenario Outline: stored character sheet URLs are classified as character sheets
    Given a Foundry actor stores sheet URL "<sheetUrl>"
    When the web sheet sends current health 5 and maximum health 9
    Then the Foundry updater treats the actor as a character
    And both current and maximum health are updated

    Examples:
      | sheetUrl                                                   |
      | https://app.arcana.com/characters/shared/user-1/char-1      |
      | https://app.arcana.com/embedded/characters/user-1/char-1    |
      | http://localhost:5173/characters/shared/user-1/char-1       |
      | http://localhost:5173/embedded/characters/user-1/char-1     |

  @token-resource @foundry-v14
  Scenario: token resources expose health for Foundry v14 actor types
    Given the Arcana system initializes in Foundry v14
    When Foundry reads trackable actor attributes
    Then character actors expose health as a bar resource
    And npc actors expose health as a bar resource

  @npc @web-to-foundry
  Scenario: NPC web sync preserves local current health
    Given a Foundry NPC actor has current health 3 and maximum health 8
    When the embedded bestiary sheet sends maximum health 12
    Then the Foundry NPC maximum health is 12
    And the Foundry NPC current health remains 3

  @npc @web-to-foundry
  Scenario: NPC current health is clamped when new maximum is lower
    Given a Foundry NPC actor has current health 9 and maximum health 12
    When the embedded bestiary sheet sends maximum health 6
    Then the Foundry NPC maximum health is 6
    And the Foundry NPC current health is 6

  @edge-case @zero-health @web-to-foundry
  Scenario: zero current health synchronizes correctly
    Given a Foundry character actor has current health 3 and maximum health 10
    When the web character sheet changes current health to 0
    Then the Foundry actor health value is 0
    And rendered health controls show 0 instead of the previous value
