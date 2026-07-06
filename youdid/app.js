// ----------------------------------------------------
// YouDid - Core Application Script
// ----------------------------------------------------

// 1. 초기 기본 프리셋 데이터 정의
const DEFAULT_PRESETS = [
  {
    id: "preset-out",
    title: "외출할 때",
    icon: "🚪",
    items: [
      { id: "item-out-1", text: "가스 밸브가 잠겼는지 확인했나요?" },
      { id: "item-out-2", text: "에어컨과 방 전등을 모두 껐나요?" },
      { id: "item-out-3", text: "지갑, 스마트폰, 집 열쇠를 챙겼나요?" },
      { id: "item-out-4", text: "창문들이 빗장까지 잘 닫혔나요?" },
      { id: "item-out-5", text: "보일러 외출 모드 또는 전원을 확인했나요?" }
    ]
  },
  {
    id: "preset-sleep",
    title: "잠들기 전에",
    icon: "🛌",
    items: [
      { id: "item-sleep-1", text: "현관문 걸쇠가 안전하게 잠겼나요?" },
      { id: "item-sleep-2", text: "주방 가스 및 인덕션이 꺼져 있나요?" },
      { id: "item-sleep-3", text: "스마트폰을 충전기에 연결했나요?" },
      { id: "item-sleep-4", text: "내일 아침에 먹을 약을 챙겨두었나요?" },
      { id: "item-sleep-5", text: "가습기 또는 온열기기 전원을 확인했나요?" }
    ]
  },
  {
    id: "preset-travel",
    title: "먼 길 떠날 때 (여행)",
    icon: "🎒",
    items: [
      { id: "item-travel-1", text: "신분증(주민등록증/여권)을 챙겼나요?" },
      { id: "item-travel-2", text: "비상약과 처방받은 약을 모두 넣었나요?" },
      { id: "item-travel-3", text: "세면도구와 여벌 옷을 잘 챙겼나요?" },
      { id: "item-travel-4", text: "스마트폰 충전선과 보조 배터리를 챙겼나요?" },
      { id: "item-travel-5", text: "집안 가스 및 메인 수도 밸브를 확인했나요?" }
    ]
  }
];

// 2. 어플리케이션 상태 객체
let state = {
  presets: [],
  selectedPresetId: "",
  checkedItems: {}, // { itemId: true/false }
  accessibility: {
    fontSize: "normal", // normal, large, huge
    theme: "dark", // dark, light, high
    ttsEnabled: true
  }
};

// ----------------------------------------------------
// 로컬 스토리지 데이터 동기화
// ----------------------------------------------------
function loadStateFromStorage() {
  const savedPresets = localStorage.getItem("youdid_presets");
  const savedChecked = localStorage.getItem("youdid_checked");
  const savedAccess = localStorage.getItem("youdid_accessibility");
  const savedSelectedId = localStorage.getItem("youdid_selected_preset");

  // 프리셋 로드
  if (savedPresets) {
    state.presets = JSON.parse(savedPresets);
  } else {
    state.presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    savePresetsToStorage();
  }

  // 체크 상태 로드
  if (savedChecked) {
    state.checkedItems = JSON.parse(savedChecked);
  } else {
    state.checkedItems = {};
  }

  // 접근성 설정 로드
  if (savedAccess) {
    state.accessibility = JSON.parse(savedAccess);
  }

  // 선택된 프리셋 로드
  if (savedSelectedId && state.presets.some(p => p.id === savedSelectedId)) {
    state.selectedPresetId = savedSelectedId;
  } else if (state.presets.length > 0) {
    state.selectedPresetId = state.presets[0].id;
  }
}

function savePresetsToStorage() {
  localStorage.setItem("youdid_presets", JSON.stringify(state.presets));
}

function saveCheckedToStorage() {
  localStorage.setItem("youdid_checked", JSON.stringify(state.checkedItems));
}

function saveAccessibilityToStorage() {
  localStorage.setItem("youdid_accessibility", JSON.stringify(state.accessibility));
}

function saveSelectedPresetToStorage() {
  localStorage.setItem("youdid_selected_preset", state.selectedPresetId);
}

// ----------------------------------------------------
// 진동 (Haptic) 피드백
// ----------------------------------------------------
function triggerVibration(pattern) {
  if (window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      console.warn("진동 API 호출 실패:", e);
    }
  }
}

