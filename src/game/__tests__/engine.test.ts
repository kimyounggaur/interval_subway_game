import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ROOTS,
  addStamp,
  allStations,
  createRound,
  earChoices,
  identify,
  isUnlocked,
  keyboardKeys,
  midi,
  neighbor,
  rootId,
  sectionProgress,
  stationName,
  stationsOf,
  targetsFor,
  transferOf,
  upperNote,
  answerIsCorrect,
  feedback,
  ledgerSteps,
  needsNatural,
  retryProblem,
  canExpress,
  type Note,
  type Problem,
  type SectionId,
  type Stamps,
} from "../index";

const letters = ["C", "D", "E", "F", "G", "A", "B"] as const;
const spec = readFileSync(
  new URL("../../../docs/spec.md", import.meta.url),
  "utf8",
);
const appendix = spec.split("## 부록 A.")[1].split("## 부록 B.")[0];
const goldenRows = appendix
  .split("\n")
  .filter((line) => /^\| (완전|증|감|단|장)\d+도 \|/.test(line));

function parseExpected(label: string, root: Note, intervalLine: number): Note {
  const letter = label[0] as Note["letter"];
  const acc = ((label.match(/♯/g) ?? []).length -
    (label.match(/♭/g) ?? []).length) as Note["acc"];
  // Octave follows the independently supplied diatonic interval, not a pitch calculation.
  const octave =
    root.octave +
    Math.floor((letters.indexOf(root.letter) + intervalLine - 1) / 7);
  return { letter, acc, octave };
}

const appendixCases = goldenRows.flatMap((line) => {
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  const station = allStations(8).find((item) => stationName(item) === cells[0]);
  if (!station) throw new Error(`Unknown appendix station: ${cells[0]}`);
  return ROOTS.map((root, i) => ({
    label: `${rootId(root)} / ${cells[0]}`,
    root,
    station,
    semitones: Number(cells[1]),
    expected: parseExpected(cells[i + 2], root, station.line),
  }));
});

describe("independent specification appendix A", () => {
  it("contains all 297 supplied answers", () => {
    expect(goldenRows).toHaveLength(27);
    expect(appendixCases).toHaveLength(297);
  });
  it.each(appendixCases)("$label", ({ root, station, semitones, expected }) => {
    expect(upperNote(root, station)).toEqual(expected);
    expect(station.semitones).toBe(semitones);
    expect(midi(expected) - midi(root)).toBe(semitones);
  });
});

describe("interval invariants", () => {
  it("round-trips all 495 supported root × station combinations through 13th", () => {
    expect(allStations(8)).toHaveLength(27);
    expect(allStations(13)).toHaveLength(45);
    let count = 0;
    for (const root of ROOTS)
      for (const station of allStations(13)) {
        const upper = upperNote(root, station);
        expect(upper, `${rootId(root)} ${station.id}`).not.toBeNull();
        expect(identify(root, upper!)).toEqual(station);
        count++;
      }
    expect(count).toBe(495);
  });

  it("rejects exactly 30 out-of-range spellings over all 21 simple roots", () => {
    const roots: Note[] = letters.flatMap((letter) =>
      ([-1, 0, 1] as const).map((acc) => ({ letter, acc, octave: 4 })),
    );
    const rejected = roots.flatMap((root) =>
      allStations(8).filter((station) => upperNote(root, station) === null),
    );
    expect(rejected).toHaveLength(30);
  });

  it("has 38 directed adjacent moves and never crosses a line endpoint", () => {
    let count = 0;
    for (let line = 1; line <= 8; line++) {
      const stations = stationsOf(line);
      expect(neighbor(stations[0], -1)).toBeNull();
      expect(neighbor(stations.at(-1)!, 1)).toBeNull();
      for (const station of stations)
        for (const dir of [-1, 1] as const) {
          const next = neighbor(station, dir);
          if (next) {
            expect(next.line).toBe(line);
            expect(next.semitones - station.semitones).toBe(dir);
            expect(neighbor(next, dir === 1 ? -1 : 1)).toEqual(station);
            count++;
          }
        }
    }
    expect(count).toBe(38);
  });

  it("links exactly 13 symmetric enharmonic pairs and leaves augmented octave alone", () => {
    const pairs = new Set<string>();
    for (const station of allStations(8)) {
      const other = transferOf(station);
      if (!other) {
        expect(station.id).toBe("8A");
        continue;
      }
      expect(other.semitones).toBe(station.semitones);
      expect(Math.abs(other.line - station.line)).toBe(1);
      expect(transferOf(other)).toEqual(station);
      pairs.add([station.id, other.id].sort().join("/"));
      for (const root of ROOTS)
        expect(midi(upperNote(root, station)!)).toBe(
          midi(upperNote(root, other)!),
        );
    }
    expect(pairs.size).toBe(13);
  });

  it("fits every supported basic interval into exactly nine white keys", () => {
    for (const root of ROOTS) {
      const keys = keyboardKeys(root);
      expect(keys.filter((key) => !key.black)).toHaveLength(9);
      expect(keys[0].midi).toBeLessThanOrEqual(midi(root));
      for (const station of allStations(8))
        expect(
          keys.some((key) => key.midi === midi(upperNote(root, station)!)),
        ).toBe(true);
    }
  });
});

