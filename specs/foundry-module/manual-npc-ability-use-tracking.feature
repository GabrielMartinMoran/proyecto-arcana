@foundry-module @npc-ability-uses @manual-tracking
Feature: Manual NPC ability use tracking
  Users can manually adjust NPC ability counters within their allowed bounds.

  Scenario: user spends one use with the Usar button
    Given a RELOAD ability is shown as 1 of 1
    When the user clicks Usar for that ability
    Then the ability is stored as 0 of 1
    And the displayed counter shows 0/1

  Scenario: user manually edits a bounded counter
    Given an ability has a maximum of 3 uses
    When the user enters 5 as the current uses
    Then Foundry stores the current uses as 3
    And the displayed counter shows 3/3
