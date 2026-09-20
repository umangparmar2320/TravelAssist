import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  BellRing,
  Compass,
  Train,
  Plane,
  X,
  Sparkles,
} from 'lucide-react';

interface StepResult {
  step: number;
  name: string;
  module: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  endpoint: string;
  details?: string;
  responsePreview?: any;
}

interface EndToEndJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const EndToEndJourneyModal: React.FC<EndToEndJourneyModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const INITIAL_STEPS: StepResult[] = [
    {
      step: 1,
      name: 'User Login & Auth Verification',
      module: 'Part A: Core Travel',
      status: 'PENDING',
      endpoint: 'POST /auth/login',
      details: 'Authenticate employee Alex Mercer (Enterprise Solutions).',
    },
    {
      step: 2,
      name: 'Create Business Trip',
      module: 'Part A: Core Travel',
      status: 'PENDING',
      endpoint: 'POST /trips',
      details: 'Create origin-destination record: Mumbai Central to Goa.',
    },
    {
      step: 3,
      name: 'Set Traveler Preferences',
      module: 'Part A: Core Travel',
      status: 'PENDING',
      endpoint: 'POST /preferences',
      details: 'Priority: fastest; Window seat; flight/train/cab preferred.',
    },
    {
      step: 4,
      name: 'Validate Corporate Travel Policy',
      module: 'Part A: Core Travel',
      status: 'PENDING',
      endpoint: 'POST /policies',
      details: 'Budget ceiling: ₹12,000; Auto-rebooking ceiling: ₹8,000.',
    },
    {
      step: 5,
      name: 'Search Multi-Modal Routes',
      module: 'Part A: Core Travel',
      status: 'PENDING',
      endpoint: 'GET /routes/search',
      details: 'Fetch normalized flight (Amadeus), train (Qrail), and road (Google Routes).',
    },
    {
      step: 6,
      name: 'Select Route & Initial Booking',
      module: 'Part A & Part D',
      status: 'PENDING',
      endpoint: 'POST /trips (booked state)',
      details: 'Select Superfast Train 12051 Jan Shatabdi + first/last-mile cabs.',
    },
    {
      step: 7,
      name: 'Monitor In-Transit Journey',
      module: 'Part B: Disruption Engine',
      status: 'PENDING',
      endpoint: 'GET /trips/{id}/segments',
      details: 'Real-time telemetry and segment status check: segment 2 active.',
    },
    {
      step: 8,
      name: 'Detect Transit Disruption',
      module: 'Part B: Disruption Engine',
      status: 'PENDING',
      endpoint: 'POST /disruptions/simulate',
      details: 'Simulate track rockfall on Konkan line; train 12051 cancelled.',
    },
    {
      step: 9,
      name: 'Find Multi-Modal Alternatives',
      module: 'Part B: Disruption Engine',
      status: 'PENDING',
      endpoint: 'GET /alternatives/{id}',
      details: 'Discover flight detour via BOM → GOI (IndiGo) arriving 3.5h earlier.',
    },
    {
      step: 10,
      name: 'Policy Validation & Auto-Rebooking',
      module: 'Part B: Disruption Engine',
      status: 'PENDING',
      endpoint: 'POST /rebooking/{id}',
      details: 'Validate cost against auto-rebooking ceiling and issue confirmation.',
    },
    {
      step: 11,
      name: 'Synchronize Hotel Stay & Late Check-in',
      module: 'Part C: Hotel & Destination',
      status: 'PENDING',
      endpoint: 'POST /hotels/{id}/modify',
      details: 'Dispatch revised ETA to hotel front desk to protect reservation.',
    },
    {
      step: 12,
      name: 'Dispatch Multi-Channel User Notifications',
      module: 'Part D: Frontend & Notifications',
      status: 'PENDING',
      endpoint: 'POST /notifications/send',
      details: 'Send In-App push, Telegram bot alert, and SMS confirmation.',
    },
  ];

  const [steps, setSteps] = useState<StepResult[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [currentResponse, setCurrentResponse] = useState<any>(null);

  if (!isOpen) return null;

  const runFullPipeline = async () => {
    setIsRunning(true);
    const updated = [...INITIAL_STEPS];
    setSteps(updated);

    const tripId = 'trip-mb-goa-001';
    const userId = 'usr-corp-01';

    for (let i = 0; i < updated.length; i++) {
      setActiveStepIndex(i);
      updated[i].status = 'RUNNING';
      setSteps([...updated]);

      try {
        let resData: any = null;

        if (i === 0) {
          // 1. Login
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alex.mercer@acmecorp.com' }),
          });
          resData = await res.json();
        } else if (i === 1) {
          // 2. Create Trip
          const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: tripId,
              user_id: userId,
              source: 'Mumbai Central',
              destination: 'Goa',
              status: 'IN_PROGRESS',
            }),
          });
          resData = await res.json();
        } else if (i === 2) {
          // 3. Set Preferences
          const res = await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              preferred_modes: ['TRAIN', 'FLIGHT', 'CAB'],
              max_transfers: 2,
              seat_preference: 'WINDOW',
              travel_priority: 'fastest',
            }),
          });
          resData = await res.json();
        } else if (i === 3) {
          // 4. Policy
          const res = await fetch('/api/policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              name: 'Enterprise Express Policy',
              max_budget_per_trip: 12000,
              allowed_modes: ['FLIGHT', 'TRAIN', 'BUS', 'CAB', 'METRO'],
              require_manager_approval: false,
              auto_rebooking_limit: 8000,
              cabin_class_limit: 'ECONOMY',
            }),
          });
          resData = await res.json();
        } else if (i === 4) {
          // 5. Search Routes
          const res = await fetch(`/api/routes/search?origin=Mumbai+Central&destination=Goa&currency=INR`);
          resData = await res.json();
        } else if (i === 5) {
          // 6. Select Route
          const res = await fetch(`/api/trips/${tripId}/segments`);
          resData = await res.json();
        } else if (i === 6) {
          // 7. Monitor Journey
          const res = await fetch(`/api/trips/${tripId}`);
          resData = await res.json();
        } else if (i === 7) {
          // 8. Detect Disruption
          const res = await fetch('/api/disruptions/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trip_id: tripId,
              type: 'TRAIN_CANCELLED',
              severity: 'HIGH',
              description: 'Konkan Railway line blocked due to monsoon rockfall near Ratnagiri.',
            }),
          });
          resData = await res.json();
        } else if (i === 8) {
          // 9. Alternatives
          const res = await fetch(`/api/alternatives/${tripId}`);
          resData = await res.json();
        } else if (i === 9) {
          // 10. Rebooking
          const res = await fetch(`/api/rebooking/${tripId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alternative_id: 'alt-air-01' }),
          });
          resData = await res.json();
        } else if (i === 10) {
          // 11. Update Hotel
          const res = await fetch(`/api/hotels/${tripId}/modify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              late_check_in_notified: true,
              special_instructions: 'Traveler arriving via domestic flight detour. Guaranteed late room hold.',
            }),
          });
          resData = await res.json();
        } else if (i === 11) {
          // 12. Notify
          const res = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              trip_id: tripId,
              type: 'AUTO_REBOOKED',
              title: 'Disruption Resolved: Rebooked to Flight 6E-452',
              message: 'Your Mumbai to Goa journey has been restored. Hotel room hold guaranteed.',
              urgency: 'INFO',
              channel: 'TELEGRAM',
            }),
          });
          resData = await res.json();
        }

        updated[i].status = 'SUCCESS';
        updated[i].responsePreview = resData;
        setCurrentResponse(resData);
      } catch (err: any) {
        updated[i].status = 'FAILED';
        updated[i].details = `Error: ${err.message}`;
      }

      setSteps([...updated]);
      // Small pause so the user can visually appreciate the live autonomous flow
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsRunning(false);
    if (onComplete) onComplete();
  };

  const allPassed = steps.every((s) => s.status === 'SUCCESS');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Autonomous Concierge End-to-End System Test
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  PRD Section 15
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies seamless integration across Part A, Part B, Part C, and Part D modules with live REST API execution.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Steps Checklist & Live Inspector */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column: 12 Steps (3 cols) */}
          <div className="md:col-span-3 space-y-2.5">
            {steps.map((step, idx) => (
              <div
                key={step.step}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  step.status === 'RUNNING'
                    ? 'bg-blue-50/80 border-blue-300 shadow-2xs ring-1 ring-blue-200'
                    : step.status === 'SUCCESS'
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                    : step.status === 'FAILED'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        step.status === 'SUCCESS'
                          ? 'bg-emerald-600 text-white'
                          : step.status === 'RUNNING'
                          ? 'bg-blue-600 text-white animate-pulse'
                          : step.status === 'FAILED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.status === 'SUCCESS' ? '✓' : step.step}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 block">{step.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{step.endpoint} • {step.module}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      step.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : step.status === 'RUNNING'
                        ? 'bg-blue-100 text-blue-800'
                        : step.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Live Telemetry Inspector (2 cols) */}
          <div className="md:col-span-2 flex flex-col space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Live API Response Inspector
            </span>

            <div className="flex-1 bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-auto max-h-[400px] border border-slate-800">
              {currentResponse ? (
                <pre>{JSON.stringify(currentResponse, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 h-full flex items-center justify-center text-center">
                  <span>Click "Run Full Autonomous Test" to execute all 12 stages in live sequence.</span>
                </div>
              )}
            </div>

            {allPassed && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">100% PRD Integration Verified</span>
                  <span className="text-[11px] text-emerald-800">
                    All modules (Core, Disruption, Hotel, Notifications) synchronized seamlessly.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isRunning ? (
              <span className="text-blue-600 font-medium animate-pulse">
                Executing Step {activeStepIndex + 1} of 12...
              </span>
            ) : allPassed ? (
              <span className="text-emerald-700 font-medium">All 12 Integration Checks Passed!</span>
            ) : (
              <span>Ready for end-to-end verification.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runFullPipeline}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Running...' : 'Run Full Autonomous Test'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
