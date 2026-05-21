@foundry-module @npc-ability-uses @state-ownership
Feature: NPC ability usage state ownership
  NPC ability usage state is shared for unique linked actors and token-local otherwise.

  Scenario: linked unique NPC state is shared
    Given a bestiary actor is configured as Personaje Único
    And two sheets reference the same actor
    When the user changes an ability counter in one sheet
    Then the other sheet reads the same updated counter

  Scenario: unlinked token NPC state is token-local
    Given two unlinked tokens use the same bestiary actor definition
    When the user changes an ability counter on one token sheet
    Then the other token sheet keeps its previous counter value
