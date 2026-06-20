'use client';

import React, { useState } from 'react';
import UploadStep from './components/UploadStep';
import GenerateStep from './components/GenerateStep';
import ReviewStep from './components/ReviewStep';
import ExportStep from './components/ExportStep';

export default function AIGenerationPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { id: 'upload', title: 'Upload Document', component: <UploadStep onNext={() => setCurrentStep(1)} /> },
    { id: 'generate', title: 'Configure & Generate', component: <GenerateStep onNext={() => setCurrentStep(2)} /> },
    { id: 'review', title: 'Review Questions', component: <ReviewStep onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} /> },
    { id: 'export', title: 'Export', component: <ExportStep onFinish={() => {}} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto bg-white">
      <div className="flex flex-col items-center justify-center space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-900">AI Generation Mode</h1>
        <p className="text-brand-500">Generate question papers automatically using AI from uploaded content or PDF files.</p>
      </div>

      {/* Local Stepper */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-8 flex justify-between items-center px-8 relative">
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isPast = currentStep > index;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isActive ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : isPast ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                {isPast ? '✓' : index + 1}
              </div>
              <span className={`text-xs font-semibold ${isActive ? 'text-slate-900' : isPast ? 'text-brand-600' : 'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {steps[currentStep].component}
      </div>
    </div>
  );
}
