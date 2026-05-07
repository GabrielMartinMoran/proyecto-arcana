@delta-added
Feature: Tag grouping utility

  The groupTags function organizes card tags into named groups for display,
  ensuring alphabetical order, case-insensitive matching, and an automatic
  fallback bucket for unmapped tags.

  Background:
    Given the ability tag groups are configured in CONFIG
    And the item tag groups are configured in CONFIG

  @delta-added @unit
  Scenario: Tags are grouped alphabetically and ordered within groups
    Given the following ability tags are available:
      | tag       |
      | Bardo     |
      | Arcanista |
      | Humano    |
      | Curación  |
      | Pícaro    |
    When the tags are grouped using ability tag groups
    Then the resulting groups are ordered alphabetically by group name
    And the "Arquetipos" group contains "Arcanista", "Bardo", "Pícaro" in alphabetical order
    And the "Linajes" group contains "Humano"
    And the "Mecánicas" group contains "Curación"

  @delta-added @unit
  Scenario: Unmapped tags are placed in an Otros group
    Given the following ability tags are available:
      | tag      |
      | Pícaro   |
      | Sinergia |
      | NuevoTag |
    When the tags are grouped using ability tag groups
    Then the "Arquetipos" group contains "Pícaro"
    And the "Otros" group contains "NuevoTag", "Sinergia" in alphabetical order

  @delta-added @unit
  Scenario: No Otros group when all tags are mapped
    Given the following ability tags are available:
      | tag       |
      | Arcanista |
      | Curación  |
    When the tags are grouped using ability tag groups
    Then there is no "Otros" group
    And the "Arquetipos" group contains "Arcanista"
    And the "Mecánicas" group contains "Curación"

  @delta-added @unit
  Scenario: Case-insensitive matching between tags and group definitions
    Given the following ability tags are available:
      | tag       |
      | arcanista |
      | HUMANO    |
      | CURACION  |
    When the tags are grouped using ability tag groups
    Then the "Arquetipos" group contains "arcanista"
    And the "Linajes" group contains "HUMANO"
    And the "Mecánicas" group contains "CURACION"

  @delta-added @unit
  Scenario: Empty tag list returns no groups
    Given no ability tags are available
    When the tags are grouped using ability tag groups
    Then no groups are returned
