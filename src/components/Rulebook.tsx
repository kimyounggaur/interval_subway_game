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
  ["노선 찾기", "두 음 사이의 음 이름을 세어 몇 도선인지 골라요."],
  ["악보 읽기", "악보의 두 음을 보고 노선을 고른 다음 알맞은 역을 찾아요."],
  ["역 만들기", "위 음의 줄·칸과 임시표를 조절해 주어진 음정을 만들어요."],
  ["한 칸 이동", "같은 노선에서 지시된 방향으로 한 역 이동해요."],
  ["귀로 찾기", "두 음을 듣고 알맞은 역을 골라요. 소리가 필요해요."],
  ["환승", "같은 소리이지만 이름이 다른 음정을 찾아 다른 노선으로 이동해요."],
];

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
          'button:not([disabled]), a[href], [tabindex="0"]',
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
              aria-controls={`rb-page-${item.id}`}
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
          role="tabpanel"
          id={`rb-page-${chapter}`}
          aria-labelledby={`rb-tab-${chapter}`}
          tabIndex={0}
          key={chapter}
        >
          {chapter === "start" && (
            <>
              <h3>반가워요, 음정 여행을 시작해요</h3>
              <p>
                두 음 사이의 거리는 지하철의 노선과 역처럼 배울 수 있어요.
                노선을 고르고 알맞은 역에 도착해 스탬프를 모아 보세요.
              </p>
              <Figure caption="승강장에서 학습 운행과 자유 운행을 시작해요.">
                <img
                  src="/remaster/station.webp"
                  alt="따뜻한 조명의 지하철 승강장"
                  loading="lazy"
                  width="1024"
                  height="1536"
                />
              </Figure>
              <h4>운행 순서</h4>
              <ol>
                <li>학습할 구간을 고릅니다.</li>
                <li>승차권의 문제를 읽고 노선이나 역을 선택합니다.</li>
                <li>결과를 확인하고 다음 문제로 이동합니다.</li>
              </ol>
              <p>
                구간은 {SECTIONS.length}개예요. 자유 운행에서는 문제 없이 음정을
                탐색할 수 있어요.
              </p>
            </>
          )}
          {chapter === "route" && (
            <>
              <h3>노선은 도수, 역은 음정의 성질</h3>
              <p>
                아래 음을 1로 세고 위 음까지 음 이름을 세면 노선이 나와요.
                임시표가 붙어도 음 이름을 세는 순서는 바뀌지 않아요.
              </p>
              <RailFigure />
              <h4>한 칸은 반음 하나</h4>
              <p>
                같은 노선의 이웃 역 사이 거리는 반음 하나예요. 2·3·6·7도선은 감
                → 단 → 장 → 증, 1·4·5·8도선은 감 → 완전 → 증 순서예요. 1도선에는
                감1도 역이 없어요.
              </p>
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
              <p>미션마다 문제를 읽고 화면의 지시에 따라 선택해 주세요.</p>
              <div className="rb-missions">
                {missionDetails.map(([title, desc], i) => (
                  <article key={title}>
                    <span aria-hidden="true">{i + 1}</span>
                    <div>
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  </article>
                ))}
              </div>
              <Figure caption="악보를 읽고 역을 선택하는 운행의 흐름">
                <img
                  src="/game-reference.png"
                  alt="악보와 노선도를 이용한 음정 지하철 문제 풀이 화면"
                  width="1536"
                  height="1024"
                  loading="lazy"
                />
              </Figure>
            </>
          )}
          {chapter === "notes" && (
            <>
              <h3>악보와 건반을 함께 봐요</h3>
              <p>
                아래 음을 도로 두면 미는 세 번째 음이에요. 도와 미 사이에는 네
                반음이 있어 장3도예요.
              </p>
              <Figure caption="도와 미: 음 이름을 세면 3도">
                <Score root={root} upper={upper} count style="doremi" />
              </Figure>
              <Figure caption="도에서 미까지 건반으로 네 반음을 세어요">
                <Keyboard root={root} upper={upper} count />
              </Figure>
              <p>
                건반에서 같은 소리라도 악보의 음 이름에 따라 다른 노선이 될 수
                있어요. 증2도와 단3도는 환승의 한 예예요.
              </p>
            </>
          )}
          {chapter === "stamps" && (
            <>
              <h3>스탬프와 급행</h3>
              <StampFigure />
              <p>
                힌트 없이 모든 단계를 첫 시도에 맞히면 해당 문제의 스탬프가
                진행돼요. {CONFIG.stampNeed}번 한 번에 도착하면 완성됩니다.
                기준음을 바꾸는 구간에는 서로 다른 기준음 조건이 있어요.
              </p>
              <p>
                앞 구간의 완성 스탬프를 필요한 만큼 모으면 다음 구간이 열려요.
                구간별 진행 화면에서 조건과 현재 상태를 확인해요.
              </p>
              <h4>급행은 시간 제한 도전</h4>
              <p>
                해당 구간의 조건을 채우면 급행에 도전할 수 있어요. 시간은 수업용
                설정에서 바꿀 수 있으며, 급행은 스탬프를 더하지 않아요. 제한
                시간이 시작된 뒤에는 룰북을 보더라도 계속 흘러요. 귀로 찾기는
                소리 듣기가 끝난 뒤 시간이 시작돼요.
              </p>
            </>
          )}
          {chapter === "settings" && (
            <>
              <h3>설정과 자주 묻는 질문</h3>
              <h4>소리가 들리지 않아요</h4>
              <p>
                수업용 설정에서 소리를 켜고 기기의 음량을 확인하세요. 귀로
                찾기는 소리가 필요해요. 재생 버튼을 직접 눌러야 소리가 시작될 수
                있어요.
              </p>
              <h4>힌트를 쓰면 어떻게 되나요?</h4>
              <p>
                일반 운행에서 힌트를 사용하면 해당 문제는 스탬프에 세지 않아요.
                급행에서는 도움 정보가 제한돼요.
              </p>
              <h4>기록은 어디에 저장되나요?</h4>
              <p>
                진행 상황은 이 기기의 브라우저에 저장돼요. 저장이 차단되거나
                브라우저 데이터를 지우면 기록이 유지되지 않을 수 있어요.
              </p>
              <h4>구간이 잠겨 있어요</h4>
              <p>
                이전 구간에서 필요한 완성 스탬프를 모아 주세요. 수업용 설정에서
                구간 열기 설정도 확인할 수 있어요.
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
              onClick={() =>
                setChapter(
                  chapters[chapters.findIndex((c) => c.id === chapter) + 1].id,
                )
              }
            >
              다음 내용 보기 →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
