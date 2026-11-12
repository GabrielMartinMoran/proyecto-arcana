@foundry-module @npc-sheet-controls
Feature: NPC sheet native controls
  The native header of the bestiary NPC sheet presents the token health, the
  combat notes, the NPC ability controls and the boss controls with one visual
  language. The restyle keeps every control, data hook and behavior, and both
  render paths (Handlebars template and dynamic refresh) stay in parity.

  Background:
    Given a bestiary actor is open in the Arcana sheet

  @integration @layout
  Scenario: Ability rows align in a control grid
    Given an NPC with ability usage
    Then each ability row lays out the name, the use action, the counter and the recharge action in fixed columns
    And the template and the dynamic refresh render the same grid structure

  @integration @layout
  Scenario: Ability groups share the available width
    Given an NPC with ability usage
    Then the ability groups flow in a responsive grid
    And no group relies on a fixed three-column flex basis

  @integration @layout @regression
  Scenario: The native header keeps its controls
    Given a bestiary actor is open in the Arcana sheet
    Then the header keeps the health value, max and temporary inputs
    And it keeps the combat notes field
    And it keeps the use, counter and recharge controls for each ability
    And it keeps the boss controls when the NPC has boss upgrades
