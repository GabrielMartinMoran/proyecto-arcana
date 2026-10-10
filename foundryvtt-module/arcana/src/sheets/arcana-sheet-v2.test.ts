/**
 * Unit tests for arcana-sheet-v2.ts
 * Tests ActorSheetV2 migration behaviors
 */

// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Foundry V2 Application APIs before importing the sheet
const mockActorSheetV2 = class MockActorSheetV2 {
	actor: any;
	element: HTMLElement | null = null;
	window = { title: '' };
	position = { width: 950, height: 800 };
	constructor(options: any = {}) {
		this.actor = options.document || options.actor;
	}
	async _prepareContext(_options: any): Promise<Record<string, any>> {
		return {};
	}
	_getHeaderControls(): any[] {
		return [];
	}
	async render(_options?: any): Promise<any> {
		return this;
	}
	async close(_options?: any): Promise<any> {
		return this;
	}
	get title(): string {
		return `TYPES.Actor.character: ${this.actor?.name ?? ''}`;
	}
};

const mockHandlebarsMixin = (Base: any) => {
	return class extends Base {};
};

vi.stubGlobal('foundry', {
	applications: {
		sheets: { ActorSheetV2: mockActorSheetV2 },
		api: { HandlebarsApplicationMixin: mockHandlebarsMixin },
	},
});

const { ArcanaSheetV2 } = await import('./arcana-sheet-v2');

function renderTemplateFragment(): HTMLElement {
	const template = readFileSync(resolve(cwd(), 'template.html'), 'utf8');
	const fragment = document.createElement('div');
	fragment.innerHTML = template;
	return fragment;
}

