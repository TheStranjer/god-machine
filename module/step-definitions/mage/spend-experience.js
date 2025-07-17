import { checkMeritPrerequisites } from "../../utils/check-merit-prerequisites.js";
import { stripHtmlRegex } from '../../utils/strip-html-regex.js';
import { getAvailableXP, getAvailableArcaneXP } from '../../utils/get-available-xp.js';

const parsePossibleRatings = (str) => {
  if (!str) return [];
  return str.split(',').map(part => Number(part.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
};

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

const meritsRequiringSignifier = ['Status', 'Allies', 'Contacts', 'Resources', 'Safe Place', 'Staff', 'Mentor', 'Retainer', 'Alternate Identity']; // Adjust as needed for Mage merits

const arcanaTypes = {
  gross: ['forces', 'life', 'matter', 'space', 'time'],
  subtle: ['death', 'fate', 'mind', 'prime', 'spirit']
};

const getArcanumCategory = (arc) => {
  if (arcanaTypes.gross.includes(arc)) return 'arcana_gross';
  if (arcanaTypes.subtle.includes(arc)) return 'arcana_subtle';
  return null;
};

const getArcanumLimit = (actor, arc) => {
  const path = actor.system.path || '';
  const pathData = {
    "Acanthus": { ruling: ['time', 'fate'], inferior: 'forces' },
    "Mastigos": { ruling: ['mind', 'space'], inferior: 'matter' },
    "Moros": { ruling: ['death', 'matter'], inferior: 'spirit' },
    "Obrimos": { ruling: ['prime', 'forces'], inferior: 'death' },
    "Thyrsus": { ruling: ['life', 'spirit'], inferior: 'mind' }
  }[path] || { ruling: [], inferior: '' };

  if (pathData.ruling.includes(arc)) return 5;
  if (pathData.inferior === arc) return 2;
  return 4;
};

const eligibleSpells = (actor) => {
  const getDots = (arc) => {
    const cat = getArcanumCategory(arc);
    if (!cat) return 0;
    return actor.system[cat][arc].value || 0;
  };
  return game.items.filter(item => item.type === "spell" && getDots(item.system.arcanum) >= item.system.level);
};

export const spendMageExperienceStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const regularXP = getAvailableXP(actor);
    const arcaneXP = getAvailableArcaneXP(actor);
    if (regularXP <= 0 && arcaneXP <= 0) return 'No Experience points to spend.';

    const gnosis = actor.system.mage_traits.gnosis.value || 1;
    const wisdom = actor.system.mage_traits.wisdom.value || 7;
    const willpower = actor.system.derivedTraits.willpower.value || 0;
    const resCom = (actor.system.attributes_mental.resolve.value || 0) + (actor.system.attributes_social.composure.value || 0);

    // Attributes
    const increasableAttributes = [];
    Object.entries(attributeCategories).forEach(([cat, attrs]) => {
      attrs.forEach(attr => {
        const value = actor.system[`attributes_${cat}`][attr].value || 0;
        if (value < 5) increasableAttributes.push(attr); // Assuming max 5 for attributes
      });
    });

    // Skills
    const increasableSkills = [];
    const skillsWithDots = [];
    Object.entries(skillCategories).forEach(([cat, sks]) => {
      sks.forEach(sk => {
        const value = actor.system[`skills_${cat}`][sk].value || 0;
        if (value < 5) increasableSkills.push(sk);
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
      return ratings.length > 0 && Math.min(...ratings) <= regularXP; // Merits use regular XP
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
      return (nextR - currentR) <= regularXP; // Merits use regular XP
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

    // Arcana
    const increasableArcana = [];
    Object.keys(arcanaTypes).forEach(cat => {
      arcanaTypes[cat].forEach(arc => {
        const path = getArcanumCategory(arc);
        const value = actor.system[path][arc].value || 0;
        const limit = getArcanumLimit(actor, arc);
        if (value < 5) { // Overall max assumed 5, but inferior max 2, etc.
          const isAboveLimit = value >= limit;
          const arcCost = isAboveLimit ? 5 : 4;
          const canAfford = (regularXP >= arcCost) || (arcaneXP >= arcCost);
          if (canAfford) increasableArcana.push({ arc, current: value, cost: arcCost });
        }
      });
    });
    const arcanaJson = JSON.stringify(increasableArcana.map(a => ({ arc: a.arc, current: a.current, cost: a.cost })));

    // Gnosis
    const canIncreaseGnosis = gnosis < 10;
    const gnosisCost = 5;
    const canAffordGnosis = (regularXP >= gnosisCost) || (arcaneXP >= gnosisCost);
    const spells = eligibleSpells(actor);
    const spellsJson = JSON.stringify(spells.map(s => ({ id: s.id, name: s.name, description: s.description })));

    // Rotes
    const actorSpells = actor.items.filter(item => item.type === "spell");
    const hadRoteIds = new Set(actorSpells.filter(s => s.system.isRote).map(s => s.system.sourceId || s.id)); // Assuming sourceId if compendium
    const eligibleRoteSpells = spells.filter(s => !hadRoteIds.has(s.id) && !actorSpells.some(as => as.name === s.name && as.system.isRote));

    // Praxes
    const hadPraxisIds = new Set(actorSpells.filter(s => s.system.isPraxis).map(s => s.system.sourceId || s.id));
    const eligiblePraxisSpells = spells.filter(s => !hadPraxisIds.has(s.id) && !actorSpells.some(as => as.name === s.name && as.system.isPraxis));

    // Wisdom
    const canIncreaseWisdom = wisdom < 10;
    const wisdomCost = 2;
    const canAffordWisdom = arcaneXP >= wisdomCost;

    // Willpower
    const canIncreaseWillpower = willpower < resCom;
    const willpowerCost = 1;
    const canAffordWillpower = regularXP >= willpowerCost;

    // Legacy Attainments - Assuming no legacies for now, skip or implement if needed
    const legacyAttainments = []; // Placeholder
    const legacyJson = JSON.stringify(legacyAttainments);

    let promptText = `Choose one Experience expenditure for this Mage character. You have ${regularXP} regular Experience and ${arcaneXP} Arcane Experience.

• Expenditures follow Mage: The Awakening 2nd Edition rules.
• Items with * can use regular or Arcane XP (prefer regular).
• ** only Arcane XP.
• No * only regular XP.
• Arcanum cost: 4 to limit, 5 above (Ruling limit 5, Common 4, Inferior 2).
• Gnosis increase grants free Praxis (choose spell).
• Only choose affordable and available options.

Available options:`;

    if (regularXP >= 4 && increasableAttributes.length > 0) {
      promptText += `\n• Increase Attribute (4 regular XP). Available: ${increasableAttributes.join(', ')}.`;
    }

    if (regularXP >= 2 && increasableSkills.length > 0) {
      promptText += `\n• Increase Skill (2 regular XP). Available: ${increasableSkills.join(', ')}.`;
    }

    if (regularXP >= 1 && skillsWithDots.length > 0) {
      promptText += `\n• Add Skill Specialty (1 regular XP). Available skills: ${skillsWithDots.join(', ')}. Provide specialty string (1-50 characters).`;
    }

    if (possibleNewMerits.length > 0) {
      promptText += `\n• Buy new Merit at min rating (1 regular XP per dot). Some require signifier (1-30 characters). Available:\n\`\`\`json\n${newMeritsJson}\n\`\`\``;
    }

    if (increaseMeritsList.length > 0) {
      promptText += `\n• Increase existing Merit to next rating (1 regular XP per dot difference). Available:\n\`\`\`json\n${increaseMeritsJson}\n\`\`\``;
    }

    if (increasableArcana.length > 0) {
      promptText += `\n• Increase Arcanum (*4 or 5 XP). Available:\n\`\`\`json\n${arcanaJson}\n\`\`\``;
    }

    if (canAffordGnosis) {
      promptText += `\n• Increase Gnosis (*5 XP), choose free Praxis spell.`;
    }

    if (regularXP >= 1 && eligibleRoteSpells.length > 0) {
      promptText += `\n• Buy Rote (1 regular XP).`;
    }

    if (arcaneXP >= 1 && eligiblePraxisSpells.length > 0) {
      promptText += `\n• Buy Praxis (**1 Arcane XP).`;
    }

    if (canAffordWisdom) {
      promptText += `\n• Increase Wisdom (**2 Arcane XP).`;
    }

    if (canAffordWillpower) {
      promptText += `\n• Increase Willpower (1 regular XP).`;
    }

    // Legacy Attainments if implemented
    if (legacyAttainments.length > 0) {
      promptText += `\n• Buy Legacy Attainment (*1 XP). Available:\n\`\`\`json\n${legacyJson}\n\`\`\``;
    }

    promptText += `\n\nReturn an object named **choice** with the selected expenditure.`;

    if (spells.length > 0) {
      promptText += `\n\nHere are the spells available to your character to pick as some combination of Rotes/Praxes:\n\`\`\`json\n${spellsJson}\n\`\`\``;
    }

    return promptText;
  },
  tool: (actor) => {
    const regularXP = getAvailableXP(actor);
    const arcaneXP = getAvailableArcaneXP(actor);

    const gnosis = actor.system.mage_traits.gnosis.value || 1;
    const wisdom = actor.system.mage_traits.wisdom.value || 7;
    const willpower = actor.system.derivedTraits.willpower.value || 0;
    const resCom = (actor.system.attributes_mental.resolve.value || 0) + (actor.system.attributes_social.composure.value || 0);

    const increasableAttributes = [];
    Object.entries(attributeCategories).forEach(([cat, attrs]) => {
      attrs.forEach(attr => {
        const value = actor.system[`attributes_${cat}`][attr].value || 0;
        if (value < 5) increasableAttributes.push(attr);
      });
    });

    const increasableSkills = [];
    const skillsWithDots = [];
    Object.entries(skillCategories).forEach(([cat, sks]) => {
      sks.forEach(sk => {
        const value = actor.system[`skills_${cat}`][sk].value || 0;
        if (value < 5) increasableSkills.push(sk);
        if (value >= 1) skillsWithDots.push(sk);
      });
    });

    const worldMerits = game.items.filter(item => item.type === "merit");
    const actorMerits = actor.items.filter(item => item.type === "merit");
    const hadMeritBaseNames = new Set(actorMerits.map(m => m.name.replace(/\s*\(.+\)$/, '')));
    const eligibleNewMerits = worldMerits.filter(m => !hadMeritBaseNames.has(m.name) && checkMeritPrerequisites(actor, m.system.prerequisites));
    const possibleNewMerits = eligibleNewMerits.filter(m => {
      const ratings = parsePossibleRatings(m.system.possibleRatings);
      return ratings.length > 0 && Math.min(...ratings) <= regularXP;
    });

    const increasableMerits = actorMerits.filter(am => {
      const baseName = am.name.replace(/\s*\(.+\)$/, '');
      const worldM = worldMerits.find(w => w.name === baseName);
      if (!worldM) return false;
      const ratings = parsePossibleRatings(worldM.system.possibleRatings);
      const currentR = am.system.rating || 0;
      const nextR = ratings.find(r => r > currentR);
      if (!nextR) return false;
      return (nextR - currentR) <= regularXP;
    });

    const increasableArcana = [];
    Object.keys(arcanaTypes).forEach(cat => {
      arcanaTypes[cat].forEach(arc => {
        const path = getArcanumCategory(arc);
        const value = actor.system[path][arc].value || 0;
        const limit = getArcanumLimit(actor, arc);
        if (value < 5) {
          const isAboveLimit = value >= limit;
          const arcCost = isAboveLimit ? 5 : 4;
          const canAfford = (regularXP >= arcCost) || (arcaneXP >= arcCost);
          if (canAfford) increasableArcana.push(arc);
        }
      });
    });

    const gnosisCost = 5;
    const canAffordGnosis = (regularXP >= gnosisCost) || (arcaneXP >= gnosisCost);
    const canIncreaseGnosis = gnosis < 10 && canAffordGnosis;
    const spells = eligibleSpells(actor);
    const spellIds = spells.map(s => s.id);

    const actorSpells = actor.items.filter(item => item.type === "spell");
    const hadRoteIds = new Set(actorSpells.filter(s => s.system.isRote).map(s => s.id)); // Assuming no sourceId, use id
    const eligibleRoteSpells = spells.filter(s => !hadRoteIds.has(s.id) && !actorSpells.some(as => as.name === s.name && as.system.isRote));
    const canBuyRote = regularXP >= 1 && eligibleRoteSpells.length > 0;

    const hadPraxisIds = new Set(actorSpells.filter(s => s.system.isPraxis).map(s => s.id));
    const eligiblePraxisSpells = spells.filter(s => !hadPraxisIds.has(s.id) && !actorSpells.some(as => as.name === s.name && as.system.isPraxis));
    const eligiblePraxisSpellIds = eligiblePraxisSpells.map(s => s.id);
    const canBuyPraxis = arcaneXP >= 1 && eligiblePraxisSpells.length > 0;

    const wisdomCost = 2;
    const canIncreaseWisdom = wisdom < 10 && arcaneXP >= wisdomCost;

    const willpowerCost = 1;
    const canIncreaseWillpower = willpower < resCom && regularXP >= willpowerCost;

    // Legacy Attainments placeholder
    const legacyAttainments = []; // Assume empty for now
    const legacyIds = legacyAttainments.map(l => l.id);
    const canBuyLegacy = (regularXP >= 1 || arcaneXP >= 1) && legacyAttainments.length > 0;

    const anyOf = [];

    if (regularXP >= 4 && increasableAttributes.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_attribute" },
          attribute: { enum: increasableAttributes }
        },
        required: ["type", "attribute"]
      });
    }

    if (regularXP >= 2 && increasableSkills.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_skill" },
          skill: { enum: increasableSkills }
        },
        required: ["type", "skill"]
      });
    }

    if (regularXP >= 1 && skillsWithDots.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "add_skill_specialty" },
          skill: { enum: skillsWithDots },
          specialty: { type: "string", minLength: 1, maxLength: 50 }
        },
        required: ["type", "skill", "specialty"]
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
        required: ["type", "meritId"]
      });
    }

    if (increasableMerits.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_merit" },
          meritId: { enum: increasableMerits.map(m => m.id) }
        },
        required: ["type", "meritId"]
      });
    }

    if (increasableArcana.length > 0) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_arcanum" },
          arcanum: { enum: increasableArcana }
        },
        required: ["type", "arcanum"]
      });
    }

    if (canIncreaseGnosis) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_gnosis" },
          praxisSpellId: { enum: eligiblePraxisSpellIds }
        },
        required: ["type", "praxisSpellId"]
      });
    }

    if (canBuyRote) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "buy_rote" },
          spellId: { enum: eligibleRoteSpells.map(s => s.id) }
        },
        required: ["type", "spellId"]
      });
    }

    if (canBuyPraxis) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "buy_praxis" },
          spellId: { enum: eligiblePraxisSpellIds }
        },
        required: ["type", "spellId"]
      });
    }

    if (canIncreaseWisdom) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_wisdom" }
        },
        required: ["type"]
      });
    }

    if (canIncreaseWillpower) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "increase_willpower" }
        },
        required: ["type"]
      });
    }

    if (canBuyLegacy) {
      anyOf.push({
        type: "object",
        properties: {
          type: { const: "buy_legacy_attainment" },
          attainmentId: { enum: legacyIds }
        },
        required: ["type", "attainmentId"]
      });
    }

    const schema = {
      type: "object",
      properties: {
        choice: { anyOf }
      },
      required: ["choice"]
    };

    return {
      type: "function",
      function: {
        name: "spend_experience",
        description: "Choose one valid Experience expenditure",
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

    const regularXP = getAvailableXP(actor);
    const arcaneXP = getAvailableArcaneXP(actor);

    let useArcane = false;
    let cost = 0;

    switch (type) {
      case "increase_attribute":
        const attribute = choice.attribute;
        if (!attribute) errors.push("Attribute required");
        const attrCat = getCategory('attribute', attribute);
        if (!attrCat) errors.push("Invalid attribute");
        const attrValue = actor.system[`attributes_${attrCat}`][attribute].value || 0;
        if (attrValue >= 5) errors.push("Attribute at maximum");
        cost = 4;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "increase_skill":
        const skill = choice.skill;
        if (!skill) errors.push("Skill required");
        const skillCat = getCategory('skill', skill);
        if (!skillCat) errors.push("Invalid skill");
        const skillValue = actor.system[`skills_${skillCat}`][skill].value || 0;
        if (skillValue >= 5) errors.push("Skill at maximum");
        cost = 2;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "add_skill_specialty":
        const specSkill = choice.skill;
        const specialty = choice.specialty;
        if (!specSkill) errors.push("Skill required");
        if (!specialty || specialty.length < 1 || specialty.length > 50) errors.push("Valid specialty required");
        const specCat = getCategory('skill', specSkill);
        if (!specCat) errors.push("Invalid skill");
        const specValue = actor.system[`skills_${specCat}`][specSkill].value || 0;
        if (specValue < 1) errors.push("Skill must have at least 1 dot");
        const currentSpecialties = actor.system[`skills_${specCat}`][specSkill].specialties || [];
        if (currentSpecialties.includes(specialty)) errors.push("Specialty already exists");
        cost = 1;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "buy_new_merit":
        const meritId = choice.meritId;
        if (!meritId) errors.push("meritId required");
        const merit = game.items.get(meritId);
        if (!merit || merit.type !== "merit") errors.push("Invalid merit");
        if (!checkMeritPrerequisites(actor, merit.system.prerequisites)) errors.push("Prerequisites not met");
        const ratings = parsePossibleRatings(merit.system.possibleRatings);
        if (ratings.length === 0) errors.push("No ratings available");
        cost = ratings[0];
        if (regularXP < cost) errors.push("Not enough regular XP");
        const needsSignifier = meritsRequiringSignifier.includes(merit.name);
        if (needsSignifier && (!choice.signifier || choice.signifier.length < 1 || choice.signifier.length > 30)) errors.push("Signifier required");
        break;
      case "increase_merit":
        const incMeritId = choice.meritId;
        if (!incMeritId) errors.push("meritId required");
        const actorMerit = actor.items.get(incMeritId);
        if (!actorMerit || actorMerit.type !== "merit") errors.push("Invalid merit");
        const baseName = actorMerit.name.replace(/\s*\(.+\)$/, '');
        const worldMerit = game.items.find(i => i.type === "merit" && i.name === baseName);
        if (!worldMerit) errors.push("World merit not found");
        const incRatings = parsePossibleRatings(worldMerit.system.possibleRatings);
        const currentRating = actorMerit.system.rating || 0;
        const nextRating = incRatings.find(r => r > currentRating);
        if (!nextRating) errors.push("No higher rating");
        cost = nextRating - currentRating;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "increase_arcanum":
        const arcanum = choice.arcanum;
        if (!arcanum) errors.push("arcanum required");
        const arcCat = getArcanumCategory(arcanum);
        if (!arcCat) errors.push("Invalid arcanum");
        const arcValue = actor.system[arcCat][arcanum].value || 0;
        const limit = getArcanumLimit(actor, arcanum);
        if (arcValue >= 5) errors.push("Arcanum at maximum");
        cost = arcValue >= limit ? 5 : 4;
        if (regularXP >= cost) {
          // prefer regular
        } else if (arcaneXP >= cost) {
          useArcane = true;
        } else {
          errors.push("Not enough XP");
        }
        break;
      case "increase_gnosis":
        const gnosis = actor.system.mage_traits.gnosis.value || 1;
        if (gnosis >= 10) errors.push("Gnosis at maximum");
        const praxisSpellId = choice.praxisSpellId;
        if (!praxisSpellId) errors.push("praxisSpellId required");
        const praxisSpell = game.items.get(praxisSpellId);
        if (!praxisSpell || praxisSpell.type !== "spell") errors.push("Invalid spell for Praxis");
        const actorSpells = actor.items.filter(i => i.type === "spell");
        if (actorSpells.some(s => s.name === praxisSpell.name && s.system.isPraxis)) errors.push("Spell already a Praxis");
        cost = 5;
        if (regularXP >= cost) {
          // prefer regular
        } else if (arcaneXP >= cost) {
          useArcane = true;
        } else {
          errors.push("Not enough XP");
        }
        break;
      case "buy_rote":
        const roteSpellId = choice.spellId;
        if (!roteSpellId) errors.push("spellId required");
        const roteSpell = game.items.get(roteSpellId);
        if (!roteSpell || roteSpell.type !== "spell") errors.push("Invalid spell");
        const actorSpellsR = actor.items.filter(i => i.type === "spell");
        if (actorSpellsR.some(s => s.name === roteSpell.name && s.system.isRote)) errors.push("Spell already a Rote");
        cost = 1;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "buy_praxis":
        const praxisSpellIdB = choice.spellId;
        if (!praxisSpellIdB) errors.push("spellId required");
        const praxisSpellB = game.items.get(praxisSpellIdB);
        if (!praxisSpellB || praxisSpellB.type !== "spell") errors.push("Invalid spell");
        const actorSpellsP = actor.items.filter(i => i.type === "spell");
        if (actorSpellsP.some(s => s.name === praxisSpellB.name && s.system.isPraxis)) errors.push("Spell already a Praxis");
        cost = 1;
        if (arcaneXP < cost) errors.push("Not enough Arcane XP");
        useArcane = true;
        break;
      case "increase_wisdom":
        const wisdom = actor.system.mage_traits.wisdom.value || 7;
        if (wisdom >= 10) errors.push("Wisdom at maximum");
        cost = 2;
        if (arcaneXP < cost) errors.push("Not enough Arcane XP");
        useArcane = true;
        break;
      case "increase_willpower":
        const willpower = actor.system.derivedTraits.willpower.value || 0;
        const resCom = (actor.system.attributes_mental.resolve.value || 0) + (actor.system.attributes_social.composure.value || 0);
        if (willpower >= resCom) errors.push("Willpower at maximum");
        cost = 1;
        if (regularXP < cost) errors.push("Not enough regular XP");
        break;
      case "buy_legacy_attainment":
        // Placeholder validation
        const attainmentId = choice.attainmentId;
        if (!attainmentId) errors.push("attainmentId required");
        // Assume validation for legacy eligibility
        cost = 1;
        if (regularXP >= cost) {
          // prefer regular
        } else if (arcaneXP >= cost) {
          useArcane = true;
        } else {
          errors.push("Not enough XP");
        }
        break;
      default:
        errors.push("Invalid type");
    }

    return errors;
  },
  apply: async (actor, data) => {
    const choice = data.choice;
    const type = choice.type;

    let cost = 0;
    let useArcane = false;
    let reason = "";

    const updateData = { system: {} };

    switch (type) {
      case "increase_attribute":
        const attribute = choice.attribute;
        const attrCat = getCategory('attribute', attribute);
        const attrPath = `attributes_${attrCat}.${attribute}.value`;
        const attrValue = foundry.utils.getProperty(actor.system, attrPath) || 0;
        foundry.utils.setProperty(updateData.system, attrPath, attrValue + 1);
        cost = 4;
        reason = `increase Attribute ${attribute}`;
        break;
      case "increase_skill":
        const skill = choice.skill;
        const skillCat = getCategory('skill', skill);
        const skillPath = `skills_${skillCat}.${skill}.value`;
        const skillValue = foundry.utils.getProperty(actor.system, skillPath) || 0;
        foundry.utils.setProperty(updateData.system, skillPath, skillValue + 1);
        cost = 2;
        reason = `increase Skill ${skill}`;
        break;
      case "add_skill_specialty":
        const specSkill = choice.skill;
        const specialty = choice.specialty;
        const specCat = getCategory('skill', specSkill);
        const specPath = `skills_${specCat}.${specSkill}.specialties`;
        const currentSpecialties = foundry.utils.getProperty(actor.system, specPath) || [];
        foundry.utils.setProperty(updateData.system, specPath, [...currentSpecialties, specialty]);
        cost = 1;
        reason = `add Specialty ${specialty} to ${specSkill}`;
        break;
      case "buy_new_merit":
        const merit = game.items.get(choice.meritId);
        const ratings = parsePossibleRatings(merit.system.possibleRatings);
        const minRating = ratings[0];
        const meritData = merit.toObject();
        meritData.name = choice.signifier ? `${merit.name} (${choice.signifier})` : merit.name;
        meritData.system.rating = minRating;
        await actor.createEmbeddedDocuments("Item", [meritData]);
        cost = minRating;
        reason = `buy Merit ${meritData.name}`;
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
      case "increase_arcanum":
        const arcanum = choice.arcanum;
        const arcCat = getArcanumCategory(arcanum);
        const arcPath = `${arcCat}.${arcanum}.value`;
        const arcValue = foundry.utils.getProperty(actor.system, arcPath) || 0;
        foundry.utils.setProperty(updateData.system, arcPath, arcValue + 1);
        const limit = getArcanumLimit(actor, arcanum);
        cost = arcValue >= limit ? 5 : 4;
        if (getAvailableXP(actor) < cost) useArcane = true;
        reason = `increase Arcanum ${arcanum}`;
        break;
      case "increase_gnosis":
        const gnosisPath = 'mage_traits.gnosis.value';
        const gnosisValue = foundry.utils.getProperty(actor.system, gnosisPath) || 1;
        foundry.utils.setProperty(updateData.system, gnosisPath, gnosisValue + 1);
        const praxisSpell = game.items.get(choice.praxisSpellId);
        if (praxisSpell) {
          const praxisObj = praxisSpell.toObject();
          praxisObj.system.isBefouled = false;
          praxisObj.system.isInured = false;
          praxisObj.system.isPraxis = true;
          praxisObj.system.isRote = false;
          await actor.createEmbeddedDocuments("Item", [praxisObj]);
        }
        cost = 5;
        if (getAvailableXP(actor) < cost) useArcane = true;
        reason = `increase Gnosis (with free Praxis)`;
        break;
      case "buy_rote":
        const roteSpell = game.items.get(choice.spellId);
        if (roteSpell) {
          const roteObj = roteSpell.toObject();
          roteObj.system.isBefouled = false;
          roteObj.system.isInured = false;
          roteObj.system.isPraxis = false;
          roteObj.system.isRote = true;
          await actor.createEmbeddedDocuments("Item", [roteObj]);
        }
        cost = 1;
        reason = `buy Rote ${roteSpell?.name}`;
        break;
      case "buy_praxis":
        const praxisSpellB = game.items.get(choice.spellId);
        if (praxisSpellB) {
          const praxisObjB = praxisSpellB.toObject();
          praxisObjB.system.isBefouled = false;
          praxisObjB.system.isInured = false;
          praxisObjB.system.isPraxis = true;
          praxisObjB.system.isRote = false;
          await actor.createEmbeddedDocuments("Item", [praxisObjB]);
        }
        cost = 1;
        useArcane = true;
        reason = `buy Praxis ${praxisSpellB?.name}`;
        break;
      case "increase_wisdom":
        const wisdomPath = 'mage_traits.wisdom.value';
        const wisdomValue = foundry.utils.getProperty(actor.system, wisdomPath) || 7;
        foundry.utils.setProperty(updateData.system, wisdomPath, wisdomValue + 1);
        cost = 2;
        useArcane = true;
        reason = `increase Wisdom`;
        break;
      case "increase_willpower":
        const wpPath = 'derivedTraits.willpower.value';
        const wpValue = foundry.utils.getProperty(actor.system, wpPath) || 0;
        foundry.utils.setProperty(updateData.system, wpPath, wpValue + 1);
        cost = 1;
        reason = `increase Willpower`;
        break;
      case "buy_legacy_attainment":
        // Placeholder
        const attainment = game.items.get(choice.attainmentId);
        if (attainment) {
          await actor.createEmbeddedDocuments("Item", [attainment.toObject()]);
        }
        cost = 1;
        if (getAvailableXP(actor) < cost) useArcane = true;
        reason = `buy Legacy Attainment`;
        break;
    }

    if (Object.keys(updateData.system).length > 0) {
      await actor.update(updateData);
    }

    const beatsDeduct = -cost * 5;
    if (useArcane) {
      await actor.addProgress(reason, 0, beatsDeduct);
    } else {
      await actor.addProgress(reason, beatsDeduct, 0);
    }
  },
  defaultChecked: (actor) => getAvailableXP(actor) > 0 || getAvailableArcaneXP(actor) > 0
};