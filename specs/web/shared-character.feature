Feature: Shared Character

  Background:
    Given a user is authenticated with Firebase
    And the characters service is initialized

  @share @import @generate-url
  Scenario: Generate share URL
    Given the user has a character "Aragorn" in their character list
    When the user clicks the share button on the character
    Then a shareable URL is generated
    And the URL contains the character data encoded in the URL
    And the URL is copied to the clipboard
    And a success notification is shown

  @share @import @open-readonly
  Scenario: Open shared read-only view
    Given another user has shared a character with URL
    When the recipient opens the shared URL
    Then the character sheet is displayed in read-only mode
    And all character sections are visible
    And the edit controls are hidden or disabled
    And the character data is correctly parsed from the URL

  @share @import @to-my-characters
  Scenario: Import to my characters
    Given a user receives a shared character URL
    When the user opens the URL and clicks "Import to my characters"
    Then the character is added to the user's character list
    And the user becomes the owner of the imported character
    And the imported character has a new unique ID

  @share @import @party-member-view
  Scenario: Party member viewing shared character
    Given a user is a member of a party with another member's character
    When the party member views the shared character
    Then the character sheet is displayed in read-only mode
    And the roll functionality is available
    And the user can use the character for dice rolls in the party context
