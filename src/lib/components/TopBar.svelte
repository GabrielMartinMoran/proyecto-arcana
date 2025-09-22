<script lang="ts">
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';

	const toggleSideMenu = () => {
		sideMenuExpandedStore.update((value) => !value);
	};
</script>

<div class="top-bar">
	<button onclick={toggleSideMenu}>☰</button>
	<h1>Arcana</h1>
</div>

<style>
	.top-bar {
		position: fixed;
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: var(--spacing-md);
		width: 100%;
		height: var(--top-bar-height);
		gap: var(--spacing-md);
		background-color: var(--secondary-bg);
		border-bottom: 1px solid var(--border-color);
		box-shadow: var(--shadow-sm);
		z-index: 1000;

		button {
			height: 25px;
			width: 25px;
			padding: var(--spacing-sm);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		h1 {
			margin: 0;
			font-size: 1.5rem;
		}
	}
</style>
