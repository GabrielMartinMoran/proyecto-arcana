<script lang="ts">
	type Props = {
		value: number;
		max: number;
		onValueChange?: (value: number) => void;
		onReload?: () => void;
		reloadDisabled?: boolean;
		reloadTitle?: string;
	};

	let {
		value,
		max,
		onValueChange = () => {},
		onReload = () => {},
		reloadDisabled = false,
		reloadTitle = 'Tirar para recargar',
	}: Props = $props();
</script>

<div class="reload-control composite-field vertical-center button-height-rhythm">
	<div class="numeric-group">
		<input
			class="value-input"
			type="number"
			min="0"
			{max}
			{value}
			oninput={(e) => onValueChange?.(Number(e.currentTarget.value))}
		/>
		<span class="divider">/</span>
		<span class="max">{max}</span>
	</div>
	<button
		class="reload-btn"
		title={reloadTitle}
		disabled={reloadDisabled}
		onclick={() => !reloadDisabled && onReload()}
	>
		🎲
	</button>
</div>

<style>
	.reload-control {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: calc(var(--spacing-xs) + 1px) var(--spacing-xs);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-sm);
		width: var(--reload-control-width, auto);
	}

	.reload-control.button-height-rhythm {
		box-sizing: border-box;
		min-height: calc((1rem * 1.25) + (var(--spacing-sm) * 2) + 2px);
	}

	.reload-control.vertical-center {
		align-items: center;
	}

	.reload-control .numeric-group {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		flex: 0 0 auto;
	}

	.reload-control input {
		width: 2rem;
		height: 1.25rem;
		padding: 0 0.125rem;
		text-align: center;
		font-size: 0.875rem;
		border: none;
		background: transparent;
		appearance: textfield;
		-moz-appearance: textfield;
		line-height: 1;
	}

	.reload-control input:focus {
		outline: none;
	}

	.reload-control input::-webkit-outer-spin-button,
	.reload-control input::-webkit-inner-spin-button {
		display: none;
		margin: 0;
	}

	.reload-control .divider {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1;
	}

	.reload-control .max {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1;
	}

	.reload-control .reload-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		font-size: 1rem;
		line-height: 1;
	}

	.reload-control .reload-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
