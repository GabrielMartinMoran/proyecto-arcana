@delta-added
Feature: InputField width prop with CSS variables

  The InputField component supports a width prop (small, normal, full) backed
  by global CSS variables, eliminating magic numbers and keeping table headers
  synchronized with their input fields.

  Background:
    Given the application stylesheets are loaded

  @delta-added @ui @refactor
  Scenario: Default InputField renders at normal width
    When an InputField is rendered without width or fullWidth props
    Then its container width equals the --input-width-normal CSS variable

  @delta-added @ui @refactor
  Scenario: InputField width="small" renders at small width
    When an InputField is rendered with width="small"
    Then its container width equals the --input-width-small CSS variable

  @delta-added @ui @refactor
  Scenario: InputField width="full" stretches to parent
    When an InputField is rendered with width="full"
    Then its container width is 100% of its parent

  @delta-added @ui @refactor
  Scenario: Legacy fullWidth={true} remains backward compatible
    When an InputField is rendered with fullWidth={true}
    Then its container width is 100% of its parent

  @delta-added @ui @refactor
  Scenario: Equipment list quantity column stays aligned
    When the EquipmentList is rendered
    Then the quantity column header width equals --input-width-small
    And each quantity InputField uses width="small"

  @delta-added @ui @refactor
  Scenario: Progress tab quantity column stays aligned
    When the ProgressTab is rendered
    Then the quantity column header width equals --input-width-small
    And the quantity InputField uses width="small"

  @delta-added @ui @refactor
  Scenario: Economy tab quantity column stays aligned
    When the EconomyTab is rendered
    Then the quantity column header width equals --input-width-small
    And the quantity InputField uses width="small"
