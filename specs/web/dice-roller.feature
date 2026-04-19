Feature: Dice Roller

  Background:
    Given the dice roller service is initialized

  @dice @rolls @simple
  Scenario: Roll 2d6+3 expression
    When the user rolls the expression "2d6+3"
    Then the expression is parsed into dice members
    And the dice are rolled with random results
    And the total is calculated correctly
    And the roll is logged to the personal roll log

  @dice @rolls @explosion
  Scenario: Roll with explosion (1d6!)
    When the user rolls the expression "1d6!"
    Then the expression is parsed with isExplosive flag set to true
    And dice that roll maximum value explode (roll again)
    And the total includes all exploded dice results
    And the roll is logged with explosion detail

  @dice @rolls @personal
  Scenario: Roll to personal log
    Given the roll target is set to personal (not party)
    When the user rolls "1d20+5"
    Then the roll is saved to the personal roll log in localStorage
    And the roll log key is "arcana:rollLogs:personal"

  @dice @rolls @party
  Scenario: Roll to party log (shared)
    Given the roll target is set to party with id "party-abc"
    And the user is authenticated
    When the user rolls "2d10+4"
    Then the roll is saved to the party roll log in localStorage
    And the roll log key is "arcana:rollLogs:party:party-abc"
    And the roll is synced to Firebase under the party

  @dice @rolls @invalid
  Scenario: Invalid expression shows error
    When the user rolls an invalid expression "abc"
    Then the expression is parsed and returns empty members array
    Or the dice roller handles the error gracefully
    And no roll is added to the log
