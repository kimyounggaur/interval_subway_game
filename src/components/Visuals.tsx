"use client";

import type { CSSProperties } from "react";
import {
  COLORS,
  keyboardKeys,
  ledgerSteps,
  midi,
  needsNatural,
  noteLabel,
  staffStep,
  stationName,
  stationsOf,
  type Note,
} from "../game";
import music from "./music-glyphs.json";

const glyphs = music.glyphs;
const INK = "#001434";
const accidentalKeys = {
  "-2": "accidentalDoubleFlat",
  "-1": "accidentalFlat",
  "0": "accidentalNatural",
  "1": "accidentalSharp",
  "2": "accidentalDoubleSharp",
} as const;
const syllables = {
  C: "도",
  D: "레",
  E: "미",
  F: "파",
  G: "솔",
  A: "라",
  B: "시",
};

function Accidental({
  acc,
  x = 0,
  y = 0,
  scale = 0.056,
}: {
  acc: number;
  x?: number;
  y?: number;
  scale?: number;
}) {
  const name = accidentalKeys[String(acc) as keyof typeof accidentalKeys];
  return name ? (
    <path
      d={glyphs[name].d}
      transform={`translate(${x} ${y}) scale(${scale} ${-scale})`}
    />
  ) : null;
}

export function TrainIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="6.5"
        y="3"
        width="19"
        height="22"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M10 8h12v8H10z" fill="currentColor" />
      <circle cx="11.5" cy="21" r="1.5" fill="currentColor" />
      <circle cx="20.5" cy="21" r="1.5" fill="currentColor" />
      <path
        d="m11 25-3 4m13-4 3 4M10 28h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NoteText({
  note,
  style = "cde",
}: {
  note: Note;
  style?: "cde" | "doremi";
}) {
  const glyph = note.acc
    ? glyphs[accidentalKeys[String(note.acc) as keyof typeof accidentalKeys]]
    : null;
  const width = glyph ? Math.ceil(glyph.bbox[2] * 0.035) + 2 : 0;
  return (
    <span className="note-text" aria-label={noteLabel(note, style)}>
      <span>{style === "doremi" ? syllables[note.letter] : note.letter}</span>
      {glyph && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} 30`}
          width={width}
          height="25"
        >
          <Accidental acc={note.acc} x={1} y={18} scale={0.035} />
        </svg>
      )}
      <sub>{note.octave}</sub>
    </span>
  );
}

export function Score({
  root,
  upper,
  count = false,
  style = "cde",
}: {
  root: Note;
  upper?: Note;
  count?: boolean;
  style?: "cde" | "doremi";
}) {
  const yOf = (n: Note) => 110 - staffStep(n) * 7;
  const drawNote = (n: Note, x: number, top: boolean) => {
    const y = yOf(n);
    const showNatural = top && upper && needsNatural(root, upper);
    const accidental = n.acc !== 0 || showNatural;
    const key = accidentalKeys[String(n.acc) as keyof typeof accidentalKeys];
    const accWidth = key ? glyphs[key].bbox[2] * 0.056 : 0;
    return (
      <g key={top ? "upper" : "root"}>
        {ledgerSteps(n).map((step: number) => (
          <path
            key={step}
            d={`M${x - 9} ${110 - step * 7}h42`}
            stroke={INK}
            strokeWidth="1.6"
          />
        ))}
        {accidental && <Accidental acc={n.acc} x={x - accWidth - 6} y={y} />}
        <path
          d={glyphs.noteheadWhole.d}
          transform={`translate(${x} ${y}) scale(.056 -.056)`}
        />
        <text x={x + 12} y="139" textAnchor="middle" className="score-label">
          {top ? "위 음" : "아래 음"}
        </text>
      </g>
    );
  };
  const steps =
    upper && count
      ? Array.from(
          { length: Math.max(0, staffStep(upper) - staffStep(root) + 1) },
          (_, i) => staffStep(root) + i,
        )
      : [];
  return (
    <svg
      className="score"
      viewBox="0 0 300 148"
      role="img"
      aria-label={`높은음자리표 악보. 아래 음 ${noteLabel(root, style)}${upper ? `, 위 음 ${noteLabel(upper, style)}` : ""}`}
    >
      <g fill={INK}>
        <path
          d="M0 40H300M0 54H300M0 68H300M0 82H300M0 96H300"
          stroke={INK}
          strokeWidth="1.15"
          fill="none"
        />
        <path
          d={glyphs.gClef.d}
          transform="translate(12 82) scale(.056 -.056)"
        />
        {drawNote(root, 130, false)}
        {upper && drawNote(upper, 232, true)}
        {steps.map((step, i) => (
          <g key={step}>
            <circle cx="186" cy={110 - step * 7} r="6.5" fill="#FEFAF0" />
            <text
              x="186"
              y={110 - step * 7 + 4}
              textAnchor="middle"
              className="score-count"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Keyboard({
  root,
  upper,
  count = false,
  color = "#0170F2",
}: {
  root: Note;
  upper?: Note;
  count?: boolean;
  color?: string;
}) {
  const keys = keyboardKeys(root);
  const rootMidi = midi(root),
    upperMidi = upper ? midi(upper) : undefined;
  const whites = keys.filter((k) => !k.black);
  const width = 324 / whites.length;
  const xOf = (key: { midi: number; black: boolean }) => {
    const before = keys.filter((k) => !k.black && k.midi < key.midi).length;
    return key.black ? before * width : before * width + width / 2;
  };
  const dots = (key: { midi: number; black: boolean }) => {
    const isRoot = key.midi === rootMidi,
      isUpper = key.midi === upperMidi;
    const x = xOf(key),
      y = key.black ? 40 : 66;
    return (
      <g key={`dots-${key.midi}`}>
        {count &&
          upperMidi !== undefined &&
          key.midi > rootMidi &&
          key.midi <= upperMidi && (
            <text
              x={x}
              y={key.black ? 18 : 39}
              fill={key.black ? "white" : INK}
              textAnchor="middle"
              className="key-count"
            >
              {key.midi - rootMidi}
            </text>
          )}
        {isRoot && (
          <circle
            cx={x - (isUpper ? 5 : 0)}
            cy={y}
            r="4.4"
            fill={INK}
            stroke="white"
            strokeWidth="1.3"
          />
        )}
        {isUpper && (
          <circle
            cx={x + (isRoot ? 5 : 0)}
            cy={y}
            r="4.4"
            fill={color}
            stroke="white"
            strokeWidth="1.3"
          />
        )}
      </g>
    );
  };
  return (
    <div className="keyboard-wrap">
      <svg
        className="keyboard"
        viewBox="0 0 324 84"
        role="img"
        aria-label={`건반. 아래 음 ${noteLabel(root, "cde")}${upper ? `, 위 음 ${noteLabel(upper, "cde")}` : ""}`}
      >
        {whites.map((key, index) => (
          <rect
            key={key.midi}
            x={index * width + 0.5}
            y=".75"
            width={width - 1}
            height="81"
            rx="3"
            fill={key.midi === upperMidi ? "#F0F4FA" : "white"}
            stroke={INK}
            strokeWidth="1.3"
          />
        ))}
        {keys
          .filter((k) => k.black)
          .map((key) => (
            <rect
              key={key.midi}
              x={xOf(key) - 10.5}
              y="0"
              width="21"
              height="53"
              rx="3"
              fill={INK}
            />
          ))}
        {keys.map(dots)}
      </svg>
      <div className="keyboard-legend">
        <span>
          <i style={{ background: INK }} />
          아래 음
        </span>
        <span>
          <i style={{ background: color }} />위 음
        </span>
        {count && <span>반음씩 세어요</span>}
      </div>
    </div>
  );
}

export function LineButtons({
  selected,
  onSelect,
  disabled = false,
}: {
  selected?: number;
  onSelect: (line: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="line-buttons" aria-label="노선 선택">
      {COLORS.slice(0, 8).map((color, i) => (
        <button
          className={`line-button ${selected === i + 1 ? "selected" : ""}`}
          key={i}
          aria-label={`${i + 1}도선`}
          aria-pressed={selected === i + 1}
          disabled={disabled}
          onClick={() => onSelect(i + 1)}
          style={
            {
              "--line": color.line,
              "--edge": color.edge,
              "--tint": color.tint,
            } as CSSProperties
          }
        >
          <span className="line-medallion">
            <b>{i + 1}</b>
          </span>
          <span>{i + 1}도선</span>
        </button>
      ))}
    </div>
  );
}

export function Track({
  line,
  selected,
  onSelect,
  hidden = false,
  hideCounts = false,
  source,
}: {
  line: number;
  selected: string;
  onSelect?: (id: string) => void;
  hidden?: boolean;
  hideCounts?: boolean;
  source?: string;
}) {
  const stations = stationsOf(line);
  const color = COLORS[(line - 1) % 8];
  const index = stations.findIndex((s) => s.id === selected);
  return (
    <div
      className="track-wrap"
      style={
        {
          "--line": color.line,
          "--edge": color.edge,
          "--tint": color.tint,
        } as CSSProperties
      }
    >
      <div className="track-title">
        <span className="small-line-number">{line}</span>
        <strong>{line}도선</strong>
        <span className="muted">노선은 그대로, 반음씩 이동해요</span>
      </div>
      <div className="track-rail">
        <div
          className="track-line"
          style={{
            left: `${50 / stations.length}%`,
            right: `${50 / stations.length}%`,
          }}
        />
        <div className="track-stations">
          {stations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect?.(s.id)}
              disabled={!onSelect}
              aria-pressed={selected === s.id}
              aria-label={`${hidden && s.id !== source ? "가려진 역" : stationName(s)}${!hideCounts ? `, ${s.semitones}반음` : ""}`}
              className={`track-stop ${s.id === selected ? "selected" : ""} ${s.id === source ? "source" : ""}`}
            >
              <span className="stop-label">
                <b>{hidden && s.id !== source ? "?" : stationName(s)}</b>
                {!hideCounts && <small>{s.semitones}반음</small>}
              </span>
              <span className="stop-circle" />
            </button>
          ))}
        </div>
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="track-train"
            style={{ left: `${((index + 0.5) / stations.length) * 100}%` }}
          >
            <TrainIcon size={29} />
          </span>
        )}
      </div>
      <div className="track-directions">
        <span>← 좁아짐</span>
        <span>넓어짐 →</span>
      </div>
    </div>
  );
}

export function StampBadge({
  label,
  count,
  color = INK,
}: {
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <div
      className={`stamp-badge stamp-${Math.min(2, count)}`}
      style={{ "--stamp": color } as CSSProperties}
      aria-label={`${label}, 스탬프 ${count >= 2 ? "완성" : count === 1 ? "반쪽" : "없음"}`}
    >
      <span className="stamp-circle">
        <span>{count >= 2 ? "✓" : count === 1 ? "½" : "·"}</span>
      </span>
      <b>{label}</b>
    </div>
  );
}
