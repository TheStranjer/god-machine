export const urathaTouchstonesStep = {
  maximumAttempts: (actor) => (2),
  prompt: (actor) => (
    `Choose two Touchstones for this Werewolf: the Forsaken character: one physical (flesh) and one spiritual (spirit).

• Physical Touchstone (flesh) pulls toward humanity/civilization but requires forsaking the spiritual side.
• Spiritual Touchstone (spirit) pulls toward the Hisil but requires estrangement from humanity.
• Touchstones introduce conflict; they help maintain Harmony but are things the character wants but cannot fully have.
• You can choose from examples or create custom ones that fit the character's concept.
• Examples of Physical Touchstones: The Abuser, The Ex, The Old Gang, The Parents, The Religion, The Sponsor. (See descriptions for conflicts.)
• Examples of Spiritual Touchstones: The Ambitious Totem, The Buddy Spirit, The Future Self, The Locus, The Lune, The Prey, The Wilds. (See descriptions for conflicts.)
• For custom Touchstones, follow this style guide:
  - Name: A single word or short phrase that captures the essence (e.g., "The Ex", "The Locus").
  - Description: 2-4 sentences describing the Touchstone and its conflict.
  - Include mechanics: "Reinforcing the bond regains a Willpower point. Putting life or pack on the line in defense regains all Willpower. Losing it causes Harmony shift."
  - Both must descriptions must use exact phrases 'regains a Willpower point' and 'regains all Willpower' to convey exactly how to gain Willpower back.
  - Ensure built-in conflict: Explain how it pulls the character and complicates life.
• Return an object with:
  • **flesh_name** - Name of the Physical Touchstone (string).
  • **flesh_description** - Full description including conflict and mechanics (string).
  • **spirit_name** - Name of the Spiritual Touchstone (string).
  • **spirit_description** - Full description including conflict and mechanics (string).

EXAMPLE TOUCHSTONES
The Sponsor (Physical Touchstone) — Your character was in recovery for cocaine addiction. The First Change curbed the addiction, and that was wonderful. She finally shook that problem. Unfortunately, her sponsor doesn’t know any better. He sees the rage inside her. He sees the late night meetings. He sees her sneaking out, lying to her employers, and threatening that asshole next door. To him, it looks like she’s fallen off the wagon, and is hitting the coke again. He cares. To him, helping her is the next step in his personal recovery. He’s considering staging an intervention. She’ll be surprised when she comes in with blood on her hands after a hunt, only to see her closest friends and family ready to help her kick the blow.

The Wilds (Spiritual Touchstone) — The wilderness calls to your character. Those places where humans fear to tread, where the Gauntlet runs thin, where the only rule is the rule of nature, those places resonate as home for her in a way no city can hope to. However, she has a life in that civilization. She has a pack, friends, family, and an entire context she can’t just abandon and hope to maintain Harmony. Worse, the wilds demand her attention. Any time she spends a full day in the city, some awful coincidence occurs with the nature around her. Yesterday, a tree fell and nearly crashed her car. Today, flooding caused her to be late and lose her job.`
  ),
  tool: (actor) => {
    return {
      type: "function",
      function: {
        name: "generate_touchstones",
        description: "Choose or create Physical and Spiritual Touchstones.",
        parameters: {
          type: "object",
          properties: {
            flesh_name: { type: "string", minLength: 1, maxLength: 50 },
            flesh_description: { type: "string", minLength: 50, maxLength: 1000 },
            spirit_name: { type: "string", minLength: 1, maxLength: 50 },
            spirit_description: { type: "string", minLength: 50, maxLength: 1000 }
          },
          required: ["flesh_name", "flesh_description", "spirit_name", "spirit_description"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    if (!data.flesh_name || data.flesh_name.length > 50) {
      errors.push("Invalid flesh_name");
    }
    if (!data.flesh_description || data.flesh_description.length < 50 || data.flesh_description.length > 1000) {
      errors.push("Invalid flesh_description");
    }
    if (!data.spirit_name || data.spirit_name.length > 50) {
      errors.push("Invalid spirit_name");
    }
    if (!data.spirit_description || data.spirit_description.length < 50 || data.spirit_description.length > 1000) {
      errors.push("Invalid spirit_description");
    }
    // Basic style check (contains Willpower and Harmony mentions)
    if (!data.flesh_description.includes("regains a Willpower point") || !data.flesh_description.includes("regains all Willpower")) {
      errors.push("Flesh description missing Willpower recovery details; must use phrases 'regains a Willpower point' and 'regains all Willpower'");
    }
    if (!data.spirit_description.includes("regains a Willpower point") || !data.spirit_description.includes("regains all Willpower")) {
      errors.push("Spirit description missing Willpower recovery details; must use phrases 'regains a Willpower point' and 'regains all Willpower'");
    }
    if (!data.flesh_description.toLowerCase().includes("harmony") || !data.spirit_description.toLowerCase().includes("harmony")) {
      errors.push("Descriptions missing Harmony shift details");
    }
    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };
    updateData.system.touchstone_flesh = data.flesh_name;
    updateData.system.touchstone_spirit = data.spirit_name;

    // Append to notes
    const currentNotes = actor.system.notes || "";
    const appendText = `
    
FLESH TOUCHSTONE
${data.flesh_name} - ${data.flesh_description.replace("\\n", "\n")}

SPIRITUAL TOUCHSTONE
${data.spirit_name} - ${data.spirit_description.replace("\\n", "\n")}`;

    updateData.system.notes = currentNotes + appendText;

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    return !actor.system.touchstone_flesh || !actor.system.touchstone_spirit;
  }
};