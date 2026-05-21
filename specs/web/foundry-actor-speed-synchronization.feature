@foundry-module @web @speed-sync
Feature: Foundry actor speed synchronization
  Arcana web sheets synchronize movement speed into Foundry actor system data for movement ruler coloring.

  @character
  Scenario: character speed is sent to Foundry
    Given a character has a calculated movement speed of 7 meters
    And the character sheet is open in Foundry mode
    When the web sheet synchronizes the character state
    Then the UPDATE_ACTOR payload includes speed 7

  @npc
  Scenario: NPC speed is sent to Foundry
    Given a bestiary creature has stats speed value 6 meters
    And the creature sheet is open in Foundry mode
    When the web sheet synchronizes the creature state
    Then the UPDATE_ACTOR payload includes speed 6

  @actor-data
  Scenario: Foundry stores synchronized speed on the actor
    Given a Foundry Arcana actor currently has system speed 0
    When the actor receives an UPDATE_ACTOR payload with speed 7
    Then the actor system speed is updated to 7
