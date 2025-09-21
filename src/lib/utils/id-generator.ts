import { sha1 } from 'js-sha1';

export const generateId = (seed: string) => {
	return sha1(seed);
};
