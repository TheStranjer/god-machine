import { stripHtmlRegex } from '../utils/strip-html-regex.js';

const eligibleSpells = (actor) => {
  const gross = actor.system.arcana_gross || {};
  const subtle = actor.system.arcana_subtle || {};
  const getDots = (arc) => {
    if (gross[arc]) return gross[arc].value || 0;
    if (subtle[arc]) return subtle[arc].value || 0;
    return 0;
  };
  return game.items.filter(item => item.type === "spell" && getDots(item.system.arcanum) >= item.system.level);
};

export const praxesStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const gnosis = actor.system.mage_traits.gnosis.value || 1;
    const spells = eligibleSpells(actor);
    const spellsJson = JSON.stringify(spells.map(s => ({
      id: s.id,
      name: s.name,
      arcanum: s.system.arcanum,
      level: s.system.level,
      description: stripHtmlRegex(s.system.description)
    })));

    return `Select exactly ${gnosis} Praxis/Praxes for this Mage: the Awakening character. Praxes are signature spells the mage has internalized, allowing exceptional success on 3 successes and costing 1 Mana to make Lasting.

• Choose ${gnosis} unique spells from the eligible list.
• Return an object with:
  • **choices** – array of strings (spell ids). Length exactly ${gnosis}.

Eligible Spells:
\`\`\`json
${spellsJson}
\`\`\``;
  },
  tool: (actor) => {
    const gnosis = actor.system.mage_traits.gnosis.value || 1;
    const spells = eligibleSpells(actor);
    const spellIds = spells.map(s => s.id);

    const schema = {
      type: "object",
      properties: {
        choices: {
          type: "array",
          minItems: gnosis,
          maxItems: gnosis,
          items: { type: "string", enum: spellIds }
        }
      },
      required: ["choices"],
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "generate_praxes",
        description: "Select Praxes equal to Gnosis",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const gnosis = actor.system.mage_traits.gnosis.value || 1;
    const spells = eligibleSpells(actor);
    const spellIds = new Set(spells.map(s => s.id));

    if (!Array.isArray(data.choices) || data.choices.length !== gnosis) {
      errors.push(`choices must be an array of exactly ${gnosis} items`);
    }

    const uniqueIds = new Set(data.choices);
    if (uniqueIds.size !== data.choices.length) {
      errors.push("Duplicate spell ids selected");
    }

    data.choices.forEach(id => {
      if (!spellIds.has(id)) {
        errors.push(`Invalid spell id: ${id}`);
      }
    });

    return errors;
  },
  apply: async (actor, data) => {
    const itemsToAdd = data.choices.map(id => {
      const spell = game.items.get(id);
      if (!spell) return null;
      const spellObj = spell.toObject();
      spellObj.system.isBefouled = false;
      spellObj.system.isInured = false;
      spellObj.system.isPraxis = true;
      spellObj.system.isRote = false;
      return spellObj;
    }).filter(item => item !== null);

    if (itemsToAdd.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToAdd);
    }
  },
  defaultChecked: (actor) => {
    return actor.items.filter(item => item.type === "spell" && item.system.isPraxis).length === 0;
  }
};