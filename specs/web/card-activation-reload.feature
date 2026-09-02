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
  Scenario: Reload a depleted card restores one use
    Given the user has an active card "Fire Bolt" with 0 uses remaining
    And the reload threshold for "Fire Bolt" is 3
    When the user clicks "🎲 Recargar"
    And the dice roll result is greater than or equal to the card's reload threshold
    Then the card "Fire Bolt" has 1 use remaining
    And the card is no longer in overcharge state

  @cards @activation @overcharge
  Scenario: Card enters overcharge state when uses exceed max
    Given the user has an active card "Fire Bolt" with 0 uses
    When the user clicks "🎲 Recargar"
    And the dice roll result is a natural 1 (critical failure)
    Then the card "Fire Bolt" enters overcharge state
    And the card's uses are preserved at 0
    And the "🎲 Recargar" button is disabled
    And the overcharge indicator (⚡) is shown on the card
    And the overcharge checkbox is checked

  @cards @activation @auto-reload-disabled
  Scenario: Recargar is shown only when the card has no uses
    Given the user has an active card "Fire Bolt" with 1 use remaining
    When the card is displayed
    Then the "✨ Usar" button is shown
    And the "🎲 Recargar" button is not shown
    And the user cannot trigger a reload roll
