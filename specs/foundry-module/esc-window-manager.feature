@foundry @esc @window-manager
Feature: ESC closes only the active collapsible window in Foundry VTT

  Background:
    Given the Arcana system is loaded in Foundry VTT

  @delta-added
  Scenario: ESC closes only the active non-minimized collapsible window
    Given there are multiple open collapsible windows
    And the frontmost window is not minimized
    When the user presses the ESC key
    Then only the frontmost collapsible window should close
    And any remaining collapsible windows should stay open

  @delta-added
  Scenario: ESC skips minimized collapsible windows
    Given there are multiple open collapsible windows
    And the frontmost window is minimized
    When the user presses the ESC key
    Then the frontmost minimized window should remain open
    And the next non-minimized collapsible window should close

  @delta-added
  Scenario: ESC brings the next collapsible window to the front
    Given there are multiple open non-minimized collapsible windows
    When the user presses the ESC key
    Then the frontmost collapsible window should close
    And the next collapsible window should become the frontmost window

  @delta-added
  Scenario: ESC preserves default behavior when no collapsible windows are open
    Given there are no open collapsible windows
    When the user presses the ESC key
    Then the default core.dismiss behavior should execute

  @delta-added
  Scenario: ESC preserves default behavior when the frontmost window is not collapsible
    Given there is an open collapsible window and an open non-collapsible window
    And the non-collapsible window is in front
    When the user presses the ESC key
    Then the default core.dismiss behavior should execute
    And the non-collapsible window should be handled by the default behavior

  @delta-added
  Scenario: ESC delegates to default handler for UI overlays when no collapsible window is active
    Given there is an open collapsible window in the background
    And a non-collapsible UI overlay or menu is in front
    When the user presses the ESC key
    Then the default core.dismiss behavior should execute
    And the collapsible window in the background should remain open

  @delta-added
  Scenario: ESC handles a mix of V1 and V2 collapsible windows
    Given there are open V1 and V2 collapsible windows
    And the frontmost window is a V2 collapsible window
    When the user presses the ESC key
    Then the frontmost V2 window should close
    And the next highest non-minimized window should become the frontmost window

  @delta-added
  Scenario: ESC does not close non-collapsible dialogs
    Given there is an open non-collapsible dialog
    When the user presses the ESC key
    Then the default core.dismiss behavior should execute
    And the dialog should be handled by the default behavior

  @delta-added
  Scenario: ESC handles V1 collapsible windows correctly
    Given there is an open V1 collapsible window
    And it is not minimized
    When the user presses the ESC key
    Then the V1 window should close
    And if there is another non-minimized window it should become active
