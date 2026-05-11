@web @product @application @delta-modified
Feature: Multi-select filter clear state
  Users need cleared card filters to be reflected visually inside multi-select controls.

  Background:
    Given the card list has cards with multiple levels and tags
    And the card filters panel is visible

  @web @product @application @delta-modified @local-clear @tags @grouped-tags @browser-realistic
  Scenario: Local clear removes all checked states from grouped tag checkboxes
    Given the user has opened the tags multi-select
    And the user has selected tag filters from more than one tag group
    And the tags multi-select shows those tag checkboxes as checked
    When the user presses "Limpiar" inside the tags multi-select
    Then the tag filter is empty
    And every checkbox input in the tags multi-select is unchecked
    And no tag checkbox appears visually checked
    And the card results are not filtered by the cleared tags

  @web @product @application @delta-modified @global-clear @tags @grouped-tags @browser-realistic
  Scenario: Global clear removes all checked states from grouped tag checkboxes
    Given the user has opened the tags multi-select
    And the user has selected multiple tag filters using their visible labels
    And the tags multi-select shows those tag checkboxes as checked
    When the user presses "Limpiar Filtros"
    Then all card filters return to their default empty state
    And every checkbox input in the tags multi-select is unchecked
    And no tag checkbox appears visually checked
    And the card results are not filtered by the cleared tags

  @web @application @delta-added @tags @label-click @dom-identity
  Scenario: Clicking a grouped tag label toggles only its own checkbox
    Given the user has opened the tags multi-select
    And the tags multi-select contains grouped tag options
    When the user clicks the visible label for one tag option
    Then only that tag option is selected
    And no other grouped tag checkbox is checked

  @web @application @delta-modified @tag-normalization @tags
  Scenario: Displayed tag labels map to canonical stored values
    Given a card tag is displayed with capitalization in the tags multi-select
    When the user selects that displayed tag
    Then the selected tag is stored using the canonical filter value
    And the same displayed tag checkbox remains visually checked while the filter is active

  @web @application @delta-added @tag-normalization @tags @local-clear
  Scenario: Clearing a canonical tag value unchecks its displayed label
    Given the user has selected a displayed tag with a canonical stored value
    When the user presses "Limpiar" inside the tags multi-select
    Then the tag filter is empty
    And that displayed tag checkbox is unchecked

  @web @product @application @delta-modified @levels @non-regression
  Scenario: Clearing level filters still updates the levels selector
    Given the user has opened the levels multi-select
    And the user has selected one or more level filters
    And the levels multi-select shows those level checkboxes as checked
    When the user presses "Limpiar Filtros"
    Then the level filter is empty
    And every checkbox input in the levels multi-select is unchecked
    And no level checkbox appears visually checked
    And the card results are not filtered by the cleared levels

  @web @application @delta-modified @reactivity @non-mutation
  Scenario: Filter controls do not mutate parent filter state directly
    Given the card filters component receives filter state from its parent
    When the user changes a filter control
    Then the component emits a new filter object
    And the previously received filter object is not mutated
