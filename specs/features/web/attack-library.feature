@attack-library @web
Feature: attack library - Ataques precargados para la hoja de personaje

  Background:
    Given a character with name "Test Hero" exists
    And the character sheet is open in edit mode

  @modal-open
  Scenario: Abrir la biblioteca de ataques
    Given the character sheet attacks section is displayed
    When the user clicks "Agregar de biblioteca"
    Then the attack library modal opens
    And the modal title is "Biblioteca de Ataques"

  @tabs
  Scenario: Mostrar las pestañas de armas y conjuros
    Given the attack library modal is open
    Then the "Armas" tab is selected by default
    And the modal shows the "Conjuros" tab

  @search
  Scenario: Buscar entradas por nombre
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user types "daga" in the search field
    Then only entries containing "daga" (case insensitive) are displayed

  @weapon-melee
  Scenario: Importar el ataque de un arma cuerpo a cuerpo
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user clicks "Agregar" on "Maza"
    Then a new attack "Maza" is added with atkFormula "1d8e+cuerpo"
    And the attack dmgFormula is "1d6"
    And the attack notes are "Contundente · Requisito: Cuerpo 2"

  @weapon-finesse
  Scenario: Importar el ataque de un arma precisa
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user clicks "Agregar" on "Daga"
    Then a new attack "Daga" is added with atkFormula "1d8e+reflejos"
    And the attack dmgFormula is "1d4"
    And the attack notes are "Perforante · Precisa, Arrojadiza (Cercana)"

  @weapon-ranged
  Scenario: Importar el ataque de un arma a distancia
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user clicks "Agregar" on "Arco corto"
    Then a new attack "Arco corto" is added with atkFormula "1d8e+reflejos"
    And the attack dmgFormula is "1d6"
    And the attack notes are "Perforante · A dos manos, Rango (Media) · Requisito: Reflejos 2"

  @weapon-versatile
  Scenario: Importar un arma versátil crea dos filas de ataque
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user clicks "Agregar" on "Espada larga (1 mano)"
    And the user clicks "Agregar" on "Espada larga (2 manos)"
    Then the attacks include "Espada larga (1 mano)" with dmgFormula "1d8"
    And the attacks include "Espada larga (2 manos)" with dmgFormula "1d10"

  @spell-import
  Scenario: Importar el ataque de un conjuro
    Given the attack library modal is open
    And the "Conjuros" tab is selected
    When the user clicks "Agregar" on "Llama Sagrada"
    Then a new attack "Llama Sagrada" is added with atkFormula "1d8e+instinto"
    And the attack dmgFormula is "1d6"
    And the attack notes are "Conjuro · Daño: Radiante"

  @spell-alias
  Scenario: Resolver el alias del atributo arcano al importar
    Given the character owns the card "Estudios Mágicos"
    And the attack library modal is open
    And the "Conjuros" tab is selected
    When the user clicks "Agregar" on "Descarga Elemental"
    Then the added attack atkFormula is "1d8e+mente"

  @spell-blocked-alias
  Scenario: Bloquear la importación si el atributo arcano no se puede resolver
    Given the character does not own any arcane attribute substitution card
    And the attack library modal is open
    And the "Conjuros" tab is selected
    Then the "Agregar" button on "Descarga Elemental" is disabled
    And a tooltip shows the disabled reason

  @readonly
  Scenario: Ocultar el botón de biblioteca en modo lectura
    Given the character sheet is open in read-only mode
    And the character sheet attacks section is displayed
    Then the "Agregar de biblioteca" button is not displayed
    And the "Agregar Ataque" button is not displayed

  @snapshot-duplicates
  Scenario: Los ataques importados son copias editables y los duplicados se permiten
    Given the attack library modal is open
    And the "Armas" tab is selected
    When the user clicks "Agregar" on "Maza" twice
    Then two independent "Maza" attack rows exist
    And editing one "Maza" row does not change the other
    And removing the weapon from the equipment does not modify the imported attacks
