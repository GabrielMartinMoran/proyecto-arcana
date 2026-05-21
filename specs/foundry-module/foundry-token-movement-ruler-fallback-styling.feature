@foundry-module @movement-ruler @fallback
Feature: Foundry token movement ruler fallback styling
  Tokens without valid Arcana speed do not receive misleading movement colors.

  Scenario Outline: invalid speed uses default ruler styling
    Given an Arcana token actor has system speed <speed>
    When the user drags the token along a 10 meter path
    Then the ruler uses Foundry default segment styling

    Examples:
      | speed |
      | 0     |
      | -1    |
      | none  |

  @meters-only
  Scenario: terrain cost does not alter Arcana color bands
    Given an Arcana token actor has system speed 7 meters
    And the token has not moved during the current turn
    And the path crosses terrain that would normally alter movement cost
    When the user drags the token along a normal measured 8 meter path
    Then the ruler path is green up to approximately 7 meters
    And the remaining ruler path is yellow
    And no difficult terrain multiplier is applied
