@foundry-module @temp-hp @token-bar @visual
Feature: Temporary HP overlay in the token health bar
  Temporary hit points are drawn as a cyan overlay at the start of the token
  health bar, on top of the regular green health fill, without changing the
  core bar behavior for any other bar.

  Background:
    Given the Arcana system is loaded in Foundry VTT v14

  @delta-added @visual
  Scenario: Temporary HP renders as a cyan overlay on the health bar
    Given an actor with 6 current health, 12 maximum health and 3 temporary HP
    When the token health bar is drawn
    Then the cyan overlay spans the first 3/12 of the bar
    And the green health fill remains visible for the following 3/12
    And the rest of the bar is empty

  @delta-added @regression
  Scenario: Without temporary HP the health bar is unchanged
    Given an actor with 6 current health, 12 maximum health and 0 temporary HP
    When the token health bar is drawn
    Then the bar renders exactly as the core health bar

  @delta-added @overflow
  Scenario: Temporary HP exceeding current health covers the health fill
    Given an actor with 2 current health, 12 maximum health and 5 temporary HP
    When the token health bar is drawn
    Then the cyan overlay spans the first 5/12 of the bar
    And no green remains visible

  @delta-added @refresh
  Scenario: A temporary-HP-only change redraws the bar
    Given a token with temporary HP
    When only the temporary HP value changes
    Then the token bar is redrawn

  @delta-added @delegation
  Scenario: Non-health bars keep the core rendering
    Given a token with a non-health bar configured
    When the token bars are drawn
    Then the non-health bar renders exactly as core

  @delta-added @animation
  Scenario: The temporary HP overlay animates when it changes
    Given a token with 3 temporary HP
    When the temporary HP increases to 6
    Then the cyan overlay animates smoothly to its new width
    And the core health fill animation keeps working
    When the temporary HP decreases to 1
    Then the cyan overlay animates smoothly back to its new width