const plans = {
  s1: {
    6: ["line", "line", "line", "line", "line", "line"],
    8: Array(8).fill("line"),
    10: Array(10).fill("line"),
  },
  s2: {
    6: [...Array(4).fill("read"), "move", "build"],
    8: [...Array(5).fill("read"), "move", "build", "build"],
    10: [...Array(6).fill("read"), "move", ...Array(3).fill("build")],
  },
  s3: {
    6: [...Array(4).fill("read"), "build", "build"],
    8: [...Array(5).fill("read"), ...Array(3).fill("build")],
    10: [...Array(6).fill("read"), ...Array(4).fill("build")],
  },
  s4: {
    6: [...Array(3).fill("read"), "move", "build", "build"],
    8: [...Array(4).fill("read"), "move", "move", "build", "build"],
    10: [...Array(5).fill("read"), "move", "move", ...Array(3).fill("build")],
  },
} as const;

describe("seeded problem generation", () => {
  const modes: { section: SectionId; mode: "ear" | "transfer" }[] = [
    { section: "s1", mode: "ear" },
    { section: "s2", mode: "ear" },
    { section: "s3", mode: "ear" },
    { section: "s4", mode: "ear" },
    { section: "s5", mode: "ear" },
    { section: "s5", mode: "transfer" },
  ];

  it.each(modes)(
    "$section / $mode: 1,000 rounds obey ranges, sequence and repetition limits",
    ({ section, mode }) => {
      for (let seed = 1; seed <= 1000; seed++) {
        const count = ([6, 8, 10] as const)[seed % 3];
        const stamps: Stamps = {};
        // Exercise initial, half-complete and fully complete histories.
        if (seed % 3)
          stamps[section] = Object.fromEntries(
            targetsFor(section, mode).map((target) => [
              target,
              { count: seed % 3, roots: ["D"] },
            ]),
          );
        const problems = createRound(section, count, seed, stamps, [], mode);
        const allowed = new Set(targetsFor(section, mode));
        const occurrences: Record<string, number> = {};
        if (problems.length !== count)
          throw new Error(`${section} seed ${seed}: wrong length`);
        const expectedMissions =
          section === "s5" ? Array(count).fill(mode) : plans[section][count];
        if (
          problems.map((p) => p.mission).join(",") !==
          expectedMissions.join(",")
        )
          throw new Error(`${section} seed ${seed}: wrong mission order`);
        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          const upper = upperNote(p.root, p.station);
          const context = `${section} ${mode} seed ${seed} problem ${i}`;
          if (!allowed.has(p.target))
            throw new Error(`${context}: out-of-range target ${p.target}`);
          if (!upper) throw new Error(`${context}: unspellable answer`);
          if (i && p.target === problems[i - 1].target)
            throw new Error(`${context}: consecutive duplicate`);
          occurrences[p.target] = (occurrences[p.target] ?? 0) + 1;
          if (occurrences[p.target] > 2)
            throw new Error(`${context}: third target appearance`);
          if (section === "s1" || section === "s2" || section === "s3") {
            if (Math.abs(upper.acc) > 1 || Math.abs(p.root.acc) > 1)
              throw new Error(`${context}: premature double accidental`);
          }
          if (
            section === "s1" &&
            !stamps.s1?.[p.target]?.count &&
            (p.root.acc || upper.acc)
          )
            throw new Error(
              `${context}: empty line stamp must use natural notes`,
            );
          if (
            section === "s1" &&
            stamps.s1?.[p.target]?.count === 1 &&
            !p.root.acc &&
            !upper.acc
          )
            throw new Error(`${context}: half line stamp needs an accidental`);
          if (section === "s2" && rootId(p.root) !== "C")
            throw new Error(`${context}: section 2 root must be C`);
          if (section === "s3" && rootId(p.root) === "C")
            throw new Error(`${context}: section 3 cannot use C`);
          if (
            (section === "s3" || section === "s4") &&
            stamps[section]?.[p.target]?.count === 1 &&
            rootId(p.root) === "D"
          )
            throw new Error(`${context}: repeated first-stamp root`);
          if (p.mission === "build" && p.station.line === 1)
            throw new Error(`${context}: build cannot use unison`);
          if (p.mission === "move") {
            if (
              !p.source ||
              !p.direction ||
              neighbor(p.source, p.direction)?.id !== p.station.id
            )
              throw new Error(`${context}: invalid one-step move`);
            if (section === "s2" && !["m", "M"].includes(p.source.quality))
              throw new Error(`${context}: middle move source`);
            if (section === "s2" && !["m", "M"].includes(p.station.quality))
              throw new Error(`${context}: middle move target`);
            if (section === "s4" && !["d", "A"].includes(p.station.quality))
              throw new Error(`${context}: end move target`);
          }
          if (
            p.mission === "transfer" &&
            (!p.source || transferOf(p.source)?.id !== p.station.id)
          )
            throw new Error(`${context}: invalid transfer pair`);
        }
        if (seed <= 3)
          expect(createRound(section, count, seed, stamps, [], mode)).toEqual(
            problems,
          );
      }
    },
  );
});

