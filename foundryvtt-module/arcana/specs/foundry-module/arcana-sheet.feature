@foundry @sheet @render-iframe
Feature: Arcana Sheet

  Scenario: Render iframe with correct URL params
    Given an actor with URL "https://app.arcana.com/embedded/characters/abc123"
    And actor health value 25 and max 50
    When the sheet data is prepared
    Then the iframe URL should contain "mode=foundry"
    And the iframe URL should contain "uuid=<actor-uuid>"
    And the iframe URL should contain "startHp=25"
    And the iframe URL should contain "startMax=50"

  @foundry @sheet @bestiary-controls
  Scenario: Bestiary mode enables HP inputs
    Given an actor with bestiary URL containing "/bestiary/" or "/npc"
    When the sheet data is prepared
    Then isBestiary should be true
    And HP inputs should be enabled in the sheet

  @foundry @sheet @character-controls
  Scenario: Character mode disables HP inputs
    Given an actor with character URL containing "/characters/"
    When the sheet data is prepared
    Then isBestiary should be false
    And HP inputs should be disabled or hidden in the sheet

  @foundry @sheet @force-reload
  Scenario: Force reload option resets iframe
    Given an actor sheet is already rendered
    And the sheet is rendered again with forceReload: true
    When the sheet render is called
    Then the existing iframe should be replaced
    And a new iframe should be created with fresh URL
