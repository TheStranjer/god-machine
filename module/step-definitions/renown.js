export const renownStep = {
  maximumAttempts: (actor) => (2),
  prompt: (actor) => {
    const renownTypes = ["cunning", "glory", "honor", "purity", "wisdom"];
    const currentTotals = renownTypes.map(type => actor.system.werewolf_renown[type]?.value ?? 0);
    const totalDots = currentTotals.reduce((sum, val) => sum + val, 0);
    const isGhostWolf = actor.system.tribe === "Ghost Wolves";
    const expectedBefore = isGhostWolf ? 1 : 2;
    const available = renownTypes.filter(type => (actor.system.werewolf_renown[type]?.value ?? 0) < 2);

    return `Choose one additional Renown dot for this Werewolf: the Forsaken character.

• You already have ${totalDots} Renown dots (${isGhostWolf ? "1 from Auspice" : "1 from Auspice and 1 from Tribe"}).
• Choose one Renown category to add 1 dot, but cannot choose a category already at 2 or more dots.
• Available Renown categories: ${available.join(', ')}.
• After this, ${isGhostWolf ? "Ghost Wolves will have 2 total" : "others will have 3 total"}.
• Return an object with:
  • **renown** - the chosen Renown name (lowercase, exact: ${available.join(', ')}).`;
  },
  tool: (actor) => {
    const renownTypes = ["cunning", "glory", "honor", "purity", "wisdom"];
    const available = renownTypes.filter(type => (actor.system.werewolf_renown[type]?.value ?? 0) < 2);

    return {
      type: "function",
      function: {
        name: "generate_renown",
        description: "Choose a valid additional Renown category.",
        parameters: {
          type: "object",
          properties: {
            renown: { type: "string", enum: available }
          },
          required: ["renown"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const renownTypes = ["cunning", "glory", "honor", "purity", "wisdom"];

    if (!data.renown || !renownTypes.includes(data.renown)) {
      errors.push("Invalid renown category chosen");
    } else if ((actor.system.werewolf_renown[data.renown]?.value ?? 0) >= 2) {
      errors.push("Chosen renown already at 2 or more dots");
    }

    const isGhostWolf = actor.system.tribe === "Ghost Wolves";
    const currentTotal = renownTypes.reduce((sum, type) => sum + (actor.system.werewolf_renown[type]?.value ?? 0), 0);
    const expectedBefore = isGhostWolf ? 1 : 2;
    if (currentTotal !== expectedBefore) {
      errors.push(`Unexpected current Renown total (expected ${expectedBefore}, got ${currentTotal})`);
    }

    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: { werewolf_renown: {} } };
    const current = actor.system.werewolf_renown[data.renown] ?? { value: 0, isAuspice: false, isTribe: false };
    updateData.system.werewolf_renown[data.renown] = {
      value: current.value + 1,
      isAuspice: current.isAuspice,
      isTribe: current.isTribe
    };

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    const renownTypes = ["cunning", "glory", "honor", "purity", "wisdom"];
    const totalDots = renownTypes.reduce((sum, type) => sum + (actor.system.werewolf_renown[type]?.value ?? 0), 0);
    const isGhostWolf = actor.system.tribe === "Ghost Wolves";
    return totalDots <= (isGhostWolf ? 1 : 2);
  }
};