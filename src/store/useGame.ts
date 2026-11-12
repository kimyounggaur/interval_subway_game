"use client";

import { create } from "zustand";
import {
  addStamp,
  canExpress,
  createRound,
  isUnlocked,
  retryProblem,
  ROOTS,
  stationById,
  type Note,
  type Problem,
  type SectionId,
  type Stamps,
} from "../game";

export interface Settings {
  noteNames: "cde" | "doremi";
  sound: boolean;
  moveSound: boolean;
  problems: 6 | 8 | 10;
  expressSeconds: 10 | 20 | 30;
  unlockAll: boolean;
}
export type RoundMode = "ear" | "transfer";
export interface Result {
  problem: Problem;
  clean: boolean;
  arrived: boolean;
  revealed: boolean;
  seconds: number;
  lineError: boolean;
  stationError: boolean;
  tries?: [number, number];
  hint?: boolean;
  stampCount?: number;
  stampGained?: boolean;
}
export interface Session {
  section: SectionId;
  mode: RoundMode;
  express: boolean;
  problems: Problem[];
  index: number;
  step: 1 | 2;
  tries: [number, number];
  hint: boolean;
  revealed: boolean;
  selectedLine: number | null;
  selectedStation: string | null;
  staffOffset: number;
  results: Result[];
  feedback: string;
  phase: "answer" | "feedback";
  startedAt: number;
  questionStartedAt: number;
  deadline: number | null;
  retriesAdded: boolean;
}
export interface HistoryEntry {
  date: string;
  section: SectionId;
  mode: RoundMode;
  clean: number;
  total: number;
  seconds: number;
  express: boolean;
}
export interface ExpressRecord {
  best: number;
  streak: number;
}
export interface Summary {
  section: SectionId;
  mode: RoundMode;
  express: boolean;
  results: Result[];
  clean: number;
  total: number;
  seconds: number;
  newStamps: { target: string; count: number }[];
  missed: Result[];
  streak: number;
  best: number;
}
interface Persisted {
  version: 1;
  settings: Settings;
  stamps: Stamps;
  missed: Record<string, string[]>;
  history: HistoryEntry[];
  express: Record<string, ExpressRecord>;
  introSeen: boolean;
  session: Session | null;
  lastSummary: Summary | null;
}
export interface GameState extends Omit<Persisted, "version"> {
  hydrated: boolean;
  storageWarning: boolean;
  hydrate: () => void;
  setSettings: (patch: Partial<Settings>) => void;
  setIntroSeen: (seen: boolean) => void;
  startRound: (
    section: SectionId,
    mode?: RoundMode,
    express?: boolean,
  ) => boolean;
  patchSession: (patch: Partial<Session>) => void;
  finishProblem: (result: Result) => void;
  nextProblem: () => boolean;
  resetRecords: () => void;
  discardSession: () => void;
}

export const STORAGE_KEY = "interval-subway-v1";
export const DEFAULT_SETTINGS: Settings = {
  noteNames: "cde",
  sound: true,
  moveSound: true,
  problems: 8,
  expressSeconds: 20,
  unlockAll: false,
};
const SECTION_IDS: SectionId[] = ["s1", "s2", "s3", "s4", "s5"];
const MISSIONS = ["line", "read", "build", "move", "ear", "transfer"];
const emptyRecords = () => ({
  stamps: {} as Stamps,
  missed: {} as Record<string, string[]>,
  history: [] as HistoryEntry[],
  express: {} as Record<string, ExpressRecord>,
  session: null as Session | null,
  lastSummary: null as Summary | null,
});
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const section = (value: unknown): value is SectionId =>
  SECTION_IDS.includes(value as SectionId);
