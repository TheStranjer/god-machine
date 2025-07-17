export const getAvailableXP = (actor) => {
  const totalBeats = actor.system.progress.reduce((acc, entry) => acc + (entry.beats || 0), 0);
  return Math.floor(totalBeats / 5);
};

export const getAvailableArcaneXP = (actor) => {
  if (actor.system.characterType != "Mage") {
    return 0;
  }

  const totalBeats = actor.system.progress.reduce((acc, entry) => acc + (entry.arcaneBeats || 0), 0);
  return Math.floor(totalBeats / 5);
};