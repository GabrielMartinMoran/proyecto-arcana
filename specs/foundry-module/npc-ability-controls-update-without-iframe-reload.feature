@foundry-module @npc-ability-uses @rendering
Feature: NPC ability controls update without iframe reload
  NPC ability controls refresh independently from the embedded web iframe.

  Scenario: ability controls refresh after using an ability
    Given a bestiary sheet contains an embedded iframe
    When the user clicks Usar for an ability
    Then the native ability counter display updates
    And the existing iframe element is preserved

  Scenario: synchronized metadata appears without losing iframe state
    Given a bestiary sheet contains an embedded iframe
    When Foundry receives updated NPC ability definitions
    Then the native ability section is refreshed
    And the existing iframe element is preserved