describe("stamps and unlocks", () => {
  function sample(section: SectionId): Problem {
    return createRound(section, 6, 1234, {}, [], "ear")[0];
  }

  it("increments only clean arrivals, caps at two, and does not mutate input", () => {
    const p = sample("s2");
    const original: Stamps = {};
    expect(addStamp(original, p, false)).toEqual({});
    const half = addStamp(original, p, true);
    expect(original).toEqual({});
    expect(half.s2[p.target].count).toBe(1);
    const full = addStamp(half, p, true);
    expect(half.s2[p.target].count).toBe(1);
    expect(full.s2[p.target].count).toBe(2);
    expect(addStamp(full, p, true).s2[p.target].count).toBe(2);
  });

  it.each(["s3", "s4"] as const)(
    "%s requires a different root for the second clean stamp",
    (section) => {
      const p = sample(section);
      const half = addStamp({}, p, true);
      const same = addStamp(half, p, true);
      expect(same[section][p.target].count).toBe(1);
      const another = ROOTS.find(
        (root) => rootId(root) !== rootId(p.root) && rootId(root) !== "C",
      )!;
      const full = addStamp(same, { ...p, root: another }, true);
      expect(full[section][p.target].count).toBe(2);
    },
  );

  it.each([
    ["s1", "s2", 6],
    ["s2", "s3", 8],
    ["s3", "s4", 8],
    ["s4", "s5", 10],
  ] as const)(
    "%s unlocks %s at exactly %i complete stamps",
    (previous, next, threshold) => {
      const ids = targetsFor(previous, "ear");
      const stamps: Stamps = { [previous]: {} };
      for (const id of ids.slice(0, threshold - 1))
        stamps[previous][id] = { count: 2, roots: ["D", "E"] };
      expect(isUnlocked(next, stamps, false)).toBe(false);
      stamps[previous][ids[threshold - 1]] = { count: 1, roots: ["D"] };
      expect(isUnlocked(next, stamps, false)).toBe(false);
      stamps[previous][ids[threshold - 1]].count = 2;
      expect(isUnlocked(next, stamps, false)).toBe(true);
      expect(sectionProgress(stamps, previous).complete).toBe(threshold);
    },
  );

  it("all-section override bypasses locks without fabricating completion", () => {
    expect(isUnlocked("s1", {}, false)).toBe(true);
    expect(isUnlocked("s5", {}, true)).toBe(true);
    expect(sectionProgress({}, "s5").finished).toBe(false);
  });

  it("opens ear groups cumulatively from completed sounds, including both tritone names", () => {
    const stamps: Stamps = { s5: {} };
    const distinct = () =>
      new Set(earChoices(stamps).map((station) => station.semitones)).size;
    expect(distinct()).toBe(5);
    for (const semi of [0, 3, 4])
      stamps.s5[`ear${semi}`] = { count: 2, roots: ["C"] };
    expect(distinct()).toBe(5);
    stamps.s5.ear7 = { count: 2, roots: ["C"] };
    expect(distinct()).toBe(8);
    for (const semi of [1, 2])
      stamps.s5[`ear${semi}`] = { count: 2, roots: ["C"] };
    expect(distinct()).toBe(12);
    for (const semi of [8, 9])
      stamps.s5[`ear${semi}`] = { count: 2, roots: ["C"] };
    expect(distinct()).toBe(13);
    expect(
      earChoices(stamps)
        .filter((station) => station.semitones === 6)
        .map((station) => station.id)
        .sort(),
    ).toEqual(["4A", "5d"]);
  });
});

