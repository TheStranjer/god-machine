export const attributesStep = {
  maximumAttempts: (actor) => ( 5 ),

  prompt: (actor) => ( `To assign attributes for a Chronicles of Darkness character, follow these steps precisely:

1. **Choose Category Priorities:**
   - Select one category as the **primary** category, which will receive **5 additional dots**.
   - Select one category as the **secondary** category, which will receive **4 additional dots**.
   - Select one category as the **tertiary** category, which will receive **3 additional dots**.
   - The categories and their attributes are:
     - **Mental**: Intelligence, Wits, Resolve
     - **Social**: Presence, Manipulation, Composure
     - **Physical**: Strength, Dexterity, Stamina

2. **Distribute Additional Dots:**
   - Each of the nine attributes (Strength, Dexterity, Stamina, Intelligence, Wits, Resolve, Presence, Manipulation, Composure) starts with **1 dot** by default.
   - For the **primary category**, distribute **exactly 5 additional dots** among its three attributes in any combination (e.g., 3 to one, 2 to another, 0 to the third), but no attribute can exceed **5 dots total** (including the starting dot).
   - For the **secondary category**, distribute **exactly 4 additional dots** among its three attributes, following the same rules.
   - For the **tertiary category**, distribute **exactly 3 additional dots** among its three attributes, following the same rules.
   - **Constraint:** The additional dots must be distributed within each category separately, and the totals must match 5 (primary), 4 (secondary), and 3 (tertiary).

3. **Calculate Final Attribute Values:**
   - For each attribute, the final value is **1 (starting dot) + the additional dots assigned**.
   - Verify that no attribute exceeds **5 dots total**.

4. **Return the Results:**
   - Provide the chosen **primaryCategory**, **secondaryCategory**, and **tertiaryCategory** (e.g., "Physical", "Mental", "Social").
   - Provide the final values for all nine attributes: **Strength, Dexterity, Stamina, Intelligence, Wits, Resolve, Presence, Manipulation, Composure**.

**Example:**
- Choices: **Physical** (primary), **Mental** (secondary), **Social** (tertiary).
- **Physical (primary, 5 dots):** Assign 3 to Strength, 2 to Dexterity, 0 to Stamina.
  - Final: Strength = 1 + 3 = 4, Dexterity = 1 + 2 = 3, Stamina = 1 + 0 = 1.
- **Mental (secondary, 4 dots):** Assign 2 to Intelligence, 1 to Wits, 1 to Resolve.
  - Final: Intelligence = 1 + 2 = 3, Wits = 1 + 1 = 2, Resolve = 1 + 1 = 2.
- **Social (tertiary, 3 dots):** Assign 1 to Presence, 1 to Manipulation, 1 to Composure.
  - Final: Presence = 1 + 1 = 2, Manipulation = 1 + 1 = 2, Composure = 1 + 1 = 2.
- **Output:**
  - primaryCategory: "Physical"
  - secondaryCategory: "Mental"
  - tertiaryCategory: "Social"
  - Strength: 4, Dexterity: 3, Stamina: 1
  - Intelligence: 3, Wits: 2, Resolve: 2
  - Presence: 2, Manipulation: 2, Composure: 2

**Rules to Enforce:**
- Each category must receive exactly its allotted additional dots: 5 (primary), 4 (secondary), 3 (tertiary).
- No attribute can exceed 5 dots total.
- All nine attributes must have at least 1 dot (due to the starting dot).` ),

  reasoning_effort: (actor) => "high",

  tool: (actor) => {
    const categories = ["Physical", "Mental", "Social"];
    const attrs = ["Strength", "Dexterity", "Stamina", "Intelligence", "Wits", "Resolve", "Presence", "Manipulation", "Composure"];
    const props = {
      primaryCategory: { type: "string", enum: categories },
      secondaryCategory: { type: "string", enum: categories },
      tertiaryCategory: { type: "string", enum: categories }
    };

    attrs.forEach(a => { props[a] = { type: "integer", minimum: 1, maximum: 5 }; });

    return {
      type: "function",
      function: {
        name: "generate_attributes",
        description: "Assign Attribute priorities and final dot ratings for a Chronicles of Darkness character.",
        parameters: {
          type: "object",
          properties: props,
          required: ["primaryCategory", "secondaryCategory", "tertiaryCategory", ...attrs]
        }
      }
    };
  },

  validate: (actor, data) => {
    const errors = [];

    const categories = ["Physical", "Mental", "Social"];
    const attrMap = {
      Physical: ["Strength", "Dexterity", "Stamina"],
      Mental: ["Intelligence", "Wits", "Resolve"],
      Social: ["Presence", "Manipulation", "Composure"]
    };
  
    ["primaryCategory", "secondaryCategory", "tertiaryCategory"].forEach(k => {
      if (!categories.includes(data[k])) {
        errors.push(`${k} must be one of Physical, Mental, Social`);
      }
    });
  
    if (new Set([data.primaryCategory, data.secondaryCategory, data.tertiaryCategory]).size !== 3) {
      errors.push("Each category must be assigned exactly once");
    }
  
    Object.values(attrMap).flat().forEach(a => {
      if (!Number.isInteger(data[a]) || data[a] < 1 || data[a] > 5) {
        errors.push(`${a} must be an integer 1-5`);
      }
    });
  
    const used = { Physical: 0, Mental: 0, Social: 0 };
    Object.entries(attrMap).forEach(([cat, list]) => { list.forEach(a => { used[cat] += data[a] - 1; }); });
    const expected = {};
    expected[data.primaryCategory] = 5;
    expected[data.secondaryCategory] = 4;
    expected[data.tertiaryCategory] = 3;
    categories.forEach(cat => {
      if (used[cat] !== expected[cat]) {
        errors.push(`${cat} must have ${expected[cat]} assigned dots but has ${used[cat]}`);
      }
    });
    return errors;
  },

  apply: async (actor, data) => {
    const physicalMap = {
      Strength: "strength",
      Dexterity: "dexterity",
      Stamina: "stamina"
    };
    const mentalMap = {
      Intelligence: "intelligence",
      Wits: "wits",
      Resolve: "resolve"
    };
    const socialMap = {
      Presence: "presence",
      Manipulation: "manipulation",
      Composure: "composure"
    };
    const updateData = {};
    
    Object.entries(physicalMap).forEach(([attr, key]) => {
      updateData[`system.attributes_physical.${key}`] = data[attr];
    });
    
    Object.entries(mentalMap).forEach(([attr, key]) => {
      updateData[`system.attributes_mental.${key}`] = data[attr];
    });
    
    Object.entries(socialMap).forEach(([attr, key]) => {
      updateData[`system.attributes_social.${key}`] = data[attr];
    });

    await actor.update(updateData);
  },

  defaultChecked: (actor) => {
    const keys = ["strength", "dexterity", "stamina", "intelligence", "wits", "resolve", "presence", "manipulation", "composure"];
    return keys.every(k => ((actor.system.attributes?.[k] ?? 1) <= 1));
  }
};
