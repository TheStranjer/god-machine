export const auspiceAndTribeStep = {
  maximumAttempts: (actor) => (5),
  prompt: (actor) => (
    `Choose an Auspice and Tribe for this Werewolf: the Forsaken character.

• Auspice is determined by the moon phase under which the werewolf Changed and defines their role. It grants a free dot in one of three Skills (choose one where the current value is less than 5), one Renown dot in the Auspice's Renown (marked as isAuspice: true), and a Hunter's Aspect (noted but fixed per Auspice).
• Available Auspices:
  - Cahalith (Gibbous Moon): Skills - Crafts, Expression, Persuasion; Renown - Glory; Hunter's Aspect - Monstrous (prey accepts inevitable death).
  - Elodoth (Half Moon): Skills - Empathy, Investigation, Politics; Renown - Honor; Hunter's Aspect - Isolating (prey feels shunned and alone).
  - Irraka (New Moon): Skills - Larceny, Stealth, Subterfuge; Renown - Cunning; Hunter's Aspect - Blissful (prey is oblivious to danger).
  - Ithaeur (Crescent Moon): Skills - Animal Ken, Medicine, Occult; Renown - Wisdom; Hunter's Aspect - Mystical (prey senses the other world and is betrayed by senses).
  - Rahu (Full Moon): Skills - Brawl, Intimidation, Survival; Renown - Purity; Hunter's Aspect - Dominant (prey spoils for a fight).
• Tribe is chosen by the character and aligns with expectations. It grants one Renown dot in the Tribe's Renown (marked as isTribe: true), except for Ghost Wolves.
• Available Tribes:
  - Blood Talons: Renown - Glory.
  - Bone Shadows: Renown - Wisdom.
  - Hunters in Darkness: Renown - Purity.
  - Iron Masters: Renown - Cunning.
  - Storm Lords: Renown - Honor.
  - Ghost Wolves: No Renown
• Return an object with:
  • **auspice** - the Auspice name (exact spelling, capitalized).
  • **tribe** - the Tribe name (exact spelling, capitalized).
  • **skill** - the chosen Skill name for the free dot (exact spelling from the Auspice's list, only if current dots < 5).`
  ),
  tool: (actor) => {
    const skillSets = {
      Mental: { Academics: "academics", Computer: "computer", Crafts: "crafts", Investigation: "investigation", Medicine: "medicine", Occult: "occult", Politics: "politics", Science: "science" },
      Physical: { Athletics: "athletics", Brawl: "brawl", Drive: "drive", Firearms: "firearms", Larceny: "larceny", Stealth: "stealth", Survival: "survival", Weaponry: "weaponry" },
      Social: { "Animal Ken": "animalKen", Empathy: "empathy", Expression: "expression", Intimidation: "intimidation", Persuasion: "persuasion", Socialize: "socialize", Streetwise: "streetwise", Subterfuge: "subterfuge" }
    };

    const getSkillValue = (skillName) => {
      let cat, key;
      Object.entries(skillSets).forEach(([category, skills]) => {
        if (skillName in skills) {
          cat = category.toLowerCase();
          key = skills[skillName];
        }
      });
      return cat && key ? actor.system[`skills_${cat}`]?.[key]?.value ?? 0 : 0;
    };

    const auspices = {
      Cahalith: { skills: ["Crafts", "Expression", "Persuasion"], renown: "glory" },
      Elodoth: { skills: ["Empathy", "Investigation", "Politics"], renown: "honor" },
      Irraka: { skills: ["Larceny", "Stealth", "Subterfuge"], renown: "cunning" },
      Ithaeur: { skills: ["Animal Ken", "Medicine", "Occult"], renown: "wisdom" },
      Rahu: { skills: ["Brawl", "Intimidation", "Survival"], renown: "purity" }
    };

    const allPossibleSkills = [...new Set(Object.values(auspices).flatMap(data => data.skills))].filter(skill => getSkillValue(skill) < 5);

    return {
      type: "function",
      function: {
        name: "generate_auspice_and_tribe",
        description: "Choose a valid Auspice, Tribe, and Auspice Skill.",
        parameters: {
          type: "object",
          properties: {
            auspice: { type: "string", enum: Object.keys(auspices) },
            tribe: { type: "string", enum: ["Blood Talons", "Bone Shadows", "Hunters in Darkness", "Iron Masters", "Storm Lords", "Ghost Wolves"] },
            skill: { type: "string", enum: allPossibleSkills }
          },
          required: ["auspice", "tribe", "skill"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const auspices = {
      Cahalith: { skills: ["Crafts", "Expression", "Persuasion"], renown: "glory" },
      Elodoth: { skills: ["Empathy", "Investigation", "Politics"], renown: "honor" },
      Irraka: { skills: ["Larceny", "Stealth", "Subterfuge"], renown: "cunning" },
      Ithaeur: { skills: ["Animal Ken", "Medicine", "Occult"], renown: "wisdom" },
      Rahu: { skills: ["Brawl", "Intimidation", "Survival"], renown: "purity" }
    };
    const tribes = ["Blood Talons", "Bone Shadows", "Hunters in Darkness", "Iron Masters", "Storm Lords", "Ghost Wolves"];

    if (!data.auspice || !auspices[data.auspice]) {
      errors.push("Invalid auspice chosen");
    }
    if (!data.tribe || !tribes.includes(data.tribe)) {
      errors.push("Invalid tribe chosen");
    }
    if (!data.skill || !auspices[data.auspice]?.skills.includes(data.skill)) {
      errors.push("Chosen skill does not match auspice");
    }

    const getSkillValue = (skillName) => {
      const skillSets = {
        Mental: { Academics: "academics", Computer: "computer", Crafts: "crafts", Investigation: "investigation", Medicine: "medicine", Occult: "occult", Politics: "politics", Science: "science" },
        Physical: { Athletics: "athletics", Brawl: "brawl", Drive: "drive", Firearms: "firearms", Larceny: "larceny", Stealth: "stealth", Survival: "survival", Weaponry: "weaponry" },
        Social: { "Animal Ken": "animalKen", Empathy: "empathy", Expression: "expression", Intimidation: "intimidation", Persuasion: "persuasion", Socialize: "socialize", Streetwise: "streetwise", Subterfuge: "subterfuge" }
      };
      let cat, key;
      Object.entries(skillSets).forEach(([category, skills]) => {
        if (skillName in skills) {
          cat = category.toLowerCase();
          key = skills[skillName];
        }
      });
      return cat && key ? actor.system[`skills_${cat}`]?.[key]?.value ?? 0 : 0;
    };

    if (getSkillValue(data.skill) >= 5) {
      errors.push("Chosen skill already at maximum (5 dots)");
    }

    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };

    updateData.system.auspice = data.auspice;
    updateData.system.tribe = data.tribe;

    const auspices = {
      Cahalith: { renown: "glory", huntersAspect: "Monstrous" },
      Elodoth: { renown: "honor", huntersAspect: "Isolating" },
      Irraka: { renown: "cunning", huntersAspect: "Blissful" },
      Ithaeur: { renown: "wisdom", huntersAspect: "Mystical" },
      Rahu: { renown: "purity", huntersAspect: "Dominant" }
    };

    const tribeRenownMap = {
      "Blood Talons": "glory",
      "Bone Shadows": "wisdom",
      "Hunters in Darkness": "purity",
      "Iron Masters": "cunning",
      "Storm Lords": "honor"
    };

    // Construct the werewolf_renown field from scratch
    const renownKeys = ['glory', 'honor', 'cunning', 'wisdom', 'purity'];
    const newWerewolfRenown = {};
    const auspiceRenown = auspices[data.auspice].renown;
    const tribeRenown = data.tribe !== "Ghost Wolves" ? tribeRenownMap[data.tribe] : null;
    for (const key of renownKeys) {
      newWerewolfRenown[key] = {
        value: (key === auspiceRenown ? 1 : 0) + (key === tribeRenown ? 1 : 0),
        isAuspice: key === auspiceRenown,
        isTribe: key === tribeRenown
      };
    }
    updateData.system.werewolf_renown = newWerewolfRenown;

    // Bump chosen skill
    const skillSets = {
      Mental: { Academics: "academics", Computer: "computer", Crafts: "crafts", Investigation: "investigation", Medicine: "medicine", Occult: "occult", Politics: "politics", Science: "science" },
      Physical: { Athletics: "athletics", Brawl: "brawl", Drive: "drive", Firearms: "firearms", Larceny: "larceny", Stealth: "stealth", Survival: "survival", Weaponry: "weaponry" },
      Social: { "Animal Ken": "animalKen", Empathy: "empathy", Expression: "expression", Intimidation: "intimidation", Persuasion: "persuasion", Socialize: "socialize", Streetwise: "streetwise", Subterfuge: "subterfuge" }
    };
    let cat, key;
    Object.entries(skillSets).forEach(([category, skills]) => {
      if (data.skill in skills) {
        cat = category.toLowerCase();
        key = skills[data.skill];
      }
    });
    if (cat && key) {
      const currentValue = actor.system[`skills_${cat}`]?.[key]?.value ?? 0;
      updateData.system[`skills_${cat}`] = updateData.system[`skills_${cat}`] || {};
      updateData.system[`skills_${cat}`][key] = { value: currentValue + 1 };
    }

    // Set Hunter's Aspect (assuming path exists in the system)
    updateData.system.huntersAspect = auspices[data.auspice].huntersAspect;

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    return !actor.system.auspice || !actor.system.tribe;
  }
};