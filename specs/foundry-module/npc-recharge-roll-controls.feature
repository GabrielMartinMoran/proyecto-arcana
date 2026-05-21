@foundry-module @npc-ability-uses @recharge
Feature: NPC recharge roll controls
  Recharge controls roll a d8 as a Foundry roll and restore an NPC ability only when the result meets the recharge target.

  Scenario: successful recharge sends a real Foundry roll message
    Given a RELOAD ability has 0 of 1 uses
    And its recharge target is 6
    When the user rolls recharge and the 1d8 result is 6
    Then Foundry stores the ability as 1 of 1
    And the evaluated roll is sent to chat as a Foundry roll message
    And the roll flavor shows the ability name and success

  Scenario: failed recharge sends a real Foundry roll message
    Given a RELOAD ability has 0 of 1 uses
    And its recharge target is 6
    When the user rolls recharge and the 1d8 result is 5
    Then Foundry keeps the ability at 0 of 1
    And the evaluated roll is sent to chat as a Foundry roll message
    And the roll flavor shows the ability name and failure
