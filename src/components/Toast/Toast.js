const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * Toast component for showing temporary messages
 * @param {HTMLElement} container - Container element
 * @param {Object} props - Component props
 * @param {string} props.message - Message to display
 * @param {string} props.type - Type of toast (success, error, info, warning)
 * @param {number} props.duration - Duration in milliseconds (default: 3000)
 * @param {boolean} props.showDetails - Whether to show detailed breakdown
 * @param {Object} props.details - Details object for breakdown
 */
export default function Toast(container, props = {}) {
    let state = {
        message: props.message || '',
        type: props.type || 'info',
        duration: props.duration || 3000,
        showDetails: props.showDetails || false,
        details: props.details || null,
        characterName: props.characterName || null,
        visible: false,
        timeoutId: null
    };

    const render = () => {
        const typeClass = `toast-${state.type}`;
        console.log('Toast: Rendering with characterName:', state.characterName);
        const characterNameHtml = state.characterName ? html`
            <div class="toast-character-name">${state.characterName}</div>
        ` : '';
        
        const detailsHtml = state.showDetails && state.details ? html`
            <div class="toast-details">
                <div class="toast-breakdown">
                    ${state.details.breakdown || ''}
                </div>
                ${state.details.rolls ? html`
                    <div class="toast-rolls">
                        Dados: [${state.details.rolls.join(', ')}]
                    </div>
                ` : ''}
            </div>
        ` : '';

        return html`
            <div class="toast ${typeClass} ${state.visible ? 'toast-visible' : ''}" role="alert">
                <div class="toast-content">
                    ${characterNameHtml}
                    <div class="toast-message">${state.message}</div>
                    ${detailsHtml}
                </div>
                <button class="toast-close" aria-label="Cerrar">×</button>
            </div>
        `;
    };

    const show = () => {
        state.visible = true;
        container.innerHTML = render();
        
        // Auto-hide after duration
        startTimer();

        // Bind close button
        const closeBtn = container.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hide);
        }

        // Bind hover events
        const toastEl = container.querySelector('.toast');
        if (toastEl) {
            toastEl.addEventListener('mouseenter', pauseTimer);
            toastEl.addEventListener('mouseleave', resumeTimer);
        }
    };

    const startTimer = () => {
        if (state.timeoutId) clearTimeout(state.timeoutId);
        state.timeoutId = setTimeout(() => {
            hide();
        }, state.duration);
    };

    const pauseTimer = () => {
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
    };

    const resumeTimer = () => {
        if (!state.timeoutId) {
            // Use shorter duration after hover (2 seconds)
            const shortDuration = 2000;
            if (state.timeoutId) clearTimeout(state.timeoutId);
            state.timeoutId = setTimeout(() => {
                hide();
            }, shortDuration);
        }
    };

    const hide = () => {
        state.visible = false;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        container.innerHTML = '';
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        if (state.visible) {
            show();
        }
    };

    return {
        show,
        hide,
        setState
    };
}

/**
 * Toast manager for global toast notifications
 */
export class ToastManager {
    constructor() {
        this.container = null;
        this.currentToast = null;
    }

    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        
        // Load styles
        ensureStyle('./src/components/Toast/Toast.css');
    }

    show(message, options = {}) {
        this.init();
        
        // Hide current toast if exists
        if (this.currentToast) {
            this.currentToast.hide();
        }

        // Create new toast
        this.currentToast = Toast(this.container, {
            message,
            characterName: options.characterName,
            ...options
        });
        
        this.currentToast.show();
        return this.currentToast;
    }

    hide() {
        if (this.currentToast) {
            this.currentToast.hide();
            this.currentToast = null;
        }
    }
}

// Global toast manager instance
export const toastManager = new ToastManager();
