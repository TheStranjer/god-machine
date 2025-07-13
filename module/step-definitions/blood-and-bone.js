export const bloodAndBoneStep = {
  maximumAttempts: (actor) => (5),
  prompt: (actor) => (
    `Choose Blood and Bone archetypes for this Werewolf: the Forsaken character.

• Blood archetype reflects behavior on the hunt, when instincts dominate.
• Bone archetype reflects self-identity behind the fury.
• You can choose from the examples or create custom ones that fit the character's concept.
• Examples of Blood archetypes: Alpha, Challenger, Destroyer, Fox, Monster, Soldier. (See descriptions for details.)
• Examples of Bone archetypes: Community Organizer, Cub, Guru, Hedonist, Lone Wolf, Wallflower. (See descriptions for details.)
• For custom archetypes, follow this style guide:
  - Name: A single word or short phrase that captures the essence (e.g., "Alpha", "Hedonist").
  - Description: 2-4 sentences describing the behavior and identity.
  - Include Willpower recovery: "Your character recovers a point of Willpower when [small-scale bad choice or action]. [He/She] regains all Willpower when [large-scale submission to Kuruth/hunt or standing ground]."
  - Ensure it aligns with the dichotomy: Blood for chaotic hunt actions, Bone for rational self-identity.
• Return an object with:
  • **blood_name** - Name of the Blood archetype (string).
  • **blood_description** - Full description including Willpower recovery (string).
  • **bone_name** - Name of the Bone archetype (string).
  • **bone_description** - Full description including Willpower recovery (string).
  
EXAMPLE BONE ARCHETYPE
\`\`\`
Lone Wolf — The Lone Wolf knows that sometimes, the answer lies not with the pack, but with the individual. She's not inherently bad at working with a team, but she's much more willing to handle something herself if she feels it's the best recourse.

Your character recovers a point of Willpower when she acts independently of her pack to solve a pack problem. She regains all Willpower when her pack is on the hunt, and she subverts their plans and solves the problem alone.
\`\`\`

EXAMPLE BLOOD ARCHETYPE
\`\`\`
The Monster — A Monster revels in the shadows, using terror and shock to cripple the victims of his hunts. It's less important to overwhelm a victim by force than it is to overwhelm it psychologically. By the time his jaws clamp down, the fight should already be over.

Your character recovers a point of Willpower when he resorts to disgusting or frightening someone into submission. He recovers all Willpower when using the hunt or Kuruth as a terror tactic.
\`\`\`
`),
  tool: (actor) => {
    return {
      type: "function",
      function: {
        name: "generate_blood_and_bone",
        description: "Choose or create Blood and Bone archetypes.",
        parameters: {
          type: "object",
          properties: {
            blood_name: { type: "string", minLength: 1, maxLength: 50 },
            blood_description: { type: "string", minLength: 50, maxLength: 1000 },
            bone_name: { type: "string", minLength: 1, maxLength: 50 },
            bone_description: { type: "string", minLength: 50, maxLength: 1000 }
          },
          required: ["blood_name", "blood_description", "bone_name", "bone_description"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    if (!data.blood_name || data.blood_name.length > 50) {
      errors.push("Invalid blood_name");
    }
    if (!data.blood_description || data.blood_description.length < 50 || data.blood_description.length > 1000) {
      errors.push("Invalid blood_description");
    }
    if (!data.bone_name || data.bone_name.length > 50) {
      errors.push("Invalid bone_name");
    }
    if (!data.bone_description || data.bone_description.length < 50 || data.bone_description.length > 1000) {
      errors.push("Invalid bone_description");
    }
    // Basic style check (contains Willpower mentions)
    if (!data.blood_description.includes("recovers a point of Willpower") || !data.blood_description.includes("regains all Willpower")) {
      errors.push("Blood description missing Willpower recovery details; there should be a mention of recovering a point of Willpower and regaining all Willpower");
    }
    if (!data.bone_description.includes("recovers a point of Willpower") || !data.bone_description.includes("regains all Willpower")) {
      errors.push("Bone description missing Willpower recovery details; there should be a mention of recovering a point of Willpower and regaining all Willpower");
    }
    return errors;
  },
  apply: async (actor, data) => {
    const updateData = { system: {} };
    updateData.system.virtue = data.blood_name;
    updateData.system.vice = data.bone_name;

    // Append to notes
    const currentNotes = actor.system.notes || "";
    const appendText = `BLOOD ARCHETYPE
${data.blood_name} - ${data.blood_description.replace("\\n", "\n")}

BONE ARCHETYPE
${data.bone_name} - ${data.bone_description.replace("\\n", "\n")}`;
    updateData.system.notes = currentNotes + appendText;

    await actor.update(updateData);
  },
  defaultChecked: (actor) => {
    return !actor.system.virtue || !actor.system.vice;
  }
};