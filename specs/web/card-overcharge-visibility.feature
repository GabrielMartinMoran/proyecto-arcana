@cards @overcharge @visibility
Feature: Card Overcharge Control Visibility

  Background:
    Given a user has a character with active cards equipped

  @delta-added @cards @overcharge @reload
  Scenario: Activable card with RELOAD uses shows overcharge control
    Given the user has an active card "Adrenaline Surge" with uses type "RELOAD"
    When the user views the active cards list
    Then the overcharge toggle is displayed for "Adrenaline Surge"
    And the reload control is displayed for "Adrenaline Surge"

  @delta-added @cards @overcharge @long-rest
  Scenario: Activable card with LONG_REST uses does not show overcharge control
    Given the user has an active card "Second Wind" with uses type "LONG_REST"
    When the user views the active cards list
    Then the overcharge toggle is not displayed for "Second Wind"
    But the reload control is displayed for "Second Wind"

  @delta-added @cards @overcharge @uses
  Scenario: Activable card with USES uses does not show overcharge control
    Given the user has an active card "Shield Block" with uses type "USES"
    When the user views the active cards list
    Then the overcharge toggle is not displayed for "Shield Block"
    But the reload control is displayed for "Shield Block"

  @delta-added @cards @overcharge @day
  Scenario: Activable card with DAY uses does not show overcharge control
    Given the user has an active card "Daily Power" with uses type "DAY"
    When the user views the active cards list
    Then the overcharge toggle is not displayed for "Daily Power"
    But the reload control is displayed for "Daily Power"

  @delta-added @cards @overcharge @effect
  Scenario: Effect card does not show overcharge control
    Given the user has an active card "Passive Aura" of type "efecto" with uses type "USES"
    When the user views the active cards list
    Then the overcharge toggle is not displayed for "Passive Aura"
    And the reload control is displayed for "Passive Aura"
