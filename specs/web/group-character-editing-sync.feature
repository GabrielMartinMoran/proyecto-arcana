@web @product @application @delta-added
Feature: Group character editing sync
  Users editing characters from a group view need their latest changes to remain visible and saved without stale remote snapshots resetting inputs.

  Background:
    Given a signed-in user is viewing a party with member characters
    And Firebase sync is enabled for party and character data

  @web @product @application @delta-added @rapid-typing @optimistic-local-update
  Scenario: Rapid typing in group view keeps the latest visible text and local copy
    Given the user can edit a selected party member character
    When the user rapidly types a new character name in the group character sheet
    Then the group view continues to show the latest typed name
    And the party's local character copy contains the latest typed name
    And no intermediate saved value replaces the latest typed name

  @web @product @application @delta-added @stale-snapshot-protection @firebase-echo
  Scenario: Stale Firebase snapshots do not overwrite a recent group character edit
    Given the user has just edited a selected party member character in the group view
    And a Firebase character snapshot still contains the previous character value
    When the stale snapshot is received during the recent local edit guard window
    Then the group view keeps the user's recent edit visible
    And the party's local character copy keeps the user's recent edit
    And the stale snapshot does not reset the edited input

  @web @product @application @delta-added @outside-group-unchanged @regression
  Scenario: Editing outside the group keeps the existing character service path
    Given the user is editing one of their characters outside any group view
    When the user changes that character's sheet field
    Then the existing character editing behavior is preserved
    And character persistence continues through the character service path
    And group-specific character sync does not handle the outside-group edit

  @web @product @application @delta-added @permissions @owner-edits-member @member-edits-own
  Scenario Outline: Character editing permissions are preserved in the group view
    Given the selected party member character belongs to "<character owner>"
    And the current user is "<actor>"
    When the current user attempts to edit the selected character from the group view
    Then the edit is "<outcome>"
    And the saved character value is "<saved value>"

    Examples:
      | actor                       | character owner | outcome | saved value             |
      | the party owner             | another member  | allowed | the edited value        |
      | the character owner         | the same member | allowed | the edited value        |
      | an unrelated party member   | another member  | blocked | the previous value      |

  @web @product @application @delta-added @last-write-wins @out-of-order-saves
  Scenario: Out-of-order saves do not lose the newest group character edit
    Given the user makes multiple edits to the same party member character before earlier saves complete
    And an older save completes after a newer edit has already been queued
    When all pending group character saves settle
    Then the saved character value matches the newest edit
    And the group view shows the newest edit
    And no older save result replaces the newest character value
