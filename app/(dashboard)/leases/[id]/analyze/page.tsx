'use client';
import { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Brain, RefreshCw, Download, Printer, Send,
  AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown,
  Minus, Shield, FileText, MessageSquare, BarChart2,
  ChevronRight, Loader2, Star, Clock, DollarSign,
  Scale, Zap, Eye, Building2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Risk {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  leaseLanguage: string;
}

interface MissingProtection {
  clause: string;
  description: string;
  importance: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface LandlordClause {
  clause: string;
  leaseLanguage: string;
  explanation: string;
}

interface UnusualClause {
  clause: string;
  leaseLanguage: string;
  explanation: string;
  concern: string;
}

interface ClauseExplainer {
  title: string;
  leaseLanguage: string;
  plainEnglish: string;
  isStandard: boolean;
  tenantRating: 'favorable' | 'neutral' | 'unfavorable';
  practicalMeaning: string;
}

interface Scenario {
  scenario: string;
  leaseProvision: string;
  outcome: string;
  financialExposure: string;
}

interface MarketComparison {
  term: string;
  leaseValue: string;
  marketStandard: string;
  rating: 'below_market' | 'at_market' | 'above_market' | 'tenant_favorable' | 'landlord_favorable';
  explanation: string;
}

interface ActionItem {
  action: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  reason?: string;
  date?: string;
  notes?: string;
}

interface MonitorItem {
  item: string;
  frequency: string;
  notes: string;
}

interface Analysis {
  executiveSummary: {
    summary: string;
    assessment: 'good deal' | 'fair deal' | 'bad deal';
    topThings: string[];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    gradeExplanation: string;
  };
  financialAnalysis: {
    marketComparison: 'above market' | 'at market' | 'below market';
    marketComparisonDetail: string;
    totalCostOfOccupancy: number;
    totalCostWithEscalations: number;
    camAnalysis: string;
    camVerdict: 'reasonable' | 'excessive' | 'unknown';
    hiddenCosts: string[];
    effectiveRent: number;
    effectiveRentExplanation: string;
  };
  riskAnalysis: {
    risks: Risk[];
    overallRiskScore: number;
    overallRiskLabel: 'Critical' | 'High' | 'Medium' | 'Low';
  };
  missingProtections: MissingProtection[];
  landlordFriendlyClauses: LandlordClause[];
  unusualClauses: UnusualClause[];
  clauseExplainer: ClauseExplainer[];
  scenarioAnalysis: Scenario[];
  marketComparison: MarketComparison[];
  actionItems: {
    beforeSigning: ActionItem[];
    afterSigning: ActionItem[];
    ongoingMonitoring: MonitorItem[];
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: { clauseTitle: string; clauseText: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === 'critical') return 'text-red-400 bg-red-900/20 border-red-700';
  if (s === 'high') return 'text-orange-400 bg-orange-900/20 border-orange-700';
  if (s === 'medium') return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
  return 'text-blue-400 bg-blue-900/20 border-blue-700';
}

function severityDot(s: string) {
  if (s === 'critical') return 'bg-red-500';
  if (s === 'high') return 'bg-orange-500';
  if (s === 'medium') return 'bg-yellow-500';
  return 'bg-blue-500';
}

function importanceColor(i: string) {
  if (i === 'Critical') return 'text-red-400 bg-red-900/20 border-red-700';
  if (i === 'High') return 'text-orange-400 bg-orange-900/20 border-orange-700';
  if (i === 'Medium') return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
  return 'text-blue-400 bg-blue-900/20 border-blue-700';
}

function ratingColor(r: string) {
  if (r === 'tenant_favorable' || r === 'below_market') return 'text-green-400';
  if (r === 'landlord_favorable' || r === 'above_market') return 'text-red-400';
  return 'text-gray-400';
}

function ratingIcon(r: string) {
  if (r === 'tenant_favorable' || r === 'below_market') return <TrendingDown className="h-4 w-4 text-green-400" />;
  if (r === 'landlord_favorable' || r === 'above_market') return <TrendingUp className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function ratingLabel(r: string) {
  if (r === 'tenant_favorable') return 'Tenant Favorable';
  if (r === 'below_market') return 'Below Market';
  if (r === 'landlord_favorable') return 'Landlord Favorable';
  if (r === 'above_market') return 'Above Market';
  return 'At Market';
}

function tenantRatingColor(r: string) {
  if (r === 'favorable') return 'text-green-400 bg-green-900/20 border-green-700';
  if (r === 'unfavorable') return 'text-red-400 bg-red-900/20 border-red-700';
  return 'text-gray-400 bg-gray-800 border-gray-700';
}

function gradeColor(g: string) {
  if (g === 'A') return 'text-green-400 bg-green-900/20 border-green-600';
  if (g === 'B') return 'text-emerald-400 bg-emerald-900/20 border-emerald-600';
  if (g === 'C') return 'text-yellow-400 bg-yellow-900/20 border-yellow-600';
  if (g === 'D') return 'text-orange-400 bg-orange-900/20 border-orange-600';
  return 'text-red-400 bg-red-900/20 border-red-600';
}

function assessmentColor(a: string) {
  if (a === 'good deal') return 'text-green-400 bg-green-900/20 border-green-700';
  if (a === 'bad deal') return 'text-red-400 bg-red-900/20 border-red-700';
  return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
}

function fmtCurrency(n: number) {
  if (!n || n === 0) return 'N/A';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const TABS = [
  { id: 'summary', label: 'Summary', icon: Star },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'risks', label: 'Risk Analysis', icon: AlertTriangle },
  { id: 'clauses', label: 'Clause Explainer', icon: FileText },
  { id: 'protections', label: 'Protections', icon: Shield },
  { id: 'scenarios', label: 'Scenarios', icon: Zap },
  { id: 'market', label: 'Market Compare', icon: BarChart2 },
  { id: 'actions', label: 'Action Items', icon: CheckCircle },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
];

const LOADING_STEPS = [
  'Reading lease documents...',
  'Analyzing financial terms...',
  'Identifying risks and missing protections...',
  'Comparing to market standards...',
  'Reviewing clause language...',
  'Building scenario analysis...',
  'Generating action items...',
  'Finalizing your report...',
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lease, setLease] = useState<any>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [loadStep, setLoadStep] = useState(0);
  const [activeTab, setActiveTab] = useState('summary');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load lease + cached analysis
  useEffect(() => {
    async function load() {
      try {
        const [leaseRes, analyzeRes] = await Promise.all([
          fetch(`/api/leases/${id}`),
          fetch(`/api/leases/${id}/analyze`),
        ]);
        if (leaseRes.ok) {
          const d = await leaseRes.json();
          setLease(d.lease);
        }
        if (analyzeRes.ok) {
          const d = await analyzeRes.json();
          if (d.analysis) setAnalysis(d.analysis);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  const runAnalysis = useCallback(async (refresh = false) => {
    setAnalyzing(true);
    setAnalyzeError('');
    setLoadStep(0);

    stepTimerRef.current = setInterval(() => {
      setLoadStep(s => (s + 1) % LOADING_STEPS.length);
    }, 3000);

    try {
      const res = await fetch(`/api/leases/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
      setActiveTab('summary');
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed. Please try again.');
    } finally {
      if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null; }
      setAnalyzing(false);
    }
  }, [id]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/leases/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not process that. Please try again.',
        citations: [],
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const leaseData = lease?.extractedData ? JSON.parse(lease.extractedData) : {};
  const leaseName = leaseData.propertyAddress || lease?.fileName || 'Lease';

  // ─── Analyzing overlay ─────────────────────────────────────────────────────

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="relative inline-flex mb-6">
            <div className="h-20 w-20 rounded-full bg-blue-600/20 border-2 border-blue-600/40 flex items-center justify-center">
              <Brain className="h-10 w-10 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Lease</h2>
          <p className="text-gray-400 mb-8 text-sm">This takes about 30–60 seconds. We are reading every clause carefully.</p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left space-y-3">
            {LOADING_STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm transition-opacity ${i <= loadStep ? 'opacity-100' : 'opacity-30'}`}>
                {i < loadStep ? (
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : i === loadStep ? (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-gray-600 flex-shrink-0" />
                )}
                <span className={i === loadStep ? 'text-blue-300' : i < loadStep ? 'text-gray-400' : 'text-gray-600'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── No analysis yet ───────────────────────────────────────────────────────

  if (!analysis) {
    const notCompleted = lease?.status !== 'completed';
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href={`/leases/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Lease
            </Link>
            <h1 className="text-2xl font-bold text-white">{leaseName}</h1>
            <p className="text-gray-400 text-sm mt-1">AI Analyst</p>
          </div>

          {notCompleted ? (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-yellow-300 font-semibold mb-2">Lease Not Yet Processed</h3>
              <p className="text-yellow-400/80 text-sm">
                This lease is still being processed. Once extraction is complete, you can run a full AI analysis.
              </p>
              <Link href={`/leases/${id}`} className="mt-4 inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium">
                <ArrowLeft className="h-4 w-4" /> View Lease Status
              </Link>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-8 border-b border-gray-800 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600/20 border border-blue-600/40 mb-4">
                  <Brain className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Deep AI Lease Analysis</h2>
                <p className="text-gray-400 max-w-lg mx-auto">
                  Our AI attorney reads every clause, identifies every risk, and explains your lease in plain English — like having a real estate lawyer by your side.
                </p>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: AlertTriangle, label: 'Risk Analysis', desc: 'Every risk ranked by severity' },
                    { icon: DollarSign, label: 'Financial Deep-Dive', desc: 'True cost of occupancy & market comparison' },
                    { icon: Shield, label: 'Missing Protections', desc: 'Clauses you need but do not have' },
                    { icon: FileText, label: 'Plain English Explainer', desc: 'Every clause explained clearly' },
                    { icon: Zap, label: 'Scenario Analysis', desc: 'What if situations & exposure' },
                    { icon: MessageSquare, label: 'AI Chat', desc: 'Ask any question about your lease' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <Icon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {analyzeError && (
                  <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 mb-4 text-sm">
                    {analyzeError}
                  </div>
                )}

                <button
                  onClick={() => runAnalysis(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
                >
                  <Brain className="h-5 w-5" />
                  Analyze This Lease
                </button>
                <p className="text-center text-gray-500 text-xs mt-3">Analysis takes 30–60 seconds. Results are cached for instant reload.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Full analysis view ────────────────────────────────────────────────────

  const a = analysis;

  return (
    <div className="min-h-screen bg-gray-950 print:bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href={`/leases/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-1">
              <ArrowLeft className="h-4 w-4" /> Back to Lease
            </Link>
            <h1 className="text-lg font-bold text-white truncate max-w-xl">{leaseName}</h1>
            <p className="text-gray-500 text-xs">AI Analyst Report</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runAnalysis(true)}
              className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 transition-colors"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Grade bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold flex-shrink-0 ${gradeColor(a.executiveSummary.grade)}`}>
            Grade: {a.executiveSummary.grade}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium capitalize flex-shrink-0 ${assessmentColor(a.executiveSummary.assessment)}`}>
            {a.executiveSummary.assessment}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium flex-shrink-0 ${importanceColor(a.riskAnalysis.overallRiskLabel)}`}>
            Risk: {a.riskAnalysis.overallRiskLabel}
          </div>
          <div className="flex-1" />
          <div className="text-xs text-gray-500 flex-shrink-0">
            {a.riskAnalysis.risks.length} risks · {a.missingProtections.length} missing protections · {a.clauseExplainer.length} clauses explained
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── SUMMARY TAB ─────────────────────────────────────────── */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Grade card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex flex-wrap items-start gap-6">
                <div className={`flex flex-col items-center justify-center h-24 w-24 rounded-2xl border-2 font-black text-5xl flex-shrink-0 ${gradeColor(a.executiveSummary.grade)}`}>
                  {a.executiveSummary.grade}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-white">Overall Assessment</h2>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold capitalize ${assessmentColor(a.executiveSummary.assessment)}`}>
                      {a.executiveSummary.assessment}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{a.executiveSummary.gradeExplanation}</p>
                </div>
              </div>
            </div>

            {/* Top 3 things */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" /> Top 3 Things To Know
              </h3>
              <div className="space-y-3">
                {a.executiveSummary.topThings.map((thing, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="text-gray-200 text-sm">{thing}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Executive Summary
              </h3>
              <p className="text-gray-200 text-sm leading-relaxed">{a.executiveSummary.summary}</p>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Cost (Base)', value: fmtCurrency(a.financialAnalysis.totalCostOfOccupancy), icon: DollarSign, color: 'text-blue-400' },
                { label: 'Total With Escalations', value: fmtCurrency(a.financialAnalysis.totalCostWithEscalations), icon: TrendingUp, color: 'text-orange-400' },
                { label: 'Effective Monthly Rent', value: fmtCurrency(a.financialAnalysis.effectiveRent), icon: Building2, color: 'text-green-400' },
                { label: 'Risks Identified', value: String(a.riskAnalysis.risks.length), icon: AlertTriangle, color: 'text-red-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <Icon className={`h-5 w-5 ${color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-gray-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FINANCIAL TAB ───────────────────────────────────────── */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Market comparison */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Rent vs. Market
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1.5 rounded-full border text-sm font-semibold capitalize ${
                  a.financialAnalysis.marketComparison === 'below market' ? 'text-green-400 bg-green-900/20 border-green-700' :
                  a.financialAnalysis.marketComparison === 'above market' ? 'text-red-400 bg-red-900/20 border-red-700' :
                  'text-yellow-400 bg-yellow-900/20 border-yellow-700'
                }`}>
                  {a.financialAnalysis.marketComparison}
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{a.financialAnalysis.marketComparisonDetail}</p>
            </div>

            {/* Cost cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-xs mb-1">Base Cost of Occupancy</p>
                <p className="text-2xl font-bold text-white">{fmtCurrency(a.financialAnalysis.totalCostOfOccupancy)}</p>
                <p className="text-gray-500 text-xs mt-1">Total base rent over lease term</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-xs mb-1">Total with Escalations</p>
                <p className="text-2xl font-bold text-orange-400">{fmtCurrency(a.financialAnalysis.totalCostWithEscalations)}</p>
                <p className="text-gray-500 text-xs mt-1">Including all rent increases</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-xs mb-1">Effective Monthly Rent</p>
                <p className="text-2xl font-bold text-green-400">{fmtCurrency(a.financialAnalysis.effectiveRent)}</p>
                <p className="text-gray-500 text-xs mt-1">After free rent & TI amortization</p>
              </div>
            </div>

            {/* Effective rent explanation */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" /> Effective Rent Explained
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{a.financialAnalysis.effectiveRentExplanation}</p>
            </div>

            {/* CAM analysis */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="h-4 w-4" /> CAM / Operating Expenses
                </h3>
                <span className={`px-2 py-1 rounded-full border text-xs font-semibold capitalize ${
                  a.financialAnalysis.camVerdict === 'reasonable' ? 'text-green-400 bg-green-900/20 border-green-700' :
                  a.financialAnalysis.camVerdict === 'excessive' ? 'text-red-400 bg-red-900/20 border-red-700' :
                  'text-gray-400 bg-gray-800 border-gray-700'
                }`}>
                  {a.financialAnalysis.camVerdict}
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{a.financialAnalysis.camAnalysis}</p>
            </div>

            {/* Hidden costs */}
            {a.financialAnalysis.hiddenCosts.length > 0 && (
              <div className="bg-gray-900 border border-yellow-800/40 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Hidden Costs
                </h3>
                <div className="space-y-2">
                  {a.financialAnalysis.hiddenCosts.map((cost, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-yellow-900/10 border border-yellow-800/30 rounded-lg">
                      <ChevronRight className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">{cost}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RISKS TAB ───────────────────────────────────────────── */}
        {activeTab === 'risks' && (
          <div className="space-y-6">
            {/* Risk score */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-4xl font-black ${
                  a.riskAnalysis.overallRiskLabel === 'Critical' ? 'text-red-400' :
                  a.riskAnalysis.overallRiskLabel === 'High' ? 'text-orange-400' :
                  a.riskAnalysis.overallRiskLabel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {a.riskAnalysis.overallRiskScore}
                  <span className="text-xl">/100</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{a.riskAnalysis.overallRiskLabel} Risk</p>
                  <p className="text-gray-500 text-sm">Overall risk score (higher = riskier)</p>
                </div>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    a.riskAnalysis.overallRiskScore >= 70 ? 'bg-red-500' :
                    a.riskAnalysis.overallRiskScore >= 40 ? 'bg-orange-500' :
                    a.riskAnalysis.overallRiskScore >= 20 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${a.riskAnalysis.overallRiskScore}%` }}
                />
              </div>
            </div>

            {/* Risk list */}
            <div className="space-y-4">
              {['critical', 'high', 'medium', 'low'].map(sev => {
                const risks = a.riskAnalysis.risks.filter(r => r.severity === sev);
                if (!risks.length) return null;
                return (
                  <div key={sev}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${
                      sev === 'critical' ? 'text-red-400' : sev === 'high' ? 'text-orange-400' :
                      sev === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${severityDot(sev)}`} />
                      {sev.charAt(0).toUpperCase() + sev.slice(1)} Risk ({risks.length})
                    </h3>
                    <div className="space-y-3">
                      {risks.map((risk, i) => (
                        <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${severityColor(risk.severity)}`}>
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${severityDot(risk.severity)}`}>
                              <AlertTriangle className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold mb-1">{risk.title}</p>
                              <p className="text-gray-300 text-sm mb-3 leading-relaxed">{risk.description}</p>
                              {risk.leaseLanguage && risk.leaseLanguage !== 'Not specified in lease' && (
                                <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-700/50">
                                  <p className="text-gray-500 text-xs mb-1 font-medium">Lease Language:</p>
                                  <p className="text-gray-400 text-xs italic">&ldquo;{risk.leaseLanguage}&rdquo;</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLAUSE EXPLAINER TAB ────────────────────────────────── */}
        {activeTab === 'clauses' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Every major clause explained in plain English — like having a real estate attorney walk you through the lease.</p>
            {a.clauseExplainer.map((clause, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h3 className="text-white font-semibold">{clause.title}</h3>
                  <div className="flex items-center gap-2">
                    {clause.isStandard
                      ? <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">Standard</span>
                      : <span className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700 px-2 py-0.5 rounded-full">Non-Standard</span>
                    }
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${tenantRatingColor(clause.tenantRating)}`}>
                      {clause.tenantRating}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {clause.leaseLanguage && (
                    <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Lease Says:</p>
                      <p className="text-gray-300 text-sm italic">&ldquo;{clause.leaseLanguage}&rdquo;</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wider">Plain English:</p>
                    <p className="text-gray-200 text-sm leading-relaxed">{clause.plainEnglish}</p>
                  </div>
                  <div className="bg-blue-900/10 border border-blue-800/40 rounded-lg p-4">
                    <p className="text-blue-400 text-xs font-medium mb-1 uppercase tracking-wider">Day-to-Day Impact:</p>
                    <p className="text-gray-300 text-sm">{clause.practicalMeaning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROTECTIONS TAB ─────────────────────────────────────── */}
        {activeTab === 'protections' && (
          <div className="space-y-6">
            {/* Missing protections */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Missing Protections</h2>
              <p className="text-gray-400 text-sm mb-4">Standard clauses that should be in this lease but are missing.</p>
              <div className="space-y-3">
                {a.missingProtections.map((p, i) => (
                  <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${importanceColor(p.importance)}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold">{p.clause}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${importanceColor(p.importance)}`}>
                        {p.importance}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Landlord-friendly clauses */}
            {a.landlordFriendlyClauses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Landlord-Friendly Clauses</h2>
                <p className="text-gray-400 text-sm mb-4">Clauses that strongly favor the landlord over the tenant.</p>
                <div className="space-y-3">
                  {a.landlordFriendlyClauses.map((c, i) => (
                    <div key={i} className="bg-gray-900 border border-red-800/40 rounded-xl p-5">
                      <p className="text-red-300 font-semibold mb-2">{c.clause}</p>
                      {c.leaseLanguage && (
                        <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-700 mb-3">
                          <p className="text-gray-400 text-xs italic">&ldquo;{c.leaseLanguage}&rdquo;</p>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unusual clauses */}
            {a.unusualClauses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Unusual Clauses</h2>
                <p className="text-gray-400 text-sm mb-4">Non-standard clauses that the tenant should pay special attention to.</p>
                <div className="space-y-3">
                  {a.unusualClauses.map((c, i) => (
                    <div key={i} className="bg-gray-900 border border-purple-800/40 rounded-xl p-5">
                      <p className="text-purple-300 font-semibold mb-2">{c.clause}</p>
                      {c.leaseLanguage && (
                        <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-700 mb-3">
                          <p className="text-gray-400 text-xs italic">&ldquo;{c.leaseLanguage}&rdquo;</p>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm mb-2">{c.explanation}</p>
                      <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg p-3">
                        <p className="text-yellow-400 text-xs font-medium mb-1">Concern:</p>
                        <p className="text-gray-300 text-sm">{c.concern}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SCENARIOS TAB ───────────────────────────────────────── */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">What would actually happen in each of these common situations based on your specific lease.</p>
            {a.scenarioAnalysis.map((s, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-4 border-b border-gray-700 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-600/40 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold">{s.scenario}</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">What the lease says:</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{s.leaseProvision}</p>
                  </div>
                  <div className="bg-blue-900/10 border border-blue-800/40 rounded-lg p-4">
                    <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-2">What would happen:</p>
                    <p className="text-gray-200 text-sm leading-relaxed">{s.outcome}</p>
                  </div>
                  <div className={`rounded-lg p-4 border ${
                    s.financialExposure.toLowerCase().includes('$') || s.financialExposure.toLowerCase().includes('significant')
                      ? 'bg-red-900/10 border-red-800/40'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Financial exposure:</p>
                    <p className="text-gray-200 text-sm font-medium">{s.financialExposure}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MARKET COMPARISON TAB ───────────────────────────────── */}
        {activeTab === 'market' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">How every major term in this lease compares to what is standard in the commercial real estate market.</p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-800 px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Term</div>
                <div className="col-span-3">This Lease</div>
                <div className="col-span-3">Market Standard</div>
                <div className="col-span-2">Rating</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-gray-800">
                {a.marketComparison.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <div className="col-span-3">
                      <p className="text-white text-sm font-medium">{item.term}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-300 text-sm">{item.leaseValue}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-500 text-sm">{item.marketStandard}</p>
                    </div>
                    <div className="col-span-2">
                      <div className={`flex items-center gap-1 text-xs font-medium ${ratingColor(item.rating)}`}>
                        {ratingIcon(item.rating)}
                        <span className="hidden sm:inline">{ratingLabel(item.rating)}</span>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => {/* expand */}}
                        className="text-gray-600 hover:text-gray-400 transition-colors"
                        title={item.explanation}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-green-400" /> Tenant Favorable / Below Market</div>
              <div className="flex items-center gap-1"><Minus className="h-3 w-3 text-gray-400" /> At Market Standard</div>
              <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-red-400" /> Landlord Favorable / Above Market</div>
            </div>

            {/* Explanation cards */}
            <div className="space-y-3">
              {a.marketComparison.map((item, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-medium">{item.term}</p>
                    <div className={`flex items-center gap-1 text-xs font-medium ${ratingColor(item.rating)}`}>
                      {ratingIcon(item.rating)}
                      {ratingLabel(item.rating)}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTION ITEMS TAB ────────────────────────────────────── */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* Before signing */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-400" /> Before Signing
              </h2>
              <p className="text-gray-400 text-sm mb-4">Everything to review or clarify before you sign this lease, prioritized by importance.</p>
              <div className="space-y-3">
                {a.actionItems.beforeSigning.map((item, i) => (
                  <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${item.priority ? importanceColor(item.priority) : 'border-gray-800'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-5 w-5 rounded border-2 border-current mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{item.action}</p>
                          {item.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${importanceColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                        {item.reason && <p className="text-gray-400 text-xs">{item.reason}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After signing */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" /> After Signing — Key Dates & Actions
              </h2>
              <p className="text-gray-400 text-sm mb-4">Calendar of critical actions and deadlines throughout the lease term.</p>
              <div className="space-y-3">
                {a.actionItems.afterSigning.map((item, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white text-sm font-medium mb-1">{item.action}</p>
                        {item.date && <p className="text-blue-400 text-xs font-medium mb-1">{item.date}</p>}
                        {item.notes && <p className="text-gray-400 text-xs">{item.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ongoing monitoring */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-400" /> Ongoing Monitoring
              </h2>
              <p className="text-gray-400 text-sm mb-4">What to watch for during the lease term to protect your rights.</p>
              <div className="space-y-3">
                {a.actionItems.ongoingMonitoring.map((item, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-white text-sm font-medium">{item.item}</p>
                      <span className="text-xs text-purple-400 bg-purple-900/20 border border-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        {item.frequency}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT TAB ────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[600px]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-1">Ask About Your Lease</h2>
              <p className="text-gray-400 text-sm">Ask any question in plain English. The AI reads your actual lease and answers based on the specific language in your document.</p>
            </div>

            {/* Suggested questions */}
            {chatMessages.length === 0 && (
              <div className="mb-4">
                <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider font-medium">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Can I put a sign on the building?',
                    'What happens if I miss a rent payment?',
                    'Can I sublease part of my space?',
                    'How much notice do I need to renew?',
                    'What is my total cost over the full term?',
                    'Can the landlord enter my space without notice?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-1'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <Brain className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-xs text-gray-500">AI Attorney</span>
                      </div>
                    )}
                    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 border border-gray-700 text-gray-200'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.citations.map((c, ci) => (
                          <div key={ci} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                            <p className="text-blue-400 text-xs font-medium mb-1">{c.clauseTitle}</p>
                            <p className="text-gray-400 text-xs italic">&ldquo;{c.clauseText}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask anything about your lease..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  );
}