// ----------------------------------------------------
// TTS (Text-to-Speech) 음성 안내 엔진
// ----------------------------------------------------
function speakText(text) {
  if (!state.accessibility.ttsEnabled) return;

  // 이전 재생 중인 음성이 있다면 취소
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR"; // 한국어 설정
    utterance.rate = 0.9; // 조금 천천히 명확하게 읽기
    utterance.pitch = 1.0;
    
    // 한국어 목소리 매칭 탐색
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(voice => voice.lang.includes("ko") || voice.lang.includes("KO"));
    if (koVoice) {
      utterance.voice = koVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

// ----------------------------------------------------
// UI 렌더링 및 상태 반영 로직
// ----------------------------------------------------

// 1. 접근성 스타일 적용
function applyAccessibilityStyles() {
  const body = document.body;
  
  // 글자 크기 적용
  body.classList.remove("font-size-normal", "font-size-large", "font-size-huge");
  body.classList.add(`font-size-${state.accessibility.fontSize}`);
  
  // 버튼 활성화 클래스 조절
  document.querySelectorAll("[id^='btn-size-']").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`btn-size-${state.accessibility.fontSize}`).classList.add("active");

  // 테마 적용
  body.classList.remove("theme-dark", "theme-light", "theme-high");
  body.classList.add(`theme-${state.accessibility.theme}`);
  
  // 테마 버튼 활성화 조절
  document.querySelectorAll("[id^='btn-theme-']").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`btn-theme-${state.accessibility.theme}`).classList.add("active");

  // TTS 토글 동기화
  document.getElementById("chk-tts-enable").checked = state.accessibility.ttsEnabled;
}

// 2. 프리셋 드롭다운 렌더링
function renderPresetOptions() {
  const selectElement = document.getElementById("select-preset");
  const manageSelectElement = document.getElementById("select-item-preset");
  
  selectElement.innerHTML = "";
  manageSelectElement.innerHTML = "";
  
  state.presets.forEach(preset => {
    // 메인 상황 선택기 옵션
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.icon} ${preset.title}`;
    if (preset.id === state.selectedPresetId) {
      option.selected = true;
    }
    selectElement.appendChild(option);

    // 관리모드 항목 추가용 프리셋 옵션
    const manageOption = document.createElement("option");
    manageOption.value = preset.id;
    manageOption.textContent = `${preset.icon} ${preset.title}`;
    manageSelectElement.appendChild(manageOption);
  });
}

// 3. 점검 목록(체크리스트 카드) 렌더링
function renderChecklist() {
  const itemsContainer = document.getElementById("checklist-items");
  itemsContainer.innerHTML = "";

  const currentPreset = state.presets.find(p => p.id === state.selectedPresetId);
  if (!currentPreset) return;

  const items = currentPreset.items;

  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="checklist-card" style="cursor: default; text-align: center; justify-content: center; border-style: dashed;">
        <span class="card-text" style="opacity: 0.6;">아직 등록된 확인 사항이 없습니다.<br>하단 편집 창에서 추가해보세요!</span>
      </div>
    `;
    updateProgress(0, 0);
    return;
  }

  let checkedCount = 0;

  items.forEach(item => {
    const isChecked = !!state.checkedItems[item.id];
    if (isChecked) checkedCount++;

    // 카드 루트 엘리먼트
    const card = document.createElement("div");
    card.className = `checklist-card ${isChecked ? 'checked' : ''}`;
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", isChecked ? "true" : "false");
    card.id = `card-${item.id}`;

    // 체크박스 원형 아이콘
    const checkbox = document.createElement("div");
    checkbox.className = "card-checkbox";

    // 텍스트 영역
    const contentArea = document.createElement("div");
    contentArea.className = "card-content-area";

    const text = document.createElement("span");
    text.className = "card-text";
    text.textContent = item.text;

    const badge = document.createElement("span");
    badge.className = "card-status-badge";
    badge.textContent = isChecked ? "했어!" : "아직";

    // 구성 조립
    contentArea.appendChild(text);
    contentArea.appendChild(badge);
    
    card.appendChild(checkbox);
    card.appendChild(contentArea);

    // 카드 클릭(토글) 이벤트
    card.addEventListener("click", () => {
      toggleCardCheck(item.id, item.text);
    });

    // 키보드 엔터/스페이스바 대응
    card.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggleCardCheck(item.id, item.text);
      }
    });

    itemsContainer.appendChild(card);
  });

  updateProgress(checkedCount, items.length);
}

