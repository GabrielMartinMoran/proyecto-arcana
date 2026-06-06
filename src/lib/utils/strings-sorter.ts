/**
 *
 * @param strings Expects a list of strings with the shape of "📌 Text"
 */
export const sortEmojiedStrings = <T>(
	strings: T[],
	extractor: (x: any) => string = (x) => x,
): T[] => {
	return strings.toSorted((a: T, b: T) =>
		extractor(a).substring(2).localeCompare(extractor(b).substring(2)),
	);
};
