@delta-added
Feature: ArcanaSheetV2 window title shows actor name only
  As a Foundry VTT user opening an Arcana actor sheet
  I want the sheet window title to display only the actor's name
  So that I don't see raw localization keys like "TYPES.Actor.character: Actor Name"

  Background:
    Given the Arcana system has no localization files for actor types
    And the default Foundry V14 DocumentSheetV2 title formats as "{localizedActorType}: {actorName}"

  Scenario: PC sheet window title shows only actor name
    Given a PC actor named "Elara"
    When the ArcanaSheetV2 is instantiated for this actor
    Then the sheet title is "Elara"
    And the title does not contain a colon or raw localization key

  Scenario: NPC sheet window title shows only actor name
    Given an NPC actor named "Goblin"
    When the ArcanaSheetV2 is instantiated for this actor
    Then the sheet title is "Goblin"
    And the title does not contain a colon or raw localization key

  Scenario: Sheet title updates when actor name changes
    Given an actor named "Old Name"
    And the ArcanaSheetV2 is already open
    When the actor is renamed to "New Name"
    Then the sheet title reflects "New Name"

  Scenario: Skipped re-render still updates title element
    Given an already rendered ArcanaSheetV2 with an existing iframe
    When render is called without forceReload
    Then super.render is skipped to preserve iframe state
    And the DOM window-title element text is still set to the actor name
