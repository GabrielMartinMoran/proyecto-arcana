<script lang="ts">
	import type { CreatureAction } from '$lib/types/creature';

	type Props = { action: CreatureAction };
	let { action }: Props = $props();
</script>

<div class="action">
	<strong
		>{action.name}
		{action.uses
			? `(${action.uses.type == 'USES' ? `${action.uses.qty} ${action.uses.qty === 1 ? 'uso' : 'usos'}` : `Recarga ${action.uses.qty}+`})`
			: ''}:</strong
	>
	<span>
		{action.detail}
	</span>
</div>
