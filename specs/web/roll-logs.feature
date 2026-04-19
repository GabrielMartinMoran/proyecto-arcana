Feature: Roll Logs

  Background:
    Given a user is authenticated with Firebase
    And the dice roller service is initialized

  @roll-logs @persistence
  Scenario: Log persistence (localStorage)
    When the user rolls dice and the result is logged
    Then the roll log is persisted to localStorage
    And the roll log can be retrieved on page reload
    And the personal logs are stored under the "arcana:rollLogs:personal" key
    And party logs are stored under the "arcana:rollLogs:party:{partyId}" key

  @roll-logs @merge
  Scenario: Merge personal/party logs
    Given the user has personal roll logs in localStorage
    And the user is part of a party with party roll logs
    When the roll logs are loaded
    Then personal logs and party logs are merged
    And the logs are sorted by timestamp in descending order
    And each log type maintains its source identity

  @roll-logs @cloud-sync
  Scenario: Cloud sync on auth
    Given the user is authenticated with Firebase
    And the user has pending roll logs marked for sync
    When the authentication state changes to authenticated
    Then the pending roll logs are uploaded to Firebase
    And the personal roll logs are saved to the user's Firestore collection
    And the party roll logs are saved to the party's Firestore subcollection
    And the pending flag is cleared after successful sync

  @roll-logs @display-ordering
  Scenario: Display ordering
    Given the user has multiple roll logs with different timestamps
    When the roll logs are displayed in the UI
    Then the most recent logs appear at the top
    And the logs are grouped by date (today, yesterday, earlier)
    And each log entry shows the roll expression, result, and timestamp
