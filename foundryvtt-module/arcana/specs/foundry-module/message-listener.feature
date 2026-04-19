@foundry @message @precalculated-roll
Feature: Message Listener

  Scenario: Route PRECALCULATED_ROLL to RollHandler
    Given a message with type "PRECALCULATED_ROLL"
    And roll data with formula "2d6+3" and results [4, 2]
    When the message is received
    Then the RollHandler should process the precalculated roll

  @foundry @message @update-actor
  Scenario: Route UPDATE_ACTOR to ActorUpdater
    Given a message with type "UPDATE_ACTOR"
    And actor update data with actorId "actor-123" and payload { name: "Updated Name" }
    When the message is received
    Then the ActorUpdater should handle the actor update

  @foundry @message @unknown
  Scenario: Unknown message type logged
    Given a message with unknown type "UNKNOWN_TYPE"
    And message data { data: "test" }
    When the message is received
    Then the message should be logged at debug level
    And no handler should be called
