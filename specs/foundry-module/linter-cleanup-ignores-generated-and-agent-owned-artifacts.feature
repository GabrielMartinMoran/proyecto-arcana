@foundry-module @lint-cleanup
Feature: linter cleanup ignores generated and agent-owned artifacts
  The repository lint commands should pass without formatting generated Foundry artifacts or agent-owned skill files.

  Scenario: Prettier ignores agent skill files
    Given the repository contains files under ".agents"
    When the root Prettier check runs
    Then files under ".agents" are excluded from formatting checks

  Scenario: ESLint ignores agent skill files
    Given the repository contains files under ".agents"
    When the root ESLint check runs
    Then files under ".agents" are excluded from linting

  Scenario: Prettier ignores compiled Foundry entrypoint
    Given "foundryvtt-module/arcana/main.js" is compiled output
    When the root Prettier check runs
    Then "foundryvtt-module/arcana/main.js" is excluded from formatting checks

  Scenario: Prettier ignores Foundry dist output
    Given Foundry build artifacts exist under "foundryvtt-module/arcana/dist"
    When the root Prettier check runs
    Then those dist artifacts are excluded from formatting checks

  Scenario: Foundry hook preserves signature while satisfying unused parameter rules
    Given the Token HUD render hook receives an unused HTML argument
    When the Foundry typecheck and lint commands run
    Then the unused argument is accepted because it is named with the "_" ignore convention
    And the hook behavior remains unchanged

  Scenario: Root ESLint accepts Foundry ESC interceptor source
    Given the ESC interceptor needs to access Foundry globals not fully typed by the current Foundry type package
    When the root ESLint command runs
    Then the interceptor has no bare TypeScript suppression comments
    And the ESC behavior remains unchanged

  Scenario: Root ESLint accepts Foundry ambient declarations
    Given Foundry v14 ambient type augmentations are declaration-only
    When the root ESLint command runs
    Then the ambient declarations are represented in a lint-compatible declaration file or targeted override
    And no runtime JavaScript behavior changes
