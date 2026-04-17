'use client';

import { useState } from 'react';

const STEPS = [
  {
    title: 'Listen to the song',
    desc: 'A K-pop song plays for a few seconds. Focus on the melody, the voice, the vibe.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#D4537E" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="16" cy="16" r="12" />
        <path d="M12 16c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        <circle cx="16" cy="16" r="1.5" fill="#D4537E" />
      </svg>
    ),
  },
  {
    title: 'Pick your answer',
    desc: 'Four choices appear. Tap the one you think is correct. Faster answers earn more points.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#D4537E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="10" height="10" rx="2" />
        <rect x="18" y="4" width="10" height="10" rx="2" />
        <rect x="4" y="18" width="10" height="10" rx="2" />
        <rect x="18" y="18" width="10" height="10" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Climb the ranks',
    desc: 'Earn XP, build combos, maintain your streak. Go from Trainee to Legend.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#D4537E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4l4 8 9 1.5-6.5 6 1.5 9L16 24l-8 4.5 1.5-9L3 13.5l9-1.5z" />
      </svg>
    ),
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step < 2) {
      setStep(step + 1);
    } else {
      localStorage.setItem('bt_onboarding_done', '1');
      onComplete();
    }
  }

  function handleSkip() {
    localStorage.setItem('bt_onboarding_done', '1');
    onComplete();
  }

  const current = STEPS[step]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary px-6">
      {/* Skip button */}
      <button onClick={handleSkip} className="absolute top-4 right-4 text-[11px] text-secondary font-medium hover:text-primary transition-colors">
        Skip
      </button>

      {/* Step indicator */}
      <div className="flex gap-1.5 justify-center mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[#D4537E]' : 'w-1.5 bg-[#E8E6E0] dark:bg-[rgba(255,255,255,0.1)]'}`} />
        ))}
      </div>

      {/* Icon */}
      <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] flex items-center justify-center mb-6">
        {current.icon}
      </div>

      {/* Content */}
      <h2 className="text-lg md:text-xl font-semibold text-primary mb-2 text-center">{current.title}</h2>
      <p className="text-xs md:text-sm text-secondary text-center max-w-[280px] leading-relaxed mb-8">{current.desc}</p>

      {/* CTA */}
      <button onClick={handleNext} className="w-full max-w-[280px] py-3.5 rounded-xl bg-[#D4537E] text-white text-sm font-semibold hover:bg-[#C44A72] active:scale-[0.97] transition-all">
        {step < 2 ? 'Next' : 'Get started'}
      </button>
    </div>
  );
}
