export const dedicatedMagicalToolStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const path = actor.system.path || "unknown";
    return `Generate a Dedicated Magical Tool for this Mage: the Awakening character, based on their Path (${path}) and personal details from the sheet (description, virtue, vice, aspirations, etc.). Dedicated Tools are mundane items with symbolic links to the Supernal Realms, adding +1 die to spellcasting as Yantras.

Each Path has five Tools, each with a specific function:
- Coins or symbols of material wealth: Represent construction, repair, inanimate or intangible lasting things. Closest to the Fallen World, used for manipulating money/resources.
- Cups or drinking vessels: Invoke healing, intuition, perceptual magic, gathering. Drinking from a shared cup spreads spells. Symbol of female sexuality (interpret based on mage).
- Mirrors (actual mirrors, polished plates, reflecting pools): Represent sight, soul, self. Used for spells on oneself.
- Rods, wands, or staves: Symbols of control, pointing to single out victims or hold as rulership/command. Symbol of male sexuality.
- Weapons (usually knives): Symbols of thought made action, for direct/decisive spells. Used to harm or master intellect/will over the world.

Choose one Tool type that fits the character's theme/Path. Then, create a short, descriptive name (e.g., "Silver Chalice of Insight") and a paragraph-long elaborate description incorporating personal symbolism, how it looks, its history/use, and why it resonates with the mage.

Return an object with:
- **toolType**: The chosen Tool type (exact: "Coins", "Cups", "Mirrors", "Rods", "Weapons").
- **name**: Short name for the tool (string).
- **description**: Elaborate description (string, about a paragraph).`;
  },
  tool: (actor) => {
    return {
      type: "function",
      function: {
        name: "generate_dedicated_tool",
        description: "Generate a Dedicated Magical Tool.",
        parameters: {
          type: "object",
          properties: {
            toolType: { type: "string", enum: ["Coins", "Cups", "Mirrors", "Rods", "Weapons"] },
            name: { type: "string" },
            description: { type: "string" }
          },
          required: ["toolType", "name", "description"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const toolTypes = ["Coins", "Cups", "Mirrors", "Rods", "Weapons"];
    if (!data.toolType || !toolTypes.includes(data.toolType)) {
      errors.push("Invalid toolType");
    }
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      errors.push("Name must be a non-empty string");
    }
    if (typeof data.description !== "string" || data.description.trim().length < 50) {
      errors.push("Description must be a string at least a paragraph long");
    }
    return errors;
  },
  apply: async (actor, data) => {
    const toolItem = {
      name: data.name,
      type: "equipment",
      img: "icons/svg/item-bag.svg", // Can customize based on type if desired
      system: {
        dicePool: {
          value: 0,
          attributes: [],
          macro: "",
          comment: ""
        },
        diceBonus: 1, // +1 as Yantra
        size: 1,
        equipped: true, // Assume dedicated tool is equipped
        isMagical: true,
        magicType: "Yantra",
        magicClass: "Dedicated Magical Tool",
        unlockAttribute: "",
        quantity: 1,
        durability: 1,
        structure: {
          value: 1,
          max: 1
        },
        mana: {
          value: 0,
          max: 0
        },
        description: data.description,
        availability: 1,
        effects: [],
        effectsActive: false,
        specialEffects: [],
        label: "Dedicated Magical Tool"
      }
    };

    await actor.createEmbeddedDocuments("Item", [toolItem]);
  },
  defaultChecked: (actor) => {
    return !actor.items.some(item => item.type === "equipment" && item.system.magicClass === "Dedicated Magical Tool");
  }
};