import Router from "./router.js";
import CardService from "./services/card-service.js";

/**
 * Application bootstrap
 */
async function bootstrap() {
    const appRoot = document.getElementById("app");

    // Ensure global mobile app bar exists (mobile only via CSS)
    const ensureMobileAppBar = () => {
        if (!document.getElementById('mobile-appbar')) {
            const bar = document.createElement('div');
            bar.id = 'mobile-appbar';
            bar.className = 'mobile-appbar';
            bar.innerHTML = '<button class="nav-toggle" id="global-open-drawer" aria-label="Abrir menú">☰</button><div class="brand">Proyecto Arcana</div>';
            document.body.appendChild(bar);
            const btn = document.getElementById('global-open-drawer');
            if (btn) btn.addEventListener('click', async () => {
                const existing = document.querySelector('.drawer-backdrop');
                if (existing) { existing.remove(); document.body.classList.remove('no-scroll'); return; }
                const backdrop = document.createElement('div');
                backdrop.className = 'drawer-backdrop open';
                backdrop.innerHTML = '<div class="drawer-panel"><div id="drawer-sidebar"></div></div>';
                document.body.appendChild(backdrop);
                document.body.classList.add('no-scroll');
                try {
                    const module = await import('./components/SidebarComponent/SidebarComponent.js');
                    const SidebarComponent = module.default;
                    const drawerContainer = document.getElementById('drawer-sidebar');
                    const drawerSidebar = SidebarComponent(drawerContainer);
                    drawerSidebar.init();
                    // Try to copy existing page TOC if present
                    const existingExtra = document.querySelector('#sidebar .sidebar-extra .sidebar-section-content');
                    if (existingExtra) drawerSidebar.setExtra('Indice', existingExtra.innerHTML);
                } catch (_) {}
                const closeAll = () => { backdrop.remove(); document.body.classList.remove('no-scroll'); };
                backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAll(); });
                const panel = backdrop.querySelector('.drawer-panel');
                if (panel) panel.addEventListener('click', (e) => {
                    const link = e.target && e.target.closest && e.target.closest('a');
                    if (link) setTimeout(closeAll, 0);
                });
            });
        }
    };
    ensureMobileAppBar();

    // Lazy-load HomePage when navigating to '/'
    Router
        .register("/", async (outlet) => {
            const module = await import("./pages/HomePage/HomePage.js");
            const HomePage = module.default;
            const page = HomePage(outlet);
            page.init();
        })
        .register("/cards", async (outlet) => {
            const module = await import("./pages/HomePage/HomePage.js");
            const HomePage = module.default;
            const page = HomePage(outlet);
            page.init();
        })
        .register("/player", async (outlet) => {
            const module = await import("./pages/PlayerManualPage/PlayerManualPage.js");
            const PlayerManualPage = module.default;
            const page = PlayerManualPage(outlet);
            page.init();
        })
        .register("/gm", async (outlet) => {
            const module = await import("./pages/GmManualPage/GmManualPage.js");
            const GmManualPage = module.default;
            const page = GmManualPage(outlet);
            page.init();
        })
        .register("/characters", async (outlet) => {
            const module = await import("./pages/CharactersPage/CharactersPage.js");
            const CharactersPage = module.default;
            const page = CharactersPage(outlet);
            page.init();
        })
        .setNotFound((outlet) => {
            outlet.innerHTML = html`
                <div class="container" style="padding: var(--spacing-xl) 0;">
                    <div class="empty-state">Page not found</div>
                </div>
            `;
        })
        .start(appRoot);

    // Preload cards in background for snappier UX
    try { await CardService.loadAll(); } catch (_) {}
}

bootstrap();


