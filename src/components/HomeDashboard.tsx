"use client";

import { useRef, useState } from "react";
import {
  COLORS,
  SECTIONS,
  canExpress,
  isUnlocked,
  sectionProgress,
  stationName,
  stationsOf,
  type SectionId,
} from "../game";
import type { GameState, RoundMode } from "../store/useGame";
import "./home-dashboard.css";

type Props = {
  game: GameState;
  section: SectionId;
  setSection: (value: SectionId) => void;
  mode: RoundMode;
  setMode: (value: RoundMode) => void;
  onStart: (express?: boolean) => void;
  onResume: () => void;
  onFree: (stationId?: string) => void;
};
type View = "menu" | "learn" | "stamps" | "map";

/** The store and engine remain the single source of progress and unlock rules. */
export default function HomeDashboard({
  game,
  section,
  setSection,
  mode,
  setMode,
  onStart,
  onResume,
  onFree,
}: Props) {
  const [view, setView] = useState<View>("menu");
  const [wantExpress, setWantExpress] = useState(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selected = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const unlocked = isUnlocked(section, game.stamps, game.settings.unlockAll);
  const progress = sectionProgress(game.stamps, section);
  const expressReady = unlocked && canExpress(section, game.stamps, mode);
  const total = SECTIONS.reduce(
    (acc, s) => acc + sectionProgress(game.stamps, s.id).complete,
    0,
  );
  const showLearning = (express: boolean) => {
    setWantExpress(express);
    setView("learn");
  };
  return (
    <main className="main dashboard" aria-label="음정 지하철 홈">
      {view === "menu" ? (
        <>
          <section className="dashboard-hero" aria-labelledby="welcome-title">
            <p className="dashboard-kicker">오늘도 음악으로 출발</p>
            <h1 id="welcome-title">
              음정 지하철에
              <br />
              오신 것을 환영해요!
            </h1>
            <p>도수는 노선, 음정의 성질은 역이에요.</p>
            <div className="dashboard-train" aria-hidden="true" />
          </section>
          {game.session && (
            <button className="dashboard-resume" onClick={onResume}>
              <span aria-hidden="true">▶</span>
              <span>
                <strong>하던 운행 이어하기</strong>
                <small>
                  {SECTIONS.find((s) => s.id === game.session?.section)?.title}{" "}
                  · {game.session.index + 1}/{game.session.problems.length}번
                  승차권
                </small>
              </span>
              <b aria-hidden="true">→</b>
            </button>
          )}
          <div className="dashboard-heading">
            <div>
              <p className="dashboard-kicker">어디로 떠나 볼까요?</p>
              <h2>운행 선택</h2>
            </div>
          </div>
          <div className="dashboard-cards">
            <button
              className="dashboard-card"
              onClick={() => showLearning(false)}
            >
              <span className="dashboard-icon" aria-hidden="true">
                🚉
              </span>
              <span>
                <strong>학습 운행</strong>
                <small>한 역씩 여행하며 음정을 배워요</small>
                <em>구간 선택하기 →</em>
              </span>
            </button>
            <button className="dashboard-card" onClick={() => onFree()}>
              <span className="dashboard-icon" aria-hidden="true">
                🎹
              </span>
              <span>
                <strong>자유 운행</strong>
                <small>원하는 음정의 악보와 소리를 탐색해요</small>
                <em>자유롭게 살펴보기 →</em>
              </span>
            </button>
            <button
              className="dashboard-card"
              onClick={() => showLearning(true)}
            >
              <span className="dashboard-icon" aria-hidden="true">
                ⚡
              </span>
              <span>
                <strong>급행 도전</strong>
                <small>해금한 구간에서 시간제 도전</small>
                <em>도전 가능한 구간 보기 →</em>
              </span>
            </button>
            <button
              className="dashboard-card"
              onClick={() => setView("stamps")}
            >
              <span className="dashboard-icon" aria-hidden="true">
                🏅
              </span>
              <span>
                <strong>나의 스탬프</strong>
                <small>완성한 학습 목표 {total}개 · 구간별로 확인하기</small>
                <em>기록 살펴보기 →</em>
              </span>
            </button>
          </div>
          <button className="dashboard-map-link" onClick={() => setView("map")}>
            🗺 전체 노선도 보기 <span aria-hidden="true">→</span>
          </button>
          <p className="dashboard-footnote">
            나의 속도로 한 역씩. 기록은 이 기기에 저장돼요.
          </p>
        </>
      ) : (
        <>
          <button className="dashboard-back" onClick={() => setView("menu")}>
            ← 운행 선택으로
          </button>
          <h1 className="dashboard-page-title">
            {view === "learn"
              ? wantExpress
                ? "급행 구간 선택"
                : "학습 구간 선택"
              : view === "stamps"
                ? "나의 스탬프"
                : "전체 노선도"}
          </h1>
          {view === "learn" && (
            <>
              <p className="dashboard-help">
                구간을 선택하면 학습 목표와 출발 방법을 확인할 수 있어요.
              </p>
              <div className="dashboard-section-list" aria-label="학습 구간">
                {SECTIONS.map((s, i) => {
                  const status = sectionProgress(game.stamps, s.id);
                  const available = isUnlocked(
                    s.id,
                    game.stamps,
                    game.settings.unlockAll,
                  );
                  const prev = i > 0 ? SECTIONS[i - 1] : null;
                  const before = prev
                    ? sectionProgress(game.stamps, prev.id).complete
                    : 0;
                  const active = section === s.id;
                  return (
                    <button
                      key={s.id}
                      className={`dashboard-section ${active ? "is-selected" : ""}`}
                      aria-pressed={active}
                      onClick={() => {
                        setSection(s.id);
                        requestAnimationFrame(() => {
                          detailHeading.current?.focus();
                        });
                      }}
                    >
                      <span className="dashboard-section-num">{i + 1}</span>
                      <span className="dashboard-section-text">
                        <strong>{s.title}</strong>
                        <small>{s.description}</small>
                        <span className="dashboard-status">
                          {available
                            ? status.finished
                              ? "완료"
                              : "이용 가능"
                            : "잠김"}{" "}
                          · 완성 {status.complete}/{status.total}
                        </span>
                        {!available && prev && (
                          <small>
                            이전 구간 완성 목표 {before}/{prev.unlock}개 필요
                          </small>
                        )}
                      </span>
                      <span className="dashboard-selection">
                        {active ? "선택됨" : "선택"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <section
                className="dashboard-detail"
                aria-label="선택한 구간 정보"
              >
                <p className="dashboard-kicker">선택한 구간</p>
                <h2 ref={detailHeading} tabIndex={-1}>
                  {selected.title}
                </h2>
                <p>{selected.description}</p>
                <p>
                  완성한 학습 목표 {progress.complete}/{progress.total}개
                </p>
                {section === "s5" && (
                  <div
                    className="dashboard-mode"
                    role="group"
                    aria-label="미션 선택"
                  >
                    <button
                      aria-pressed={mode === "ear"}
                      onClick={() => setMode("ear")}
                    >
                      ♪ 귀로 찾기
                    </button>
                    <button
                      aria-pressed={mode === "transfer"}
                      onClick={() => setMode("transfer")}
                    >
                      ⇄ 환승
                    </button>
                  </div>
                )}
                {!unlocked && (
                  <p className="dashboard-notice">
                    앞 구간의 학습 목표를 완성하면 이 구간이 열려요. 구간
                    카드에서 필요한 수를 확인해 주세요.
                  </p>
                )}
                {wantExpress && unlocked && !expressReady && (
                  <p className="dashboard-notice">
                    이 구간의{" "}
                    {section === "s5"
                      ? mode === "ear"
                        ? "귀로 찾기"
                        : "환승"
                      : "모든 대상"}{" "}
                    스탬프를 완성하면 급행이 열려요.
                  </p>
                )}
                <button
                  className="primary dashboard-start"
                  disabled={wantExpress ? !expressReady : !unlocked}
                  onClick={() => onStart(wantExpress)}
                >
                  {wantExpress
                    ? `급행 출발 · ${game.settings.expressSeconds}초`
                    : "이 구간 시작"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </section>
            </>
          )}
          {view === "stamps" && (
            <>
              <p className="dashboard-help">
                완성한 학습 목표를 구간별로 살펴보세요.
              </p>
              <div className="dashboard-section-list">
                {SECTIONS.map((s, i) => {
                  const p = sectionProgress(game.stamps, s.id);
                  return (
                    <button
                      key={s.id}
                      className="dashboard-section"
                      onClick={() => {
                        setSection(s.id);
                        setWantExpress(false);
                        setView("learn");
                      }}
                    >
                      <span className="dashboard-section-num">{i + 1}</span>
                      <span className="dashboard-section-text">
                        <strong>{s.title}</strong>
                        <small>
                          완성 {p.complete}/{p.total}개
                        </small>
                        <progress
                          max={p.total}
                          value={p.complete}
                          aria-label={`${s.title} 완성 ${p.complete} / ${p.total}`}
                        />
                      </span>
                      <span className="dashboard-selection">보기 →</span>
                    </button>
                  );
                })}
              </div>
              <button
                className="dashboard-map-link"
                onClick={() => setView("map")}
              >
                전체 노선도 보기 →
              </button>
            </>
          )}
          {view === "map" && (
            <>
              <p className="dashboard-help">
                역을 누르면 자유 운행에서 음정을 듣고 살펴볼 수 있어요.
              </p>
              <div className="dashboard-map">
                {COLORS.map((color, i) => (
                  <section className="dashboard-route" key={i}>
                    <h2>
                      <span style={{ background: color.line }}>{i + 1}</span>{" "}
                      {i + 1}도선
                    </h2>
                    <div className="dashboard-stations">
                      {stationsOf(i + 1).map((s) => (
                        <button key={s.id} onClick={() => onFree(s.id)}>
                          <strong>{stationName(s)}</strong>
                          <small>{s.semitones}반음</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
