@foundry-module @movement-ruler @green-yellow-red
Feature: Foundry token movement ruler speed colors
  Token drag rulers show Arcana movement bands in meters.

  Background:
    Given an Arcana token actor has system speed 7 meters
    And distance is measured in meters
    And difficult terrain is not applied

  @green
  Scenario: movement up to actor speed is green
    Given the token has not moved during the current turn
    When the user drags the token along a 7 meter path
    Then the ruler path is shown as green

  @yellow
  Scenario: movement from actor speed to double speed is yellow
    Given the token has not moved during the current turn
    When the user drags the token along a 10 meter path
    Then the ruler path is green up to approximately 7 meters
    And the remaining ruler path is yellow

  @red
  Scenario: movement beyond double speed is red
    Given the token has not moved during the current turn
    When the user drags the token along a 17 meter path
    Then the ruler path is green up to approximately 7 meters
    And the ruler path is yellow from approximately 7 meters to 14 meters
    And the remaining ruler path is red
