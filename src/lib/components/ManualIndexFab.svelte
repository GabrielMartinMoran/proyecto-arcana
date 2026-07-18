<script lang="ts">
	import type { MarkdownHeading } from '$lib/services/doc-service';

	type Props = {
		headings: MarkdownHeading[];
		title?: string;
		omitFirstH1?: boolean;
	};

	let { headings, title = 'Índice', omitFirstH1 = true }: Props = $props();

	const POPOVER_ID = 'manual-index-popover';

	const h1Headings = $derived.by(() => {
		const onlyH1 = headings.filter((heading) => heading.level === 1);
		return omitFirstH1 ? onlyH1.slice(1) : onlyH1;
	});

	const visible = $derived(h1Headings.length > 0);

	let isOpen = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let popoverEl: HTMLElement | undefined = $state();

	const openPopover = () => {
		if (!visible) return;
		isOpen = true;
	};

	const closePopover = (viaLink: boolean) => {
		if (!isOpen) return;
		isOpen = false;
		// Only return focus to the trigger when the close is not from a link click:
		// link activation must follow the native fragment without competing focus moves.
		if (!viaLink && triggerEl) triggerEl.focus();
	};

	const onTriggerClick = () => {
		if (isOpen) {
			closePopover(false);
		} else {
			openPopover();
		}
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && isOpen) {
			event.preventDefault();
			closePopover(false);
		}
	};

	const onDocumentMouseDown = (event: MouseEvent) => {
		if (!isOpen) return;
		const target = event.target as Node | null;
		if (!target) return;
		if (popoverEl?.contains(target)) return;
		if (triggerEl?.contains(target)) return;
		closePopover(false);
	};

	const onLinkClick = () => {
		// Native hash navigation runs afterwards; do not steal focus back to the trigger.
		closePopover(true);
	};

	$effect(() => {
		if (!isOpen) return;
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('mousedown', onDocumentMouseDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('mousedown', onDocumentMouseDown);
		};
	});
</script>

{#if visible}
	<button
		bind:this={triggerEl}
		type="button"
		class="manual-fab"
		aria-label={title}
		aria-expanded={isOpen}
		aria-controls={POPOVER_ID}
		onclick={onTriggerClick}
	>
		<span aria-hidden="true">📑</span>
		{title}
	</button>

	{#if isOpen}
		<nav bind:this={popoverEl} id={POPOVER_ID} class="manual-fab__popover" aria-label={title}>
			<ul class="manual-fab__list">
				{#each h1Headings as heading (heading.id)}
					<li class="manual-fab__item">
						<a class="manual-fab__link" href={'#' + heading.id} onclick={onLinkClick}>
							{heading.text}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/if}

<style>
	.manual-fab {
		position: fixed;
		top: calc(var(--top-bar-height) + var(--spacing-md));
		right: var(--spacing-md);
		z-index: 1002;

		min-width: 44px;
		min-height: 44px;
		padding: var(--spacing-xs) var(--spacing-md);

		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--secondary-bg);
		color: var(--text-primary);
		font-family: 'Cinzel', serif;
		font-weight: 700;
		font-size: 0.9rem;

		box-shadow: var(--shadow-md);
		cursor: pointer;
	}

	.manual-fab:hover,
	.manual-fab:focus-visible {
		background: #fafaf9;
		box-shadow: var(--shadow-lg);
	}

	.manual-fab__popover {
		position: fixed;
		top: calc(var(--top-bar-height) + var(--spacing-md) + 52px);
		right: var(--spacing-md);
		z-index: 1002;

		max-width: min(320px, calc(100vw - 2 * var(--spacing-md)));
		max-height: 60vh;
		overflow-y: auto;

		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--secondary-bg);
		box-shadow: var(--shadow-lg);
		padding: var(--spacing-md);
	}

	.manual-fab__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.manual-fab__item {
		line-height: 1.4;
	}

	.manual-fab__link {
		display: block;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		text-decoration: none;

		&:visited {
			color: var(--text-primary);
		}
	}

	.manual-fab__link:hover,
	.manual-fab__link:focus-visible {
		background: var(--disabled-bg);
		text-decoration: underline;
	}

	@media (min-width: 1281px) {
		.manual-fab {
			top: var(--spacing-md);
			right: calc(var(--dice-panel-width) + var(--spacing-md));
		}
		.manual-fab__popover {
			top: calc(var(--spacing-md) + 52px);
			right: calc(var(--dice-panel-width) + var(--spacing-md));
		}
	}
</style>
