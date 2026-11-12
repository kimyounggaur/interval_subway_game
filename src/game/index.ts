import { CONFIG } from "./config";
export { CONFIG } from "./config";

export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Acc = -2 | -1 | 0 | 1 | 2;
export type Note = { letter: Letter; acc: Acc; octave: number };
export type Quality = "d" | "m" | "M" | "P" | "A";
export type Station = {
  id: string;
  line: number;
  quality: Quality;
  semitones: number;
};
export type SectionId = "s1" | "s2" | "s3" | "s4" | "s5";
export type Mission = "line" | "read" | "build" | "move" | "ear" | "transfer";
export type Stamp = { count: number; roots: string[] };
export type Stamps = Record<string, Record<string, Stamp>>;
export type Problem = {
  id: string;
  section: SectionId;
  mission: Mission;
  target: string;
  root: Note;
  station: Station;
  source?: Station;
  direction?: -1 | 1;
};
export type NoteStyle = "cde" | "doremi";
export type RoundMode = "ear" | "transfer";
const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const BASE = [0, 2, 4, 5, 7, 9, 11];
const QUALITY_NAME: Record<Quality, string> = {
  d: "감",
  m: "단",
  M: "장",
  P: "완전",
  A: "증",
};
export const ROOTS: Note[] = [
  ...LETTERS.map((letter) => ({ letter, acc: 0 as Acc, octave: 4 })),
  { letter: "C", acc: 1, octave: 4 },
  { letter: "F", acc: 1, octave: 4 },
  { letter: "E", acc: -1, octave: 4 },
  { letter: "B", acc: -1, octave: 4 },
];
export const COLORS = [
  { line: "#F41B2F", edge: "#C9162D", tint: "#FDCDD1" },
  { line: "#F86508", edge: "#D15502", tint: "#FDDDC9" },
  { line: "#FCBD02", edge: "#B07800", tint: "#FEF2AD" },
  { line: "#21AC24", edge: "#12891D", tint: "#CEEDCF" },
  { line: "#0170F2", edge: "#005FC9", tint: "#C7E0FC" },
  { line: "#2335FA", edge: "#0F31D9", tint: "#CFD3FE" },
  { line: "#8B1ACD", edge: "#6F19A5", tint: "#E5CDF4" },
  { line: "#FA2591", edge: "#E21B60", tint: "#FECFE7" },
];
export const SECTIONS: {
  id: SectionId;
  title: string;
  description: string;
  total: number;
  unlock: number;
}[] = [
  {
    id: "s1",
    title: "노선 찾기",
    description: "줄과 칸을 세며 1~8도선을 찾아요.",
    total: 8,
    unlock: 6,
  },
  {
    id: "s2",
    title: "가운데 역",
    description: "완전·장·단 역과 반음 수를 배워요.",
    total: 12,
    unlock: 8,
  },
  {
    id: "s3",
    title: "기준음 바꾸기",
    description: "다른 음에서 출발해 같은 역을 찾아요.",
    total: 12,
    unlock: 8,
  },
  {
    id: "s4",
    title: "끝 역",
    description: "증·감 역과 겹임시표를 배워요.",
    total: 15,
    unlock: 10,
  },
  {
    id: "s5",
    title: "귀로 찾기와 환승",
    description: "소리로 찾고 같은 소리의 다른 역으로 환승해요.",
    total: 26,
    unlock: 0,
  },
];

