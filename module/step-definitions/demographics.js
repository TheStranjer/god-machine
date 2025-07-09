const hasVirtueAndVice = (actor) => {
  return ![
    "Changeling",
    "Beast",
    "Mage",
    "Promethean",
    "Werewolf",
    "Mummy",
    "Demon",
    "Hunter",
    "Sin-Eater"
  ].includes(actor.system.characterType);
};

const maximumAge = (actor) => actor.system.characterType === "Vampire" ? 1_000 : 100;

const demographicList = (actor) => {
  const list = ["name", "age", "sex", "aspirations", "notes", "description"];

  if (hasVirtueAndVice) {
    list.push("virtue", "vice");
  }

  return list;
};

export const demographicsStep = {
  maximumAttempts: (actor) => ( 2 ),
  prompt: (actor) => ( `Generate demographics. Include ${demographicList(actor).join(", ")}.` ),
  tool: (actor) => {
    const props = {
      name: {
        type: "string",
        description: "The character’s full name."
      },
      age: {
        type: "integer",
        minimum: 18,
        maximum: maximumAge(actor),
        description: "Age in years."
      },
      sex: {
        type: "string",
        description: "Sex (case sensitive).",
        enum: ["Male", "Female"]
      },
      aspirations: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        description: "3 concise Aspirations; one long-term, two short-term.",
        items: { type: "string" }
      },
      notes: {
        type: "string",
        description: "Free-form design notes or background info."
      },
      description: {
        type: "string",
        description: "Physical appearance and personality in a few sentences."
      }
    };

    if (hasVirtueAndVice) {
      props.virtue = {
        type: "string",
        description: "Morality Virtue"
      };
      props.vice = {
        type: "string",
        description: "Morality Vice"
      };
    }

    return {
      type: "function",
      function: {
        name: "generate_demographics",
        description:
          "Return the basic concept / demographic fields for a Chronicles of Darkness Character.",
        parameters: {
          type: "object",
          properties: props,
          required: demographicList(actor)
        }
      }
    };
  },

  validate: (actor, data) => {
    const errors = [];
    const required = demographicList(actor);

    for (const key of required) {
      if (!(key in data)) {
        errors.push(`Missing required key: ${key}`);
      }
    }

    for (const key of Object.keys(data)) {
      if (!required.includes(key)) {
        errors.push(`Unexpected key present: ${key}`);
      }
    }

    if (typeof data.name !== "string" || !data.name.trim()) {
      errors.push("name must be a non-empty string");
    }

    const maxAge = maximumAge(actor);

    if (!Number.isInteger(data.age) || data.age < 18 || data.age > maxAge) {
      errors.push("age must be an integer between 18 and " + maxAge);
    }

    if (!["Male", "Female"].includes(data.sex)) {
      errors.push("sex must be Male or Female (case sensitive)");
    }

    if (!Array.isArray(data.aspirations) || data.aspirations.length != 3 || data.aspirations.some((a) => typeof a !== "string" || !a.trim())) {
      errors.push("aspirations must be an array of 3 non-empty strings");
    }

    ["notes", "description"].forEach((k) => {
      if (typeof data[k] !== "string" || !data[k].trim()) {
        errors.push(`${k} must be a non-empty string`);
      }
    });

    if (hasVirtueAndVice) {
      ["virtue", "vice"].forEach((k) => {
        if (typeof data[k] !== "string" || !data[k].trim()) {
          errors.push(`${k} must be a non-empty string`);
        }
      });
    }

    return errors;
  },

  apply: async (actor, data) => {
    const updateData = {
      name: data.name,
      "system.age": data.age,
      "system.sex": data.sex,
      "system.aspirations": data.aspirations.map(aspiration => (`* ${aspiration}`)).join("\n"),
      "system.notes": data.notes,
      "system.description": data.description
    };

    if (hasVirtueAndVice) {
      updateData["system.virtue"] = data.virtue;
      updateData["system.vice"] = data.vice;
    }

    await actor.update(updateData);
  },

  defaultChecked: (actor) => {
    const demographics = demographicList(actor);
    delete demographics.name;
    return demographics.every(key => !actor.system[key]);
  }
};