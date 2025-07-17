import { stripHtmlRegex } from './strip-html-regex.js '

export const actorToCharacterSheet = (actor) => {
  const sheet = {
    demographics: {
      name: actor.name,
      description: actor.system.description,
      virtue: actor.system.virtue,
      vice: actor.system.vice,
      age: actor.system.age,
      gender: actor.system.gender,
      age: actor.system.age,
      faction: actor.system.faction,
      aspirations: actor.system.aspirations,
      notes: actor.system.notes,
    },
    attributes: {
      intelligence: actor.system.attributes_mental.intelligence.value,
      wits: actor.system.attributes_mental.wits.value,
      resolve: actor.system.attributes_mental.resolve.value,
      strength: actor.system.attributes_physical.strength.value,
      dexterity: actor.system.attributes_physical.dexterity.value,
      stamina: actor.system.attributes_physical.stamina.value,
      presence: actor.system.attributes_social.presence.value,
      manipulation: actor.system.attributes_social.manipulation.value,
      composure: actor.system.attributes_social.composure.value,
    },
    skills: {
      academics: { value: actor.system.skills_mental.academics.value, specialties: actor.system.skills_mental.academics.specialties },
      computer: { value: actor.system.skills_mental.computer.value, specialties: actor.system.skills_mental.computer.specialties },
      crafts: { value: actor.system.skills_mental.crafts.value, specialties: actor.system.skills_mental.crafts.specialties },
      investigation: { value: actor.system.skills_mental.investigation.value, specialties: actor.system.skills_mental.investigation.specialties },
      medicine: { value: actor.system.skills_mental.medicine.value, specialties: actor.system.skills_mental.medicine.specialties },
      occult: { value: actor.system.skills_mental.occult.value, specialties: actor.system.skills_mental.occult.specialties },
      politics: { value: actor.system.skills_mental.politics.value, specialties: actor.system.skills_mental.politics.specialties },
      science: { value: actor.system.skills_mental.science.value, specialties: actor.system.skills_mental.science.specialties },
      animalKen: { value: actor.system.skills_social.animalKen.value, specialties: actor.system.skills_social.animalKen.specialties },
      empathy: { value: actor.system.skills_social.empathy.value, specialties: actor.system.skills_social.empathy.specialties },
      expression: { value: actor.system.skills_social.expression.value, specialties: actor.system.skills_social.expression.specialties },
      intimidation: { value: actor.system.skills_social.intimidation.value, specialties: actor.system.skills_social.intimidation.specialties },
      persuasion: { value: actor.system.skills_social.persuasion.value, specialties: actor.system.skills_social.persuasion.specialties },
      socialize: { value: actor.system.skills_social.socialize.value, specialties: actor.system.skills_social.socialize.specialties },
      streetwise: { value: actor.system.skills_social.streetwise.value, specialties: actor.system.skills_social.streetwise.specialties },
      subterfuge: { value: actor.system.skills_social.subterfuge.value, specialties: actor.system.skills_social.subterfuge.specialties },
      athletics: { value: actor.system.skills_physical.athletics.value, specialties: actor.system.skills_physical.athletics.specialties },
      brawl: { value: actor.system.skills_physical.brawl.value, specialties: actor.system.skills_physical.brawl.specialties },
      drive: { value: actor.system.skills_physical.drive.value, specialties: actor.system.skills_physical.drive.specialties },
      firearms: { value: actor.system.skills_physical.firearms.value, specialties: actor.system.skills_physical.firearms.specialties },
      larceny: { value: actor.system.skills_physical.larceny.value, specialties: actor.system.skills_physical.larceny.specialties },
      stealth: { value: actor.system.skills_physical.stealth.value, specialties: actor.system.skills_physical.stealth.specialties },
      survival: { value: actor.system.skills_physical.survival.value, specialties: actor.system.skills_physical.survival.specialties },
      weaponry: { value: actor.system.skills_physical.weaponry.value, specialties: actor.system.skills_physical.weaponry.specialties },
    },
    merits: actor.items.filter(item => item.type == "merit").map(merit => ({ name: merit.name, rating: merit.system.rating }))
  };

  sheet.equipment = actor.items.filter(item => item.type == "equipment").map(equipment => ({
    name: equipment.name,
    dicePool: equipment.dicePool,
    effects: equipment.effects,
    isMagical: equipment.isMagical,
    structure: equipment.structure,
    description: equipment.description
  }));

  if (actor.system.characterType === "Werewolf") {
    sheet.werewolf_traits = actor.system.werewolf_traits;
    sheet.werewolf_renown = actor.system.werewolf_renown;
    sheet.touchstone_flesh = actor.system.touchstone_flesh;
    sheet.touchstone_spirit = actor.system.touchstone_spirit;
    sheet.huntersAspect = actor.system.huntersAspect;
    sheet.auspice = actor.system.auspice;
    sheet.tribe = actor.system.tribe;
    sheet.gift_facets = actor.items.filter(item => item.type == "facet").map(facet => ({ name: facet.name, gift: facet?.system?.gift, type: facet?.system?.giftType }));
    sheet.blood = actor.system.virtue;
    sheet.bone = actor.system.vice;
  }

  if (actor.system.characterType === "Mage") {
    sheet.mage_traits = actor.system.mage_traits;
    sheet.nimbus = actor.system.nimbus;
    sheet.obsessions = actor.system.obsessions;
    sheet.spells = actor.items.filter(item => item.type == "spell");
    sheet.arcana_gross = actor.system.arcana_gross;
    sheet.arcana_subtle = actor.system.arcana_subtle;
    sheet.path = actor.system.path;
    sheet.order = actor.system.order;
  }

  return sheet;
}