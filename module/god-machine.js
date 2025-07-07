console.log("Loading god-machine module...");

Hooks.once("init", () => {
  console.log("God-machine module is initializing...");
});

Hooks.once("ready", () => {
  console.log("God-machine module is ready...");
});