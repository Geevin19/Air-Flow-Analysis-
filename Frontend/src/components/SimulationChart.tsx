import {
  ResponsiveContainer, AreaChart, Area,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { FlowDataPoint, PressurePoint } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  .ch-card{background:#ffffff;border:1px solid #dde3ec;border-radius:14px;padding:1.4rem;position:relative;overflow:hidden;box-shadow:0 2px 10px rgba(59,111,212,.05);}
  .ch-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--cg,linear-gradient(90deg,#3b6fd4,#5b9bd5));}
  .ch-title{font-family:'Inter',sans-serif;font-size:.9rem;font-weight:600;color:#1a2333;margin-bottom:.25rem;}
  .ch-sub{font-size:.75rem;color:#6b7a90;margin-bottom:1.1rem;}
  .recharts-cartesian-grid-horizontal line,.recharts-cartesian-grid-vertical line{stroke:#dde3ec;}
  .recharts-text{fill:#6b7a90;font-family:'Inter',sans-serif;font-size:11px;}
`

const tip = {
  contentStyle: { background:'#fff', border:'1px solid #dde3ec', borderRadius:'8px', fontFamily:"'Inter',sans-serif", fontSize:'12px', color:'#1a2333' },
  itemStyle: { color:'#44546a' },
}

export function FlowVelocityChart({ data }: { data: FlowDataPoint[] }) {
  return (
    <>
      <style>{S}</style>
      <div className="ch-card" style={{'--cg':'linear-gradient(90deg,#3b6fd4,#5b9bd5)'} as React.CSSProperties}>
        <div className="ch-title">Flow Velocity Profile</div>
        <div className="ch-sub">Velocity & turbulence intensity along flow path</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{top:4,right:8,left:-10,bottom:0}}>
            <defs>
              <linearGradient id="gVel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b6fd4" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b6fd4" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="gTurb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#5b9bd5" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#5b9bd5" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="x" tickFormatter={v => `${v}m`}/>
            <YAxis/>
            <Tooltip {...tip} labelFormatter={l => `Position: ${l}m`}/>
            <Legend/>
            <Area type="monotone" dataKey="velocity"   name="Velocity (m/s)" stroke="#3b6fd4" fill="url(#gVel)"  strokeWidth={2} dot={false}/>
            <Area type="monotone" dataKey="turbulence" name="Turbulence"      stroke="#5b9bd5" fill="url(#gTurb)" strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export function PressureDistributionChart({ data }: { data: PressurePoint[] }) {
  return (
    <>
      <style>{S}</style>
      <div className="ch-card" style={{'--cg':'linear-gradient(90deg,#5b7fd4,#5b9bd5)'} as React.CSSProperties}>
        <div className="ch-title">Pressure Distribution</div>
        <div className="ch-sub">Upper vs lower surface pressure coefficient</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{top:4,right:8,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="position" tickFormatter={v => `${(v*100).toFixed(0)}%`}/>
            <YAxis/>
            <Tooltip {...tip} labelFormatter={l => `Position: ${(Number(l)*100).toFixed(0)}%`}/>
            <Legend/>
            <Line type="monotone" dataKey="upper" name="Upper Surface" stroke="#3b6fd4" strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="lower" name="Lower Surface" stroke="#5b9bd5" strokeWidth={2} dot={false} strokeDasharray="4 2"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export function DynamicPressureChart({ data }: { data: FlowDataPoint[] }) {
  return (
    <>
      <style>{S}</style>
      <div className="ch-card" style={{'--cg':'linear-gradient(90deg,#5b9bd5,#2e9e6b)'} as React.CSSProperties}>
        <div className="ch-title">Dynamic Pressure Profile</div>
        <div className="ch-sub">Pressure variation along the flow axis</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{top:4,right:8,left:-10,bottom:0}}>
            <defs>
              <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#3b6fd4"/>
                <stop offset="100%" stopColor="#5b9bd5"/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="x" tickFormatter={v => `${v}m`}/>
            <YAxis/>
            <Tooltip {...tip} formatter={(v: number) => [v.toFixed(2)+' Pa','Pressure']} labelFormatter={l => `Position: ${l}m`}/>
            <Bar dataKey="pressure" name="Pressure (Pa)" fill="url(#gBar)" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export function VelocityProfileChart({ data }: { data: FlowDataPoint[] }) {
  return (
    <>
      <style>{S}</style>
      <div className="ch-card" style={{'--cg':'linear-gradient(90deg,#3b6fd4,#5b7fd4)'} as React.CSSProperties}>
        <div className="ch-title">Velocity & Pressure Combined</div>
        <div className="ch-sub">Relationship between local velocity and pressure</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{top:4,right:8,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="velocity" tickFormatter={v => v.toFixed(1)}/>
            <YAxis/>
            <Tooltip {...tip}/>
            <Legend/>
            <Line type="monotone" dataKey="pressure"   name="Pressure (Pa)" stroke="#3b6fd4" strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="turbulence" name="Turbulence"     stroke="#5b9bd5" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}