// 4. 진척률 표시기 바 업데이트
function updateProgress(checked, total) {
  const badge = document.getElementById("checklist-progress-text");
  const fill = document.getElementById("progress-bar-fill");
  
  badge.textContent = `${checked} / ${total}`;
  
  const percentage = total > 0 ? (checked / total) * 100 : 0;
  fill.style.width = `${percentage}%`;

  // 만약 전체를 다 체크했다면 축하 오버레이 띄우기
  if (total > 0 && checked === total) {
    triggerCelebration();
  }
}

// 5. 완료 축하 오버레이 팝업 트리거
function triggerCelebration() {
  const currentPreset = state.presets.find(p => p.id === state.selectedPresetId);
  const presetTitle = currentPreset ? currentPreset.title : "점검";
  
  const celebrationTitle = document.getElementById("celebration-title");
  celebrationTitle.textContent = `${presetTitle} 완료!`;

  const overlay = document.getElementById("celebration-overlay");
  overlay.classList.add("active");

  // 축하 진동 패턴 (웅장하게)
  triggerVibration([80, 50, 80, 50, 150]);

  speakText(`${presetTitle}에 필요한 모든 준비가 끝났습니다. 이제 걱정 말고 편안히 다녀오세요!`);
}

// 6. 개별 카드 토글 기능
function toggleCardCheck(itemId, itemText) {
  const isChecked = !state.checkedItems[itemId];
  state.checkedItems[itemId] = isChecked;
  saveCheckedToStorage();
  
  // 리렌더링
  renderChecklist();

  // 토글 진동 피드백 (체크: 40ms 단발 / 체크해제: 이중 진동)
  if (isChecked) {
    triggerVibration(40);
    speakText(`${itemText} 확인 완료`);
  } else {
    triggerVibration([20, 40, 20]);
    speakText(`${itemText} 점검 대기 상태`);
  }
}

// 7. 관리모드 - 현재 설정된 리스트 출력 및 삭제 기능
function renderManagementList() {
  const listContainer = document.getElementById("manage-items-list");
  listContainer.innerHTML = "";

  const currentPreset = state.presets.find(p => p.id === state.selectedPresetId);
  if (!currentPreset) return;

  const items = currentPreset.items;

  if (items.length === 0) {
    listContainer.innerHTML = `<p style="padding: 1rem; opacity: 0.5; text-align: center;">등록된 항목이 없습니다.</p>`;
    return;
  }

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "manage-item-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "manage-item-name";
    nameSpan.textContent = item.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-delete";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => {
      deleteCheckItem(item.id);
    });

    row.appendChild(nameSpan);
    row.appendChild(delBtn);
    listContainer.appendChild(row);
  });
}

// 8. 항목 삭제 비즈니스 로직
function deleteCheckItem(itemId) {
  const currentPreset = state.presets.find(p => p.id === state.selectedPresetId);
  if (!currentPreset) return;

  // 삭제처리
  currentPreset.items = currentPreset.items.filter(item => item.id !== itemId);
  
  // 체크 기록에서도 청소
  delete state.checkedItems[itemId];
  
  savePresetsToStorage();
  saveCheckedToStorage();
  
  // 갱신
  renderChecklist();
  renderManagementList();
  
  speakText("점검 항목이 삭제되었습니다.");
}

