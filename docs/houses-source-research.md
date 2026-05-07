# King's Dilemma 가문/스프레드시트 출처 조사

조사일: 2026-05-07

## 결론

- 공유 Google 스프레드시트는 커뮤니티 원격 플레이 보조 시트이며, 공식 가문 DB나 규칙 기준값 출처가 아니다.
- 시트는 전체 12개 가문 중 5개 가문(Solad, Olwyn, Allwed, Dualak, Tiryll)의 캠페인 상태를 담고 있다.
- 가문 번호와 내러티브 목표는 현재 앱의 12가문 카탈로그 중 위 5개와 교차검증할 수 있다.
- Power, Money, Prestige, Crave가 각 가문 탭에 따로 기록되어 있어, 개인 보유물과 공용 보드 상태를 분리한다는 기존 모델링 판단을 강화한다.
- 업적 조건과 해금 효과는 일부 확인되지만, 시트가 팬 제작/플레이 기록 성격이고 스포일러가 섞여 있으므로 앱에 원문 전체를 넣지 않는다.

## 확인한 출처

| 구분 | 출처 | 사용 방식 |
|---|---|---|
| official product | https://horribleguild.com/us/product/the-kings-dilemma/ | 제품/구성/룰북 링크 확인 |
| rulebook | 공식 제품 페이지의 `Rulebook EN` 리소스 | House screen 구조와 기본 세팅 판단의 권위 출처 |
| community sample | https://docs.google.com/spreadsheets/u/0/d/1N7YeywdMHb2qyXoDi32OPU9DIrBbwsk8EGpdpioir6g/htmlview#gid=405315857 | 비권위 원격 플레이 예시, 구조 확인용 |
| community summary | https://gist.github.com/stolksdorf/b22dff2bcd63f01dfd4695b4d4ebed41 | 비권위 가문 요약, 12가문 공개 필드 보조 확인용 |
| community TTS note | https://steamcommunity.com/sharedfiles/filedetails/?id=2012492468 | Olwyn 가문 화면 오탈자 가능성 보조 확인용 |

## 스프레드시트 탭 구조

| 탭 | gid | 확인 내용 | 앱 반영 판단 |
|---|---:|---|---|
| Game Rules | 405315857 | 게임 시작/진행 단계 체크리스트 | 규칙 요약 참고용 |
| Chronicle | 0 | 장기 이벤트 기록 예시 | 실제 데이터로 사용하지 않음 |
| Resources | 1063058098 | 1-17 트랙 형태의 공용 자원 보드 | 공용 자원은 앱 입력 대상에서 제외 |
| Voting | 1830564112 | 투표 상태와 선택지/해결 절차 | UI 용어 검증 참고용 |
| Secret Agendas | 1267756321 | 6개 비밀 의제 점수표 | 의제명/점수 구조 참고용, 원문 복제 금지 |
| End Game | 1731343197 | 게임별 점수 기록 | 점수표 구조 참고용 |
| Solad | 572460631 | 가문 화면/개인 상태 | 5개 가문 교차검증 |
| Olwyn | 1519223792 | 가문 화면/개인 상태 | 5개 가문 교차검증 |
| Allwed | 131236495 | 가문 화면/개인 상태 | 5개 가문 교차검증 |
| Dualak | 1288615802 | 가문 화면/개인 상태 | 5개 가문 교차검증 |
| Tiryll | 548570261 | 가문 화면/개인 상태 | 5개 가문 교차검증 |
| (SPOILERS) Battle with Muhir | 615802173 | 특정 스토리 전투용 탭 | 스포일러 탭이므로 앱/문서 데이터로 사용하지 않음 |

## 가문 도전과제 확인 결과

룰북 기준으로 House screen에는 여러 achievement가 있고, 맨 위의 achievement는 특정 스토리 이벤트로 열리는 Narrative Achievement다. 현재 앱의 `가문 도전과제` 필드는 전체 업적 조건표가 아니라 이 Narrative Achievement, 즉 가문별 장기 서사 목표에 가깝다.

공개 웹에서 확인 가능한 전체 12가문 데이터는 가문명, 번호, 성향, 서사 목표 수준이다. 각 가문의 세부 achievement 조건/해금 효과 전체를 담은 공식 DB는 찾지 못했다. 다만 사용자가 공유한 공개 Google 스프레드시트의 5개 가문 탭에서는 우측 achievement 영역의 조건/효과 텍스트를 CSV로 확인할 수 있었다.

