import React from "react";
import {
  Compass,
  AlertTriangle,
  Cpu,
  Layers,
  Shield,
  Zap,
  Server,
  Database,
  ArrowRight,
  Code2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const SystemArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
            Unified System
          </span>
          <span className="text-xs font-semibold text-slate-800">
            Full-Stack Travel Optimization & Autonomous Disruption Platform
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Unified Multi-Modal Travel Intelligence Architecture
        </h2>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
          This platform merges two core engines: <strong>Part A (Corporate Travel Planner & Policy Engine)</strong> and <strong>Part B (Autonomous Travel-Disruption Concierge & Replanner)</strong> into a unified, high-resilience web application.
        </p>
      </div>

      {/* Module Comparison Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module A Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Part A: Corporate Route Planner & Policy Engine
              </h3>
              <p className="text-xs text-slate-500">
                Repository: TravelAssist
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Multi-Modal Routing Engine:</span>
              <p className="text-slate-600 mt-0.5">
                Generates multimodal routes across flights, high-speed rail (Vande Bharat / TGV), intercity trains, sleeper buses, rideshare, and intermediate halt junctions ("beech ke stations").
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Corporate Policy Compliance:</span>
              <p className="text-slate-600 mt-0.5">
                Evaluates corporate tier allowances (Executive, Standard, Cost Saver, Green Earth), cabin class rules, short-haul flight bans, and budget caps with visual compliance tags.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Booking Lifecycle & Delay Contingencies:</span>
              <p className="text-slate-600 mt-0.5">
                Tracks active trips, monitors live status, flags delayed legs, and initiates automated corporate rebooking.
              </p>
            </div>
          </div>
        </div>

        {/* Module B Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Part B: Autonomous Disruption Concierge
              </h3>
              <p className="text-xs text-slate-500">
                Repository: breakdown
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Disruption Simulator:</span>
              <p className="text-slate-600 mt-0.5">
                Simulates train cancellations, flight groundings, highway roadblocks, strikes, and delays with animated step-by-step resolution.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Dynamic Re-routing Graph & Scoring:</span>
              <p className="text-slate-600 mt-0.5">
                Calculates alternative corridors with 5-dimensional scoring (Speed, Cost, Reliability, Convenience, Transfer Buffers) and deterministic fallback.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800">Zero-Hallucination AI Concierge:</span>
              <p className="text-slate-600 mt-0.5">
                Gemini LLM reasoning engine operating strictly on verified routing metrics to generate trade-off analysis, passenger contingency advice, and emergency welfare instructions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified API Endpoints Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-600" />
          Unified Server API Endpoints Directory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              method: "POST",
              path: "/api/v1/replan",
              desc: "Dynamic multi-modal replanning pipeline with automatic fallback and emergency guidance.",
              badge: "Part B Core",
            },
            {
              method: "POST",
              path: "/api/recommendations/evaluate",
              desc: "Zero-hallucination Gemini / deterministic AI reasoning evaluation with trade-off analysis.",
              badge: "AI Concierge",
            },
            {
              method: "GET",
              path: "/api/scenarios",
              desc: "Pre-packaged real-world disruption test scenarios (e.g. Mumbai-Goa train cancelled).",
              badge: "Presets",
            },
            {
              method: "ALL",
              path: "/api/tests/run",
              desc: "Runs complete 31-point end-to-end backend, scenario, and frontend test suite.",
              badge: "Test Suite",
            },
            {
              method: "GET",
              path: "/api/health/robustness",
              desc: "Provides active resilience status and 12-scenario fault-tolerance checklist.",
              badge: "Resilience",
            },
            {
              method: "GET",
              path: "/api/health",
              desc: "Multi-modal server health check and Gemini API key status detector.",
              badge: "Health",
            },
          ].map((ep, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${ep.method === "POST" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {ep.method}
                    </span>
                    <span className="font-semibold text-slate-800">{ep.path}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                    {ep.badge}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-1.5">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
