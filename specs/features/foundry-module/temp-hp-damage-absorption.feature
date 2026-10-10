@foundry-module @temp-hp @health-sync @token-damage
Feature: Temporary HP absorbs token damage first
  Temporary hit points are available for characters and NPCs, and damage
  applied from the token health controls consumes temporary HP before regular
  health.

  Background:
    Given the Arcana system is loaded in Foundry VTT

  @delta-added @npc @actor-config-modal
  Scenario: NPC interactive bar shows temporary HP
    Given an npc actor with 10 current health, 12 maximum health and 3 temporary HP
    When the Arcana NPC sheet is rendered
    Then the interactive controls above the iframe show temporary HP 3
    And editing the temporary HP field updates the actor system health

  @delta-added @character @token-damage
  Scenario: Damage from the token consumes character temporary HP first
    Given a character actor with 10 current health and 4 temporary HP
    When 3 damage is applied from the token health controls
    Then the actor has 1 temporary HP
    And the actor still has 10 current health

  @delta-added @npc @token-damage
  Scenario: Damage from the token consumes NPC temporary HP first
    Given an npc actor with 10 current health and 4 temporary HP
    When 3 damage is applied from the token health controls
    Then the actor has 1 temporary HP
    And the actor still has 10 current health

  @delta-added @token-damage @overflow
  Scenario: Damage beyond temporary HP overflows into current health
    Given a character actor with 10 current health and 2 temporary HP
    When 5 damage is applied from the token health controls
    Then the actor has 0 temporary HP
    And the actor has 7 current health

  @delta-added @token-damage @clamp
  Scenario: Damage is clamped at zero health
    Given an npc actor with 1 current health and 1 temporary HP
    When 5 damage is applied from the token health controls
    Then the actor has 0 temporary HP
    And the actor has 0 current health

  @delta-added @healing
  Scenario: Healing does not restore temporary HP
    Given a character actor with 5 current health and 0 temporary HP
    When 3 healing is applied from the token health controls
    Then the actor has 8 current health
    And the actor still has 0 temporary HP

  @delta-added @web-to-foundry @character
  Scenario: Web character temporary HP reaches Foundry
    Given a Foundry character actor is linked to an Arcana embedded character sheet
    When the web character sheet sets temporary HP to 6
    Then the Foundry actor temporary HP is 6
    And the actor token health bar is redrawn

  @delta-added @foundry-to-web @character
  Scenario: Foundry temporary HP change reaches the embedded web sheet
    Given an embedded web character sheet is open for a Foundry actor
    When token damage reduces the Foundry temporary HP from 4 to 1
    Then the embedded web sheet displays temporary HP 1
    And the iframe is not force reloaded

  @delta-added @hydration @closed-sheet
  Scenario: Opening the sheet hydrates temporary HP from Foundry
    Given a Foundry actor has 2 temporary HP after token damage while closed
    And the persisted web character still has 4 temporary HP
    When the user opens the sheet in Foundry
    Then the embedded web sheet shows 2 temporary HP
    And the web sheet does not send 4 temporary HP back during startup
