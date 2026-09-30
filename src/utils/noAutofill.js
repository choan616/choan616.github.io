// iOS Safari 의 '자동 완성 연락처' 버튼을 막기 위해 입력칸을 읽기 전용으로 두었다가 터치할 때 푸는 props

/**
 * iOS Safari 는 입력칸·form 의 autocomplete="off" 를 무시하고 키보드 위에 '자동 완성 연락처' 버튼을
 * 띄운다. 포커스되는 순간 읽기 전용이면 띄우지 않으므로, 터치(또는 마우스·키보드 포커스)로
 * 들어올 때 풀고 벗어나면 다시 잠근다. (2026-09-30 iPhone 실기기 실측)
 *
 * readOnly 는 처음 렌더 때만 DOM 에 반영되고 값이 바뀌지 않으므로 React 가 다시 덮어쓰지 않는다.
 */
const unlock = (e) => { e.currentTarget.readOnly = false; };

export const noAutofillProps = {
  readOnly: true,
  onTouchStart: unlock,
  onMouseDown: unlock,
  onFocus: unlock,
  onBlur: (e) => { e.currentTarget.readOnly = true; },
};
