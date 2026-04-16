@product:arcana @application:foundry-vtt-integration
Feature: Precalculated Roll Handling in Foundry v14

  Scenario: Roll handler processes dice terms when Die class is not globally accessible
    GIVEN a PrecalculatedRollData with formula "2d6" and results [4, 2]
    AND the RollHandler service is instantiated
    WHEN handlePrecalculatedRoll is called with the roll data
    THEN no "Die is not defined" error is thrown
    AND the roll terms are processed using term.constructor.name === 'Die' fallback
    AND a chat message is created with the precalculated results

  Scenario: Roll handler correctly patches die results for each die in the formula
    GIVEN a PrecalculatedRollData with formula "3d8+4" and results [3, 7, 5]
    AND the RollHandler service is instantiated
    WHEN handlePrecalculatedRoll is called with the roll data
    THEN the first die term results are patched with 3
    AND the second die term results are patched with 7
    AND the third die term results are patched with 5
    AND the numeric modifier 4 remains unmodified
    AND a chat message is created showing the total 19

  Scenario: Roll handler gracefully handles missing results for extra dice faces
    GIVEN a PrecalculatedRollData with formula "2d6" and results containing fewer values than dice count
    AND the RollHandler service is instantiated
    WHEN handlePrecalculatedRoll is called with the roll data
    THEN missing results are generated randomly for the die faces
    AND no error is thrown due to undefined results
    AND a chat message is created with all dice resolved

  Scenario: Roll handler streams initiative rolls to combat tracker
    GIVEN a PrecalculatedRollData with type 'INITIATIVE' containing formula "1d20+5" and result [15]
    AND the speaker has a token in the current combat
    AND the RollHandler service is instantiated
    WHEN handlePrecalculatedRoll is called with the roll data
    THEN the combatant initiative is updated to the roll total
    AND no "Die is not defined" error is thrown
