import { registerSystemSettings } from "./settings.js";

console.log("Loading god-machine module...");

Hooks.once("init", () => {
  console.log("God-machine module is initializing...");
  registerSystemSettings();
  console.log("God-machine settings have been registered.");
});

Hooks.once("ready", () => {
  console.log("God-machine module is ready...");
});