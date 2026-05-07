# Netlify credit 절감 전략

적용일: 2026-05-07

## 적용한 절감책

- 자동 폴링을 사용하지 않는다. Netlify 모드는 앱 진입, 브라우저 새로고침, 저장/선택/로그인 같은 명시적 액션에서만 `/api/agenda`를 호출한다.
- 인벤토리 변경은 로컬 드래프트와 `sessionStorage`에만 머무른다. 서버 저장은 `일괄 저장` 버튼을 눌렀을 때 1회 요청으로 처리한다.
- 프론트엔드에서 동시에 같은 GET/POST가 중복 실행되지 않도록 in-flight 요청을 재사용하거나 무시한다.
- Netlify Function은 `GET`/`POST`만 받도록 제한하고, 알 수 없는 액션이나 `reset` 같은 경우에는 불필요한 Blob 읽기를 하지 않는다.
- 저장된 상태가 아직 없을 때 단순 조회만으로 초기 상태를 Blob에 쓰지 않는다. 첫 실제 변경 요청에서만 저장한다.
- 익명 GET 응답은 짧게 CDN 캐시한다. 좌석 비밀번호나 개인 인벤토리 같은 민감한 정보는 포함하지 않는 응답만 대상으로 하며, 인증된 응답과 모든 POST 응답은 `no-store`로 둔다.
- Vite의 fingerprinted 정적 자산(`/assets/*`)은 장기 immutable 캐시 헤더를 둔다.
- `npm run deploy`는 preview deploy로 바꾸고, production 배포는 `npm run deploy:prod`로 분리한다.
- production에서는 `LOGIN_CODE` 환경 변수가 없으면 reset을 허용하지 않는다. 하드코딩된 기본 reset 코드는 로컬/비production 개발용으로만 쓴다.
- `.netlify`, `dist`, `node_modules`, `.env*`는 커밋하지 않는다.

## 의도적으로 하지 않은 것

- 인증된 게임 상태 응답은 CDN 캐시하지 않는다. 본인 아젠다와 개인 보유물이 포함되기 때문이다.
- Blob store의 strong consistency는 유지한다. 5명이 번갈아 좌석을 잡고 저장하는 앱이라, 저장 직후 다른 사용자가 보는 상태가 너무 늦게 반영되는 쪽이 더 위험하다.
- Netlify 모드에서는 공유 보드판 자동 동기화를 구현하지 않는다. Docker 모드의 SSE 동기화는 Netlify Function 크레딧에 영향을 주지 않는다.
