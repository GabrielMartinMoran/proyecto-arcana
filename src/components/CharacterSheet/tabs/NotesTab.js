const html = window.html || String.raw;

export function renderNotesTab(c) {
    return html`
        <div class="editor-grid one-col">
            <div class="panel">
                <label>Notas</label>
                <textarea id="notes" rows="12">${c.notes || ''}</textarea>
            </div>
        </div>
    `;
}



