<script lang="ts">
	import type { CreatureAction } from '$lib/types/creature';
	import InlineRollText from './InlineRollText.svelte';

	type Props = { action: CreatureAction; rollTitle: string };
	let { action, rollTitle }: Props = $props();
</script>

<div class="action">
	<strong
		>{action.name}
		{action.uses
			? `(${action.uses.type == 'USES' ? `${action.uses.qty} ${action.uses.qty === 1 ? 'uso' : 'usos'}` : `Recarga ${action.uses.qty}+`})`
			: ''}:</strong
	>
	<span>
		<InlineRollText text={action.detail} {rollTitle} />
	</span>
</div>
