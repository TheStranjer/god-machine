// step-definitions/generate-spirit.js
import { stripHtmlRegex } from '../utils/strip-html-regex.js';

export const rankTable = [
  {rank: 0, traitLimit: 0, attrDotsMin: 0, attrDotsMax: 0, maxEssence: 5, numinaMin: 0, numinaMax: 0, title: "Muthra"},
  {rank: 1, traitLimit: 5, attrDotsMin: 5, attrDotsMax: 8, maxEssence: 10, numinaMin: 1, numinaMax: 3, title: "Hursih"},
  {rank: 2, traitLimit: 7, attrDotsMin: 9, attrDotsMax: 14, maxEssence: 15, numinaMin: 3, numinaMax: 5, title: "Hursah"},
  {rank: 3, traitLimit: 9, attrDotsMin: 15, attrDotsMax: 25, maxEssence: 20, numinaMin: 5, numinaMax: 7, title: "Ensih"},
  {rank: 4, traitLimit: 12, attrDotsMin: 26, attrDotsMax: 35, maxEssence: 25, numinaMin: 7, numinaMax: 9, title: "Ensah"},
  {rank: 5, traitLimit: 15, attrDotsMin: 36, attrDotsMax: 45, maxEssence: 50, numinaMin: 9, numinaMax: 11, title: "Dihir"}
];

const getRankData = (rank) => rankTable.find(r => r.rank === rank) || rankTable[0];

