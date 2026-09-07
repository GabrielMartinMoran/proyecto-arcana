Feature: Card Gallery

  Background:
    Given a user is authenticated with Firebase
    And the cards service is initialized
    And the cards filter service is initialized
    And cards are loaded from the YAML compendium

  @gallery @filter @browse
  Scenario: Browse cards with multi-filter (name/type/level/tags)
    Given the user is on the card gallery page
    When the user applies the following filters:
      | field | value          |
      | name  | Fuego          |
      | type  | ability        |
      | level | 2              |
      | tags  | magic,attack   |
    Then only cards matching ALL filters are displayed
    And the filter state is reflected in the URL
    And the result count matches the filtered cards

  @gallery @filter @search
  Scenario: Search cards by name
    Given the user is on the card gallery page
    When the user searches for "Fuego"
    Then cards with names containing "Fuego" are displayed
    And cards without "Fuego" in the name are hidden
    And the search term appears in the URL

  @gallery @filter @view-modes
  Scenario: Three view modes (grid/compact/list)
    Given the user is on the card gallery page
    When the user selects "grid" view mode
    Then cards are displayed in a grid layout
    And each card shows full details
    When the user selects "compact" view mode
    Then cards are displayed in a compact layout
    And each card shows minimal details
    When the user selects "list" view mode
    Then cards are displayed in a list layout
    And cards are shown in a single column with key details

  @gallery @filter @url-sync
  Scenario: Filters synced to URL
    Given the user is on the card gallery page with filters: "?name=Fuego&type=ability&level=1&tags=magic"
    When the page loads
    Then all filters are populated from the URL parameters
    And the displayed cards match the URL filters
    When the user changes a filter
    Then the URL is updated to reflect the new filter state
    And the page can be refreshed with the same filters applied

  @gallery @cards @modular-source
  Scenario: Load ability cards from first-tag YAML files
    Given the ability-card manifest lists one YAML file per first tag
    When the cards service loads the ability cards
    Then all valid card files are loaded
    And card names, IDs, and first-tag images remain unchanged
    And cards are sorted by level, tags, then name
    And the legacy `cards.yml` file is not required

  @gallery @cards @fault-isolation
  Scenario: Skip an invalid ability-card YAML file
    Given the ability-card manifest contains valid and invalid card files
    When the cards service loads the ability cards
    Then valid cards are still available
    And cards from the invalid file are omitted
    And the error identifies the invalid card file

  @gallery @cards @generated-file-list @registry-integrity
  Scenario: Keep every card YAML registered
    Given the card source directory contains YAML files
    When the generated card source registry is validated
    Then every card YAML file is registered exactly once
    And every registered card YAML path exists
    And the generated registry preserves the canonical manifest order

  @gallery @cards @parallel-load @request-budget
  Scenario: Start card YAML loads in parallel without the runtime manifest
    Given the generated card source registry lists all card YAML files
    When the cards source loader loads the ability cards
    Then one request is started for each registered card YAML file
    And no request is made for the ability-card manifest at runtime
    And all card file requests start before the first card file response resolves

  @gallery @cards @load-deduplication @spa-cache
  Scenario: Reuse cards during SPA navigation until reload
    Given the cards source loader has not loaded cards in the current SPA session
    When two card consumers request cards concurrently
    Then both consumers receive the same card load result
    And only one request is made for each registered card YAML file
    When the page is reloaded
    Then the cards source loader starts a new load
