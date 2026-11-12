# 음정 지하철

도수는 노선으로, 성질은 역으로 배우는 한국어 모바일 음악 이론 게임입니다. Next.js App Router · TypeScript strict · Tailwind CSS · Zustand · Vitest를 사용하며 서버와 로그인 없이 정적 파일로 작동합니다. 기록은 브라우저 localStorage에만 저장됩니다.

## 실행

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run format:check
npm run sim
npm run build
```

빌드 결과는 `out/`입니다. Vercel에서는 Next.js 설정으로 빌드하거나 `npm run build` / 출력 디렉터리 `out`을 사용합니다. 로컬 개발 명령은 Next.js 인수와 미리보기 도구의 인수를 함께 지원합니다.

## 구현 범위

- 1~8도선 27개 역, 기준음 11종, 악보·건반·Web Audio 동기화
- 노선 찾기 / 악보 읽기 / 역 만들기 / 한 칸 이동 / 귀로 찾기 / 환승
- 학습 구간 5개, 스탬프 73개, 구간 해금, 최대 2개 복습 문제
- 서로 다른 기준음의 스탬프, 귀 퀴즈 보기의 단계별 개방
- 자유 운행, 같은 소리의 다른 음정으로 환승
- 완주 뒤 급행 모드, 시간 초과 처리와 최고 기록
- 수업용 설정, 3단계 첫 안내, 삽화가 포함된 이용 안내
- 판·시도·선택·결과 복구, 최근 20판, 저장 불가 안내

9~13도는 계산 엔진만 지원합니다. 확장 노선 UI와 설치·오프라인은 원문에서 2차·선택 범위이므로 이번 버전에 포함하지 않았습니다.

## 원본과 검증

`docs/spec.md`와 `docs/prompts.md`는 원본 그대로 보존했습니다. 기획서는 v1.0이며 프롬프트가 전제한 v1.1 부록 F·G, 참조 엔진, golden JSON 및 golden 시험은 제공되지 않았습니다. 따라서 자체 구현을 독립적으로 시험했으며 원본 57개 시험이나 18줄 일치 검증을 통과했다고 주장하지 않습니다.

자세한 검증과 남은 확인 사항은 `docs/verification.md`를 참고하세요. 악보는 Bravura의 실제 SVG 윤곽선을 사용하며 출처와 OFL 라이선스를 보존했습니다. 글꼴은 로컬 Noto Sans KR입니다.

## 구조

- `src/game/`: 브라우저와 독립적인 계산, 출제, 채점 안내, 스탬프 규칙
- `src/store/`: 저장과 판 진행
- `src/audio/`: 음정 재생과 짧은 효과음
- `src/components/`: 악보·건반·노선·기차·스탬프
- `src/app/`: 홈·플레이·자유 운행·결과·설정·안내

저장 키는 `interval-subway-v1`입니다. 다른 기기와 기록을 공유하지 않습니다. 원본 게임: https://interval-subway.augustrushkim.chatgpt.site

GitHub 소스: https://github.com/kimyounggaur/interval_subway_game

Sites 원본 커밋 `bb34d1e7b581c0b190a1519bdbdf722b22579662`에서 가져왔으며, 호스팅 계정별 설정과 인증 정보는 제외했습니다. Vercel 배포는 별도입니다.
