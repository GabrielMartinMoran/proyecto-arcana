/**
 * Simple Hash Router
 * Usage:
 *   Router.register('/', () => renderHome())
 *   Router.start(document.getElementById('app'))
 */
const Router = (() => {
    const routes = new Map();
    let outlet = null;
    let notFoundHandler = null;

    function getPath() {
        const hash = location.hash || "#/";
        if (!hash.startsWith('#/')) return null; // ignore non-route hashes (e.g., in-page anchors)
        const clean = hash.replace(/^#/, "");
        return clean.startsWith("/") ? clean : `/${clean}`;
    }

    async function handleRouteChange() {
        const path = getPath();
        if (path == null) return; // non-route hash, do nothing
        const handler = routes.get(path) || notFoundHandler;
        if (!handler) return;
        try {
            await handler(outlet);
            // Reset scroll to top after each route navigation
            // Use rAF to ensure DOM is painted before scrolling
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: 'auto' });
                // If a main panel container exists and has its own scroll, reset it too
                const main = document.querySelector('.main-panel');
                if (main) main.scrollTop = 0;
            });
        } catch (error) {
            console.error("Router navigation error:", error);
        }
    }

    return {
        /**
         * Register a route path to a handler
         * @param {string} path e.g., '/'
         * @param {(outlet: HTMLElement)=> (void|Promise<void>)} handler
         */
        register(path, handler) {
            routes.set(path, handler);
            return this;
        },

        /** Set not found handler */
        setNotFound(handler) { notFoundHandler = handler; return this; },

        /** Start listening and render initial route */
        start(rootElement) {
            outlet = rootElement;
            window.addEventListener("hashchange", handleRouteChange);
            window.addEventListener("popstate", handleRouteChange);
            handleRouteChange();
        },

        /** Navigate to a path */
        navigate(path) { location.hash = path.startsWith("#") ? path : `#${path}`; }
    };
})();

export default Router;


