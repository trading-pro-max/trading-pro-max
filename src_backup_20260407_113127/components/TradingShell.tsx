'use client';

import { Activity, BarChart3, Shield, Zap, TrendingUp, Wallet, Bot, Lock } from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import LiveMarket from '@/components/LiveMarket';

const equityData = [
  { time: '09:00', equity: 1000 },
  { time: '10:00', equity: 1040 },
  { time: '11:00', equity: 1025 },
  { time: '12:00', equity: 1090 },
  { time: '13:00', equity: 1140 },
  { time: '14:00', equity: 1185 },
  { time: '15:00', equity: 1240 },
];

const signalData = [
  { pair: 'EUR/USD', win: 78 },
  { pair: 'BTC/USD', win: 82 },
  { pair: 'XAU/USD', win: 75 },
  { pair: 'GBP/JPY', win: 71 },
];

const allocation = [
  { name: 'Forex', value: 42, color: '#6366f1' },
  { name: 'Crypto', value: 28, color: '#22c55e' },
  { name: 'Commodities', value: 18, color: '#f59e0b' },
  { name: 'Indices', value: 12, color: '#ef4444' },
];

const signals = [
  { pair: 'EUR/USD', action: 'CALL', confidence: '87%', status: 'High Quality' },
  { pair: 'BTC/USD', action: 'PUT', confidence: '81%', status: 'Momentum Shift' },
  { pair: 'XAU/USD', action: 'CALL', confidence: '76%', status: 'Breakout Setup' },
  { pair: 'GBP/JPY', action: 'PUT', confidence: '73%', status: 'AI Confirmed' },
];

function Card({ title, children, icon }: any) {
  return (
    <div style={{
      background:'#111827',
      border:'1px solid #1f2937',
      borderRadius:20,
      padding:20,
      boxShadow:'0 10px 30px rgba(0,0,0,.25)'
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:14,color:'#9ca3af',fontWeight:600}}>{title}</div>
        <div style={{color:'#60a5fa'}}>{icon}</div>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub }: any) {
  return (
    <div style={{
      background:'#0b1220',
      border:'1px solid #1f2937',
      borderRadius:18,
      padding:18
    }}>
      <div style={{fontSize:12,color:'#94a3b8'}}>{label}</div>
      <div style={{fontSize:28,fontWeight:800,color:'white',marginTop:6}}>{value}</div>
      <div style={{fontSize:12,color:'#22c55e',marginTop:6}}>{sub}</div>
    </div>
  );
}

export default function TradingShell() {
  return (
    <main style={{
      minHeight:'100vh',
      background:'linear-gradient(180deg,#030712 0%,#0b1120 100%)',
      color:'white',
      padding:24,
      fontFamily:'Arial'
    }}>
      <div style={{maxWidth:1500,margin:'0 auto',display:'grid',gap:20}}>
        <div style={{
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          gap:16,
          flexWrap:'wrap'
        }}>
          <div>
            <div style={{fontSize:12,letterSpacing:3,color:'#60a5fa',textTransform:'uppercase'}}>Trading Pro Max</div>
            <h1 style={{margin:'8px 0 0',fontSize:42}}>Global Trading Command Center</h1>
            <div style={{color:'#9ca3af',marginTop:8}}>AI signals, protected access, premium dashboard, portfolio intelligence.</div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <a href="/premium" style={{padding:'12px 18px',borderRadius:12,border:'none',background:'#2563eb',color:'white',fontWeight:700,textDecoration:'none'}}>Premium Access</a>
            <a href="/login" style={{padding:'12px 18px',borderRadius:12,border:'1px solid #374151',background:'#111827',color:'white',fontWeight:700,textDecoration:'none'}}>Secure Login</a>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>
          <Metric label="Account Equity" value=",240" sub="+24.0% growth" />
          <Metric label="Win Rate" value="79.4%" sub="+3.2% this week" />
          <Metric label="Active Signals" value="12" sub="4 premium-grade now" />
          <Metric label="Risk Score" value="Low" sub="Portfolio protected" />
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:20}}>
          <Card title="Equity Curve" icon={<TrendingUp size={18} />}>
            <div style={{height:300}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.7}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="equity" stroke="#60a5fa" fill="url(#eq)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Allocation" icon={<Wallet size={18} />}>
            <div style={{height:300}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={100}>
                    {allocation.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <Card title="AI Signal Performance" icon={<Bot size={18} />}>
            <div style={{height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signalData}>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis dataKey="pair" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="win" fill="#22c55e" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Protection Layer" icon={<Shield size={18} />}>
            <div style={{display:'grid',gap:14}}>
              <div style={{padding:16,borderRadius:16,background:'#0b1220',border:'1px solid #1f2937'}}>
                <div style={{fontWeight:700}}>Risk Engine</div>
                <div style={{color:'#9ca3af',marginTop:6}}>Dynamic stop logic, trade cap, allocation guardrails.</div>
              </div>
              <div style={{padding:16,borderRadius:16,background:'#0b1220',border:'1px solid #1f2937'}}>
                <div style={{fontWeight:700}}>Session Control</div>
                <div style={{color:'#9ca3af',marginTop:6}}>Premium access flow connected to paid account state.</div>
              </div>
              <div style={{padding:16,borderRadius:16,background:'#0b1220',border:'1px solid #1f2937'}}>
                <div style={{fontWeight:700}}>Execution Safety</div>
                <div style={{color:'#9ca3af',marginTop:6}}>Only validated actions pass through the trading workflow.</div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Live AI Signals" icon={<Zap size={18} />}>
          <div style={{display:'grid',gap:12}}>
            {signals.map((s, i) => (
              <div key={i} style={{
                display:'grid',
                gridTemplateColumns:'1.1fr .7fr .7fr 1fr',
                gap:12,
                padding:16,
                borderRadius:16,
                background:'#0b1220',
                border:'1px solid #1f2937',
                alignItems:'center'
              }}>
                <div>
                  <div style={{fontWeight:800,fontSize:18}}>{s.pair}</div>
                  <div style={{fontSize:12,color:'#94a3b8'}}>AI pattern confirmation active</div>
                </div>
                <div style={{fontWeight:700,color:s.action === 'CALL' ? '#22c55e' : '#ef4444'}}>{s.action}</div>
                <div style={{fontWeight:700}}>{s.confidence}</div>
                <div style={{color:'#60a5fa',fontWeight:700}}>{s.status}</div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:20}}>
          <Card title="Market Scanner" icon={<Activity size={18} />}>
            <div style={{color:'#9ca3af'}}>Real-time scanner for breakouts, momentum reversals, and volatility spikes.</div>
          </Card>
          <Card title="Portfolio Analytics" icon={<BarChart3 size={18} />}>
            <div style={{color:'#9ca3af'}}>Track equity growth, strategy contribution, and premium account performance.</div>
          </Card>
          <Card title="Premium Engine" icon={<Lock size={18} />}>
            <div style={{color:'#9ca3af'}}>Paid access, protected dashboard, ready for live productization.</div>
          </Card>
        </div>

        <LiveMarket />
      </div>
    </main>
  );
}
