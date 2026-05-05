/**
 * Unit tests for night-vision.ts helper
 * Tests mapping from night vision category strings to Foundry sight settings.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getNightVisionSightSettings,
	getNightVisionSightUpdate,
	NIGHT_VISION_LABELS,
	NightVisionCategory,
} from './night-vision';

describe('getNightVisionSightSettings', () => {
	describe('none (Ninguna)', () => {
		it('should return basic vision mode with range 0', () => {
			const settings = getNightVisionSightSettings('none');
			expect(settings.visionMode).toBe('basic');
			expect(settings.range).toBe(0);
		});
	});

	describe('immediate (Inmediata)', () => {
		it('should return darkvision with range 1', () => {
			const settings = getNightVisionSightSettings('immediate');
			expect(settings.visionMode).toBe('darkvision');
			expect(settings.range).toBe(1);
		});
	});

	describe('close (Cercana)', () => {
		it('should return darkvision with range 10', () => {
			const settings = getNightVisionSightSettings('close');
			expect(settings.visionMode).toBe('darkvision');
			expect(settings.range).toBe(10);
		});
	});

	describe('medium (Media)', () => {
		it('should return darkvision with range 50', () => {
			const settings = getNightVisionSightSettings('medium');
			expect(settings.visionMode).toBe('darkvision');
			expect(settings.range).toBe(50);
		});
	});

	describe('long (Larga)', () => {
		it('should return darkvision with range 100', () => {
			const settings = getNightVisionSightSettings('long');
			expect(settings.visionMode).toBe('darkvision');
			expect(settings.range).toBe(100);
		});
	});

	describe('unlimited (Ilimitada)', () => {
		it('should return darkvision with range null', () => {
			const settings = getNightVisionSightSettings('unlimited');
			expect(settings.visionMode).toBe('darkvision');
			expect(settings.range).toBeNull();
		});
	});

	describe('invalid category', () => {
		it('should default to basic vision mode with range 0 for unknown strings', () => {
			const settings = getNightVisionSightSettings('unknown' as NightVisionCategory);
			expect(settings.visionMode).toBe('basic');
			expect(settings.range).toBe(0);
		});
	});
});

describe('NIGHT_VISION_LABELS', () => {
	it('should contain all six categories in order', () => {
		const categories = Object.keys(NIGHT_VISION_LABELS) as NightVisionCategory[];
		expect(categories).toEqual(['none', 'immediate', 'close', 'medium', 'long', 'unlimited']);
	});

	it('should have Spanish labels', () => {
		expect(NIGHT_VISION_LABELS.none).toBe('Ninguna');
		expect(NIGHT_VISION_LABELS.immediate).toBe('Inmediata');
		expect(NIGHT_VISION_LABELS.close).toBe('Cercana');
		expect(NIGHT_VISION_LABELS.medium).toBe('Media');
		expect(NIGHT_VISION_LABELS.long).toBe('Larga');
		expect(NIGHT_VISION_LABELS.unlimited).toBe('Ilimitada');
	});
});

describe('getNightVisionSightUpdate', () => {
	const mockVisionModes: Record<string, any> = {
		darkvision: {
			vision: {
				defaults: {
					saturation: -1.0,
					brightness: 0.25,
					contrast: 0.25,
					attenuation: 0.1,
					color: '#9edcff',
				},
			},
		},
		basic: {
			vision: {
				defaults: {
					saturation: 0,
					brightness: 0,
					contrast: 0,
					attenuation: 0.5,
					color: null,
				},
			},
		},
	};

	beforeEach(() => {
		vi.stubGlobal('CONFIG', {
			Canvas: { visionModes: mockVisionModes },
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should return visionMode, range, and defaults for darkvision', () => {
		const update = getNightVisionSightUpdate('medium');
		expect(update['sight.visionMode']).toBe('darkvision');
		expect(update['sight.range']).toBe(50);
		expect(update['sight.saturation']).toBe(-1.0);
		expect(update['sight.brightness']).toBe(0.25);
		expect(update['sight.contrast']).toBe(0.25);
		expect(update['sight.attenuation']).toBe(0.1);
		expect(update['sight.color']).toBe('#9edcff');
	});

	it('should return visionMode, range, and defaults for basic (none)', () => {
		const update = getNightVisionSightUpdate('none');
		expect(update['sight.visionMode']).toBe('basic');
		expect(update['sight.range']).toBe(0);
		expect(update['sight.saturation']).toBe(0);
		expect(update['sight.brightness']).toBe(0);
		expect(update['sight.contrast']).toBe(0);
		expect(update['sight.attenuation']).toBe(0.5);
		expect(update['sight.color']).toBeNull();
	});

	it('should fall back to visionMode and range when vision mode has no defaults', () => {
		vi.stubGlobal('CONFIG', {
			Canvas: { visionModes: {} },
		});
		const update = getNightVisionSightUpdate('close');
		expect(update['sight.visionMode']).toBe('darkvision');
		expect(update['sight.range']).toBe(10);
		expect(update).not.toHaveProperty('sight.saturation');
		expect(update).not.toHaveProperty('sight.brightness');
	});

	it('should fall back to visionMode and range when CONFIG is undefined', () => {
		vi.stubGlobal('CONFIG', undefined);
		const update = getNightVisionSightUpdate('long');
		expect(update['sight.visionMode']).toBe('darkvision');
		expect(update['sight.range']).toBe(100);
		expect(update).not.toHaveProperty('sight.saturation');
	});

	it('should handle unlimited range with darkvision defaults', () => {
		const update = getNightVisionSightUpdate('unlimited');
		expect(update['sight.visionMode']).toBe('darkvision');
		expect(update['sight.range']).toBeNull();
		expect(update['sight.saturation']).toBe(-1.0);
	});
});
