'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X, Upload, FileSearch, Bell, UserPlus } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: Upload,
    title: 'Upload your first lease',
    desc: 'Drop any PDF lease and our AI extracts all critical terms.',
    href: '/leases/upload',
    cta: 'Upload now',
  },
  {
    id: 2,
    icon: FileSearch,
    title: 'Review extracted terms',
    desc: 'Check rent, dates, renewal options, and flagged clauses.',
    href: '/leases',
    cta: 'View leases',
  },
  {
    id: 3,
    icon: Bell,
    title: 'Set up deadline alerts',
    desc: 'Enable email notifications so nothing expires unnoticed.',
    href: '/alerts',
    cta: 'Manage alerts',
  },
  {
    id: 4,
    icon: UserPlus,
    title: 'Invite a team member',
    desc: 'Share your portfolio with colleagues on the Professional plan.',
    href: '/settings',
    cta: 'Go to settings',
  },
];

export default function OnboardingChecklist() {
  const [completedStep, setCompletedStep] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(d => {
        setCompletedStep(d.step ?? 0);
        if (d.step >= 4) setDismissed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  async function markStep(step: number) {
    if (step <= completedStep) return;
    const next = step;
    setCompletedStep(next);
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: next }),
    });
    if (next >= 4) setTimeout(() => setDismissed(true), 1500);
  }

  async function dismiss() {
    setDismissed(true);
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 4 }),
    });
  }

  if (loading || dismissed) return null;

  const progress = Math.round((completedStep / 4) * 100);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Get started with LeaseIQ</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {completedStep} of 4 steps complete
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid sm:grid-cols-2 gap-3">
        {STEPS.map(step => {
          const done = completedStep >= step.id;
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex gap-3 p-4 rounded-lg border transition-colors ${
                done
                  ? 'border-green-800/50 bg-green-900/10'
                  : 'border-gray-800 bg-gray-800/40'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${done ? 'text-green-400' : 'text-blue-400'}`} />
                  <span className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {step.title}
                  </span>
                </div>
                {!done && (
                  <>
                    <p className="text-xs text-gray-500 mt-1 mb-2">{step.desc}</p>
                    <Link
                      href={step.href}
                      onClick={() => markStep(step.id)}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      {step.cta} →
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
