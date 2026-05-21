@foundry-module @npc-ability-uses @initialization
Feature: NPC ability counter initialization
  NPC ability usage counters initialize from synchronized usage definitions and preserve current state across metadata refreshes.

  Scenario: new counters start available
    Given Foundry receives synchronized NPC ability definitions
    And no prior usage counters exist
    When Foundry initializes usage counters
    Then each RELOAD ability starts at 1 of 1
    And each USES ability starts at its declared quantity

  Scenario: existing counters survive a metadata refresh
    Given a RELOAD ability currently has 0 of 1 uses
    When Foundry receives the same ability definition again
    Then the ability remains at 0 of 1 uses