export const generateSpiritStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const rank = actor.system.eph_general.rank.value || 1;
    const rankData = getRankData(rank);
    const worldNumina = game.items.filter(item => item.type === "numen");
    const worldManifestations = game.items.filter(item => item.type === "manifestation");
    const numinaJson = JSON.stringify(formatItemList(worldNumina));
    const manifestationsJson = JSON.stringify(formatItemList(worldManifestations));

    return `Generate details for this Spirit based on its Rank ${rank}.

- Power, Finesse, and Resistance: Each between 1 and ${rankData.traitLimit}, total sum between ${rankData.attrDotsMin} and ${rankData.attrDotsMax}.
- Influences: Array of objects with name (concept the spirit influences) and rating (dots). Total ratings sum exactly to ${rank}. Ratings per influence 1 to ${rank}.
- Numina: Select ${rankData.numinaMin} to ${rankData.numinaMax} unique Numina from the list. Return array of IDs.
- Manifestations: Select exactly ${rank} unique Manifestations from the list (in addition to default Twilight Form). Return array of IDs.
- Ban: A behavioral compulsion the spirit must follow or avoid under certain conditions. Complexity increases with Rank: simple for low Rank, complex with severe consequences for high Rank.
- Bane: A physical substance or energy that harms the spirit symbolically. Common for low Rank, esoteric and specific for high Rank.
- Name: A suitable name for the spirit.
- Description: A brief description of the spirit's nature and appearance.
- Virtue: The spirit's Virtue.
- Vice: The spirit's Vice.

Eligible Numina:
${numinaJson}

Eligible Manifestations:
${manifestationsJson}

Return an object with the specified fields.`;
  },
  tool: (actor) => {
    const rank = actor.system.eph_general.rank.value || 1;
    const rankData = getRankData(rank);
    const worldNumina = game.items.filter(item => item.type === "numen");
    const worldManifestations = game.items.filter(item => item.type === "manifestation");
    const numinaIds = worldNumina.map(i => i.id);
    const manifestationIds = worldManifestations.map(i => i.id);

    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        virtue: { type: "string" },
        vice: { type: "string" },
        ban: { type: "string" },
        bane: { type: "string" },
        power: { type: "integer", minimum: 1, maximum: rankData.traitLimit },
        finesse: { type: "integer", minimum: 1, maximum: rankData.traitLimit },
        resistance: { type: "integer", minimum: 1, maximum: rankData.traitLimit },
        influences: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              rating: { type: "integer", minimum: 1, maximum: rank }
            },
            required: ["name", "rating"],
            additionalProperties: false
          }
        },
        numina: {
          type: "array",
          minItems: rankData.numinaMin,
          maxItems: rankData.numinaMax,
          items: { type: "string", enum: numinaIds }
        },
        manifestations: {
          type: "array",
          minItems: rank,
          maxItems: rank,
          items: { type: "string", enum: manifestationIds }
        }
      },
      required: ["name", "description", "virtue", "vice", "ban", "bane", "power", "finesse", "resistance", "influences", "numina", "manifestations"],
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "generate_spirit",
        description: "Generate spirit details based on Rank",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const rank = actor.system.eph_general.rank.value || 1;
    const rankData = getRankData(rank);
    const worldNuminaIds = new Set(game.items.filter(item => item.type === "numen").map(i => i.id));
    const worldManifestationIds = new Set(game.items.filter(item => item.type === "manifestation").map(i => i.id));

    // Attributes
    if (![data.power, data.finesse, data.resistance].every(n => Number.isInteger(n) && n >= 1 && n <= rankData.traitLimit)) {
      errors.push("Attributes must be integers between 1 and trait limit");
    }
    const attrSum = data.power + data.finesse + data.resistance;
    if (attrSum < rankData.attrDotsMin || attrSum > rankData.attrDotsMax) {
      errors.push(`Attribute sum must be between ${rankData.attrDotsMin} and ${rankData.attrDotsMax}`);
    }

    // Influences
    if (!Array.isArray(data.influences) || data.influences.length < 1) {
      errors.push("Influences must be a non-empty array");
    } else {
      let influenceSum = 0;
      data.influences.forEach(inf => {
        if (typeof inf !== "object" || !inf.name || !Number.isInteger(inf.rating) || inf.rating < 1 || inf.rating > rank) {
          errors.push("Invalid influence entry");
        }
        influenceSum += inf.rating;
      });
      if (influenceSum !== rank) {
        errors.push(`Influence ratings must sum to ${rank}`);
      }
    }

    // Numina
    if (!Array.isArray(data.numina) || data.numina.length < rankData.numinaMin || data.numina.length > rankData.numinaMax) {
      errors.push(`Numina count must be between ${rankData.numinaMin} and ${rankData.numinaMax}`);
    } else {
      const uniqueNumina = new Set(data.numina);
      if (uniqueNumina.size !== data.numina.length) {
        errors.push("Duplicate Numina IDs");
      }
      data.numina.forEach(id => {
        if (!worldNuminaIds.has(id)) {
          errors.push(`Invalid Numina ID: ${id}`);
        }
      });
    }

    // Manifestations
    if (!Array.isArray(data.manifestations) || data.manifestations.length !== rank) {
      errors.push(`Manifestations count must be exactly ${rank}`);
    } else {
      const uniqueManifest = new Set(data.manifestations);
      if (uniqueManifest.size !== data.manifestations.length) {
        errors.push("Duplicate Manifestation IDs");
      }
      data.manifestations.forEach(id => {
        if (!worldManifestationIds.has(id)) {
          errors.push(`Invalid Manifestation ID: ${id}`);
        }
      });
    }

    // Strings
    if (![data.name, data.description, data.virtue, data.vice, data.ban, data.bane].every(s => typeof s === "string" && s.trim().length > 0)) {
      errors.push("All string fields must be non-empty strings");
    }

    return errors;
  },
  apply: async (actor, data) => {
    const rank = actor.system.eph_general.rank.value || 1;
    const rankData = getRankData(rank);
    const size = rank; // Assume size = rank
    const corpus = data.resistance + size;
    const defense = (rank === 1) ? Math.max(data.power, data.finesse) : Math.min(data.power, data.finesse);
    const initiative = data.finesse + data.resistance;
    const speed = data.power + data.finesse; // Assume species factor 0
    const willpowerMax = data.resistance + data.finesse;
    const perception = data.power + data.finesse; // Assumption

    await actor.update({
      "name": data.name,
      "system.description": data.description,
      "system.virtue": data.virtue,
      "system.vice": data.vice,
      "system.bans": data.ban,
      "system.banes": data.bane,
      "system.eph_physical.power.value": data.power,
      "system.eph_social.finesse.value": data.finesse,
      "system.eph_mental.resistance.value": data.resistance,
      "system.essence.max": rankData.maxEssence,
      "system.essence.value": rankData.maxEssence,
      "system.rankName": rankData.title,
      "system.health.max": corpus,
      "system.health.value": corpus,
      "system.health.lethal": 0,
      "system.health.aggravated": 0,
      "system.willpower.max": willpowerMax,
      "system.willpower.value": willpowerMax,
      "system.derivedTraits.size.value": size,
      "system.derivedTraits.speed.value": speed,
      "system.derivedTraits.defense.value": defense,
      "system.derivedTraits.initiativeMod.value": initiative,
      "system.derivedTraits.perception.value": perception,
      "system.derivedTraits.health.value": corpus,
      "system.derivedTraits.willpower.value": willpowerMax
    });

    // Create influences
    const influenceItems = data.influences.map(inf => ({
      name: inf.name,
      type: "influence",
      img: "systems/mta/icons/placeholders/Influence.svg",
      system: {
        dicePool: {
          value: 0,
          attributes: ["eph_physical.power", "eph_social.finesse"],
          macro: "",
          comment: ""
        },
        description: `Influence over ${inf.name}`,
        rating: inf.rating
      }
    }));

    // Get numina and manifestations
    const numinaItems = game.items.filter(item => data.numina.includes(item.id) && item.type === "numen").map(item => item.toObject());
    const manifestationItems = game.items.filter(item => data.manifestations.includes(item.id) && item.type === "manifestation").map(item => item.toObject());

    const allItems = [...influenceItems, ...numinaItems, ...manifestationItems];

    if (allItems.length > 0) {
      await actor.createEmbeddedDocuments("Item", allItems);
    }
  },
  defaultChecked: (actor) => {
    const hasNumina = actor.items.some(item => item.type === "numen");
    const hasManifestations = actor.items.some(item => item.type === "manifestation");
    const hasInfluences = actor.items.some(item => item.type === "influence");
    return !hasNumina && !hasManifestations && !hasInfluences;
  }
};

const formatItemList = (items) => items.map(item => ({
  id: item.id,
  name: item.name,
  description: stripHtmlRegex(item.system.description || '')
}));