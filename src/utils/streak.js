// 일기 날짜 목록에서 이번 달 기록 일수와 연속 기록 일수를 계산하는 순수 함수
import { addDays, format, parseISO, subDays } from 'date-fns';

const toKey = (date) => format(date, 'yyyy-MM-dd');

/**
 * 이번 달에 일기를 쓴 날 수. 오늘 이후 날짜는 세지 않는다.
 * @param {string[]} dates - 'yyyy-MM-dd' 날짜 목록
 * @param {Date} [today]
 */
export function countInMonth(dates, today = new Date()) {
  const prefix = format(today, 'yyyy-MM');
  const todayKey = toKey(today);
  return new Set(dates.filter(d => d.startsWith(prefix) && d <= todayKey)).size;
}

/**
 * 연속 기록 일수. 오늘 일기가 있으면 오늘부터, 없으면 어제부터 거슬러 올라가며 이어진 날을 센다.
 * 오늘 아직 쓰지 않았더라도 어제까지 이어졌다면 연속은 끊기지 않은 것으로 본다.
 * @param {string[]} dates - 'yyyy-MM-dd' 날짜 목록
 * @param {Date} [today]
 */
export function calcStreak(dates, today = new Date()) {
  const set = new Set(dates);
  let cursor = set.has(toKey(today)) ? today : subDays(today, 1);
  let streak = 0;
  while (set.has(toKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/**
 * 가장 길게 이어진 기록 일수.
 * @param {string[]} dates - 'yyyy-MM-dd' 날짜 목록 (순서·중복 무관)
 */
export function calcLongestStreak(dates) {
  const set = new Set(dates);
  let longest = 0;
  for (const date of set) {
    // 앞날이 없는 날만 연속의 시작이다. 시작에서만 세어 전체를 한 번씩만 지난다
    if (set.has(toKey(subDays(parseISO(date), 1)))) continue;
    let length = 0;
    let cursor = parseISO(date);
    while (set.has(toKey(cursor))) {
      length += 1;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}
