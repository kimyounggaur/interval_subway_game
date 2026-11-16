"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Keyboard, Score } from "./Visuals";
import { CONFIG, SECTIONS, stationById, upperNote, type Note } from "../game";
import "./rulebook.css";

const chapters = [
  { id: "start", label: "처음 타기" },
  { id: "route", label: "노선과 역" },
  { id: "missions", label: "여섯 미션" },
  { id: "notes", label: "악보와 건반" },
  { id: "stamps", label: "스탬프와 급행" },
  { id: "settings", label: "설정과 질문" },
] as const;
type Chapter = (typeof chapters)[number]["id"];
const root: Note = { letter: "C", acc: 0, octave: 4 };
const majorThird = stationById("3M")!;
const upper = upperNote(root, majorThird)!;

function Figure({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption: string;
}) {
  return (
    <figure className="rb-figure">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
type Artwork = "journey" | "missions" | "rewards";
function GuideArt({
  sheet,
  cell,
  caption,
}: {
  sheet: Artwork;
  cell: 0 | 1 | 2 | 3;
  caption: string;
}) {
  const positions = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];
  return (
    <Figure caption={caption}>
      <div
        className="rb-art"
        role="img"
        aria-label={caption}
        style={{
          backgroundImage: `url('/rulebook/${sheet}.webp')`,
          backgroundPosition: positions[cell],
        }}
      />
    </Figure>
  );
}
const topics: Record<Chapter, { id: string; label: string }[]> = {
  start: [
    { id: "begin", label: "첫 여행" },
    { id: "steps", label: "운행 순서" },
    { id: "sections", label: "학습 구간" },
  ],
  route: [
    { id: "line", label: "노선과 역" },
    { id: "distance", label: "한 칸 이동" },
    { id: "all-lines", label: "전체 노선도" },
  ],
  missions: [
    { id: "m-line", label: "노선 찾기" },
    { id: "m-read", label: "악보 읽기" },
    { id: "m-build", label: "역 만들기" },
    { id: "m-move", label: "한 칸 이동" },
    { id: "m-ear", label: "귀로 찾기" },
    { id: "m-transfer", label: "환승" },
  ],
  notes: [
    { id: "staff", label: "음 이름 세기" },
    { id: "keys", label: "반음 세기" },
    { id: "same-sound", label: "같은 소리" },
  ],
  stamps: [
    { id: "earn", label: "스탬프" },
    { id: "unlock", label: "구간 해금" },
    { id: "express", label: "급행" },
  ],
  settings: [
    { id: "sound", label: "소리" },
    { id: "help", label: "힌트와 복습" },
    { id: "save", label: "기록과 설정" },
  ],
};
function RailFigure() {
  return (
    <Figure caption="음 이름을 도·레·미로 세면 3도선이에요.">
      <svg
        viewBox="0 0 360 100"
        role="img"
        aria-label="도, 레, 미 세 역을 차례로 세는 3도선"
      >
        <path
          d="M50 51h260"
          stroke="#be8f42"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {["도 ①", "레 ②", "미 ③"].map((name, i) => (
          <g key={name}>
            <circle
              cx={50 + i * 130}
              cy="51"
              r="19"
              fill="#fff8e7"
              stroke="#31594a"
              strokeWidth="5"
            />
            <text
              x={50 + i * 130}
              y="88"
              textAnchor="middle"
              fontSize="18"
              fill="#294d43"
            >
              {name}
            </text>
          </g>
        ))}
      </svg>
    </Figure>
  );
}
function StampFigure() {
  return (
    <Figure caption="힌트 없이 한 번에 도착할 때 도장이 진행돼요.">
      <div
        className="rb-stamps"
        role="img"
        aria-label="반쪽 도장과 완성 도장 그림"
      >
        <span>
          ◐<small>반쪽</small>
        </span>
        <span>
          ●<small>완성</small>
        </span>
      </div>
    </Figure>
  );
}
const missionDetails = [
  {
    id: "m-line",
    title: "노선 찾기",
    text: "두 음의 음 이름을 아래 음부터 세고 1~8도선 중에서 골라요. 노선 버튼을 누르면 바로 판정해요.",
    sheet: "journey",
    cell: 1,
  },
  {
    id: "m-read",
    title: "악보 읽기",
    text: "악보에서 두 음을 보고 먼저 노선을 고른 뒤, 알맞은 성질의 역을 선택해 도착해요.",
    sheet: "missions",
    cell: 0,
  },
  {
    id: "m-build",
    title: "역 만들기",
    text: "위 음의 줄·칸을 조절해 노선을 확인한 다음, 같은 노선에서 반음 간격을 바꿔 목표 음정을 만들어요.",
    sheet: "missions",
    cell: 1,
  },
  {
    id: "m-move",
    title: "한 칸 이동",
    text: "출발역에서 안내된 방향으로 이웃 역 한 칸을 이동해요. 선택하면 바로 판정해요.",
    sheet: "missions",
    cell: 2,
  },
  {
    id: "m-ear",
    title: "귀로 찾기",
    text: "두 음을 듣고 같은 반음 수의 역을 골라요. 증4도와 감5도처럼 같은 반음 수의 다른 이름도 정답이 될 수 있어요.",
    sheet: "missions",
    cell: 3,
  },
  {
    id: "m-transfer",
    title: "환승",
    text: "출발역과 같은 소리가 나는 다른 이름을 찾아 노선과 역을 차례로 선택해요. 증4도와 감5도는 모두 6반음이에요.",
    sheet: "rewards",
    cell: 0,
  },
] as const;

export default function Rulebook({
  onClose,
  isExpress = false,
  timerRunning = false,
}: {
  onClose: () => void;
  isExpress?: boolean;
  timerRunning?: boolean;
}) {
  const [chapter, setChapter] = useState<Chapter>("start");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focusChapter = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCallback.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]',
        ),
      ].filter((el) => !el.hasAttribute("hidden"));
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === nodes[nodes.length - 1]
      ) {
        event.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      returnFocus.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (focusChapter.current) {
      contentRef.current?.focus();
      focusChapter.current = false;
    }
  }, [chapter]);
  const goToTopic = (id: string) => {
    const container = contentRef.current;
    const target = document.getElementById(`rb-${id}`);
    if (container && target) {
      container.scrollTop +=
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        14;
    }
  };
  const onTabsKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % chapters.length
        : e.key === "ArrowLeft"
          ? (index + chapters.length - 1) % chapters.length
          : -1;
    if (next < 0) return;
    e.preventDefault();
    setChapter(chapters[next].id);
    (
      e.currentTarget.parentElement?.children[next] as
        HTMLButtonElement | undefined
    )?.focus();
  };
  return (
    <div
      className="rb-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rb-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <header className="rb-header">
          <div>
            <span className="rb-kicker">음악 여행 안내서</span>
            <h2 id={titleId}>음정 지하철 룰북</h2>
          </div>
          <button
            className="rb-close"
            ref={closeRef}
            onClick={onClose}
            aria-label="룰북 닫기"
          >
            ✕
          </button>
        </header>
        {isExpress && (
          <p className="rb-timer">
            {timerRunning
              ? "급행 제한 시간이 진행 중이에요. 룰북을 열어도 시간이 계속 흘러요."
              : "귀로 찾기 급행은 소리 듣기가 끝나면 제한 시간이 시작돼요."}
          </p>
        )}
        <div className="rb-tabs" role="tablist" aria-label="룰북 목차">
          {chapters.map((item, index) => (
            <button
              key={item.id}
              id={`rb-tab-${item.id}`}
              role="tab"
              aria-selected={chapter === item.id}
              aria-controls={
                chapter === item.id ? `rb-page-${item.id}` : undefined
              }
              tabIndex={chapter === item.id ? 0 : -1}
              onClick={() => setChapter(item.id)}
              onKeyDown={(e) => onTabsKey(e, index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="rb-scroll"
          ref={contentRef}
          role="tabpanel"
          id={`rb-page-${chapter}`}
          aria-labelledby={`rb-tab-${chapter}`}
          tabIndex={0}
          key={chapter}
        >
          <nav className="rb-topic-nav" aria-label="현재 장의 목차">
            {topics[chapter].map((topic) => (
              <button key={topic.id} onClick={() => goToTopic(topic.id)}>
                {topic.label}
              </button>
            ))}
          </nav>
          {chapter === "start" && (
            <>
              <h3 id="rb-begin">반가워요, 음정 여행을 시작해요</h3>
              <p>
                두 음 사이의 거리는 지하철의 노선과 역처럼 배울 수 있어요.
                노선을 고르고 알맞은 역에 도착하며 음정을 익혀 보세요.
              </p>
              <GuideArt
                sheet="journey"
                cell={0}
                caption="설레는 첫 음정 여행을 시작해요"
              />
              <h4 id="rb-steps">운행 순서</h4>
              <ol>
                <li>학습 운행에서 구간을 고릅니다.</li>
                <li>승차권의 문제를 읽고 노선이나 역을 선택합니다.</li>
                <li>설명을 확인하고 다음 문제로 이동합니다.</li>
              </ol>
              <GuideArt
                sheet="journey"
                cell={2}
                caption="승차권을 확인하고 문제를 풀어요"
              />
              <h4 id="rb-sections">다섯 구간을 차례로 배워요</h4>
              <p>
                각 구간의 목표와 잠금 조건은 학습 운행 화면에서 확인해요. 자유
                운행에서는 문제 없이 원하는 음정을 탐색할 수 있어요.
              </p>
              <ol>
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <strong>{section.title}</strong> — {section.description}
                  </li>
                ))}
              </ol>
              <GuideArt
                sheet="journey"
                cell={3}
                caption="지도에서 원하는 노선과 역을 탐색해요"
              />
            </>
          )}
          {chapter === "route" && (
            <>
              <h3 id="rb-line">노선은 도수, 역은 음정의 성질</h3>
              <p>
                아래 음을 1로 세고 위 음까지 음 이름을 세면 노선이 나와요.
                임시표가 붙어도 음 이름을 세는 순서는 바뀌지 않아요.
              </p>
              <RailFigure />
              <GuideArt
                sheet="journey"
                cell={1}
                caption="음정의 거리를 지하철 노선으로 살펴봐요"
              />
              <h4 id="rb-distance">한 칸은 반음 하나</h4>
              <p>
                같은 노선에서 이웃 역 한 칸을 이동하면 두 음의 거리가 반음
                하나만큼 달라져요. 예를 들어 장3도에서 왼쪽으로 한 칸 이동하면
                단3도예요.
              </p>
              <div
                className="rb-example"
                aria-label="장3도 4반음에서 단3도 3반음으로 이동"
              >
                <span>단3도 · 3반음</span>
                <strong aria-hidden="true">← 한 칸</strong>
                <span>장3도 · 4반음</span>
              </div>
              <p>
                2·3·6·7도선은 감 → 단 → 장 → 증, 4·5·8도선은 감 → 완전 → 증
                순서예요. 1도선은 완전 → 증 순서이며 감1도 역은 없어요.
              </p>
              <h4 id="rb-all-lines">전체 노선도</h4>
              <Figure caption="1도선부터 8도선까지의 전체 노선도">
                <img
                  src="/route-reference.png"
                  alt="1도선부터 8도선까지 음정 역을 나타낸 노선도"
                  width="1536"
                  height="1024"
                  loading="lazy"
                />
              </Figure>
            </>
          )}
          {chapter === "missions" && (
            <>
              <h3>여섯 가지 승차권</h3>
              <p>
                미션마다 문제를 읽고 화면의 지시에 따라 선택해 주세요. 각 그림은
                상황을 설명하기 위한 삽화예요.
              </p>
              {missionDetails.map((mission, i) => (
                <section key={mission.id} className="rb-mission-section">
                  <h4 id={`rb-${mission.id}`}>
                    <span className="rb-number">{i + 1}</span> {mission.title}
                  </h4>
                  <p>{mission.text}</p>
                  <GuideArt
                    sheet={mission.sheet}
                    cell={mission.cell}
                    caption={`${mission.title} 미션을 나타낸 그림`}
                  />
                </section>
              ))}
              <p className="rb-tip">
                일반 운행에서 놓친 문제는 판 끝에 최대 {CONFIG.retryMax}개까지
                다시 나올 수 있어요.
              </p>
            </>
          )}
          {chapter === "notes" && (
            <>
              <h3 id="rb-staff">악보에서 음 이름을 세어요</h3>
              <p>
                아래 음을 도로 두면 미는 세 번째 음이에요. 도와 미는
                3도선이에요.
              </p>
              <Figure caption="도와 미: 음 이름을 세면 3도">
                <Score root={root} upper={upper} count style="doremi" />
              </Figure>
              <h4 id="rb-keys">건반으로 반음을 세어요</h4>
              <p>
                도에서 미까지 건반을 한 칸씩 세면 네 반음이므로 장3도예요. 아래
                악보와 건반은 게임 엔진의 음정 데이터로 표시돼요.
              </p>
              <Figure caption="도에서 미까지 건반으로 네 반음을 세어요">
                <Keyboard root={root} upper={upper} count />
              </Figure>
              <h4 id="rb-same-sound">같은 소리, 다른 이름</h4>
              <p>
                건반에서 같은 소리라도 악보의 음 이름에 따라 노선이 달라질 수
                있어요. 도–레♯은 증2도, 도–미♭은 단3도이며 두 음정 모두
                3반음이에요.
              </p>
              <GuideArt
                sheet="rewards"
                cell={0}
                caption="같은 소리를 다른 이름의 역에서 만나요"
              />
            </>
          )}
          {chapter === "stamps" && (
            <>
              <h3 id="rb-earn">스탬프를 모아요</h3>
              <GuideArt
                sheet="rewards"
                cell={2}
                caption="운행을 마치고 스탬프를 모아요"
              />
              <StampFigure />
              <p>
                힌트 없이 모든 단계를 첫 시도에 맞히면 해당 문제의 스탬프가
                진행돼요. {CONFIG.stampNeed}번 한 번에 도착하면 완성돼요.
                기준음을 바꾸는 구간과 끝 역 구간에는 서로 다른 기준음 조건이
                있어요.
              </p>
              <h4 id="rb-unlock">다음 구간을 여는 방법</h4>
              <p>
                앞 구간의 완성 스탬프를 필요한 만큼 모으면 다음 구간이 열려요.
                학습 구간 화면에서 실제 필요한 수와 현재 상태를 확인해요. 수업용
                설정에서 구간을 모두 열 수 있지만 급행 조건은 별도로 적용돼요.
              </p>
              <h4 id="rb-express">급행은 시간 제한 도전</h4>
              <GuideArt
                sheet="rewards"
                cell={1}
                caption="시계와 함께 급행 운행에 도전해요"
              />
              <p>
                해당 구간의 조건을 채우면 급행에 도전할 수 있어요. 시간은 수업용
                설정에서 바꾸며, 급행에서는 스탬프를 더하지 않아요.
              </p>
              <p>
                일반 급행 문제의 시간은 문제가 시작되면 흐르고, 귀로 찾기는 첫
                소리 듣기가 끝난 뒤 시작돼요. 시간이 시작된 뒤에는 룰북을 열어도
                멈추지 않아요.
              </p>
            </>
          )}
          {chapter === "settings" && (
            <>
              <h3 id="rb-sound">설정과 자주 묻는 질문</h3>
              <GuideArt
                sheet="rewards"
                cell={3}
                caption="안내원과 함께 궁금한 점을 확인해요"
              />
              <h4>소리가 들리지 않아요</h4>
              <p>
                수업용 설정에서 소리를 켜고 기기의 음량을 확인하세요. 귀로
                찾기는 소리가 필요해요. 재생 버튼을 직접 눌러야 소리가 시작될 수
                있어요.
              </p>
              <h4 id="rb-help">힌트를 쓰면 어떻게 되나요?</h4>
              <p>
                일반 운행에서 힌트를 사용하면 해당 문제는 스탬프에 세지 않아요.
                급행에서는 도움 정보가 제한돼요. 일반 운행에서 놓친 문제는 판
                끝에 최대 {CONFIG.retryMax}개까지 복습으로 추가될 수 있어요.
              </p>
              <h4 id="rb-save">기록은 어디에 저장되나요?</h4>
              <p>
                진행 상황은 이 기기의 브라우저에 저장돼요. 저장이 차단되거나
                브라우저 데이터를 지우면 기록이 유지되지 않을 수 있어요. 소리,
                음 이름과 급행 시간은 수업용 설정에서 확인하세요.
              </p>
              <h4>구간이 잠겨 있어요</h4>
              <p>
                이전 구간에서 필요한 완성 스탬프를 모아 주세요. 구간을 모두
                열어도 급행은 해당 조건을 따로 충족해야 해요.
              </p>
            </>
          )}
        </div>
        <footer className="rb-footer">
          <span>
            {chapters.findIndex((c) => c.id === chapter) + 1} /{" "}
            {chapters.length}
          </span>
          {chapter !== "settings" && (
            <button
              onClick={() => {
                focusChapter.current = true;
                setChapter(
                  chapters[chapters.findIndex((c) => c.id === chapter) + 1].id,
                );
              }}
            >
              다음 내용 보기 →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
