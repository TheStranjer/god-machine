import { stripHtmlRegex } from '../utils/strip-html-regex.js';

const shadowByAuspice = {
  "Cahalith": ["Inspiration", "Knowledge"],
  "Elodoth": ["Insight", "Warding"],
  "Irraka": ["Evasion", "Stealth"],
  "Ithaeur": ["Elemental", "Shaping"],
  "Rahu": ["Dominance", "Strength"]
};

const shadowByTribe = {
  "Blood Talons": ["Inspiration", "Rage", "Strength"],
  "Bone Shadows": ["Death", "Elemental", "Insight"],
  "Hunters in Darkness": ["Nature", "Stealth", "Warding"],
  "Iron Masters": ["Knowledge", "Shaping", "Technology"],
  "Storm Lords": ["Evasion", "Dominance", "Weather"]
};

const renownByAuspice = {
  "Cahalith": "glory",
  "Elodoth": "honor",
  "Irraka": "cunning",
  "Ithaeur": "wisdom",
  "Rahu": "purity"
};

const moonGiftsByAuspice = {
  "Cahalith": "Gibbous Moon",
  "Elodoth": "Half Moon",
  "Irraka": "New Moon",
  "Ithaeur": "Crescent Moon",
  "Rahu": "Full Moon"
};

const renownToKey = {
  "Purity": "purity",
  "Glory": "glory",
  "Honor": "honor",
  "Wisdom": "wisdom",
  "Cunning": "cunning"
};

export const eligibleFacets = (actor) => {
  const auspice = actor.system.auspice;
  const tribe = actor.system.tribe;
  const allowedShadowGiftNames = new Set([
    ...(shadowByAuspice[auspice] || []),
    ...(shadowByTribe[tribe] || [])
  ]);

  const facets = game.items.filter(i => i.type === 'facet');
  const shadowFacets = facets.filter(f => f.system.giftType === 'shadow');
  const wolfFacets = facets.filter(f => f.system.giftType === 'wolf');

  const parseRenown = (name) => {
    const match = name.match(/\(([^)]+)\)$/);
    return match ? match[1].trim() : null;
  };

  const filterEligible = (facetsList) => facetsList.filter(f => {
    const renown = parseRenown(f.name);
    if (!renown) return false;
    const key = renownToKey[renown];
    if (!key) return false;
    return actor.system.werewolf_renown[key]?.value >= 1;
  });

  const eligibleShadow = filterEligible(shadowFacets).filter(f => {
    const giftName = f.system.gift.replace(/Gift of /i, "").trim();
    return allowedShadowGiftNames.has(giftName);
  });

  const eligibleWolf = filterEligible(wolfFacets);

  return { shadow: eligibleShadow, wolf: eligibleWolf };
};

const determineNeedsWolf = (auspiceRenown) => auspiceRenown < 2;

