const calculateNumObsessions = (actor) => (actor.system.mage_traits.gnosis.value || 1) >= 3 ? 2 : 1;

export const obsessionsStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const numObsessions = calculateNumObsessions(actor);
    return `Generate ${numObsessions} Obsession(s) for this Mage: the Awakening character. Obsessions are long-term Aspirations related to magical mysteries, granting Arcane Beats and Mana upon progress or resolution.

• Base on the character's Path, Order, Arcana, Aspiration, and other sheet details to create thematic, mystical goals (e.g., "Uncover the secrets of the ancient Atlantean ruin" or "Master the interplay between Fate and Time").
• Return an object with:
  • **obsessions** – array of ${numObsessions} unique strings, each a concise Obsession description.`;
  },
  tool: (actor) => {
    const numObsessions = calculateNumObsessions(actor);
    return {
      type: "function",
      function: {
        name: "generate_obsessions",
        description: "Generate Obsessions based on Gnosis",
        parameters: {
          type: "object",
          properties: {
            obsessions: {
              type: "array",
              minItems: numObsessions,
              maxItems: numObsessions,
              items: { type: "string" }
            }
          },
          required: ["obsessions"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const numObsessions = calculateNumObsessions(actor);

    if (!Array.isArray(data.obsessions) || data.obsessions.length !== numObsessions) {
      errors.push(`obsessions must be an array of exactly ${numObsessions} items`);
    } else {
      data.obsessions.forEach(obs => {
        if (typeof obs !== "string" || obs.trim().length === 0) {
          errors.push("Each obsession must be a non-empty string");
        }
      });
      const unique = new Set(data.obsessions);
      if (unique.size !== data.obsessions.length) {
        errors.push("Obsessions must be unique");
      }
    }

    return errors;
  },
  apply: async (actor, data) => {
    const obsessionsString = data.obsessions.join("\n");
    await actor.update({ "system.obsessions": obsessionsString });
  },
  defaultChecked: (actor) => {
    return !actor.system.obsessions || actor.system.obsessions.trim() === "";
  }
};