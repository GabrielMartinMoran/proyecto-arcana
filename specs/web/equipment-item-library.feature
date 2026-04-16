@equipment @item-library @economy
Feature: Equipment item library - Add items from predefined catalog

  Background:
    Given a character with name "Test Hero" exists
    And character has 100 gold pieces
    And character has empty equipment list
    And the character sheet is open in edit mode

  @add-blank-item
  Scenario: Add blank item to equipment
    GIVEN the character sheet equipment section is displayed
    WHEN the user clicks "Agregar item en blanco" button
    THEN a new empty item row is added with quantity=1, name="", notes=""
    AND the new item is selected for editing
    AND the equipment list shows exactly 1 item

  @open-library-modal
  Scenario: Open item library modal
    GIVEN the character sheet equipment section is displayed
    WHEN the user clicks "Agregar de librería" button
    THEN the item library modal opens
    AND the modal title is "Agregar item de librería"
    AND items are grouped by category tabs: Armas, Armaduras, Equipo, Servicios

  @filter-weapons
  Scenario: Filter items by category - Weapons
    GIVEN the item library modal is open
    AND all items are displayed
    WHEN the user clicks "Armas" category tab
    THEN only weapon items are displayed
    AND items include Porra (2 o), Daga (5 o), Espada larga (50 o)

  @filter-armors
  Scenario: Filter items by category - Armors
    GIVEN the item library modal is open
    WHEN the user clicks "Armaduras" category tab
    THEN only armor items are displayed
    AND items include Cuero (20 o), Placas completa (750 o), Escudo (10 o)

  @search-items
  Scenario: Search items by name
    GIVEN the item library modal is open
    WHEN the user types "daga" in the search field
    THEN items are filtered to show only items containing "daga" (case insensitive)
    AND "Daga" appears in results with price "5 o"

  @add-free-item
  Scenario: Add free item from library
    GIVEN the item library modal is open
    AND the user has selected "Armas" category
    WHEN the user clicks "Agregar gratis" on "Daga"
    THEN the item "Daga" is added to equipment with quantity=1
    AND the item notes are populated with weapon properties
    AND the character gold remains unchanged at 100 o
    AND the modal remains open for additional selections

  @purchase-sufficient-gold
  Scenario: Purchase item with sufficient gold
    GIVEN the character has 100 gold pieces
    AND the item library modal is open
    AND the user has selected "Armas" category
    WHEN the user clicks "Comprar" on "Espada larga" (50 o)
    THEN "Espada larga" is added to equipment with quantity=1
    AND the character gold is reduced to 50 o
    AND a goldHistory entry is created with:
      | type     | value | reason                    |
      | subtract | 50    | Compra: Espada larga      |

  @purchase-insufficient-gold
  Scenario: Purchase item with insufficient gold
    GIVEN the character has only 30 gold pieces
    AND the item library modal is open
    AND the user has selected "Armas" category
    WHEN the user hovers over "Comprar" button on "Espada larga" (50 o)
    THEN the button is visually disabled (grayed out)
    AND a tooltip appears saying "Oro insuficiente (tienes 30 o, necesitas 50 o)"
    WHEN the user clicks the disabled "Comprar" button
    THEN nothing happens
    AND the character gold remains at 30 o
    AND no goldHistory entry is created

  @duplicate-same-name-notes
  Scenario: Duplicate item with same name and notes increments quantity
    GIVEN the character already has "Daga" with notes="Perforante, Precisa" and quantity=1
    AND the item library modal is open
    WHEN the user adds "Daga" via "Agregar gratis"
    THEN the existing "Daga" quantity is incremented to 2
    AND no new item row is created
    AND the equipment list still shows exactly 1 item row for Daga

  @conflict-different-notes
  Scenario: Conflict resolution - same name different notes
    GIVEN the character has "Daga" with notes="Perforante, Precisa, +1 bonus"
    AND the item library modal is open
    WHEN the user adds "Daga" (which has notes="Perforante, Precisa")
    THEN a confirm dialog appears with title "Item duplicado"
    AND message: 'Ya existe "Daga" con notas diferentes. ¿Agregar como nuevo item?'
    WHEN the user clicks "Sí, agregar"
    THEN a new "Daga" item row is created with quantity=1
    AND the existing "Daga" row is unchanged
    AND the equipment list now shows 2 item rows for Daga

  @close-modal-outside
  Scenario: Close modal by clicking outside
    GIVEN the item library modal is open
    WHEN the user clicks outside the modal dialog
    THEN the modal closes
    AND the equipment section is visible again
    AND no changes were made to equipment

  @close-modal-button
  Scenario: Close modal with close button
    GIVEN the item library modal is open
    WHEN the user clicks "Cerrar" button in modal footer
    THEN the modal closes
    AND the equipment section is visible again

  @multiple-purchases-goldHistory
  Scenario: Multiple purchases accumulate goldHistory entries
    GIVEN the character has 100 gold pieces
    AND the item library modal is open
    WHEN the user purchases "Daga" (5 o)
    AND the user purchases "Mochila" (5 o)
    THEN goldHistory contains 2 entries:
      | type     | value | reason      |
      | subtract | 5     | Compra: Daga    |
      | subtract | 5     | Compra: Mochila |
    AND currentGold displays 90 o
