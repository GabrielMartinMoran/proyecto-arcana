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
