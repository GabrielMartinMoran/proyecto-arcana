import { asset } from '$app/paths';

export const loadAgentFile = async (path: string) => {
	const staticPath = `/${path}`.replaceAll('//', '/');
	const response = await fetch(asset(staticPath));
	return await response.text();
};
