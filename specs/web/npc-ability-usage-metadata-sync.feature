@web @foundry-module @npc-ability-uses @web-sync
Feature: NPC ability usage metadata sync
  The web app sends explicit bestiary ability usage metadata to Foundry for non-character sheets.

  Background:
    Given the web app is embedded in Foundry mode
    And a bestiary creature has machine-readable uses declarations

  Scenario: sync sends only explicit valid uses declarations
    Given the creature has actions with RELOAD and USES declarations
    And another action has uses null
    And an attack note mentions recharge in free text
    When the web app syncs the creature to Foundry
    Then the update payload includes ability definitions for the RELOAD and USES actions
    And the payload excludes the uses null action
    And the payload excludes the free-text recharge note

  Scenario: reload definitions use recharge target as target not max uses
    Given a creature action declares uses type RELOAD with qty 6
    When the web app syncs the creature to Foundry
    Then the ability definition has max uses 1
    And the ability definition has recharge target 6
