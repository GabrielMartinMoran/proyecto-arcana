<script lang="ts">
	import { onMount } from 'svelte';
	import type { CodeJar as CodeJarType } from 'codejar';

	interface Props {
		value: string;
		language?: string;
	}

	let { value = $bindable(''), language = 'yaml' }: Props = $props();

	let editorElement: HTMLElement;
	let jar: CodeJarType | null = null;

	onMount(() => {
		let cleanup: (() => void) | null = null;

		// Use IIFE to handle async initialization
		(async () => {
			try {
				// Dynamic import to avoid SSR issues with window
				const [{ CodeJar }, Prism] = await Promise.all([import('codejar'), import('prismjs')]);

				// Load YAML language support
				await import('prismjs/components/prism-yaml');

				const highlight = (editor: HTMLElement) => {
					const code = editor.textContent || '';
					editor.innerHTML = Prism.highlight(
						code,
						Prism.languages[language] || Prism.languages.yaml,
						language,
					);
				};

				jar = CodeJar(editorElement, highlight);
				jar.updateCode(value);
				currentContent = value;

				jar.onUpdate((code) => {
					value = code;
					currentContent = code;
				});

				cleanup = () => {
					jar?.destroy();
					jar = null;
				};
			} catch (err) {
				console.error('Failed to initialize code editor:', err);
			}
		})();

		return () => {
			cleanup?.();
		};
	});

	let currentContent = $state('');

	// Update editor when value changes externally
	$effect(() => {
		if (jar && value !== currentContent) {
			jar.updateCode(value);
			currentContent = value;
		}
	});
</script>

<div class="code-editor">
	<div bind:this={editorElement} class="editor-content"></div>
</div>

<style>
	.code-editor {
		width: 100%;
		min-height: 40vh;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--secondary-bg);
		overflow: auto;
	}

	.editor-content {
		padding: 0.75rem;
		font-family: 'Courier New', Courier, monospace;
		font-size: 0.95rem;
		min-height: 100%;
		outline: none;
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}

	/* Prism YAML theme (minimal) */
	:global(.editor-content .token.comment) {
		color: #6a9955;
	}
	:global(.editor-content .token.key) {
		color: #0451a5;
	}
	:global(.editor-content .token.string) {
		color: #a31515;
	}
	:global(.editor-content .token.number) {
		color: #098658;
	}
	:global(.editor-content .token.boolean) {
		color: #0000ff;
	}
	:global(.editor-content .token.punctuation) {
		color: #393a34;
	}
</style>
