Feature: Card Activation and Reload

  Background:
    Given a user has a character with cards equipped
    And the character has an active card slot available

  @cards @activation @equip
  Scenario: Equip a card from gallery to character slot
    Given the user is viewing the card gallery
    And the user has a card "Fire Bolt" available in their collection
    And the card "Fire Bolt" is not currently active
    When the user clicks "Activar" on the "Fire Bolt" card
    Then the "Fire Bolt" card is marked as active
    And the card appears in the active cards section
    And the active slot count increases by 1

  @cards @activation @use
  Scenario: Use a card (decrement uses)
    Given the user has an active card "Fire Bolt" with 3 uses
    And the card "Fire Bolt" is currently active
    When the user decrements the uses to 2
    Then the card "Fire Bolt" shows 2 remaining uses
    And the reload button shows the current uses state

  @cards @activation @reload
  Scenario: Reload card resets uses to max
    Given the user has an active card "Fire Bolt" with 2 uses remaining
    And the maximum uses for "Fire Bolt" is 3
    When the user clicks the reload button (🎲)
    And the dice roll result is greater than or equal to the card's max uses
    Then the card "Fire Bolt" uses are reset to 3
    And the card is no longer in overcharge state

  @cards @activation @overcharge
  Scenario: Card enters overcharge state when uses exceed max
    Given the user has an active card "Fire Bolt" with 3 uses
    When the user clicks the reload button (🎲)
    And the dice roll result is a natural 1 (critical failure)
    Then the card "Fire Bolt" enters overcharge state
    And the card's uses are preserved at 3
    And the reload button is disabled
    And the overcharge indicator (⚡) is shown on the card

  @cards @activation @auto-reload-disabled
  Scenario: Reload button disabled when at max uses
    Given the user has an active card "Fire Bolt" with 3 uses
    And the maximum uses for "Fire Bolt" is 3
    When the card reaches maximum uses
    Then the reload button is disabled
    And clicking the reload button has no effect
    And the user cannot trigger a reload roll
