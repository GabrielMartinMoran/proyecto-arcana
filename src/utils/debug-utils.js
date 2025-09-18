/**
 * debug-utils.js
 *
 * Lightweight render / lifecycle diagnostics helpers.
 *
 * Usage patterns:
 *  - Import functions and call `logRender(...)` at top of a render/update to track frequency.
 *  - Wrap expensive work with `instrumentRender('MyComp', () => { ... })` to log duration.
 *  - Call `timeStart()` / `timeEnd()` for ad-hoc timings.
 *
 * Activation:
 *  - Enabled when the URL contains `?debug=renders` or `#debug=renders`
 *  - Or when localStorage['arcana:debug:renders'] === '1'
 *
 * The helpers are intentionally lightweight (console-based) and safe to leave in production:
 * they do nothing unless debug is enabled.
 */

const DEBUG_STORAGE_KEY = 'arcana:debug:renders';
const DEBUG_QUERY_KEY = 'debug';
const DEBUG_FEATURE = 'renders';

function _getUrlDebugFlags() {
    try {
        const u = new URL(window.location.href);
        // Query param ?debug=renders or comma separated
        const q = u.searchParams.get(DEBUG_QUERY_KEY);
        const hash = (u.hash || '').replace(/^#/, '');
        return { query: q || '', hash: hash || '' };
    } catch (e) {
        return { query: '', hash: '' };
    }
}

/**
 * isEnabled - determine whether render debug is enabled
 * Checks (in order):
 *  - URL query param `?debug=renders` or hash `#debug=renders`
 *  - localStorage key `arcana:debug:renders` === '1'
 */
export function isEnabled() {
    try {
        const { query, hash } = _getUrlDebugFlags();
        const combined = `${query || ''}` + (hash ? `,${hash}` : '');
        if (combined && combined.split(/[,&;]/).some((s) => String(s).trim() === DEBUG_FEATURE)) return true;
    } catch (_) {}
    try {
        return localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
    } catch (_) {
        return false;
    }
}

/**
 * enable / disable by storing a flag in localStorage.
 * Note: this persists across reloads.
 */
export function enable() {
    try {
        localStorage.setItem(DEBUG_STORAGE_KEY, '1');
    } catch (_) {}
}

export function disable() {
    try {
        localStorage.removeItem(DEBUG_STORAGE_KEY);
    } catch (_) {}
}

/** Minimal logger used by this module (no-op when disabled). */
function _log(...args) {
    if (!isEnabled()) return;
    // Prefix + timestamp
    const ts = new Date().toISOString();
    // Use console.groupCollapsed for nicer output when available
    if (console && console.groupCollapsed && console.groupEnd) {
        // Keep compact messages grouped by first argument if it's a string
        try {
            const title = typeof args[0] === 'string' ? `[ARCANA][${ts}] ${args.shift()}` : `[ARCANA][${ts}]`;
            console.groupCollapsed(title);
            console.log(...args);
            console.groupEnd();
        } catch (e) {
            console.log(`[ARCANA][${ts}]`, ...args);
        }
    } else {
        console.log(`[ARCANA][${ts}]`, ...args);
    }
}

/**
 * timeStart - helper to start a timer
 * Returns a token (timestamp) to pass to timeEnd.
 */
export function timeStart(tag = 'timer') {
    if (!isEnabled()) return null;
    try {
        return { tag, t: performance.now() };
    } catch (_) {
        return { tag, t: Date.now() };
    }
}

/**
 * timeEnd - finish timer previously created with timeStart
 * Logs duration and optional meta info.
 */
export function timeEnd(token, meta = {}) {
    if (!isEnabled() || !token) return;
    try {
        const now = performance.now ? performance.now() : Date.now();
        const ms = Math.max(0, now - token.t);
        _log(`time:${token.tag}`, `duration=${ms.toFixed(2)}ms`, meta);
        return ms;
    } catch (e) {
        try {
            _log(`time:${token.tag}`, 'error', e);
        } catch (_) {}
    }
    return null;
}

/**
 * instrumentRender - run a function and log its execution time and optional details.
 * Useful to wrap rendering or expensive calculations.
 *
 * Example:
 *   const res = await instrumentRender('CharacterSheet.render', () => renderHtml());
 */
export async function instrumentRender(name, fn, details = {}) {
    if (!isEnabled()) {
        // fast-path: just run
        return await fn();
    }
    const token = timeStart(name);
    try {
        const result = await fn();
        timeEnd(token, details);
        return result;
    } catch (err) {
        timeEnd(token, { error: String(err) });
        throw err;
    }
}

/**
 * logRender - mark a "render" event (incremental info).
 * Call at the beginning of a render/update flow.
 *
 * Examples:
 *   logRender('CharactersPage');
 *   logRender('SheetTab', { reason: 'attributes-change' });
 */
export function logRender(componentName, meta = {}) {
    if (!isEnabled()) return;
    _log(`render:${componentName}`, meta);
}

/**
 * wrapSetState - decorate a setState function so each invocation logs a render.
 * Returns a wrapper that calls the original `setState` and logs the call (and duration if possible).
 *
 * Usage:
 *   comp.setState = wrapSetState('SheetTab', comp.setState);
 */
export function wrapSetState(componentName, setStateFn) {
    if (typeof setStateFn !== 'function') return setStateFn;
    return function wrappedSetState(partial) {
        if (!isEnabled()) {
            return setStateFn.call(this, partial);
        }
        const token = timeStart(`${componentName}.setState`);
        try {
            const res = setStateFn.call(this, partial);
            // If setStateFn is async (returns a Promise) wait to log duration
            if (res && typeof res.then === 'function') {
                return res.then((r) => {
                    timeEnd(token, { component: componentName, partial });
                    return r;
                });
            } else {
                timeEnd(token, { component: componentName, partial });
                return res;
            }
        } catch (e) {
            timeEnd(token, { component: componentName, partial, error: String(e) });
            throw e;
        }
    };
}

/**
 * addRenderCounterBadge - attach a small visual badge to a container that increments each time
 * it's passed to `countRender` (useful for visual debugging).
 *
 * NOTE: minimal DOM mutation and removed when disable() is called or if the container is removed.
 */
const _badges = new WeakMap();
export function addRenderCounterBadge(container, label = 'renders') {
    if (!isEnabled() || !container || !(container instanceof HTMLElement)) return null;
    try {
        if (_badges.has(container)) return _badges.get(container);
        const badge = document.createElement('div');
        badge.className = 'arcana-debug-badge';
        badge.style.cssText =
            'position: absolute; right: 6px; top: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size:12px; padding:2px 6px; border-radius:12px; z-index:9999;';
        badge.textContent = `${label}: 0`;
        // Ensure container has relative positioning
        const prevPos = container.style.position || '';
        if (!prevPos) container.style.position = 'relative';
        container.appendChild(badge);
        const info = { badge, count: 0, restorePos: prevPos };
        _badges.set(container, info);
        return info;
    } catch (_) {
        return null;
    }
}

/**
 * countRender - increments the badge for the container returned from addRenderCounterBadge
 */
export function countRender(containerInfo, delta = 1) {
    if (!isEnabled() || !containerInfo) return;
    try {
        containerInfo.count = (containerInfo.count || 0) + delta;
        if (containerInfo.badge) containerInfo.badge.textContent = `renders: ${containerInfo.count}`;
    } catch (_) {}
}

/**
 * clearDebugBadges - clean previously added badges (best-effort)
 */
export function clearDebugBadges() {
    try {
        for (const entry of Array.from(document.querySelectorAll('.arcana-debug-badge'))) {
            entry.remove();
        }
    } catch (_) {}
}

/**
 * Convenience default export
 */
const DebugUtils = {
    isEnabled,
    enable,
    disable,
    logRender,
    instrumentRender,
    timeStart,
    timeEnd,
    wrapSetState,
    addRenderCounterBadge,
    countRender,
    clearDebugBadges,
};

export default DebugUtils;
