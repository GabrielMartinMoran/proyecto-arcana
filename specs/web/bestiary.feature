Feature: Bestiary

  Background:
    Given a user is authenticated with Firebase
    And the creatures service is initialized
    And creatures are loaded from the YAML compendium

  @bestiary @creatures @browse @master-detail
  Scenario: Browse creatures from YAML compendium in a concise catalogue
    Given the user is on the bestiary page
    Then all creatures from the bestiary are listed
    And listed creatures are sorted by tier then name
    And each listed creature shows its name, tier, and lineage
    And an instruction to select a creature is shown
    And no creature statblock is rendered until a creature is selected

  @bestiary @creatures @filter
  Scenario: Filter by tier/name
    Given the user is on the bestiary page
    When the user filters by tier "2"
    Then only tier 2 creatures are listed
    And the tier filter is reflected in the URL
    When the user searches for "Dragon"
    Then only creatures with "Dragon" in their name are listed
    And the search is case-insensitive

  @bestiary @creatures @filter @lineage-filter
  Scenario: Filter creatures by lineage
    Given the user is on the bestiary page
    When the user filters by lineage "Goblinoide"
    Then only creatures with lineage "Goblinoide" are listed
    And the lineage filter is reflected in the URL

  @bestiary @creatures @catalogue-layout
  Scenario: Scan creature metadata in aligned catalogue columns
    Given the user is on the bestiary page
    Then the creature catalogue labels the columns "Nombre", "Linaje", and "Rango"
    And each listed creature aligns its name, lineage, and rank beneath those columns
    And each visible lineage shows its value without a repeated "Linaje" prefix

  @bestiary @creatures @statblock @selection @url-state
  Scenario: View one selected creature statblock
    Given the user is on the bestiary page
    When the user clicks on a creature "Goblin"
    Then the "Goblin" creature statblock is displayed
    And no other creature statblock is rendered
    And the selected creature is reflected in the URL
    And the statblock shows attributes (body, reflexes, mind, instinct, presence)
    And the statblock shows stats (maxHealth, evasion, mitigations, speed)
    And the statblock shows traits, actions, and reactions

  @bestiary @creatures @selection @filter
  Scenario: Clear a selection excluded by active filters
    Given the user has selected the creature "Goblin"
    When the user applies filters that exclude "Goblin"
    Then no creature statblock is rendered
    And an instruction to select a creature is shown

  @bestiary @creatures @master-detail @responsive
  Scenario: Stack the catalogue and statblock when space is limited
    Given the user is on the bestiary page with a viewport width of 899 pixels or less
    Then the creature catalogue is displayed above the selected creature statblock
    And the creature catalogue has its own scrollable region
    And the selected creature statblock remains in the document flow
    And hidden catalogue metadata does not create empty document scroll area

  @bestiary @creatures @master-detail @panel-scroll
  Scenario: Scroll each desktop panel independently
    Given the user is on the bestiary page with a viewport width of 900 pixels or more
    And a creature with a long statblock is selected
    Then the creature catalogue and selected statblock fit within the available viewport content area
    And the user can scroll the creature catalogue independently
    And the user can scroll the selected statblock independently

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
