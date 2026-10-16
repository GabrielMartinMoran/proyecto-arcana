import { init } from './src/hooks/init';
import { onGetSceneControlButtons } from './src/hooks/render-scene-controls';
import { renderTokenHUD } from './src/hooks/render-token-hud';
import { setupDetachedWindow } from './src/hooks/setup-detached-window';
import { setupEscInterceptor } from './src/hooks/setup-esc-interceptor';
import { setupMessageListener } from './src/listeners/message-listener';

Hooks.once('init', init);
// @ts-expect-error - renderTokenHUD works at runtime even if types don't match perfectly
Hooks.on('renderTokenHUD', renderTokenHUD);

// @ts-expect-error - getSceneControlButtons is untyped in the v13 beta types
Hooks.on('getSceneControlButtons', onGetSceneControlButtons);

Hooks.once('ready', setupEscInterceptor);

setupMessageListener();
setupDetachedWindow();
