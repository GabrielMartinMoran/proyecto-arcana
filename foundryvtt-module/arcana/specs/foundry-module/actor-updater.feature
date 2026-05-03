@foundry @actor @update
Feature: Actor Updater

  Scenario: Update actor name with [DEV] prefix for localhost
    Given an actor with a develop URL "http://localhost:3000/sheets/character/123"
    And a name update payload with "Test Character"
    When the ActorUpdater handles the update
    Then the actor name should be "[DEV] Test Character"
    And the prototypeToken name should be "[DEV] Test Character"

  Scenario: Update actor name without prefix for production URL
    Given an actor with a production URL "https://app.arcana.com/embedded/characters/123"
    And a name update payload with "Production Char"
    When the ActorUpdater handles the update
    Then the actor name should be "Production Char"
    And the prototypeToken name should be "Production Char"

  @foundry @actor @hp
  Scenario: Update HP for NPC (clamped value)
    Given an NPC actor with current HP value 50 and max 100
    And an HP update payload with value 80 and max 150
    When the ActorUpdater handles the update
    Then the NPC HP max should be clamped to 150
    And the NPC HP value should remain at 50

  Scenario: Update HP for character (updates both value and max)
    Given a character actor with current HP value 30 and max 50
    And an HP update payload with value 40 and max 60
    When the ActorUpdater handles the update
    Then the character HP value should be 40
    And the character HP max should be 60

  Scenario: Update HP for NPC when value exceeds new max (clamps value)
    Given an NPC actor with current HP value 80 and max 100
    And an HP update payload with value 50 and max 60
    When the ActorUpdater handles the update
    Then the NPC HP max should be 60
    And the NPC HP value should be clamped to 60

  @foundry @actor @image
  Scenario: Update actor image when source differs
    Given an actor with current image "old-image.jpg" and source "old-source"
    And an image update payload with new URL "new-image.jpg" and source "new-source"
    When the ActorUpdater handles the update
    Then the actor img should be "new-image.jpg"
    And the prototypeToken texture src should be "new-image.jpg"
    And the imgSource flag should be "new-source"

  @foundry @actor @initiative
  Scenario: Update system initiative
    Given an actor with system initiative set to 5
    And an initiative update payload with value 8
    When the ActorUpdater handles the update
    Then the actor system initiative should be 8

  @foundry @actor @skip-no-change
  Scenario: Skip update when no actual changes
    Given an actor with name "Unchanged Actor" and URL "https://app.arcana.com/embedded/characters/123"
    And a name update payload with "Unchanged Actor"
    When the ActorUpdater handles the update
    Then the actor update should not be called
