Feature: Bestiary

  Background:
    Given a user is authenticated with Firebase
    And the creatures service is initialized
    And creatures are loaded from the YAML compendium

  @bestiary @creatures @browse
  Scenario: Browse creatures from YAML compendium
    Given the user is on the bestiary page
    Then all creatures from the bestiary are displayed
    And creatures are sorted by tier then name
    And each creature shows its name, tier, and lineage

  @bestiary @creatures @filter
  Scenario: Filter by tier/name
    Given the user is on the bestiary page
    When the user filters by tier "2"
    Then only tier 2 creatures are displayed
    And the tier filter is reflected in the URL
    When the user searches for "Dragon"
    Then only creatures with "Dragon" in their name are displayed
    And the search is case-insensitive

  @bestiary @creatures @statblock
  Scenario: View creature statblock
    Given the user is on the bestiary page
    When the user clicks on a creature "Goblin"
    Then the creature statblock is displayed
    And the statblock shows attributes (body, reflexes, mind, instinct, presence)
    And the statblock shows stats (maxHealth, evasion, mitigations, speed)
    And the statblock shows traits, actions, and reactions

  @bestiary @creatures @foundry-sync
  Scenario: FoundryVTT sync
    Given the user is inside a FoundryVTT session
    And the user is on the bestiary page
    When the user clicks on a creature
    Then the creature state is synced to the active actor in FoundryVTT
    And updates to the creature are reflected in the FoundryVTT actor

  @bestiary @creatures @embed-share
  Scenario: Embeddable share URLs
    Given the user is on the bestiary page
    When the user clicks the share button on a creature "Dragon"
    Then an embeddable URL is generated for that creature
    And the URL follows the format "/embedded/bestiary/[creatureId]"
    And opening the URL shows the creature statblock in read-only mode
