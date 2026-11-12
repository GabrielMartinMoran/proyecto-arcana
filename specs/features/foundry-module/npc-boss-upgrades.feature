@foundry-module @npc-boss-upgrades
Feature: NPC boss upgrades
  A bestiary NPC can be given boss upgrades from the sheet configure dialog.
  Each upgrade grants one extra Reaction per round and one Boss Determination
  use per encounter. The boss controls are injected into the sheet only when
  the NPC has at least one upgrade. Each resource is grouped in its own counter
  card, and every boss Reaction option describes its effect in a tooltip.

  Background:
    Given a bestiary actor is open in the Arcana sheet

  @unit @rules
  Scenario Outline: Upgrade tier follows the GM manual table
    Given an NPC has <upgrades> boss upgrades
    Then it has <reactions> Reactions per round
    And it has <determinations> Boss Determination uses per encounter
    And its PA cost multiplier is <multiplier>

    Examples:
      | upgrades | reactions | determinations | multiplier |
      | 0        | 1         | 0              | 1          |
      | 1        | 2         | 1              | 1.25       |
      | 2        | 3         | 2              | 1.5        |
      | 3        | 4         | 3              | 1.75       |

  @unit @rules @bounds
  Scenario Outline: Upgrade count is clamped to the documented range
    When a stored upgrade count of <raw> is normalized
    Then the upgrade count is <normalized>

    Examples:
      | raw  | normalized |
      | 7    | 3          |
      | -2   | 0          |
      | "2"  | 2          |
      | abc  | 0          |
      | 2.7  | 2          |

  @unit @rules @options
  Scenario: Every boss Reaction option documents its effect
    Given the boss Reaction options catalog
    Then each option has a unique id, a visible label and an effect description
    And every option costs 1 Reaction

  @integration @visibility
  Scenario: Boss controls stay hidden without upgrades
    Given an NPC has 0 boss upgrades
    Then the sheet shows no boss controls section

  @integration @render @template-part
  Scenario: The sheet template renders as a single part root
    Given the Arcana sheet template
    Then it renders exactly one root element
    And the boss controls styles live inside that root

  @integration @visibility @options
  Scenario: Boss controls appear with the shared Reaction options
    Given an NPC has 1 boss upgrade
    Then the sheet shows the boss controls section
    And the section shows 2 Reactions per round
    And the section identifies 1 of those Reactions as the base Reaction
    And the section shows 1 Boss Determination per encounter
    And the section lists Reposicionarse, Ataque Rápido and Guardia Reactiva
    And the section shows the PA cost multiplier of 1.25
    And the section states that each Reaction option costs 1 Reaction

  @integration @visibility @options
  Scenario Outline: Each boss Reaction option describes its effect in a tooltip
    Given an NPC has 1 boss upgrade
    Then the <option> button has a tooltip that mentions <effect>

    Examples:
      | option           | effect    |
      | Reposicionarse   | Velocidad |
      | Ataque Rápido    | Recarga   |
      | Guardia Reactiva | Esquiva   |

  @integration @layout @pools
  Scenario: Each boss resource is grouped in its own counter card
    Given an NPC has 2 boss upgrades
    Then the section shows a Reactions card with its counter, stepper and reset
    And the section shows a Determination card with its counter, stepper and reset
    And the Reactions card shows the base plus boss Reaction breakdown

  @integration @spend @stepper
  Scenario: The Reactions stepper spends and restores within the pool bounds
    Given an NPC has 1 boss upgrade
    And the boss has 2 of 2 Reactions
    When the user lowers the Reactions stepper
    Then the boss is stored with 1 of 2 Reactions
    When the user lowers the Reactions stepper twice more
    Then the boss is stored with 0 of 2 Reactions
    And the lower Reactions stepper is disabled

  @integration @spend
  Scenario: The base Reaction can be spent on a boss Reaction
    Given an NPC has 1 boss upgrade
    And the boss has 2 of 2 Reactions, its base Reaction included
    When the user spends a boss Reaction
    Then the boss is stored with 1 of 2 Reactions
    And the displayed counter shows 1/2

  @integration @spend @bounds
  Scenario: Boss Reactions share a single pool
    Given an NPC has 2 boss upgrades
    And the boss has 1 of 3 Reactions remaining
    When the user spends a boss Reaction
    Then the boss is stored with 0 of 3 Reactions
    And the boss cannot spend another Reaction that round

  @integration @reset
  Scenario: Starting a new round restores Reactions only
    Given an NPC has 1 boss upgrade
    And the boss has 0 of 2 Reactions
    And the boss has 0 of 1 Boss Determination
    When the user starts a new round
    Then the boss is stored with 2 of 2 Reactions
    And the boss is stored with 0 of 1 Boss Determination

  @integration @reset
  Scenario: Starting a new encounter restores Determination only
    Given an NPC has 1 boss upgrade
    And the boss has 0 of 2 Reactions
    And the boss has 0 of 1 Boss Determination
    When the user starts a new encounter
    Then the boss is stored with 1 of 1 Boss Determination
    And the boss is stored with 0 of 2 Reactions

  @integration @configuration
  Scenario: Configure dialog persists the upgrade count
    When the user sets 2 boss upgrades in the configure dialog
    Then the actor flag arcana.bossUpgrades is 2
    And the sheet shows 3 of 3 Reactions
    And the sheet shows 2 of 2 Boss Determination

  @unit @state-ownership
  Scenario: Unlinked tokens track their own boss resources
    Given a boss actor is configured as a bestiary NPC
    And two unlinked tokens use the same actor definition
    When the user spends a boss Reaction on one token sheet
    Then that token sheet shows 1 fewer Reaction
    And the other token sheet keeps its previous boss counter value
