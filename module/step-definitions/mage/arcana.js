export const arcanaStep = {
  maximumAttempts: (actor) => 5,
  prompt: (actor) => {
    const path = actor.system.path || "Unknown";
    const pathData = {
      "Acanthus": { ruling: ["Time", "Fate"], inferior: "Forces" },
      "Mastigos": { ruling: ["Mind", "Space"], inferior: "Matter" },
      "Moros": { ruling: ["Death", "Matter"], inferior: "Spirit" },
      "Obrimos": { ruling: ["Prime", "Forces"], inferior: "Death" },
      "Thyrsus": { ruling: ["Life", "Spirit"], inferior: "Mind" },
    }[path] || { ruling: [], inferior: "" };

    const allArcana = ["Death", "Fate", "Forces", "Life", "Matter", "Mind", "Prime", "Space", "Spirit", "Time"];
    const availableArcana = allArcana.filter(a => a !== pathData.inferior);

    return `Assign starting Arcana dots for this Mage: the Awakening character on Path ${path}.

Rules:
- Total dots: Exactly 6.
- Maximum per Arcanum: 3 dots, and only one Arcanum can have 3 dots.
- Ruling Arcana (${pathData.ruling.join(" and ")}): Must allocate 3 to 5 dots total across them. Each must have at least 1 dot.
- Inferior Arcanum (${pathData.inferior}): 0 dots (cannot assign any).
- Common Arcana (all others): 0 to 3 dots, but follow total and max rules.
- Valid distributions: Specialist (3-2-1 or 3-1-1-1), Balanced (2-2-2 or 2-2-1-1), Generalist (2-1-1-1-1).

Available Arcana to assign (exclude ${pathData.inferior}): ${availableArcana.join(", ")}.

Return an object with keys for each available Arcanum (lowercase, e.g., "time": 2), values as integers. Ensure rulings have min 1 each.`;
  },
  tool: (actor) => {
    const path = actor.system.path || "Unknown";
    const pathData = {
      "Acanthus": { ruling: ["Time", "Fate"], inferior: "Forces" },
      "Mastigos": { ruling: ["Mind", "Space"], inferior: "Matter" },
      "Moros": { ruling: ["Death", "Matter"], inferior: "Spirit" },
      "Obrimos": { ruling: ["Prime", "Forces"], inferior: "Death" },
      "Thyrsus": { ruling: ["Life", "Spirit"], inferior: "Mind" },
    }[path] || { ruling: [], inferior: "" };

    const arcanaMap = {
      "death": "Death", "fate": "Fate", "forces": "Forces", "life": "Life", "matter": "Matter",
      "mind": "Mind", "prime": "Prime", "space": "Space", "spirit": "Spirit", "time": "Time"
    };

    const properties = {};
    const required = [];
    Object.keys(arcanaMap).forEach(arc => {
      const key = arc;
      if (arcanaMap[key] !== pathData.inferior) {
        const isRuling = pathData.ruling.includes(arcanaMap[key]);
        properties[key] = { type: "integer", minimum: isRuling ? 1 : 0, maximum: 3 };
        if (isRuling) required.push(key);
      }
    });

    return {
      type: "function",
      function: {
        name: "assign_arcana",
        description: "Assign dots to available Arcana.",
        parameters: {
          type: "object",
          properties,
          required,
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const path = actor.system.path || "Unknown";
    const pathData = {
      "Acanthus": { ruling: ["Time", "Fate"], inferior: "Forces" },
      "Mastigos": { ruling: ["Mind", "Space"], inferior: "Matter" },
      "Moros": { ruling: ["Death", "Matter"], inferior: "Spirit" },
      "Obrimos": { ruling: ["Prime", "Forces"], inferior: "Death" },
      "Thyrsus": { ruling: ["Life", "Spirit"], inferior: "Mind" },
    }[path] || { ruling: [], inferior: "" };

    const arcanaMap = {
      "death": "Death", "fate": "Fate", "forces": "Forces", "life": "Life", "matter": "Matter",
      "mind": "Mind", "prime": "Prime", "space": "Space", "spirit": "Spirit", "time": "Time"
    };

    const assignedKeys = Object.keys(data);
    const expectedKeys = Object.keys(arcanaMap).filter(k => arcanaMap[k] !== pathData.inferior);
    if (assignedKeys.length !== expectedKeys.length || !assignedKeys.every(k => expectedKeys.includes(k))) {
      errors.push("Must assign exactly the available Arcana");
    }

    let totalDots = 0;
    let rulingDots = 0;
    let numAt3 = 0;
    const rulingKeys = pathData.ruling.map(r => Object.keys(arcanaMap).find(k => arcanaMap[k] === r));

    Object.entries(data).forEach(([key, value]) => {
      if (!Number.isInteger(value) || value < 0 || value > 3) {
        errors.push(`Invalid value for ${key}: must be integer 0-3`);
      }
      totalDots += value;
      if (rulingKeys.includes(key)) {
        if (value < 1) {
          errors.push(`Ruling Arcanum ${key} must have at least 1 dot`);
        }
        rulingDots += value;
      }
      if (value === 3) numAt3++;
    });

    if (totalDots !== 6) {
      errors.push(`Total dots must be exactly 6 (current: ${totalDots})`);
    }
    if (rulingDots < 3 || rulingDots > 5) {
      errors.push(`Ruling Arcana dots must be 3-5 (current: ${rulingDots})`);
    }
    if (numAt3 > 1) {
      errors.push("Only one Arcanum can have 3 dots");
    }

    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };

    const grossKeys = ["forces", "life", "matter", "space", "time"];
    const subtleKeys = ["death", "fate", "mind", "prime", "spirit"];

    grossKeys.forEach(key => {
      updateData.system.arcana_gross = updateData.system.arcana_gross || {};
      updateData.system.arcana_gross[key] = { value: data[key] || 0 };
    });

    subtleKeys.forEach(key => {
      updateData.system.arcana_subtle = updateData.system.arcana_subtle || {};
      updateData.system.arcana_subtle[key] = { value: data[key] || 0 };
    });

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    const grossSum = Object.values(actor.system.arcana_gross || {}).reduce((sum, arc) => sum + (arc.value || 0), 0);
    const subtleSum = Object.values(actor.system.arcana_subtle || {}).reduce((sum, arc) => sum + (arc.value || 0), 0);
    return grossSum + subtleSum === 0;
  }
};