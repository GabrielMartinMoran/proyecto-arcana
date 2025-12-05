/**
 * Descarga una imagen, la recorta en círculo, LE AGREGA BORDE y devuelve base64.
 * @param imageUrl - URL origen
 * @param size - Tamaño final (256px por defecto)
 * @param borderWidth - Grosor del borde (ej: 5, 10). Pon 0 para sin borde.
 * @param borderColor - Color del borde (hex, nombre o rgb).
 */
export async function createCircularToken(
	imageUrl: string,
	size: number = 256,
	borderWidth: number = 8, // Grosor por defecto
	borderColor: string = '#000000', // Color por defecto (Negro)
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.src = imageUrl;

		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');

				if (!ctx) {
					reject(new Error('No ctx'));
					return;
				}

				// --- 1. CONFIGURACIÓN DEL CÍRCULO ---
				const centerX = size / 2;
				const centerY = size / 2;
				// Calculamos el radio. Restamos la mitad del borde para que todo el borde quepa DENTRO del canvas.
				// Si no hacemos esto, la mitad del borde se cortaría.
				const radius = size / 2 - borderWidth / 2;

				// --- 2. RECORTAR (CLIPPING) ---
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.save(); // Guardamos el estado antes de recortar
				ctx.clip();

				// --- 3. DIBUJAR LA IMAGEN ---
				// Cálculos para centrar y llenar (object-fit: cover manual)
				const minDim = Math.min(img.width, img.height);
				const sx = (img.width - minDim) / 2;
				const sy = (img.height - minDim) / 2;

				ctx.drawImage(
					img,
					sx,
					sy,
					minDim,
					minDim, // Recorte origen
					0,
					0,
					size,
					size, // Destino (llenamos todo el canvas)
				);

				// Restauramos el contexto para salir del modo "recorte" y poder dibujar encima
				ctx.restore();

				// --- 4. DIBUJAR EL BORDE ---
				if (borderWidth > 0) {
					ctx.beginPath();
					// Usamos el mismo radio calculado antes
					ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
					ctx.lineWidth = borderWidth;
					ctx.strokeStyle = borderColor;
					ctx.stroke(); // <--- Aquí se pinta la línea negra
				}

				const dataUrl = canvas.toDataURL('image/webp', 0.85);
				resolve(dataUrl);
			} catch (err) {
				reject(err);
			}
		};

		img.onerror = (err) => {
			console.error('Error cargando imagen', err);
			resolve(imageUrl);
		};
	});
}
