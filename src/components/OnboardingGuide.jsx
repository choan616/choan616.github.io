import React, { useState } from 'react';
import './OnboardingGuide.css';

const steps = [
  {
    title: '환영합니다!',
    content: 'Mmtm 에 오신 것을 환영합니다. 몇 가지 주요 기능을 안내해 드릴게요.',
    targetClass: ''
  },
  {
    title: '프로필 메뉴',
    content: '우측 상단 프로필 아이콘을 클릭하면 설정, 백업, 통계 등 다양한 부가기능을 이용할 수 있습니다.',
    targetClass: 'user-profile-button'
  },
  {
    title: '간편 로그인 설정 (선택사항)',
    content: 'Google 계정으로 로그인한 후, 설정 메뉴에서 "패스키 등록"을 통해 생체 인증(지문, 얼굴 인식)을 추가할 수 있습니다. 다음 로그인부터는 Google 계정 없이도 빠르게 접속할 수 있어요.',
    targetClass: ''
  },
  {
    title: '캘린더와 검색',
    content: '좌측 사이드바에서 날짜를 선택하여 일기를 보거나, 키워드로 모든 일기를 검색할 수 있습니다.',
    targetClass: 'layout-sidebar'
  },
  {
    title: '일기 작성',
    content: '이곳에서 일기를 작성하고 사진을 추가할 수 있습니다. 기존 일기를 클릭하면 읽기 모드로 전환됩니다.',
    targetClass: 'layout-main'
  }
];

export function OnboardingGuide({ onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    onFinish(dontShowAgain);
  };

  const currentStep = steps[stepIndex];

  return (
    <div className="onboarding-overlay">
      <div className={`onboarding-modal ${currentStep.targetClass ? 'highlight-target' : ''}`}>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.content}</p>

        {stepIndex === steps.length - 1 && (
          <div className="onboarding-finish-options">
            <label>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              다시 보지 않기
            </label>
          </div>
        )}

        <div className="onboarding-actions">
          <button onClick={handleNext} className="btn btn-primary">
            {stepIndex < steps.length - 1 ? '다음' : '완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
