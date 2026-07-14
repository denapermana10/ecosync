/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  Activity, 
  Cpu, 
  Sparkles, 
  Bell, 
  Leaf, 
  Droplet, 
  Zap, 
  Car, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  Calendar, 
  Info, 
  X, 
  Send, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronRight,
  Battery,
  Flame,
  ArrowUpRight,
  Sliders
} from 'lucide-react';

// Interfaces for State Management
interface AutomationFlow {
  id: string;
  title: string;
  description: string;
  active: boolean;
  type: 'energy' | 'water';
  icon: 'leaf' | 'droplet' | 'car' | 'zap';
  influenceText?: string;
  metricText?: string;
  statusText?: string;
  custom?: boolean;
}

interface Appliance {
  id: string;
  name: string;
  type: 'energy' | 'water';
  active: boolean;
  baseDraw: number; // in kW or Liters/hr
  icon: 'snowflake' | 'car' | 'dishwasher' | 'sprinkler';
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export default function App() {
  // Navigation: 'dashboard' | 'usage' | 'automations' | 'settings' (or 'ai_advisor')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'usage' | 'automations' | 'settings'>('dashboard');

  // --- INTERACTIVE SYSTEM STATES ---
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  
  // Simulated schedule config
  const [scheduleTime, setScheduleTime] = useState({ start: '23:00', end: '05:00' });
  
  // Custom Flow creation state
  const [newFlowTitle, setNewFlowTitle] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowType, setNewFlowType] = useState<'energy' | 'water'>('energy');
  const [newFlowIcon, setNewFlowIcon] = useState<'leaf' | 'droplet' | 'zap' | 'car'>('zap');

  // Interactive leak status (can be toggled by user in alert card!)
  const [waterLeakDetected, setWaterLeakDetected] = useState(false);

