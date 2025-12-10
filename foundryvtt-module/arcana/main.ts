import { init } from './src/hooks/init';
import { renderTokenHUD } from './src/hooks/render-token-hud';
import { setupMessageListener } from './src/listeners/message-listener';

Hooks.once('init', init);
// @ts-ignore - renderTokenHUD works at runtime even if types don't match perfectly
Hooks.on('renderTokenHUD', renderTokenHUD);

setupMessageListener();