### 전체 12가문 서사 목표

아래 표는 공개 Gist와 현재 코드 카탈로그를 대조한 비권위 요약이다. Gist에는 오탈자가 있으므로 Solad의 `Perspective`, Gamam의 `Immortality`처럼 명백한 철자는 현재 앱 표기를 우선한다.

| 번호 | 가문 | Narrative Achievement / Goal | 현재 한국어 표기 | 조건 상세 확인 |
|---:|---|---|---|---|
| 1 | Dukes of Blodyn | Find Harmony Between Knowledge and Spirit | 지식과 정신 사이의 조화 찾기 | 미확인 |
| 2 | Dukes of Solad | Find a New Perspective on Reality | 현실을 바라보는 새로운 관점 찾기 | 스프레드시트 확인 |
| 3 | Marquises of Tork | Free the World from Evil | 세상에서 악을 몰아내기 | 미확인 |
| 4 | Dukes of Coden | Unite with Another Kingdom | 다른 왕국과의 연합 성사 | 미확인 |
| 5 | Dukes of Olwyn | Assert the Dominion of Knowledge over Spirit | 정신보다 지식의 우위를 확립하기 | 스프레드시트 확인, 오탈자 가능성 있음 |
| 6 | Marquises of Allwed | Foster Social Equality in the Kingdom | 왕국 안의 사회적 평등 촉진 | 스프레드시트 확인 |
| 7 | Dukes of Gamam | Embrace Immortality | 불멸성의 수용 | 미확인 |
| 8 | Marquises of Dualak | Curse the Royal Family | 왕가에 저주 내리기 | 스프레드시트 확인 |
| 9 | Marquises of Tiryll | Subdue the Outcasts | 추방자들을 굴복시키기 | 스프레드시트 확인 |
| 10 | Marquises of Wylio | Find the Way to Create Gold | 금을 만드는 방법 찾기 | 미확인 |
| 11 | Marquises of Crann | Conquer Another Kingdom | 다른 왕국 정복 | 미확인 |
| 12 | Dukes of Natar | Destroy Heretical and Ancient Knowledge | 이단적이고 고대적인 지식 파괴 | 미확인 |

### 스프레드시트에서 조건까지 확인한 5가문

아래 내용은 공개 스프레드시트의 캠페인 진행 예시에서 확인한 요약이다. `x` 체크 표시는 해당 캠페인의 완료 상태이므로 규칙 데이터로 쓰지 않는다. 조건/효과 텍스트도 팬 제작 시트의 전사본이므로, 앱에는 원문 전체를 넣기보다 참고 문서로만 유지한다.

| 가문 | 서사 목표 효과 요약 | 추가 achievement 조건 요약 | 해금 효과 요약 |
|---|---|---|---|
| Solad | 즉시 위신 +1 | 게임 종료 시 Morale 최저, Knowledge 최고, Open Agenda로 2VP 이상 | Chronicle 서명 시 코인 보상, 즉시 위신 보상, 즉시 위신/권력 보상 |
| Olwyn | 위신 +1 | Open Agenda로 2VP 이상, 게임 종료 시 Influence 최고, 코인 18개 이상 | Open Agenda 조정, 시작 권력/코인 보너스, 위신 보상 |
| Allwed | 위신 +1 및 갈망 +1 | 게임 종료 시 Influence 최저, Stability 중앙, 코인 18개 이상 | 다른 플레이어에게 코인 수급, 투표 후 남는 권력 회수, 시작 코인/권력 보너스 |
| Dualak | 갈망 +1 | 게임 종료 시 Stability 하단 절반, Influence 최저, Wealth 최저 | 패배 투표 시 권력 보상, 갈망 보상, 시작 코인 보너스 |
| Tiryll | 즉시 갈망 +2 | 게임 종료 시 Welfare 최저, Wealth 최저, Knowledge 최저 | 자원 최저 도달 시 코인/권력 보상, 갈망 보상, 시작 코인/권력 보너스 |

Olwyn의 `Influence 최고` 조건은 주의가 필요하다. 공개 스프레드시트에는 Influence로 보이지만, Steam Workshop의 TTS 가문 타일 코멘트에서는 BGG의 디자이너 답변을 근거로 Olwyn 화면에 Influence/Welfare 아이콘 오탈자가 있었다고 언급한다. 원 BGG 글을 직접 열람하지 못했으므로 이 문서에서는 "오탈자 가능성 있음"으로만 남긴다.

