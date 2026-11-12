"use client";

import { useEffect, useRef, useState } from "react";
import {
  allStations,
  stationsOf,
  stationName,
  ROOTS,
  COLORS,
  SECTIONS,
  upperNote,
  noteLabel,
  rootId,
  sectionProgress,
  isUnlocked,
  canExpress,
  targetsFor,
  earChoices,
  stationById as findStation,
  atStaffPosition,
  naturalStart,
  answerIsCorrect,
  feedback,
  problemInstruction,
  transferOf,
  type Note,
  type SectionId,
  type Problem,
} from "../game";
import { useGame, type Result } from "../store/useGame";
import { playPair, playMove, playEffect, stopAudio } from "../audio";
import {
  TrainIcon,
  NoteText,
  Score,
  Keyboard,
  LineButtons,
  Track,
  StampBadge,
} from "../components/Visuals";

type Screen =
  "home" | "game" | "free" | "settings" | "intro" | "summary" | "guide";
const stationById = (id: string) => findStation(id) ?? stationsOf(1)[0];
const missionNames = {
  line: "노선 찾기",
  read: "악보 읽기",
  build: "역 만들기",
  move: "한 칸 이동",
  ear: "귀로 찾기",
  transfer: "환승",
};

export default function Subway() {
  const g = useGame();
  const [screen, setScreen] = useState<Screen>("home");
  const [section, setSection] = useState<SectionId>("s1");
  const [mode, setMode] = useState<"ear" | "transfer">("ear");
  const [freeRoot, setFreeRoot] = useState<Note>(ROOTS[0]);
  const [freeStation, setFreeStation] = useState("3M");
  const [introStep, setIntroStep] = useState(0);
  const [introCount, setIntroCount] = useState(false);
  const [introMoved, setIntroMoved] = useState(false);
  const [introLine, setIntroLine] = useState<number>();
  const [introStation, setIntroStation] = useState("5P");
  const [introMessage, setIntroMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const listenId = useRef(0);

  useEffect(() => {
    useGame.getState().hydrate();
  }, []);
  useEffect(() => {
    if (g.hydrated && !g.introSeen) setScreen("intro");
  }, [g.hydrated, g.introSeen]);
  useEffect(() => {
    listenId.current++;
    stopAudio();
    setPlaying(false);
    window.scrollTo(0, 0);
  }, [screen]);
  useEffect(() => {
    if (
      screen !== "game" ||
      !g.session?.express ||
      g.session.phase !== "answer"
    )
      return;
    const id = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(id);
  }, [screen, g.session?.express, g.session?.phase]);
  const session = g.session;
  const problem = session?.problems[session.index];
  useEffect(() => {
    if (
      screen === "game" &&
      session?.express &&
      session.phase === "answer" &&
      session.deadline &&
      now >= session.deadline &&
      problem
    ) {
      const result: Result = {
        problem,
        clean: false,
        arrived: false,
        revealed: true,
        seconds: (Date.now() - session.questionStartedAt) / 1000,
        lineError:
          session.step === 1 &&
          ["line", "read", "build", "transfer"].includes(problem.mission),
        stationError:
          session.step === 2 || ["ear", "move"].includes(problem.mission),
      };
      g.patchSession({
        feedback: `시간이 되었어요. 정답은 ${stationName(problem.station)}예요.`,
        revealed: true,
      });
      g.finishProblem(result);
    }
  }, [now, screen, session, problem, g]);

  const style = g.settings.noteNames;
  const sound = g.settings.sound;
  const title =
    screen === "home"
      ? ""
      : screen === "free"
        ? "자유 운행"
        : screen === "settings"
          ? "수업용 설정"
          : screen === "guide"
            ? "이용 안내"
            : screen === "summary"
              ? "운행 결과"
              : screen === "intro"
                ? "처음 타는 음정 지하철"
                : (SECTIONS.find((s) => s.id === session?.section)?.title ??
                  "승차권");

  function openHome() {
    stopAudio();
    setScreen("home");
  }
  function finishIntro() {
    g.setIntroSeen(true);
    setScreen("home");
  }
  function openIntro() {
    setIntroStep(0);
    setIntroCount(false);
    setIntroMoved(false);
    setIntroLine(undefined);
    setIntroMessage("");
    setScreen("intro");
  }
  function start(express = false) {
    if (section === "s5" && mode === "ear" && !sound) {
      setNotice("귀로 찾기는 소리가 필요해요. 설정에서 소리를 켜 주세요.");
      return;
    }
    if (g.startRound(section, mode, express)) {
      setNow(Date.now());
      setScreen("game");
      setNotice(
        section === "s5" ? "이어폰을 쓰면 소리를 더 잘 들을 수 있어요." : "",
      );
    }
  }
  async function listen(p: Problem, kind: "melodic" | "harmonic") {
    if (!sound) {
      setNotice("소리가 꺼져 있어요. 수업용 설정에서 켤 수 있어요.");
      return;
    }
    const request = ++listenId.current;
    setPlaying(true);
    await playPair(
      p.root,
      upperNote(
        p.root,
        ["transfer", "move"].includes(p.mission) &&
          useGame.getState().session?.phase === "answer"
          ? p.source!
          : p.station,
      )!,
      kind,
      sound,
    );
    if (request !== listenId.current) return;
    setPlaying(false);
    const active = useGame.getState().session;
    if (
      active?.express &&
      active.phase === "answer" &&
      active.problems[active.index].id === p.id &&
      active.deadline === null
    )
      g.patchSession({
        deadline: Date.now() + g.settings.expressSeconds * 1000,
      });
  }
  function soundButtons(root: Note, upper: Note, p?: Problem) {
    return (
      <div className="button-row sound-buttons">
        <button
          className="secondary"
          disabled={playing}
          onClick={() =>
            p
              ? void listen(p, "melodic")
              : void playPair(root, upper, "melodic", sound)
          }
        >
          ♪ 차례로 듣기
        </button>
        <button
          className="secondary"
          disabled={playing}
          onClick={() =>
            p
              ? void listen(p, "harmonic")
              : void playPair(root, upper, "harmonic", sound)
          }
        >
          ♫ 함께 듣기
        </button>
      </div>
    );
  }
  function complete(
    arrived: boolean,
    revealed = false,
    tries?: [number, number],
  ) {
    if (!session || !problem) return;
    listenId.current++;
    setPlaying(false);
    const t = tries ?? session.tries;
    const two = ["read", "build", "transfer"].includes(problem.mission);
    const clean =
      arrived &&
      !revealed &&
      !session.revealed &&
      !session.hint &&
      (two ? t[0] === 1 && t[1] === 1 : t[0] === 1);
    const result: Result = {
      problem,
      clean,
      arrived: arrived && !revealed && !session.revealed,
      revealed: revealed || session.revealed,
      seconds: (Date.now() - session.questionStartedAt) / 1000,
      lineError:
        (problem.mission === "line" || two) &&
        (t[0] > 1 || (revealed && session.step === 1)),
      stationError: two
        ? t[1] > 1 || (revealed && session.step === 2)
        : problem.mission !== "line" && (t[0] > 1 || revealed),
      tries: t,
      hint: session.hint,
    };
    g.finishProblem(result);
    void playEffect(clean ? "stamp" : arrived ? "arrival" : "retry", sound);
  }
  function answer(value: string | number, step: 1 | 2) {
    if (!session || !problem || session.phase !== "answer") return;
    const tries: [number, number] = [...session.tries];
    const i = ["read", "build", "transfer"].includes(problem.mission)
      ? step - 1
      : 0;
    tries[i]++;
    const correct = answerIsCorrect(problem, value, step);
    const message = feedback(problem, value, step, tries[i], style);
    g.patchSession({ tries, feedback: message });
    if (correct) {
      if (
        step === 1 &&
        ["read", "build", "transfer"].includes(problem.mission)
      ) {
        const initial =
          problem.mission === "build"
            ? naturalStart(problem.root, problem.station.line)
            : stationsOf(problem.station.line)[0];
        g.patchSession({
          step: 2,
          selectedLine: problem.station.line,
          selectedStation: initial.id,
          staffOffset: problem.station.line - 1,
        });
      } else complete(true, false, tries);
    } else if (
      problem.mission === "ear" &&
      !session.express &&
      tries[i] === 1
    ) {
      const chosen = stationById(String(value));
      const request = ++listenId.current;
      setPlaying(true);
      void playPair(
        problem.root,
        upperNote(problem.root, chosen)!,
        "melodic",
        sound,
      ).then(async () => {
        const active = useGame.getState().session;
        if (
          request !== listenId.current ||
          active?.phase !== "answer" ||
          active.problems[active.index].id !== problem.id
        )
          return;
        await playPair(
          problem.root,
          upperNote(problem.root, problem.station)!,
          "melodic",
          sound,
        );
        if (request === listenId.current) setPlaying(false);
      });
    } else if (session.express || tries[i] >= 2) {
      if (
        !session.express &&
        step === 1 &&
        ["read", "build", "transfer"].includes(problem.mission)
      ) {
        const initial =
          problem.mission === "build"
            ? naturalStart(problem.root, problem.station.line)
            : stationsOf(problem.station.line)[0];
        g.patchSession({
          revealed: true,
          step: 2,
          selectedLine: problem.station.line,
          selectedStation: initial.id,
          staffOffset: problem.station.line - 1,
        });
      } else complete(false, true, tries);
    }
  }
  function next() {
    stopAudio();
    const hasNext = g.nextProblem();
    if (!hasNext) setScreen("summary");
    setNotice("");
  }
  function pickFree(id: string) {
    setFreeStation(id);
    const s = stationById(id);
    const n = upperNote(freeRoot, s);
    if (n && g.settings.moveSound) void playMove(n, sound);
  }

  if (!g.hydrated)
    return (
      <div className="app-shell">
        <div className="loading">
          <TrainIcon size={48} />
          <p>음정 지하철을 준비하고 있어요.</p>
        </div>
      </div>
    );

  return (
    <div className="app-shell">
      <header className="topbar">
        {screen === "home" ? (
          <div className="brand">
            <span className="brand-icon">
              <TrainIcon />
            </span>
            <span>
              음정 지하철<small>INTERVAL SUBWAY</small>
            </span>
          </div>
        ) : (
          <>
            <button
              className="icon-button"
              aria-label="노선도로 돌아가기"
              onClick={openHome}
            >
              ←
            </button>
            <strong>{title}</strong>
          </>
        )}
        <div className="top-actions">
          {screen !== "guide" && (
            <button
              className="icon-button"
              aria-label="이용 안내"
              onClick={() => setScreen("guide")}
            >
              ?
            </button>
          )}
          {screen !== "settings" && (
            <button
              className="icon-button"
              aria-label="수업용 설정"
              onClick={() => setScreen("settings")}
            >
              ⚙
            </button>
          )}
        </div>
      </header>
      {g.storageWarning && (
        <p className="storage-warning" role="status">
          이 브라우저에서는 기록을 저장할 수 없어요.
        </p>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="알림 닫기" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      {screen === "home" && (
        <>
          <main className="main home-main">
            <div className="hero">
              <div className="eyebrow">
                <span className="status-dot" /> 오늘도, 음악으로 출발
              </div>
              <h1>
                도수는 노선으로,
                <br />
                성질은 역으로.
              </h1>
              <p className="muted">27개 역을 여행하며 음정을 익혀요.</p>
              <div className="rainbow-rail" aria-hidden="true">
                {COLORS.map((c, i) => (
                  <span key={i} style={{ background: c.line }}>
                    <i>{i + 1}</i>
                  </span>
                ))}
              </div>
            </div>
            <div className="section-tabs" aria-label="학습 구간">
              {SECTIONS.map((s, i) => {
                const unlocked = isUnlocked(
                  s.id,
                  g.stamps,
                  g.settings.unlockAll,
                );
                return (
                  <button
                    key={s.id}
                    aria-pressed={section === s.id}
                    className={`section-tab ${section === s.id ? "active" : ""}`}
                    onClick={() => {
                      setSection(s.id);
                      setNotice("");
                    }}
                  >
                    <b>{i + 1}</b>
                    <span>
                      {["노선", "가운데 역", "기준음", "끝 역", "귀·환승"][i]}
                    </span>
                    {!unlocked && <small aria-label="잠김">⌑</small>}
                  </button>
                );
              })}
            </div>
            <section className="section-info">
              <div>
                <div className="eyebrow">
                  구간 {section.slice(1).padStart(2, "0")}
                </div>
                <h2>{SECTIONS.find((s) => s.id === section)?.title}</h2>
              </div>
              <span className="completion-pill">
                스탬프 {sectionProgress(g.stamps, section).complete} /{" "}
                {sectionProgress(g.stamps, section).total}
              </span>
            </section>
            <p className="muted section-description">
              {SECTIONS.find((s) => s.id === section)?.description}
            </p>
            {section === "s5" && (
              <div className="button-row">
                <button
                  className={mode === "ear" ? "primary" : "secondary"}
                  onClick={() => setMode("ear")}
                >
                  ♪ 귀로 찾기
                </button>
                <button
                  className={mode === "transfer" ? "primary" : "secondary"}
                  onClick={() => setMode("transfer")}
                >
                  ⇄ 환승
                </button>
              </div>
            )}
            <div className="map-heading">
              <span className="eyebrow">1—8도 기본 노선도</span>
              <span className="map-key">○ 아직 · ◐ 반쪽 · ● 완성</span>
            </div>
            <div className="route-map">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((line) => {
                const c = COLORS[line - 1];
                const targetSet = targetsFor(section, mode);
                return (
                  <div
                    className="route-row"
                    key={line}
                    style={
                      {
                        "--line": c.line,
                        "--edge": c.edge,
                        "--tint": c.tint,
                      } as React.CSSProperties
                    }
                  >
                    <button
                      className="route-label"
                      aria-label={`${line}도선 자유 운행`}
                      onClick={() => {
                        setFreeStation(stationsOf(line)[0].id);
                        setScreen("free");
                      }}
                    >
                      <span>{line}</span>
                      {line}도선
                      {section === "s1" && (
                        <small>
                          {
                            ["○", "◐", "●"][
                              g.stamps.s1?.[`L${line}`]?.count ?? 0
                            ]
                          }
                        </small>
                      )}
                    </button>
                    <div className="route-stations">
                      {stationsOf(line).map((s) => {
                        const target =
                          section === "s1"
                            ? `L${line}`
                            : section === "s5"
                              ? `${mode === "ear" ? "ear" : "tr"}${s.semitones}`
                              : s.id;
                        const applicable = targetSet.includes(target);
                        const count = g.stamps[section]?.[target]?.count ?? 0;
                        return (
                          <button
                            key={s.id}
                            className={`route-station ${applicable ? "" : "dim"}`}
                            aria-label={`${stationName(s)} ${s.semitones}반음, 스탬프 ${count}`}
                            onClick={() => {
                              setFreeStation(s.id);
                              setScreen("free");
                            }}
                          >
                            <i className={`map-node stamp-${count}`}>
                              {count === 2 ? "✓" : ""}
                            </i>
                            <strong>{stationName(s)}</strong>
                            <small>{s.semitones}반음</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="map-caption">
              <span>노선 = 도수</span>
              <span>역 = 성질</span>
              <span>한 칸 = 반음</span>
            </div>
            {g.session && (
              <button
                className="secondary resume-button"
                onClick={() => {
                  setNow(Date.now());
                  setScreen("game");
                }}
              >
                ↪ 하던 판 이어서 하기 · {g.session.index + 1}번 승차권
              </button>
            )}
            {!isUnlocked(section, g.stamps, g.settings.unlockAll) && (
              <div className="feedback">
                앞 구간의 스탬프를{" "}
                {SECTIONS[Number(section.slice(1)) - 2]?.unlock}개 완성하면
                열려요. 자유 운행은 지금도 탈 수 있어요.
              </div>
            )}
            {canExpress(section, g.stamps, mode) && (
              <button className="secondary" onClick={() => start(true)}>
                ⚡ 급행 모드 · {g.settings.expressSeconds}초
              </button>
            )}
            <p className="home-footnote">
              나의 속도로, 한 역씩. 기록은 이 기기에 저장돼요.
            </p>
          </main>
          <div className="footer-action">
            <button
              className="primary"
              disabled={!isUnlocked(section, g.stamps, g.settings.unlockAll)}
              onClick={() => start()}
            >
              이 구간 시작 <span>→</span>
            </button>
            <button className="secondary" onClick={() => setScreen("free")}>
              <TrainIcon size={20} /> 자유 운행
            </button>
          </div>
        </>
      )}

      {screen === "free" &&
        (() => {
          const station = stationById(freeStation);
          const upper = upperNote(freeRoot, station)!;
          const pair = transferOf(station);
          const list = stationsOf(station.line);
          const idx = list.findIndex((s) => s.id === station.id);
          return (
            <main className="main free-main">
              <div className="eyebrow">어디든 갈 수 있는 연습 여행</div>
              <div className="free-heading">
                <h1 className="page-title">마음껏 옮겨 보세요.</h1>
                <label className="root-select">
                  기준음{" "}
                  <select
                    aria-label="기준음"
                    value={rootId(freeRoot)}
                    onChange={(e) =>
                      setFreeRoot(
                        ROOTS.find((r) => rootId(r) === e.target.value)!,
                      )
                    }
                  >
                    {ROOTS.map((r) => (
                      <option key={rootId(r)} value={rootId(r)}>
                        {noteLabel(r, style)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <LineButtons
                selected={station.line}
                onSelect={(line) =>
                  pickFree(
                    stationsOf(line).find(
                      (s) => s.quality === "M" || s.quality === "P",
                    )?.id ?? stationsOf(line)[0].id,
                  )
                }
              />
              <Track
                line={station.line}
                selected={station.id}
                onSelect={pickFree}
              />
              <div className="button-row free-controls">
                <button
                  className="secondary"
                  disabled={idx === 0}
                  onClick={() => pickFree(list[idx - 1].id)}
                >
                  ← 반음 좁게
                </button>
                <button
                  className="secondary"
                  disabled={idx === list.length - 1}
                  onClick={() => pickFree(list[idx + 1].id)}
                >
                  반음 넓게 →
                </button>
              </div>
              <section
                className="card current-station"
                style={{ background: COLORS[station.line - 1].tint }}
              >
                <span className="eyebrow">지금 도착한 역</span>
                <div>
                  <h2>{stationName(station)}</h2>
                  <strong>{station.semitones}반음</strong>
                </div>
                <p>
                  <NoteText note={freeRoot} style={style} />{" "}
                  <span className="muted">→</span>{" "}
                  <NoteText note={upper} style={style} />
                </p>
              </section>
              {soundButtons(freeRoot, upper)}
              <section className="card">
                <Score root={freeRoot} upper={upper} count style={style} />
                <Keyboard
                  root={freeRoot}
                  upper={upper}
                  count
                  color={COLORS[station.line - 1].line}
                />
              </section>
              {pair ? (
                <section className="transfer-card">
                  <div>
                    <b>⇄ 소리가 같은 다른 역</b>
                    <p className="muted">
                      {stationName(pair)} · 건반은 같고 이름이 달라요.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => pickFree(pair.id)}
                  >
                    환승
                  </button>
                </section>
              ) : (
                <p className="feedback">
                  증8도는 기본 노선 안에 환승 짝이 없어요.
                </p>
              )}
              <p className="muted teaching-note">
                아래 음은 그대로, 위 음의 임시표만 바뀌어요.
                <br />
                같은 반음 수라도 도수가 다르면 다른 음정이에요.
              </p>
            </main>
          );
        })()}

      {screen === "game" &&
        session &&
        problem &&
        (() => {
          const upper = upperNote(problem.root, problem.station)!;
          const two = ["read", "build", "transfer"].includes(problem.mission);
          const selected = session.selectedStation
            ? stationById(session.selectedStation)
            : stationsOf(problem.station.line)[0];
          const source = problem.source ?? problem.station;
          const sourceUpper = upperNote(problem.root, source)!;
          const isResult = session.phase === "feedback";
          const buildUpper =
            session.step === 1
              ? atStaffPosition(problem.root, session.staffOffset + 1)
              : upperNote(problem.root, selected)!;
          const last = session.results[session.results.length - 1];
          return (
            <>
              <main className="main game-main">
                <div className="question-label">
                  <span className="eyebrow">
                    {session.express ? "⚡ 급행" : "승차권"}{" "}
                    {problem.id.includes("-retry-") ? "다시 풀기" : ""}
                  </span>
                  <b>
                    문제 {session.index + 1} / {session.problems.length}
                  </b>
                </div>
                <div className="progress" aria-label="문제 진행률">
                  {session.problems.map((p, i) => (
                    <i
                      key={p.id}
                      className={i <= session.index ? "filled" : ""}
                    />
                  ))}
                </div>
                {session.express && !isResult && (
                  <div className="timer" aria-live="off">
                    {session.deadline === null
                      ? "듣기가 끝나면 출발해요."
                      : `${Math.max(0, Math.ceil((session.deadline - now) / 1000))}초`}
                    <div
                      style={{
                        width: `${session.deadline ? Math.max(0, ((session.deadline - now) / (g.settings.expressSeconds * 1000)) * 100) : 100}%`,
                      }}
                    />
                  </div>
                )}
                {two && !isResult && (
                  <div className="stepper">
                    <span className={session.step === 1 ? "active" : ""}>
                      1{" "}
                      {problem.mission === "build"
                        ? "자리 정하기"
                        : "노선 고르기"}
                    </span>
                    <span>→</span>
                    <span className={session.step === 2 ? "active" : ""}>
                      2{" "}
                      {problem.mission === "build" ? "음 만들기" : "역 고르기"}
                    </span>
                  </div>
                )}
                {isResult ? (
                  <>
                    <div className="arrival-title">
                      <span>
                        {last?.clean
                          ? "✓ 한 번에 도착"
                          : last?.arrived
                            ? "✓ 도착"
                            : "지나침 · 정답을 함께 봐요"}
                      </span>
                      <h1>{stationName(problem.station)}역</h1>
                    </div>
                    {last?.stampGained && (
                      <StampBadge
                        label={stationName(problem.station)}
                        count={last.stampCount ?? 1}
                        color={COLORS[problem.station.line - 1].line}
                      />
                    )}
                    <div className="feedback" aria-live="polite">
                      <p>
                        {last?.lineError ? "→" : "✓"} 노선 ·{" "}
                        {problem.station.line}도선
                      </p>
                      <p>
                        {last?.stationError || last?.revealed ? "→" : "✓"} 역 ·{" "}
                        {stationName(problem.station)}, 반음{" "}
                        {problem.station.semitones}개
                      </p>
                      {session.feedback && <p>{session.feedback}</p>}
                      {!session.express && !last?.clean && (
                        <p className="muted">
                          다시 한 번에 도착하면 스탬프를 받을 수 있어요.
                        </p>
                      )}
                    </div>
                    <Track
                      line={problem.station.line}
                      selected={problem.station.id}
                    />
                    <section className="card">
                      <Score
                        root={problem.root}
                        upper={upper}
                        count
                        style={style}
                      />
                      <Keyboard
                        root={problem.root}
                        upper={upper}
                        count
                        color={COLORS[problem.station.line - 1].line}
                      />
                    </section>
                    {soundButtons(problem.root, upper)}
                    {(problem.mission === "transfer" ||
                      (!last?.arrived && session.selectedStation)) && (
                      <details className="card">
                        <summary>내 출발과 도착 비교하기</summary>
                        <Score
                          root={problem.root}
                          upper={
                            problem.mission === "transfer"
                              ? sourceUpper
                              : upperNote(problem.root, selected)!
                          }
                          style={style}
                        />
                        {soundButtons(
                          problem.root,
                          problem.mission === "transfer"
                            ? sourceUpper
                            : upperNote(problem.root, selected)!,
                        )}
                      </details>
                    )}
                  </>
                ) : (
                  <>
                    <section className="ticket">
                      <div className="ticket-head">
                        <b>승차권</b>
                        <span>{missionNames[problem.mission]}</span>
                      </div>
                      {problem.mission === "ear" ? (
                        <div className="ear-prompt">
                          <span aria-hidden="true">♫</span>
                          <h2>어느 역의 소리일까요?</h2>
                          <p className="muted">
                            두 음 사이의 거리에 귀 기울여요.
                          </p>
                        </div>
                      ) : problem.mission === "build" ? (
                        <>
                          <h2 className="instruction">
                            {problemInstruction(
                              problem,
                              style,
                              session.express,
                            )}
                          </h2>
                          <Score
                            root={problem.root}
                            upper={buildUpper}
                            count={session.hint || session.tries[0] > 0}
                            style={style}
                          />
                        </>
                      ) : problem.mission === "move" ? (
                        <>
                          <h2 className="instruction">
                            {problemInstruction(
                              problem,
                              style,
                              session.express,
                            )}
                          </h2>
                          <Track
                            line={source.line}
                            selected={source.id}
                            source={source.id}
                            hidden
                            hideCounts={session.express}
                          />
                        </>
                      ) : (
                        <>
                          <h2 className="instruction">
                            {problem.mission === "transfer"
                              ? problemInstruction(
                                  problem,
                                  style,
                                  session.express,
                                )
                              : "두 음 사이를 살펴보세요."}
                          </h2>
                          <Score
                            root={problem.root}
                            upper={
                              problem.mission === "transfer"
                                ? sourceUpper
                                : upper
                            }
                            count={session.hint || session.tries[0] > 0}
                            style={style}
                          />
                        </>
                      )}
                      {problem.mission !== "line" &&
                        soundButtons(
                          problem.root,
                          problem.mission === "transfer" ? sourceUpper : upper,
                          problem,
                        )}
                    </section>
                    {session.feedback && (
                      <div className="feedback" role="status">
                        {session.feedback}
                      </div>
                    )}
                    {(problem.mission === "line" ||
                      ((problem.mission === "read" ||
                        problem.mission === "transfer") &&
                        session.step === 1)) && (
                      <>
                        <h2 className="question-title">몇 도선일까요?</h2>
                        <LineButtons onSelect={(line) => answer(line, 1)} />
                      </>
                    )}
                    {problem.mission === "build" && session.step === 1 && (
                      <>
                        <div className="button-row">
                          <button
                            className="secondary"
                            aria-label="위 음 자리 한 칸 내리기"
                            disabled={session.staffOffset <= 0}
                            onClick={() =>
                              g.patchSession({
                                staffOffset: session.staffOffset - 1,
                              })
                            }
                          >
                            ▼ 자리 내리기
                          </button>
                          <button
                            className="secondary"
                            aria-label="위 음 자리 한 칸 올리기"
                            disabled={session.staffOffset >= 7}
                            onClick={() =>
                              g.patchSession({
                                staffOffset: session.staffOffset + 1,
                              })
                            }
                          >
                            ▲ 자리 올리기
                          </button>
                        </div>
                        <p className="muted teaching-note">
                          아래 음부터 줄과 칸을 하나씩 세어 보세요.
                        </p>
                      </>
                    )}
                    {two && session.step === 2 && (
                      <>
                        <h2 className="question-title">
                          {problem.mission === "build"
                            ? "임시표를 맞춰 보세요."
                            : "어느 역일까요?"}
                        </h2>
                        <Track
                          line={problem.station.line}
                          selected={selected.id}
                          onSelect={(id) => {
                            g.patchSession({ selectedStation: id });
                            if (
                              problem.mission === "build" &&
                              g.settings.moveSound
                            )
                              void playMove(
                                upperNote(problem.root, stationById(id))!,
                                sound,
                              );
                          }}
                          hidden={problem.mission === "build"}
                          hideCounts={
                            session.express || problem.mission === "build"
                          }
                        />
                        {problem.mission === "build" && (
                          <div className="button-row">
                            <button
                              className="secondary"
                              disabled={
                                selected.id === stationsOf(selected.line)[0].id
                              }
                              onClick={() => {
                                const list = stationsOf(selected.line);
                                const n =
                                  list[
                                    list.findIndex(
                                      (s) => s.id === selected.id,
                                    ) - 1
                                  ];
                                g.patchSession({ selectedStation: n.id });
                                if (g.settings.moveSound)
                                  void playMove(
                                    upperNote(problem.root, n)!,
                                    sound,
                                  );
                              }}
                            >
                              ← 반음 좁게
                            </button>
                            <button
                              className="secondary"
                              disabled={
                                selected.id ===
                                stationsOf(selected.line).at(-1)!.id
                              }
                              onClick={() => {
                                const list = stationsOf(selected.line);
                                const n =
                                  list[
                                    list.findIndex(
                                      (s) => s.id === selected.id,
                                    ) + 1
                                  ];
                                g.patchSession({ selectedStation: n.id });
                                if (g.settings.moveSound)
                                  void playMove(
                                    upperNote(problem.root, n)!,
                                    sound,
                                  );
                              }}
                            >
                              반음 넓게 →
                            </button>
                          </div>
                        )}
                        {!session.express && (
                          <Keyboard
                            root={problem.root}
                            upper={
                              problem.mission === "build"
                                ? upperNote(problem.root, selected)!
                                : problem.mission === "transfer"
                                  ? sourceUpper
                                  : upper
                            }
                            count={session.hint || session.tries[1] > 0}
                            color={COLORS[problem.station.line - 1].line}
                          />
                        )}
                      </>
                    )}
                    {problem.mission === "move" && (
                      <>
                        <h2 className="question-title">도착할 역의 성질은?</h2>
                        <div className="quality-options">
                          {[
                            ["d", "감"],
                            ["m", "단"],
                            ["M", "장"],
                            ["P", "완전"],
                            ["A", "증"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              className="secondary"
                              onClick={() => answer(value, 1)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {problem.mission === "ear" && (
                      <div className="ear-options">
                        {earChoices(g.stamps).map((s) => (
                          <button
                            key={s.id}
                            className={`secondary ${session.selectedStation === s.id ? "selected" : ""}`}
                            onClick={() =>
                              g.patchSession({ selectedStation: s.id })
                            }
                          >
                            {stationName(s)}
                          </button>
                        ))}
                      </div>
                    )}
                    {!session.express &&
                      problem.mission !== "ear" &&
                      problem.mission !== "move" && (
                        <button
                          className="hint-button"
                          onClick={() =>
                            g.patchSession({
                              hint: true,
                              feedback:
                                session.step === 1
                                  ? "아래 음을 1로 놓고 줄과 칸을 하나씩 세어 보세요."
                                  : "아래 음 다음 건반부터 반음 수를 세어 보세요.",
                            })
                          }
                        >
                          ⓘ 세는 법 보기
                        </button>
                      )}
                    {problem.mission === "ear" && playing && (
                      <p className="muted" role="status">
                        두 음을 듣고 있어요…
                      </p>
                    )}
                  </>
                )}
              </main>
              <div className="footer-action single">
                {isResult ? (
                  <button className="primary" onClick={next}>
                    다음 문제 <span>→</span>
                  </button>
                ) : problem.mission === "build" && session.step === 1 ? (
                  <button
                    className="primary"
                    onClick={() => answer(session.staffOffset + 1, 1)}
                  >
                    자리 정하기 →
                  </button>
                ) : (two && session.step === 2) || problem.mission === "ear" ? (
                  <button
                    className="primary"
                    disabled={!session.selectedStation}
                    onClick={() =>
                      session.selectedStation &&
                      answer(session.selectedStation, two ? 2 : 1)
                    }
                  >
                    {problem.mission === "transfer"
                      ? "환승하기"
                      : problem.mission === "build"
                        ? "도착"
                        : `${session.selectedStation ? stationName(stationById(session.selectedStation)) : ""}역에 도착`}{" "}
                    →
                  </button>
                ) : (
                  <p className="muted">
                    {session.express
                      ? "제한 시간 안에 도착해 보세요."
                      : "천천히 살펴보고 골라 보세요."}
                  </p>
                )}
              </div>
            </>
          );
        })()}

      {screen === "summary" &&
        g.lastSummary &&
        (() => {
          const s = g.lastSummary;
          return (
            <main className="main summary">
              <div className="eyebrow">오늘의 운행을 마쳤어요</div>
              <div className="summary-icon">
                <TrainIcon size={64} />
              </div>
              <h1 className="page-title">한 역 더 가까워졌어요.</h1>
              <p className="muted">
                {SECTIONS.find((x) => x.id === s.section)?.title}
                {s.express ? " · 급행 모드" : ""}
              </p>
              <div className="summary-stats">
                <div className="summary-stat">
                  <strong>
                    {s.clean}
                    <small> / {s.total}</small>
                  </strong>
                  <span>한 번에 도착</span>
                </div>
                <div className="summary-stat">
                  <strong>
                    {Math.floor(s.seconds / 60)}
                    <small>분 {Math.floor(s.seconds % 60)}초</small>
                  </strong>
                  <span>운행 시간</span>
                </div>
              </div>
              {s.express ? (
                <div className="feedback">
                  최장 연속 정답 {s.streak}개 · 최고 기록 {s.best}개
                </div>
              ) : (
                <>
                  <h2>이번에 받은 스탬프</h2>
                  {s.newStamps.length ? (
                    <div className="stamp-grid">
                      {s.newStamps.map((v, i) => (
                        <StampBadge
                          key={i}
                          label={
                            v.target.startsWith("L")
                              ? `${v.target.slice(1)}도선`
                              : v.target.startsWith("ear")
                                ? `${v.target.slice(3)}반음`
                                : v.target.startsWith("tr")
                                  ? `환승 ${v.target.slice(2)}반음`
                                  : stationName(stationById(v.target))
                          }
                          count={v.count}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      다음에는 힌트 없이 한 번에 도착해 보세요.
                    </p>
                  )}
                </>
              )}
              {s.missed.length > 0 && (
                <section className="card">
                  <h2>다시 살펴볼 역</h2>
                  {s.missed.map((r, i) => (
                    <p key={i}>
                      {stationName(r.problem.station)}{" "}
                      <small className="muted">
                        {r.lineError
                          ? "노선부터 세어 봐요."
                          : r.stationError
                            ? "반음 수를 세어 봐요."
                            : "다음엔 힌트 없이 도전해요."}
                      </small>
                    </p>
                  ))}
                </section>
              )}
              <button
                className="primary"
                onClick={() => {
                  setSection(s.section);
                  if (g.startRound(s.section, s.mode, s.express))
                    setScreen("game");
                }}
              >
                한 판 더 →
              </button>
              <button className="secondary" onClick={openHome}>
                노선도로
              </button>
            </main>
          );
        })()}

      {screen === "settings" && (
        <main className="main settings">
          <div className="eyebrow">수업에 맞게 바꿔 보세요</div>
          <h1 className="page-title">나의 운행 설정</h1>
          <div className="card">
            <label className="settings-row">
              <span>음 이름</span>
              <select
                value={style}
                onChange={(e) =>
                  g.setSettings({
                    noteNames: e.target.value as "cde" | "doremi",
                  })
                }
              >
                <option value="cde">C · D · E</option>
                <option value="doremi">도 · 레 · 미</option>
              </select>
            </label>
            <label className="settings-row">
              <span>소리</span>
              <input
                type="checkbox"
                role="switch"
                checked={sound}
                onChange={(e) => {
                  g.setSettings({ sound: e.target.checked });
                  if (!e.target.checked) stopAudio();
                }}
              />
            </label>
            <label className="settings-row">
              <span>기차를 옮길 때 소리</span>
              <input
                type="checkbox"
                role="switch"
                checked={g.settings.moveSound}
                onChange={(e) => g.setSettings({ moveSound: e.target.checked })}
              />
            </label>
            <button
              className="secondary"
              onClick={() =>
                void playPair(
                  ROOTS[0],
                  upperNote(ROOTS[0], stationById("5P"))!,
                  "melodic",
                  sound,
                )
              }
            >
              ♪ 소리 확인
            </button>
            <p className="muted">
              들리지 않으면 무음 스위치와 기기 음량을 확인해 주세요.
            </p>
          </div>
          <div className="card">
            <label className="settings-row">
              <span>한 판 문제 수</span>
              <select
                value={g.settings.problems}
                onChange={(e) =>
                  g.setSettings({
                    problems: Number(e.target.value) as 6 | 8 | 10,
                  })
                }
              >
                {[6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}문제
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-row">
              <span>급행 제한 시간</span>
              <select
                value={g.settings.expressSeconds}
                onChange={(e) =>
                  g.setSettings({
                    expressSeconds: Number(e.target.value) as 10 | 20 | 30,
                  })
                }
              >
                {[10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}초
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-row">
              <span>모든 구간 열기</span>
              <input
                type="checkbox"
                role="switch"
                checked={g.settings.unlockAll}
                onChange={(e) => g.setSettings({ unlockAll: e.target.checked })}
              />
            </label>
            <p className="muted">
              급행 모드는 스탬프를 모두 완성한 구간에서 열려요.
            </p>
          </div>
          <button className="secondary" onClick={openIntro}>
            처음 안내 다시 보기
          </button>
          <button className="secondary" onClick={() => setConfirmReset(true)}>
            기록 지우기
          </button>
          <p className="license">
            악보 기호: Bravura (SIL Open Font License 1.1)
            <br />
            <a href="/OFL-Bravura.txt" target="_blank" rel="noreferrer">
              라이선스 보기
            </a>
          </p>
        </main>
      )}

      {screen === "intro" && (
        <>
          <main className="main intro">
            <div className="eyebrow">처음 여행하는 분을 위한 3단계</div>
            <div className="intro-progress">
              {[0, 1, 2].map((i) => (
                <span key={i} className={introStep === i ? "active" : ""}>
                  {i + 1}
                </span>
              ))}
            </div>
            <h1 className="page-title">
              {
                [
                  "줄과 칸을 세면 노선이 돼요.",
                  "한 칸은 반음 하나예요.",
                  "이제 직접 도착해 볼까요?",
                ][introStep]
              }
            </h1>
            {introStep === 0 ? (
              <>
                <Score
                  root={ROOTS[0]}
                  upper={upperNote(ROOTS[0], stationById("3M"))!}
                  count={introCount}
                  style={style}
                />
                <p>
                  아래 음부터 줄과 칸을 하나씩 세어요.{" "}
                  {style === "cde" ? "C, D, E" : "도, 레, 미"}. 세 번째라서
                  3도선이에요.
                </p>
                <button
                  className="secondary"
                  onClick={() => setIntroCount(true)}
                >
                  1 · 2 · 3 세어 보기
                </button>
                {soundButtons(
                  ROOTS[0],
                  upperNote(ROOTS[0], stationById("3M"))!,
                )}
                <p className="muted">
                  소리가 안 들리면 무음 스위치와 음량을 확인해 주세요.
                </p>
              </>
            ) : introStep === 1 ? (
              <>
                <Track line={3} selected={introMoved ? "3m" : "3M"} />
                <Score
                  root={ROOTS[0]}
                  upper={upperNote(
                    ROOTS[0],
                    stationById(introMoved ? "3m" : "3M"),
                  )!}
                  style={style}
                />
                <Keyboard
                  root={ROOTS[0]}
                  upper={upperNote(
                    ROOTS[0],
                    stationById(introMoved ? "3m" : "3M"),
                  )!}
                  count
                  color={COLORS[2].line}
                />
                <p>
                  {introMoved
                    ? "단3도역, 반음 3개예요. 위 음의 이름은 그대로이고 임시표만 바뀌었어요."
                    : "지금은 장3도역, 반음 4개예요. 왼쪽으로 한 칸 가 보세요."}
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setIntroMoved(!introMoved);
                    void playMove(
                      upperNote(
                        ROOTS[0],
                        stationById(introMoved ? "3M" : "3m"),
                      )!,
                      sound,
                    );
                  }}
                >
                  {introMoved ? "반음 넓게 →" : "← 반음 좁게"}
                </button>
              </>
            ) : (
              <>
                <Score
                  root={ROOTS[0]}
                  upper={upperNote(ROOTS[0], stationById("5P"))!}
                  style={style}
                />
                <p>노선을 먼저 고르고, 그다음 역을 골라요.</p>
                {introLine === 5 ? (
                  <>
                    <Track
                      line={5}
                      selected={introStation}
                      onSelect={setIntroStation}
                    />
                    <button
                      className="primary"
                      onClick={() => {
                        if (introStation === "5P") finishIntro();
                        else
                          setIntroMessage(
                            "완전5도는 반음 7개예요. 그 역을 찾아 보세요.",
                          );
                      }}
                    >
                      도착
                    </button>
                  </>
                ) : (
                  <LineButtons
                    selected={introLine}
                    onSelect={(n) => {
                      setIntroLine(n);
                      setIntroMessage(
                        n === 5
                          ? "5도선은 맞았어요. 이제 역을 골라요."
                          : "아래 음부터 다섯 번째 자리예요. 다시 세어 보세요.",
                      );
                    }}
                  />
                )}
                {introMessage && (
                  <p className="feedback" role="status">
                    {introMessage}
                  </p>
                )}
              </>
            )}
          </main>
          <div className="footer-action single">
            {introStep < 2 && (
              <button
                className="primary"
                onClick={() => setIntroStep(introStep + 1)}
              >
                다음 →
              </button>
            )}
            <button className="hint-button" onClick={finishIntro}>
              안내 건너뛰기
            </button>
          </div>
        </>
      )}

      {screen === "guide" && (
        <main className="main guide">
          <div className="eyebrow">음악 여행 안내서</div>
          <h1 className="page-title">
            노선을 읽고,
            <br />
            반음씩 이동해요.
          </h1>
          <div className="help-grid">
            <article className="card">
              <b>01 노선 = 도수</b>
              <p>
                아래 음을 1로 놓고 위 음까지 음 이름을 세어요. 임시표가 붙어도
                도수는 같아요.
              </p>
            </article>
            <article className="card">
              <b>02 역 = 음정의 성질</b>
              <p>
                2·3·6·7도선은 감 → 단 → 장 → 증, 1·4·5·8도선은 감 → 완전 → 증
                순서예요. 1도선에는 감이 없어요.
              </p>
            </article>
            <article className="card">
              <b>03 한 칸 = 반음</b>
              <p>
                아래 음은 고정해요. 같은 노선에서 한 칸 옮기면 위 음의 임시표가
                바뀌어요.
              </p>
            </article>
            <article className="card">
              <b>04 스탬프와 급행</b>
              <p>
                힌트 없이 첫 시도에 도착하면 반쪽, 두 번이면 완성이에요.
                기준음을 바꾸는 구간은 서로 다른 기준음에서 도착해요.
              </p>
            </article>
            <article className="card">
              <b>05 환승 = 같은 소리, 다른 이름</b>
              <p>
                증2도와 단3도는 소리가 같아도 음 이름과 도수가 달라요. 환승하면
                같은 건반으로 다른 노선을 여행해요.
              </p>
            </article>
            <article className="card">
              <b>06 여섯 가지 미션</b>
              <p>
                노선 찾기 · 악보 읽기 · 역 만들기 · 한 칸 이동 · 귀로 찾기 ·
                환승. 한 판 뒤 놓친 문제를 최대 두 개 다시 풀어요.
              </p>
            </article>
          </div>
          <details className="card">
            <summary>전체 노선도 삽화 보기</summary>
            <img
              src="/route-reference.png"
              alt="1도선부터 8도선까지 27개 역과 반음 수를 보여 주는 전체 노선도"
            />
          </details>
          <details className="card">
            <summary>플레이 흐름 삽화 보기</summary>
            <img
              src="/game-reference.png"
              alt="악보를 보고 역을 찾고 반음씩 이동하며 소리로 확인하는 게임 흐름"
            />
          </details>
          <p className="muted">
            9~13도 확장은 다음 구간이에요. 지금은 1~8도, 27개 역을 여행해요.
          </p>
          <button className="primary" onClick={openIntro}>
            처음 안내 체험하기 →
          </button>
        </main>
      )}

      {confirmReset && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">운행 기록을 지울까요?</h2>
            <p>
              스탬프, 하던 판, 판 기록과 급행 기록이 지워져요. 설정은
              그대로예요.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => setConfirmReset(false)}
              >
                취소
              </button>
              <button
                className="primary"
                onClick={() => {
                  g.resetRecords();
                  setConfirmReset(false);
                  setSection("s1");
                  setNotice("운행 기록을 지웠어요.");
                }}
              >
                기록 지우기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
