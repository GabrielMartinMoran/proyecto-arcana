export type DialogType = 'alert' | 'confirm' | 'prompt';

export interface DialogOptions {
	title?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	placeholder?: string;
	defaultValue?: string;
}

class DialogService {
	// State using runes
	isOpen = $state(false);
	message = $state('');
	type: DialogType = $state('alert');
	options: DialogOptions = $state({});
	inputValue = $state(''); // For prompt dialogs

	// Private promise resolvers
	private resolvePromise: ((value: any) => void) | null = null;

	constructor() {}

	/**
	 * Shows an alert dialog and waits for the user to dismiss it.
	 * @param message The message to display
	 * @param options Optional title and button label
	 */
	alert(message: string, options?: DialogOptions): Promise<void> {
		return new Promise((resolve) => {
			this.message = message;
			this.type = 'alert';
			this.options = options || {};
			this.isOpen = true;
			this.resolvePromise = () => resolve();
		});
	}

	/**
	 * Shows a confirm dialog and waits for the user to accept or cancel.
	 * @param message The question to ask
	 * @param options Optional title and button labels
	 * @returns Promise resolving to true (accepted) or false (cancelled)
	 */
	confirm(message: string, options?: DialogOptions): Promise<boolean> {
		return new Promise((resolve) => {
			this.message = message;
			this.type = 'confirm';
			this.options = options || {};
			this.isOpen = true;
			this.resolvePromise = resolve;
		});
	}

	/**
	 * Shows a prompt dialog asking the user for text input.
	 * @param message The message/question to display
	 * @param options Optional title, placeholder, default value, and button labels
	 * @returns Promise resolving to the input value (or null if cancelled)
	 */
	prompt(message: string, options?: DialogOptions): Promise<string | null> {
		return new Promise((resolve) => {
			this.message = message;
			this.type = 'prompt';
			this.options = options || {};
			this.inputValue = options?.defaultValue || '';
			this.isOpen = true;
			this.resolvePromise = resolve;
		});
	}

	/**
	 * Closes the dialog with a result
	 * @param result true for confirm/accept, false for cancel, or string for prompt
	 */
	close(result: boolean | string) {
		this.isOpen = false;
		if (this.resolvePromise) {
			// For prompt: return inputValue if confirmed, null if cancelled
			if (this.type === 'prompt') {
				this.resolvePromise(result === true ? this.inputValue : null);
			} else {
				this.resolvePromise(result);
			}
			this.resolvePromise = null;
		}
		// Reset input value
		this.inputValue = '';
	}
}

// Export a singleton instance
export const dialogService = new DialogService();
