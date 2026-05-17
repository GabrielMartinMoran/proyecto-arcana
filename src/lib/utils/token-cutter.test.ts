import { describe, expect, it, vi } from 'vitest';
import { createCircularToken } from './token-cutter';

describe('createCircularToken', () => {
	it('should call drawImage with centered crop when no offsets provided', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 200;
				height = 100;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		const promise = createCircularToken('test.jpg', 256, 0, '#000000');
		await promise;

		expect(drawImageSpy).toHaveBeenCalled();
		const call = drawImageSpy.mock.calls[0];
		// sx should be centered: (200 - 100) / 2 = 50
		expect(call[1]).toBe(50);
		// sy should be centered: (100 - 100) / 2 = 0
		expect(call[2]).toBe(0);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('should shift sx right when offsetX is positive', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 200;
				height = 100;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		await createCircularToken('test.jpg', 256, 0, '#000000', 50, 0);

		const call = drawImageSpy.mock.calls[0];
		// marginX = 200 - 100 = 100
		// sx = max(0, min(100, 50 + (50/100)*100)) = max(0, min(100, 100)) = 100
		expect(call[1]).toBe(100);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('should shift sx left when offsetX is negative', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 200;
				height = 100;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		await createCircularToken('test.jpg', 256, 0, '#000000', -50, 0);

		const call = drawImageSpy.mock.calls[0];
		// marginX = 200 - 100 = 100
		// sx = max(0, min(100, 50 + (-50/100)*100)) = max(0, min(100, 0)) = 0
		expect(call[1]).toBe(0);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('should shift sy down to the bottom crop edge when offsetY is positive on portrait images', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 300;
				height = 400;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		await createCircularToken('test.jpg', 256, 0, '#000000', 0, 50);

		const call = drawImageSpy.mock.calls[0];
		// marginY = 400 - 300 = 100
		// sy = max(0, min(100, 50 + (50/100)*100)) = max(0, min(100, 100)) = 100
		expect(call[2]).toBe(100);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('should keep sy unchanged when offsetY is positive on landscape images', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 400;
				height = 300;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		await createCircularToken('test.jpg', 256, 0, '#000000', 0, 50);

		const call = drawImageSpy.mock.calls[0];
		// marginY = 300 - 300 = 0, so Y offset has no vertical crop room to affect.
		expect(call[2]).toBe(0);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('should clamp offsets to image bounds', async () => {
		const drawImageSpy = vi.fn();
		const toDataURLSpy = vi.fn().mockReturnValue('mock-base64');

		vi.stubGlobal(
			'Image',
			class MockImage {
				width = 200;
				height = 100;
				onload: (() => void) | null = null;
				onerror: ((err: any) => void) | null = null;
				crossOrigin = '';
				src = '';
				constructor() {
					setTimeout(() => this.onload?.(), 0);
				}
			},
		);

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				const canvas = originalCreateElement('canvas');
				canvas.getContext = vi.fn().mockReturnValue({
					beginPath: vi.fn(),
					arc: vi.fn(),
					closePath: vi.fn(),
					save: vi.fn(),
					clip: vi.fn(),
					drawImage: drawImageSpy,
					restore: vi.fn(),
					lineWidth: 0,
					strokeStyle: '',
					stroke: vi.fn(),
				});
				Object.defineProperty(canvas, 'toDataURL', { value: toDataURLSpy, configurable: true });
				return canvas;
			}
			return originalCreateElement(tagName);
		});

		// Extreme offset should be clamped
		await createCircularToken('test.jpg', 256, 0, '#000000', 100, -100);

		const call = drawImageSpy.mock.calls[0];
		// marginX = 100, marginY = 0
		// sx = max(0, min(100, 50 + 100)) = 100 (clamped)
		// sy = max(0, min(0, 0 + 0)) = 0 (clamped)
		expect(call[1]).toBe(100);
		expect(call[2]).toBe(0);

		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});
});
