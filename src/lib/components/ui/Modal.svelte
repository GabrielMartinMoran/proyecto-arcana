<script>
    let { 
        opened = false, 
        title = '', 
        onClose,
        children,
        footer
    } = $props();
    
    const handleBackdropClick = (e) => {
        // Do NOT close on backdrop click - user explicitly doesn't want this
        // Only close via header button or explicit onClose call
    };
</script>

{#if opened}
<div class="modal-backdrop">
    <div class="modal-content" role="dialog" aria-modal="true">
        <header class="modal-header">
            <h3>{title}</h3>
            <button class="close-btn" onclick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div class="modal-body">
            {@render children()}
        </div>
        {#if footer}
            <footer class="modal-footer">
                {@render footer()}
            </footer>
        {/if}
    </div>
</div>
{/if}

<style>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--color-bg, white);
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    width: 90%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

@media (min-width: 640px) {
    .modal-content {
        width: 95%;
        max-width: 900px;
    }
}

@media (min-width: 1024px) {
    .modal-content {
        width: 95%;
        max-width: 1100px;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border, #eee);
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    color: var(--color-text-secondary, #666);
}

.close-btn:hover {
    color: var(--color-text, #333);
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--color-border, #eee);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
</style>
