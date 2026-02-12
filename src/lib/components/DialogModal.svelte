<script lang="ts">
	import { dialogService } from '$lib/services/dialog-service.svelte';

	let { isOpen, message, type, options, inputValue } = $derived(dialogService);

	function onConfirm() {
		dialogService.close(true);
	}

	function onCancel() {
		dialogService.close(false);
	}

	// Close on Escape key
	function onKeydown(event: KeyboardEvent) {
		if (isOpen && event.key === 'Escape') {
			if (type === 'confirm' || type === 'prompt') {
				onCancel();
			} else {
				onConfirm(); // For alert, escape means OK/Close
			}
		}
	}

	// Handle Enter key in prompt input
	function onInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			onConfirm();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if isOpen}
	<div class="dialog-overlay">
		<div class="dialog-modal" role="dialog" aria-modal="true">
			{#if options.title}
				<div class="dialog-header">
					<h3>{options.title}</h3>
				</div>
			{/if}

			<div class="dialog-content">
				<p>{message}</p>
				{#if type === 'prompt'}
					<input
						type="text"
						bind:value={dialogService.inputValue}
						placeholder={options.placeholder || ''}
						onkeydown={onInputKeydown}
						autofocus
					/>
				{/if}
			</div>

			<div class="dialog-actions">
				{#if type === 'confirm' || type === 'prompt'}
					<button onclick={onCancel}>
						{options.cancelLabel || 'Cancelar'}
					</button>
				{/if}
				<button class="primary" onclick={onConfirm} autofocus={type !== 'prompt'}>
					{options.confirmLabel || 'Aceptar'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start; /* Align to top to allow offset */
		justify-content: center;
		z-index: 9999;
		padding-top: 15vh; /* Position strictly 15% from top */
	}

	.dialog-modal {
		background: var(--secondary-bg, #fff);
		border: 1px solid var(--border-color, #ccc);
		border-radius: var(--radius-md, 8px);
		box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.12));
		min-width: 300px;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		animation: slideIn 0.2s ease-out;
	}

	.dialog-header h3 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.dialog-content p {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.5;
		white-space: pre-line; /* Preserve line breaks in message */
	}

	.dialog-content input[type='text'] {
		margin-top: 1rem;
		width: 100%;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	/* Buttons inherit global styles from app.css, no custom styles needed */

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
