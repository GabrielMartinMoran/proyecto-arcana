@foundry-module @status-effects
Feature: Arcana states, conditions and card buffs as Foundry status effects
  All Arcana states and conditions, plus representative card buffs (including
  Concentration and Bardic Inspiration), are available as togglable Foundry
  status effects while keeping the core statuses available.

  Background:
    Given the Arcana system is loaded in Foundry VTT v14

  @delta-added @registry
  Scenario: All Arcana states and conditions are registered
    Given the Arcana system initializes
    Then the following status effects are available:
      | id            | name          |
      | cansado       | Cansado       |
      | agotado       | Agotado       |
      | exhausto      | Exhausto      |
      | asustado      | Asustado      |
      | aturdido      | Aturdido      |
      | cegado        | Cegado        |
      | derribado     | Derribado     |
      | dormido       | Dormido       |
      | encantado     | Encantado     |
      | ensordecido   | Ensordecido   |
      | envenenado    | Envenenado    |
      | inconsciente  | Inconsciente  |
      | inmovilizado  | Inmovilizado  |
      | moribundo     | Moribundo     |
      | concentracion | Concentración |

  @delta-added @registry @buffs
  Scenario: Representative card buffs are registered
    Given the Arcana system initializes
    Then the following card buff status effects are available:
      | id                     | name                       |
      | inspiracion-bardica    | Inspiración Bárdica        |
      | foco-del-escaramuzador | Foco del Escaramuzador     |
      | furia-de-batalla       | Furia de Batalla           |
      | forma-del-ki-elemental | Forma del Ki Elemental     |
      | aspecto-de-la-bestia   | Aspecto de la Bestia       |
      | apoteosis-arcana       | Apoteosis Arcana           |
      | aura-divina            | Aura Divina                |
      | barrera-arcana         | Barrera Arcana             |
      | balsamo-natural        | Bálsamo Natural            |
      | grito-de-guerra        | Grito de Guerra            |
      | punto-vital            | Punto Vital                |
      | avatar-del-patron      | Avatar del Patrón          |

  @delta-added @icons
  Scenario: Every Arcana status effect has a resolvable icon
    Given the Arcana system initializes
    Then every Arcana status effect uses a core icon path or a custom SVG shipped with the system
    And every custom SVG is a 512x512 image with explicit width and height

  @delta-added @core
  Scenario: Core status effects remain available
    Given the Arcana system initializes
    Then the core status effects are still registered
    And the Arcana statuses do not replace any core status id

  @delta-added @toggle
  Scenario: Toggling an Arcana status adds and removes the effect
    Given a character actor
    When the user toggles "envenenado" from the token HUD
    Then the actor has the "envenenado" status active
    And the token shows the status effect icon
    When the user toggles "envenenado" again from the token HUD
    Then the actor no longer has the "envenenado" status

  @delta-added @names
  Scenario: Status names show in Spanish without language files
    Given the Arcana system has no language files
    Then the token HUD shows "Envenenado" as the label of the "envenenado" status

  @delta-added @special
  Scenario: Cegado takes over the core blind integration
    Given the Arcana system initializes
    Then the special status effect BLIND maps to "cegado"
    And an actor with the "cegado" status has its vision blinded

  @delta-added @concentration
  Scenario: Concentration is representable and exposed
    Given the Arcana system initializes
    Then the "concentracion" status effect is available
    And the special status effect CONCENTRATING maps to "concentracion"

  @delta-added @buffs @toggle
  Scenario: A card buff can be toggled on a token
    Given a character actor
    When the user toggles "inspiracion-bardica" from the token HUD
    Then the actor has the "inspiracion-bardica" status active
    And the token shows the inspiration status icon

  @delta-added @buffs @coexistence
  Scenario: Card buffs coexist with each other and with conditions
    Given a character actor with the "foco-del-escaramuzador" status active
    When the user toggles "barrera-arcana" from the token HUD
    And the user toggles "envenenado" from the token HUD
    Then the actor has "foco-del-escaramuzador", "barrera-arcana" and "envenenado" active

  @delta-added @fatigue
  Scenario: Fatigue grades do not accumulate
    Given a character actor with the "cansado" status active
    When the user toggles "agotado" from the token HUD
    Then the actor has the "agotado" status active
    And the actor no longer has the "cansado" status
    When the user toggles "exhausto" from the token HUD
    Then the actor has the "exhausto" status active
    And the actor no longer has the "agotado" status

  @delta-added @fatigue @edge-case
  Scenario: Deactivating a fatigue grade does not affect other statuses
    Given a character actor with the "agotado" and "envenenado" statuses active
    When the user toggles "agotado" off from the token HUD
    Then the actor no longer has the "agotado" status
    And the actor still has the "envenenado" status

  @delta-added @exclusivity
  Scenario: Focus and Concentration are mutually exclusive
    Given a character actor with the "concentracion" status active
    When the user toggles "foco-del-escaramuzador" from the token HUD
    Then the actor has the "foco-del-escaramuzador" status active
    And the actor no longer has the "concentracion" status
    When the user toggles "concentracion" from the token HUD
    Then the actor has the "concentracion" status active
    And the actor no longer has the "foco-del-escaramuzador" status