// ----------------------------------------------------
// 이벤트 바인딩 및 버튼 인터랙션
// ----------------------------------------------------
function setupEventListeners() {
  // 글자 크기 조절
  document.getElementById("btn-size-normal").addEventListener("click", () => changeFontSize("normal"));
  document.getElementById("btn-size-large").addEventListener("click", () => changeFontSize("large"));
  document.getElementById("btn-size-huge").addEventListener("click", () => changeFontSize("huge"));

  // 테마 모드 조절
  document.getElementById("btn-theme-dark").addEventListener("click", () => changeTheme("dark"));
  document.getElementById("btn-theme-light").addEventListener("click", () => changeTheme("light"));
  document.getElementById("btn-theme-high").addEventListener("click", () => changeTheme("high"));

  // 상황 프리셋 변경
  document.getElementById("select-preset").addEventListener("change", (e) => {
    state.selectedPresetId = e.target.value;
    saveSelectedPresetToStorage();
    
    // 상황 전환 시 기존 체크 상태 초기화 옵션 (일반적으로 외출을 다시 할 때 체크하는 용도이므로 리셋)
    resetCheckedForPreset(state.selectedPresetId);
    
    renderChecklist();
    renderManagementList();
    
    const selectedPreset = state.presets.find(p => p.id === state.selectedPresetId);
    if (selectedPreset) {
      speakText(`${selectedPreset.title} 체크리스트를 시작합니다.`);
    }
  });

  // TTS 전체 토글
  document.getElementById("chk-tts-enable").addEventListener("change", (e) => {
    state.accessibility.ttsEnabled = e.target.checked;
    saveAccessibilityToStorage();
    if (state.accessibility.ttsEnabled) {
      speakText("음성 안내를 켭니다.");
    }
  });

  // 관리 서랍 토글
  const btnToggleManage = document.getElementById("btn-toggle-manage");
  const manageContent = document.getElementById("management-content");
  
  btnToggleManage.addEventListener("click", () => {
    const isExpanded = btnToggleManage.getAttribute("aria-expanded") === "true";
    btnToggleManage.setAttribute("aria-expanded", !isExpanded);
    
    if (isExpanded) {
      manageContent.classList.add("hidden");
    } else {
      manageContent.classList.remove("hidden");
      renderManagementList(); // 리스트 갱신
      manageContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // 새 항목 추가
  document.getElementById("btn-submit-add").addEventListener("click", () => {
    const input = document.getElementById("input-item-text");
    const presetSelect = document.getElementById("select-item-preset");
    
    const textVal = input.value.trim();
    const presetId = presetSelect.value;
    
    if (!textVal) return;

    const targetPreset = state.presets.find(p => p.id === presetId);
    if (targetPreset) {
      const newItemId = `item-custom-${Date.now()}`;
      targetPreset.items.push({
        id: newItemId,
        text: textVal
      });
      
      savePresetsToStorage();
      input.value = "";
      
      // 화면 갱신
      renderChecklist();
      renderManagementList();
      
      speakText("새로운 점검 항목이 추가되었습니다.");
    }
  });

  // 새 프리셋 상황 추가
  document.getElementById("btn-submit-add-preset").addEventListener("click", () => {
    const titleInput = document.getElementById("input-preset-title");
    const iconInput = document.getElementById("input-preset-icon");
    
    const titleVal = titleInput.value.trim();
    const iconVal = iconInput.value.trim() || "🎒";

    if (!titleVal) return;

    const newPresetId = `preset-custom-${Date.now()}`;
    const newPreset = {
      id: newPresetId,
      title: titleVal,
      icon: iconVal,
      items: []
    };

    state.presets.push(newPreset);
    state.selectedPresetId = newPresetId; // 새로 추가한 프리셋을 바로 활성화
    
    savePresetsToStorage();
    saveSelectedPresetToStorage();
    
    titleInput.value = "";
    iconInput.value = "🎒";

    // 드롭다운 및 전체 리스트 새로 그리기
    renderPresetOptions();
    renderChecklist();
    renderManagementList();
    
    speakText(`새로운 상황 ${titleVal}이 추가되었습니다.`);
  });

  // 전체 공장 초기화
  document.getElementById("btn-reset-data").addEventListener("click", () => {
    if (confirm("모든 설정과 사용자 정의 체크리스트가 초기 기본값으로 리셋됩니다. 계속하시겠습니까?")) {
      localStorage.removeItem("youdid_presets");
      localStorage.removeItem("youdid_checked");
      localStorage.removeItem("youdid_selected_preset");
      
      loadStateFromStorage();
      renderPresetOptions();
      renderChecklist();
      renderManagementList();
      
      speakText("기본 설정으로 전체 초기화되었습니다.");
    }
  });

  // 축하 팝업 닫기
  document.getElementById("btn-close-celebration").addEventListener("click", () => {
    document.getElementById("celebration-overlay").classList.remove("active");
  });
}

// ----------------------------------------------------
// 보조 비즈니스 함수들
// ----------------------------------------------------

// 글자 크기 전환
function changeFontSize(size) {
  triggerVibration(20); // 가벼운 피드백
  state.accessibility.fontSize = size;
  saveAccessibilityToStorage();
  applyAccessibilityStyles();
}

// 테마 변경
function changeTheme(theme) {
  triggerVibration(20); // 가벼운 피드백
  state.accessibility.theme = theme;
  saveAccessibilityToStorage();
  applyAccessibilityStyles();
}

// 특정 상황의 체크 상태 초기화
function resetCheckedForPreset(presetId) {
  const preset = state.presets.find(p => p.id === presetId);
  if (!preset) return;
  
  preset.items.forEach(item => {
    state.checkedItems[item.id] = false;
  });
  saveCheckedToStorage();
}

// ----------------------------------------------------
// 초기화 실행
// ----------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  applyAccessibilityStyles();
  renderPresetOptions();
  renderChecklist();
  setupEventListeners();

  // 음성 목록 불러오기 활성화 (Chrome 등 특정 브라우저 백그라운드 로드 대응)
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
});
