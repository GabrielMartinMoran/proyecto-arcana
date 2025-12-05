import { init } from './src/hooks/init.js';
import { renderTokenHUD } from './src/hooks/render-token-hud.js';
import { setupMessageListener } from './src/listeners/message-listener.js';

Hooks.once('init', init);
Hooks.on('renderTokenHUD', renderTokenHUD);

setupMessageListener();
