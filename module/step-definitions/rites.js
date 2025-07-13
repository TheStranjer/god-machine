import { stripHtmlRegex } from '../utils/strip-html-regex.js';

const calculateEligibleRites = () => game.items.filter(item => item.type === 'werewolf_rite' && (item?.system?.level ?? 3) <= 2);

export const ritesStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const eligibleRites = calculateEligibleRites();
    
    const formatList = (rites) => eligibleRites.map(rite => ({
      id: rite.id,
      name: rite.name,
      description: stripHtmlRegex(rite.system.description),
      level: rite.system.level,
      riteType: rite.system.riteType,
      action: rite.system.action
    }));

    const ritesJson = JSON.stringify(formatList(eligibleRites));

    return `Select Rites for this Werewolf: the Forsaken character. The character gets exactly two dots in Rites.

• Select either two one-dot Rites (levels sum to 2) or one two-dot Rite (level 2).
• Do not select the same Rite more than once.
• Return an object with:
  • **choices** – an array of strings (Rite ids from the list). Length 1 or 2, depending on the combination.
• Ensure the total levels sum exactly to 2.

Eligible Rites:
\`\`\`json
${ritesJson}
\`\`\`
`;
  },
  tool: (actor) => {
    const eligibleRites = calculateEligibleRites();
    const riteIds = eligibleRites.map(r => r.id);

    const schema = {
      type: "object",
      properties: {
        choices: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: {
            type: "string",
            enum: riteIds
          }
        }
      },
      required: ["choices"],
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "generate_rites",
        description: "Choose eligible Rites totaling exactly 2 dots",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const eligibleRites = calculateEligibleRites();
    const riteMap = new Map(eligibleRites.map(r => [r.id, r.system.level]));
    const riteIds = new Set(riteMap.keys());

    if (!Array.isArray(data.choices)) {
      errors.push("choices must be an array");
      return errors;
    }

    if (data.choices.length !== 1 && data.choices.length !== 2) {
      errors.push("choices must have 1 or 2 items");
    }

    const uniqueIds = new Set(data.choices);
    if (uniqueIds.size !== data.choices.length) {
      errors.push("Duplicate Rites selected");
    }

    let totalLevels = 0;
    data.choices.forEach(id => {
      if (!riteIds.has(id)) {
        errors.push(`Invalid rite id: ${id}`);
      } else {
        totalLevels += riteMap.get(id);
      }
    });

    if (totalLevels !== 2) {
      errors.push(`Total Rite levels must be exactly 2 (current: ${totalLevels})`);
    }

    return errors;
  },
  apply: async (actor, data) => {
    const itemsToAdd = data.choices.map(id => {
      const rite = game.items.get(id);
      return rite ? rite.toObject() : null;
    }).filter(item => item !== null);

    if (itemsToAdd.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToAdd);
    }
  },
  defaultChecked: (actor) => {
    return actor.items.filter(item => item.type === "werewolf_rite").length === 0;
  }
};