export function stationsOf(line: number): Station[] {
  if (!Number.isInteger(line) || line < 1 || line > 13) return [];
  const simple = ((line - 1) % 7) + 1;
  const offset = Math.floor((line - 1) / 7) * 12;
  const perfect = [1, 4, 5].includes(simple);
  const qualities: Quality[] =
    line === 1 ? ["P", "A"] : perfect ? ["d", "P", "A"] : ["d", "m", "M", "A"];
  return qualities.map((quality) => ({
    id: `${line}${quality}`,
    line,
    quality,
    semitones:
      BASE[simple - 1] +
      offset +
      (quality === "d"
        ? perfect
          ? -1
          : -2
        : quality === "m"
          ? -1
          : quality === "A"
            ? 1
            : 0),
  }));
}
export function allStations(maxLine = 8): Station[] {
  return Array.from({ length: Math.min(13, Math.max(0, maxLine)) }, (_, i) =>
    stationsOf(i + 1),
  ).flat();
}
export function stationById(id: string): Station | null {
  const m = /^(\d+)([dmMPA])$/.exec(id);
  return m ? (stationsOf(Number(m[1])).find((s) => s.id === id) ?? null) : null;
}
export function stationName(station: Station): string {
  return `${QUALITY_NAME[station.quality]}${station.line}도`;
}
export function midi(note: Note): number {
  return (
    12 * (note.octave + 1) + NATURAL[LETTERS.indexOf(note.letter)] + note.acc
  );
}
export function atStaffPosition(root: Note, line: number): Note {
  const index = LETTERS.indexOf(root.letter) + line - 1;
  return {
    letter: LETTERS[((index % 7) + 7) % 7],
    acc: 0,
    octave: root.octave + Math.floor(index / 7),
  };
}
export function upperNote(root: Note, station: Station): Note | null {
  const upper = atStaffPosition(root, station.line);
  const acc = midi(root) + station.semitones - midi(upper);
  return acc >= -2 && acc <= 2 ? { ...upper, acc: acc as Acc } : null;
}
export function identify(lower: Note, upper: Note): Station | null {
  const line =
    LETTERS.indexOf(upper.letter) -
    LETTERS.indexOf(lower.letter) +
    7 * (upper.octave - lower.octave) +
    1;
  return (
    stationsOf(line).find((s) => s.semitones === midi(upper) - midi(lower)) ??
    null
  );
}
export function neighbor(station: Station, direction: -1 | 1): Station | null {
  const stations = stationsOf(station.line);
  return (
    stations[stations.findIndex((s) => s.id === station.id) + direction] ?? null
  );
}
export function transferOf(station: Station): Station | null {
  return (
    allStations(8).find(
      (s) => s.id !== station.id && s.semitones === station.semitones,
    ) ?? null
  );
}
export function staffStep(note: Note): number {
  return LETTERS.indexOf(note.letter) + 7 * (note.octave - 4);
}
export function ledgerSteps(note: Note): number[] {
  const step = staffStep(note);
  const result: number[] = [];
  for (let i = 0; i >= step; i -= 2) result.push(i);
  for (let i = 12; i <= step; i += 2) result.push(i);
  return result;
}
export function needsNatural(lower: Note, upper: Note): boolean {
  return (
    staffStep(lower) === staffStep(upper) && lower.acc !== 0 && upper.acc === 0
  );
}
export function keyboardWindow(root: Note): number {
  let start = midi(root);
  while (!NATURAL.includes(((start % 12) + 12) % 12)) start--;
  return start;
}
export function keyboardKeys(root: Note): { midi: number; black: boolean }[] {
  const keys: { midi: number; black: boolean }[] = [];
  let white = 0;
  for (let m = keyboardWindow(root); white < 9; m++) {
    const black = !NATURAL.includes(((m % 12) + 12) % 12);
    keys.push({ midi: m, black });
    if (!black) white++;
  }
  return keys;
}
export function frequency(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}
export function rootId(note: Note): string {
  return `${note.letter}${note.acc === 0 ? "" : note.acc > 0 ? "#".repeat(note.acc) : "b".repeat(-note.acc)}`;
}
export function noteLabel(note: Note, style: NoteStyle = "cde"): string {
  const name =
    style === "doremi"
      ? ["도", "레", "미", "파", "솔", "라", "시"][LETTERS.indexOf(note.letter)]
      : note.letter;
  return (
    name +
    (note.acc === 0
      ? ""
      : note.acc === 2
        ? "𝄪"
        : note.acc > 0
          ? "♯"
          : "♭".repeat(-note.acc))
  );
}
export function naturalStart(root: Note, line: number): Station {
  return (
    stationsOf(line).find((s) => upperNote(root, s)?.acc === 0) ??
    stationsOf(line)[0]
  );
}
const middle = () =>
  allStations().filter((s) => ["P", "m", "M"].includes(s.quality));
