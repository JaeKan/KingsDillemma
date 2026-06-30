import assert from "node:assert/strict";
import { AGENDAS } from "../netlify/functions/_shared/agenda-state.mts";

const expectedTables = {
  opportunist: {
    resourceScoring: [4, 7, 10, 14, 15],
    coinRanking: [6, 4, 2],
  },
  greedy: {
    resourceScoring: [4, 7, 11, 7, 4, 0],
    coinRanking: [8, 6, 4],
  },
  moderate: {
    resourceScoring: [6, 7, 10, 13, 14],
    coinRanking: [5, 3, 1],
  },
  extremist: {
    resourceScoring: [4, 7, 10, 14, 15],
    coinRanking: [4, 2, 1],
  },
  opulent: {
    resourceScoring: [4, 7, 10, 14, 15],
    coinRanking: [6, 4, 2],
  },
  rebel: {
    resourceScoring: [9, 13, 17, 19, 20],
    coinRanking: [3, 2, 1],
  },
} as const;

for (const [agendaId, expected] of Object.entries(expectedTables)) {
  const agenda = AGENDAS.find((candidate) => candidate.id === agendaId);

  assert.ok(agenda, `${agendaId} agenda should exist`);
  assert.deepEqual(
    agenda.resourceScoring.map((score) => score.vp),
    expected.resourceScoring,
    `${agenda.name} 자원 목표 점수가 사진의 표와 일치해야 합니다.`,
  );
  assert.deepEqual(
    agenda.coinRanking.map((score) => score.vp),
    expected.coinRanking,
    `${agenda.name} 순위 점수가 사진의 표와 일치해야 합니다.`,
  );
}

console.log("secret-agenda-scoring tests passed");
