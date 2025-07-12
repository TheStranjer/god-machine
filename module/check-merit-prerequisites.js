export const checkMeritPrerequisites = (actorData, prereqString) => {
  if (!prereqString) return true;

  try {
    const system = actorData.system || {};
    const scope = {};

    // Populate attributes
    ['physical', 'mental', 'social'].forEach(cat => {
      const attrs = system[`attributes_${cat}`] || {};
      for (const key in attrs) {
        scope[key] = attrs[key].value ?? 0;
      }
    });

    // Populate skills
    ['physical', 'mental', 'social'].forEach(cat => {
      const skills = system[`skills_${cat}`] || {};
      for (const key in skills) {
        scope[key] = skills[key].value ?? 0;
      }
    });

    // Populate derived traits (using final where available)
    const derived = system.derivedTraits || {};
    for (const key in derived) {
      scope[key] = derived[key].final ?? derived[key].value ?? 0;
    }

    // Other common fields (max where applicable)
    scope.willpower = system.willpower?.max ?? 0;
    scope.mana = system.mana?.max ?? 0;
    scope.integrity = system.integrity ?? 0;
    scope.potency = system.potency ?? 0;

    // Mage-specific
    const mage = system.mage_traits || {};
    scope.gnosis = mage.gnosis?.value ?? 0;
    scope.wisdom = mage.wisdom?.value ?? 0;

    // Vampire-specific
    const vampire = system.vampire_traits || {};
    scope.bloodPotency = vampire.bloodPotency?.value ?? 0;
    scope.humanity = vampire.humanity?.value ?? 0;

    // Changeling-specific
    const changeling = system.changeling_traits || {};
    scope.wyrd = changeling.wyrd?.value ?? 0;
    scope.mantle = changeling.mantle?.value ?? 0;

    // Werewolf-specific
    const werewolf = system.werewolf_traits || {};
    scope.primalUrge = werewolf.primalUrge?.value ?? 0;
    scope.harmony = werewolf.harmony?.value ?? 0;

    // Demon-specific
    scope.primum = system.demon_traits?.primum?.value ?? 0;

    // Sineater-specific
    scope.synergy = system.sineater_traits?.synergy?.value ?? 0;

    // Arcana (gross and subtle)
    const arcanaGross = system.arcana_gross || {};
    for (const key in arcanaGross) {
      scope[key] = arcanaGross[key].value ?? 0;
    }
    const arcanaSubtle = system.arcana_subtle || {};
    for (const key in arcanaSubtle) {
      scope[key] = arcanaSubtle[key].value ?? 0;
    }

    // Functions
    const merit = (name) => {
      const items = scope?.merits?.items || [];
      const item = items.find(i => i.name === name);
      return item ? (item.system?.rating ?? 0) : 0;
    };

    const getSkill = (skillName) => {
      for (const cat of ['physical', 'mental', 'social']) {
        const skills = system[`skills_${cat}`] || {};
        if (skills[skillName]) {
          return skills[skillName];
        }
      }
      return null;
    };

    const has_specialty = (skill, spec) => {
      const skillObj = getSkill(skill);
      const lowerCase = String(spec).toLowerCase();
      return skillObj?.specialties?.map(s => s.toLowerCase())?.includes(lowerCase) ?? false;
    };

    scope.merits = actorData?.inventory?.merit;

    // Inject functions into scope
    scope.merit = merit;
    scope.has_specialty = has_specialty;

    scope.splat = actorData.system.characterType;

    math.import({
      equal: function (a, b) { return a === b },
      unequal: function (a, b) { return a !== b }
    }, { override: true })

    const node = math.parse(prereqString);
    const compiled = node.compile();
    return compiled.evaluate(scope);
  } catch (error) {
    console.error('Prerequisite evaluation error:', error);
    return false;  // Fail closed on error
  }
}