/**
 * 일반 텍스트 형식의 일기 파일을 파싱하여 DiaryDB 형식으로 변환합니다.
 *
 * 예상되는 텍스트 형식:
 * YYYY-MM-DD
 * 제목 (선택 사항)
 * 내용...
 *
 * --- (구분선, 다음 일기 시작)
 *
 * YYYY.MM.DD
 * 내용...
 *
 * @param {string} textContent - TXT 파일의 전체 내용
 * @param {string} userId - 현재 사용자 ID
 * @returns {Array<Object>} DiaryDB의 entries 테이블 형식에 맞는 객체 배열
 */
export function parseTxtDiary(textContent, userId) {
  const lines = textContent.split('\n');
  const entriesMap = new Map();
  let currentEntry = null;

  // YYYY-MM-DD, YYYY.MM.DD, YYYY MM DD 형식과 뒤에 오는 요일(선택)까지 인식
  const dateRegex = /^(\d{4})[-.\s](\d{1,2})[-.\s](\d{1,2})[.\s]*([일월화수목금토]요일?)?/;

  for (const line of lines) {
    const dateMatch = line.trim().match(dateRegex);

    if (dateMatch) {
      // 새로운 날짜가 시작되면 새 일기 객체 생성
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      currentEntry = {
        userId,
        date,
        title: '',
        content: '',
        tags: [],
        createdAt: new Date(date).toISOString(),
        updatedAt: new Date(date).toISOString(),
      };
      entriesMap.set(date, currentEntry);
    } else if (currentEntry) {
      // 현재 진행 중인 일기가 있으면 내용을 추가
      currentEntry.content += (currentEntry.content ? '\n' : '') + line;
    }
  }

  // Map의 값들을 배열로 변환하고, content의 앞뒤 공백 제거
  const finalEntries = Array.from(entriesMap.values()).map(entry => {
    // 내용의 앞뒤 공백을 먼저 제거
    entry.content = entry.content.trim();

    // 제목이 비어있고, 내용의 첫 줄이 제목으로 간주될 만한 경우 (짧고, 마침표로 끝나지 않음)
    // 제목으로 이동시키는 로직을 파싱 마지막 단계로 옮겨 정확도 향상
    const contentLines = entry.content.trim().split('\n');
    if (!entry.title && contentLines.length > 1 && contentLines[0].length < 50 && !contentLines[0].endsWith('.')) {
      entry.title = contentLines[0];
      entry.content = contentLines.slice(1).join('\n').trim();
    } else {
      entry.content = entry.content.trim();
    }
    return entry;
  });

  return finalEntries;
}