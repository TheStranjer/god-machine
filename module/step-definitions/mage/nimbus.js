export const nimbusStep = {
  maximumAttempts: (actor) => 3,
  prompt: (actor) => {
    const path = actor.system.path || "unknown";
    return `Generate a flavorful Nimbus description for this Mage: the Awakening character, based on their Path (${path}) and other personal details from the sheet (such as description, virtue, vice, aspirations, etc.). The Nimbus is the mage's supernatural aura, manifesting in three forms:

**Long-Term Nimbus**: A series of subtle coincidences that surround the mage, aligning with their Path. These are story-based effects of strangeness:
- Acanthus: Strange luck, lost memories rising, visions of possible fates.
- Mastigos: People's fears welling up, seeing internal devils.
- Moros: Ghastly hauntings, decay, rust, mechanical breakdowns.
- Obrimos: Religious revelations, extreme weather swings, blackouts.
- Thyrsus: Spirits appearing more, strange pathogens, terminal diseases vanishing.
The potency increases with Gnosis (subtle at low, obvious at Gnosis 6+), and spreads along sympathetic ties based on Wisdom (Enlightened: Strong connections; Understanding: Medium; Falling: Weak).

**Immediate Nimbus**: A powerful aura wrapping close to the mage's soul, visible in Mage Sight during spellcasting or when deliberately flared (costs Mana, visible even to non-mages). Based mostly on Path:
- Acanthus: Time bends around them, or causes fatalism.
- Mastigos: Glow with sickly green fire, or swell temptation.
- Moros: Subtle rot around them, or melancholy.
- Obrimos: Bask in holy light, or remarkable inspiration.
- Thyrsus: Mist of blood, or deep rutting instinct.
When it flares, it causes a unique Nimbus Tilt (describe its effect below), strength from spell Potency or Gnosis roll, affecting those with Resolve <= strength.

**Signature Nimbus**: Residue left on spells, Praxes, Rotes, or Attainments, recognizable in Focused Mage Sight. Looks like a remainder of the Immediate Nimbus (e.g., charring/ash if Immediate is fiery, hangover if intoxicating). Lasts a week normally, longer if imprinted.

Create creative, thematic descriptions for each form, incorporating the character's Path and personal symbolism (e.g., Shadow Name if present, magical tools, etc.). Also, invent a unique Nimbus Tilt effect that fits the theme.

Return an object with:
- **longTerm**: Description of the Long-Term Nimbus (string).
- **immediate**: Description of the Immediate Nimbus (string).
- **signature**: Description of the Signature Nimbus (string).
- **tilt**: Description of the Nimbus Tilt effect (string).`;
  },
  tool: (actor) => {
    return {
      type: "function",
      function: {
        name: "generate_nimbus",
        description: "Generate descriptions for the mage's Nimbus forms and Tilt.",
        parameters: {
          type: "object",
          properties: {
            longTerm: { type: "string" },
            immediate: { type: "string" },
            signature: { type: "string" },
            tilt: { type: "string" }
          },
          required: ["longTerm", "immediate", "signature", "tilt"],
          additionalProperties: false
        }
      }
    };
  },
  validate: (actor, data) => {
    const errors = [];
    if (!["longTerm", "immediate", "signature", "tilt"].every(key => typeof data[key] === "string" && data[key].trim().length > 0)) {
      errors.push("All fields must be non-empty strings");
    }
    return errors;
  },
  apply: async (actor, data) => {
    const formattedNimbus = `LONG-TERM
${data.longTerm}

IMMEDIATE
${data.immediate}

SIGNATURE
${data.signature}

TILT
${data.tilt}
`.trim();
    await actor.update({ "system.nimbus": formattedNimbus });
  },
  defaultChecked: (actor) => {
    return !actor.system.nimbus || actor.system.nimbus.trim() === "";
  }
};