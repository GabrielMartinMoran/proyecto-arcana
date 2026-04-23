@modifiers @configuration
Feature: modifier library for configuration

  Scenario: Open modifier library modal from settings
    GIVEN the user is on the Settings tab
    WHEN the user clicks "Agregar desde Biblioteca" in the Modificadores section
    THEN the ModifierLibraryModal opens showing available modifiers

  Scenario: Browse modifiers by category
    GIVEN the ModifierLibraryModal is open
    WHEN the user clicks category tab "Monje"
    THEN only Monje modifiers are displayed

  Scenario: Add modifier from library with checkbox enabled
    GIVEN the ModifierLibraryModal is open with Monje category selected
    WHEN the user clicks "Agregar" on "Artes Marciales"
    THEN the modifier is added to the character's modifiers list
    AND the modifier is enabled (checkbox checked)
    AND the modal closes

  Scenario: Toggle modifier enabled/disabled with visual feedback
    GIVEN the user has an enabled modifier in the list
    WHEN the user clicks the checkbox to disable it
    THEN the modifier row shows opacity 0.5 and strikethrough text
    AND the modifier is no longer applied to character stats
    WHEN the user clicks again to enable
    THEN the row returns to normal opacity and no strikethrough

  Scenario: Add armor and auto-add modifier
    GIVEN user has "Gambesón" equipped
    WHEN the armor is added to equipment
    THEN a modifier "Gambesón" is automatically added with enabled=true

  Scenario: Remove armor and prompt for associated modifier
    GIVEN user has modifier "Gambesón" from equipment
    WHEN the "Gambesón" armor is removed from equipment
    THEN a confirmation dialog appears: "¿Remover modificador 'Gambesón'?"
    AND if confirmed, the modifier is removed

  Scenario: Add card and auto-add matching modifier
    GIVEN user has card "Artes Marciales" in collection
    WHEN the card is added to collection
    THEN a modifier "Artes Marciales" is automatically added with enabled=true

  Scenario: Remove card and prompt for associated modifiers
    GIVEN user has modifier "Artes Marciales" from card
    WHEN the card "Artes Marciales" is removed from collection
    THEN a confirmation dialog appears: "¿Remover modificadores asociados a 'Artes Marciales'?"
    AND if confirmed, all modifiers with reason containing "Artes Marciales" are removed

  Scenario: Close modifier library without adding
    GIVEN the ModifierLibraryModal is open
    WHEN the user clicks outside the modal
    THEN the modal closes without adding any modifiers