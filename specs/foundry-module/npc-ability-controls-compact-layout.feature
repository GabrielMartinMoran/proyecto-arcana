@foundry-module @npc-ability-uses @layout
Feature: NPC ability controls compact layout
  NPC ability controls use compact inline layouts and wrapping group columns that preserve readability while using less vertical space.

  Scenario: ability controls use compact inline flex layout
    Given a bestiary sheet shows NPC ability usage controls
    When the sheet renders the ability section
    Then each ability row keeps the name, use button, counter, display, and recharge button inline when space allows
    And the controls can wrap into compact columns when space is constrained

  Scenario: dynamic refresh preserves the compact layout contract
    Given a bestiary sheet has refreshed NPC ability controls after a counter update
    When the refreshed ability section is displayed
    Then the refreshed markup uses the same compact layout classes as the initial template

  Scenario: ability type groups wrap into default three-column columns
    Given a bestiary sheet shows NPC ability groups for acciones, interacciones, and reacciones
    When the sheet renders the ability usage section at normal sheet width
    Then the ability type groups are presented as wrapping columns that fit about three groups per row
    And each group keeps its own abilities stacked vertically
    And narrower widths wrap groups onto additional rows without horizontal overflow

  Scenario: dynamic refresh preserves the group-column layout
    Given a bestiary sheet has refreshed NPC ability controls after using an ability
    When the refreshed ability usage section is displayed
    Then the refreshed markup uses the same wrapping group-column layout as the initial template
    And the iframe remains the existing iframe instance

  Scenario: counter display preserves current input and max suffix
    Given an NPC ability has current uses 1 and maximum uses 3
    When the sheet renders or refreshes the ability controls
    Then the current input shows "1"
    And the ability display suffix shows "/3"
    But the suffix does not duplicate the current value as "1/3"
