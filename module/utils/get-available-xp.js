export const getAvailableXP = (actor) => {
  const totalBeats = actor.system.progress.reduce((acc, entry) => acc + (entry.beats || 0), 0);
  return Math.floor(totalBeats / 5);
};