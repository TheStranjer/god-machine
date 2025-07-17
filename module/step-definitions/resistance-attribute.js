export const resistanceAttributeStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const composure = actor.system.attributes_social.composure.value;
    const resolve = actor.system.attributes_mental.resolve.value;
    const stamina = actor.system.attributes_physical.stamina.value;
    const eligible = [];
    if (composure < 5) eligible.push(`Composure (current: ${composure})`);
    if (resolve < 5) eligible.push(`Resolve (current: ${resolve})`);
    if (stamina < 5) eligible.push(`Stamina (current: ${stamina})`);

    return `Choose one Resistance Attribute to increase by 1 dot for this Mage: the Awakening character. This represents the toughening effect of Awakening on mind, body, or soul.

• Eligible attributes (only those below 5 dots): ${eligible.join(", ")}.
• Base the choice on the character's concept, Path, Order, and details (e.g., a scholarly mage might benefit from Resolve).
• Return an object with:
  • **attribute** – the chosen attribute (lowercase, e.g., "resolve").`;
  },
  tool: (actor) => {
    const eligible = [];
    if (actor.system.attributes_social.composure.value < 5) eligible.push("composure");
    if (actor.system.attributes_mental.resolve.value < 5) eligible.push("resolve");
    if (actor.system.attributes_physical.stamina.value < 5) eligible.push("stamina");

    return {
      type: "function",
      function: {
        name: "choose_resistance_attribute",
        description: "Select a Resistance Attribute to bump",
        parameters: {
          type: "object",
          properties: {
            attribute: { type: "string", enum: eligible }
          },
          required: ["attribute"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    const attr = data.attribute;
    if (!["composure", "resolve", "stamina"].includes(attr)) {
      errors.push("Invalid attribute chosen");
      return errors;
    }

    let value;
    if (attr === "composure") value = actor.system.attributes_social.composure.value;
    else if (attr === "resolve") value = actor.system.attributes_mental.resolve.value;
    else if (attr === "stamina") value = actor.system.attributes_physical.stamina.value;

    if (value >= 5) {
      errors.push(`Chosen attribute ${attr} is already at 5 or more`);
    }

    return errors;
  },
  apply: async (actor, data) => {
    const attr = data.attribute;
    const updateData = { system: {} };
    let category, key;

    if (attr === "composure") {
      category = "attributes_social";
      key = "composure";
    } else if (attr === "resolve") {
      category = "attributes_mental";
      key = "resolve";
    } else if (attr === "stamina") {
      category = "attributes_physical";
      key = "stamina";
    }

    if (category && key) {
      const currentValue = actor.system[category][key].value;
      updateData.system[category] = { [key]: { value: currentValue + 1 } };
      await actor.update(updateData);
    }
  },
  defaultChecked: (actor) => {
    const mentalSum = (actor.system.attributes_mental.intelligence.value || 0) +
                       (actor.system.attributes_mental.wits.value || 0) +
                       (actor.system.attributes_mental.resolve.value || 0);
    const physicalSum = (actor.system.attributes_physical.strength.value || 0) +
                        (actor.system.attributes_physical.dexterity.value || 0) +
                        (actor.system.attributes_physical.stamina.value || 0);
    const socialSum = (actor.system.attributes_social.presence.value || 0) +
                      (actor.system.attributes_social.manipulation.value || 0) +
                      (actor.system.attributes_social.composure.value || 0);
    const total = mentalSum + physicalSum + socialSum;
    return total <= 21;
  }
};