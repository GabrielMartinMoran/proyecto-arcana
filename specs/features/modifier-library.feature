@modifiers @configuration
Feature: modifier library for configuration

  Background:
    Given the user is on the Settings tab

  Scenario: Open modifier library modal from settings
    When the user clicks "📚 Agregar desde Biblioteca" in the Modificadores section
    Then a modal titled "Biblioteca de Modificadores" opens
    And the modal shows a search field
    And the modal shows category tabs including "Todos"

  Scenario: Browse modifiers by category
    Given the modifier library modal is open
    When the user clicks category tab "Monje"
    Then only modifiers in category "Monje" are listed

  Scenario: Search modifiers in the library
    Given the modifier library modal is open
    When the user searches for "Marciales"
    Then only modifiers whose name or description contains "Marciales" are listed

  Scenario: Add modifier from the library
    Given the modifier library modal is open
    And the selected library modifier has one or more subModifiers
    When the user clicks "Agregar" for that library modifier
    Then each subModifier is added as a separate modifier row
    And each added modifier is enabled by default
    And the modal closes

  Scenario Outline: Close modifier library without adding
    Given the modifier library modal is open
    When the user closes the modal with <control>
    Then the modal closes
    And no modifier is added

    Examples:
      | control |
      | the header "✕" button |
      | the footer "Cerrar" button |

  Scenario: Disable a modifier from the list
    Given the user has an enabled modifier in the list
    When the user unchecks the modifier checkbox
    Then the modifier checkbox is unchecked
    And the modifier row is shown with reduced opacity
    And text input fields in that row are shown with strikethrough styling

  Scenario: Re-enable a modifier from the list
    Given the user has a disabled modifier in the list
    When the user checks the modifier checkbox
    Then the modifier checkbox is checked
    And the modifier row returns to normal opacity
    And text input fields in that row no longer show strikethrough styling

  Scenario: Add equipment with an exact-name matching library modifier
    Given the modifier library contains a modifier whose name exactly matches an item name
    And that modifier has one or more subModifiers
    When the user adds that item from the item library to equipment
    Then each subModifier is added as a separate modifier row
    And each added modifier reason is prefixed with "Objeto: "
    And each added modifier is enabled by default

  Scenario: Confirm removal of equipment with associated modifiers
    Given the character has an equipped item with associated modifiers whose reasons match the item name exactly or with the "Objeto: " prefix
    When the user removes that item and confirms the associated-modifier prompt
    Then the item is removed from equipment
    And all associated modifiers with the exact or "Objeto: " prefixed reasons are removed

  Scenario: Cancel removal of equipment with associated modifiers
    Given the character has an equipped item with associated modifiers whose reasons match the item name exactly or with the "Objeto: " prefix
    When the user removes that item and cancels the associated-modifier prompt
    Then the item remains in equipment
    And the associated modifiers remain unchanged

  Scenario: Add a card with partial-name matching library modifiers
    Given the modifier library contains one or more modifiers whose names include a card name
    And each matching modifier has one or more subModifiers
    When the user adds that card to the character
    Then each matching subModifier is added as a separate modifier row
    And each added modifier reason is prefixed with "Carta: "
    And each added modifier is enabled by default

  Scenario: Confirm removal of a card with associated modifiers
    Given the character has a card with associated modifiers whose reasons match the card name exactly or with the "Carta: " prefix
    When the user removes that card and confirms the associated-modifier prompt
    Then the card is removed from the character
    And all associated modifiers with the exact or "Carta: " prefixed reasons are removed

  Scenario: Cancel removal of a card with associated modifiers
    Given the character has a card with associated modifiers whose reasons match the card name exactly or with the "Carta: " prefix
    When the user removes that card and cancels the associated-modifier prompt
    Then the card remains on the character
    And the associated modifiers remain unchanged
