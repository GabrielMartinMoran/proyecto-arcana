@foundry-module @application-v2 @detach @iframe @postmessage
Feature: Arcana sheet supports the native Foundry detached window
  The Arcana sheet can be popped out into a detached browser window without
  breaking the embedded iframe integration.

  Background:
    Given the Arcana system is loaded in Foundry VTT

  @delta-added @detach
  Scenario: Detaching keeps the embedded sheet alive
    Given an Arcana sheet is open with an embedded iframe
    When the user detaches the sheet window
    Then the sheet renders in the detached window
    And the same iframe is preserved without a forced reload
    And the detached window title shows the actor name

  @delta-added @detach @full-bleed
  Scenario: The detached window is entirely the sheet
    Given an Arcana sheet is detached
    Then the Foundry window header is not visible
    And the sheet content fills the whole window
    And no window border, rounding or margins remain

  @delta-added @detach @web-to-foundry
  Scenario: Rolls still reach Foundry from a detached sheet
    Given an Arcana sheet is detached
    When the embedded web sheet sends a precalculated roll
    Then Foundry processes the roll and posts it to chat

  @delta-added @detach @web-to-foundry
  Scenario: Health updates still reach Foundry from a detached sheet
    Given an Arcana sheet is detached
    When the embedded web sheet changes actor health
    Then the Foundry actor health is updated
    And the placed token health bar is redrawn

  @delta-added @detach @foundry-to-web
  Scenario: Foundry updates still reach a detached sheet
    Given an Arcana sheet is detached
    When the Foundry actor health changes
    Then the embedded web sheet shows the new health without a forced reload

  @delta-added @detach @interaction
  Scenario: Detached sheet stays interactive after dragging or resizing
    Given an Arcana sheet is detached
    When the user drags or resizes the sheet
    Then the embedded iframe remains interactive

  @delta-added @reattach
  Scenario: Re-attaching the sheet keeps a single working integration
    Given an Arcana sheet is detached
    When the user uses the sheet's re-attach control
    Then the sheet is interactive again
    And web-to-Foundry messages are processed exactly once

  @delta-added @esc
  Scenario: ESC closes the detached sheet when it is the active window
    Given an Arcana sheet is detached and active
    When the user presses the ESC key
    Then the detached sheet closes
    And other open windows remain open
