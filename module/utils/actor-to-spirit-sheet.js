import { stripHtmlRegex } from './strip-html-regex.js';

export const actorToSpiritSheet = (actor) => {
  const sheet = {
    demographics: {
      name: actor.name,
      description: actor.system.description,
      virtue: actor.system.virtue,
      vice: actor.system.vice,
      ban: actor.system.bans,
      bane: actor.system.banes,
      rankName: actor.system.rankName,
      aliases: actor.system.aliases,
      trueName: actor.system.trueName,
      aspirations: actor.system.aspirations,
      notes: actor.system.notes,
    },
    attributes: {
      power: actor.system.eph_physical.power.value,
      finesse: actor.system.eph_social.finesse.value,
      resistance: actor.system.eph_mental.resistance.value,
    },
    derivedTraits: {
      size: actor.system.derivedTraits.size.value,
      speed: actor.system.derivedTraits.speed.value,
      defense: actor.system.derivedTraits.defense.value,
      initiativeMod: actor.system.derivedTraits.initiativeMod.value,
      perception: actor.system.derivedTraits.perception.value,
      health: actor.system.derivedTraits.health.value,
      willpower: actor.system.derivedTraits.willpower.value,
    },
    essence: {
      value: actor.system.essence.value,
      max: actor.system.essence.max,
    },
    willpower: {
      value: actor.system.willpower.value,
      max: actor.system.willpower.max,
    },
    influences: actor.items.filter(item => item.type === "influence").map(influence => ({ 
      name: influence.name, 
      rating: influence.system.rating,
      description: stripHtmlRegex(influence.system.description)
    })),
    numina: actor.items.filter(item => item.type === "numen").map(numen => ({ 
      name: numen.name, 
      description: stripHtmlRegex(numen.system.description)
    })),
    manifestations: actor.items.filter(item => item.type === "manifestation").map(manifestation => ({ 
      name: manifestation.name, 
      description: stripHtmlRegex(manifestation.system.description)
    }))
  };

  return sheet;
}