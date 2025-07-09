export const skillsStep = {
  maximumAttempts: (actor) => ( 5 ),
  prompt: (actor) => ( `Assign Skills for a Chronicles of Darkness character as follows:

1. Choose category priorities:
   • One **primary** category gets **11 dots**  
   • One **secondary** category gets **7 dots**  
   • One **tertiary** category gets **4 dots**

   Categories and their skills:  
   • **Mental**: Academics, Computer, Crafts, Investigation, Medicine, Occult, Politics, Science  
   • **Physical**: Athletics, Brawl, Drive, Firearms, Larceny, Stealth, Survival, Weaponry  
   • **Social**: Animal Ken, Empathy, Expression, Intimidation, Persuasion, Socialize, Streetwise, Subterfuge  

2. Distribute the allotted dots inside each chosen category. Skills start at 0 and cannot exceed 5.

3. Return primaryCategory, secondaryCategory, tertiaryCategory and final values for all 24 skills.

Rules:  
• Totals per category must be 11, 7, 4 respectively.  
• No skill may exceed 5.` ),

  reasoning_effort: (actor) => "high",

  tool: (actor) => {
    const categories = ["Physical", "Mental", "Social"];
    const skills = [
      "Academics","Computer","Crafts","Investigation","Medicine","Occult","Politics","Science",
      "Athletics","Brawl","Drive","Firearms","Larceny","Stealth","Survival","Weaponry",
      "Animal Ken","Empathy","Expression","Intimidation","Persuasion","Socialize","Streetwise","Subterfuge"
    ];
    const props = {
      primaryCategory: {type:"string",enum:categories},
      secondaryCategory: {type:"string",enum:categories},
      tertiaryCategory: {type:"string",enum:categories}
    };

    skills.forEach( s => {
      props[s] = {
        type: "integer",
        minimum: 0,
        maximum:5
      };
    });

    return {
      type: "function",
      function: {
        name: "generate_skills",
        description: "Assign Skill priorities and final dot ratings for a Chronicles of Darkness character.",
        parameters: {
          type: "object",
          properties: props,
          required: ["primaryCategory", "secondaryCategory", "tertiaryCategory", ...skills]
        }
      }
    };
  },

  validate: (actor, data) => {
    const errors = [];
    const categories = ["Physical", "Mental", "Social"];
    const catMap = {
      Mental: ["Academics", "Computer", "Crafts", "Investigation", "Medicine", "Occult", "Politics", "Science"],
      Physical: ["Athletics", "Brawl", "Drive", "Firearms", "Larceny", "Stealth", "Survival", "Weaponry"],
      Social: ["Animal Ken", "Empathy", "Expression", "Intimidation", "Persuasion", "Socialize", "Streetwise", "Subterfuge"]
    };

    ["primaryCategory", "secondaryCategory", "tertiaryCategory"].forEach(k => {
      if (!categories.includes(data[k])) {
        errors.push(`${k} must be Physical, Mental, or Social`);
      }
    });

    if (new Set([data.primaryCategory, data.secondaryCategory, data.tertiaryCategory]).size !== 3) {
      errors.push("Each category must be used exactly once");
    }

    Object.values(catMap).flat().forEach( sk => {
      if(!Number.isInteger(data[sk]) || data[sk] < 0 || data[sk] > 5) {
        errors.push(`${sk} must be between 0 and 5`);
      }
    });

    const expected = {};
    expected[data.primaryCategory] = 11;
    expected[data.secondaryCategory] = 7;
    expected[data.tertiaryCategory] = 4;
    
    const used = {
      Physical: 0,
      Mental: 0,
      Social: 0
    };

    Object.entries(catMap).forEach( ([cat,list]) => {
      list.forEach( sk => {
        used[cat] += data[sk];
      });
    });

    categories.forEach(cat => {
      if(used[cat] !== expected[cat]) {
        errors.push(`${cat} must total ${expected[cat]} dots but has ${used[cat]}`);
      }
    });

    return errors;
  },

  apply: async (actor,data) => {
    const mMap = {
      "Academics": "academics", "Computer": "computer", "Crafts": "crafts",
      "Investigation": "investigation", "Medicine": "medicine", "Occult": "occult",
      "Politics": "politics", "Science": "science"
    };
    const pMap = {
      "Athletics": "athletics", "Brawl": "brawl", "Drive": "drive",
      "Firearms": "firearms", "Larceny": "larceny", "Stealth": "stealth",
      "Survival": "survival", "Weaponry": "weaponry"
    };
    const sMap = {
      "Animal Ken": "animalKen", "Empathy": "empathy", "Expression": "expression",
      "Intimidation": "intimidation", "Persuasion": "persuasion", "Socialize": "socialize",
      "Streetwise": "streetwise", "Subterfuge": "subterfuge"
    };
    
    const updateData = {};
    
    Object.entries(mMap).forEach(([name, key]) => {
      const newSkill = { ...actor.system.skills_mental[key], ...{ value: data[name], final: data[name] } };
      updateData[`system.skills_mental.${key}`] = newSkill;
    });
    
    Object.entries(pMap).forEach(([name, key]) => {
      const newSkill = { ...actor.system.skills_physical[key], ...{ value: data[name], final: data[name] } };
      updateData[`system.skills_physical.${key}`] = newSkill;
    });
    
    Object.entries(sMap).forEach(([name, key]) => {
      const newSkill = { ...actor.system.skills_social[key], ...{ value: data[name], final: data[name] } };
      updateData[`system.skills_social.${key}`] = newSkill;
    });

    await actor.update(updateData);
  },

  defaultChecked: (actor) => {
    const mentalKeys = ["academics", "computer", "crafts", "investigation", "medicine", "occult", "politics", "science"];
    const physicalKeys = ["athletics", "brawl", "drive", "firearms", "larceny", "stealth", "survival", "weaponry"];
    const socialKeys = ["animalKen", "empathy", "expression", "intimidation", "persuasion", "socialize", "streetwise", "subterfuge"];

    const checkMental = mentalKeys.every(k => (actor.system.skills_mental?.[k]?.value == 0));
    const checkPhysical = physicalKeys.every(k => (actor.system.skills_physical?.[k]?.value == 0));
    const checkSocial = socialKeys.every(k => (actor.system.skills_social?.[k]?.value == 0));

    return checkMental && checkPhysical && checkSocial;
  }
};
