export const maxProductionSteps = 12;
export const defaultStageCodes = ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"];
export const defaultProductionSteps = ["Ươm tơ", "Mắc cửi", "Dệt lụa", "Nhuộm màu", "Cán láng"];

export function productionStepTitles(steps) {
  return steps?.length ? steps : defaultProductionSteps;
}

export function usesDefaultProductionSteps(steps) {
  const titles = productionStepTitles(steps);
  return titles.length === defaultProductionSteps.length && titles.every((title, index) => title === defaultProductionSteps[index]);
}

export function productionStepKey(title) {
  return title.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}
