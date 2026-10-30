// The backend's 10 growth stages (stage_no 1-10) in the 5 columns shown here. By
// number, because names like "Stem Elongation", "Booting" and "Grain Filling" match
// none of the keywords below and all landed in Land Prep.
const STAGE_GROUP_BY_NO = {
  1: 'Land Prep',                                        // germination & seedling
  2: 'Planting',                                         // nursery until transplanting
  3: 'Vegetative', 4: 'Vegetative',                      // tillering, stem elongation
  5: 'Reproductive', 6: 'Reproductive', 7: 'Reproductive', // booting, heading, grain filling
  8: 'Harvesting', 9: 'Harvesting', 10: 'Harvesting',    // ripening, harvesting, post-harvest
};

export function normalizeStage(rawName, stageNo) {
  if (STAGE_GROUP_BY_NO[stageNo]) return STAGE_GROUP_BY_NO[stageNo];
  const s = (rawName || '').toLowerCase();
  if (!s)                       return 'Land Prep';
  if (s.includes('land') || s.includes('prep') || s.includes('seedling')) return 'Land Prep';
  if (s.includes('transplant') || s.includes('plant'))                    return 'Planting';
  if (s.includes('vegetative') || s.includes('tiller'))                   return 'Vegetative';
  if (s.includes('reproductive') || s.includes('panicle') || s.includes('flower')) return 'Reproductive';
  if (s.includes('harvest') || s.includes('ripening') || s.includes('mature'))     return 'Harvesting';
  return 'Land Prep';
}
