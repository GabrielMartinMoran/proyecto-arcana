Feature: NPC Creator

  Background:
    Given a user is authenticated with Firebase
    And the NPC creator page is loaded

  @npc @creator @create
  Scenario: Create NPC from scratch
    Given the user is on the NPC creator page
    When the user enters valid YAML for a new creature
    Then the creature is parsed and validated
    And the statblock preview is updated in real-time
    And no parse errors are shown
    When the user saves the NPC
    Then the YAML is persisted for future editing

  @npc @creator @import-bestiary
  Scenario: Import from bestiary
    Given the user is on the NPC creator page
    And the creatures service is initialized
    When the user clicks "Import from Bestiary"
    Then the bestiary import modal opens
    And the user can search and select a creature
    When the user selects a creature "Goblin"
    Then the creature YAML is loaded into the editor
    And the statblock preview is updated with the creature

  @npc @creator @live-preview
  Scenario: Live YAML preview
    Given the user is on the NPC creator page with "mixed" tab active
    When the user types in the YAML editor
    Then the statblock preview updates after a debounce delay
    And the preview shows the parsed creature data
    When the user enters invalid YAML
    Then a parse error message is displayed
    And the preview shows the last valid creature or is empty

  @npc @creator @share-url
  Scenario: Generate share URL
    Given the user has created an NPC in the editor
    When the user clicks "Copy Link"
    Then a shareable URL is generated with the YAML encoded
    And the URL is copied to the clipboard
    And a success notification is shown
    When another user opens the shared URL
    Then the NPC is displayed in read-only mode
