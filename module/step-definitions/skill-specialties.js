const skillSets = {
      Mental: { Academics: "academics",  Computer: "computer",  Crafts: "crafts",  Investigation: "investigation",  Medicine: "medicine",  Occult: "occult",  Politics: "politics",  Science: "science" },
      Physical: { Athletics: "athletics",  Brawl: "brawl",  Drive: "drive",  Firearms: "firearms",  Larceny: "larceny", Stealth: "stealth", Survival: "survival", Weaponry: "weaponry" },
      Social:{ "Animal Ken": "animalKen", Empathy: "empathy", Expression: "expression", Intimidation: "intimidation", Persuasion: "persuasion", Socialize: "socialize", Streetwise: "streetwise", Subterfuge: "subterfuge" }
  };

export const skillSpecialtiesStep = {
  maximumAttempts: (actor) => ( 2 ),
  prompt: (actor) => ( `Choose exactly three Skill Specialties for this Chronicles of Darkness character.

• A Skill Specialty is one or two words that narrow a Skill’s focus (e.g. “Firearms (rifles)”, “Occult (vampires)”).  
• The character may take a Specialty only in a Skill with at least 1 dot.  
• A Skill may receive more than one Specialty, but each Specialty string must be unique.  
• Return an array named **specialties**.  It must contain exactly three objects and nothing else.  
  Each object has:  
  • **skill** – the Skill name (exact spelling from the list you are given)  
  • **specialty** – the chosen Specialty string (max 20 characters, no newline)` ),
  tool: (actor) => {
    const allowed=[];
    Object
      .entries(skillSets)
      .forEach( ([cat, map]) => {
        const base = `skills_${cat.toLowerCase()}`;
        Object.entries(map).forEach( ([display, key]) => {
          const dots = actor?.system?.[base]?.[key]?.value ?? 0;

          if (dots >= 1) {
            allowed.push(display);
          }
        });
      });

    const schema = {
      type: "object", 
      properties: {
        specialties: {
          type: "array", 
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object", 
            properties: {
              skill: { type: "string", enum:allowed },
              specialty: { type: "string", minLength: 1, maxLength: 20 }
            },
            required: ["skill", "specialty"], 
            additionalProperties: false
          }
        }
      },
      required: ["specialties"], 
      additionalProperties: false
    };

    return {
      type: "function",
      function: {
        name: "generate_skill_specialties",
        description: "Choose exactly three valid Skill Specialties.",
        parameters:schema
      }
    };
  },

  validate: (actor, data) => {
    const errors = [];
    if (!Array.isArray(data.specialties) || data.specialties.length !== 3) {
      errors.push("specialties must be an array of exactly 3 items");
    }

    const specialties = data.specialties;
    if (!Array.isArray(specialties)) {
      errors.push("specialties must be an array of exactly 3 items");
      return errors;
    }

    if (specialties.length !== 3) {
      errors.push("specialties must contain exactly 3 items");
    }

    const chosenSkills = new Set(specialties.map(s => s.skill));
    const forbiddenSkills = chosenSkills.filter(skill => {
      const skillKey = skillSets.Mental[skill] || skillSets.Physical[skill] || skillSets.Social[skill];
      const skillData = actor.system.skills_mental[skillKey] || actor.system.skills_physical[skillKey] || actor.system.skills_social[skillKey];
      return !skillData || skillData.value < 1;
    });

    for (const skill of forbiddenSkills) {
      errors.push(`Cannot choose specialty for ${skill} as it has no dots`);
    }

    const duplicateSpecialties = [];
    const seen = new Set();

    specialties.forEach(({ skill, specialty }) => {
      const key = `${skill}:${specialty}`;
      if (seen.has(key)) {
        duplicateSpecialties.push({ skill, specialty });
      } else {
        seen.add(key);
      }
    });

    for (const dupe of duplicateSpecialties) {
      errors.push(`Duplicate specialty found: ${dupe.skill} (${dupe.specialty})`);
    }

    return errors;
  },

  apply: async (actor, data) => {
    const updateData = {};

    for (const { skill, specialty } of data.specialties) {
      const skillKey = skillSets.Mental[skill] || skillSets.Physical[skill] || skillSets.Social[skill];
      const skillCategory = Object.keys(actor.system.skills_mental).includes(skillKey) ? "skills_mental" :
                            Object.keys(actor.system.skills_physical).includes(skillKey) ? "skills_physical" :
                            Object.keys(actor.system.skills_social).includes(skillKey) ? "skills_social" : null;
      console.log("Skill Category:", skillCategory);
      const specialties = actor.system[skillCategory]?.[skillKey]?.specialties || [];

      if (!specialties.includes(specialty)) {
        specialties.push(specialty);
        updateData.system = updateData.system || {};
        updateData.system[skillCategory] = updateData.system[skillCategory] || {};
        updateData.system[skillCategory][skillKey] = updateData.system[skillCategory][skillKey] || {};
        updateData.system[skillCategory][skillKey].specialties = specialties;
      }

      console.log("New Specialties:", specialties);
    }
    
    await actor.update(updateData);
  },

  defaultChecked: (actor) => {
    return ["skills_mental", "skills_physical", "skills_social"].every(cat => {
      return Object.keys(actor.system[cat] || {}).every(skill => {
        return actor.system[cat][skill].specialties?.length == 0;
      });
    });
  }
};