describe("ear capacity and answer feedback edge cases", () => {
  it("can fill 10 questions from five initial sounds without adjacent duplicates", () => {
    for (let seed = 0; seed < 10000; seed++) {
      const round = createRound("s5", 10, seed, {}, [], "ear");
      if (round.some((p, i) => i > 0 && p.target === round[i - 1].target))
        throw new Error(`Adjacent ear target at seed ${seed}`);
      const counts = round.reduce<Record<string, number>>(
        (acc, p) => ({ ...acc, [p.target]: (acc[p.target] ?? 0) + 1 }),
        {},
      );
      if (
        Object.values(counts).some((count) => count !== 2) ||
        Object.keys(counts).length !== 5
      )
        throw new Error(`Unbalanced ear capacity seed ${seed}`);
    }
  });
});

describe("teaching and retry boundaries", () => {
  const base = {
    id: "test",
    section: "s5" as const,
    mission: "ear" as const,
    target: "ear6",
    root: ROOTS[0],
    station: stationsOf(4)[2],
  };
  it("accepts both tritone spellings but keeps degree answers distinct", () => {
    expect(answerIsCorrect(base, "4A")).toBe(true);
    expect(answerIsCorrect(base, "5d")).toBe(true);
    expect(answerIsCorrect(base, "5P")).toBe(false);
    expect(answerIsCorrect({ ...base, mission: "read" }, 4, 1)).toBe(true);
    expect(answerIsCorrect({ ...base, mission: "read" }, 5, 1)).toBe(false);
  });
  it("shows directional semitone feedback and translated counting names", () => {
    const read = {
      ...base,
      mission: "read" as const,
      station: stationsOf(3)[1],
    };
    expect(feedback(read, "3M", 2, 1)).toContain("왼쪽으로 1칸");
    expect(feedback(read, 2, 1, 2, "doremi")).toBe(
      "도, 레, 미, 3번째라서 3도선이에요.",
    );
  });
  it("uses naturals only for repeated staff positions and gives accurate ledgers", () => {
    expect(needsNatural(ROOTS[9], { letter: "E", acc: 0, octave: 4 })).toBe(
      true,
    );
    expect(needsNatural(ROOTS[9], { letter: "E", acc: 0, octave: 5 })).toBe(
      false,
    );
    expect(ledgerSteps(ROOTS[0])).toEqual([0]);
    expect(ledgerSteps({ letter: "B", acc: 0, octave: 5 })).toEqual([12]);
  });
  it("replays retain the target, change eligible roots, and preserve section restrictions", () => {
    for (const section of ["s1", "s2", "s3", "s4"] as const) {
      for (const p of createRound(section, 8, 405, {}, [])) {
        const retry = retryProblem(p, 100);
        expect(retry.target).toBe(p.target);
        expect(retry.mission).toBe(p.mission);
        if (section === "s2") expect(rootId(retry.root)).toBe("C");
        else expect(rootId(retry.root)).not.toBe(rootId(p.root));
      }
    }
  });
  it("requires actual completion before express even with unrelated completed stamps", () => {
    expect(canExpress("s1", {})).toBe(false);
    const stamps: Stamps = {
      s5: Object.fromEntries(
        targetsFor("s5", "ear").map((t) => [t, { count: 2, roots: ["C"] }]),
      ),
    };
    expect(canExpress("s5", stamps, "ear")).toBe(true);
    expect(canExpress("s5", stamps, "transfer")).toBe(false);
  });
});
