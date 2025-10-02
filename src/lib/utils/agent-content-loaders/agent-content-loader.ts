import { resolve } from '$app/paths';

export const loadAgentFile = async (path: string) => {
	const response = await fetch(resolve(path));
	return await response.text();
};
