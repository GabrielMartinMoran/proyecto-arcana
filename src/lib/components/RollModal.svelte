<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';

	let { rollModal } = useDiceRollerService();
	let { abortRollModal, submitRollModal, rollModalOpened, rollModalData } = rollModal;
</script>

<div class="roll-modal" class:hidden={!$rollModalOpened || !$rollModalData}>
	{#if $rollModalData}
		<form
			onsubmit={(event) => {
				event.preventDefault();
				submitRollModal();
			}}
		>
			<h3>{$rollModalData.title}</h3>
			<label for="expression"
				>Expresión
				<input type="text" disabled id="expression" value={$rollModalData.expression} />
			</label>
			<label for="type"
				>Tipo de tirada

				<select id="type" bind:value={$rollModalData.rollType}>
					<option value="normal">Normal</option>
					<option value="advantage">Ventaja</option>
					<option value="disadvantage">Desventaja</option>
				</select>
			</label>
			<label for="modifier"
				>Modificadores adicionales

				<input
					type="text"
					id="modifier"
					bind:value={$rollModalData.extraModsExpression}
					placeholder="Ej: 1 + 1d6"
				/>
			</label>

			<div class="buttons">
				<button type="button" onclick={() => abortRollModal()}>Cancelar</button>
				<button type="submit" onclick={() => submitRollModal()}>Tirar</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.roll-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		z-index: 2;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-md);

		&.hidden {
			display: none;
		}

		form {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			padding: var(--spacing-md);

			h3 {
				margin: 0;
			}

			.buttons {
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;

				button {
					width: 5rem;
				}
			}
		}
	}
</style>
