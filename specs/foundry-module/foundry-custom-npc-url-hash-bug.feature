Feature: Foundry VTT custom NPC URL construction
  As a Foundry VTT user embedding a custom NPC sheet
  I want Foundry query parameters to be placed before the URL hash fragment
  So that the web app detects Foundry mode and syncs creature state back to the actor

  Background:
    Given a Foundry actor with uuid "Actor.123" and health 8/8
    And the actor's sheetUrl flag is set to a custom NPC URL containing "#yaml=goblin..."

  Scenario: Custom NPC URL with hash fragment receives query params before hash
    When buildSheetUrl is called with the custom NPC URL
    Then the resulting iframeUrl contains "?mode=foundry" before the "#" character
    And "uuid=Actor.123" appears in the query string before the hash
    And "startHp=8" and "startMax=8" appear in the query string before the hash
    And the original hash fragment "#yaml=goblin..." is preserved at the end

  Scenario: Bestiary NPC URL without hash receives query params correctly
    Given the actor's sheetUrl flag is "https://app.arcana.com/bestiary/goblin"
    When buildSheetUrl is called
    Then the resulting iframeUrl contains "?mode=foundry&uuid=Actor.123&startHp=8&startMax=8&readonly=1"
    And the URL has no hash fragment

  Scenario: Character URL with existing query params preserves them
    Given the actor's sheetUrl flag is "https://app.arcana.com/embedded/characters/char1?existing=param"
    When buildSheetUrl is called
    Then "existing=param" is still present in the query string
    And "mode=foundry" is also present in the query string

  Scenario: Web app detects Foundry mode from query string
    Given the browser loads an iframe URL with query string "?mode=foundry&uuid=Actor.123"
    When the foundryParams store is evaluated
    Then isFoundry is true
    And uuid is "Actor.123"

  Scenario: Web app detects Foundry mode from hash params as fallback
    Given the browser loads a malformed iframe URL where mode and uuid are inside the hash
    When the foundryParams store is evaluated
    Then isFoundry is still true via hash fallback
    And uuid is still readable via hash fallback

  Scenario: Custom NPC syncs creature state back to Foundry actor
    Given the web app is in Foundry mode with uuid "Actor.123"
    And a custom NPC creature named "Goblin" with 8 HP is parsed
    When the creature state changes
    Then an UPDATE_ACTOR postMessage is sent to the parent window
    And the payload contains name "Goblin" and hp value 8

  Scenario: Query string readonly=1 hides the editor
    Given the NPC embedded page is loaded
    And the URL contains "?readonly=1" in the query string
    And the URL has no hash fragment
    When the page initializes
    Then the YAML editor is not visible
    And the creature statblock is displayed

  Scenario: Hash readonly=1 hides the editor
    Given the NPC embedded page is loaded
    And the URL hash contains "readonly=1"
    And the query string does not contain "readonly=1"
    When the page initializes
    Then the YAML editor is not visible
    And the creature statblock is displayed

  Scenario: No readonly parameter shows the editor
    Given the NPC embedded page is loaded
    And the URL contains neither "readonly=1" in query string nor hash
    When the page initializes
    Then the YAML editor is visible
    And the creature statblock preview is available

  Scenario: External hashchange respects query string readonly
    Given the NPC embedded page is loaded
    And the URL contains "?readonly=1" in the query string
    And the hash initially does not contain "readonly=1"
    When the hash is updated by an external event
    Then the YAML editor remains hidden
    And the creature statblock remains displayed
