import { registerSystemSettings } from "./settings.js";
import { GenerateCharacterApp } from "./generator-apps/character.js";
import { GenerateSpiritApp } from "./generator-apps/spirit.js";

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
      return actor?.type === "character" && game.user.role >= CONST.USER_ROLES.TRUSTED;
    },
    callback: li => {
      const actorId = li.data("document-id");
      const actor = game.actors.get(actorId);
      if (!actor) return;

      new GenerateCharacterApp(actor).render(true);
    }
  });

  options.push({
    name: "Generate Spirit",
    icon: '<i class="fas fa-robot"></i>',
    condition: li => {
      const actorId = li.data("document-id");
      const actor = game.actors.get(actorId);
      return actor?.type === "ephemeral" && actor?.system?.ephemeralType === "Spirit" && game.user.role >= CONST.USER_ROLES.GAMEMASTER;
    },
    callback: li => {
      const actorId = li.data("document-id");
      const actor = game.actors.get(actorId);
      if (!actor) return;
      new GenerateSpiritApp(actor).render(true);
    }
  });
});

Hooks.on("renderItemSheet", (sheet, html, data) => {
  if (data.item.type !== "merit" || game.system.id !== "mta") {
    return;
  }

  const prerequisitesField = `
    <div class="form-group">
      <label>Prerequisites</label>
      <input type="text" name="system.prerequisites" value="${data.system.prerequisites || ''}">
    </div>
    <div class="form-group">
      <label>Possible Ratings</label>
      <input type="text" name="system.possibleRatings" value="${data.system.possibleRatings || ''}">
    </div>
  `;

  const injectionPoint = html.find(".form-group").last();
  if (injectionPoint.length) {
    injectionPoint.after(prerequisitesField);
  } else {
    html.find(".sheet-body").append(prerequisitesField);
  }
});
