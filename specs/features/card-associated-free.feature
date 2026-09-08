Feature: Linked free cards in the character sheet
  The character sheet must let a player link any card to a possessed parent
  card, show the link as a visible tag, and keep the card in its natural
  section. A player can explicitly mark a linked activable card as not
  consuming an active-card slot. If its parent is activable, that exemption is
  effective while the parent is active.

  Background:
    Given the user is viewing a character's Cards tab
    And the character owns cards of different types
    And the cards library is loaded

  @delta-added @cards @association @manage
  Scenario: Link a card from the management view
    Given the character owns "Disciplina Monástica" and "Artes Marciales"
    And "Disciplina Monástica" is active
    And "Artes Marciales" is not linked
    When the user opens the "Gestionar" view
    And the user opens "Vincular carta" for "Artes Marciales"
    And the user selects "Disciplina Monástica" in "Vinculada a"
    And the user checks "No consume una Ranura de Carta Activa"
    And the user saves the link
    Then "Artes Marciales" shows the tag "🔗 Disciplina Monástica"
    And "Artes Marciales" shows "Siempre activa"

  @delta-added @cards @association @suggestion
  Scenario: Suggest the only parent that fulfills the card requirement
    Given the character owns "Senda del Bribón" and "Ataque Furtivo"
    And "Ataque Furtivo" requires "Senda del Bribón"
    When the user opens "Vincular carta" for "Ataque Furtivo"
    Then "Senda del Bribón" is selected in "Vinculada a"
    And the option is marked "[Requerimiento cumplido]"

  @delta-added @cards @association @available @slots
  Scenario: Keep a linked card in the active-cards list without consuming a slot
    Given the character has 1 maximum active-card slot
    And the character has one normal active card
    And "Artes Marciales" is linked to active "Disciplina Monástica"
    And "Artes Marciales" is marked as not consuming an active-card slot
    When the user opens the "Disponibles" view
    Then "Cartas Activas (1/1)" is displayed
    And "Artes Marciales" is displayed in "Cartas Activas"
    And "Artes Marciales" shows the tag "🔗 Disciplina Monástica"
    And the active-cards header explains that 1 linked card does not consume a slot
    When the user activates "Artes Marciales"
    Then "Cartas Activas (1/1)" is still displayed
    And "Artes Marciales" remains in "Cartas Activas"

  @delta-added @cards @association @effects
  Scenario: Keep a linked effect in the effects section
    Given the character owns effect card "Sangre Mágica"
    And "Sangre Mágica" is linked to "Herencia Sobrenatural"
    And "Herencia Sobrenatural" is an effect card
    When the user opens the "Disponibles" view
    Then "Sangre Mágica" remains in "Efectos Activos"
    And "Sangre Mágica" shows the tag "🔗 Herencia Sobrenatural"
    And "Sangre Mágica" does not show "Origen inactivo"

  @delta-added @cards @association @available @accessibility
  Scenario: Explain the association and slot exemption accessibly
    Given "Artes Marciales" is linked to "Disciplina Monástica"
    And "Disciplina Monástica" is active
    When the user views the card in "Gestionar"
    And the user views the card in "Disponibles"
    Then both views show "🔗 Disciplina Monástica"
    And both views expose an accessible name containing "No consume una Ranura de Carta Activa"
    And the link is not communicated by color or icon alone

  @delta-added @cards @association @inactive-origin
  Scenario: Show inactive origin only for an inactive activable parent
    Given "Artes Marciales" is linked to inactive activable "Disciplina Monástica"
    When the user views "Artes Marciales"
    Then "Artes Marciales" shows "Origen inactivo"
    Given "Sangre Mágica" is linked to effect "Herencia Sobrenatural"
    When the user views "Sangre Mágica"
    Then "Sangre Mágica" does not show "Origen inactivo"

  @delta-added @cards @association @validation
  Scenario: Reject an association with an invalid parent
    Given the character owns "Artes Marciales"
    And the character does not own "Disciplina Monástica"
    When the user opens "Vincular carta" for "Artes Marciales"
    Then "Disciplina Monástica" is not offered as a parent option
    And selecting an unowned parent cannot be saved
    And the modal explains that the parent must be owned by the character

  @delta-added @cards @association @validation
  Scenario: Reject self-association and cycles
    Given the character owns "Carta A" and "Carta B"
    And "Carta A" is linked to "Carta B"
    When the user tries to link "Carta A" to itself
    Then the link cannot be saved
    And the modal explains that a card cannot be its own parent
    When the user tries to link "Carta B" to "Carta A"
    Then the link cannot be saved
    And the modal explains that the link would create a cycle

  @delta-added @cards @association @cascade
  Scenario: Deactivate a parent and deactivate its associated cards
    Given "Artes Marciales" is linked to active "Disciplina Monástica"
    And "Artes Marciales" is active
    When the user deactivates "Disciplina Monástica"
    Then a confirmation lists "Artes Marciales" as an affected card
    When the user confirms the change
    Then "Disciplina Monástica" is inactive
    And "Artes Marciales" is inactive
    And "Artes Marciales" still shows "🔗 Disciplina Monástica"

  @delta-added @cards @association @cascade
  Scenario: Remove a parent and clear its child association
    Given "Artes Marciales" is linked to "Disciplina Monástica"
    When the user removes "Disciplina Monástica" from the collection
    Then a confirmation lists "Artes Marciales" as an affected card
    When the user confirms the removal
    Then "Artes Marciales" is inactive
    And "Artes Marciales" is no longer marked as linked

  @delta-added @cards @association @persistence
  Scenario: Persist the parent association with the character
    Given "Artes Marciales" is linked to "Disciplina Monástica"
    And "Artes Marciales" is marked as not consuming an active-card slot
    When the character is saved and loaded again
    Then "Artes Marciales" remains linked to "Disciplina Monástica"
    And its no-slot choice remains enabled
    And the link is available after a page reload

  @delta-added @cards @association @serializer
  Scenario: Include the association in the character Markdown export
    Given "Artes Marciales" is linked to "Disciplina Monástica"
    When the user exports the character as Markdown
    Then the export identifies "Artes Marciales" as "Vinculada a: Disciplina Monástica"
    And the active-card count excludes the linked activable card only when its no-slot choice is enabled

  @delta-added @cards @association @manage @unlink
  Scenario: Remove a link from the association select
    Given "Artes Marciales" is linked to "Disciplina Monástica"
    And "Artes Marciales" has no separate unlink button
    When the user opens "Vincular carta" for "Artes Marciales"
    And the user selects "Sin vinculación" in "Vinculada a"
    And the user saves the association
    Then "Artes Marciales" is no longer marked as linked
    And "Artes Marciales" no longer shows "Siempre activa"
    And "Artes Marciales" has no active-card slot exemption
