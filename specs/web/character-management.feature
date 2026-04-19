Feature: Character Management

  Background:
    Given a user is authenticated with Firebase
    And the characters service is initialized

  @character @crud @create
  Scenario: Create new character with name and class
    When the user creates a new character with name "Aldric" and class "Mago"
    Then the character is saved to the local store
    And the character is persisted to localStorage
    And the character appears in the characters list

  @character @crud @sync
  Scenario: Local edit not overwritten by stale remote snapshot
    Given the user has a character "Aldric" last edited 500ms ago
    And LOCAL_EDIT_GUARD_MS is set to 1500ms
    When a remote snapshot arrives with stale data for "Aldric"
    Then the local edit is preserved
    And the remote data does not overwrite the local character state

  @character @crud @delete
  Scenario: Delete character when online
    Given the user is authenticated and online
    And the user has a character "Aldric"
    When the user deletes the character "Aldric"
    Then the character is removed from the local store immediately
    And the character is removed from Firebase
    And the character is removed from the pending deletes queue

  @character @crud @delete @offline
  Scenario: Delete character when offline with pending queue
    Given the user is offline
    And the user has a character "Aldric"
    When the user deletes the character "Aldric"
    Then the character is removed from the local store immediately
    And the character id is added to the pending deletes queue
    And the pending deletes queue is persisted to localStorage

  @character @crud @pending-delete
  Scenario: Pending delete retried on re-authentication
    Given the pending deletes queue contains character id "char-123"
    And the user was previously offline
    When the user re-authenticates
    Then processPendingDeletes is called with the user id
    And the character "char-123" is deleted from Firebase
    And the character id is removed from the pending deletes queue

  @character @crud @localstorage
  Scenario: localStorage fallback persistence
    Given Firebase is disabled or not configured
    And the user has characters in localStorage
    When the characters service loads
    Then the characters are loaded from localStorage
    And the characters appear in the characters store

  @character @crud @debounce
  Scenario: Debounced persistence prevents excessive Firebase writes
    Given the user makes rapid changes to a character "Aldric" within 100ms
    When 5 updates occur before the debounce threshold of 500ms
    Then only one Firebase write is triggered
    And the debounce timer is reset on each change
