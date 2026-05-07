import { capitalize, removeDiacritics } from './formatting';

export interface GroupedOption {
	group: string;
	options: Array<{ value: string; label: string }>;
}

export function groupTags(tags: string[], groups: Record<string, string[]>): GroupedOption[] {
	if (tags.length === 0) {
		return [];
	}

	const normalizedGroups = new Map<string, { group: string; tags: Set<string> }>();
	for (const [groupName, groupTags] of Object.entries(groups)) {
		normalizedGroups.set(groupName.toLowerCase(), {
			group: groupName,
			tags: new Set(groupTags.map((t) => removeDiacritics(t).toLowerCase())),
		});
	}

	const groupBuckets = new Map<string, Array<{ value: string; label: string }>>();
	const otrosBucket: Array<{ value: string; label: string }> = [];

	for (const tag of tags) {
		const normalizedTag = removeDiacritics(tag).toLowerCase();
		let placed = false;
		for (const { group, tags: groupTagSet } of normalizedGroups.values()) {
			if (groupTagSet.has(normalizedTag)) {
				if (!groupBuckets.has(group)) {
					groupBuckets.set(group, []);
				}
				groupBuckets.get(group)!.push({ value: tag, label: capitalize(tag) });
				placed = true;
				break;
			}
		}
		if (!placed) {
			otrosBucket.push({ value: tag, label: capitalize(tag) });
		}
	}

	const result: GroupedOption[] = [];
	for (const [groupName, options] of groupBuckets) {
		result.push({
			group: groupName,
			options: options.sort((a, b) =>
				removeDiacritics(a.label).localeCompare(removeDiacritics(b.label)),
			),
		});
	}

	result.sort((a, b) => a.group.localeCompare(b.group));

	if (otrosBucket.length > 0) {
		const otrosGroup = result.find((g) => g.group.toLowerCase() === 'otros');
		if (otrosGroup) {
			otrosGroup.options.push(...otrosBucket);
			otrosGroup.options.sort((a, b) =>
				removeDiacritics(a.label).localeCompare(removeDiacritics(b.label)),
			);
		} else {
			result.push({
				group: 'Otros',
				options: otrosBucket.sort((a, b) =>
					removeDiacritics(a.label).localeCompare(removeDiacritics(b.label)),
				),
			});
		}
	}

	return result;
}
