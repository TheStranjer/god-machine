import { checkMeritPrerequisites } from "../check-merit-prerequisites.js";

const calculateTotalDots = (splat) => {
  const splatMap = {
    mortal: 7,
    mage: 10,
    vampire: 10,
    werewolf: 10,
    changeling: 10,
    demon: 10,
    "sin-eater": 10
  }
  
  return splatMap[splat.toLowerCase()] || 7;
};

export const meritsStep = {
  maximumAttempts: (actor) => ( 3 ),
  prompt: (actor) => {
    const merits = game.items.filter(item => item.type === "merit");
    const meritsList = merits.map(merit => ({
      id: merit.id,
      name: merit.name,
      description: merit.system.description,
      possibleRatings: merit.system.possibleRatings,
      prerequisites: merit.system.prerequisites
    }));
    const meritsJson = JSON.stringify(meritsList);

    const splat = actor.system.characterType.toLowerCase();
    const powerStatNameMap = {
      mage: 'Gnosis',
      vampire: 'Blood Potency',
      werewolf: 'Primal Urge',
      changeling: 'Wyrd',
      demon: 'Primum',
      'sin-eater': 'Synergy'
      // Add more splats as needed
    };
    const hasPowerStat = !!powerStatNameMap[splat];
    const powerStatName = powerStatNameMap[splat] || 'Power Stat';
    const maxIncrease = hasPowerStat ? 2 : 0;
    const totalDots = calculateTotalDots(splat);

    let powerStatText = '';
    if (hasPowerStat) {
      powerStatText = `• Optionally, spend 5 dots to increase the character's ${powerStatName} by 1 (you may do this up to ${maxIncrease} times, as total dots are ${totalDots}).`;
    }

    return `Choose Merits for this Chronicles of Darkness character, totaling exactly ${totalDots} dots.

• Merits cost a number of dots equal to their chosen rating.
• You may select multiple Merits, each with a valid rating from its possibleRatings.
• Prerequisites must be met, either by the character's current traits or by other selected Merits (they will be validated in an order that allows dependencies).
${powerStatText}• Some Merits require a specifier, like 'Status' in a particular organization (e.g., 'police'). If appropriate for the Merit, include **signifier** – a string (1-30 characters) describing the target. The final name will be 'Merit Name (signifier)'. Exercise caution: only include if the Merit typically requires it, such as Status, Allies, Contacts, etc.
• Do not select the same Merit more than once.
• Return an object named **choices** – an array of objects, each with:  
  • **meritId** – the Merit's id (exact from the list)  
  • **rating** – the chosen rating (must be in possibleRatings for that Merit)  
  • Optionally, **signifier** – if needed  
${hasPowerStat ? `• Optionally, include **powerStatIncrease** – an integer (0 to ${maxIncrease}).  \n` : ''}

Available Merits:
\`\`\`json
${meritsJson}
\`\`\`\n`;
  },
  tool: (actor) => {
    const merits = game.items.filter(item => item.type === "merit");

    const parsePossibleRatings = (str) => {
      if (!str) return [];
      return str.split(',').map(part => Number(part.trim())).filter(n => !isNaN(n));
    };

    const oneOfSchemas = merits.map(merit => ({
      type: "object",
      properties: {
        meritId: { type: "string", const: merit.id },
        rating: { type: "integer", enum: parsePossibleRatings(merit.system.possibleRatings) },
        signifier: { type: "string", minLength: 1, maxLength: 30 }
      },
      required: ["meritId", "rating"],
      additionalProperties: false
    }));

    const splat = actor.system.characterType.toLowerCase();
    const powerStatNameMap = {
      mage: 'Gnosis',
      vampire: 'Blood Potency',
      werewolf: 'Primal Urge',
      changeling: 'Wyrd',
      demon: 'Primum',
      'sin-eater': 'Synergy'
      // Add more splats as needed
    };
    const hasPowerStat = !!powerStatNameMap[splat];
    const maxIncrease = hasPowerStat ? 2 : 0;

    const schema = {
      type: "object",
      properties: {
        choices: {
          type: "array",
          items: {
            oneOf: oneOfSchemas
          }
        }
      },
      required: ["choices"],
      additionalProperties: false
    };

    if (hasPowerStat) {
      schema.properties.powerStatIncrease = { type: "integer", minimum: 0, maximum: maxIncrease };
      schema["required"].push("powerStatIncrease");
    }

    return {
      type: "function",
      function: {
        name: "generate_merits",
        description: `Choose valid Merits${hasPowerStat ? (" and powerStatIncrease increase of 0 to " + maxIncrease) : ""}`,
        parameters: schema
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const totalDots = calculateTotalDots(actor.system.characterType);
    if (!Array.isArray(data.choices)) {
      errors.push("choices must be an array");
      return errors;
    }
    const increase = data.powerStatIncrease || 0;
    const meritCosts = data.choices.reduce((sum, choice) => sum + choice.rating, 0);
    const totalCost = meritCosts + 5 * increase;
    if (totalCost !== totalDots) {
      errors.push(`Total cost must be exactly ${totalDots} (current: ${totalCost})`);
    }

    const splat = actor.system.characterType.toLowerCase();
    const powerStatPathMap = {
      mage: 'system.mage_traits.gnosis.value',
      vampire: 'system.vampire_traits.bloodPotency.value',
      werewolf: 'system.werewolf_traits.primalUrge.value',
      changeling: 'system.changeling_traits.wyrd.value',
      demon: 'system.demon_traits.primum.value',
      'sin-eater': 'system.sineater_traits.synergy.value'
      // Add more splats as needed
    };
    const hasPowerStat = !!powerStatPathMap[splat];
    const maxIncrease = hasPowerStat ? 2 : 0;
    if (increase > maxIncrease) {
      errors.push(`Power stat increase cannot exceed ${maxIncrease}`);
    }
    if (!hasPowerStat && increase > 0) {
      errors.push("This character type cannot increase power stat");
    }

    const meritIds = data.choices.map(choice => choice.meritId);
    if (new Set(meritIds).size !== meritIds.length) {
      errors.push("Duplicate Merits selected (not allowed)");
    }

    const parsePossibleRatings = (str) => {
      if (!str) return [];
      return str.split(',').map(part => Number(part.trim())).filter(n => !isNaN(n));
    };

    data.choices.forEach(choice => {
      const merit = game.items.get(choice.meritId);
      if (!merit) {
        errors.push(`Invalid meritId: ${choice.meritId}`);
      } else {
        const ratings = parsePossibleRatings(merit.system.possibleRatings);
        if (!ratings.includes(choice.rating)) {
          errors.push(`Invalid rating ${choice.rating} for Merit ${merit.name}`);
        }
        if (choice.signifier && (choice.signifier.length < 1 || choice.signifier.length > 30)) {
          errors.push(`Signifier for ${merit.name} must be 1-30 characters`);
        }
      }
    });

    // Simulate addition to check prerequisites in totality
    const actorData = actor.toObject();
    const updatePath = powerStatPathMap[splat];
    if (hasPowerStat && updatePath) {
      const currentPower = foundry.utils.getProperty(actorData, updatePath) || 0;
      foundry.utils.setProperty(actorData, updatePath, currentPower + increase);
    }

    if (!actorData.system.inventory) actorData.system.inventory = {};
    if (!actorData.system.inventory.merit) actorData.system.inventory.merit = { items: [] };
    let remaining = data.choices.slice();
    while (remaining.length > 0) {
      let added = false;
      for (let i = 0; i < remaining.length; i++) {
        const choice = remaining[i];
        const merit = game.items.get(choice.meritId);
        if (merit && checkMeritPrerequisites(actorData, merit.system.prerequisites)) {
          const meritData = {
            name: choice.signifier ? `${merit.name} (${choice.signifier})` : merit.name,
            system: JSON.parse(JSON.stringify(merit.system))
          };
          meritData.system.rating = choice.rating;
          actorData.system.inventory.merit.items.push(meritData);
          remaining.splice(i, 1);
          added = true;
          i--;
        }
      }
      if (!added) {
        const stuckMerits = remaining.map(choice => game.items.get(choice.meritId)?.name || choice.meritId);
        errors.push(`The following Merits have prerequisites that are not met: ${stuckMerits.join(', ')}`);
        break;
      }
    }

    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };
    const splat = actor.system.characterType.toLowerCase();
    const powerStatPathMap = {
      mage: 'system.mage_traits.gnosis.value',
      vampire: 'system.vampire_traits.bloodPotency.value',
      werewolf: 'system.werewolf_traits.primalUrge.value',
      changeling: 'system.changeling_traits.wyrd.value',
      demon: 'system.demon_traits.primum.value',
      'sin-eater': 'system.sineater_traits.synergy.value'
      // Add more splats as needed
    };
    const updatePath = powerStatPathMap[splat];
    if (updatePath) {
      const currentPower = foundry.utils.getProperty(actor, updatePath) || 0;
      foundry.utils.setProperty(updateData, updatePath, currentPower + (data.powerStatIncrease || 0));
    }

    const currentItems = data.choices.map(choice => {
      const merit = game.items.get(choice.meritId);
      if (!merit) return null;
      const meritData = {
        type: "merit",
        name: choice.signifier ? `${merit.name} (${choice.signifier})` : merit.name,
        system: JSON.parse(JSON.stringify(merit.system))
      };
      meritData.system.rating = choice.rating;
      return meritData;
    }).filter(item => item !== null);

    await actor.createEmbeddedDocuments("Item", currentItems)

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    return (actor.system.inventory?.merit?.items?.length ?? 0) === 0;
  }
};