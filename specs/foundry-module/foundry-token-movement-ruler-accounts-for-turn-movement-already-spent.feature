@foundry-module @movement-ruler @already-moved
Feature: Foundry token movement ruler accounts for turn movement already spent
  Ruler colors start from the token movement already used during the current combat turn.

  Scenario: already moved distance reduces remaining green movement
    Given an Arcana token actor has system speed 7 meters
    And the token has already moved 4 meters during the current turn
    When the user drags the token along a new 4 meter path
    Then approximately the first 3 meters of the new ruler path are green
    And the remaining ruler path is yellow

  Scenario: already moved distance can push a new path into red movement
    Given an Arcana token actor has system speed 7 meters
    And the token has already moved 12 meters during the current turn
    When the user drags the token along a new 4 meter path
    Then approximately the first 2 meters of the new ruler path are yellow
    And the remaining ruler path is red

  Scenario: movement history resets for a new combat turn
    Given an Arcana token actor has system speed 7 meters
    And the token moved 9 meters during a previous turn
    When the combat advances to the token's new turn
    And the user drags the token along a 4 meter path
    Then the ruler path is shown as green
