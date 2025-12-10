import { v4 as uuidv4 } from 'uuid';

/**
 * Genera un UUID v4 usando la librería uuid.
 *
 * Esta librería funciona en todos los contextos (HTTPS, HTTP, iframes)
 * a diferencia de crypto.randomUUID() que requiere contexto seguro.
 *
 * Útil cuando GitHub Pages (HTTPS) se carga como iframe en FoundryVTT (HTTP).
 */
export function generateUUID(): string {
	return uuidv4();
}
