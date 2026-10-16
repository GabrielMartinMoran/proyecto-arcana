@foundry-module @gm-chaos-points @manual-first
Feature: GM Chaos Points tracker for the Arcana Foundry system
  The GM accumulates Chaos Points when players Buy Luck (1:1, no cap, persistent
  across sessions). This feature adds a GM-only, world-scoped counter with manual
  adjustment and Pact of Chaos spend buttons.

  Background:
    Given the Arcana system is loaded in Foundry VTT
    And a world with the GM Chaos Points setting registered

  @unit @counter @clamp
  Scenario: Manual adjustment keeps the counter at or above zero
    Given the GM Chaos Points counter is at 3
    When the GM adjusts the counter by +1
    Then the counter is 4
    When the GM adjusts the counter by -10
    Then the counter is 0

  @unit @spend @guard
  Scenario: A spend with insufficient balance is rejected
    Given the GM Chaos Points counter is at 1
    When the GM tries to spend 2 points on "Segunda Oportunidad"
    Then the spend is rejected
    And the counter stays at 1

  @unit @persistence @world-setting
  Scenario: The counter persists in the world-scoped setting
    Given the GM Chaos Points counter is at 2
    When the counter is saved
    Then the value is stored in the world-scoped Arcana setting
    And reading it again after a reload returns 2

  @unit @spend @costs
  Scenario: Pact of Chaos spends apply their costs
    Given the GM Chaos Points counter is at 5
    When the GM spends on "Reflejo Hostil"
    Then the counter is 4
    When the GM spends on "Segunda Oportunidad"
    Then the counter is 2
    When the GM spends on "Complicación Ambiental"
    Then the counter is 1

  @unit @gm-only @permissions
  Scenario: Only the GM can open the tracker window
    Given a user who is not the GM
    When they try to open the GM Chaos Points window
    Then the window does not open

  @integration @ui @world-setting
  Scenario: The GM window reflects and updates the counter
    Given a GM in a world with the counter at 0
    When the GM opens the Chaos Points window and adjusts +1
    Then the window shows 1
    And the world setting stores 1

  @manual @live-foundry @persistence
  Scenario: Live verification in Foundry (manual procedure)
    Given Foundry VTT v14 with the Arcana system and a world opened as GM
    When the GM clicks the "Puntos de Caos" scene control
    Then the window opens showing the current value and the +1/-1/spend controls
    And after reloading the world the value is still there
    # Manual procedure (run by the user/GM on their own install): there is no
    # automatable Foundry runtime in CI. Pass criteria: window opens, adjust and
    # spend work, and the value persists after reloading (F5).

  @unit @presentation @icon
  Scenario: The chaos control uses the Orbital icon from game-icons.net
    Given the Arcana system is loaded in Foundry VTT
    When the scene controls are prepared as GM
    Then the "Puntos de Caos" tool uses the custom class "arcana-orbital-icon"
    And the class is backed by the bundled asset "systems/arcana/assets/icons/orbital.svg"
    And the system credits attribute the Orbital icon to Lorc (game-icons.net, CC BY 3.0)

  @unit @presentation @buttons
  Scenario: The adjust buttons show only the sign icons
    Given the GM opens the Chaos Points window
    When the adjust controls are rendered
    Then the decrement button shows only the minus icon
    And the increment button shows only the plus icon
