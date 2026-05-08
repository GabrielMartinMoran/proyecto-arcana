import { init } from './src/hooks/init';
import { renderTokenHUD } from './src/hooks/render-token-hud';
import { setupEscInterceptor } from './src/hooks/setup-esc-interceptor';
import { setupMessageListener } from './src/listeners/message-listener';

Hooks.once('init', init);
// @ts-expect-error - renderTokenHUD works at runtime even if types don't match perfectly
Hooks.on('renderTokenHUD', renderTokenHUD);

Hooks.once('ready', setupEscInterceptor);

setupMessageListener();
