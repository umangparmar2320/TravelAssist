import React from 'react';
import {
  Compass,
  Briefcase,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Plane,
  Train,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Code2,
  Building2,
  Bell,
  Play,
} from 'lucide-react';
import { TravelerProfile, CurrencyCode } from '../types/travel';

export type NavigationTab =
  | 'planner'
  | 'disruptions'
  | 'trips'
  | 'hotels'
  | 'notifications'
  | 'policies'
  | 'robustness'
  | 'architecture'
  | 'telemetry';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  bookedCount: number;
  currentTraveler: TravelerProfile;
  onSelectTraveler: (traveler: TravelerProfile) => void;
  onOpenTelemetry: () => void;
  onOpenE2EModal?: () => void;
  currency: CurrencyCode;
  onChangeCurrency: (currency: CurrencyCode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  bookedCount,
  currentTraveler,
  onSelectTraveler,
  onOpenTelemetry,
  onOpenE2EModal,
  currency,
  onChangeCurrency,
}) => {
  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-base tracking-tight">
                  Smart Route Planner
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Autonomous Concierge
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Multi-Modal Optimization • Disruption Rebooking • Hotel Synchronization
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav id="header-nav" className="hidden lg:flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 gap-0.5">
            <button
              id="nav-tab-planner"
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'planner'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Planner</span>
            </button>

            <button
              id="nav-tab-disruptions"
              onClick={() => setActiveTab('disruptions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'disruptions'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Concierge</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            </button>

            <button
              id="nav-tab-trips"
              onClick={() => setActiveTab('trips')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                activeTab === 'trips'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Trips</span>
              {bookedCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                  {bookedCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-hotels"
              onClick={() => setActiveTab('hotels')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'hotels'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Hotels (Part C)</span>
            </button>

            <button
              id="nav-tab-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'notifications'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              <span>Alerts (Part D)</span>
            </button>

            <button
              id="nav-tab-policies"
              onClick={() => setActiveTab('policies')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'policies'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Policies</span>
            </button>

            <button
              id="nav-tab-robustness"
              onClick={() => setActiveTab('robustness')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'robustness'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Tests</span>
            </button>

            <button
              id="nav-tab-architecture"
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-700" />
              <span>Architecture</span>
            </button>
          </nav>

          {/* Right Area: Currency Selector, Traveler Profile & Health Telemetry */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PRD E2E Interactive Test Trigger */}
            {onOpenE2EModal && (
              <button
                type="button"
                id="header-e2e-btn"
                onClick={onOpenE2EModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                title="Run PRD Section 15 12-Step Autonomous Flow"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">E2E Flow</span>
              </button>
            )}

            {/* Currency selector toggle */}
            <div id="currency-switcher" className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                id="curr-inr"
                onClick={() => onChangeCurrency('INR')}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  currency === 'INR'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Indian Rupee (INR)"
              >
                ₹ INR
              </button>
              <button
                type="button"
                id="curr-usd"
                onClick={() => onChangeCurrency('USD')}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  currency === 'USD'
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="US Dollar (USD)"
              >
                $ USD
              </button>
            </div>

            {/* Health pill */}
            <button
              id="header-telemetry-btn"
              onClick={onOpenTelemetry}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs transition-colors"
              title="View routing provider latency and system health"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[11px]">Multi-Modal</span>
            </button>

            {/* Traveler Card */}
            <div id="header-user-badge" className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
                {currentTraveler.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentTraveler.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentTraveler.tier} • {currentTraveler.department}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs */}
        <div className="flex lg:hidden items-center overflow-x-auto py-2 gap-1 border-t border-slate-100">
          {[
            { id: 'planner', label: 'Planner', icon: Compass },
            { id: 'disruptions', label: 'Concierge', icon: AlertTriangle },
            { id: 'trips', label: `Trips (${bookedCount})`, icon: Briefcase },
            { id: 'hotels', label: 'Hotels', icon: Building2 },
            { id: 'notifications', label: 'Alerts', icon: Bell },
            { id: 'policies', label: 'Policies', icon: ShieldCheck },
            { id: 'robustness', label: 'Tests', icon: ShieldAlert },
            { id: 'architecture', label: 'Docs', icon: Layers },
          ].map((tabItem) => {
            const IconComp = tabItem.icon;
            const active = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setActiveTab(tabItem.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