export const giftsStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const { shadow: eligibleShadow, wolf: eligibleWolf } = eligibleFacets(actor);
    const auspiceRenownKey = renownByAuspice[actor.system.auspice];
    const auspiceRenown = actor.system.werewolf_renown[auspiceRenownKey]?.value || 0;
    const needsWolf = determineNeedsWolf(auspiceRenown);

    const formatList = (facets) => facets.map(facet => ({
      id: facet.id,
      name: facet.name,
      description: stripHtmlRegex(facet.system.description),
      gift: facet.system.gift,
      giftType: facet.system.giftType,
      cost: facet.system.cost,
      action: facet.system.action,
      duration: facet.system.duration
    }));

    const shadowJson = JSON.stringify(formatList(eligibleShadow));
    const wolfJson = JSON.stringify(formatList(eligibleWolf));

    let wolfText = needsWolf 
      ? `• Since the character's Auspice Renown is less than 2, you must also select exactly one Wolf Facet.` 
      : '';

    let prompt = `Select Gifts for this Werewolf: the Forsaken character.

• Select exactly two Shadow Facets from the eligible list. They must be from different Shadow Gifts.${needsWolf ? "\n• Select exactly one Wolf Facet from the eligible list." : ''}
• Return an object with:
  • **shadowFacets** – an array of exactly two strings (Facet ids from the shadow list)
${needsWolf ? '  • **wolfFacet** – a string (Facet id from the wolf list)' : ''}

Eligible Shadow Facets:
\`\`\`json
${shadowJson}
\`\`\`
`;

  if (needsWolf) {
    prompt += `\n\nEligible Wolf Facets:\n\`\`\`json\n${wolfJson}\n\`\`\``
  }
  
  return prompt;
  },
  tool: (actor) => {
    const { shadow: eligibleShadow, wolf: eligibleWolf } = eligibleFacets(actor);
    const auspiceRenownKey = renownByAuspice[actor.system.auspice];
    const auspiceRenown = actor.system.werewolf_renown[auspiceRenownKey]?.value || 0;
    const needsWolf = determineNeedsWolf(auspiceRenown);

    const shadowIds = eligibleShadow.map(f => f.id);
    const wolfIds = eligibleWolf.map(f => f.id);

    const schema = {
      type: "object",
      properties: {
        shadowFacets: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          uniqueItems: true,
          items: {
            type: "string",
            enum: shadowIds
          }
        }
      },
      required: ["shadowFacets"],
      additionalProperties: false
    };

    if (needsWolf) {
      schema.properties.wolfFacet = { type: "string", enum: wolfIds };
      schema.required.push("wolfFacet");
    }

    return {
      type: "function",
      function: {
        name: "generate_gifts",
        description: needsWolf ? "Choose eligible Shadow and Wolf Facets" : "Choose eligible Shadow Facets",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const { shadow: eligibleShadow, wolf: eligibleWolf } = eligibleFacets(actor);
    const shadowIds = new Set(eligibleShadow.map(f => f.id));
    const wolfIds = new Set(eligibleWolf.map(f => f.id));
    const auspiceRenownKey = renownByAuspice[actor.system.auspice];
    const auspiceRenown = actor.system.werewolf_renown[auspiceRenownKey]?.value || 0;
    const needsWolf = determineNeedsWolf(auspiceRenown);

    if (!Array.isArray(data.shadowFacets) || data.shadowFacets.length !== 2) {
      errors.push("shadowFacets must be an array of exactly 2 ids");
    } else {
      const uniqueGifts = new Set(data.shadowFacets.map(id => {
        const facet = eligibleShadow.find(f => f.id === id);
        return facet ? facet.system.gift : null;
      }).filter(g => g));
      if (uniqueGifts.size !== 2) {
        errors.push("Selected Shadow Facets must be from different Gifts");
      }
      data.shadowFacets.forEach(id => {
        if (!shadowIds.has(id)) {
          errors.push(`Invalid shadowFacet id: ${id}`);
        }
      });
      if (new Set(data.shadowFacets).size !== 2) {
        errors.push("Duplicate Shadow Facets selected");
      }
    }

    if (needsWolf) {
      if (!data.wolfFacet || typeof data.wolfFacet !== "string") {
        errors.push("wolfFacet is required and must be a string");
      } else if (!wolfIds.has(data.wolfFacet)) {
        errors.push(`Invalid wolfFacet id: ${data.wolfFacet}`);
      }
    } else {
      if (data.wolfFacet) {
        errors.push("wolfFacet should not be selected when Auspice Renown >= 2");
      }
    }

    return errors;
  },
  apply: async (actor, data) => {
    const itemsToAdd = [];

    // Add selected Shadow Facets
    data.shadowFacets.forEach(id => {
      const facet = game.items.get(id);
      if (facet) {
        itemsToAdd.push(facet.toObject());
      }
    });

    // Add Wolf Facet if selected
    if (data.wolfFacet) {
      const facet = game.items.get(data.wolfFacet);
      if (facet) {
        itemsToAdd.push(facet.toObject());
      }
    }

    // Automatically add Moon Facets
    const auspice = actor.system.auspice;
    const moonGiftName = moonGiftsByAuspice[auspice];
    const auspiceRenownKey = renownByAuspice[auspice];
    const auspiceRenown = actor.system.werewolf_renown[auspiceRenownKey]?.value || 0;
    const maxMoonLevel = auspiceRenown >= 2 ? 2 : 1;

    const facets = game.items.filter(i => i.type === 'facet');
    const moonFacets = facets.filter(f => f.system.giftType === 'moon' && f.system.gift.includes(moonGiftName) && f.system.level <= maxMoonLevel);
    moonFacets.forEach(f => itemsToAdd.push(f.toObject()));

    if (itemsToAdd.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToAdd);
    }
  },
  defaultChecked: (actor) => {
    return actor.items.filter(item => item.type === "facet").length === 0;
  }
};