function inlineStyle(element: Element | null): string {
	return element?.getAttribute('style')?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('ArcanaSheetV2', () => {
	let sheet: InstanceType<typeof ArcanaSheetV2>;
	let mockActor: any;

	beforeEach(() => {
		mockActor = {
			id: 'actor-123',
			uuid: 'Actor.abc123',
			name: 'Test Actor',
			system: {
				health: { value: 25, max: 50 },
			},
			getFlag: vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'localNotes') return 'Some notes';
				}
				return undefined;
			}),
		};

		vi.stubGlobal('ui', { actors: { render: vi.fn() } });

		sheet = new (ArcanaSheetV2 as any)({ document: mockActor });
	});

	describe('_prepareContext', () => {
		it('should include iframeUrl with mode=foundry and uuid', async () => {
			// WHEN preparing context
			const context = await (sheet as any)._prepareContext({});

			// THEN iframeUrl contains required params
			expect(context.iframeUrl).toContain('mode=foundry');
			expect(context.iframeUrl).toContain('uuid=Actor.abc123');
			expect(context.iframeUrl).toContain('startHp=25');
			expect(context.iframeUrl).toContain('startMax=50');
			expect(context.iframeUrl).toContain('startTemp=0');
		});

		it('FEAT temp-hp-damage-absorption — context health includes temporary HP and the iframe URL carries it', async () => {
			mockActor.system.health = { value: 25, max: 50, temp: 3 };

			const context = await (sheet as any)._prepareContext({});

			expect(context.health).toEqual({ value: 25, max: 50, temp: 3 });
			expect(context.iframeUrl).toContain('startTemp=3');
		});

		it('should set isBestiary false for character URLs', async () => {
			const context = await (sheet as any)._prepareContext({});
			expect(context.isBestiary).toBe(false);
		});

		it('should set isBestiary true for bestiary URLs', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana' && key === 'sheetUrl') {
					return 'https://app.arcana.com/bestiary/npc1';
				}
				return undefined;
			});
			const context = await (sheet as any)._prepareContext({});
			expect(context.isBestiary).toBe(true);
		});

		it('should include localNotes and health data for bestiary actors', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
					if (key === 'localNotes') return 'Some notes';
				}
				return undefined;
			});
			const context = await (sheet as any)._prepareContext({});
			expect(context.localNotes).toBe('Some notes');
			expect(context.health).toEqual({ value: 25, max: 50, temp: 0 });
		});

		it('should return null iframeUrl when no sheetUrl is configured', async () => {
			mockActor.getFlag = vi.fn(() => undefined);
			const context = await (sheet as any)._prepareContext({});
			expect(context.iframeUrl).toBeNull();
		});

		it('should include tokenOffsetX and tokenOffsetY in iframeUrl when flags are set', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'tokenOffsetX') return -30;
					if (key === 'tokenOffsetY') return 20;
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('tokenOffsetX=-30');
			expect(context.iframeUrl).toContain('tokenOffsetY=20');
		});

		it('should include default token offset params when flags are missing', async () => {
			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('tokenOffsetX=0');
			expect(context.iframeUrl).toContain('tokenOffsetY=0');
		});

		it('should include the configured token border color in iframeUrl', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'tokenBorderColor') return 'green';
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('borderColor=%2327a241');
		});

		it('should resolve a legacy silver stored color to the gray hex in iframeUrl', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'tokenBorderColor') return 'silver';
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('borderColor=%239aa0a6');
		});

		it('should include the black default border color for character URLs without a flag', async () => {
			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('borderColor=%23000000');
		});

		it('should include the red default border color for bestiary URLs without a flag', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana' && key === 'sheetUrl') {
					return 'https://app.arcana.com/bestiary/npc1';
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('borderColor=%23990000');
		});

		it('should fall back to the type default when the stored border color is invalid', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'tokenBorderColor') return 'magenta';
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('borderColor=%23000000');
		});

		it('FEAT foundry-health-precedence — token actor startup iframe URL uses synthetic token actor HP', async () => {
			mockActor.uuid = 'Scene.scene-1.Token.token-1';
			mockActor.isToken = true;
			mockActor.system.health = { value: 3, max: 9 };

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('uuid=Scene.scene-1.Token.token-1');
			expect(context.iframeUrl).toContain('startHp=3');
			expect(context.iframeUrl).toContain('startMax=9');
			expect(context.health).toEqual({ value: 3, max: 9, temp: 0 });
		});

		it('FEAT npc-ability-controls-grouped-on-bestiary-sheet — prepares grouped NPC ability controls for bestiary actors', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
						{
							id: 'npc:reactions:parada:1',
							name: 'Parada',
							source: 'reactions',
							type: 'USES',
							max: 2,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') {
					return {
						'npc:actions:aliento:1': { current: 1, max: 1 },
						'npc:reactions:parada:1': { current: 2, max: 2 },
					};
				}
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.hasNpcAbilityUsage).toBe(true);
			expect(context.npcAbilityGroups.map((group: any) => group.label)).toEqual([
				'Acciones',
				'Reacciones',
			]);
		});

		it('FEAT npc-ability-usage-state-ownership — unlinked token sheet reads token-local counters', async () => {
			const tokenDocument = {
				actorLink: false,
				getFlag: vi.fn((scope: string, key: string) => {
					if (scope === 'arcana' && key === 'npcAbilityUsage') {
						return { 'npc:actions:aliento:1': { current: 0, max: 1 } };
					}
					return undefined;
				}),
				setFlag: vi.fn(),
			};
			mockActor.isToken = true;
			mockActor.token = tokenDocument;
			mockActor.prototypeToken = { actorLink: false };
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:aliento:1': { current: 1, max: 1 } };
				return undefined;
			});

			const context = await (sheet as any)._prepareContext({});

			expect(context.npcAbilityGroups[0].abilities[0].current).toBe(0);
		});
	});

	describe('_onRender', () => {
		it('FEAT npc-ability-controls-compact-layout — initial template uses compact inline flex classes and Usar action', () => {
			const template = readFileSync(resolve(cwd(), 'template.html'), 'utf8');

			expect(template).toContain('class="npc-ability-usage-section npc-ability-usage-compact"');
			expect(template).toContain('class="npc-ability-group npc-ability-group-compact"');
			expect(template).toContain('class="npc-ability-row npc-ability-row-compact"');
			expect(template).toContain('class="npc-ability-name"');
			expect(template).toContain('class="npc-ability-controls-inline"');
			expect(template).toContain('data-npc-ability-action="use"');
			expect(template).toContain('Usar');
			expect(template).not.toContain('data-npc-ability-action="decrement"');
		});

		it('FEAT npc-ability-controls-compact-layout — initial template groups wrap as flex columns with min-width fallback', () => {
			const fragment = renderTemplateFragment();
			const sectionStyle = inlineStyle(fragment.querySelector('.npc-ability-usage-section'));
			const groupStyle = inlineStyle(fragment.querySelector('.npc-ability-group'));

			expect(sectionStyle).toContain('display: flex');
			expect(sectionStyle).toContain('flex-wrap: wrap');
			expect(sectionStyle).toContain('align-items: flex-start');
			expect(sectionStyle).toContain('gap: 8px');
			expect(sectionStyle).not.toContain('display: grid');
			expect(groupStyle).toContain('flex: 1 1 calc((100% - 16px) / 3)');
			expect(groupStyle).toContain('min-width: 220px');
			expect(groupStyle).toContain('box-sizing: border-box');
			expect(groupStyle).toContain('display: flex');
			expect(groupStyle).toContain('flex-direction: column');
		});

		it('FEAT npc-ability-controls-compact-layout — initial template counter display uses current input and max suffix', () => {
			const fragment = renderTemplateFragment();
			const currentInput = fragment.querySelector<HTMLInputElement>(
				'[data-npc-ability-control="current"]',
			);
			const display = fragment.querySelector('[data-ability-display]');

			expect(currentInput?.getAttribute('value')).toBe('{{current}}');
			expect(display?.textContent).toBe('/{{max}}');
			expect(display?.textContent).not.toBe('{{current}}/{{max}}');
		});

		it('FEAT temp-hp-damage-absorption — template exposes a temporary HP input for the bestiary bar', () => {
			const fragment = renderTemplateFragment();
			const tempInput = fragment.querySelector<HTMLInputElement>(
				'input[name="system.health.temp"]',
			);

			expect(tempInput).not.toBeNull();
			expect(tempInput?.getAttribute('value')).toBe('{{health.temp}}');
			expect(tempInput?.getAttribute('min')).toBe('0');
			expect(tempInput?.getAttribute('type')).toBe('number');
			expect(tempInput?.parentElement?.textContent).toContain('🖤');
		});

		it('should preserve existing iframe when not forceReload', () => {
			// GIVEN an already rendered element with an iframe
			const existingIframe = document.createElement('iframe');
			existingIframe.src = 'https://old-url.com';
			const container = document.createElement('div');
			container.appendChild(existingIframe);
			(sheet as any).element = container;

			// WHEN rendering without forceReload
			(sheet as any)._onRender({}, {});

			// THEN the existing iframe is preserved
			expect(container.querySelector('iframe')).toBe(existingIframe);
			expect(existingIframe.src).toBe('https://old-url.com/');
		});

		it('should replace iframe when forceReload is true', () => {
			// GIVEN an already rendered element with a new iframe and a stored old iframe
			const oldIframe = document.createElement('iframe');
			oldIframe.src = 'https://old-url.com';
			const newIframe = document.createElement('iframe');
			newIframe.src = 'https://new-url.com';
			const container = document.createElement('div');
			container.appendChild(newIframe);
			(sheet as any).element = container;
			(sheet as any)._existingIframe = oldIframe;

			// WHEN rendering with forceReload
			(sheet as any)._onRender({}, { forceReload: true });

			// THEN the new iframe from the template remains
			expect(container.querySelector('iframe')).toBe(newIframe);
		});

		it('should not remove template iframe when forceReload=true and no previous iframe exists', () => {
			// GIVEN a container with a newly rendered iframe and no previous iframe
			const newIframe = document.createElement('iframe');
			newIframe.src = 'https://new-url.com';
			const container = document.createElement('div');
			container.appendChild(newIframe);
			(sheet as any).element = container;
			(sheet as any)._existingIframe = null;

			// WHEN rendering with forceReload
			(sheet as any)._onRender({}, { forceReload: true });

			// THEN the template iframe is preserved
			expect(container.querySelector('iframe')).toBe(newIframe);
		});

		it('should attach change listeners to bestiary inputs using { render: false } and update sidebar', async () => {
			// GIVEN a rendered element with inputs
			const input = document.createElement('input');
			input.name = 'system.health.value';
			const container = document.createElement('div');
			container.appendChild(input);
			(sheet as any).element = container;

			mockActor.update = vi.fn().mockResolvedValue(undefined);

			// WHEN rendering
			(sheet as any)._onRender({}, {});

			// AND triggering change on the input
			input.value = '30';
			input.dispatchEvent(new Event('change'));

			// Wait for the async handler
			await new Promise((r) => setTimeout(r, 0));

			// THEN actor.update is called with the field and render: false
			expect(mockActor.update).toHaveBeenCalledWith(
				{ 'system.health.value': '30' },
				{ render: false },
			);
			expect(ui.actors.render).toHaveBeenCalledWith();
		});

		it('FEAT manual-npc-ability-use-tracking — generic input listener ignores NPC ability controls', async () => {
			const input = document.createElement('input');
			input.dataset.npcAbilityControl = 'current';
			input.value = '0';
			const container = document.createElement('div');
			container.appendChild(input);
			(sheet as any).element = container;
			mockActor.update = vi.fn().mockResolvedValue(undefined);

			(sheet as any)._onRender({}, {});
			input.dispatchEvent(new Event('change'));
			await new Promise((r) => setTimeout(r, 0));

			expect(mockActor.update).not.toHaveBeenCalled();
		});

		it('FEAT temp-hp-damage-absorption — temporary HP input persists a numeric value with min 0', async () => {
			const input = document.createElement('input');
			input.name = 'system.health.temp';
			input.value = '4';
			const container = document.createElement('div');
			container.appendChild(input);
			(sheet as any).element = container;
			mockActor.update = vi.fn().mockResolvedValue(undefined);

			(sheet as any)._onRender({}, {});
			input.dispatchEvent(new Event('change'));
			await new Promise((r) => setTimeout(r, 0));

			expect(mockActor.update).toHaveBeenCalledWith({ 'system.health.temp': 4 }, { render: false });
		});

		it('FEAT temp-hp-damage-absorption — temporary HP input clamps negative and invalid values at 0', async () => {
			const input = document.createElement('input');
			input.name = 'system.health.temp';
			const container = document.createElement('div');
			container.appendChild(input);
			(sheet as any).element = container;
			mockActor.update = vi.fn().mockResolvedValue(undefined);

			(sheet as any)._onRender({}, {});

			input.value = '-3';
			input.dispatchEvent(new Event('change'));
			await new Promise((r) => setTimeout(r, 0));

			input.value = 'not-a-number';
			input.dispatchEvent(new Event('change'));
			await new Promise((r) => setTimeout(r, 0));

			expect(mockActor.update).toHaveBeenNthCalledWith(
				1,
				{ 'system.health.temp': 0 },
				{ render: false },
			);
			expect(mockActor.update).toHaveBeenNthCalledWith(
				2,
				{ 'system.health.temp': 0 },
				{ render: false },
			);
		});

		it('FEAT npc-ability-controls-update-without-iframe-reload — ability controls refresh after Usar without replacing the iframe', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:golpe:1',
							name: 'Golpe',
							source: 'actions',
							type: 'USES',
							max: 3,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:golpe:1': { current: 1, max: 3 } };
				return undefined;
			});
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			const useButton = document.createElement('button');
			useButton.dataset.npcAbilityAction = 'use';
			useButton.dataset.abilityId = 'npc:actions:golpe:1';
			const display = document.createElement('span');
			display.dataset.abilityDisplay = 'npc:actions:golpe:1';
			display.textContent = '/3';
			const existingIframe = document.createElement('iframe');
			const container = document.createElement('div');
			container.append(useButton, display, existingIframe);
			(sheet as any).element = container;

			(sheet as any)._onRender({}, {});
			useButton.click();
			await new Promise((r) => setTimeout(r, 0));

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'npcAbilityUsage', {
				'npc:actions:golpe:1': { current: 0, max: 3 },
			});
			expect(display.textContent).toBe('/3');
			expect(container.querySelector('iframe')).toBe(existingIframe);
		});

		it('FEAT manual-npc-ability-use-tracking — Usar spends one use and clamps at zero', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:golpe:1',
							name: 'Golpe',
							source: 'actions',
							type: 'USES',
							max: 3,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:golpe:1': { current: 0, max: 3 } };
				return undefined;
			});
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			const useButton = document.createElement('button');
			useButton.dataset.npcAbilityAction = 'use';
			useButton.dataset.abilityId = 'npc:actions:golpe:1';
			const display = document.createElement('span');
			display.dataset.abilityDisplay = 'npc:actions:golpe:1';
			display.textContent = '/3';
			const container = document.createElement('div');
			container.append(useButton, display);
			(sheet as any).element = container;

			(sheet as any)._onRender({}, {});
			useButton.click();
			await new Promise((r) => setTimeout(r, 0));

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'npcAbilityUsage', {
				'npc:actions:golpe:1': { current: 0, max: 3 },
			});
			expect(display.textContent).toBe('/3');
		});

		it('should abort previous drag pointer event listeners before registering new ones', () => {
			const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

			// GIVEN an application container with iframe
			const appDiv = document.createElement('div');
			appDiv.className = 'application';
			const container = document.createElement('div');
			const iframe = document.createElement('iframe');
			appDiv.appendChild(container);
			container.appendChild(iframe);
			(sheet as any).element = container;

			// WHEN rendering twice
			(sheet as any)._onRender({}, {});
			expect(abortSpy).not.toHaveBeenCalled();

			(sheet as any)._onRender({}, {});
			expect(abortSpy).toHaveBeenCalledOnce();

			abortSpy.mockRestore();
		});
	});

	describe('render', () => {
		it('FEAT foundry-health-precedence — cached iframe receives current Foundry health without force reload', async () => {
			mockActor.system.health = { value: 25, max: 50, temp: 3 };
			const postMessage = vi.fn();
			const existingIframe = document.createElement('iframe');
			Object.defineProperty(existingIframe, 'contentWindow', {
				value: { postMessage },
			});
			const container = document.createElement('div');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			container.appendChild(existingIframe);
			container.appendChild(titleEl);
			(sheet as any).element = container;

			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			await sheet.render({});

			expect(superRender).not.toHaveBeenCalled();
			expect(postMessage).toHaveBeenCalledWith(
				{
					type: 'FOUNDRY_HEALTH_UPDATE',
					payload: { hp: { value: 25, max: 50, temp: 3 } },
				},
				'*',
			);

			superRender.mockRestore();
		});

		it('should abort super.render when existing iframe and no forceReload', async () => {
			// GIVEN an element with an existing iframe and window title
			const existingIframe = document.createElement('iframe');
			const container = document.createElement('div');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			container.appendChild(existingIframe);
			container.appendChild(titleEl);
			(sheet as any).element = container;

			// Spy on base class render
			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			// WHEN calling render without forceReload
			const result = await sheet.render({});

			// THEN super.render is NOT called and title is updated
			expect(superRender).not.toHaveBeenCalled();
			expect(result).toBe(sheet);
			expect(titleEl.textContent).toBe(mockActor.name);

			superRender.mockRestore();
		});

		it('FEAT temp-hp-damage-absorption — cached render refreshes bestiary health inputs after native damage', async () => {
			const valueInput = document.createElement('input');
			valueInput.name = 'system.health.value';
			valueInput.value = '10';
			const maxInput = document.createElement('input');
			maxInput.name = 'system.health.max';
			maxInput.value = '12';
			const tempInput = document.createElement('input');
			tempInput.name = 'system.health.temp';
			tempInput.value = '4';
			const existingIframe = document.createElement('iframe');
			const container = document.createElement('div');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			container.append(valueInput, maxInput, tempInput, existingIframe, titleEl);
			(sheet as any).element = container;

			mockActor.system.health = { value: 7, max: 12, temp: 1 };

			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			await sheet.render({});

			expect(superRender).not.toHaveBeenCalled();
			expect(valueInput.value).toBe('7');
			expect(maxInput.value).toBe('12');
			expect(tempInput.value).toBe('1');

			superRender.mockRestore();
		});

		it('should call super.render when forceReload is true even with existing iframe', async () => {
			// GIVEN an element with an existing iframe
			const existingIframe = document.createElement('iframe');
			const container = document.createElement('div');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			container.appendChild(existingIframe);
			container.appendChild(titleEl);
			(sheet as any).element = container;

			// Spy on base class render
			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			// WHEN calling render with forceReload
			await sheet.render({ forceReload: true });

			// THEN super.render IS called
			expect(superRender).toHaveBeenCalled();

			superRender.mockRestore();
		});

		it('FEAT npc-ability-controls-update-without-iframe-reload — synchronized metadata appears without losing iframe state', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:aliento:1': { current: 0, max: 1 } };
				return undefined;
			});
			const existingIframe = document.createElement('iframe');
			const controls = document.createElement('div');
			controls.className = 'bestiary-controls';
			const container = document.createElement('div');
			container.append(controls, existingIframe);
			(sheet as any).element = container;

			await sheet.render({});

			expect(container.querySelector('iframe')).toBe(existingIframe);
			expect(container.querySelector('.npc-ability-usage-section')?.textContent).toContain(
				'Aliento',
			);
		});

		it('FEAT npc-ability-controls-compact-layout — dynamic refresh uses the initial template compact layout contract', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:aliento:1': { current: 0, max: 1 } };
				return undefined;
			});
			const existingIframe = document.createElement('iframe');
			const controls = document.createElement('div');
			controls.className = 'bestiary-controls';
			const container = document.createElement('div');
			container.append(controls, existingIframe);
			(sheet as any).element = container;

			await sheet.render({});

			const section = container.querySelector('.npc-ability-usage-section');
			const group = container.querySelector('.npc-ability-group');
			const row = container.querySelector('.npc-ability-row');
			expect(section?.classList.contains('npc-ability-usage-compact')).toBe(true);
			expect(group?.classList.contains('npc-ability-group-compact')).toBe(true);
			expect(row?.classList.contains('npc-ability-row-compact')).toBe(true);
			expect(row?.querySelector('.npc-ability-name')?.textContent).toBe('Aliento');
			expect(row?.querySelector('.npc-ability-controls-inline')).toBeTruthy();
			expect(row?.querySelector('[data-npc-ability-action="use"]')?.textContent).toContain('Usar');
			expect(row?.querySelector('[data-npc-ability-action="decrement"]')).toBeNull();
		});

		it('FEAT npc-ability-controls-compact-layout — dynamic refresh preserves wrapping group-column layout and iframe', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:golpe:1',
							name: 'Golpe',
							source: 'actions',
							type: 'USES',
							max: 3,
							order: 0,
						},
						{
							id: 'npc:interactions:mirada:1',
							name: 'Mirada',
							source: 'interactions',
							type: 'USES',
							max: 2,
							order: 0,
						},
						{
							id: 'npc:reactions:parada:1',
							name: 'Parada',
							source: 'reactions',
							type: 'USES',
							max: 1,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') {
					return {
						'npc:actions:golpe:1': { current: 1, max: 3 },
						'npc:interactions:mirada:1': { current: 2, max: 2 },
						'npc:reactions:parada:1': { current: 1, max: 1 },
					};
				}
				return undefined;
			});
			const existingIframe = document.createElement('iframe');
			const controls = document.createElement('div');
			controls.className = 'bestiary-controls';
			const container = document.createElement('div');
			container.append(controls, existingIframe);
			(sheet as any).element = container;

			await sheet.render({});

			const sectionStyle = inlineStyle(container.querySelector('.npc-ability-usage-section'));
			const groups = Array.from(container.querySelectorAll('.npc-ability-group'));
			expect(sectionStyle).toContain('display: flex');
			expect(sectionStyle).toContain('flex-wrap: wrap');
			expect(sectionStyle).toContain('align-items: flex-start');
			expect(sectionStyle).toContain('gap: 8px');
			expect(groups).toHaveLength(3);
			for (const group of groups) {
				expect(inlineStyle(group)).toContain('flex: 1 1 calc((100% - 16px) / 3)');
				expect(inlineStyle(group)).toContain('min-width: 220px');
				expect(inlineStyle(group)).toContain('box-sizing: border-box');
				expect(inlineStyle(group)).toContain('flex-direction: column');
			}
			expect(container.querySelector('iframe')).toBe(existingIframe);
		});

		it('FEAT npc-ability-controls-compact-layout — dynamic refresh counter display uses current input and max suffix', async () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/npc1';
				if (key === 'npcAbilityDefinitions') {
					return [
						{
							id: 'npc:actions:golpe:1',
							name: 'Golpe',
							source: 'actions',
							type: 'USES',
							max: 3,
							order: 0,
						},
					];
				}
				if (key === 'npcAbilityUsage') return { 'npc:actions:golpe:1': { current: 1, max: 3 } };
				return undefined;
			});
			const existingIframe = document.createElement('iframe');
			const controls = document.createElement('div');
			controls.className = 'bestiary-controls';
			const container = document.createElement('div');
			container.append(controls, existingIframe);
			(sheet as any).element = container;

			await sheet.render({});

			const currentInput = container.querySelector<HTMLInputElement>(
				'[data-npc-ability-control="current"][data-ability-id="npc:actions:golpe:1"]',
			);
			const display = container.querySelector('[data-ability-display="npc:actions:golpe:1"]');
			expect(currentInput?.value).toBe('1');
			expect(display?.textContent).toBe('/3');
			expect(display?.textContent).not.toBe('1/3');
		});
	});

	describe('detach support', () => {
		function createRenderedElement(): {
			container: HTMLElement;
			iframe: HTMLIFrameElement;
			titleEl: HTMLElement;
		} {
			const iframe = document.createElement('iframe');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			const container = document.createElement('div');
			container.append(iframe, titleEl);
			(sheet as any).element = container;
			return { container, iframe, titleEl };
		}

		function spyOnBaseRender() {
			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			return vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);
		}

		function createDetachedElement(): { detachedDocument: Document; container: HTMLElement } {
			const detachedDocument = document.implementation.createHTMLDocument('detached');
			const container = detachedDocument.createElement('div');
			detachedDocument.body.append(container);
			(sheet as any).element = container;
			return { detachedDocument, container };
		}

		it('FEAT foundry-sheet-detach — detaching calls super.render with the detached window option and preserves the iframe', async () => {
			const { container, iframe } = createRenderedElement();
			const superRender = spyOnBaseRender();

			await sheet.render({ window: { detached: true } });

			expect(superRender).toHaveBeenCalledWith(
				expect.objectContaining({ window: { detached: true } }),
			);
			expect(container.querySelector('iframe')).toBe(iframe);

			superRender.mockRestore();
		});

		it('FEAT foundry-sheet-detach — re-attaching calls super.render with detached false and preserves the iframe', async () => {
			const { container, iframe } = createRenderedElement();
			const superRender = spyOnBaseRender();

			await sheet.render({ window: { detached: false } });

			expect(superRender).toHaveBeenCalledWith(
				expect.objectContaining({ window: { detached: false } }),
			);
			expect(container.querySelector('iframe')).toBe(iframe);

			superRender.mockRestore();
		});

		it('FEAT foundry-sheet-detach — _onDetach re-attaches drag pointer events on the detached window', () => {
			const detachedDocument = document.implementation.createHTMLDocument('detached');
			const mouseUpCallbacks: Array<() => void> = [];
			const detachedWindow = {
				addEventListener: vi.fn((type: string, callback: () => void) => {
					if (type === 'mouseup') mouseUpCallbacks.push(callback);
				}),
			};
			Object.defineProperty(detachedDocument, 'defaultView', {
				configurable: true,
				value: detachedWindow,
			});

			const appDiv = detachedDocument.createElement('div');
			appDiv.className = 'application';
			const container = detachedDocument.createElement('div');
			const iframe = detachedDocument.createElement('iframe');
			container.appendChild(iframe);
			appDiv.appendChild(container);
			detachedDocument.body.appendChild(appDiv);
			(sheet as any).element = container;

			const mainWindowAddSpy = vi.spyOn(window, 'addEventListener');

			(sheet as any)._onDetach(document, detachedDocument);

			expect(detachedWindow.addEventListener).toHaveBeenCalledWith(
				'mouseup',
				expect.any(Function),
				expect.anything(),
			);

			const header = detachedDocument.createElement('div');
			header.className = 'window-header';
			appDiv.appendChild(header);
			header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			expect(iframe.style.pointerEvents).toBe('none');

			mouseUpCallbacks.forEach((callback) => callback());
			expect(iframe.style.pointerEvents).toBe('auto');
			expect(mainWindowAddSpy).not.toHaveBeenCalledWith(
				'mouseup',
				expect.any(Function),
				expect.anything(),
			);

			mainWindowAddSpy.mockRestore();
		});

		it('FEAT foundry-sheet-detach — _onDetach keeps the title and re-posts health to the preserved iframe', () => {
			const postMessage = vi.fn();
			const iframe = document.createElement('iframe');
			Object.defineProperty(iframe, 'contentWindow', { value: { postMessage } });
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			titleEl.textContent = 'stale title';
			const container = document.createElement('div');
			container.append(iframe, titleEl);
			(sheet as any).element = container;
			mockActor.system.health = { value: 25, max: 50, temp: 3 };

			(sheet as any)._onDetach(document, document);

			expect(titleEl.textContent).toBe(mockActor.name);
			expect(postMessage).toHaveBeenCalledWith(
				{
					type: 'FOUNDRY_HEALTH_UPDATE',
					payload: { hp: { value: 25, max: 50, temp: 3 } },
				},
				'*',
			);
		});

		it('FEAT foundry-sheet-detach — _onAttach re-wires drag pointer events to the main window without leaking listeners', () => {
			const appDiv = document.createElement('div');
			appDiv.className = 'application';
			const container = document.createElement('div');
			const iframe = document.createElement('iframe');
			container.appendChild(iframe);
			appDiv.appendChild(container);
			(sheet as any).element = container;

			(sheet as any)._onDetach(document, document);

			const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
			(sheet as any)._onAttach(document, document);

			expect(abortSpy).toHaveBeenCalledTimes(1);

			const header = document.createElement('div');
			header.className = 'window-header';
			appDiv.appendChild(header);
			header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			expect(iframe.style.pointerEvents).toBe('none');

			window.dispatchEvent(new MouseEvent('mouseup'));
			expect(iframe.style.pointerEvents).toBe('auto');

			abortSpy.mockRestore();
		});

		it('FEAT foundry-sheet-detach — _onDetach exposes the actor name as the detached document title', () => {
			const { detachedDocument } = createDetachedElement();

			(sheet as any)._onDetach(document, detachedDocument);

			expect(detachedDocument.title).toBe(mockActor.name);
		});

		it('FEAT foundry-sheet-detach — _onDetach adds a floating re-attach button owned by the detached document', () => {
			const { detachedDocument, container } = createDetachedElement();
			const attachWindow = vi.fn();
			(sheet as any).attachWindow = attachWindow;

			(sheet as any)._onDetach(document, detachedDocument);

			const button = container.querySelector<HTMLButtonElement>('button.arcana-detach-return');
			expect(button).not.toBeNull();
			expect(button?.ownerDocument).toBe(detachedDocument);
			expect(button?.getAttribute('type')).toBe('button');
			expect(button?.getAttribute('aria-label')).toBe('Volver a Foundry');
			expect(button?.querySelector('i.fas.fa-thumbtack')).not.toBeNull();

			button?.click();

			expect(attachWindow).toHaveBeenCalledTimes(1);
		});

		it('FEAT foundry-sheet-detach — the re-attach button click is safe when attachWindow is unavailable', () => {
			const { detachedDocument, container } = createDetachedElement();

			(sheet as any)._onDetach(document, detachedDocument);

			const button = container.querySelector<HTMLButtonElement>('button.arcana-detach-return');
			expect(() => button?.click()).not.toThrow();
		});

		it('FEAT foundry-sheet-detach — _onAttach removes the floating re-attach button', () => {
			const { detachedDocument, container } = createDetachedElement();

			(sheet as any)._onDetach(document, detachedDocument);
			expect(container.querySelector('.arcana-detach-return')).not.toBeNull();

			(sheet as any)._onAttach(detachedDocument, document);

			expect(container.querySelector('.arcana-detach-return')).toBeNull();
		});
	});

	describe('close', () => {
		it('should reset position to default size', async () => {
			const sheetInstance = new (ArcanaSheetV2 as any)({ document: mockActor });
			(sheetInstance as any).position = { width: 500, height: 400 };
			await (sheetInstance as any).close();
			expect((sheetInstance as any).position).toEqual({ width: 950, height: 800 });
		});
	});

	describe('title', () => {
		it('should return the actor name instead of the raw localization key', () => {
			expect(sheet.title).toBe(mockActor.name);
		});
	});

	describe('DEFAULT_OPTIONS.actions', () => {
		it('should have configureSheet action', () => {
			expect((ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet).toBeDefined();
			expect(typeof (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet).toBe('function');
		});

		it('should accept event and target parameters (V2 signature)', () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			expect(handler.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('_getHeaderControls', () => {
		it('should include configureSheet control with OWNER ownership', () => {
			const controls = (sheet as any)._getHeaderControls();
			const configControl = controls.find((c: any) => c.action === 'configureSheet');
			expect(configControl).toBeDefined();
			expect(configControl.icon).toBe('fas fa-cogs');
			expect(configControl.label).toBe('Configuración');
			expect(configControl.ownership).toBe('OWNER');
		});
	});

	describe('DEFAULT_OPTIONS', () => {
		it('should define correct tag', () => {
			expect((ArcanaSheetV2 as any).DEFAULT_OPTIONS.tag).toBe('form');
		});

		it('should include arcana and sheet classes', () => {
			expect((ArcanaSheetV2 as any).DEFAULT_OPTIONS.classes).toContain('arcana');
			expect((ArcanaSheetV2 as any).DEFAULT_OPTIONS.classes).toContain('sheet');
		});

		it('should have resizable window', () => {
			expect((ArcanaSheetV2 as any).DEFAULT_OPTIONS.window.resizable).toBe(true);
		});
	});

	describe('PARTS', () => {
		it('should point to systems/arcana/template.html', () => {
			expect((ArcanaSheetV2 as any).PARTS.form.template).toBe('systems/arcana/template.html');
		});
	});

	describe('#configureSheet night vision', () => {
		let dialogConstructorArgs: any;

		beforeEach(() => {
			mockActor.system.nightVision = 'none';
			mockActor.prototypeToken = { actorLink: false };
			mockActor.update = vi.fn().mockResolvedValue(undefined);
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			mockActor.getActiveTokens = vi.fn().mockReturnValue([]);

			vi.stubGlobal('CONFIG', {
				Canvas: {
					visionModes: {
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
					},
				},
			});

			vi.stubGlobal(
				'Dialog',
				class MockDialog {
					constructor(args: any) {
						dialogConstructorArgs = args;
					}
					render(_state: boolean) {}
				},
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should include night vision selector in dialog content', () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			expect(dialogConstructorArgs.content).toContain('name="nightVision"');
			expect(dialogConstructorArgs.content).toContain('value="none"');
			expect(dialogConstructorArgs.content).toContain('Inmediata');
			expect(dialogConstructorArgs.content).toContain('Ilimitada');
		});

		it('should preselect current night vision value', () => {
			mockActor.system.nightVision = 'medium';
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			expect(dialogConstructorArgs.content).toContain('value="medium" selected');
		});

		it('should update actor system.nightVision and prototype token sight on save', async () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			// Simulate dialog callback with HTML containing selected night vision
			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => 'https://example.com' };
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'long' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.nightVision': 'long',
					'prototypeToken.sight.visionMode': 'darkvision',
					'prototypeToken.sight.range': 100,
					'prototypeToken.sight.saturation': -1.0,
					'prototypeToken.sight.brightness': 0.25,
					'prototypeToken.sight.contrast': 0.25,
					'prototypeToken.sight.attenuation': 0.1,
					'prototypeToken.sight.color': '#9edcff',
				}),
			);
		});

		it('should update active tokens with night vision sight settings', async () => {
			const mockTokenDoc = { update: vi.fn().mockResolvedValue(undefined) };
			mockActor.getActiveTokens = vi.fn().mockReturnValue([{ document: mockTokenDoc }]);

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => '' };
					if (selector === "input[name='actorLink']") return { is: (): boolean => true };
					if (selector === "select[name='nightVision']") return { val: (): string => 'close' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			expect(mockTokenDoc.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'sight.visionMode': 'darkvision',
					'sight.range': 10,
					'sight.saturation': -1.0,
					'sight.brightness': 0.25,
					'sight.contrast': 0.25,
					'sight.attenuation': 0.1,
					'sight.color': '#9edcff',
				}),
			);
		});

		it('should set basic vision mode when night vision is none', async () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => '' };
					if (selector === "input[name='actorLink']") return { is: (): boolean => true };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.nightVision': 'none',
					'prototypeToken.sight.visionMode': 'basic',
					'prototypeToken.sight.range': 0,
					'prototypeToken.sight.saturation': 0,
					'prototypeToken.sight.brightness': 0,
					'prototypeToken.sight.contrast': 0,
					'prototypeToken.sight.attenuation': 0.5,
					'prototypeToken.sight.color': null,
				}),
			);
		});
	});

	describe('#configureSheet token offset sliders', () => {
		let dialogConstructorArgs: any;

		beforeEach(() => {
			mockActor.system.nightVision = 'none';
			mockActor.prototypeToken = { actorLink: false };
			mockActor.update = vi.fn().mockResolvedValue(undefined);
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			mockActor.getActiveTokens = vi.fn().mockReturnValue([]);

			vi.stubGlobal('CONFIG', {
				Canvas: {
					visionModes: {
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
					},
				},
			});

			vi.stubGlobal(
				'Dialog',
				class MockDialog {
					constructor(args: any) {
						dialogConstructorArgs = args;
					}
					render(_state: boolean) {}
				},
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should include offset sliders with default values when no flags exist', () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'localNotes') return 'Some notes';
					if (key === 'tokenOffsetX') return undefined;
					if (key === 'tokenOffsetY') return undefined;
				}
				return undefined;
			});

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			expect(dialogConstructorArgs.content).toContain('name="tokenOffsetX"');
			expect(dialogConstructorArgs.content).toContain('name="tokenOffsetY"');
			expect(dialogConstructorArgs.content).toContain('min="-50"');
			expect(dialogConstructorArgs.content).toContain('max="50"');
			expect(dialogConstructorArgs.content).toContain('value="0"');
		});

		it('should preselect existing offset values', () => {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana') {
					if (key === 'sheetUrl') return 'https://app.arcana.com/embedded/characters/abc123';
					if (key === 'localNotes') return 'Some notes';
					if (key === 'tokenOffsetX') return -25;
					if (key === 'tokenOffsetY') return 15;
				}
				return undefined;
			});

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			expect(dialogConstructorArgs.content).toContain('value="-25"');
			expect(dialogConstructorArgs.content).toContain('value="15"');
		});

		it('should include oninput handlers for real-time slider labels', () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			expect(dialogConstructorArgs.content).toContain(
				'oninput="this.nextElementSibling.textContent = this.value + \'%\'"',
			);
		});

		it('should store flags and NOT update actor with anchors on save', async () => {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => '' };
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "input[name='tokenOffsetX']") return { val: (): string => '25' };
					if (selector === "input[name='tokenOffsetY']") return { val: (): string => '-10' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'tokenOffsetX', 25);
			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'tokenOffsetY', -10);
			const updateCall = vi.mocked(mockActor.update).mock.calls[0][0] as Record<string, any>;
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorX');
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorY');
		});

		it('should NOT update active tokens with anchor values on save', async () => {
			const mockTokenDoc = { update: vi.fn().mockResolvedValue(undefined) };
			mockActor.getActiveTokens = vi.fn().mockReturnValue([{ document: mockTokenDoc }]);

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => '' };
					if (selector === "input[name='actorLink']") return { is: (): boolean => true };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "input[name='tokenOffsetX']") return { val: (): string => '0' };
					if (selector === "input[name='tokenOffsetY']") return { val: (): string => '50' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			const tokenUpdateCall = vi.mocked(mockTokenDoc.update).mock.calls[0][0] as Record<
				string,
				any
			>;
			expect(tokenUpdateCall).not.toHaveProperty('texture.anchorX');
			expect(tokenUpdateCall).not.toHaveProperty('texture.anchorY');
		});

		it('should force reload the iframe when token offsets change and the URL is unchanged', async () => {
			// GIVEN the sheet is open with an iframe and stored offsets at zero
			const existingIframe = document.createElement('iframe');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			const container = document.createElement('div');
			container.append(existingIframe, titleEl);
			(sheet as any).element = container;

			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") {
						return { val: (): string => 'https://app.arcana.com/embedded/characters/abc123' };
					}
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "input[name='tokenOffsetX']") return { val: (): string => '25' };
					if (selector === "input[name='tokenOffsetY']") return { val: (): string => '-10' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			// WHEN saving with changed offsets but the same URL
			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			// THEN the iframe is force reloaded so the new offsets reach the URL
			expect(superRender).toHaveBeenCalledWith(
				expect.objectContaining({ force: true, forceReload: true }),
			);

			superRender.mockRestore();
		});

		it('should not force reload the iframe when token offsets and the URL are unchanged', async () => {
			// GIVEN the sheet is open with an iframe and stored offsets at zero
			const existingIframe = document.createElement('iframe');
			const titleEl = document.createElement('span');
			titleEl.className = 'window-title';
			const container = document.createElement('div');
			container.append(existingIframe, titleEl);
			(sheet as any).element = container;

			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);

			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));

			const mockHtml = {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") {
						return { val: (): string => 'https://app.arcana.com/embedded/characters/abc123' };
					}
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "input[name='tokenOffsetX']") return { val: (): string => '0' };
					if (selector === "input[name='tokenOffsetY']") return { val: (): string => '0' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};

			// WHEN saving without any change
			await dialogConstructorArgs.buttons.save.callback(mockHtml);

			// THEN the existing iframe is preserved without forcing a reload
			expect(superRender).not.toHaveBeenCalled();

			superRender.mockRestore();
		});
	});

	describe('#configureSheet token border color', () => {
		const characterSheetUrl = 'https://app.arcana.com/embedded/characters/abc123';
		const palette = [
			['black', '#000000', 'Negro'],
			['red', '#990000', 'Rojo'],
			['green', '#27a241', 'Verde'],
			['yellow', '#e6b800', 'Amarillo'],
			['orange', '#d35400', 'Naranja'],
			['gray', '#9aa0a6', 'Gris'],
			['lightblue', '#2b89fb', 'Celeste'],
			['purple', '#7800ff', 'Púrpura'],
		] as const;
		let dialogConstructorArgs: any;

		function colorOptionBlock(content: string, id: string): string {
			const start = content.indexOf(`data-color-id="${id}"`);
			const end = content.indexOf('</label>', start);
			return content.slice(start, end);
		}

		function configureStoredColor(tokenBorderColor: unknown): void {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return characterSheetUrl;
				if (key === 'tokenBorderColor') return tokenBorderColor;
				return undefined;
			});
		}

		function attachIframeToSheet(): { postMessage: ReturnType<typeof vi.fn> } {
			const postMessage = vi.fn();
			const iframe = document.createElement('iframe');
			Object.defineProperty(iframe, 'contentWindow', { value: { postMessage } });
			const container = document.createElement('div');
			container.appendChild(iframe);
			(sheet as any).element = container;
			return { postMessage };
		}

		function openDialog(): any {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));
			return dialogConstructorArgs;
		}

		function createMockHtml(selectedColorId: string): any {
			return {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => characterSheetUrl };
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "input[name='tokenBorderColor']:checked") {
						return { val: (): string => selectedColorId };
					}
					return { val: (): string => '', is: (): boolean => false };
				}),
			};
		}

		async function saveDialog(selectedColorId: string): Promise<void> {
			await dialogConstructorArgs.buttons.save.callback(createMockHtml(selectedColorId));
		}

		function findColorMessages(postMessage: ReturnType<typeof vi.fn>): any[] {
			return postMessage.mock.calls
				.map(([message]) => message)
				.filter((message) => message?.type === 'FOUNDRY_TOKEN_COLOR_UPDATE');
		}

		beforeEach(() => {
			mockActor.system.nightVision = 'none';
			mockActor.prototypeToken = { actorLink: false };
			mockActor.update = vi.fn().mockResolvedValue(undefined);
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			mockActor.getActiveTokens = vi.fn().mockReturnValue([]);

			vi.stubGlobal('CONFIG', {
				Canvas: {
					visionModes: {
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
					},
				},
			});

			vi.stubGlobal(
				'Dialog',
				class MockDialog {
					constructor(args: any) {
						dialogConstructorArgs = args;
					}
					render(_state: boolean) {}
				},
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('shows the eight border colors visually with the current one highlighted', () => {
			configureStoredColor('green');

			const content = openDialog().content as string;

			expect(content.match(/data-color-id=/g)).toHaveLength(8);
			for (const [id, hex, label] of palette) {
				expect(content).toContain(`data-color-id="${id}"`);
				expect(content).toContain(`value="${id}"`);
				expect(content).toContain(hex);
				expect(content).toContain(label);
			}

			const selectedBlock = colorOptionBlock(content, 'green');
			expect(selectedBlock).toContain('data-selected="true"');
			expect(selectedBlock).toContain('checked');
			expect(colorOptionBlock(content, 'black')).toContain('data-selected="false"');

			// Every swatch shares the same transparent base style: the injected
			// :has(input:checked) rule is the single visual source of selection, so
			// clicking another radio cannot leave a second baked highlight behind.
			const baseOptionStyle = 'border: 2px solid transparent; background: transparent';
			for (const [id] of palette) {
				const block = colorOptionBlock(content, id);
				expect(block).toContain(baseOptionStyle);
				expect(block).not.toContain('rgba(255,255,255');
				expect(block).toContain(`data-selected="${id === 'green'}"`);
				expect(block.includes('checked')).toBe(id === 'green');
			}

			expect(content).toContain('.token-color-option:has(input:checked)');
			expect(content).toContain('border-color: rgba(255,255,255,0.85) !important');
			expect(content).toContain('background: rgba(255,255,255,0.12) !important');
		});

		it('highlights the gray option when the stored flag is the legacy silver id', () => {
			configureStoredColor('silver');

			const content = openDialog().content as string;

			expect(colorOptionBlock(content, 'gray')).toContain('data-selected="true"');
			expect(colorOptionBlock(content, 'gray')).toContain('checked');
		});

		it('persists the chosen color flag per actor on save', async () => {
			configureStoredColor('black');
			openDialog();

			await saveDialog('green');

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'tokenBorderColor', 'green');
		});

		it('posts FOUNDRY_TOKEN_COLOR_UPDATE with the resolved hex when the color changed', async () => {
			configureStoredColor('black');
			const { postMessage } = attachIframeToSheet();
			openDialog();

			await saveDialog('orange');

			expect(findColorMessages(postMessage)).toEqual([
				{ type: 'FOUNDRY_TOKEN_COLOR_UPDATE', color: '#d35400' },
			]);
		});

		it('does not emit the color message when the saved color did not change', async () => {
			configureStoredColor('red');
			const { postMessage } = attachIframeToSheet();
			openDialog();

			await saveDialog('red');

			expect(findColorMessages(postMessage)).toHaveLength(0);
		});

		it('does not emit the color message when there is no iframe', async () => {
			configureStoredColor('black');
			openDialog();

			await saveDialog('orange');

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'tokenBorderColor', 'orange');
		});

		it('does not force reload the iframe when the color changes and the URL is unchanged', async () => {
			configureStoredColor('black');
			attachIframeToSheet();
			const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(ArcanaSheetV2.prototype));
			const superRender = vi.spyOn(baseProto, 'render').mockResolvedValue(sheet);
			openDialog();

			await saveDialog('gray');

			expect(superRender).not.toHaveBeenCalled();

			superRender.mockRestore();
		});

		it('falls back to the character default when the stored flag is invalid', async () => {
			configureStoredColor('magenta');

			const content = openDialog().content as string;

			expect(colorOptionBlock(content, 'black')).toContain('data-selected="true"');

			await saveDialog('');

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'tokenBorderColor', 'black');
		});
	});

	describe('#configureSheet creature size', () => {
		const characterSheetUrl = 'https://app.arcana.com/embedded/characters/abc123';
		let dialogConstructorArgs: any;

		function configureStoredSize(
			creatureSize: unknown,
			tokenSize?: { width: number; height: number },
		): void {
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return characterSheetUrl;
				if (key === 'creatureSize') return creatureSize;
				return undefined;
			});
			mockActor.prototypeToken = { actorLink: false, ...tokenSize };
		}

		function openDialog(): any {
			const handler = (ArcanaSheetV2 as any).DEFAULT_OPTIONS.actions.configureSheet;
			handler.call(sheet, new PointerEvent('click'), document.createElement('button'));
			return dialogConstructorArgs;
		}

		function selectBlock(content: string, name: string): string {
			const start = content.indexOf(`name="${name}"`);
			const end = content.indexOf('</select>', start);
			return content.slice(start, end);
		}

		function variantGroupTag(content: string): string {
			const start = content.indexOf('<div class="form-group" data-creature-size-variant');
			const end = content.indexOf('>', start);
			return content.slice(start, end);
		}

		function createMockHtml(category: string, variant = '3'): any {
			return {
				find: vi.fn((selector: string) => {
					if (selector === "input[name='url']") return { val: (): string => characterSheetUrl };
					if (selector === "input[name='actorLink']") return { is: (): boolean => false };
					if (selector === "select[name='nightVision']") return { val: (): string => 'none' };
					if (selector === "select[name='creatureSizeCategory']") {
						return { val: (): string => category };
					}
					if (selector === "select[name='creatureSizeVariant']") {
						return { val: (): string => variant };
					}
					if (selector === "input[name='tokenOffsetX']") return { val: (): string => '0' };
					if (selector === "input[name='tokenOffsetY']") return { val: (): string => '0' };
					return { val: (): string => '', is: (): boolean => false };
				}),
			};
		}

		async function saveDialog(category: string, variant?: string): Promise<void> {
			await dialogConstructorArgs.buttons.save.callback(createMockHtml(category, variant));
		}

		beforeEach(() => {
			mockActor.system.nightVision = 'none';
			mockActor.prototypeToken = { actorLink: false };
			mockActor.update = vi.fn().mockResolvedValue(undefined);
			mockActor.setFlag = vi.fn().mockResolvedValue(undefined);
			mockActor.getActiveTokens = vi.fn().mockReturnValue([]);

			vi.stubGlobal('CONFIG', {
				Canvas: {
					visionModes: {
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
					},
				},
			});

			vi.stubGlobal(
				'Dialog',
				class MockDialog {
					constructor(args: any) {
						dialogConstructorArgs = args;
					}
					render(_state: boolean) {}
				},
			);

			configureStoredSize(undefined);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('offers the five canonical categories plus the neutral option', () => {
			const content = openDialog().content as string;
			const categoryBlock = selectBlock(content, 'creatureSizeCategory');

			expect(categoryBlock.match(/<option /g)).toHaveLength(6);
			expect(categoryBlock).toContain('value=""');
			expect(categoryBlock).toContain('— Sin configurar —');
			expect(categoryBlock).toContain('>Diminuto</option>');
			expect(categoryBlock).toContain('>Pequeño</option>');
			expect(categoryBlock).toContain('>Mediano</option>');
			expect(categoryBlock).toContain('>Grande</option>');
			expect(categoryBlock).toContain('>Inmenso</option>');
		});

		it('renders the three largest-size variants and reveals them only for Inmenso', () => {
			configureStoredSize('grande');
			let content = openDialog().content as string;
			const variantBlock = selectBlock(content, 'creatureSizeVariant');

			expect(variantBlock.match(/<option /g)).toHaveLength(3);
			expect(variantBlock).toContain('Inmenso 3×3 (estándar)');
			expect(variantBlock).toContain('Inmenso 4×4 (mayor)');
			expect(variantBlock).toContain('Inmenso 5×5 (colosal)');
			expect(content).toContain('class="creature-size-group"');
			expect(content).toContain(
				"this.closest('.creature-size-group').querySelector('[data-creature-size-variant]').style.display = this.value === 'inmenso' ? '' : 'none'",
			);
			expect(variantGroupTag(content)).toContain('display: none');

			configureStoredSize('inmenso-4');
			content = openDialog().content as string;
			expect(variantGroupTag(content)).not.toContain('display: none');
			expect(selectBlock(content, 'creatureSizeVariant')).toContain('value="4" selected');
		});

		it('preselects the stored size flag over the prototype token dimensions', () => {
			configureStoredSize('grande', { width: 4, height: 4 });

			const content = openDialog().content as string;

			expect(selectBlock(content, 'creatureSizeCategory')).toContain('value="grande" selected');
		});

		it('infers a unique size from the prototype token dimensions when there is no flag', () => {
			configureStoredSize(undefined, { width: 0.5, height: 0.5 });

			const content = openDialog().content as string;

			expect(selectBlock(content, 'creatureSizeCategory')).toContain('value="diminuto" selected');
		});

		it('preselects the largest variant inferred from the prototype token dimensions', () => {
			configureStoredSize(undefined, { width: 4, height: 4 });

			const content = openDialog().content as string;

			expect(selectBlock(content, 'creatureSizeCategory')).toContain('value="inmenso" selected');
			expect(selectBlock(content, 'creatureSizeVariant')).toContain('value="4" selected');
			expect(variantGroupTag(content)).not.toContain('display: none');
		});

		it('stays neutral when the prototype dimensions match more than one size', () => {
			configureStoredSize(undefined, { width: 1, height: 1 });

			const content = openDialog().content as string;

			expect(selectBlock(content, 'creatureSizeCategory')).toContain('value="" selected');
		});

		it('falls back to inference when the stored flag is not a canonical id', () => {
			configureStoredSize('enorme', { width: 2, height: 2 });

			const content = openDialog().content as string;

			expect(selectBlock(content, 'creatureSizeCategory')).toContain('value="grande" selected');
		});

		it.each([
			['diminuto', 0.5],
			['pequeno', 1],
			['mediano', 1],
			['grande', 2],
			['inmenso', 3],
		])(
			'applies the %s footprint to the prototype and placed tokens',
			async (category, footprint) => {
				const mockTokenDoc = { update: vi.fn().mockResolvedValue(undefined) };
				mockActor.getActiveTokens = vi.fn().mockReturnValue([{ document: mockTokenDoc }]);
				openDialog();

				await saveDialog(category);

				expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'creatureSize', category);
				expect(mockActor.update).toHaveBeenCalledWith(
					expect.objectContaining({
						'prototypeToken.width': footprint,
						'prototypeToken.height': footprint,
					}),
				);
				expect(mockTokenDoc.update).toHaveBeenCalledWith(
					expect.objectContaining({ width: footprint, height: footprint }),
				);
			},
		);

		it.each([
			['3', 'inmenso', 3],
			['4', 'inmenso-4', 4],
			['5', 'inmenso-5', 5],
		])('persists the largest-size variant %s as %s', async (variant, expectedId, footprint) => {
			openDialog();

			await saveDialog('inmenso', variant);

			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'creatureSize', expectedId);
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'prototypeToken.width': footprint,
					'prototypeToken.height': footprint,
				}),
			);
		});

		it('leaves flags and token dimensions untouched with the neutral selection', async () => {
			const mockTokenDoc = { update: vi.fn().mockResolvedValue(undefined) };
			mockActor.getActiveTokens = vi.fn().mockReturnValue([{ document: mockTokenDoc }]);
			openDialog();

			await saveDialog('');

			expect(mockActor.setFlag).not.toHaveBeenCalledWith(
				'arcana',
				'creatureSize',
				expect.anything(),
			);
			const updateCall = vi.mocked(mockActor.update).mock.calls[0][0] as Record<string, unknown>;
			expect(updateCall).not.toHaveProperty('prototypeToken.width');
			expect(updateCall).not.toHaveProperty('prototypeToken.height');
			const tokenUpdateCall = vi.mocked(mockTokenDoc.update).mock.calls[0][0] as Record<
				string,
				unknown
			>;
			expect(tokenUpdateCall).not.toHaveProperty('width');
			expect(tokenUpdateCall).not.toHaveProperty('height');
		});
	});
});