function validNote(value: unknown): value is Note {
  return (
    record(value) &&
    typeof value.letter === "string" &&
    "CDEFGAB".includes(value.letter) &&
    value.letter.length === 1 &&
    finite(value.acc) &&
    Number.isInteger(value.acc) &&
    Math.abs(value.acc) <= 2 &&
    finite(value.octave) &&
    Number.isInteger(value.octave) &&
    value.octave >= 0 &&
    value.octave <= 8
  );
}
function validStation(value: unknown): boolean {
  if (!record(value) || typeof value.id !== "string") return false;
  const canonical = stationById(value.id);
  return (
    canonical !== null &&
    canonical.line <= 8 &&
    value.line === canonical.line &&
    value.semitones === canonical.semitones &&
    value.quality === canonical.quality
  );
}
function validProblem(value: unknown): value is Problem {
  if (!record(value) || !validNote(value.root)) return false;
  const rootNote = value.root;
  return (
    record(value) &&
    typeof value.id === "string" &&
    section(value.section) &&
    MISSIONS.includes(value.mission as string) &&
    typeof value.target === "string" &&
    ROOTS.some(
      (root) =>
        root.letter === rootNote.letter &&
        root.acc === rootNote.acc &&
        root.octave === rootNote.octave,
    ) &&
    validStation(value.station) &&
    (value.source === undefined || validStation(value.source)) &&
    (value.direction === undefined ||
      value.direction === -1 ||
      value.direction === 1)
  );
}
function validResult(value: unknown): value is Result {
  return (
    record(value) &&
    validProblem(value.problem) &&
    finite(value.seconds) &&
    ["clean", "arrived", "revealed", "lineError", "stationError"].every(
      (key) => typeof value[key] === "boolean",
    )
  );
}
function validSession(value: unknown): value is Session {
  if (
    !record(value) ||
    !section(value.section) ||
    !["ear", "transfer"].includes(value.mode as string) ||
    typeof value.express !== "boolean" ||
    !Array.isArray(value.problems) ||
    value.problems.length === 0 ||
    value.problems.length > 12 ||
    !value.problems.every(validProblem) ||
    !finite(value.index) ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= value.problems.length ||
    ![1, 2].includes(value.step as number) ||
    !Array.isArray(value.tries) ||
    value.tries.length !== 2 ||
    !value.tries.every(
      (x) => finite(x) && Number.isInteger(x) && x >= 0 && x <= 2,
    ) ||
    !Array.isArray(value.results) ||
    !value.results.every(validResult) ||
    !["answer", "feedback"].includes(value.phase as string) ||
    typeof value.feedback !== "string" ||
    !finite(value.staffOffset) ||
    !finite(value.startedAt) ||
    !finite(value.questionStartedAt) ||
    !(value.deadline === null || finite(value.deadline)) ||
    !["hint", "revealed", "retriesAdded"].every(
      (key) => typeof value[key] === "boolean",
    ) ||
    !(
      value.selectedLine === null ||
      (finite(value.selectedLine) &&
        value.selectedLine >= 1 &&
        value.selectedLine <= 8)
    ) ||
    !(
      value.selectedStation === null ||
      typeof value.selectedStation === "string"
    )
  )
    return false;
  const expectedResults = value.index + (value.phase === "feedback" ? 1 : 0);
  return value.results.length === expectedResults;
}
function readSettings(value: unknown): Settings {
  const s = record(value) ? value : {};
  return {
    noteNames: s.noteNames === "doremi" ? "doremi" : "cde",
    sound: typeof s.sound === "boolean" ? s.sound : true,
    moveSound: typeof s.moveSound === "boolean" ? s.moveSound : true,
    problems: s.problems === 6 || s.problems === 10 ? s.problems : 8,
    expressSeconds:
      s.expressSeconds === 10 || s.expressSeconds === 30
        ? s.expressSeconds
        : 20,
    unlockAll: s.unlockAll === true,
  };
}
function questionFields(
  problem: Problem,
  settings: Settings,
  express: boolean,
) {
  const now = Date.now();
  return {
    step: 1 as const,
    tries: [0, 0] as [number, number],
    hint: false,
    revealed: false,
    selectedLine: null,
    selectedStation: null,
    staffOffset: 0,
    feedback: "",
    phase: "answer" as const,
    questionStartedAt: now,
    deadline:
      express && problem.mission !== "ear"
        ? now + settings.expressSeconds * 1000
        : null,
  };
}
function persist(state: GameState) {
  if (!state.hydrated || typeof window === "undefined") return;
  const data: Persisted = {
    version: 1,
    settings: state.settings,
    stamps: state.stamps,
    missed: state.missed,
    history: state.history,
    express: state.express,
    introSeen: state.introSeen,
    session: state.session,
    lastSummary: state.lastSummary,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    if (!state.storageWarning) useGame.setState({ storageWarning: true });
  }
}

