export const registerSystemSettings = () => {
  game.settings.register("god-machine", "apiKey", {
    name: game.i18n.format("god-machine.api-key-title"),
    hint: game.i18n.format("god-machine.api-key-hint"),
    scope: "client",
    config: true,
    type: String,
    default: "",
    requiresReload: false
  });

  game.settings.register("god-machine", "model", {
    name: game.i18n.format("god-machine.model-title"),
    hint: game.i18n.format("god-machine.model-hint"),
    scope: "client",
    config: true,
    type: String,
    default: "grok-3-mini",
    requiresReload: false
  });

  game.settings.register("god-machine", "endpoint", {
    name:  game.i18n.format("god-machine.endpoint-title"),
    hint: game.i18n.format("god-machine.endpoint-hint"),
    scope: "client",
    config: true,
    type: String,
    default: "https://api.x.ai/v1/chat/completions",
    requiresReload: false
  });
};