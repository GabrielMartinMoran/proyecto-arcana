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
			expect(context.health).toEqual({ value: 25, max: 50 });
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

		it('FEAT foundry-health-precedence — token actor startup iframe URL uses synthetic token actor HP', async () => {
			mockActor.uuid = 'Scene.scene-1.Token.token-1';
			mockActor.isToken = true;
			mockActor.system.health = { value: 3, max: 9 };

			const context = await (sheet as any)._prepareContext({});

			expect(context.iframeUrl).toContain('uuid=Scene.scene-1.Token.token-1');
			expect(context.iframeUrl).toContain('startHp=3');
			expect(context.iframeUrl).toContain('startMax=9');
			expect(context.health).toEqual({ value: 3, max: 9 });
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
					payload: { hp: { value: 25, max: 50 } },
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
	});
});
