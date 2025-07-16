import { checkMeritPrerequisites } from "../../utils/check-merit-prerequisites.js";
import { stripHtmlRegex } from '../../utils/strip-html-regex.js';
import { getAvailableXP } from '../../utils/get-available-xp.js';

const parsePossibleRatings = (str) => {
  if (!str) return [];
  return str.split(',').map(part => Number(part.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
};

const parseRenownFromName = (name) => {
  const match = name.match(/\(([^)]+)\)$/);
  return match ? match[1].toLowerCase() : null;
};

const auspiceData = {
  "Cahalith": { renown: "glory", moon: "Gibbous Moon", shadowAffinities: ["Inspiration", "Knowledge"] },
  "Elodoth": { renown: "honor", moon: "Half Moon", shadowAffinities: ["Insight", "Warding"] },
  "Irraka": { renown: "cunning", moon: "New Moon", shadowAffinities: ["Evasion", "Stealth"] },
  "Ithaeur": { renown: "wisdom", moon: "Crescent Moon", shadowAffinities: ["Elemental", "Shaping"] },
  "Rahu": { renown: "purity", moon: "Full Moon", shadowAffinities: ["Dominance", "Strength"] }
};

const tribeData = {
  "Blood Talons": ["Dominance", "Rage", "Strength"],
  "Bone Shadows": ["Death", "Elemental", "Insight"],
  "Hunters in Darkness": ["Nature", "Stealth", "Warding"],
  "Iron Masters": ["Knowledge", "Shaping", "Technology"],
  "Storm Lords": ["Evasion", "Inspiration", "Weather"],
  "Ghost Wolves": [],
  // Pure tribes can be added if needed, e.g., "Fire-Touched": ["Disease", "Inspiration", "Weather"]
};

const moonToRenown = {};
Object.values(auspiceData).forEach(info => {
  moonToRenown[info.moon] = info.renown;
});

const renownTypes = ['cunning', 'glory', 'honor', 'purity', 'wisdom'];

const attributeCategories = {
  mental: ['intelligence', 'wits', 'resolve'],
  physical: ['strength', 'dexterity', 'stamina'],
  social: ['presence', 'manipulation', 'composure']
};

const skillCategories = {
  mental: ['academics', 'computer', 'crafts', 'investigation', 'medicine', 'occult', 'politics', 'science'],
  physical: ['athletics', 'brawl', 'drive', 'firearms', 'larceny', 'stealth', 'survival', 'weaponry'],
  social: ['animalKen', 'empathy', 'expression', 'intimidation', 'persuasion', 'socialize', 'streetwise', 'subterfuge']
};

const getCategory = (traitType, name) => {
  const categories = traitType === 'attribute' ? attributeCategories : skillCategories;
  for (const [cat, traits] of Object.entries(categories)) {
    if (traits.includes(name)) return cat;
  }
  return null;
};

const meritsRequiringSignifier = ['Status', 'Allies', 'Contacts', 'Resources', 'Safe Place', 'Staff', 'Mentor', 'Retainer', 'Alternate Identity']; // Anticipated additional common merits that typically require specifiers

const calculateCurrentRenown = (actor) => {
  const cr = {};
  renownTypes.forEach(r => {
    cr[r] = actor.system.werewolf_renown[r].value || 0;
  });

  return cr;
};

export const spendWerewolfExperienceStep = {
  maximumAttempts: (actor) => ( 3 ),
  prompt: (actor) => {
    const currentExp = getAvailableXP(actor);
    if (currentExp <= 0) return 'No Experience points to spend.';

    const auspice = actor.system.auspice || '';
    const tribe = actor.system.tribe || '';
    const auspiceInfo = auspiceData[auspice] || { renown: '', moon: '', shadowAffinities: [] };
    const tribeAffinities = tribeData[tribe] || [];
    const affinityShadowGifts = new Set([...auspiceInfo.shadowAffinities, ...tribeAffinities]);
    const isShadowAffinity = (gift) => affinityShadowGifts.has(gift);

    const primalUrge = actor.system.werewolf_traits.primalUrge.value || 0;
    const maxTrait = 5 + primalUrge;

    // Current renown
    const currentRenown = calculateCurrentRenown(actor);

    // Attributes
    const increasableAttributes = [];
    Object.entries(attributeCategories).forEach(([cat, attrs]) => {
      attrs.forEach(attr => {
        const value = actor.system[`attributes_${cat}`][attr].value || 0;
        if (value < maxTrait) increasableAttributes.push(attr);
      });
    });

    // Skills
    const increasableSkills = [];
    const skillsWithDots = [];
    Object.entries(skillCategories).forEach(([cat, sks]) => {
      sks.forEach(sk => {
        const value = actor.system[`skills_${cat}`][sk].value || 0;
        if (value < maxTrait) increasableSkills.push(sk);
        if (value >= 1) skillsWithDots.push(sk);
      });
    });

    // Merits
    const worldMerits = game.items.filter(item => item.type === "merit");
    const actorMerits = actor.items.filter(item => item.type === "merit");
    const hadMeritBaseNames = new Set(actorMerits.map(m => m.name.replace(/\s*\(.+\)$/, '')));
    const eligibleNewMerits = worldMerits.filter(m => !hadMeritBaseNames.has(m.name) && checkMeritPrerequisites(actor, m.system.prerequisites));
    const possibleNewMerits = eligibleNewMerits.filter(m => {
      const ratings = parsePossibleRatings(m.system.possibleRatings);
      return ratings.length > 0 && Math.min(...ratings) <= currentExp;
    });
    const newMeritsList = possibleNewMerits.map(m => ({
      id: m.id,
      name: m.name,
      possibleRatings: m.system.possibleRatings,
      minCost: Math.min(...parsePossibleRatings(m.system.possibleRatings)),
      prerequisites: m.system.prerequisites,
      description: stripHtmlRegex(m.system.description)
    }));
    const newMeritsJson = JSON.stringify(newMeritsList);

    const increasableMerits = actorMerits.filter(am => {
      const baseName = am.name.replace(/\s*\(.+\)$/, '');
      const worldM = worldMerits.find(w => w.name === baseName);
      if (!worldM) return false;
      const ratings = parsePossibleRatings(worldM.system.possibleRatings);
      const currentR = am.system.rating || 0;
      const nextR = ratings.find(r => r > currentR);
      if (!nextR) return false;
      return (nextR - currentR) <= currentExp;
    });
    const increaseMeritsList = increasableMerits.map(am => {
      const baseName = am.name.replace(/\s*\(.+\)$/, '');
      const worldM = worldMerits.find(w => w.name === baseName);
      const ratings = parsePossibleRatings(worldM.system.possibleRatings);
      const currentR = am.system.rating || 0;
      const nextR = ratings.find(r => r > currentR);
      return {
        id: am.id,
        name: am.name,
        currentRating: currentR,
        nextRating: nextR,
        cost: nextR - currentR
      };
    });
    const increaseMeritsJson = JSON.stringify(increaseMeritsList);

    // Rites
    const worldRites = game.items.filter(item => item.type === "rite");
    const actorRites = actor.items.filter(item => item.type === "rite");
    const hadRiteNames = new Set(actorRites.map(r => r.name));
    const eligibleRites = worldRites.filter(r => !hadRiteNames.has(r.name) && checkMeritPrerequisites(actor, r.system.prerequisites));
    const possibleRites = eligibleRites.filter(r => (r.system.rating || 0) <= currentExp);
    const ritesList = possibleRites.map(r => ({
      id: r.id,
      name: r.name,
      rating: r.system.rating,
      cost: r.system.rating,
      prerequisites: r.system.prerequisites,
      description: stripHtmlRegex(r.system.description)
    }));
    const ritesJson = JSON.stringify(ritesList);

    // Facets and Gifts
    const worldFacets = game.items.filter(item => item.type === "facet");
    const actorFacets = actor.items.filter(item => item.type === "facet");
    const giftsEntered = new Set(actorFacets.map(f => f.system.gift));
    const hadFacetNames = new Set(actorFacets.map(f => f.name));

    const affinityUnlockFacets = worldFacets.filter(f => f.system.giftType === "shadow" && isShadowAffinity(f.system.gift) && !giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const nonAffinityUnlockFacets = worldFacets.filter(f => f.system.giftType === "shadow" && !isShadowAffinity(f.system.gift) && !giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const addShadowFacets = worldFacets.filter(f => f.system.giftType === "shadow" && giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const addWolfFacets = worldFacets.filter(f => f.system.giftType === "wolf" && !hadFacetNames.has(f.name));

    const moonGifts = Object.keys(moonToRenown);
    const nonAuspiceMoonGifts = moonGifts.filter(g => g !== auspiceInfo.moon);
    const unlockMoonGifts = nonAuspiceMoonGifts.filter(g => !giftsEntered.has(g) && currentRenown[moonToRenown[g]] >= 1);
    const addMoonGifts = nonAuspiceMoonGifts.filter(g => {
      const currentLevel = actorFacets.filter(f => f.system.gift === g && f.system.giftType === "moon").length;
      return giftsEntered.has(g) && currentLevel < currentRenown[moonToRenown[g]];
    });

    // Renown
    const increasableRenown = renownTypes.filter(r => currentRenown[r] < 5);
    const possibleFacetsPerRenown = {};
    renownTypes.forEach(r => {
      possibleFacetsPerRenown[r] = worldFacets.filter(f => (f.system.giftType === "shadow" || f.system.giftType === "wolf") && parseRenownFromName(f.name) === r && !hadFacetNames.has(f.name));
    });
    const availableRenown = increasableRenown.filter(r => possibleFacetsPerRenown[r].length > 0);
    const renownFacetsList = {};
    availableRenown.forEach(r => {
      renownFacetsList[r] = possibleFacetsPerRenown[r].map(f => ({
        id: f.id,
        name: f.name,
        gift: f.system.gift,
        giftType: f.system.giftType,
        description: stripHtmlRegex(f.system.description)
      }));
    });
    const renownFacetsJson = JSON.stringify(renownFacetsList);

    const affinityUnlockFacetsList = affinityUnlockFacets.map(f => ({
      id: f.id,
      name: f.name,
      gift: f.system.gift,
      description: stripHtmlRegex(f.system.description)
    }));
    const affinityUnlockJson = JSON.stringify(affinityUnlockFacetsList);

    const nonAffinityUnlockFacetsList = nonAffinityUnlockFacets.map(f => ({
      id: f.id,
      name: f.name,
      gift: f.system.gift,
      description: stripHtmlRegex(f.system.description)
    }));
    const nonAffinityUnlockJson = JSON.stringify(nonAffinityUnlockFacetsList);

    const addShadowFacetsList = addShadowFacets.map(f => ({
      id: f.id,
      name: f.name,
      gift: f.system.gift,
      description: stripHtmlRegex(f.system.description)
    }));
    const addShadowJson = JSON.stringify(addShadowFacetsList);

    const addWolfFacetsList = addWolfFacets.map(f => ({
      id: f.id,
      name: f.name,
      gift: f.system.gift,
      description: stripHtmlRegex(f.system.description)
    }));
    const addWolfJson = JSON.stringify(addWolfFacetsList);

    let promptText = `Choose one Experience expenditure for this Werewolf character. You have ${currentExp} Experience points (each expenditure deducts the cost from your total).

• Expenditures must follow Werewolf: The Forsaken 2nd Edition rules for unlocking/buying with Experience.
• Gifts are unlocked by buying their first Facet (affinity Shadow: 3, non-affinity Shadow: 5). Additional Facets in unlocked Gifts cost 2. Wolf Gifts are always unlocked; Facets cost 1.
• Moon Gifts: Auspice Moon Gift Facets are gained free with auspice Renown increases. Other Moon Gifts unlock with 5 for first Facet, 2 for each subsequent (in order, max = associated Renown dots).
• Renown increases (3) require choosing a Facet of that Renown in any Shadow or Wolf Gift (can unlock new Gift). If auspice Renown, also gain next auspice Moon Facet free.
• Only choose options you can afford and that are available.

Available options:`;

    if (currentExp >= 4 && increasableAttributes.length > 0) {
      promptText += `\n• Increase an Attribute (4 Experience). Available: ${increasableAttributes.join(', ')}.`;
    }

    if (currentExp >= 2 && increasableSkills.length > 0) {
      promptText += `\n• Increase a Skill (2 Experience). Available: ${increasableSkills.join(', ')}.`;
    }

    if (currentExp >= 1 && skillsWithDots.length > 0) {
      promptText += `\n• Add a Skill Specialty (1 Experience). Available skills: ${skillsWithDots.join(', ')}. Provide a specialty string (1-50 characters).`;
    }

    if (possibleNewMerits.length > 0) {
      promptText += `\n• Buy new Merit at minimum rating (cost = min rating). Some require signifier (1-30 characters). Available:\n\`\`\`json\n${newMeritsJson}\n\`\`\``;
    }

    if (increasableMerits.length > 0) {
      promptText += `\n• Increase existing Merit to next rating (cost = difference). Available:\n\`\`\`json\n${increaseMeritsJson}\n\`\`\``;
    }

    if (currentExp >= 5 && primalUrge < 10) {
      promptText += `\n• Increase Primal Urge (5 Experience).`;
    }

    if (currentExp >= 3 && availableRenown.length > 0) {
      promptText += `\n• Increase Renown (3 Experience), choosing Facet of that Renown. Available per Renown:\n\`\`\`json\n${renownFacetsJson}\n\`\`\``;
    }

    if (currentExp >= 3 && affinityUnlockFacets.length > 0) {
      promptText += `\n• Unlock affinity Shadow Gift with first Facet (3 Experience). Available Facets:\n\`\`\`json\n${affinityUnlockJson}\n\`\`\``;
    }

    if (currentExp >= 5 && nonAffinityUnlockFacets.length > 0) {
      promptText += `\n• Unlock non-affinity Shadow Gift with first Facet (5 Experience). Available Facets:\n\`\`\`json\n${nonAffinityUnlockJson}\n\`\`\``;
    }

    if (currentExp >= 2 && addShadowFacets.length > 0) {
      promptText += `\n• Add Facet to unlocked Shadow Gift (2 Experience). Available Facets:\n\`\`\`json\n${addShadowJson}\n\`\`\``;
    }

    if (currentExp >= 1 && addWolfFacets.length > 0) {
      promptText += `\n• Add Facet to Wolf Gift (1 Experience). Available Facets:\n\`\`\`json\n${addWolfJson}\n\`\`\``;
    }

    if (currentExp >= 5 && unlockMoonGifts.length > 0) {
      promptText += `\n• Unlock non-auspice Moon Gift with first Facet (5 Experience). Available: ${unlockMoonGifts.join(', ')}.`;
    }

    if (currentExp >= 2 && addMoonGifts.length > 0) {
      promptText += `\n• Add next Facet to unlocked non-auspice Moon Gift (2 Experience). Available: ${addMoonGifts.join(', ')}.`;
    }

    if (possibleRites.length > 0) {
      promptText += `\n• Buy Rite (cost = dots). Available:\n\`\`\`json\n${ritesJson}\n\`\`\``;
    }

    promptText += `\n\nReturn an object named **choice** with the selected expenditure.`;

    return promptText;
  },
  tool: (actor) => {
    const currentExp = getAvailableXP(actor);

    const auspice = actor.system.auspice || '';
    const tribe = actor.system.tribe || '';
    const auspiceInfo = auspiceData[auspice] || { renown: '', moon: '', shadowAffinities: [] };
    const tribeAffinities = tribeData[tribe] || [];
    const affinityShadowGifts = new Set([...auspiceInfo.shadowAffinities, ...tribeAffinities]);
    const isShadowAffinity = (gift) => affinityShadowGifts.has(gift);

    const primalUrge = actor.system.werewolf_traits.primalUrge.value || 0;
    const maxTrait = 5 + primalUrge;

    const currentRenown = calculateCurrentRenown(actor);

    const increasableAttributes = [];
    Object.entries(attributeCategories).forEach(([cat, attrs]) => {
      attrs.forEach(attr => {
        const value = actor.system[`attributes_${cat}`][attr].value || 0;
        if (value < maxTrait) increasableAttributes.push(attr);
      });
    });

    const increasableSkills = [];
    const skillsWithDots = [];
    Object.entries(skillCategories).forEach(([cat, sks]) => {
      sks.forEach(sk => {
        const value = actor.system[`skills_${cat}`][sk].value || 0;
        if (value < maxTrait) increasableSkills.push(sk);
        if (value >= 1) skillsWithDots.push(sk);
      });
    });

    const worldMerits = game.items.filter(item => item.type === "merit");
    const actorMerits = actor.items.filter(item => item.type === "merit");
    const hadMeritBaseNames = new Set(actorMerits.map(m => m.name.replace(/\s*\(.+\)$/, '')));
    const eligibleNewMerits = worldMerits.filter(m => !hadMeritBaseNames.has(m.name) && checkMeritPrerequisites(actor, m.system.prerequisites));
    const possibleNewMerits = eligibleNewMerits.filter(m => {
      const ratings = parsePossibleRatings(m.system.possibleRatings);
      return ratings.length > 0 && Math.min(...ratings) <= currentExp;
    });

    const increasableMerits = actorMerits.filter(am => {
      const baseName = am.name.replace(/\s*\(.+\)$/, '');
      const worldM = worldMerits.find(w => w.name === baseName);
      if (!worldM) return false;
      const ratings = parsePossibleRatings(worldM.system.possibleRatings);
      const currentR = am.system.rating || 0;
      const nextR = ratings.find(r => r > currentR);
      if (!nextR) return false;
      return (nextR - currentR) <= currentExp;
    });

    const worldRites = game.items.filter(item => item.type === "rite");
    const actorRites = actor.items.filter(item => item.type === "rite");
    const hadRiteNames = new Set(actorRites.map(r => r.name));
    const eligibleRites = worldRites.filter(r => !hadRiteNames.has(r.name) && checkMeritPrerequisites(actor, r.system.prerequisites));
    const possibleRites = eligibleRites.filter(r => (r.system.rating || 0) <= currentExp);

    const worldFacets = game.items.filter(item => item.type === "facet");
    const actorFacets = actor.items.filter(item => item.type === "facet");
    const giftsEntered = new Set(actorFacets.map(f => f.system.gift));
    const hadFacetNames = new Set(actorFacets.map(f => f.name));

    const affinityUnlockFacets = worldFacets.filter(f => f.system.giftType === "shadow" && isShadowAffinity(f.system.gift) && !giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const nonAffinityUnlockFacets = worldFacets.filter(f => f.system.giftType === "shadow" && !isShadowAffinity(f.system.gift) && !giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const addShadowFacets = worldFacets.filter(f => f.system.giftType === "shadow" && giftsEntered.has(f.system.gift) && !hadFacetNames.has(f.name));
    const addWolfFacets = worldFacets.filter(f => f.system.giftType === "wolf" && !hadFacetNames.has(f.name));

    const moonGifts = Object.keys(moonToRenown);
    const nonAuspiceMoonGifts = moonGifts.filter(g => g !== auspiceInfo.moon);
    const unlockMoonGifts = nonAuspiceMoonGifts.filter(g => !giftsEntered.has(g) && currentRenown[moonToRenown[g]] >= 1);
    const addMoonGifts = nonAuspiceMoonGifts.filter(g => {
      const currentLevel = actorFacets.filter(f => f.system.gift === g && f.system.giftType === "moon").length;
      return giftsEntered.has(g) && currentLevel < currentRenown[moonToRenown[g]];
    });

    const increasableRenown = renownTypes.filter(r => currentRenown[r] < 5);
    const possibleFacetsPerRenown = {};
    renownTypes.forEach(r => {
      possibleFacetsPerRenown[r] = worldFacets.filter(f => (f.system.giftType === "shadow" || f.system.giftType === "wolf") && parseRenownFromName(f.name) === r && !hadFacetNames.has(f.name));
    });
    const availableRenown = increasableRenown.filter(r => possibleFacetsPerRenown[r].length > 0);

    const allRenownFacetIds = new Set();
    Object.values(possibleFacetsPerRenown).flat().forEach(f => allRenownFacetIds.add(f.id));

    const anyOf = [];

    if (currentExp >= 4 && increasableAttributes.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_attribute" },
          attribute: { enum: increasableAttributes }
        },
        required: ["type", "attribute"],
        additionalProperties: false
      });
    }

    if (currentExp >= 2 && increasableSkills.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_skill" },
          skill: { enum: increasableSkills }
        },
        required: ["type", "skill"],
        additionalProperties: false
      });
    }

    if (currentExp >= 1 && skillsWithDots.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "add_skill_specialty" },
          skill: { enum: skillsWithDots },
          specialty: { type: "string", minLength: 1, maxLength: 50 }
        },
        required: ["type", "skill", "specialty"],
        additionalProperties: false
      });
    }

    if (possibleNewMerits.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "buy_new_merit" },
          meritId: { enum: possibleNewMerits.map(m => m.id) },
          signifier: { type: "string", minLength: 1, maxLength: 30 }
        },
        required: ["type", "meritId"],
        additionalProperties: false
      });
    }

    if (increasableMerits.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_merit" },
          meritId: { enum: increasableMerits.map(m => m.id) }
        },
        required: ["type", "meritId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 5 && primalUrge < 10) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_primal_urge" }
        },
        required: ["type"],
        additionalProperties: false
      });
    }

    if (currentExp >= 3 && availableRenown.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_renown" },
          renown: { enum: availableRenown },
          facetId: { enum: Array.from(allRenownFacetIds) }
        },
        required: ["type", "renown", "facetId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 3 && affinityUnlockFacets.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "unlock_affinity_shadow" },
          facetId: { enum: affinityUnlockFacets.map(f => f.id) }
        },
        required: ["type", "facetId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 5 && nonAffinityUnlockFacets.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "unlock_non_affinity_shadow" },
          facetId: { enum: nonAffinityUnlockFacets.map(f => f.id) }
        },
        required: ["type", "facetId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 2 && addShadowFacets.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "add_shadow_facet" },
          facetId: { enum: addShadowFacets.map(f => f.id) }
        },
        required: ["type", "facetId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 1 && addWolfFacets.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "add_wolf_facet" },
          facetId: { enum: addWolfFacets.map(f => f.id) }
        },
        required: ["type", "facetId"],
        additionalProperties: false
      });
    }

    if (currentExp >= 5 && unlockMoonGifts.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "unlock_moon_gift" },
          moonGift: { enum: unlockMoonGifts }
        },
        required: ["type", "moonGift"],
        additionalProperties: false
      });
    }

    if (currentExp >= 2 && addMoonGifts.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "add_moon_facet" },
          moonGift: { enum: addMoonGifts }
        },
        required: ["type", "moonGift"],
        additionalProperties: false
      });
    }

    if (possibleRites.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "buy_rite" },
          riteId: { enum: possibleRites.map(r => r.id) }
        },
        required: ["type", "riteId"],
        additionalProperties: false
      });
    }

    const schema = {
      type: "object",
      properties: {
        choice: {
          anyOf: anyOf.length > 0 ? anyOf : [{ type: "object" }] // Fallback if no options
        }
      },
      required: ["choice"],
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "spend_experience",
        description: "Choose one valid Experience expenditure for the Werewolf character",
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    if (!data.choice) {
      errors.push("Choice is required");
      return errors;
    }
    const choice = data.choice;
    const type = choice.type;
    if (!type) {
      errors.push("Type is required");
      return errors;
    }

    const currentExp = getAvailableXP(actor);

    const auspice = actor.system.auspice || '';
    const auspiceInfo = auspiceData[auspice] || { renown: '', moon: '', shadowAffinities: [] };

    const currentRenown = calculateCurrentRenown(actor);

    const primalUrge = actor.system.werewolf_traits.primalUrge.value || 0;
    const maxTrait = 5 + primalUrge;

    let cost = 0;

    switch (type) {
      case "increase_attribute":
        const attribute = choice.attribute;
        if (!attribute) errors.push("Attribute required");
        const attrCat = getCategory('attribute', attribute);
        if (!attrCat) errors.push("Invalid attribute");
        const attrValue = actor.system[`attributes_${attrCat}`][attribute].value || 0;
        if (attrValue >= maxTrait) errors.push("Attribute at maximum");
        cost = 4;
        break;
      case "increase_skill":
        const skill = choice.skill;
        if (!skill) errors.push("Skill required");
        const skillCat = getCategory('skill', skill);
        if (!skillCat) errors.push("Invalid skill");
        const skillValue = actor.system[`skills_${skillCat}`][skill].value || 0;
        if (skillValue >= maxTrait) errors.push("Skill at maximum");
        cost = 2;
        break;
      case "add_skill_specialty":
        const specSkill = choice.skill;
        const specialty = choice.specialty;
        if (!specSkill) errors.push("Skill required");
        if (!specialty || specialty.length < 1 || specialty.length > 50) errors.push("Valid specialty string required (1-50 characters)");
        const specCat = getCategory('skill', specSkill);
        if (!specCat) errors.push("Invalid skill");
        const specValue = actor.system[`skills_${specCat}`][specSkill].value || 0;
        if (specValue < 1) errors.push("Skill must have at least 1 dot");
        const currentSpecialties = actor.system[`skills_${specCat}`][specSkill].specialties || [];
        if (currentSpecialties.includes(specialty)) errors.push("Specialty already exists for this skill");
        cost = 1;
        break;
      case "buy_new_merit":
        const meritId = choice.meritId;
        if (!meritId) errors.push("meritId required");
        const merit = game.items.get(meritId);
        if (!merit || merit.type !== "merit") errors.push("Invalid merit");
        if (!checkMeritPrerequisites(actor, merit.system.prerequisites)) errors.push("Merit prerequisites not met");
        const ratings = parsePossibleRatings(merit.system.possibleRatings);
        if (ratings.length === 0) errors.push("No possible ratings for merit");
        const minRating = ratings[0]; // sorted asc
        cost = minRating;
        const needsSignifier = meritsRequiringSignifier.includes(merit.name);
        const signifier = choice.signifier;
        if (needsSignifier && (!signifier || signifier.length < 1 || signifier.length > 30)) errors.push("Signifier required for this merit (1-30 characters)");
        if (!needsSignifier && signifier) {
          // Allow optional signifier even if not required, as per caution in meritsStep prompt
        }
        break;
      case "increase_merit":
        const incMeritId = choice.meritId;
        if (!incMeritId) errors.push("meritId required");
        const actorMerit = actor.items.get(incMeritId);
        if (!actorMerit || actorMerit.type !== "merit") errors.push("Invalid actor merit");
        const baseName = actorMerit.name.replace(/\s*\(.+\)$/, '');
        const worldMerit = game.items.find(i => i.type === "merit" && i.name === baseName);
        if (!worldMerit) errors.push("Corresponding world merit not found");
        const incRatings = parsePossibleRatings(worldMerit.system.possibleRatings);
        const currentRating = actorMerit.system.rating || 0;
        const nextRating = incRatings.find(r => r > currentRating);
        if (!nextRating) errors.push("No higher rating available");
        cost = nextRating - currentRating;
        break;
      case "increase_primal_urge":
        if (primalUrge >= 10) errors.push("Primal Urge at maximum");
        cost = 5;
        break;
      case "increase_renown":
        const renown = choice.renown;
        if (!renown) errors.push("renown required");
        if (!renownTypes.includes(renown)) errors.push("Invalid renown type");
        const renValue = currentRenown[renown];
        if (renValue >= 5) errors.push("Renown at maximum");
        const facetId = choice.facetId;
        if (!facetId) errors.push("facetId required");
        const renownFacet = game.items.get(facetId);
        if (!renownFacet || renownFacet.type !== "facet") errors.push("Invalid facet");
        if (renownFacet.system.giftType !== "shadow" && renownFacet.system.giftType !== "wolf") errors.push("Facet must be Shadow or Wolf Gift");
        const facetRenown = parseRenownFromName(renownFacet.name);
        if (facetRenown !== renown) errors.push("Facet does not match renown type");
        if (actor.items.find(i => i.type === "facet" && i.name === renownFacet.name)) errors.push("Facet already owned");
        cost = 3;
        break;
      case "unlock_affinity_shadow":
        const affFacetId = choice.facetId;
        if (!affFacetId) errors.push("facetId required");
        const affFacet = game.items.get(affFacetId);
        if (!affFacet || affFacet.type !== "facet") errors.push("Invalid facet");
        if (affFacet.system.giftType !== "shadow") errors.push("Must be Shadow Gift");
        if (giftsEntered.has(affFacet.system.gift)) errors.push("Gift already unlocked");
        if (!isShadowAffinity(affFacet.system.gift)) errors.push("Not an affinity Shadow Gift");
        if (actor.items.find(i => i.type === "facet" && i.name === affFacet.name)) errors.push("Facet already owned");
        cost = 3;
        break;
      case "unlock_non_affinity_shadow":
        const nonAffFacetId = choice.facetId;
        if (!nonAffFacetId) errors.push("facetId required");
        const nonAffFacet = game.items.get(nonAffFacetId);
        if (!nonAffFacet || nonAffFacet.type !== "facet") errors.push("Invalid facet");
        if (nonAffFacet.system.giftType !== "shadow") errors.push("Must be Shadow Gift");
        if (giftsEntered.has(nonAffFacet.system.gift)) errors.push("Gift already unlocked");
        if (isShadowAffinity(nonAffFacet.system.gift)) errors.push("Is an affinity Shadow Gift");
        if (actor.items.find(i => i.type === "facet" && i.name === nonAffFacet.name)) errors.push("Facet already owned");
        cost = 5;
        break;
      case "add_shadow_facet":
        const shadowFacetId = choice.facetId;
        if (!shadowFacetId) errors.push("facetId required");
        const shadowFacet = game.items.get(shadowFacetId);
        if (!shadowFacet || shadowFacet.type !== "facet") errors.push("Invalid facet");
        if (shadowFacet.system.giftType !== "shadow") errors.push("Must be Shadow Gift");
        if (!giftsEntered.has(shadowFacet.system.gift)) errors.push("Gift not unlocked");
        if (actor.items.find(i => i.type === "facet" && i.name === shadowFacet.name)) errors.push("Facet already owned");
        cost = 2;
        break;
      case "add_wolf_facet":
        const wolfFacetId = choice.facetId;
        if (!wolfFacetId) errors.push("facetId required");
        const wolfFacet = game.items.get(wolfFacetId);
        if (!wolfFacet || wolfFacet.type !== "facet") errors.push("Invalid facet");
        if (wolfFacet.system.giftType !== "wolf") errors.push("Must be Wolf Gift");
        if (actor.items.find(i => i.type === "facet" && i.name === wolfFacet.name)) errors.push("Facet already owned");
        cost = 1;
        break;
      case "unlock_moon_gift":
        const unlockMoon = choice.moonGift;
        if (!unlockMoon) errors.push("moonGift required");
        if (!Object.keys(moonToRenown).includes(unlockMoon)) errors.push("Invalid Moon Gift");
        if (unlockMoon === auspiceInfo.moon) errors.push("Cannot unlock auspice Moon Gift with Experience");
        if (giftsEntered.has(unlockMoon)) errors.push("Moon Gift already unlocked");
        const unlockRenown = moonToRenown[unlockMoon];
        if (currentRenown[unlockRenown] < 1) errors.push("Associated renown too low");
        const level1Facet = game.items.find(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === unlockMoon && i.system.level === 1);
        if (!level1Facet) errors.push("Level 1 Facet not found for this Moon Gift");
        cost = 5;
        break;
      case "add_moon_facet":
        const addMoon = choice.moonGift;
        if (!addMoon) errors.push("moonGift required");
        if (!Object.keys(moonToRenown).includes(addMoon)) errors.push("Invalid Moon Gift");
        if (addMoon === auspiceInfo.moon) errors.push("Cannot add to auspice Moon Gift with Experience");
        if (!giftsEntered.has(addMoon)) errors.push("Moon Gift not unlocked");
        const addCurrentLevel = actor.items.filter(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === addMoon).length;
        const nextMoonLevel = addCurrentLevel + 1;
        const addRenown = moonToRenown[addMoon];
        if (currentRenown[addRenown] < nextMoonLevel) errors.push("Associated renown too low for next Facet");
        const nextMoonFacet = game.items.find(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === addMoon && i.system.level === nextMoonLevel);
        if (!nextMoonFacet) errors.push("Next level Facet not found for this Moon Gift");
        cost = 2;
        break;
      case "buy_rite":
        const riteId = choice.riteId;
        if (!riteId) errors.push("riteId required");
        const rite = game.items.get(riteId);
        if (!rite || rite.type !== "rite") errors.push("Invalid rite");
        if (!checkMeritPrerequisites(actor, rite.system.prerequisites)) errors.push("Rite prerequisites not met");
        if (actor.items.find(i => i.type === "rite" && i.name === rite.name)) errors.push("Rite already owned");
        const riteRating = rite.system.rating || 0;
        if (riteRating <= 0) errors.push("Invalid rite rating");
        cost = riteRating;
        break;
      default:
        errors.push("Invalid choice type");
    }

    if (cost > currentExp) errors.push("Not enough Experience for this choice");

    return errors;
  },
  apply: async (actor, data) => {
    const choice = data.choice;
    const type = choice.type;

    let cost = 0;
    let reason = "";

    const updateData = { system: {} };

    switch (type) {
      case "increase_attribute":
        const attribute = choice.attribute;
        const attrCat = getCategory('attribute', attribute);
        const attrPath = `system.attributes_${attrCat}.${attribute}.value`;
        const attrValue = foundry.utils.getProperty(actor, attrPath) || 0;
        foundry.utils.setProperty(updateData, attrPath, attrValue + 1);
        cost = 4;
        reason = `increase Attribute ${attribute}`;
        break;
      case "increase_skill":
        const skill = choice.skill;
        const skillCat = getCategory('skill', skill);
        const skillPath = `system.skills_${skillCat}.${skill}.value`;
        const skillValue = foundry.utils.getProperty(actor, skillPath) || 0;
        foundry.utils.setProperty(updateData, skillPath, skillValue + 1);
        cost = 2;
        reason = `increase Skill ${skill}`;
        break;
      case "add_skill_specialty":
        const specSkill = choice.skill;
        const specialty = choice.specialty;
        const specCat = getCategory('skill', specSkill);
        const specPath = `system.skills_${specCat}.${specSkill}.specialties`;
        const currentSpecialties = foundry.utils.getProperty(actor, specPath) || [];
        foundry.utils.setProperty(updateData, specPath, [...currentSpecialties, specialty]);
        cost = 1;
        reason = `add Skill Specialty ${specialty} to ${specSkill}`;
        break;
      case "buy_new_merit":
        const merit = game.items.get(choice.meritId);
        const ratings = parsePossibleRatings(merit.system.possibleRatings);
        const minRating = ratings[0];
        const meritData = {
          type: "merit",
          name: choice.signifier ? `${merit.name} (${choice.signifier})` : merit.name,
          system: JSON.parse(JSON.stringify(merit.system))
        };
        meritData.system.rating = minRating;
        await actor.createEmbeddedDocuments("Item", [meritData]);
        cost = minRating;
        reason = `buy new Merit ${meritData.name}`;
        break;
      case "increase_merit":
        const actorMerit = actor.items.get(choice.meritId);
        const baseName = actorMerit.name.replace(/\s*\(.+\)$/, '');
        const worldMerit = game.items.find(i => i.type === "merit" && i.name === baseName);
        const incRatings = parsePossibleRatings(worldMerit.system.possibleRatings);
        const currentRating = actorMerit.system.rating || 0;
        const nextRating = incRatings.find(r => r > currentRating);
        await actor.updateEmbeddedDocuments("Item", [{ _id: actorMerit.id, "system.rating": nextRating }]);
        cost = nextRating - currentRating;
        reason = `increase Merit ${actorMerit.name}`;
        break;
      case "increase_primal_urge":
        const puPath = 'system.werewolf_traits.primalUrge.value';
        const puValue = foundry.utils.getProperty(actor, puPath) || 0;
        foundry.utils.setProperty(updateData, puPath, puValue + 1);
        cost = 5;
        reason = `increase Primal Urge`;
        break;
      case "increase_renown":
        const renown = choice.renown;
        const renPath = `system.werewolf_renown.${renown}.value`;
        const renValue = foundry.utils.getProperty(actor, renPath) || 0;
        foundry.utils.setProperty(updateData, renPath, renValue + 1);
        const renownFacet = game.items.get(choice.facetId);
        await actor.createEmbeddedDocuments("Item", [renownFacet.toObject()]);
        const auspiceInfo = auspiceData[actor.system.auspice];
        if (renown === auspiceInfo.renown) {
          const moonGift = auspiceInfo.moon;
          const newMoonLevel = renValue + 1;
          const moonFacet = game.items.find(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === moonGift && i.system.level === newMoonLevel);
          if (moonFacet) {
            await actor.createEmbeddedDocuments("Item", [moonFacet.toObject()]);
          }
        }
        cost = 3;
        reason = `increase ${renown}`;
        break;
      case "unlock_affinity_shadow":
      case "unlock_non_affinity_shadow":
      case "add_shadow_facet":
        const shadowFacet = game.items.get(choice.facetId);
        await actor.createEmbeddedDocuments("Item", [shadowFacet.toObject()]);
        cost = type === "unlock_affinity_shadow" ? 3 : (type === "unlock_non_affinity_shadow" ? 5 : 2);
        reason = `add Shadow Facet ${shadowFacet.name}`;
        break;
      case "add_wolf_facet":
        const wolfFacet = game.items.get(choice.facetId);
        await actor.createEmbeddedDocuments("Item", [wolfFacet.toObject()]);
        cost = 1;
        reason = `add Wolf Facet ${wolfFacet.name}`;
        break;
      case "unlock_moon_gift":
        const unlockMoon = choice.moonGift;
        const level1Facet = game.items.find(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === unlockMoon && i.system.level === 1);
        if (level1Facet) {
          await actor.createEmbeddedDocuments("Item", [level1Facet.toObject()]);
        }
        cost = 5;
        reason = `unlock Moon Gift ${unlockMoon}`;
        break;
      case "add_moon_facet":
        const addMoon = choice.moonGift;
        const addCurrentLevel = actor.items.filter(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === addMoon).length;
        const nextMoonLevel = addCurrentLevel + 1;
        const nextMoonFacet = game.items.find(i => i.type === "facet" && i.system.giftType === "moon" && i.system.gift === addMoon && i.system.level === nextMoonLevel);
        if (nextMoonFacet) {
          await actor.createEmbeddedDocuments("Item", [nextMoonFacet.toObject()]);
        }
        cost = 2;
        reason = `add Facet to Moon Gift ${addMoon}`;
        break;
      case "buy_rite":
        const rite = game.items.get(choice.riteId);
        await actor.createEmbeddedDocuments("Item", [rite.toObject()]);
        cost = rite.system.rating;
        reason = `buy Rite ${rite.name}`;
        break;
    }

    if (Object.keys(updateData.system).length > 0) {
      await actor.update(updateData);
    }

    const beatsDeduct = -cost * 5;
    await actor.addProgress(reason, beatsDeduct, 0);
  },
  defaultChecked: (actor) => {
    const totalBeats = actor.system.progress.reduce((acc, entry) => acc + (entry.beats || 0), 0);
    return getAvailableXP(actor) > 0;
  }
};