export const useGame = create<GameState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  ...emptyRecords(),
  introSeen: false,
  hydrated: false,
  storageWarning: false,
  hydrate() {
    if (get().hydrated) return;
    if (typeof window === "undefined") return;
    let saved: unknown = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      set({ storageWarning: true });
    }
    if (record(saved) && saved.version === 1) {
      const stamps: Stamps = {};
      if (record(saved.stamps))
        for (const [sid, values] of Object.entries(saved.stamps)) {
          if (!section(sid) || !record(values)) continue;
          stamps[sid] = {};
          for (const [target, stamp] of Object.entries(values)) {
            if (
              !record(stamp) ||
              ![0, 1, 2].includes(stamp.count as number) ||
              !Array.isArray(stamp.roots)
            )
              continue;
            stamps[sid][target] = {
              count: stamp.count as number,
              roots: stamp.roots
                .filter((x): x is string => typeof x === "string")
                .slice(0, 2),
            };
          }
        }
      const missed: Record<string, string[]> = {};
      if (record(saved.missed))
        for (const [sid, values] of Object.entries(saved.missed)) {
          if (section(sid) && Array.isArray(values))
            missed[sid] = values
              .filter((x): x is string => typeof x === "string")
              .slice(0, 26);
        }
      const express: Record<string, ExpressRecord> = {};
      if (record(saved.express))
        for (const [key, best] of Object.entries(saved.express)) {
          if (record(best) && finite(best.best) && finite(best.streak))
            express[key] = {
              best: Math.max(0, best.best),
              streak: Math.max(0, best.streak),
            };
        }
      const history = Array.isArray(saved.history)
        ? saved.history
            .filter(
              (h): h is HistoryEntry =>
                record(h) &&
                section(h.section) &&
                typeof h.date === "string" &&
                finite(h.clean) &&
                finite(h.total) &&
                finite(h.seconds) &&
                typeof h.express === "boolean" &&
                ["ear", "transfer"].includes(h.mode as string),
            )
            .slice(-20)
        : [];
      const resumed = validSession(saved.session) ? saved.session : null;
      const lastSummary =
        record(saved.lastSummary) &&
        section(saved.lastSummary.section) &&
        ["ear", "transfer"].includes(saved.lastSummary.mode as string) &&
        typeof saved.lastSummary.express === "boolean" &&
        Array.isArray(saved.lastSummary.results) &&
        saved.lastSummary.results.every(validResult) &&
        Array.isArray(saved.lastSummary.newStamps) &&
        saved.lastSummary.newStamps.every(
          (g) =>
            record(g) &&
            typeof g.target === "string" &&
            [1, 2].includes(g.count as number),
        ) &&
        Array.isArray(saved.lastSummary.missed) &&
        saved.lastSummary.missed.every(validResult) &&
        finite(saved.lastSummary.clean) &&
        finite(saved.lastSummary.total) &&
        finite(saved.lastSummary.seconds) &&
        finite(saved.lastSummary.streak) &&
        finite(saved.lastSummary.best)
          ? (saved.lastSummary as unknown as Summary)
          : null;
      set({
        settings: readSettings(saved.settings),
        stamps,
        missed,
        express,
        history,
        session: resumed,
        lastSummary,
        introSeen: saved.introSeen === true,
        hydrated: true,
      });
    } else set({ hydrated: true });
  },
  setSettings(patch) {
    set((state) => ({
      settings: readSettings({ ...state.settings, ...patch }),
    }));
  },
  setIntroSeen(introSeen) {
    set({ introSeen });
  },
  startRound(sid, mode = "ear", express = false) {
    const state = get();
    if (
      !isUnlocked(sid, state.stamps, state.settings.unlockAll) ||
      (express && !canExpress(sid, state.stamps, mode))
    )
      return false;
    if (sid === "s5" && mode === "ear" && !state.settings.sound) return false;
    const seed = Date.now() >>> 0;
    const problems = createRound(
      sid,
      state.settings.problems,
      seed,
      state.stamps,
      state.missed[sid] ?? [],
      mode,
    );
    if (!problems.length) return false;
    set({
      session: {
        section: sid,
        mode,
        express,
        problems,
        index: 0,
        results: [],
        startedAt: Date.now(),
        retriesAdded: false,
        ...questionFields(problems[0], state.settings, express),
      },
      lastSummary: null,
    });
    return true;
  },
  patchSession(patch) {
    set((state) =>
      state.session ? { session: { ...state.session, ...patch } } : {},
    );
  },
  finishProblem(result) {
    const state = get();
    const session = state.session;
    if (
      !session ||
      session.phase !== "answer" ||
      result.problem.id !== session.problems[session.index].id
    )
      return;
    const before =
      state.stamps[session.section]?.[result.problem.target]?.count ?? 0;
    const stamps = session.express
      ? state.stamps
      : addStamp(state.stamps, result.problem, result.clean);
    const after = stamps[session.section]?.[result.problem.target]?.count ?? 0;
    const savedResult: Result = {
      ...result,
      tries: [...session.tries],
      hint: session.hint,
      stampCount: after,
      stampGained: after > before,
    };
    set({
      stamps,
      session: {
        ...session,
        phase: "feedback",
        results: [...session.results, savedResult],
        deadline: null,
      },
    });
  },
  nextProblem() {
    const state = get();
    let session = state.session;
    if (!session || session.phase !== "feedback") return false;
    let nextIndex = session.index + 1;
    if (
      nextIndex >= session.problems.length &&
      !session.express &&
      !session.retriesAdded
    ) {
      const seen = new Set<string>();
      const retry = session.results
        .filter((result) => {
          if (result.clean || seen.has(result.problem.target)) return false;
          seen.add(result.problem.target);
          return true;
        })
        .slice(0, 2)
        .map((result, index) => ({
          ...retryProblem(result.problem, (Date.now() + index) >>> 0),
          id: `${result.problem.id}-retry-${index}`,
        }));
      session = {
        ...session,
        problems: [...session.problems, ...retry],
        retriesAdded: true,
      };
    }
    if (nextIndex < session.problems.length) {
      set({
        session: {
          ...session,
          index: nextIndex,
          ...questionFields(
            session.problems[nextIndex],
            state.settings,
            session.express,
          ),
        },
      });
      return true;
    }
    const results = session.results;
    const clean = results.filter((r) => r.clean).length;
    let run = 0;
    let streak = 0;
    for (const result of results) {
      run = result.clean ? run + 1 : 0;
      streak = Math.max(streak, run);
    }
    const key =
      session.section === "s5"
        ? `${session.section}-${session.mode}`
        : session.section;
    const oldBest = state.express[key] ?? { best: 0, streak: 0 };
    const best = session.express ? Math.max(oldBest.best, clean) : oldBest.best;
    const seconds = Math.max(
      0,
      Math.round((Date.now() - session.startedAt) / 1000),
    );
    const gains = new Map<string, number>();
    results.forEach((r) => {
      if (r.stampGained) gains.set(r.problem.target, r.stampCount ?? 1);
    });
    const summary: Summary = {
      section: session.section,
      mode: session.mode,
      express: session.express,
      results,
      clean,
      total: results.length,
      seconds,
      newStamps: [...gains].map(([target, count]) => ({ target, count })),
      missed: results.filter((r) => !r.clean),
      streak,
      best,
    };
    const date = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const entry: HistoryEntry = {
      date,
      section: session.section,
      mode: session.mode,
      express: session.express,
      clean,
      total: results.length,
      seconds,
    };
    set({
      session: null,
      lastSummary: summary,
      history: [...state.history, entry].slice(-20),
      missed: session.express
        ? state.missed
        : {
            ...state.missed,
            [session.section]: [
              ...new Set(
                results.filter((r) => !r.clean).map((r) => r.problem.target),
              ),
            ],
          },
      express: session.express
        ? {
            ...state.express,
            [key]: { best, streak: Math.max(oldBest.streak, streak) },
          }
        : state.express,
    });
    return false;
  },
  resetRecords() {
    set(emptyRecords());
  },
  discardSession() {
    set({ session: null });
  },
}));

useGame.subscribe(persist);
