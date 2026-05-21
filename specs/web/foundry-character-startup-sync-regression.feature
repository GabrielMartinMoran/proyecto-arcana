@web @foundry-module @regression @foundry-character-startup-sync
Feature: Foundry character startup sync regression
  Opening an embedded character sheet in Foundry must sync actor identity and stats
  without overwriting valid Foundry token health with stale web health.

  Background:
    Given a web character sheet is opened inside Foundry
    And the URL identifies the target actor or token actor

  @valid-foundry-hp @startup-sync @no-stale-hp-echo
  Scenario: Valid Foundry startup health syncs identity without stale web health echo
    Given the web character has stale health "10/11"
    And Foundry opens the sheet with startup health "7/12"
    When the embedded character finishes loading
    Then the web sheet displays health "7/12"
    And Foundry receives an actor update for the character name, image, speed, and initiative
    And the actor update health is "7/12"
    But the actor update health is not "10/11"

  @invalid-foundry-hp @fresh-actor @health-estimate
  Scenario: Invalid zero over zero startup health is ignored for a fresh actor
    Given the web character has health "10/11"
    And Foundry opens the sheet with startup health "0/0"
    When the embedded character finishes loading
    Then the web sheet displays health "10/11"
    And Foundry receives an actor update with health "10/11"
    And the actor update health max is greater than 0

  @identity-sync @name-image-speed-initiative
  Scenario: Opening a Foundry character sheet syncs name image speed and initiative
    Given the Foundry actor is still named "Actor (3)"
    And the web character has name "Test Character"
    And the web character has an image, speed, and initiative
    When the embedded character finishes loading
    Then Foundry receives an actor update with name "Test Character"
    And the actor update includes the generated character token image
    And the actor update includes the character speed
    And the actor update includes the character initiative

  @health-estimate @numeric-health
  Scenario Outline: Startup health validation prevents invalid Health Estimate fractions
    Given the web character has health "10/11"
    And Foundry opens the sheet with startup health "<startup_health>"
    When the embedded character finishes loading
    Then Foundry receives an actor update with numeric health value and max
    And the actor update health max is greater than 0

    Examples:
      | startup_health |
      | 0/0            |
      | missing/0      |
      | NaN/12         |
      | 5/NaN          |