### 업적 목표 수치와 체크 기준

룰북 p.13은 각 achievement가 조건을 충족할 때마다 해당 achievement의 칸 1개를 표시하고, 모든 칸이 표시되면 능력이 해금된다고 설명한다. p.34의 종료 절차도 게임 종료 시 House screen의 achievement 조건을 확인하고, Resource 위치를 참조하는 조건은 동률이면 같은 위치를 공유한다고 정리한다. House Alignment는 매 게임 사용한 Secret Agenda에 해당하는 achievement 칸을 1개 표시한다.

룰북에 실린 Dukes of Gamam 예시 화면으로 확인되는 수치형 조건은 아래와 같다. 이 예시는 공식 룰북에 있는 화면 예시일 뿐 전체 12가문 조건표가 아니다.

| 가문 | 조건 유형 | 목표 수치/상태 | 해금 효과 요약 |
|---|---|---|---|
| Gamam | Narrative Achievement | 특정 스토리 이벤트로 `Embrace Immortality` 달성 | 즉시 위신 +1, 갈망 +1 |
| Gamam | Open Agenda 성과 | 게임 종료 시 Open Agenda로 2점 이상 | 투표에서 권력 5개 초과 사용 후 승리하면 권력 +2 |
| Gamam | Stability 위치 | 게임 종료 시 Stability가 트랙 상단 절반 | 즉시 코인 +3 |
| Gamam | 코인 보유량 | 게임 종료 시 코인 18개 이상 | 즉시 코인 +3 |

공개 Google 스프레드시트에서 확인한 5개 가문의 목표 수치/상태는 아래와 같다. `즉시`, `시작`, `한 게임에 한 번` 같은 문구는 해금 효과의 적용 타이밍이며, 조건 자체가 아닌 경우가 있다.

| 가문 | Narrative Achievement 보상 | 확인된 목표 수치/상태 | 확인된 해금 효과의 수치 |
|---|---|---|---|
| Solad | 위신 +1 | Morale 최저, Knowledge 최고, Open Agenda 2VP 이상 | Chronicle 서명 시 코인 +2, 즉시 위신 +3, 즉시 위신 +1 및 권력 +2 |
| Olwyn | 위신 +1 | Open Agenda 2점 이상, Influence 최고(오탈자 가능), 코인 18개 이상 | 시작 권력 +1 및 코인 +2, 위신 +1, 시작 권력 +1 및 코인 +1 |
| Allwed | 위신 +1 및 갈망 +1 | Influence 최저, Stability 중앙, 코인 18개 이상 | 각 다른 플레이어에게 코인 1개 수급, 시작 코인 +1 및 권력 +1, 갈망 +1 |
| Dualak | 갈망 +1 | Stability 하단 절반, Influence 최저, Wealth 최저 | 패배 투표 시 권력 +2, 시작 코인 +2, 시작 코인 +1, 갈망 +2 |
| Tiryll | 갈망 +2 | Welfare 최저, Wealth 최저, Knowledge 최저 | 자원 최저 도달 시 코인 +4 및 권력 +4, 갈망 +1 및 시작 코인 +2, 갈망 +1 및 시작 권력 +2 |

체크 칸의 총 개수는 공식 룰북 예시 화면에서는 보이지만, 공개 스프레드시트 값을 CSV/XLSX로 추출하면 빈 체크칸과 병합 셀 구조가 안정적인 데이터로 나오지 않는다. 따라서 이 문서에서는 "몇 번 충족해야 해금되는가"까지는 전체 데이터로 확정하지 않고, 확인 가능한 목표 수치/상태와 보상 수치만 기록한다.

### House Alignment achievement 보상

아래 보상은 스프레드시트의 House Alignment 영역에서 확인한 값이다. 빨간/검은 체크 여부는 해당 캠페인의 진행 상태라서 제외하고, 각 성향 줄의 보상 수치만 요약한다.

