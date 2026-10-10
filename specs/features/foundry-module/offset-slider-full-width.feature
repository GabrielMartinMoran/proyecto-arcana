@foundry-module @actor-config-modal @offset-sliders @layout
Feature: Full-width offset sliders in the Arcana actor configuration
  The X and Y token offset sliders in the actor configuration dialog span the
  full row width like the other controls, with the percentage value centered
  at the end of the row.

  Background:
    Given the Arcana system is loaded in Foundry VTT v14

  @delta-added @actor-config-modal @layout
  Scenario: The offset sliders fill the row width
    Given an Arcana actor sheet is open
    When the user opens the actor configuration dialog
    Then the "Desplazamiento X" range input fills the row width
    And the "Desplazamiento Y" range input fills the row width
    And each percentage value is centered at the end of its row
    And the "Desplazamiento X" and "Desplazamiento Y" sliders have the same width

  @delta-added @regression @behavior-preserved
  Scenario: The offset slider behavior is preserved
    Given an Arcana actor sheet is open
    And the user opens the actor configuration dialog
    When the user drags the "Desplazamiento X" slider to -25
    Then the percentage value shows "-25%"
    And the slider width does not change
    When the dialog is saved
    Then the actor stores tokenOffsetX = -25
    And the iframe is force reloaded because the offset changed
