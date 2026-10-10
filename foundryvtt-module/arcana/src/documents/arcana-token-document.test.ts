/**
 * Unit tests for arcana-token-document.ts
 *
 * Covers the `_onRelatedUpdate` override that requests a bar redraw when an
 * update touches `system.health.temp`. The core bar animation only diffs
 * `{value, max}`, so a temp-only change would otherwise leave a stale bar.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

class MockTokenDocumentBase {
	object: any = null;
	actor: any = null;

	_onRelatedUpdate(
		_update: Record<string, unknown> = {},
		_operation: Record<string, unknown> = {},
	): void {}
}

/**
 * Minimal stand-in for `foundry.utils.hasProperty`: an own dotted key wins,
 * otherwise the key is resolved as a nested path. It reports existence, so
 * falsy values such as `temp: 0` still count as present.
 */
function hasProperty(object: any, key: string): boolean {
	if (object === null || object === undefined) return false;
	if (key in object) return true;
	return (
		key
			.split('.')
			.reduce(
				(value, part) => (value === null || value === undefined ? undefined : value[part]),
				object,
			) !== undefined
	);
}

const easeInOutCosine = vi.fn((progress: number) => progress);

vi.stubGlobal('foundry', {
	utils: { hasProperty },
	documents: { TokenDocument: MockTokenDocumentBase },
	canvas: { animation: { CanvasAnimation: { easeInOutCosine } } },
});

const { ArcanaTokenDocument } = await import('./arcana-token-document');

function createDocument(): any {
	return new (ArcanaTokenDocument as any)();
}

