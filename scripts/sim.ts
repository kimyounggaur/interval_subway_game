/** Monte Carlo diagnostic for this implementation. Not a golden-reference comparison. */
import {
  addStamp,
  createRound,
  seededRandom,
  sectionProgress,
  SECTIONS,
  canExpress,
  retryProblem,
  type SectionId,
  type Stamps,
  type RoundMode,
} from "../src/game/index";
const trials = Number(process.env.SIM_TRIALS ?? 2000);
const scenarios: { section: SectionId; mode: RoundMode }[] = [
  { section: "s1", mode: "ear" },
  { section: "s2", mode: "ear" },
  { section: "s3", mode: "ear" },
  { section: "s4", mode: "ear" },
  { section: "s5", mode: "ear" },
  { section: "s5", mode: "transfer" },
];
const rows: {
  section: string;
  cleanProbability: string;
  unlockRounds: string;
  completeRounds: string;
}[] = [];
for (const [scenarioIndex, { section, mode }] of scenarios.entries()) {
  for (const probability of [1, 0.8, 0.6]) {
    let unlockTotal = 0;
    let completeTotal = 0;
    for (let trial = 0; trial < trials; trial++) {
      const rng = seededRandom(
        0x5eed +
          scenarioIndex * 100000 +
          trial * 97 +
          Math.round(probability * 100),
      );
      let stamps: Stamps = {};
      let missed: string[] = [];
      let unlocked = 0;
      for (let round = 1; round <= 500; round++) {
        const problems = createRound(
          section,
          8,
          Math.floor(rng() * 4294967296),
          stamps,
          missed,
          mode,
        );
        const failed = [];
        for (const problem of problems) {
          const clean = rng() < probability;
          stamps = addStamp(stamps, problem, clean);
          if (!clean) failed.push(problem);
        }
        for (const problem of failed.slice(0, 2))
          stamps = addStamp(
            stamps,
            retryProblem(problem, Math.floor(rng() * 4294967296)),
            rng() < probability,
          );
        missed = [...new Set(failed.map((p) => p.target))];
        const progress = sectionProgress(stamps, section);
        const threshold = SECTIONS.find((s) => s.id === section)!.unlock;
        if (!unlocked && threshold > 0 && progress.complete >= threshold)
          unlocked = round;
        if (canExpress(section, stamps, mode)) {
          unlockTotal += unlocked;
          completeTotal += round;
          break;
        }
        if (round === 500)
          throw new Error(`${section}/${mode} did not finish trial ${trial}`);
      }
    }
    rows.push({
      section: `${section}${section === "s5" ? ` ${mode}` : ""}`,
      cleanProbability: `${Math.round(probability * 100)}%`,
      unlockRounds: section === "s5" ? "—" : (unlockTotal / trials).toFixed(2),
      completeRounds: (completeTotal / trials).toFixed(2),
    });
  }
}
console.table(rows);
console.log(
  `${rows.length} diagnostic rows × ${trials.toLocaleString()} trials. Reference engine and golden data were not supplied; this is not the prescribed 18-row equality check.`,
);