const edges = () => allStations().filter((s) => ["d", "A"].includes(s.quality));
export function targetsFor(
  section: SectionId,
  mode: RoundMode = "ear",
): string[] {
  if (section === "s1") return Array.from({ length: 8 }, (_, i) => `L${i + 1}`);
  if (section === "s2" || section === "s3") return middle().map((s) => s.id);
  if (section === "s4") return edges().map((s) => s.id);
  return Array.from(
    { length: 13 },
    (_, i) => `${mode === "ear" ? "ear" : "tr"}${i}`,
  );
}
export function sectionProgress(
  stamps: Stamps,
  section: SectionId,
): { complete: number; total: number; finished: boolean } {
  const targets =
    section === "s5"
      ? [...targetsFor(section, "ear"), ...targetsFor(section, "transfer")]
      : targetsFor(section);
  const complete = targets.filter(
    (t) => (stamps[section]?.[t]?.count ?? 0) >= CONFIG.stampNeed,
  ).length;
  return {
    complete,
    total: targets.length,
    finished: complete === targets.length,
  };
}
export function isUnlocked(
  section: SectionId,
  stamps: Stamps,
  unlockAll = false,
): boolean {
  const i = SECTIONS.findIndex((s) => s.id === section);
  return (
    unlockAll ||
    i === 0 ||
    (i > 0 &&
      sectionProgress(stamps, SECTIONS[i - 1].id).complete >=
        SECTIONS[i - 1].unlock)
  );
}
export function canExpress(
  section: SectionId,
  stamps: Stamps,
  mode: RoundMode = "ear",
): boolean {
  return targetsFor(section, mode).every(
    (t) => (stamps[section]?.[t]?.count ?? 0) >= CONFIG.stampNeed,
  );
}
export function earOpened(stamps: Stamps): number[] {
  const opened: number[] = [...CONFIG.earSets[0]];
  for (let i = 1; i < CONFIG.earSets.length; i++) {
    const complete = opened.filter(
      (n) => (stamps.s5?.[`ear${n}`]?.count ?? 0) >= 2,
    ).length;
    if (complete < Math.ceil(opened.length * CONFIG.unlockRatio)) break;
    opened.push(...CONFIG.earSets[i]);
  }
  return opened;
}
export function earChoices(stamps: Stamps): Station[] {
  const opened = earOpened(stamps);
  return allStations().filter(
    (s) =>
      opened.includes(s.semitones) &&
      (["P", "m", "M"].includes(s.quality) || s.semitones === 6),
  );
}
export function addStamp(
  stamps: Stamps,
  problem: Problem,
  clean: boolean,
): Stamps {
  if (!clean) return stamps;
  const current = stamps[problem.section]?.[problem.target] ?? {
    count: 0,
    roots: [],
  };
  const root = rootId(problem.root);
  if (
    current.count >= 2 ||
    (["s3", "s4"].includes(problem.section) && current.roots.includes(root))
  )
    return stamps;
  return {
    ...stamps,
    [problem.section]: {
      ...stamps[problem.section],
      [problem.target]: {
        count: Math.min(2, current.count + 1),
        roots: current.roots.includes(root)
          ? [...current.roots]
          : [...current.roots, root],
      },
    },
  };
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(items: T[], rng: () => number): T {
  if (!items.length) throw new Error("No valid problem candidates");
  return items[Math.floor(rng() * items.length)];
}
function weighted<T>(
  items: T[],
  weight: (item: T) => number,
  rng: () => number,
): T {
  let n = rng() * items.reduce((sum, item) => sum + weight(item), 0);
  for (const item of items) {
    n -= weight(item);
    if (n < 0) return item;
  }
  return items[items.length - 1];
}
function rootCandidates(section: SectionId): Note[] {
  return section === "s2"
    ? ROOTS.slice(0, 1)
    : section === "s3"
      ? ROOTS.slice(1)
      : ROOTS;
}
function chooseRoot(
  section: SectionId,
  station: Station,
  stamp: Stamp | undefined,
  rng: () => number,
  exclude?: string,
): Note {
  let roots = rootCandidates(section).filter(
    (root) => upperNote(root, station) !== null,
  );
  if (exclude && roots.some((root) => rootId(root) !== exclude))
    roots = roots.filter((root) => rootId(root) !== exclude);
  if (["s3", "s4"].includes(section) && stamp?.count === 1)
    roots = roots.filter((root) => !stamp.roots.includes(rootId(root)));
  if (section === "s3" || section === "s4") {
    const groups = [
      roots.filter((r) => rootId(r) === "C"),
      roots.filter((r) => r.acc === 0 && rootId(r) !== "C"),
      roots.filter((r) => r.acc !== 0),
    ];
    const weights = CONFIG.rootMix[section];
    const candidates = groups
      .map((group, i) => ({ group, weight: weights[i] }))
      .filter((g) => g.group.length && g.weight > 0);
    return pick(weighted(candidates, (g) => g.weight, rng).group, rng);
  }
  return pick(roots, rng);
}
function linePair(
  line: number,
  count: number,
  rng: () => number,
  exclude?: string,
): { root: Note; station: Station } {
  const pairs = ROOTS.flatMap((root) =>
    stationsOf(line).map((station) => ({
      root,
      station,
      upper: upperNote(root, station),
    })),
  ).filter((p) => p.upper && Math.abs(p.upper.acc) <= 1);
  let candidates =
    count === 0
      ? pairs.filter((p) => p.root.acc === 0 && p.upper?.acc === 0)
      : count === 1
        ? pairs.filter((p) => p.root.acc !== 0 || p.upper?.acc !== 0)
        : pairs;
  if (exclude && candidates.some((p) => rootId(p.root) !== exclude))
    candidates = candidates.filter((p) => rootId(p.root) !== exclude);
  const pair = pick(candidates, rng);
  return { root: { ...pair.root }, station: pair.station };
}
function missionList(
  section: SectionId,
  count: number,
  mode: RoundMode,
): Mission[] {
  if (section === "s5") return Array.from({ length: count }, () => mode);
  if (section === "s1") return Array.from({ length: count }, () => "line");
  const mix = CONFIG.missionMix[section][count as 6 | 8 | 10];
  return [
    ...Array<Mission>(mix[0]).fill("read"),
    ...Array<Mission>(mix[1]).fill("move"),
    ...Array<Mission>(mix[2]).fill("build"),
  ];
}
export function createRound(
  section: SectionId,
  count: number,
  seed: number,
  stamps: Stamps = {},
  missed: string[] = [],
  mode: RoundMode = "ear",
): Problem[] {
  if (![6, 8, 10].includes(count))
    throw new Error("Round count must be 6, 8, or 10");
  const rng = seededRandom(seed);
  const uses: Record<string, number> = {};
  const result: Problem[] = [];
  for (const [index, mission] of missionList(section, count, mode).entries()) {
    let candidates = targetsFor(section, mode);
    if (mission === "ear") candidates = earOpened(stamps).map((n) => `ear${n}`);
    if (mission === "build")
      candidates = candidates.filter((id) => stationById(id)?.line !== 1);
    if (mission === "move" && section === "s2")
      candidates = candidates.filter((id) =>
        [2, 3, 6, 7].includes(stationById(id)?.line ?? 0),
      );
    candidates = candidates.filter(
      (id) => (uses[id] ?? 0) < 2 && result.at(-1)?.target !== id,
    );
    // Five initial ear sounds must fill ten slots without painting the final
    // two picks into a repeated-target corner. Reject infeasible next picks.
    if (mission === "ear") {
      const slotsAfter = count - index - 1;
      const pool = earOpened(stamps).map((n) => `ear${n}`);
      candidates = candidates.filter((id) => {
        const remaining = pool.map((t) => ({
          id: t,
          capacity: 2 - (uses[t] ?? 0) - (t === id ? 1 : 0),
        }));
        const usable = remaining.reduce(
          (sum, t) =>
            sum +
            Math.min(
              t.capacity,
              t.id === id
                ? Math.floor(slotsAfter / 2)
                : Math.ceil(slotsAfter / 2),
            ),
          0,
        );
        return usable >= slotsAfter;
      });
    }
    const incomplete = candidates.filter(
      (id) => (stamps[section]?.[id]?.count ?? 0) < 2,
    );
    if (incomplete.length && rng() < CONFIG.incompleteFirst)
      candidates = incomplete;
    const target = weighted(
      candidates,
      (id) => {
        const count = stamps[section]?.[id]?.count ?? 0;
        return (
          1 +
          (count === 0
            ? CONFIG.weightNoStamp
            : count === 1
              ? CONFIG.weightHalf
              : 0) +
          (missed.includes(id) ? CONFIG.weightMissed : 0)
        );
      },
      rng,
    );
    uses[target] = (uses[target] ?? 0) + 1;
    let station: Station;
    let root: Note;
    let source: Station | undefined;
    let direction: -1 | 1 | undefined;
    if (mission === "line")
      ({ station, root } = linePair(
        Number(target.slice(1)),
        stamps[section]?.[target]?.count ?? 0,
        rng,
      ));
    else {
      if (mission === "ear")
        station = pick(
          earChoices(stamps).filter(
            (s) => s.semitones === Number(target.slice(3)),
          ),
          rng,
        );
      else if (mission === "transfer") {
        const pair = allStations().filter(
          (s) => s.semitones === Number(target.slice(2)),
        );
        source = pick(pair, rng);
        station = pair.find((s) => s.id !== source?.id)!;
      } else station = stationById(target)!;
      root = chooseRoot(section, station, stamps[section]?.[target], rng);
      if (mission === "move") {
        const quality: Quality =
          section === "s2"
            ? station.quality === "m"
              ? "M"
              : "m"
            : [1, 4, 5, 8].includes(station.line)
              ? "P"
              : station.quality === "d"
                ? "m"
                : "M";
        source = stationsOf(station.line).find((s) => s.quality === quality)!;
        direction = station.semitones > source.semitones ? 1 : -1;
      }
    }
    result.push({
      id: `${seed >>> 0}-${index}`,
      section,
      mission,
      target,
      root: { ...root },
      station,
      ...(source ? { source } : {}),
      ...(direction ? { direction } : {}),
    });
  }
  return result;
}
export function retryProblem(problem: Problem, seed: number): Problem {
  const rng = seededRandom(seed);
  const result = { ...problem, id: `${problem.id}-retry-${seed >>> 0}` };
  if (problem.mission === "line")
    return {
      ...result,
      ...linePair(
        problem.station.line,
        problem.root.acc || upperNote(problem.root, problem.station)?.acc
          ? 1
          : 0,
        rng,
        rootId(problem.root),
      ),
    };
  return {
    ...result,
    root: {
      ...chooseRoot(
        problem.section,
        problem.station,
        undefined,
        rng,
        rootId(problem.root),
      ),
    },
  };
}
export function expectedStation(problem: Problem): Station {
  return problem.station;
}
export function problemInstruction(
  problem: Problem,
  style: NoteStyle = "cde",
  express = false,
): string {
  const station = stationName(problem.station);
  if (problem.mission === "line") return "몇 도선일까요?";
  if (problem.mission === "read") return "노선을 먼저, 역을 다음에 찾아요.";
  if (problem.mission === "build")
    return `${noteLabel(problem.root, style)}에서 ${station}역으로${express ? "" : ` · 반음 ${problem.station.semitones}개`}`;
  if (problem.mission === "move")
    return `${stationName(problem.source!)}에서 반음 ${problem.direction === 1 ? "넓히면" : "좁히면"} 어느 역일까요?`;
  if (problem.mission === "ear") return "소리를 듣고 같은 간격의 역을 찾아요.";
  return `${stationName(problem.source!)}와 소리가 같은 다른 노선의 역을 찾아요.`;
}
export function answerIsCorrect(
  problem: Problem,
  answer: string | number,
  step: 1 | 2 = 1,
): boolean {
  if (
    problem.mission === "line" ||
    (["read", "build", "transfer"].includes(problem.mission) && step === 1)
  )
    return Number(answer) === problem.station.line;
  if (problem.mission === "move") return answer === problem.station.quality;
  if (problem.mission === "ear")
    return stationById(String(answer))?.semitones === problem.station.semitones;
  return answer === problem.station.id;
}
export function feedback(
  problem: Problem,
  answer: string | number,
  step: 1 | 2,
  attempt: number,
  style: NoteStyle = "cde",
): string {
  const goal = problem.station;
  const correct = answerIsCorrect(problem, answer, step);
  const name = stationName(goal);
  if (correct)
    return problem.mission === "transfer" && step === 2
      ? `건반은 같고 이름만 달라요. ${stationName(problem.source!)}는 ${problem.source!.line}도선, ${name}는 ${goal.line}도선이에요.`
      : problem.mission === "line" ||
          (step === 1 &&
            ["read", "build", "transfer"].includes(problem.mission))
        ? `${goal.line}도선이에요. 줄과 칸을 세어 찾았어요.`
        : `${name}역 도착. 건반으로 세면 반음 ${goal.semitones}개예요.`;
  const lineStep =
    problem.mission === "line" ||
    (step === 1 && ["read", "build", "transfer"].includes(problem.mission));
  if (lineStep) {
    if (problem.mission === "transfer")
      return attempt < 2
        ? "소리가 같은 역은 바로 옆 노선에 있어요."
        : `${goal.line}도선에서 소리가 같은 역을 찾아요.`;
    if (attempt >= 2) {
      const notes = Array.from({ length: goal.line }, (_, i) =>
        noteLabel(atStaffPosition(problem.root, i + 1), style),
      );
      return `${notes.join(", ")}, ${goal.line}번째라서 ${goal.line}도선이에요.`;
    }
    if (problem.mission === "build")
      return `${noteLabel(problem.root, style)}부터 세어 ${goal.line}번째 자리로 옮겨 보세요.`;
    return "아래 음부터 줄과 칸을 하나씩 세어 보세요.";
  }
  if (attempt >= 2)
    return `정답은 ${name}예요. 건반으로 세면 반음 ${goal.semitones}개예요.`;
  if (problem.mission === "move") {
    const perfect = [1, 4, 5, 8].includes(goal.line);
    const dir = problem.direction === 1 ? "오른쪽" : "왼쪽";
    if (perfect && ["m", "M"].includes(String(answer)))
      return `${goal.line}도선은 완전 계열이라 단·장 역이 없어요. 완전에서 ${dir} 한 칸은 ${QUALITY_NAME[goal.quality]}이에요.`;
    if (!perfect && answer === "P")
      return `${goal.line}도선은 장·단 계열이라 완전 역이 없어요. ${QUALITY_NAME[problem.source!.quality]}에서 ${dir} 한 칸은 ${QUALITY_NAME[goal.quality]}이에요.`;
    return `${perfect ? "완전 계열의 순서는 감, 완전, 증" : "장·단 계열의 순서는 감, 단, 장, 증"}이에요. ${QUALITY_NAME[problem.source!.quality]}에서 ${dir} 한 칸은 ${QUALITY_NAME[goal.quality]}이에요.`;
  }
  const chosen = stationById(String(answer));
  if (!chosen) return "역을 하나 골라 다시 도착해 보세요.";
  if (problem.mission === "ear")
    return `조금 더 ${chosen.semitones < goal.semitones ? "넓은" : "좁은"} 소리예요. 다시 들어 보세요.`;
  if (problem.mission === "transfer")
    return `${stationName(problem.source!)}는 ${goal.semitones}반음이에요. ${goal.line}도선에서 반음 ${goal.semitones}개인 역을 찾아요.`;
  const gap = goal.semitones - chosen.semitones;
  if (problem.mission === "build")
    return `지금은 ${chosen.semitones}반음, ${name}는 ${goal.semitones}반음이에요. 반음 ${Math.abs(gap)}개 ${gap > 0 ? "넓게" : "좁게"} 해 보세요.`;
  return `${goal.line}도선은 맞았어요. ${stationName(chosen)}는 ${chosen.semitones}반음, 승차권은 ${goal.semitones}반음이에요. ${gap > 0 ? "오른쪽" : "왼쪽"}으로 ${Math.abs(gap)}칸 가 보세요.`;
}
