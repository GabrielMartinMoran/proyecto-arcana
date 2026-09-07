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

  @bestiary @creatures @modular-source
  Scenario: Load creatures from individual YAML files
    Given the bestiary manifest lists one YAML file per creature
    When the creatures service loads the bestiary
    Then all valid creature files are loaded
    And creature names and IDs remain unchanged
    And creatures are sorted by tier then name
    And the legacy `bestiary.yml` file is not required

  @bestiary @creatures @fault-isolation
  Scenario: Skip an invalid individual YAML file
    Given the bestiary manifest contains valid and invalid creature files
    When the creatures service loads the bestiary
    Then valid creatures are still available
    And the invalid creature file is omitted
    And the error identifies the invalid file

  @bestiary @generated-file-list @registry-integrity
  Scenario: Keep every bestiary YAML registered
    Given the bestiary source directory contains YAML files
    When the generated bestiary source registry is validated
    Then every bestiary YAML file is registered exactly once
    And every registered bestiary YAML path exists
    And the generated registry preserves the canonical manifest order

  @bestiary @parallel-load @request-budget
  Scenario: Start bestiary YAML loads in parallel without the runtime manifest
    Given the generated bestiary source registry lists all creature YAML files
    When the bestiary source loader loads the creatures
    Then one request is started for each registered creature YAML file
    And no request is made for the bestiary manifest at runtime
    And all creature file requests start before the first creature file response resolves

  @bestiary @load-deduplication @spa-cache
  Scenario: Reuse bestiary during SPA navigation until reload
    Given the bestiary source loader has not loaded creatures in the current SPA session
    When two bestiary consumers request creatures concurrently
    Then both consumers receive the same creature load result
    And only one request is made for each registered creature YAML file
    When the page is reloaded
    Then the bestiary source loader starts a new load