describe('FEAT temp-hp-token-bar-visual — ArcanaTokenDocument._onRelatedUpdate', () => {
	let superSpy: MockInstance<typeof MockTokenDocumentBase.prototype._onRelatedUpdate>;

	beforeEach(() => {
		superSpy = vi.spyOn(MockTokenDocumentBase.prototype, '_onRelatedUpdate');
	});

	afterEach(() => {
		superSpy.mockRestore();
	});

	it('always delegates to the core related-update handler', () => {
		const doc = createDocument();
		const update = { system: { health: { value: 4 } } };
		const operation = { diff: true };

		doc._onRelatedUpdate(update, operation);

		expect(superSpy).toHaveBeenCalledWith(update, operation);
	});

	it('requests a bar refresh when a nested update changes temporary HP', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate({ system: { health: { temp: 7 } } }, {});

		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('requests a bar refresh for a flattened temporary HP update path', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate({ 'system.health.temp': 0 }, {});

		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('requests a bar refresh when an array of descendant updates changes temporary HP', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate([{ _id: 'delta-1', system: { health: { temp: 4 } } }], {});

		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('does not request a refresh when no descendant update touches temporary HP', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate(
			[
				{ _id: 'delta-1', system: { health: { value: 4 } } },
				{ _id: 'delta-2', name: 'Renamed' },
			],
			{},
		);

		expect(renderFlags.set).not.toHaveBeenCalled();
	});

	it('does not request a refresh when the update does not touch temporary HP', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate({ system: { health: { value: 3 } } }, {});

		expect(renderFlags.set).not.toHaveBeenCalled();
	});

	it('does not throw when the token is not rendered on the canvas', () => {
		const doc = createDocument();

		expect(() => doc._onRelatedUpdate({ system: { health: { temp: 2 } } }, {})).not.toThrow();
	});

	it('handles an empty update without requesting a refresh', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };

		doc._onRelatedUpdate();

		expect(renderFlags.set).not.toHaveBeenCalled();
	});

	it('animates the temporary HP overlay when the update changes temporary HP', () => {
		const doc = createDocument();
		const animate = vi.fn();
		doc.object = { objectId: 'token-1', animate, renderFlags: { set: vi.fn() } };
		doc.actor = { system: { health: { temp: 6 } } };

		doc._onRelatedUpdate({ system: { health: { temp: 6 } } }, {});

		expect(animate).toHaveBeenCalledWith(
			{ bar1: { temp: 6 } },
			{ name: 'token-1.animateBars', easing: easeInOutCosine },
		);
	});

	it('reads the new temporary HP from the updated actor', () => {
		const doc = createDocument();
		const animate = vi.fn();
		doc.object = { objectId: 'token-1', animate, renderFlags: { set: vi.fn() } };
		doc.actor = { system: { health: { temp: 9 } } };

		doc._onRelatedUpdate({ 'system.health.temp': 6 }, {});

		expect(animate).toHaveBeenCalledWith({ bar1: { temp: 9 } }, expect.anything());
	});

	it('still requests a bar refresh when it animates the overlay', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { objectId: 'token-1', animate: vi.fn(), renderFlags };
		doc.actor = { system: { health: { temp: 2 } } };

		doc._onRelatedUpdate({ system: { health: { temp: 2 } } }, {});

		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('does not animate when the update does not touch temporary HP', () => {
		const doc = createDocument();
		const animate = vi.fn();
		doc.object = { objectId: 'token-1', animate, renderFlags: { set: vi.fn() } };
		doc.actor = { system: { health: { temp: 6 } } };

		doc._onRelatedUpdate({ system: { health: { value: 3 } } }, {});

		expect(animate).not.toHaveBeenCalled();
	});

	it('does not animate when the token is not rendered on the canvas', () => {
		const doc = createDocument();
		doc.actor = { system: { health: { temp: 2 } } };

		expect(() => doc._onRelatedUpdate({ system: { health: { temp: 2 } } }, {})).not.toThrow();
	});

	it('does not animate when the render object cannot animate', () => {
		const doc = createDocument();
		const renderFlags = { set: vi.fn() };
		doc.object = { renderFlags };
		doc.actor = { system: { health: { temp: 2 } } };

		doc._onRelatedUpdate({ system: { health: { temp: 2 } } }, {});

		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('does not animate when the actor has no finite temporary HP', () => {
		const doc = createDocument();
		const animate = vi.fn();
		const renderFlags = { set: vi.fn() };
		doc.object = { objectId: 'token-1', animate, renderFlags };
		doc.actor = { system: { health: { value: 6 } } };

		doc._onRelatedUpdate({ system: { health: { temp: 2 } } }, {});

		expect(animate).not.toHaveBeenCalled();
		expect(renderFlags.set).toHaveBeenCalledWith({ refreshBars: true });
	});

	it('animates on a temporary HP change inside descendant update arrays', () => {
		const doc = createDocument();
		const animate = vi.fn();
		doc.object = { objectId: 'token-1', animate, renderFlags: { set: vi.fn() } };
		doc.actor = { system: { health: { temp: 4 } } };

		doc._onRelatedUpdate([{ _id: 'delta-1', system: { health: { temp: 4 } } }], {});

		expect(animate).toHaveBeenCalledTimes(1);
		expect(animate).toHaveBeenCalledWith(
			{ bar1: { temp: 4 } },
			{ name: 'token-1.animateBars', easing: easeInOutCosine },
		);
	});
});

/**
 * Regression for the subclass-private-brand crash class: overrides must stay
 * callable on a receiver whose subclass private methods are not installed
 * (prototype-only receiver), mirroring the moment the core invokes subclass
 * hooks before initialization completes.
 */
describe('FEAT temp-hp-token-bar-visual — ArcanaTokenDocument override brand-independence', () => {
	it('does not throw when _onRelatedUpdate runs without the subclass brand', () => {
		const receiver = Object.create(ArcanaTokenDocument.prototype) as any;
		const animate = vi.fn();
		receiver.object = { objectId: 'token-1', animate, renderFlags: { set: vi.fn() } };
		receiver.actor = { system: { health: { temp: 6 } } };

		expect(() => {
			(ArcanaTokenDocument.prototype as any)._onRelatedUpdate.call(
				receiver,
				{ system: { health: { temp: 6 } } },
				{},
			);
		}).not.toThrow();

		expect(animate).toHaveBeenCalledWith(
			{ bar1: { temp: 6 } },
			{ name: 'token-1.animateBars', easing: easeInOutCosine },
		);
	});
});
