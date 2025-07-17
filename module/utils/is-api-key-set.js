export const isApiKeySet = () => {
  return game.settings.get("god-machine", "apiKey") && game.settings.get("god-machine", "apiKey").length > 0;
};