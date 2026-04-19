@ssr @localStorage @dice-roller
Feature: dice-roller-service SSR localStorage safety
  Ensures dice-roller-service operates gracefully in SSR contexts where localStorage is unavailable.

  @delta-added
  Scenario: loadRollLogs returns empty array in SSR
    GIVEN the runtime is server-side (window is undefined)
    WHEN loadRollLogs() is called
    THEN the function returns an empty array without throwing ReferenceError
    AND localStorage is not accessed

  @delta-added
  Scenario: loadRollLogs reads from localStorage in browser
    GIVEN the runtime is a browser (window is defined)
    AND roll logs exist in localStorage for the current target
    WHEN loadRollLogs() is called
    THEN the logs are loaded and mapped correctly

  @delta-added
  Scenario: saveRollLogs persists to localStorage in browser
    GIVEN the runtime is a browser (window is defined)
    AND the user has roll logs in memory
    WHEN saveRollLogs() is called
    THEN the logs are serialized and stored in localStorage
    AND no error is thrown

  @delta-added
  Scenario: saveRollLogs is silent no-op in SSR
    GIVEN the runtime is server-side (window is undefined)
    AND the user has roll logs in memory
    WHEN saveRollLogs() is called
    THEN the function completes without throwing
    AND localStorage is not accessed

  @delta-added
  Scenario: useDiceRollerService initializes without error in SSR
    GIVEN the runtime is server-side (window is undefined)
    WHEN useDiceRollerService() is called
    THEN the service initializes successfully
    AND no ReferenceError is thrown

  @delta-added
  Scenario: roll target subscription handles SSR gracefully
    GIVEN the runtime is server-side (window is undefined)
    WHEN rollTargetSvc.target.subscribe callback fires
    THEN localStorage is not accessed
    AND the subscription callback completes without error

  @delta-added
  Scenario: existing browser tests continue to pass
    GIVEN the runtime is a browser (jsdom environment with localStorage)
    WHEN all existing tests in dice-roller-service.test.ts run
    THEN all tests pass
    AND localStorage persistence behaves as documented
