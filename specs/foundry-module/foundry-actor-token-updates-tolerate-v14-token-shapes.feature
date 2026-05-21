@foundry-module @actor-token-sync
Feature: Foundry actor token updates tolerate v14 token shapes
  The Foundry module updates active tokens without throwing when Foundry v14 returns Token placeables by default.

  Scenario: Active placeable tokens are updated through token documents
    Given a non-synthetic actor has active tokens on the canvas
    And Foundry v14 would return Token placeables by default
    When the web sheet sends an actor update with a changed name or image
    Then the module updates the active TokenDocuments with the token name or texture changes
    And no "t.update is not a function" error is thrown

  Scenario: Health synchronization redraws active token bars
    Given a non-synthetic character or NPC actor has active token documents with rendered placeables
    When the web sheet sends an actor update with changed health
    Then the module redraws the active token bars
    And the actor sheet update flow continues

  Scenario: Synthetic token actors update their owning token document
    Given the target actor is a synthetic token actor
    And the synthetic actor has an owning token document
    When the web sheet sends an actor update with changed name, image, or health
    Then the owning token document is updated for token name or texture changes
    And token bars are redrawn when health is included
    And no active-token placeable shape error is thrown
