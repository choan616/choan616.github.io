// 연속 일수·이번 달 기록 일수 경계 자체 점검. 실행: node scripts/check-streak.mjs
import assert from 'node:assert/strict';
import { calcStreak, countInMonth } from '../src/utils/streak.js';

const d = (y, m, day) => new Date(y, m - 1, day, 12);
const cases = [];
const check = (name, fn) => cases.push([name, fn]);

check('기록이 없으면 연속 0, 이번 달 0', () => {
  assert.equal(calcStreak([], d(2026, 10, 29)), 0);
  assert.equal(countInMonth([], d(2026, 10, 29)), 0);
});

check('오늘만 있으면 연속 1', () => {
  assert.equal(calcStreak(['2026-10-29'], d(2026, 10, 29)), 1);
});

check('오늘 포함해 이어지면 오늘부터 센다', () => {
  assert.equal(calcStreak(['2026-10-29', '2026-10-28', '2026-10-27'], d(2026, 10, 29)), 3);
});

check('오늘은 안 썼어도 어제까지 이어졌으면 어제부터 센다', () => {
  assert.equal(calcStreak(['2026-10-28', '2026-10-27'], d(2026, 10, 29)), 2);
});

check('어제도 오늘도 없으면 연속은 끊겨 0', () => {
  assert.equal(calcStreak(['2026-10-27', '2026-10-26'], d(2026, 10, 29)), 0);
});

check('중간에 빈 날이 있으면 거기서 멈춘다', () => {
  assert.equal(calcStreak(['2026-10-29', '2026-10-28', '2026-10-26'], d(2026, 10, 29)), 2);
});

check('달 경계를 넘어 이어진다 (연속 4, 이번 달 2)', () => {
  const dates = ['2026-11-02', '2026-11-01', '2026-10-31', '2026-10-30'];
  assert.equal(calcStreak(dates, d(2026, 11, 2)), 4);
  assert.equal(countInMonth(dates, d(2026, 11, 2)), 2);
});

check('해 경계를 넘어 이어진다', () => {
  assert.equal(calcStreak(['2027-01-01', '2026-12-31', '2026-12-30'], d(2027, 1, 1)), 3);
});

check('빈 달: 지난달 기록만 있으면 이번 달 0, 어제가 아니면 연속 0', () => {
  const dates = ['2026-09-10', '2026-09-11', '2026-09-30'];
  assert.equal(countInMonth(dates, d(2026, 10, 29)), 0);
  assert.equal(calcStreak(dates, d(2026, 10, 29)), 0);
});

check('달의 첫날에 어제(지난달 말일)만 있어도 연속 1, 이번 달은 0', () => {
  assert.equal(calcStreak(['2026-09-30'], d(2026, 10, 1)), 1);
  assert.equal(countInMonth(['2026-09-30'], d(2026, 10, 1)), 0);
});

check('오늘 이후 날짜는 세지 않는다', () => {
  assert.equal(countInMonth(['2026-10-29', '2026-10-30', '2026-10-31'], d(2026, 10, 29)), 1);
  assert.equal(calcStreak(['2026-10-30', '2026-10-31'], d(2026, 10, 29)), 0);
});

check('같은 날짜가 중복돼도 한 번만 센다', () => {
  assert.equal(countInMonth(['2026-10-05', '2026-10-05', '2026-10-06'], d(2026, 10, 29)), 2);
  assert.equal(calcStreak(['2026-10-29', '2026-10-29', '2026-10-28'], d(2026, 10, 29)), 2);
});

let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('ok   ', name); } catch (e) { failed += 1; console.log('FAIL ', name, '\n     ', e.message); }
}
console.log(`\n${cases.length - failed}/${cases.length} 통과`);
process.exit(failed ? 1 : 0);
