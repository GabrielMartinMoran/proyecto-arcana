@delta-added
Feature: Grouped tag filter in card gallery and magical items

  The tag multi-select filter in the card gallery and magical items page
  presents tags organized into named groups, while preserving existing
  filtering behavior, URL sync, and backward compatibility for flat lists.

  Background:
    Given the user is on the card gallery page
    And ability cards are loaded with tags from multiple groups

  @delta-added @ui @filter
  Scenario: Ability card tags are displayed in groups
    When the user opens the "Etiquetas" multi-select filter
    Then the group "Linajes" is visible
    And the group "Arquetipos" is visible
    And the group "Mecánicas" is visible
    And tags appear under their respective group headers

  @delta-added @ui @filter
  Scenario: Item card tags are displayed in groups
    Given the user is on the magical items page
    And item cards are loaded with tags from multiple groups
    When the user opens the "Etiquetas" multi-select filter
    Then the group "Atributos" is visible
    And the group "Equipamiento" is visible
    And the group "Mecánicas" is visible

  @delta-added @ui @filter
  Scenario: Group headers are bold and non-selectable
    When the user opens the "Etiquetas" multi-select filter
    Then group headers are displayed in bold text
    And group headers do not have checkboxes

  @delta-added @ui @filter
  Scenario: Selecting a grouped tag filters cards correctly
    When the user opens the "Etiquetas" multi-select filter
    And the user selects the tag "Arcanista"
    Then only ability cards tagged with "arcanista" are displayed
    And the URL contains "tags=arcanista"

  @delta-added @ui @filter
  Scenario: Multiple grouped tags can be selected
    When the user opens the "Etiquetas" multi-select filter
    And the user selects the tag "Arcanista"
    And the user selects the tag "Conjuro"
    Then the filter shows 2 selected tags
    And the URL contains "tags=arcanista" and "tags=conjuro"
    And only cards tagged with both "arcanista" and "conjuro" are displayed

  @delta-added @ui @filter
  Scenario: Unmapped ability tags appear in an Otros group
    Given ability cards include a tag not defined in any group
    When the user opens the "Etiquetas" multi-select filter
    Then the group "Otros" is visible
    And the unmapped tag appears under "Otros"

  @delta-added @ui @filter
  Scenario: Unmapped item tags appear in an Otros group
    Given the user is on the magical items page
    And item cards include a tag not defined in any group
    When the user opens the "Etiquetas" multi-select filter
    Then the group "Otros" is visible
    And the unmapped tag appears under "Otros"

  @delta-added @ui @filter
  Scenario: Levels multi-select remains flat and ungrouped
    When the user opens the "Niveles" multi-select filter
    Then no group headers are shown
    And levels appear as a flat list of checkboxes
