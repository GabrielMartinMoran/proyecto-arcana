@delta-added @web @foundry @embedded-character-sync
Feature: embedded character sheet sync stability
  Embedded Foundry character editing preserves local typing while synchronizing safely.

  Scenario: Recent embedded edits are not overwritten by stale remote snapshots
    Given an editable embedded Foundry character sheet is open
    And the player changes a character field locally
    When an older remote character snapshot arrives during the local edit guard window
    Then the sheet continues showing the local edit
    And the older remote value is not re-applied to the visible sheet

  Scenario: Rapid embedded edits save only the latest character state
    Given an editable embedded Foundry character sheet is open
    When the player makes several rapid changes before the debounce interval ends
    Then no remote save occurs before the debounce interval
    And one remote save is sent with the latest character state after the debounce interval

  Scenario: In-flight embedded saves are serialized latest-only
    Given an editable embedded Foundry character sheet is open
    And a previous remote save is still in flight
    When the player makes another local edit
    Then the new edit remains visible immediately
    And the next remote save sends the newest queued character state after the in-flight save completes

  Scenario: Embedded sync reuses the shared character sync behavior
    Given the existing party member character sync behavior is covered by tests
    When embedded character sync is implemented
    Then embedded sync and party member sync use the same shared latest-only save helper
    And both feature test suites pass without duplicating the save queue implementation
