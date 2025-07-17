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

export const rotesStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const spells = eligibleSpells(actor);
    const spellsJson = JSON.stringify(spells.map(s => ({
      id: s.id,
      name: s.name,
      arcanum: s.system.arcanum,
      level: s.system.level,
      roteSkills: s.system.roteSkill.split(", ").map(sk => sk.trim()),
      description: stripHtmlRegex(s.system.description)
    })));

    return `Select exactly 3 Rotes for this Mage: the Awakening character. Rotes are mastered spells, each associated with one Rote Skill from its list for casting bonuses.

• Choose 3 unique spells from the eligible list.
• For each, select one Rote Skill from its available roteSkills array.
• Return an object with:
  • **choices** – array of objects, each with:
    • **spellId** – the spell's id (string).
    • **roteSkill** – the chosen Rote Skill (string, exact from its roteSkills).

Eligible Spells:
\`\`\`json
${spellsJson}
\`\`\``;
  },
  tool: (actor) => {
    const spells = eligibleSpells(actor);
    const spellIds = spells.map(s => s.id);
    const allRoteSkills = new Set();
    spells.forEach(s => s.system.roteSkill.split(", ").map(sk => sk.trim()).forEach(sk => allRoteSkills.add(sk)));

    const schema = {
      type: "object",
      properties: {
        choices: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              spellId: { type: "string", enum: spellIds },
              roteSkill: { type: "string", enum: Array.from(allRoteSkills) }
            },
            required: ["spellId", "roteSkill"],
            additionalProperties: false
          }
        }
      },
      required: ["choices"],
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "generate_rotes",
        description: "Select 3 Rotes with chosen Rote Skills",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const spells = eligibleSpells(actor);
    const spellMap = new Map(spells.map(s => [s.id, s.system.roteSkill.split(",").map(sk => sk.trim())]));
    const spellIds = new Set(spellMap.keys());

    if (!Array.isArray(data.choices) || data.choices.length !== 3) {
      errors.push("choices must be an array of exactly 3 items");
    }

    const uniqueIds = new Set();
    data.choices.forEach(choice => {
      if (typeof choice !== "object" || !choice.spellId || !choice.roteSkill) {
        errors.push("Invalid choice object");
      }
      if (!spellIds.has(choice.spellId)) {
        errors.push(`Invalid spellId: ${choice.spellId}`);
      } else {
        const skills = spellMap.get(choice.spellId);
        if (!skills.includes(choice.roteSkill)) {
          errors.push(`Invalid roteSkill ${choice.roteSkill} for spell ${choice.spellId}`);
        }
      }
      if (uniqueIds.has(choice.spellId)) {
        errors.push(`Duplicate spellId: ${choice.spellId}`);
      }
      uniqueIds.add(choice.spellId);
    });

    return errors;
  },
  apply: async (actor, data) => {
    const itemsToAdd = data.choices.map(choice => {
      const spell = game.items.get(choice.spellId);
      if (!spell) return null;
      const spellObj = spell.toObject();
      spellObj.system.isBefouled = false;
      spellObj.system.isInured = false;
      spellObj.system.isPraxis = false;
      spellObj.system.isRote = true;
      spellObj.system.roteSkill = choice.roteSkill;
      spellObj.system.sourceId
      return spellObj;
    }).filter(item => item !== null);

    if (itemsToAdd.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToAdd);
    }
  },
  defaultChecked: (actor) => {
    return actor.items.filter(item => item.type === "spell" && item.system.isRote).length === 0;
  }
};