  // --- BASE APPLIANCES STATE ---
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: 'app-hvac', name: 'HVAC System', type: 'energy', active: true, baseDraw: 1.2, icon: 'snowflake' },
    { id: 'app-ev', name: 'EV Charger', type: 'energy', active: true, baseDraw: 3.6, icon: 'car' },
    { id: 'app-dishwasher', name: 'Smart Dishwasher', type: 'energy', active: false, baseDraw: 1.5, icon: 'dishwasher' },
    { id: 'app-sprinkler', name: 'Smart Sprinkler', type: 'water', active: false, baseDraw: 2.4, icon: 'sprinkler' }
  ]);

  // --- BASE AUTOMATIONS STATE ---
  const [automations, setAutomations] = useState<AutomationFlow[]>([
    { 
      id: 'flow-eco', 
      title: 'Peak Hours Eco Mode', 
      description: 'Automatically dims lights and adjusts HVAC when energy demand is highest.', 
      active: true, 
      type: 'energy', 
      icon: 'leaf',
      influenceText: 'Influences 12 devices',
      metricText: '-15% kWh'
    },
    { 
      id: 'flow-sprinkler', 
      title: 'Smart Sprinkler', 
      description: 'Based on local rain forecast. Skips cycles when precipitation is predicted.', 
      active: true, 
      type: 'water', 
      icon: 'droplet',
      influenceText: '80% Rain Chance',
      statusText: 'IDLE'
    },
    { 
      id: 'flow-ev-charge', 
      title: 'EV Scheduled Charging', 
      description: 'Charges during lowest tariff rates between 12:00 AM and 5:00 AM.', 
      active: true, 
      type: 'energy', 
      icon: 'car',
      metricText: 'Off-Peak'
    }
  ]);

  // --- LIVE MATH & SIMULATION CALCULATIONS ---
  // If Peak Hours Eco Mode is ON, dim active appliances (HVAC uses 20% less, EV uses 10% less)
  const isEcoActive = automations.find(a => a.id === 'flow-eco')?.active || false;
  const isEvScheduledActive = automations.find(a => a.id === 'flow-ev-charge')?.active || false;
  const isSprinklerAutomated = automations.find(a => a.id === 'flow-sprinkler')?.active || false;

  // Live Appliance Draws (kW or L/hr)
  const getApplianceDraw = (app: Appliance) => {
    if (!app.active) return 0;
    if (app.id === 'app-hvac' && isEcoActive) {
      return Number((app.baseDraw * 0.8).toFixed(2)); // HVAC dim
    }
    if (app.id === 'app-ev' && isEcoActive) {
      return Number((app.baseDraw * 0.9).toFixed(2)); // EV dim slightly
    }
    return app.baseDraw;
  };

  // Compute daily aggregates dynamically based on state
  const baseDailyEnergy = 7.6; // Baseline consumed earlier
  const hvacEnergy = appliances.find(a => a.id === 'app-hvac')?.active ? (isEcoActive ? 0.96 : 1.2) : 0;
  const evEnergy = appliances.find(a => a.id === 'app-ev')?.active ? (isEcoActive ? 3.24 : 3.6) : 0;
  const dishwasherEnergy = appliances.find(a => a.id === 'app-dishwasher')?.active ? 1.5 : 0;
  const sprinklerEnergy = appliances.find(a => a.id === 'app-sprinkler')?.active ? 0.8 : 0;

  const totalEnergyToday = Number((baseDailyEnergy + hvacEnergy + evEnergy + dishwasherEnergy + sprinklerEnergy).toFixed(1));

  const baseDailyWater = 120; // baseline Liter today
  const sprinklerWater = appliances.find(a => a.id === 'app-sprinkler')?.active ? 120 : (isSprinklerAutomated ? 0 : 120);
  const dishwasherWater = appliances.find(a => a.id === 'app-dishwasher')?.active ? 40 : 0;
  const totalWaterToday = baseDailyWater + sprinklerWater + dishwasherWater;

  // Metrics derived from automations and active states
  const totalActiveFlows = automations.filter(a => a.active).length;
  
  // Daily Savings calculation
  const baseSavings = 1.50;
  const ecoSavings = isEcoActive ? 1.80 : 0;
  const sprinklerSavings = isSprinklerAutomated ? 0.90 : 0;
  const evSavings = isEvScheduledActive ? 1.00 : 0;
  const totalDailySavings = Number((baseSavings + ecoSavings + sprinklerSavings + evSavings).toFixed(2));

  // Carbon Offset
  const baseOffset = 5.2;
  const ecoOffset = isEcoActive ? 4.2 : 0;
  const evOffset = isEvScheduledActive ? 3.0 : 0;
  const sprinklerOffset = isSprinklerAutomated ? 1.5 : 0;
  const totalCarbonOffset = Number((baseOffset + ecoOffset + evOffset + sprinklerOffset).toFixed(1));

  // Efficiency Score (Dynamic scale)
  let baseScore = 65;
  if (isEcoActive) baseScore += 15;
  if (isSprinklerAutomated) baseScore += 8;
  if (isEvScheduledActive) baseScore += 6;
  if (!appliances.find(a => a.id === 'app-dishwasher')?.active) baseScore += 3; // save power if dishwasher off
  if (!waterLeakDetected) baseScore += 2;
  const efficiencyScore = Math.min(baseScore, 100);

  // --- TOGGLE ACTIONS ---
  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const toggleAppliance = (id: string) => {
    setAppliances(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleCreateFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowTitle.trim()) return;

    const newFlow: AutomationFlow = {
      id: `flow-${crypto.randomUUID()}`,
      title: newFlowTitle.trim(),
      description: newFlowDesc.trim() || 'Custom automated resource optimization flow.',
      active: true,
      type: newFlowType,
      icon: newFlowIcon,
      influenceText: 'Custom automation',
      metricText: newFlowType === 'energy' ? '-10% kWh' : 'Optimized',
      custom: true
    };

    setAutomations([...automations, newFlow]);
    setNewFlowTitle('');
    setNewFlowDesc('');
    setShowNewFlowModal(false);
  };

  const deleteFlow = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  // --- CHAT WITH AI COPILOT STATE & LOGIC ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Selamat datang di AI Copilot EcoSync! Saya adalah pendamping optimasi energi dan efisiensi air Anda. Saya menganalisis aliran grid, konsumsi harian, dan sistem aktif Anda untuk meminimalkan emisi karbon Anda.\n\nIngin tahu bagaimana cara mengoptimalkan pemakaian energi Anda hari ini?",
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Execute server-side Gemini call with injected app context
  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || aiLoading) return;

    const userMessage: Message = {
      id: `user-${crypto.randomUUID()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!presetText) setChatInput('');
    setAiLoading(true);

    try {
      // Formulate detailed application context to inject into user message or background prompt
      const appContext = `
[INFORMASI SISTEM LIVE ECOSYNC SAAT INI]:
- Total Energi Hari Ini: ${totalEnergyToday} kWh (Sasaran maksimum harian: 15 kWh)
- Total Air Hari Ini: ${totalWaterToday} L (Sasaran harian: 300L)
- Skor Efisiensi: ${efficiencyScore}/100
- Tabungan Hari Ini: $${totalDailySavings}
- Emisi Karbon Terkompensasi: ${totalCarbonOffset} kg
- Kebocoran Air: ${waterLeakDetected ? 'TERDETEKSI KEBOCORAN AIR!' : 'Aman (Tidak ada kebocoran)'}
- Aliran Otomatisasi Aktif: ${automations.filter(a => a.active).map(a => a.title).join(', ')}
- Aliran Non-Aktif: ${automations.filter(a => !a.active).map(a => a.title).join(', ')}
- Peralatan Rumah Tangga Aktif: ${appliances.filter(a => a.active).map(a => `${a.name} (${getApplianceDraw(a)} kW)`).join(', ')}
      `;

      const promptWithContext = `${appContext}\n\nPertanyaan Pengguna: "${textToSend}"\n\nBerikan tanggapan yang cerdas, ramah, fungsional, dan mendalam dalam bahasa Indonesia tentang cara menghemat sumber daya berdasarkan data live di atas. Jangan sebutkan kode teknis backend.`;

      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptWithContext,
          history
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghubungi Gemini AI.");
      }

      const assistantMessage: Message = {
        id: `assistant-${crypto.randomUUID()}`,
        sender: 'assistant',
        text: data.text || "Saya tidak dapat merumuskan saran optimasi saat ini.",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: `err-${crypto.randomUUID()}`,
        sender: 'assistant',
        text: `⚠️ Maaf, terjadi gangguan jaringan: ${error.message || "Gagal terhubung ke modul AI."}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  // --- QUICK COGNITIVE PROMPTS ---
  const askAiForWaterAdvice = () => {
    handleSendChat("Bagaimana cara meningkatkan skor efisiensi air saya hari ini?");
  };

  const askAiForCarbonAdvice = () => {
    handleSendChat("Bagaimana cara mengurangi emisi karbon saya agar tabungan harian bertambah?");
  };

  const askAiForHvacOptimization = () => {
    handleSendChat("Berikan saran optimasi terbaik untuk HVAC System di rumah saya.");
  };

  // Helper mapping for icons
  const renderFlowIcon = (icon: 'leaf' | 'droplet' | 'car' | 'zap', className: string) => {
    switch (icon) {
      case 'leaf': return <Leaf className={className} />;
      case 'droplet': return <Droplet className={className} />;
      case 'car': return <Car className={className} />;
      default: return <Zap className={className} />;
    }
  };

  // Mock data for trends double bar chart
  const weeklyTrends = [
    { day: 'MON', energy: 11.2, water: 220, maxEnergy: 15, maxWater: 300 },
    { day: 'TUE', energy: 13.5, water: 250, maxEnergy: 15, maxWater: 300 },
    { day: 'WED', energy: 10.1, water: 190, maxEnergy: 15, maxWater: 300 },
    { day: 'THU', energy: 14.2, water: 420, maxEnergy: 15, maxWater: 300 }, // Peak Thursday matches screenshot!
    { day: 'FRI', energy: 12.0, water: 280, maxEnergy: 15, maxWater: 300 },
    { day: 'SAT', energy: 8.5,  water: 180, maxEnergy: 15, maxWater: 300 },
    { day: 'SUN', energy: 9.8,  water: 210, maxEnergy: 15, maxWater: 300 },
  ];

  const [activeTrendTooltip, setActiveTrendTooltip] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#0B1C30] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-12">
      
      {/* 1. APP TOP BAR HEADER */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-[#EFF4FF]/60 px-6 py-4 transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAA17D] flex items-center justify-center shadow-xs">
              {/* Subtle inner vertical white pill/strip */}
              <div className="w-2.5 h-6 bg-white rounded-xs opacity-90" />
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-[#0B1C30] block">EcoSync</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Luminous Resource Engine</span>
            </div>
          </div>

          {/* Quick Icons */}
          <div className="flex items-center gap-3">
            <button 
              id="btn-leak-toggle"
              onClick={() => {
                setWaterLeakDetected(!waterLeakDetected);
                if (!waterLeakDetected) {
                  alert("Kebocoran air disimulasikan! Anda akan melihat status 'Leaking' berwarna merah di tab Dashboard.");
                } else {
                  alert("Kebocoran air dihentikan. Status kembali 'Secure'.");
                }
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                waterLeakDetected 
                  ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' 
                  : 'bg-slate-100 text-slate-500 border border-transparent hover:bg-slate-200'
              }`}
              title="Klik untuk mensimulasikan peringatan kebocoran air"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{waterLeakDetected ? "Simulate Secure" : "Test Leak Alarm"}</span>
            </button>

            <button 
              id="btn-bell-notif"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="w-10 h-10 rounded-xl bg-[#EFF4FF] flex items-center justify-center hover:bg-[#E5EEFF] transition-all relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#0B1C30]" />
              {notificationsEnabled && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SCROLL CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* GAUGE CHART CONTAINER */}
            <section className="bg-white rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Live Monitoring
              </div>

              {/* Responsive SVG Circular Ring Gauge */}
              <div className="relative w-64 h-64 flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Outer circle background (grey/blue shadow track) */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    fill="none" 
                    stroke="#EFF4FF" 
                    strokeWidth="12" 
                  />
                  {/* Outer circle foreground: ENERGY (Green #00d166 to #006d32) */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    fill="none" 
                    stroke="url(#energyGradient)" 
                    strokeWidth="12" 
                    strokeDasharray="534" 
                    strokeDashoffset={Math.max(0, 534 - (totalEnergyToday / 15) * 534)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Inner circle background */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="65" 
                    fill="none" 
                    stroke="#EFF4FF" 
                    strokeWidth="10" 
                  />
                  {/* Inner circle foreground: WATER (Blue #3b82f6) */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="65" 
                    fill="none" 
                    stroke="url(#waterGradient)" 
                    strokeWidth="10" 
                    strokeDasharray="408" 
                    strokeDashoffset={Math.max(0, 408 - (totalWaterToday / 300) * 408)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* SVG Gradients definitions */}
                  <defs>
                    <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d166" />
                      <stop offset="100%" stopColor="#006d32" />
                    </linearGradient>
                    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inner central content overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display font-extrabold text-5xl tracking-tight text-[#0B1C30]">
                    {totalEnergyToday}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 uppercase">
                    KWH TODAY
                  </span>
                  
                  {/* Water usage indicator pill */}
                  <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-[#EFF4FF] rounded-full text-xs font-semibold text-[#1d4ed8]">
                    <Droplet className="w-3 h-3 fill-[#1d4ed8] text-[#1d4ed8]" />
                    <span>{totalWaterToday}L</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Energy Efficiency Summary indicators below Gauge */}
              <div className="w-full grid grid-cols-2 gap-4 mt-6 border-t border-slate-50 pt-6">
                <div className="text-left pl-4">
                  <span className="text-2xs font-semibold text-slate-400 block uppercase tracking-wider mb-1">
                    Energy Efficiency
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-bold text-2xl text-emerald-600">88%</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>

                <div className="text-left pl-4 border-l border-slate-100">
                  <span className="text-2xs font-semibold text-slate-400 block uppercase tracking-wider mb-1">
                    Resource Health
                  </span>
                  <span className="font-display font-bold text-2xl text-indigo-900 block">
                    {waterLeakDetected ? "Warning" : "Optimal"}
                  </span>
                </div>
              </div>
            </section>

            {/* ACTIVE APPLIANCES HEADING */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B1C30]">Active Appliances</h3>
                  <p className="text-2xs text-slate-400 font-semibold">
                    {appliances.filter(a => a.active).length} systems drawing power live
                  </p>
                </div>
                <button 
                  onClick={() => alert("Menampilkan semua perangkat pintar yang terhubung ke EcoSync...")}
                  className="text-xs font-semibold text-[#006d32] hover:underline"
                >
                  View All
                </button>
              </div>

              {/* Horizontal Scroll Cards container */}
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                
                {appliances.map(app => {
                  const draw = getApplianceDraw(app);
                  return (
                    <div 
                      key={app.id} 
                      className="min-w-[210px] w-[210px] bg-white rounded-2xl p-5 shadow-xs snap-start flex flex-col justify-between"
                    >
                      {/* Top icon and switch */}
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          app.type === 'energy' ? 'bg-emerald-50' : 'bg-blue-50'
                        }`}>
                          {app.icon === 'snowflake' && <Zap className="w-5 h-5 text-[#00d166]" />}
                          {app.icon === 'car' && <Car className="w-5 h-5 text-indigo-600" />}
                          {app.icon === 'dishwasher' && <Droplet className="w-5 h-5 text-indigo-500" />}
                          {app.icon === 'sprinkler' && <Droplet className="w-5 h-5 text-emerald-500" />}
                        </div>
                        
                        {/* Apple-style Toggle Switch */}
                        <button
                          id={`btn-toggle-app-${app.id}`}
                          onClick={() => toggleAppliance(app.id)}
                          className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none cursor-pointer ${
                            app.active ? 'bg-[#00d166]' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                            app.active ? 'translate-x-5.5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Bottom Info details */}
                      <div>
                        <h4 className="font-sans font-bold text-sm text-[#0B1C30]">{app.name}</h4>
                        <div className="flex items-center justify-between text-2xs text-slate-400 mt-2 font-semibold">
                          <span>Current Draw</span>
                          <span className="font-mono text-slate-700">{draw} {app.type === 'energy' ? 'kW' : 'L/m'}</span>
                        </div>

                        {/* Usage gauge bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              app.type === 'energy' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${app.active ? (draw / app.baseDraw) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </section>

            {/* PEAK SAVING CTA WINDOW */}
            <section className="bg-gradient-to-tr from-[#004d22] to-[#008f43] rounded-3xl p-6 text-white shadow-sm relative overflow-hidden">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-15 transform rotate-12">
                <Zap className="w-48 h-48 text-white" />
              </div>

              <div className="max-w-md relative z-10">
                <span className="text-[9px] font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full uppercase">
                  Optimization Alert
                </span>
                <h3 className="font-display font-bold text-xl mt-2.5 leading-tight">
                  Peak Saving Window Detected
                </h3>
                <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed">
                  Lower rates are available between {scheduleTime.start} and {scheduleTime.end}. Schedule your high-power appliances (e.g. EV charging, Dishwasher) to tap into this interval.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button 
                    id="btn-schedule-now"
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-white text-[#006d32] px-4.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
                  >
                    Schedule Now
                  </button>
                  <span className="text-2xs text-emerald-100 font-medium">
                    {isEvScheduledActive ? "✓ Active on EV" : "Inactive"}
                  </span>
                </div>
              </div>
            </section>

            {/* WATER LEAK ALERT CARD */}
            <section className={`rounded-3xl p-6 text-white shadow-xs transition-all duration-500 ${
              waterLeakDetected 
                ? 'bg-gradient-to-tr from-rose-900 to-rose-700' 
                : 'bg-gradient-to-tr from-[#0B1C30] to-[#1E3E62]'
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    waterLeakDetected ? 'bg-rose-500/20' : 'bg-white/10'
                  }`}>
                    <Droplet className="w-5 h-5 text-white fill-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg mt-1">Water Leak Alarm</h3>
                  <p className="text-xs text-indigo-100/85">
                    {waterLeakDetected 
                      ? "High anomalous pressure and volume detected in the sub-line near utility room!" 
                      : "No abnormal flow detected in the main pipeline today."
                    }
                  </p>
                </div>
                
                <span className={`text-[10px] font-extrabold tracking-widest px-3 py-1 rounded-full uppercase ${
                  waterLeakDetected 
                    ? 'bg-white text-rose-700 animate-pulse' 
                    : 'bg-white/10 text-emerald-300'
                }`}>
                  {waterLeakDetected ? "LEAKING" : "SECURE"}
                </span>
              </div>

              {waterLeakDetected && (
                <div className="mt-4 pt-3 border-t border-rose-800/40 flex justify-between items-center">
                  <span className="text-2xs text-rose-100 font-medium">Auto-shutdown valve is ready.</span>
                  <button 
                    onClick={() => {
                      setWaterLeakDetected(false);
                      alert("Valve ditutup secara manual. Status kebocoran diamankan!");
                    }}
                    className="bg-white text-rose-800 px-3 py-1.5 rounded-lg text-3xs font-bold uppercase tracking-wider"
                  >
                    Shut Off Water
                  </button>
                </div>
              )}
            </section>

          </div>
        )}

        {/* TAB 2: USAGE VIEW */}
        {activeTab === 'usage' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* WEEKLY INSIGHT CARD */}
            <section className="bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 rounded-3xl p-6 border border-[#EFF4FF]/60 shadow-2xs">
              <span className="text-2xs font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Weekly Insight
              </span>
              <h3 className="font-display font-bold text-2xl text-[#0B1C30] mt-3 leading-tight">
                Your efficiency rose by <span className="text-emerald-600">12%</span> since last Monday.
              </h3>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <span className="text-3xs text-slate-400 font-bold uppercase block tracking-wider">
                    Avg. Daily Energy
                  </span>
                  <span className="font-display font-bold text-lg text-slate-700">14.2 kWh</span>
                </div>
                <div>
                  <span className="text-3xs text-slate-400 font-bold uppercase block tracking-wider">
                    Avg. Daily Water
                  </span>
                  <span className="font-display font-bold text-lg text-slate-700">420 L</span>
                </div>
              </div>
            </section>

            {/* ESTIMATED SAVINGS GREEN CTA CARD */}
            <section className="bg-gradient-to-r from-[#006d32] to-[#009b44] rounded-3xl p-6 text-white shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 block">
                  Estimated Savings this month
                </span>
                <span className="font-display font-extrabold text-4xl mt-1.5 block">
                  -${totalDailySavings * 10 > 42 ? (totalDailySavings * 10).toFixed(2) : "42.00"}
                </span>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
            </section>

            {/* BAR CHART: USAGE TRENDS */}
            <section className="bg-white rounded-3xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B1C30]">Usage Trends</h3>
                  <p className="text-2xs text-slate-400 font-semibold">7-Day Resource Comparison</p>
                </div>
                
                {/* Legend labels */}
                <div className="flex items-center gap-4 text-2xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Energy (kWh)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Water (L)</span>
                  </div>
                </div>
              </div>

              {/* Hand-crafted Vertical Double Bar Chart */}
              <div className="relative pt-4 pb-2">
                
                {/* Simulated vertical grid line helpers */}
                <div className="absolute inset-x-0 top-6 h-[1px] bg-slate-100" />
                <div className="absolute inset-x-0 top-18 h-[1px] bg-slate-100" />
                <div className="absolute inset-x-0 top-30 h-[1px] bg-slate-100" />

                <div className="h-44 flex items-end justify-between px-2 relative z-10">
                  {weeklyTrends.map((trend, idx) => {
                    // Compute responsive relative height percent
                    const energyHeightPct = (trend.energy / trend.maxEnergy) * 100;
                    const waterHeightPct = (trend.water / trend.maxWater) * 100;

                    return (
                      <div 
                        key={trend.day} 
                        className="flex flex-col items-center flex-1 group relative"
                        onMouseEnter={() => setActiveTrendTooltip(idx)}
                        onMouseLeave={() => setActiveTrendTooltip(null)}
                      >
                        {/* Custom Interactive Tooltip */}
                        {activeTrendTooltip === idx && (
                          <div className="absolute bottom-48 bg-slate-900 text-white text-3xs p-2 rounded-lg shadow-lg z-30 min-w-[80px] pointer-events-none">
                            <span className="block font-bold text-center border-b border-white/10 pb-1 mb-1">{trend.day}</span>
                            <span className="block text-emerald-300 font-mono">⚡ {trend.energy} kWh</span>
                            <span className="block text-blue-300 font-mono">💧 {trend.water} L</span>
                          </div>
                        )}

                        <div className="w-full flex justify-center gap-1.5 h-36 items-end">
                          {/* Energy Bar */}
                          <div 
                            className="w-2.5 bg-[#00d166] rounded-t-full hover:brightness-95 transition-all duration-500 ease-out"
                            style={{ height: `${energyHeightPct}%` }}
                          />
                          {/* Water Bar */}
                          <div 
                            className="w-2.5 bg-[#3b82f6] rounded-t-full hover:brightness-95 transition-all duration-500 ease-out"
                            style={{ height: `${waterHeightPct}%` }}
                          />
                        </div>

                        {/* Day Label */}
                        <span className="text-[10px] font-bold text-slate-400 mt-2 font-mono">
                          {trend.day}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </section>

            {/* TOP CONSUMERS LIST */}
            <section className="bg-white rounded-3xl p-6 shadow-xs">
              <h3 className="font-display font-bold text-lg text-[#0B1C30] mb-4">Top Consumers</h3>

              <div className="space-y-4">
                {/* Item 1 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#00d166]" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-xs text-[#0B1C30]">HVAC System</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Heating & Climate control</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <span className="font-display font-bold text-sm text-[#0B1C30] block">84.2 kWh</span>
                      <span className="text-[9px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded font-bold uppercase border border-rose-100">
                        +4% vs LW
                      </span>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-xs text-[#0B1C30]">Dishwasher</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Kitchen sanitation utility</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <span className="font-display font-bold text-sm text-[#0B1C30] block">156 Liters</span>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-100">
                        -12% vs LW
                      </span>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Car className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-xs text-[#0B1C30]">EV Charger</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Automotive refueling grid</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <span className="font-display font-bold text-sm text-[#0B1C30] block">52.0 kWh</span>
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200">
                        Stable
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SMART OPTIMIZATION TIP CARD */}
            <section className="bg-gradient-to-tr from-[#EFF4FF] to-blue-50 rounded-3xl p-6 border border-[#EFF4FF]/60 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-indigo-955">Smart Optimization Tip</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your hot water usage peaks between 7:00 AM and 8:00 AM. Shifting your dishwasher automation cycle to 11:00 PM could save you <span className="font-bold text-indigo-950">$14.50/month</span> on off-peak rates.
                  </p>
                  <button 
                    onClick={() => {
                      // Automate Dishwasher flow activation
                      setAppliances(prev => prev.map(a => a.id === 'app-dishwasher' ? { ...a, active: false } : a));
                      alert("Dishwasher diatur otomatis berjalan saat Off-Peak (11 PM). Potensi hemat energi diaktifkan!");
                    }}
                    className="mt-3 bg-[#0B1C30] text-white hover:bg-[#1E3E62] px-4.5 py-2 rounded-xl text-2xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Automate Now
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* TAB 3: AUTOMATIONS VIEW */}
        {activeTab === 'automations' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* INTRO HERO BOX */}
            <section className="bg-[#EFF4FF]/40 rounded-3xl p-6 border border-[#EFF4FF]/60 relative">
              <span className="text-[9px] font-bold tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                OPTIMIZED
              </span>
              <h2 className="font-display font-bold text-3xl text-[#0B1C30] mt-3 tracking-tight">
                Automations
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                The Luminous Engine is currently managing <span className="text-emerald-700 font-bold">{totalActiveFlows} active flows</span> to reduce your carbon footprint while maximizing grid efficiency.
              </p>

              {/* Filtering and adding buttons */}
              <div className="flex gap-2.5 mt-5">
                <button 
                  onClick={() => alert("Menyaring daftar otomasi Anda...")}
                  className="bg-white hover:bg-slate-50 text-[#0B1C30] px-4 py-2 rounded-xl text-xs font-bold shadow-2xs border border-[#EFF4FF] flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                </button>
                
                <button 
                  id="btn-new-flow"
                  onClick={() => setShowNewFlowModal(true)}
                  className="bg-[#006d32] hover:bg-[#005224] text-white px-4.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New Flow
                </button>
              </div>
            </section>

            {/* FLOWS CONTAINER */}
            <section className="space-y-4">
              
              {automations.map(flow => (
                <div 
                  key={flow.id} 
                  className={`bg-white rounded-3xl p-6 shadow-2xs transition-all relative group border border-transparent hover:border-[#EFF4FF]`}
                >
                  {/* Icon + Toggle top bar */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        flow.type === 'energy' ? 'bg-emerald-50' : 'bg-blue-50'
                      }`}>
                        {renderFlowIcon(flow.icon, "w-5 h-5 " + (flow.type === 'energy' ? 'text-emerald-600' : 'text-blue-500'))}
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-sm text-[#0B1C30]">{flow.title}</h3>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          flow.type === 'energy' ? 'text-emerald-600' : 'text-blue-500'
                        }`}>
                          {flow.type === 'energy' ? "Energy flow" : "Water Flow"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Delete custom flow button */}
                      {flow.custom && (
                        <button 
                          onClick={() => deleteFlow(flow.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Hapus Otomasi Kustom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Switch toggle */}
                      <button
                        onClick={() => toggleAutomation(flow.id)}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none cursor-pointer ${
                          flow.active ? 'bg-[#00d166]' : 'bg-slate-200'
                        }`}
                      >
                        <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                          flow.active ? 'translate-x-5.5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Flow description */}
                  <p className="text-xs text-slate-500 leading-relaxed pr-10">
                    {flow.description}
                  </p>

                  {/* Secondary stats metrics inside automation cards */}
                  {(flow.influenceText || flow.metricText || flow.statusText) && (
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-4 text-3xs font-semibold text-slate-400 uppercase tracking-wider">
                      {flow.influenceText && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Info className="w-3 h-3" /> {flow.influenceText}
                        </span>
                      )}
                      
                      {flow.metricText && (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                          <Zap className="w-3 h-3 fill-emerald-600" /> {flow.metricText}
                        </span>
                      )}

                      {flow.statusText && (
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                          {flow.statusText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* GRID OF SMALL METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {/* 1. Daily Savings */}
                <div className="bg-[#EFF4FF]/40 rounded-2xl p-4 text-center border border-[#EFF4FF]/40">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    DAILY SAVINGS
                  </span>
                  <span className="font-display font-bold text-xl text-[#0B1C30] block mt-1.5">
                    ${totalDailySavings.toFixed(2)}
                  </span>
                </div>

                {/* 2. Carbon Offset */}
                <div className="bg-[#EFF4FF]/40 rounded-2xl p-4 text-center border border-[#EFF4FF]/40">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    CARBON OFFSET
                  </span>
                  <span className="font-display font-bold text-xl text-[#0B1C30] block mt-1.5">
                    {totalCarbonOffset}kg
                  </span>
                </div>

                {/* 3. Efficiency Score */}
                <div className="bg-[#EFF4FF]/40 rounded-2xl p-4 text-center border border-[#EFF4FF]/40">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    EFFICIENCY SCORE
                  </span>
                  <span className="font-display font-bold text-xl text-emerald-600 block mt-1.5">
                    {efficiencyScore}/100
                  </span>
                </div>

                {/* 4. Grid Health */}
                <div className="bg-[#EFF4FF]/40 rounded-2xl p-4 text-center border border-[#EFF4FF]/40">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    GRID HEALTH
                  </span>
                  <span className="font-display font-bold text-xl text-indigo-900 block mt-1.5">
                    Stable
                  </span>
                </div>
              </div>

              {/* CARD 3 (EV Scheduled Charging in Dark Midnight background matching Screen 1) */}
              <div className="bg-gradient-to-tr from-[#0F1E32] to-[#1E3E62] text-white rounded-3xl p-6 shadow-xs relative overflow-hidden mt-6">
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                  <Car className="w-40 h-40" />
                </div>

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-sm">EV Scheduled Charging</h3>
                      <span className="text-[9px] text-emerald-300 font-bold uppercase">Off-Peak Optimized</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const flow = automations.find(a => a.id === 'flow-ev-charge');
                      if (flow) toggleAutomation(flow.id);
                    }}
                    className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none cursor-pointer ${
                      isEvScheduledActive ? 'bg-[#00d166]' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      isEvScheduledActive ? 'translate-x-5.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <p className="text-xs text-indigo-100/90 leading-relaxed pr-10">
                  Charges during lowest tariff rates between {scheduleTime.start} and {scheduleTime.end}. Reduces stress on the national grid of your localized node.
                </p>
              </div>

              {/* System Checkmark indicator footer */}
              <div className="flex items-center gap-2 justify-center py-4 text-xs text-slate-400 font-semibold border-t border-slate-100 mt-6">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>System algorithms are optimized for Northern European Grid Standards</span>
              </div>

            </section>

          </div>
        )}

        {/* TAB 4: AI ADVISOR COPILOT TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* AI Advisor Panel */}
            <section className="bg-white rounded-3xl p-6 shadow-xs flex flex-col h-[580px]">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#006d32]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#0B1C30]">EcoSync AI Copilot</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-medium">Gemini 3.5 Flash Active</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (window.confirm("Ingin mereset riwayat diskusi Anda dengan AI?")) {
                      setMessages([
                        {
                          id: 'welcome',
                          sender: 'assistant',
                          text: "Riwayat obrolan di-reset. Apa yang ingin Anda diskusikan tentang efisiensi energi atau air Anda hari ini?",
                          timestamp: Date.now()
                        }
                      ]);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                  title="Reset Obrolan"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Prompt Suggestion Pills */}
              {messages.length === 1 && (
                <div className="mb-4">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-2">Saran Pertanyaan Cepat:</span>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={askAiForWaterAdvice}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl text-3xs font-semibold text-slate-600 flex items-center justify-between transition-colors border border-transparent hover:border-[#EFF4FF] cursor-pointer"
                    >
                      <span>💧 Bagaimana cara menghemat penggunaan air saya hari ini?</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    
                    <button 
                      onClick={askAiForCarbonAdvice}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl text-3xs font-semibold text-slate-600 flex items-center justify-between transition-colors border border-transparent hover:border-[#EFF4FF] cursor-pointer"
                    >
                      <span>🌱 Bagaimana kompensasi emisi karbon saya bisa dimaksimalkan?</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button 
                      onClick={askAiForHvacOptimization}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl text-3xs font-semibold text-slate-600 flex items-center justify-between transition-colors border border-transparent hover:border-[#EFF4FF] cursor-pointer"
                    >
                      <span>❄️ Rekomendasikan jadwal hemat untuk HVAC pendingin ruangan.</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Messages scroll log */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-none">
                {messages.map(m => (
                  <div 
                    key={m.id} 
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#0B1C30] text-white rounded-tr-none'
                        : 'bg-slate-100 text-[#0B1C30] rounded-tl-none border border-[#EFF4FF]/50'
                    }`}>
                      <div className="whitespace-pre-line font-medium break-words">
                        {m.text}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1 px-1">
                      {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* AI response generating loading indicator */}
                {aiLoading && (
                  <div className="flex items-start">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <div className="flex gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                      </div>
                      <span className="text-3xs font-bold uppercase tracking-wider text-emerald-700 animate-pulse">EcoSync AI sedang memproses...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Send Chat Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2 pt-3 border-t border-slate-100"
              >
                <input
                  id="chat-input-text"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tanyakan optimasi, jadwal penghematan air..."
                  disabled={aiLoading}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-[#EFF4FF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all disabled:opacity-50"
                />
                
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || aiLoading}
                  className="w-10 h-10 rounded-xl bg-[#006d32] hover:bg-[#005124] text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>

            </section>
          </div>
        )}

      </main>

      {/* 3. INTERACTIVE FLOATING OR MODAL DIALOGS */}
      
      {/* EV SCHEDULER POPUP MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="font-display font-bold text-lg text-[#0B1C30]">Schedule Charging</h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Atur interval pengisian daya kendaraan listrik (EV) Anda ke waktu tarif listrik paling murah.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Mulai Jam (Mulai Off-Peak)</label>
                <input 
                  type="time" 
                  value={scheduleTime.start}
                  onChange={(e) => setScheduleTime({ ...scheduleTime, start: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Selesai Jam (Berakhir Off-Peak)</label>
                <input 
                  type="time" 
                  value={scheduleTime.end}
                  onChange={(e) => setScheduleTime({ ...scheduleTime, end: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                setShowScheduleModal(false);
                setAutomations(prev => prev.map(a => a.id === 'flow-ev-charge' ? { ...a, active: true } : a));
                alert(`Penjadwalan EV berhasil diaktifkan dari jam ${scheduleTime.start} hingga ${scheduleTime.end}!`);
              }}
              className="w-full bg-[#006d32] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              Simpan Jadwal Hemat
            </button>
          </div>
        </div>
      )}

      {/* NEW FLOW CREATION OVERLAY MODAL */}
      {showNewFlowModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="font-display font-bold text-lg text-[#0B1C30]">Create New Flow</h3>
              <button 
                onClick={() => setShowNewFlowModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFlow} className="space-y-3.5">
              <div>
                <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Nama Otomasi (Flow Name)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Air Conditioner Eco Schedule"
                  value={newFlowTitle}
                  onChange={(e) => setNewFlowTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Deskripsi Ringkas</label>
                <textarea 
                  placeholder="Contoh: Menurunkan daya kompresor AC saat suhu luar ruangan sejuk."
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Tipe Aliran</label>
                  <select 
                    value={newFlowType}
                    onChange={(e: any) => setNewFlowType(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="energy">⚡ Energi</option>
                    <option value="water">💧 Air</option>
                  </select>
                </div>

                <div>
                  <label className="text-3xs font-bold text-slate-400 block uppercase tracking-wide mb-1">Ikon Tampilan</label>
                  <select 
                    value={newFlowIcon}
                    onChange={(e: any) => setNewFlowIcon(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="zap">⚡ Lightning</option>
                    <option value="leaf">🌱 Daun Eco</option>
                    <option value="droplet">💧 Air Droplet</option>
                    <option value="car">🚗 Mobil EV</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-2 bg-[#006d32] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Aktifkan Otomasi Aliran Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. APPLE-STYLE BOTTOM NAVIGATION BAR (MATCHES SCREENSHOT NAV TABS EXACTLY) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 py-3 px-6 z-40 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          {/* TAB 1: DASHBOARD */}
          <button 
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center flex-1 transition-all focus:outline-none cursor-pointer ${
              activeTab === 'dashboard' ? 'text-[#006d32]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider mt-1 uppercase">DASHBOARD</span>
            {activeTab === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-[#006d32] mt-0.5" />}
          </button>

          {/* TAB 2: USAGE */}
          <button 
            id="nav-tab-usage"
            onClick={() => setActiveTab('usage')}
            className={`flex flex-col items-center flex-1 transition-all focus:outline-none cursor-pointer ${
              activeTab === 'usage' ? 'text-[#006d32]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider mt-1 uppercase">USAGE</span>
            {activeTab === 'usage' && <span className="w-1.5 h-1.5 rounded-full bg-[#006d32] mt-0.5" />}
          </button>

          {/* TAB 3: AUTOMATIONS */}
          <button 
            id="nav-tab-automations"
            onClick={() => setActiveTab('automations')}
            className={`flex flex-col items-center flex-1 transition-all focus:outline-none cursor-pointer ${
              activeTab === 'automations' ? 'text-[#006d32]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider mt-1 uppercase">AUTOMATIONS</span>
            {activeTab === 'automations' && <span className="w-1.5 h-1.5 rounded-full bg-[#006d32] mt-0.5" />}
          </button>

          {/* TAB 4: AI COPILOT */}
          <button 
            id="nav-tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center flex-1 transition-all focus:outline-none cursor-pointer ${
              activeTab === 'settings' ? 'text-[#006d32]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider mt-1 uppercase">AI COPILOT</span>
            {activeTab === 'settings' && <span className="w-1.5 h-1.5 rounded-full bg-[#006d32] mt-0.5" />}
          </button>

        </div>
      </nav>

    </div>
  );
}