| 가문 | Extremist | Opulent | Moderate | Rebel | Opportunist | Greedy |
|---|---|---|---|---|---|---|
| Solad | 위신 +3 | 위신 +1 | 위신 +1 | 갈망 +2 | 갈망 +1 | 갈망 +1 |
| Olwyn | 위신 +1 | 위신 +3 | 위신 +2 | 갈망 +1 | 갈망 +1 | 갈망 +1 |
| Allwed | 위신 +1 | 위신 +1 | 위신 +2 | 갈망 +1 | 갈망 +3 | 갈망 +1 |
| Dualak | 위신 +1 | 위신 +1 | 위신 +1 | 갈망 +3 | 갈망 +1 | 갈망 +2 |
| Tiryll | 위신 +1 | 위신 +1 | 위신 +1 | 갈망 +2 | 갈망 +3 | 갈망 +1 |

## UI 명명 판단

현재 `가문 도전과제` 라벨은 전체 House Achievements를 뜻하는 것처럼 보일 수 있다. 앱에서 보여주는 값은 각 가문의 Narrative Achievement 제목이므로, UI 라벨은 `서사 목표` 또는 `가문 목표`가 더 정확하다. 세부 조건/효과표는 5개 가문만 공개 시트로 확인되어 전체 12가문 데이터가 불완전하므로 아직 UI 데이터로 승격하지 않는다.

## 가문 탭에서 확인한 데이터

아래 값은 해당 공개 시트의 비권위 캠페인 샘플 상태이며, 새 게임 기본값이나 규칙 기준값으로 쓰면 안 된다.

| 가문 | 가문 번호 | 내러티브 목표 요약 | 비권위 캠페인 샘플 상태 |
|---|---:|---|---|
| Dukes of Solad | 2 | 현실을 바라보는 새로운 관점 찾기 | Prestige 12, Crave 3, Power 1, Money 16 |
| Dukes of Olwyn | 5 | 정신보다 지식의 우위를 확립하기 | Prestige 10, Crave 2, Power 6, Money 14 |
| Marquises of Allwed | 6 | 왕국 안의 사회적 평등 촉진 | Prestige 11, Crave 5, Power 0, Money 12 |
| Marquises of Dualak | 8 | 왕가에 저주 내리기 | Prestige 14, Crave 2, Power 12, Money 18 |
| Marquises of Tiryll | 9 | 추방자들을 굴복시키기 | Prestige 1, Crave 11, Power 4, Money 12 |

## 코드 카탈로그와 교차검증

현재 `shared/houses.mjs`의 12가문 카탈로그 중 스프레드시트에 있는 5개 가문은 가문 번호가 일치한다.

| id | 스프레드시트 번호 | 코드 카탈로그 번호 | 판정 |
|---|---:|---:|---|
| solad | 2 | 2 | 일치 |
| olwyn | 5 | 5 | 일치 |
| allwed | 6 | 6 | 일치 |
| dualak | 8 | 8 | 일치 |
| tiryll | 9 | 9 | 일치 |

## 구현 결정

- 이 스프레드시트는 5개 가문만 포함하므로 전체 12가문 카탈로그의 단독 출처로 사용하지 않는다.
- 시트의 현재 Power/Money/Prestige/Crave 값은 특정 캠페인 진행 상태라서 기본값, 마이그레이션 값, 규칙 근거로 쓰지 않는다.
- 이 시트는 개인 가문 탭과 공용 보드 탭이 분리된 예시로만 사용한다.
- 앱 기본값은 계속 첫 세팅 기준인 Power 8, Money 10, Prestige 0, Crave 0으로 둔다.
- 공용 자원 트랙은 공유 스프레드시트처럼 별도 공용 보드 상태로 다루고, 앱의 개인 인벤토리 저장 대상에는 넣지 않는다.
- 업적 조건/해금 효과는 공개 시트에서 일부 보이지만, 스포일러와 저작권 리스크가 있으므로 앱에는 검증된 요약 필드(번호, 칭호, 모토, 문장 설명, 성향, 내러티브 목표, 짧은 배경 요약)만 유지한다.

## 남은 리스크

- 스프레드시트에는 오탈자가 있고 공식 배포 데이터가 아니므로 권위 출처로 볼 수 없다.
- 일부 탭은 실제 캠페인 스포일러를 포함한다. 특히 spoiler 표시가 있는 탭은 조사 범위에서 제외해야 한다.
- 전체 12가문 중 7개는 이 스프레드시트로 검증되지 않는다. 해당 데이터는 공식 룰북 예시, 공개 Gist, 보유 게임 구성품 대조로만 보강할 수 있다.
