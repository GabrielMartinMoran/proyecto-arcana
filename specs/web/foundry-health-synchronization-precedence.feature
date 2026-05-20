@foundry-module @web @health-sync @precedence
Feature: Foundry health synchronization precedence
  In Foundry embedded mode, current Foundry actor or token health is authoritative when the embedded sheet opens, shows, or receives Foundry-originated updates.

  @closed-sheet @startup-hydration
  Scenario: Opening an embedded character sheet after HP changed while closed
    Given a Foundry character actor has health 7 of 12
    And the persisted web character still has health 10 of 12
    And no embedded iframe is currently active for that actor
    When the user opens the actor sheet in Foundry
    Then the embedded web sheet shows health 7 of 12
    And the web sheet does not send health 10 of 12 back to Foundry during startup

  @closed-sheet @token-actor @startup-hydration
  Scenario: Opening a token sheet after token HP changed while closed
    Given a Foundry token actor has health 3 of 9
    And the persisted web character still has health 9 of 9
    And no embedded iframe is currently active for that token actor
    When the user opens the token sheet in Foundry
    Then the embedded web sheet shows health 3 of 9
    And the token actor remains health 3 of 9

  @open-sheet @foundry-to-web
  Scenario: Foundry HP changes while the embedded sheet is open
    Given an embedded web sheet is open for a Foundry actor with health 10 of 12
    When the actor health changes in Foundry to 6 of 12
    Then the embedded web sheet updates to health 6 of 12
    And the iframe is not forcibly reloaded

  @echo-suppression @startup-hydration
  Scenario: Foundry-originated hydration does not echo stale web HP
    Given the embedded web sheet receives Foundry-originated health 5 of 12
    And the previous web state was health 10 of 12
    When the web sheet applies the Foundry-originated health
    Then it does not immediately send health 10 of 12 back to Foundry
    And any subsequent user HP edit can still sync to Foundry
