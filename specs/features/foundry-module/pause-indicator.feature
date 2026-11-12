@foundry-module @pause-indicator
Feature: Compact pause indicator

  Foundry's core pause banner spans the full width of the screen and covers the
  middle of the table with a large spinning icon. The module replaces it with a
  small floating capsule that keeps the paused state visible without hiding the
  scene. The pause state, its keybinding and the core game state do not change.

  @unit
  Scenario: The pause stylesheet is injected once
    Given a document with a head element
    When the module sets up the pause indicator twice
    Then a single style element with id "arcana-pause-styles" exists
    And its content redefines the core "#pause" selector

  @unit
  Scenario: The pause indicator leaves foreign styles alone
    Given a document that already has an unrelated style element
    When the module sets up the pause indicator
    Then the unrelated style element is still present

  @contract
  Scenario: The pause caption is a single word
    Given the module manifest
    Then it declares the module language files for English and Spanish
    And each language file defines the core pause key with a single word

  @manual
  Scenario: The capsule floats above the hotbar without covering the table
    Given Foundry is open with a scene and tokens
    When the GM pauses the game
    Then a capsule with a pause glyph and the localized pause word appears centered above the hotbar
    And the full-width core banner and the spinning core icon are gone
    And the scene keeps its normal contrast and the tokens stay visible
