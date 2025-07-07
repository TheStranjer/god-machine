export const registerSystemSettings = () => {
  game.settings.register("god-machine", "apiKey", {
    name: game.i18n.format("god-machine.api-key-title"),
    hint: game.i18n.format("god-machine.api-key-hint"),
    scope: "world",
    config: true,
    type: String,
    default: "",
    requiresReload: false
  });

  game.settings.register("god-machine", "model", {
    name: game.i18n.format("god-machine.model-title"),
    hint: game.i18n.format("god-machine.model-hint"),
    scope: "world",
    config: true,
    type: String,
    default: "gpt-4o",
    requiresReload: false
  });

  game.settings.register("god-machine", "endpoint", {
    name:  game.i18n.format("god-machine.endpoint-title"),
    hint: game.i18n.format("god-machine.endpoint-hint"),
    scope: "world",
    config: true,
    type: String,
    default: "https://api.openai.com/v1/chat/completions",
    requiresReload: false
  });
};