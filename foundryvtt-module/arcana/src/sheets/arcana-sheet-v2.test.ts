/**
 * Unit tests for arcana-sheet-v2.ts
 * Tests ActorSheetV2 migration behaviors
 */

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Foundry V2 Application APIs before importing the sheet
const mockActorSheetV2 = class MockActorSheetV2 {
	actor: any;
	element: HTMLElement | null = null;
	window = { title: '' };
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
	});

	describe('_onRender', () => {
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
	});

	describe('PARTS', () => {
		it('should point to systems/arcana/template.html', () => {
			expect((ArcanaSheetV2 as any).PARTS.form.template).toBe('systems/arcana/template.html');
		});
	});
});
