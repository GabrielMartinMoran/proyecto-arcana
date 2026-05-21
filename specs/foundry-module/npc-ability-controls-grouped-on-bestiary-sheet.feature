@foundry-module @npc-ability-uses @foundry-grouping
Feature: NPC ability controls grouped on bestiary sheet
  Bestiary sheets display synchronized NPC ability usage controls grouped by source category.

  Background:
    Given a Foundry actor sheet is opened for a bestiary creature
    And Foundry has synchronized NPC ability definitions

  Scenario: abilities are grouped by source category
    Given synchronized abilities exist for actions, reactions, and interactions
    When the bestiary sheet renders native controls
    Then the ability controls show separate groups for actions, reactions, and interactions
    And abilities keep their source order inside each group

  Scenario: no ability section appears when no valid uses exist
    Given the synchronized creature has no valid machine-readable uses declarations
    When the bestiary sheet renders native controls
    Then no NPC ability usage section is shown
