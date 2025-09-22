import { writable } from 'svelte/store';

type ScreenMode = 'mobile' | 'desktop';

export const screenModeStore = writable('mobile' as ScreenMode);
