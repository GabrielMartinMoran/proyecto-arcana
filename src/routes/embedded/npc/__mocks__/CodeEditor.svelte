<script lang="ts">
	interface Props {
		value?: string;
		language?: string;
	}

	let { value = $bindable(''), language = 'yaml' }: Props = $props();
</script>

<textarea bind:value data-language={language} data-testid="code-editor"></textarea>

<style>
	textarea {
		width: 100%;
		min-height: 40vh;
	}
</style>
