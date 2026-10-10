@foundry-module @creature-size @token
Feature: Creature size selection in the Arcana actor configuration
  The actor configuration dialog offers Arcana's canonical creature sizes and
  applies the corresponding token dimensions to the prototype and placed tokens.

  Background:
    Given the Arcana system is loaded in Foundry VTT v14

  @delta-added @actor-config-modal
  Scenario: The configuration dialog offers the canonical creature sizes
    Given an Arcana actor sheet is open
    When the user opens the actor configuration dialog
    Then the size selector offers Diminuto, Pequeño, Mediano, Grande and Inmenso
    And the currently configured size is preselected

  @delta-added @persistence
  Scenario: The chosen size persists per actor
    Given the user selects Grande in the configuration dialog
    When the dialog is saved
    Then the actor stores the Grande creature size
    And reopening the configuration dialog shows Grande selected

  @delta-added @token-dimensions
  Scenario Outline: Each size applies its token footprint
    Given an actor with creature size "<size>"
    When the dialog is saved
    Then the prototype token width and height are "<w>" grid units
    And the placed tokens use the same dimensions

    Examples:
      | size     | w   |
      | diminuto | 0.5 |
      | pequeno  | 1   |
      | mediano  | 1   |
      | grande   | 2   |
      | inmenso  | 3   |

  @delta-added @variants
  Scenario Outline: The largest size offers representative variants
    Given an actor with creature size variant "<variant>"
    When the dialog is saved
    Then the prototype token width and height are "<w>" grid units

    Examples:
      | variant   | w |
      | inmenso   | 3 |
      | inmenso-4 | 4 |
      | inmenso-5 | 5 |

  @delta-added @regression
  Scenario: Actors without a configured size keep their token dimensions
    Given an actor without a configured creature size
    When the user opens and saves the dialog without choosing a size
    Then the token dimensions are unchanged
