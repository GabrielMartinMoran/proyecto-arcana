@delta-added
Feature: arcana-skill-builder-make-generate
  The arcana-skill-builder Makefile invokes the skill-creator packaging script.
  Previously this failed with `ModuleNotFoundError: No module named 'scripts'`
  because the script was run directly and its absolute package imports could
  not be resolved. The fix sets PYTHONPATH so the `scripts` package is found.

  Background:
    GIVEN the repository is cloned to a local filesystem
    AND Python 3 is available
    AND Node.js and npm are available

  @smoke @tools
  Scenario: make generate packages the skill successfully
    GIVEN I am in the `tools/arcana-skill-builder/` directory
    AND the generated skill output exists at `out/arcana-reference`
    WHEN I run `make generate`
    THEN the command completes with exit code 0
    AND a `.skill` file is created in `out/`
    AND the `.skill` file contains the packaged skill contents

  @smoke @tools
  Scenario: make generate-no-ai packages the skill successfully
    GIVEN I am in the `tools/arcana-skill-builder/` directory
    AND the generated skill output exists at `out/arcana-reference`
    WHEN I run `make generate-no-ai`
    THEN the command completes with exit code 0
    AND a `.skill` file is created in `out/`
    AND the `.skill` file contains the packaged skill contents

  @smoke @tools @bestiary @modular-source
  Scenario: make generate builds the skill from individual bestiary YAML files
    GIVEN the bestiary source is stored in `static/docs/bestiary/`
    AND the source manifest preserves the canonical creature order
    WHEN I run `make generate`
    THEN the command completes with exit code 0
    AND the generated skill contains the valid bestiary creatures
    AND the generated bestiary dataset remains available under the logical source `bestiary.yml`
    AND an invalid individual YAML is logged and omitted without aborting the build

  @smoke @tools @cards @modular-source
  Scenario: make generate builds the skill from first-tag card YAML files
    GIVEN the ability-card source is stored in `static/docs/cards/`
    AND the card source manifest preserves the canonical first-tag order
    WHEN I run `make generate-no-ai`
    THEN the command completes with exit code 0
    AND the generated skill contains the valid ability cards
    AND the generated card dataset remains available under the logical source `cards.yml`
    AND an invalid individual YAML is logged and omitted without aborting the build

  @smoke @tools @cards @compiled-only
  Scenario: bundled card CLI reads only compiled skill data
    GIVEN a generated skill contains `references/datasets/cards.yml`
    WHEN the bundled card CLI lists or details an ability card
    THEN it resolves the card from the compiled skill dataset
    AND it never reads from `static/docs`

  @delta-modified
  Scenario: package_skill.py docstrings reference correct path
    GIVEN I open `.agents/skills/skill-creator/scripts/package_skill.py`
    WHEN I read the module docstring and usage help text
    THEN all references point to `scripts/package_skill.py`
    AND no references to the obsolete `utils/package_skill.py` remain
