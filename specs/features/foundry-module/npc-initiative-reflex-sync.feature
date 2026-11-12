@product:arcana @application:foundry-vtt-integration @initiative @creature
Feature: Creature initiative derived from Reflexes
  A creature's initiative value is its Reflexes score. One creature-scoped
  calculation feeds the statblock display, the statblock serializers and the
  Foundry NPC actor, so that initiative rolls made from the Foundry combat
  tracker add the NPC's Reflexes score.

  @unit
  Scenario: The creature initiative calculation returns the Reflexes score
    Given a bestiary creature with Reflexes 4
    When the creature initiative calculation is evaluated
    Then the result is 4

  @unit
  Scenario: Serialized statblocks report the calculated initiative
    Given a bestiary creature with Reflexes 5
    When the statblock is serialized to markdown
    Then the markdown lists Iniciativa 5

  @integration
  Scenario: The statblock displays the calculated initiative
    Given a bestiary creature with Reflexes 2
    When the statblock is rendered
    Then the displayed Iniciativa is 2

  @integration
  Scenario: The statblock initiative button rolls the calculated initiative
    Given a bestiary creature with Reflexes 3
    When the statblock initiative button is used
    Then the roll expression is 1d8e+iniciativa

  @integration
  Scenario: NPC state synchronization carries the calculated initiative
    Given a bestiary creature with Reflexes 4
    And the creature sheet is open in Foundry mode
    When the web sheet synchronizes the creature state
    Then the UPDATE_ACTOR payload includes initiative 4

  @integration
  Scenario: Character initiative synchronization is unaffected
    Given a character with Reflexes 3
    And the character sheet is open in Foundry mode
    When the web sheet synchronizes the character state
    Then the UPDATE_ACTOR payload includes initiative 3
