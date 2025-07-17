export const pathAndOrderStep = {
  maximumAttempts: (actor) => 5,
  prompt: (actor) => (
    `Choose a Path and Order for this Mage: the Awakening character.

• Path is determined by the Supernal Realm the mage Awakened to and defines their magical perspective. It sets two Ruling Arcana and one Inferior Arcana.
• Available Paths:
  - Acanthus: Ruling - Time, Fate; Inferior - Forces. Themes: Enchantment, destiny, unpredictability.
  - Mastigos: Ruling - Mind, Space; Inferior - Matter. Themes: Inner demons, boundaries, psychic forces.
  - Moros: Ruling - Death, Matter; Inferior - Spirit. Themes: Alchemy, transition, materialism.
  - Obrimos: Ruling - Prime, Forces; Inferior - Death. Themes: Divine power, energy, the celestial.
  - Thyrsus: Ruling - Life, Spirit; Inferior - Mind. Themes: Ecstasy, instinct, the natural world.
• Order is the societal group the mage joins, providing structure, rotes, and philosophy. Non-Apostate Orders grant Rote Skills, +1 Occult dot, Status (Order) •, and Language (Atlantean High Speech) •.
• Available Orders and Rote Skills:
  - Adamantine Arrow: Athletics, Intimidation, Medicine. Philosophy: Warrior-mages, conflict as enlightenment.
  - Free Council: Crafts, Persuasion, Science. Philosophy: Modern magic, democracy, innovation.
  - Guardians of the Veil: Investigation, Stealth, Subterfuge. Philosophy: Secrecy, protecting magic from abuse.
  - Mysterium: Investigation, Occult, Survival. Philosophy: Seekers of knowledge, archiving mysteries.
  - Silver Ladder: Expression, Persuasion, Subterfuge. Philosophy: Hierarchy, leading humanity to Awakening.
  - Apostate: No Rote Skills or bonuses. Independent, no Order affiliation.
• Return an object with:
  • **path** - the Path name (exact spelling, capitalized).
  • **order** - the Order name (exact spelling as listed).`
  ),
  tool: (actor) => {
    return {
      type: "function",
      function: {
        name: "generate_path_and_order",
        description: "Choose a valid Path and Order.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", enum: ["Acanthus", "Mastigos", "Moros", "Obrimos", "Thyrsus"] },
            order: { type: "string", enum: ["Adamantine Arrow", "Free Council", "Guardians of the Veil", "Mysterium", "Silver Ladder", "Apostate"] }
          },
          required: ["path", "order"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const paths = ["Acanthus", "Mastigos", "Moros", "Obrimos", "Thyrsus"];
    const orders = ["Adamantine Arrow", "Free Council", "Guardians of the Veil", "Mysterium", "Silver Ladder", "Apostate"];

    if (!data.path || !paths.includes(data.path)) {
      errors.push("Invalid path chosen");
    }
    if (!data.order || !orders.includes(data.order)) {
      errors.push("Invalid order chosen");
    }

    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };

    updateData.system.path = data.path;
    updateData.system.order = data.order;

    // Set Ruling/Inferior Arcana
    const pathData = {
      "Acanthus": { "ruling": ["Time", "Fate"], "inferior": "Forces" },
      "Mastigos": { "ruling": ["Mind", "Space"], "inferior": "Matter" },
      "Moros": { "ruling": ["Death", "Matter"], "inferior": "Spirit" },
      "Obrimos": { "ruling": ["Prime", "Forces"], "inferior": "Death" },
      "Thyrsus": { "ruling": ["Life", "Spirit"], "inferior": "Mind" }
    }[data.path];

    const grossArcana = ["forces", "life", "matter", "space", "time"];
    const subtleArcana = ["death", "fate", "mind", "prime", "spirit"];

    const arcanaMap = {
      "Forces": "forces", "Life": "life", "Matter": "matter", "Space": "space", "Time": "time",
      "Death": "death", "Fate": "fate", "Mind": "mind", "Prime": "prime", "Spirit": "spirit"
    };

    updateData.system.arcana_gross = updateData.system.arcana_gross || {};
    grossArcana.forEach(arc => {
      updateData.system.arcana_gross[arc] = {
        isRuling: false,
        isInferior: false
      };
    });

    updateData.system.arcana_subtle = updateData.system.arcana_subtle || {};
    subtleArcana.forEach(arc => {
      updateData.system.arcana_subtle[arc] = {
        isRuling: false,
        isInferior: false
      };
    });

    pathData.ruling.forEach(r => {
      const key = arcanaMap[r];
      const group = grossArcana.includes(key) ? "arcana_gross" : "arcana_subtle";
      updateData.system[group][key].isRuling = true;
    });

    const infKey = arcanaMap[pathData.inferior];
    const infGroup = grossArcana.includes(infKey) ? "arcana_gross" : "arcana_subtle";
    updateData.system[infGroup][infKey].isInferior = true;

    // Set Rote Skills
    const orderRoteSkills = {
      "Adamantine Arrow": ["Athletics", "Intimidation", "Medicine"],
      "Free Council": ["Crafts", "Persuasion", "Science"],
      "Guardians of the Veil": ["Investigation", "Stealth", "Subterfuge"],
      "Mysterium": ["Investigation", "Occult", "Survival"],
      "Silver Ladder": ["Expression", "Persuasion", "Subterfuge"],
      "Apostate": []
    }[data.order];

    const skillSets = {
      Mental: { Academics: "academics", Computer: "computer", Crafts: "crafts", Investigation: "investigation", Medicine: "medicine", Occult: "occult", Politics: "politics", Science: "science" },
      Physical: { Athletics: "athletics", Brawl: "brawl", Drive: "drive", Firearms: "firearms", Larceny: "larceny", Stealth: "stealth", Survival: "survival", Weaponry: "weaponry" },
      Social: { "Animal Ken": "animalKen", Empathy: "empathy", Expression: "expression", Intimidation: "intimidation", Persuasion: "persuasion", Socialize: "socialize", Streetwise: "streetwise", Subterfuge: "subterfuge" }
    };

    const allSkills = [];
    Object.entries(skillSets).forEach(([cat, skills]) => {
      Object.entries(skills).forEach(([name, key]) => {
        const category = cat.toLowerCase();
        updateData.system[`skills_${category}`] = updateData.system[`skills_${category}`] || {};
        updateData.system[`skills_${category}`][key] = updateData.system[`skills_${category}`][key] || {};
        updateData.system[`skills_${category}`][key].isRote = orderRoteSkills.includes(name);
      });
    });

    if (data.order !== "Apostate") {
      // Bump Occult
      const currentOccult = actor.system.skills_mental.occult.value ?? 0;
      updateData.system.skills_mental = updateData.system.skills_mental || {};
      updateData.system.skills_mental.occult.value = currentOccult + 1;

      // Add Merits if not present
      const itemsToAdd = [];

      // Status Merit
      const statusBase = game.items.find(i => i.type === "merit" && (i.name === "Status" || i.name === "Status (•)"));
      if (statusBase) {
        const hasStatus = actor.items.some(i => i.type === "merit" && i.name.includes("Status") && i.name.includes(data.order));
        if (!hasStatus) {
          const statusCopy = statusBase.toObject();
          statusCopy.name = `Status (${data.order})`;
          statusCopy.system.rating = 1;
          itemsToAdd.push(statusCopy);
        }
      }

      // Language Merit
      const languageBase = game.items.find(i => i.type === "merit" && (i.name === "Language" || i.name === "Language (•)"));
      if (languageBase) {
        const hasLanguage = actor.items.some(i => i.type === "merit" && i.name.includes("Language") && i.name.includes("High Speech"));
        if (!hasLanguage) {
          const languageCopy = languageBase.toObject();
          languageCopy.name = "Language (Atlantean High Speech)";
          languageCopy.system.rating = 1;
          itemsToAdd.push(languageCopy);
        }
      }

      if (itemsToAdd.length > 0) {
        await actor.createEmbeddedDocuments("Item", itemsToAdd);
      }
    }

    console.log("Updating these traits", updateData);

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    return !actor.system.path;
  }
};