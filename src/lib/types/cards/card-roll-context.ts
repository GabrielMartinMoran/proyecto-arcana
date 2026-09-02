/**
 * Optional roll context supplied to a card rendered inside a character sheet.
 *
 * Absent by default: gallery, search, library, add-card, and custom-card
 * previews keep card descriptions as read-only prose.
 */
export interface CardRollContext {
	/** Normalized variable names accepted by the existing dice parser. */
	variables: Record<string, number>;
	/** Card name used as the default roll source title. */
	title: string;
	/**
	 * Optional title used when the rolled formula is an explicit explosive
	 * dice attack. Absent for library/preview contexts and any caller that
	 * predates attack titles: those formulas keep using `title`.
	 */
	attackTitle?: string;
}
