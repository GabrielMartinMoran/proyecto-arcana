Feature: Party System

  Background:
    Given a user is authenticated with Firebase
    And the parties service is initialized

  @party @collaboration @create
  Scenario: Create a new party
    When the user creates a new party with name "Los Valientes"
    Then the party is saved to the local store
    And the party is persisted to localStorage
    And the party appears in the parties list
    And the user is set as the owner of the party

  @party @collaboration @join
  Scenario: Join party via code
    Given another user has created a party with code "PARTY-123"
    And the user knows the party code "PARTY-123"
    When the user joins the party with code "PARTY-123"
    Then the party is added to the user's parties list
    And the user appears as a member in the party members map
    And the user receives real-time updates for the party

  @party @collaboration @leave
  Scenario: Leave party
    Given the user is a member of a party "Los Valientes"
    And the party has other members
    When the user leaves the party
    Then the user is removed from the party members map
    And the party remains accessible to other members
    And the user's characters are unlinked from the party

  @party @collaboration @member-list
  Scenario: View member list
    Given the user is the owner of a party "Los Valientes"
    And the party has members "Alice" and "Bob"
    When the user views the party members list
    Then the members list shows "Alice" and "Bob"
    And each member shows their associated characters

  @party @collaboration @owner-transfer
  Scenario: Transfer party ownership
    Given the user is the owner of a party "Los Valientes"
    And "Alice" is a member of the party
    When the user transfers ownership to "Alice"
    Then "Alice" becomes the new owner of the party
    And the previous owner becomes a regular member
    And only the new owner can manage party settings

  @party @collaboration @real-time-sync
  Scenario: Real-time sync of party changes
    Given multiple users are members of a party "Los Valientes"
    When a member adds a new character to the party
    Then all other members receive the update in real-time
    And the party's character list is updated for all members
    And Firestore listener remains active during updates
