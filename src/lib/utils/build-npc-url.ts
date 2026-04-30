/**
 * Construye una URL para /embedded/npc con el YAML y readonly en el hash fragment.
 */
export function buildNpcUrl(base: URL, yaml: string, readonly: boolean): string {
	const url = new URL(base.toString());
	const hash = new URLSearchParams();
	hash.set('yaml', yaml);
	if (readonly) {
		hash.set('readonly', '1');
	}
	url.hash = hash.toString();
	return url.toString();
}
