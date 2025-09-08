import Router from "./router.js";
import CardService from "./services/card-service.js";

/**
 * Application bootstrap
 */
async function bootstrap() {
    const appRoot = document.getElementById("app");

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


