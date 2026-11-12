/** Spec 1.0 §6 and appendix E. Independent implementation; reference package was not supplied. */
export const CONFIG = {
  problemsPerRound: 8,
  retryMax: 2,
  sameTargetMaxPerRound: 2,
  weightNoStamp: 2,
  weightHalf: 1,
  weightMissed: 2,
  incompleteFirst: 0.75,
  triesPerStep: 2,
  stampNeed: 2,
  unlockRatio: 2 / 3,
  expressSeconds: 20,
  toneSeconds: { sequential: 0.6, together: 1.2, move: 0.35 },
  missionMix: {
    s1: { 6: [6, 0, 0], 8: [8, 0, 0], 10: [10, 0, 0] },
    s2: { 6: [4, 1, 1], 8: [5, 1, 2], 10: [6, 1, 3] },
    s3: { 6: [4, 0, 2], 8: [5, 0, 3], 10: [6, 0, 4] },
    s4: { 6: [3, 1, 2], 8: [4, 2, 2], 10: [5, 2, 3] },
  },
  rootMix: { s3: [0, 0.7, 0.3], s4: [0.4, 0.4, 0.2] },
  earSets: [[0, 3, 4, 7, 12], [1, 2, 5], [8, 9, 10, 11], [6]],
} as const;
