import { beforeEach, describe, expect, it } from "vitest";
import { targetsFor, type Stamps } from "../game";
import { DEFAULT_SETTINGS, STORAGE_KEY, useGame, type Result } from "./useGame";

const saved = new Map<string, string>();
const storage = {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => {
    saved.set(key, value);
  },
  removeItem: (key: string) => {
    saved.delete(key);
  },
  clear: () => saved.clear(),
};
Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage },
  configurable: true,
});

function result(clean = true): Result {
  const s = useGame.getState().session!;
  return {
    problem: s.problems[s.index],
    clean,
    arrived: clean,
    revealed: !clean,
    seconds: 1,
    lineError: !clean,
    stationError: false,
  };
}
function allClean() {
  let count = 0;
  while (useGame.getState().session) {
    useGame.getState().finishProblem(result());
    useGame.getState().nextProblem();
    if (++count > 15) throw new Error("Round failed to finish");
  }
}

beforeEach(() => {
  useGame.setState({ hydrated: false });
  saved.clear();
  useGame.setState({
    settings: { ...DEFAULT_SETTINGS },
    stamps: {},
    missed: {},
    history: [],
    express: {},
    session: null,
    lastSummary: null,
    introSeen: false,
    storageWarning: false,
  });
  useGame.getState().hydrate();
});

describe("browser-local session state", () => {
  it("keeps step, attempts, selections and deadline across hydration", () => {
    useGame.getState().setSettings({ unlockAll: true });
    expect(useGame.getState().startRound("s2")).toBe(true);
    useGame.getState().patchSession({
      step: 2,
      tries: [1, 1],
      hint: true,
      selectedLine: 3,
      selectedStation: "3m",
      staffOffset: 2,
      feedback: "세어 보세요.",
    });
    const before = JSON.parse(JSON.stringify(useGame.getState().session));
    useGame.setState({ hydrated: false, session: null });
    useGame.getState().hydrate();
    expect(useGame.getState().session).toEqual(before);
  });

  it("credits a completed question once, including after reload on its feedback", () => {
    useGame.getState().startRound("s1");
    const answer = result();
    useGame.getState().finishProblem(answer);
    useGame.getState().finishProblem(answer);
    expect(useGame.getState().stamps.s1[answer.problem.target].count).toBe(1);
    useGame.setState({ hydrated: false, session: null });
    useGame.getState().hydrate();
    useGame.getState().finishProblem(answer);
    expect(useGame.getState().stamps.s1[answer.problem.target].count).toBe(1);
    expect(useGame.getState().session?.results).toHaveLength(1);
  });

  it("appends at most two distinct retry targets and lets clean retries earn stamps", () => {
    useGame.getState().startRound("s1");
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const answer = result(false);
      seen.add(answer.problem.target);
      useGame.getState().finishProblem(answer);
      useGame.getState().nextProblem();
    }
    const s = useGame.getState().session!;
    expect(s.problems).toHaveLength(10);
    expect(s.retriesAdded).toBe(true);
    expect(s.problems[8].target).not.toBe(s.problems[9].target);
    expect(seen.has(s.problems[8].target)).toBe(true);
    expect(new Set(s.problems.map((p) => p.id)).size).toBe(10);
    const retried = s.problems[8].target;
    allClean();
    expect(useGame.getState().stamps.s1[retried].count).toBe(1);
    expect(useGame.getState().lastSummary?.total).toBe(10);
  });

  it("gates locked sections and express independently of the all-sections setting", () => {
    expect(useGame.getState().startRound("s2")).toBe(false);
    useGame.getState().setSettings({ unlockAll: true });
    expect(useGame.getState().startRound("s2")).toBe(true);
    expect(useGame.getState().startRound("s2", "ear", true)).toBe(false);
    useGame.getState().setSettings({ sound: false });
    expect(useGame.getState().startRound("s5", "ear")).toBe(false);
    expect(useGame.getState().startRound("s5", "transfer")).toBe(true);
  });

  it("finishes express without changing stamps, missed targets or adding retries", () => {
    const stamps: Stamps = {
      s1: Object.fromEntries(
        targetsFor("s1").map((t) => [t, { count: 2, roots: ["C"] }]),
      ),
    };
    useGame.setState({ stamps, missed: { s1: ["L2"] } });
    expect(useGame.getState().startRound("s1", "ear", true)).toBe(true);
    useGame.getState().finishProblem(result(false));
    useGame.getState().nextProblem();
    allClean();
    expect(useGame.getState().stamps).toEqual(stamps);
    expect(useGame.getState().missed).toEqual({ s1: ["L2"] });
    expect(useGame.getState().lastSummary?.total).toBe(8);
    expect(useGame.getState().express.s1).toEqual({ best: 7, streak: 7 });
  });

  it("keeps only the most recent twenty rounds", () => {
    useGame.getState().setSettings({ problems: 6 });
    for (let i = 0; i < 21; i++) {
      useGame.getState().startRound("s1");
      allClean();
    }
    expect(useGame.getState().history).toHaveLength(20);
  });

  it("clears records while preserving teaching settings and intro acknowledgement", () => {
    useGame
      .getState()
      .setSettings({ noteNames: "doremi", sound: false, problems: 6 });
    useGame.getState().setIntroSeen(true);
    useGame.getState().startRound("s1");
    allClean();
    useGame.getState().resetRecords();
    expect(useGame.getState().stamps).toEqual({});
    expect(useGame.getState().history).toEqual([]);
    expect(useGame.getState().settings).toMatchObject({
      noteNames: "doremi",
      sound: false,
      problems: 6,
    });
    expect(useGame.getState().introSeen).toBe(true);
  });

  it("discards incompatible versions and malformed interrupted sessions", () => {
    useGame.setState({ hydrated: false });
    saved.set(
      STORAGE_KEY,
      JSON.stringify({ version: 99, settings: { sound: false }, session: {} }),
    );
    useGame.getState().hydrate();
    expect(useGame.getState().session).toBeNull();
    expect(useGame.getState().settings.sound).toBe(true);
    useGame.setState({ hydrated: false });
    saved.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: { problems: 999, sound: false },
        session: { index: -1 },
      }),
    );
    useGame.getState().hydrate();
    expect(useGame.getState().session).toBeNull();
    expect(useGame.getState().settings).toMatchObject({
      problems: 8,
      sound: false,
    });
  });
});
