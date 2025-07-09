import { registerSystemSettings } from "./settings.js";
import { GenerateCharacterDialog } from "./generate-character-dialog.js";

console.log("Loading god-machine module...");

Hooks.once("init", () => {
  console.log("God-machine module is initializing...");
  registerSystemSettings();
  console.log("God-machine settings have been registered.");
});

Hooks.on("getActorDirectoryEntryContext", (html, options) => {
  options.push({
    name: "Generate Character",
    icon: '<i class="fas fa-robot"></i>', // you can change the icon
    condition: li => {
      const actorId = li.data("document-id");
      const actor = game.actors.get(actorId);
      return actor?.type === "character"; // only for characters
    },
    callback: li => {
      const actorId = li.data("document-id");
      const actor = game.actors.get(actorId);
      if (!actor) return;

      new GenerateCharacterDialog(actor).render(true);
    }
  });
});
