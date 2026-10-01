@web @cards @uses-formula
Feature: Card uses computed by formula
  A card may declare an optional uses.formula that computes its total uses from
  the character attributes, reusing the character-sheet formula evaluator. A
  formula takes precedence over uses.qty. Without a formula, the existing uses
  semantics stay unchanged, and library contexts keep the formula readable as
  text.

  @unit @evaluator
  Scenario: Evaluate max, min and Math helpers without a silent fallback
    Given a character with Cuerpo equal to 3 and Reflejos equal to 5
    When the app evaluates the formula "max(1, floor(reflejos/2))"
    Then the result is 2
    And the app evaluates "min(cuerpo, reflejos)" to 3
    And the app evaluates "Math.floor(reflejos/2)" to 2

  @unit @formula @precedence
  Scenario: Compute total uses from a plain attribute formula
    Given a card "Reprensión Infernal" with uses type "LONG_REST" and formula "presencia"
    And a character with Presencia equal to 4
    When the total uses of the card are resolved for the character
    Then the total uses are 4

  @unit @formula @precedence
  Scenario: Formula takes precedence over qty
    Given a card "Reprensión Infernal" with uses qty 2 and uses formula "presencia"
    And a character with Presencia equal to 4
    When the total uses of the card are resolved for the character
    Then the total uses are 4

  @unit @formula @clamping
  Scenario Outline: Evaluate a compound formula with max and floor
    Given a card "Movilidad Elemental" with uses formula "max(1, floor(reflejos/2))"
    And a character with Reflejos equal to <reflejos>
    When the total uses of the card are resolved for the character
    Then the total uses are <total>

    Examples:
      | reflejos | total |
      | 8        | 4     |
      | 4        | 2     |
      | 1        | 1     |
      | 0        | 1     |

  @unit @defaults
  Scenario: A card without a uses block stays unlimited
    Given a card with no uses block and no formula
    And a character with Presencia equal to 4
    When the total uses of the card are resolved for the character
    Then the total uses are unlimited

  @unit @defaults
  Scenario: A uses block without qty defaults to zero
    Given a card with uses type "LONG_REST" and no qty and no formula
    When the total uses of the card are resolved for the character
    Then the total uses are 0

  @unit @errors
  Scenario: An invalid formula resolves to zero uses
    Given a card "Reprensión Infernal" with uses formula "presencia +"
    And a character with Presencia equal to 4
    When the total uses of the card are resolved for the character
    Then the total uses are 0

  @unit @formula @corpus
  Scenario: Every card formula in the corpus evaluates without errors
    Given the card corpus contains cards with uses formulas
    When the suite evaluates every declared formula with a sample attribute context
    Then every formula yields a finite number without evaluation errors

  @component @rendering @character-sheet
  Scenario: Show an effect card with formula uses in the character sheet
    Given the character owns the effect card "Reprensión Infernal" with uses formula "presencia"
    And the character has Presencia equal to 4
    When the user views the effect cards in the available cards sub-tab
    Then the card shows "Usos: 4"
    And the card offers its usage control

  @component @interaction @character-sheet
  Scenario: Spend a formula-based use
    Given the character owns the effect card "Movilidad Elemental" with uses formula "max(1, floor(reflejos/2))" and 4 uses remaining
    And the character has Reflejos equal to 8
    When the user clicks "✨ Usar" on "Movilidad Elemental"
    Then the card shows 3 remaining uses

  @component @interaction @contract
  Scenario: Effect cards stay non-activable while offering usage controls
    Given the character owns the effect card "Reprensión Infernal" with uses formula "presencia"
    And the character has Presencia equal to 4
    When the user views the effect cards in the available cards sub-tab
    Then the card shows no activation toggle
    And the card offers its usage control

  @component @lifecycle
  Scenario: Initialize remaining uses from the formula when the card is added
    Given the character has Presencia equal to 4
    When the user adds the effect card "Reprensión Infernal" with uses formula "presencia"
    Then the card has 4 uses remaining

  @component @lifecycle
  Scenario: Restore formula-based uses when an activable card is deactivated
    Given the character has Reflejos equal to 8
    And the character owns the activable card "Golpe Férreo" with uses formula "floor(reflejos/2)" and 1 use remaining
    When the user deactivates "Golpe Férreo"
    Then the card has 4 uses remaining

  @component @attributes
  Scenario: Attribute changes shrink but do not top up remaining uses
    Given the character owns the effect card "Reprensión Infernal" with uses formula "presencia" and 4 uses remaining
    And the character has Presencia equal to 4
    When the character's Presencia changes to 2
    Then the card shows 2 remaining uses
    When the character's Presencia changes to 6
    Then the card shows 2 remaining uses

  @component @library @rendering
  Scenario: Hide the uses chip for a formula card in the card library
    Given the card "Reprensión Infernal" with uses formula "presencia" is displayed in the card library without a character
    When the user views the card
    Then the card shows no uses chip
