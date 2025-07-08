import { registerSystemSettings } from "./settings.js";
import { GenerateCharacterDialog } from "./generate-character-dialog.js";

console.log("Loading god-machine module...");

Hooks.once("init", () => {
  console.log("God-machine module is initializing...");
  registerSystemSettings();
  console.log("God-machine settings have been registered.");
});

Hooks.once("ready", () => {
  const btn = $('<button class="god-machine-button"><i class="fas fa-robot"></i> Generate Character</button>');
  btn.on("click", () => {
    console.log("Generate Character button clicked");
  });

  $('#actors-directory').prepend(btn);
  console.log("God-machine module is ready...");
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
