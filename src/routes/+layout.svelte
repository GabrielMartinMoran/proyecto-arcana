<script>
	import '../app.css';
	import DialogModal from '$lib/components/DialogModal.svelte';
	let { children } = $props();
</script>

<DialogModal />

{@render children()}
