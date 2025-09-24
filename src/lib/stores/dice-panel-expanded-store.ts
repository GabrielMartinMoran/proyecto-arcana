import { isMobileScreen } from '$lib/utils/screen-size-detector';
import { writable } from 'svelte/store';

export const dicePanelExpandedStore = writable(!isMobileScreen());
