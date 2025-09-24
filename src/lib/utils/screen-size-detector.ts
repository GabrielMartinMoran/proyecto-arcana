import { CONFIG } from '../../config';

export const isMobileScreen = () => window.innerWidth <= CONFIG.MOBILE_MAX_WIDTH;
