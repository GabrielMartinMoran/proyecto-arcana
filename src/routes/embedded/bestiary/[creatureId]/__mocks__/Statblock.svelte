<script lang="ts">
	interface Props {
		creature?: { name?: string };
	}

	let { creature }: Props = $props();
</script>

<div data-testid="statblock-mock">{creature?.name}</div>
