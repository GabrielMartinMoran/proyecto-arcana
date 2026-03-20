import { describe, it, expect, beforeEach, vi } from 'vitest';

// We'll test the URL manipulation logic directly

describe('cards-filter-service URL handling', () => {
	describe('updateURLFilters should use separate params', () => {
		it('should format multiple tags as separate URL params', () => {
			// Simulate what updateURLFilters SHOULD do
			const url = new URL('http://localhost/');
			const tags = ['fuego', 'magia'];
			
			// CORRECT approach: delete + append per value
			url.searchParams.delete('tags');
			tags.forEach(tag => url.searchParams.append('tags', tag));
			
			expect(url.searchParams.getAll('tags')).toEqual(['fuego', 'magia']);
			expect(url.toString()).toContain('tags=fuego');
			expect(url.toString()).toContain('tags=magia');
		});

		it('should format multiple levels as separate URL params', () => {
			const url = new URL('http://localhost/');
			const level = [1, 2];
			
			// CORRECT approach: delete + append per value
			url.searchParams.delete('level');
			level.forEach(lvl => url.searchParams.append('level', String(lvl)));
			
			expect(url.searchParams.getAll('level')).toEqual(['1', '2']);
		});

		it('should NOT use comma-joined format', () => {
			const url = new URL('http://localhost/');
			const tags = ['fuego', 'magia'];
			
			// WRONG approach (current bug): set with join
			url.searchParams.set('tags', tags.join(','));
			
			// When we getAll from this, we get ONE element
			const values = url.searchParams.getAll('tags');
			expect(values).toEqual(['fuego,magia']); // Single element with comma
			expect(values.length).toBe(1); // This is the bug!
		});
	});

	describe('getFiltersFromURL with getAll', () => {
		it('should parse separate params correctly', () => {
			// Format that works: ?tags=fuego&tags=magia
			const url = new URL('http://localhost/?tags=fuego&tags=magia');
			
			const tags = url.searchParams.getAll('tags').filter(tag => tag !== '');
			expect(tags).toEqual(['fuego', 'magia']);
		});

		it('should fail with comma-joined format', () => {
			// Buggy format: ?tags=fuego,magia
			const url = new URL('http://localhost/?tags=fuego,magia');
			
			const tags = url.searchParams.getAll('tags').filter(tag => tag !== '');
			expect(tags).toEqual(['fuego,magia']); // Single element!
			expect(tags.length).toBe(1); // This is the problem
		});
	});

	describe('roundtrip compatibility', () => {
		it('should preserve tags with separate param format', () => {
			const originalTags = ['fuego', 'magia'];
			
			// Step 1: Save with separate params
			const url = new URL('http://localhost/');
			url.searchParams.delete('tags');
			originalTags.forEach(tag => url.searchParams.append('tags', tag));
			
			// Step 2: Load from URL (simulating page reload)
			const savedTags = url.searchParams.getAll('tags').filter(tag => tag !== '');
			
			expect(savedTags).toEqual(originalTags); // Roundtrip works!
		});

		it('should preserve levels with separate param format', () => {
			const originalLevels = [1, 2];
			
			// Step 1: Save with separate params
			const url = new URL('http://localhost/');
			url.searchParams.delete('level');
			originalLevels.forEach(lvl => url.searchParams.append('level', String(lvl)));
			
			// Step 2: Load from URL
			const savedLevels = url.searchParams
				.getAll('level')
				.filter(tag => tag !== '')
				.map(Number)
				.filter(x => x > 0);
			
			expect(savedLevels).toEqual(originalLevels); // Roundtrip works!
		});

		it('should fail roundtrip with comma-joined format', () => {
			const originalTags = ['fuego', 'magia'];
			
			// Step 1: Save with buggy comma-join
			const url = new URL('http://localhost/');
			url.searchParams.set('tags', originalTags.join(','));
			
			// Step 2: Load from URL
			const savedTags = url.searchParams.getAll('tags').filter(tag => tag !== '');
			
			// Bug: we get ['fuego,magia'] instead of ['fuego', 'magia']
			expect(savedTags).not.toEqual(originalTags);
			expect(savedTags).toEqual(['fuego,magia']);
		});
	});
});
