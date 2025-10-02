import { CONFIG } from '../../config';

export const isMobileScreen = () => {
	if (typeof window === 'undefined') {
		return false;
	}
	return window.innerWidth <= CONFIG.MOBILE_MAX_WIDTH;
};
