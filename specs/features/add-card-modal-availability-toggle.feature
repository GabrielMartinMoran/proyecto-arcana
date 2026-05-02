Feature: Add Card Modal availability toggle and reactive filtering
  The Add Card modal must allow players to toggle between showing all cards
  and showing only cards the character currently meets the requirements for.
  The available-card list must also recalculate reactively when the
  character's collection changes (free add or purchase).

  Background:
    Given a character with default attributes
    And the card library contains ability and item cards with various requirements

  @delta-added
  Scenario: "Ver Solo disponibles" toggle filters to available cards when active
    Given the Add Card modal is open for abilities
    And the "Ver Solo disponibles" toggle is enabled
    When the user views the card list
    Then only cards whose requirements are met by the character are displayed
    And cards with unmet requirements are hidden

  @delta-added
  Scenario: "Ver Solo disponibles" toggle shows all cards when deactivated
    Given the Add Card modal is open for abilities
    And the "Ver Solo disponibles" toggle is enabled
    When the user disables the "Ver Solo disponibles" toggle
    Then all cards in the library are displayed
    And cards with unmet requirements are visible alongside available cards

  @delta-added
  Scenario: Available cards recalculate after adding a free card
    Given the Add Card modal is open for abilities
    And the "Ver Solo disponibles" toggle is enabled
    And card "Fire Bolt" is available and visible in the list
    When the user adds "Fire Bolt" to the character's collection for free
    Then "Fire Bolt" is no longer displayed in the modal
    And any cards whose requirements are now fulfilled by owning "Fire Bolt" appear in the list

  @delta-added
  Scenario: Available cards recalculate after purchasing a card with PP
    Given the Add Card modal is open for abilities
    And the "Ver Solo disponibles" toggle is enabled
    And the character has 10 PP
    And card "Strong Bolt" costs 5 PP and is available
    When the user purchases "Strong Bolt"
    Then "Strong Bolt" is no longer displayed in the modal
    And the character's PP is reduced by 5

  @delta-added
  Scenario: Available cards recalculate after purchasing an item with gold
    Given the Add Card modal is open for items
    And the "Ver Solo disponibles" toggle is enabled
    And the character has 100 gold
    And item "Magic Sword" costs 50 gold and is available
    When the user purchases "Magic Sword"
    Then "Magic Sword" is no longer displayed in the modal
    And the character's gold is reduced by 50


