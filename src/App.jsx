import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { SageBackend } from './sageBackend.js';
import { BGPattern } from './BGPattern.jsx';

// Motion: CSS variables + GPU-friendly transitions (Framer Motion needs Vite/webpack + one React bundle).
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

function MotionEnter({ as: Tag = 'div', children, className = '', delay = 0, style, ...rest }) {
  const reduced = usePrefersReducedMotion();
  const st = { ...(style || {}) };
  if (!reduced) st.animationDelay = `${delay}ms`;
  return (
    <Tag
      className={`motion-enter${reduced ? ' motion-enter--instant' : ''}${className ? ` ${className}` : ''}`}
      style={st}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function AppLoadingScreen() {
  return (
    <div className="sage-onboarding-bg" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <MotionEnter className="stagger-children" style={{ textAlign:'center', maxWidth:220 }}>
        <div className="skeleton-shimmer" style={{ width:58, height:58, borderRadius:18, margin:'0 auto 18px' }} />
        <div className="skeleton-shimmer" style={{ height:14, width:'75%', margin:'0 auto 10px' }} />
        <div className="skeleton-shimmer" style={{ height:10, width:'50%', margin:'0 auto' }} />
        <p className="mono" style={{ marginTop:22, fontSize:11, color:'var(--muted)' }}>Loading digital twin…</p>
      </MotionEnter>
    </div>
  );
}

// â”€â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ZONES = ['ICU', 'Ward', 'Emergency'];
const ZONE_BED_COUNTS = { ICU: 12, Ward: 24, Emergency: 12 };
const ZONE_COLORS = { ICU: 'var(--purple)', Ward: 'var(--green)', Emergency: 'var(--red)' };
const ZONE_DESC = {
  ICU: 'Intensive Care — Critical monitoring',
  Ward: 'General Ward — Standard recovery',
  Emergency: 'Emergency Room — Urgent intake',
};
const NAMES = ['Arjun Mehta','Priya Sharma','Rahul Verma','Sneha Iyer','Vikram Nair','Ananya Patel','Suresh Kumar','Divya Rao','Kiran Joshi','Meera Gupta','Rohit Singh','Fatima Khan'];
const REASONS = ['Post-op monitoring','Cardiac event','Trauma','Respiratory distress','Fracture','Infection','Stroke recovery','Appendectomy','Dengue fever','Hypertension crisis','Renal failure','Pediatric care'];

const generateId = () => Math.random().toString(36).slice(2, 9);
const timeStr = () => new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

function initBeds() {
  const beds = {};
  ZONES.forEach(zone => {
    for (let n = 1; n <= ZONE_BED_COUNTS[zone]; n++) {
      const id = `${zone[0]}${n}`;
      const roll = Math.random();
      let status = 'available';
      if (roll < 0.28) status = 'occupied';
      else if (roll < 0.38) status = 'critical';
      else if (roll < 0.44) status = 'cleaning';
      beds[id] = {
        id, zone, number: n, status,
        patient: (status === 'occupied' || status === 'critical') ? {
          id: generateId(),
          name: NAMES[Math.floor(Math.random() * NAMES.length)],
          reason: REASONS[Math.floor(Math.random() * REASONS.length)],
          severity: status === 'critical' ? 'Critical' : 'Normal',
          weight: Math.floor(50 + Math.random() * 50),
          admittedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        } : null,
      };
    }
  });
  return beds;
}

/** Keep bed state for enabled zones; drop disabled zones; add empty beds for newly enabled zones. */
function pruneBedsForFloors(beds, floors) {
  const next = {};
  Object.values(beds).forEach(b => {
    if (floors[b.zone]) next[b.id] = b;
  });
  ZONES.filter(z => floors[z]).forEach(zone => {
    for (let n = 1; n <= ZONE_BED_COUNTS[zone]; n++) {
      const id = `${zone[0]}${n}`;
      if (!next[id]) next[id] = { id, zone, number: n, status: 'available', patient: null };
    }
  });
  return next;
}

// â”€â”€â”€ ICON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Icon({ name, size = 16 }) {
  const icons = {
    hospital: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
    bed:      <><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></>,
    alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    check:    <polyline points="20 6 9 17 4 12"/>,
    chevron:  <polyline points="9 18 15 12 9 6"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    brain:    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>,
    cpu:      <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    home:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    bolt:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    info:     <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    zap:      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    clock:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
}

// â”€â”€â”€ ONBOARDING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OnboardingPage({ onSetup, initialSetup, onCancel }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [floors, setFloors] = useState({ ICU: true, Ward: true, Emergency: true });
  const [passwords, setPasswords] = useState({ ICU: '', Ward: '', Emergency: '' });
  const [primaryFloor, setPrimaryFloor] = useState('ICU');
  const [err, setErr] = useState('');

  useLayoutEffect(() => {
    if (!initialSetup) return;
    setName(initialSetup.name || '');
    setFloors(() => {
      const o = {};
      ZONES.forEach(z => { o[z] = initialSetup.floors ? !!initialSetup.floors[z] : true; });
      return o;
    });
    setPasswords(p => ({ ...p, ...(initialSetup.passwords || {}) }));
    setPrimaryFloor(initialSetup.primaryFloor && ZONES.includes(initialSetup.primaryFloor) ? initialSetup.primaryFloor : 'ICU');
    setStep(1);
    setErr('');
  }, [initialSetup]);

  const toggle = (z) => setFloors(p => ({ ...p, [z]: !p[z] }));

  const goStep2 = () => {
    if (!name.trim()) { setErr('Please enter a hospital name.'); return; }
    setErr(''); setStep(2);
  };

  const goStep3 = () => {
    const active = ZONES.filter(z => floors[z]);
    if (active.length === 0) { setErr('Select at least one floor.'); return; }
    if (!floors[primaryFloor]) setPrimaryFloor(active[0]);
    setErr(''); setStep(3);
  };

  const handleSubmit = () => {
    onSetup({ name: name.trim(), floors, passwords, primaryFloor });
  };

  const zoneColorKey = { ICU: 'purple', Ward: 'green', Emergency: 'red' };

  return (
    <div className="sage-onboarding-bg" style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, position:'relative' }}>
      {onCancel && (
        <MotionEnter delay={0} style={{ position:'absolute', top:18, left:18, zIndex:5 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ fontSize:12, gap:6 }}>
            <Icon name="chevronLeft" size={14}/> Back to dashboard
          </button>
        </MotionEnter>
      )}
      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }} className="stagger-children">

        {/* Logo */}
        <MotionEnter delay={40} style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <div style={{ width:44, height:44, borderRadius:8, background:'var(--brand-dim)', border:'1px solid rgba(229,9,20,0.5)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 32px rgba(229,9,20,0.35)', color:'var(--brand)' }}>
              <Icon name="hospital" size={18}/>
            </div>
            <span className="syne" style={{ fontSize:26, fontWeight:800, color:'var(--text)', letterSpacing:'-1px' }}>SAGE</span>
          </div>
          <div className="font-head" style={{ fontSize:14, color:'var(--muted)', fontWeight:500 }}>Hospital Digital Twin · Setup</div>
        </MotionEnter>

        {/* Step indicators */}
        <MotionEnter delay={90} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:22 }}>
          {[{n:1,l:'Hospital'},{n:2,l:'Floors'},{n:3,l:'Confirm'}].map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontFamily:'var(--font-mono)', fontWeight:700,
                  background: step > s.n ? 'var(--brand)' : step === s.n ? 'var(--brand-dim)' : 'var(--surface)',
                  border: `1px solid ${step >= s.n ? 'var(--brand)' : 'var(--border2)'}`,
                  color: step > s.n ? '#fff' : step === s.n ? 'var(--brand)' : 'var(--muted)',
                  transition:'all 0.3s',
                }}>
                  {step > s.n ? <Icon name="check" size={10}/> : s.n}
                </div>
                <span style={{ fontSize:9, color: step >= s.n ? '#fff' : 'var(--muted)', whiteSpace:'nowrap', fontWeight: step >= s.n ? 700 : 500 }}>{s.l}</span>
              </div>
              {i < 2 && <div style={{ flex:1, height:1, background: step > s.n ? 'var(--brand)' : 'var(--border)', margin:'0 4px', marginBottom:14, maxWidth:40, transition:'background 0.4s' }}/>}
            </React.Fragment>
          ))}
        </MotionEnter>

        {/* Card */}
        <MotionEnter delay={140} className="ui-card" style={{ padding:24, borderRadius:'var(--radius-xl)' }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fade">
              <h2 className="nf-onboard-title font-head">Name your hospital</h2>
              <p style={{ color:'var(--muted)', fontSize:12, marginBottom:18 }}>This becomes your digital twin identifier.</p>
              <label style={{ fontSize:10, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em' }}>Hospital Name</label>
              <input className="input-field" placeholder="e.g. Apollo General Hospital"
                value={name} onChange={e => { setName(e.target.value); setErr(''); }}
                onKeyDown={e => e.key === 'Enter' && goStep2()} autoFocus/>
              {err && <div style={{ color:'var(--red)', fontSize:11, marginTop:7 }}>{err}</div>}
              <button className="btn btn-green" style={{ width:'100%', justifyContent:'center', padding:'9px 0', marginTop:16, fontSize:13 }} onClick={goStep2}>
                Continue <Icon name="chevron" size={12}/>
              </button>
            </div>
          )}

          {/* STEP 2 — Floor selection with visual cards */}
          {step === 2 && (
            <div className="animate-fade">
              <h2 className="nf-onboard-title font-head">Select floors</h2>
              <p style={{ color:'var(--muted)', fontSize:12, marginBottom:16 }}>Choose active units and set a primary floor.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                {ZONES.map(zone => {
                  const ck = zoneColorKey[zone];
                  const sel = floors[zone];
                  return (
                    <div key={zone}
                      className={`onboard-card ${sel ? `selected-${zone.toLowerCase()}` : ''}`}
                      onClick={() => { toggle(zone); setErr(''); }}>
                      <input type="checkbox" checked={sel} readOnly
                        style={{ accentColor: `var(--${ck})`, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13, color: sel ? `var(--${ck})` : 'var(--muted)' }}>{zone}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{ZONE_DESC[zone]} · {ZONE_BED_COUNTS[zone]} beds</div>
                      </div>
                      {sel && (
                        <input className="input-field" style={{ width:120, padding:'4px 9px', fontSize:11 }}
                          placeholder="Password (opt.)" type="password"
                          value={passwords[zone]}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setPasswords(p => ({ ...p, [zone]: e.target.value }))}/>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Primary floor */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, color:'var(--muted)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em' }}>Primary Floor (opens first)</label>
                <div style={{ display:'flex', gap:6 }}>
                  {ZONES.filter(z => floors[z]).map(zone => {
                    const ck = zoneColorKey[zone];
                    const active = primaryFloor === zone;
                    return (
                      <button key={zone} onClick={() => setPrimaryFloor(zone)} style={{
                        flex:1, padding:'6px 4px', borderRadius:6, fontSize:11, fontWeight:600,
                        border: `1px solid ${active ? `var(--${ck})` : 'var(--border)'}`,
                        background: active ? `var(--${ck}-bg)` : 'transparent',
                        color: active ? `var(--${ck})` : 'var(--muted)',
                        cursor:'pointer', transition:'all 0.15s',
                      }}>{zone}</button>
                    );
                  })}
                </div>
              </div>
              {err && <div style={{ color:'var(--red)', fontSize:11, marginBottom:10 }}>{err}</div>}
              <div style={{ display:'flex', gap:7 }}>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-green" style={{ flex:2, justifyContent:'center', padding:'9px 0' }} onClick={goStep3}>
                  Continue <Icon name="chevron" size={12}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Confirm */}
          {step === 3 && (
            <div className="animate-fade">
              <h2 className="nf-onboard-title font-head">Ready to launch</h2>
              <p style={{ color:'var(--muted)', fontSize:12, marginBottom:16 }}>Review your configuration.</p>
              <div style={{ background:'var(--surface)', borderRadius:10, padding:14, marginBottom:14, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Hospital', val: <span style={{ fontWeight:600 }}>{name}</span> },
                  { label:'Active floors', val:
                    <div style={{ display:'flex', gap:4 }}>
                      {ZONES.filter(z=>floors[z]).map(z => {
                        const ck = zoneColorKey[z];
                        return <span key={z} style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:`var(--${ck}-bg)`, color:`var(--${ck})` }}>{z}</span>;
                      })}
                    </div>
                  },
                  { label:'Primary floor', val: <span style={{ color: ZONE_COLORS[primaryFloor], fontWeight:600 }}>{primaryFloor}</span> },
                  { label:'Total beds', val: <span style={{ fontWeight:600 }}>{ZONES.filter(z=>floors[z]).reduce((a,z)=>a+ZONE_BED_COUNTS[z],0)}</span> },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, alignItems:'center' }}>
                    <span style={{ color:'var(--muted)' }}>{label}</span>
                    {val}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-green" style={{ flex:2, justifyContent:'center', padding:'10px 0', fontSize:13 }} onClick={handleSubmit}>
                  <Icon name="zap" size={13}/> Launch Digital Twin
                </button>
              </div>
            </div>
          )}
        </MotionEnter>

        <p className="mono" style={{ textAlign:'center', fontSize:9, color:'var(--muted)', marginTop:14, opacity:0.75 }}>
          SAGE v2.2 · HOSPITAL DIGITAL TWIN · AI-POWERED
        </p>
      </div>
    </div>
  );
}

// â”€â”€â”€ BED CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BedCard({ bed, onClick }) {
  const [hovered, setHovered] = useState(false);
  const clickable = bed.status !== 'available';
  const statusConfig = {
    available: { color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)',  label:'Available' },
    occupied:  { color:'var(--red)',    bg:'var(--red-bg)',    border:'var(--red-border)',    label:'Occupied' },
    cleaning:  { color:'var(--yellow)', bg:'var(--yellow-bg)', border:'var(--yellow-border)', label:'Cleaning' },
    critical:  { color:'var(--purple)', bg:'var(--purple-bg)', border:'var(--purple-border)', label:'Critical' },
  };
  const cfg = statusConfig[bed.status] || statusConfig.available;

  return (
    <div className="tooltip-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div
        onClick={() => onClick(bed)}
        className={`ui-bed-tile${clickable ? ' ui-bed-tile--clickable' : ''}`}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          cursor: clickable ? 'pointer' : 'default',
          opacity: bed.status === 'cleaning' ? 0.75 : 1,
        }}
      >
        <Icon name="bed" size={17}/>
        <span className="mono" style={{ fontSize:9, color:cfg.color, letterSpacing:'0.04em' }}>
          {bed.zone[0]}{bed.number}
        </span>
        <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }}/>
      </div>
      {hovered && (
        <div className="tooltip-box">
          <div style={{ fontWeight:700, marginBottom:3, color:cfg.color }}>{bed.zone} · Bed {bed.number}</div>
          <div style={{ color:'var(--muted)', marginBottom:2 }}>Status: <span style={{ color:cfg.color }}>{cfg.label}</span></div>
          {bed.patient && (
            <>
              <div style={{ color:'var(--text)' }}>{bed.patient.name}</div>
              <div style={{ color:'var(--muted)', fontSize:10 }}>{bed.patient.reason}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ BED GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BedGrid({ beds, onBedClick, hospital, activeFloor, setActiveFloor }) {
  const enabledZones = hospital?.floors
    ? Object.entries(hospital.floors).filter(([,v]) => v).map(([k]) => k)
    : ZONES;
  const zoneRefs = useRef({});

  useEffect(() => {
    if (activeFloor && activeFloor !== 'All' && zoneRefs.current[activeFloor]) {
      zoneRefs.current[activeFloor].scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }, [activeFloor]);

  const counts = (zone) => {
    const zb = Object.values(beds).filter(b => b.zone === zone);
    return {
      total: zb.length,
      available: zb.filter(b => b.status === 'available').length,
      occupied:  zb.filter(b => b.status === 'occupied').length,
      critical:  zb.filter(b => b.status === 'critical').length,
      cleaning:  zb.filter(b => b.status === 'cleaning').length,
    };
  };

  const visibleZones = activeFloor === 'All' ? enabledZones : enabledZones.filter(z => z === activeFloor);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'transparent' }}>
      <div style={{ padding:'14px 20px 6px', flexShrink:0 }}>
        <span className="nf-trending-label">Live bed map</span>
      </div>
      {/* Floor tabs */}
      <div className="sage-floor-toolbar">
        <button className={`floor-tab ${activeFloor === 'All' ? 'active-all' : ''}`}
          onClick={() => setActiveFloor('All')}>All Floors</button>
        {enabledZones.map(zone => (
          <button key={zone}
            className={`floor-tab ${activeFloor === zone ? `active-${zone.toLowerCase()}` : ''}`}
            onClick={() => setActiveFloor(zone)}>
            {zone}
          </button>
        ))}
        {/* Zone legend */}
        <div style={{ marginLeft:'auto', display:'flex', gap:12, alignItems:'center' }}>
          {[['green','Available'],['red','Occupied'],['yellow','Cleaning'],['purple','Critical']].map(([c,l]) => (
            <div key={c} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:`var(--${c})` }}/>
              <span style={{ fontSize:10, color:'var(--muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable bed area */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', background:'transparent' }} className="scroll-panel">
        {visibleZones.map(zone => {
          const c = counts(zone);
          const zoneBeds = Object.values(beds).filter(b => b.zone === zone);
          const occ = Math.round((c.occupied + c.critical) / c.total * 100);
          const isActive = activeFloor === zone;
          const zc = ZONE_COLORS[zone];
          return (
            <div key={zone} className="bed-grid-zone"
              ref={el => zoneRefs.current[zone] = el}
              style={{
                borderRadius:10,
                border: isActive ? `1px solid ${zc}22` : '1px solid transparent',
                padding: isActive ? '12px' : '0',
                background: isActive ? `${zc === 'var(--purple)' ? 'rgba(139,114,200,0.04)' : zc === 'var(--green)' ? 'rgba(62,201,122,0.03)' : 'rgba(224,85,104,0.03)'}` : 'transparent',
                transition:'all 0.25s', marginBottom:18,
              }}>
              {/* Zone Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:2, height:13, borderRadius:1, background:zc }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:zc }}>{zone}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ height:2, background:'var(--surface2)', borderRadius:1, overflow:'hidden' }}>
                    <div style={{ width:`${occ}%`, height:'100%', borderRadius:1, background:zc, transition:'width 0.5s', opacity:0.6 }}/>
                  </div>
                </div>
                <span className="mono" style={{ fontSize:10, color:'var(--muted)' }}>{occ}%</span>
                <div style={{ display:'flex', gap:7, fontSize:10, color:'var(--muted)' }}>
                  <span style={{ color:'var(--green)'  }}>{c.available} free</span>
                  <span>·</span>
                  <span style={{ color:'var(--red)'    }}>{c.occupied} occ</span>
                  {c.critical > 0 && <><span>·</span><span style={{ color:'var(--purple)' }}>{c.critical} crit</span></>}
                  {c.cleaning > 0 && <><span>·</span><span style={{ color:'var(--yellow)' }}>{c.cleaning} clean</span></>}
                </div>
              </div>
              <div className="bed-grid-cells">
                {zoneBeds.map(bed => (
                  <BedCard key={bed.id} bed={bed} onClick={onBedClick}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ PATIENT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PatientModal({ beds, onAdmit, onClose }) {
  const [form, setForm] = useState({ name:'', weight:'', reason:'', severity:'Normal', unit:'Auto' });
  const [err, setErr] = useState('');
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }));

  const getAvailableBed = (unit, severity) => {
    const preferred = severity === 'Critical' ? 'ICU' : severity === 'Urgent' ? 'Emergency' : 'Ward';
    const zone = unit === 'Auto' ? preferred : unit;
    const available = Object.values(beds).filter(b => b.zone === zone && b.status === 'available');
    if (available.length > 0) return { bed: available[0], zone };
    for (const z of ZONES) {
      const fb = Object.values(beds).filter(b => b.zone === z && b.status === 'available');
      if (fb.length) return { bed: fb[0], zone: z };
    }
    return null;
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { setErr('Patient name is required.'); return; }
    const result = getAvailableBed(form.unit, form.severity);
    if (!result) { setErr('No available beds in any zone.'); return; }
    onAdmit({
      id: generateId(), name: form.name.trim(),
      weight: form.weight || '—', reason: form.reason || 'General admission',
      severity: form.severity, admittedAt: new Date().toISOString(),
    }, result.bed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-slide-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 className="font-head" style={{ fontSize:16, fontWeight:700 }}>Admit Patient</h3>
          <button type="button" className="btn btn-ghost" style={{ padding:'4px 8px' }} onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Patient Name *', key:'name', type:'text', placeholder:'Full name' },
            { label:'Weight (kg)', key:'weight', type:'number', placeholder:'e.g. 65' },
            { label:'Chief Complaint', key:'reason', type:'text', placeholder:'e.g. Chest pain' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
              <input className="input-field" type={type} placeholder={placeholder}
                value={form[key]} onChange={e => set(key, e.target.value)}/>
            </div>
          ))}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Severity</label>
              <select className="input-field" value={form.severity} onChange={e => set('severity', e.target.value)}>
                {['Normal','Urgent','Critical'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>Unit</label>
              <select className="input-field" value={form.unit} onChange={e => set('unit', e.target.value)}>
                <option value="Auto">Auto-assign</option>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
          </div>
        </div>
        {err && <div style={{ color:'var(--red)', fontSize:11, marginTop:10 }}>{err}</div>}
        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-green" style={{ flex:2, justifyContent:'center' }} onClick={handleSubmit}>
            <Icon name="plus" size={13}/> Admit Patient
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ PATIENT DETAIL PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PatientDetailPanel({ bed, onClose, onDischarge, onUpdateStatus }) {
  if (!bed || !bed.patient) return null;
  const p = bed.patient;
  const admitted = new Date(p.admittedAt);
  const hours = Math.floor((Date.now() - admitted) / 3600000);
  const statusColors = { available:'var(--green)', occupied:'var(--red)', cleaning:'var(--yellow)', critical:'var(--purple)' };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-slide-up" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:600 }}>{p.name}</h3>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{bed.zone} · Bed #{bed.number}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding:'4px 8px' }} onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div style={{ background:'var(--surface)', borderRadius:10, padding:14, marginBottom:14 }}>
          {[
            { label:'Status', val: <span style={{ color:statusColors[bed.status], fontWeight:600, textTransform:'capitalize' }}>{bed.status}</span> },
            { label:'Reason', val: p.reason },
            { label:'Severity', val: p.severity },
            { label:'Weight', val: p.weight + ' kg' },
            { label:'Duration', val: `${hours}h ${Math.floor((Date.now()-admitted)/60000)%60}m` },
          ].map(({ label, val }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--muted)' }}>{label}</span>
              <span style={{ fontWeight:500 }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:7, marginBottom:10 }}>
          {['occupied','critical','cleaning'].map(s => (
            <button key={s} onClick={() => { onUpdateStatus(bed.id, s); onClose(); }}
              className="btn btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:11,
                color: statusColors[s], borderColor: `${statusColors[s]}44`,
              }}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-red" style={{ width:'100%', justifyContent:'center' }}
          onClick={() => { onDischarge(bed.id); onClose(); }}>
          Discharge Patient
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ EVENT FEED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EventFeed({ events }) {
  const feedRef = useRef();
  const sevColors = { critical:'var(--red)', warning:'var(--yellow)', success:'var(--green)', info:'var(--blue)', ai:'var(--purple)' };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div className="sage-panel-header">
        <Icon name="activity" size={12}/>
        <span className="font-head" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em' }}>EVENT FEED</span>
        <span className="mono" style={{ fontSize:9, color:'var(--muted)', marginLeft:'auto' }}>{events.length}</span>
      </div>
      <div ref={feedRef} className="scroll-panel" style={{ flex:1, padding:'7px 13px' }}>
        {events.length === 0
          ? <div style={{ color:'var(--muted)', fontSize:12, textAlign:'center', paddingTop:18 }}>No events yet</div>
          : events.map((ev, i) => (
            <div key={ev.id} className="event-item" style={{ animationDelay: `${Math.min(i, 12) * 0.035}s` }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:sevColors[ev.severity]||'var(--muted)', flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'var(--text)', lineHeight:'1.4' }}>{ev.message}</div>
                <div className="mono" style={{ fontSize:9, color:'var(--muted)', marginTop:2 }}>{ev.time}</div>
              </div>
              <span className="tag" style={{ background:`${sevColors[ev.severity]||'var(--muted)'}18`, color:sevColors[ev.severity]||'var(--muted)', fontSize:8, flexShrink:0 }}>{ev.type}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// â”€â”€â”€ AI INSIGHTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AIInsightsPanel({ beds, events }) {
  const insights = [];
  const zones = {};
  ZONES.forEach(zone => {
    const zb = Object.values(beds).filter(b => b.zone === zone);
    zones[zone] = {
      total: zb.length,
      occupied: zb.filter(b => b.status === 'occupied').length,
      critical: zb.filter(b => b.status === 'critical').length,
      cleaning: zb.filter(b => b.status === 'cleaning').length,
      available: zb.filter(b => b.status === 'available').length,
    };
    const occ = (zones[zone].occupied + zones[zone].critical) / zones[zone].total;
    if (occ > 0.9) insights.push({ sev:'critical', icon:'alert', msg:`${zone} at ${Math.round(occ*100)}% — immediate action required` });
    else if (occ > 0.7) insights.push({ sev:'warning', icon:'alert', msg:`${zone} at ${Math.round(occ*100)}% — consider transfers` });
    if (zones[zone].critical > 2) insights.push({ sev:'critical', icon:'zap', msg:`${zones[zone].critical} critical patients in ${zone}` });
    if (zones[zone].cleaning > 3) insights.push({ sev:'warning', icon:'info', msg:`${zones[zone].cleaning} beds in cleaning — dispatch housekeeping` });
  });
  const totalAvail = Object.values(beds).filter(b => b.status === 'available').length;
  if (totalAvail < 5)  insights.push({ sev:'critical', icon:'alert', msg:`Only ${totalAvail} beds available — critical shortage` });
  else if (totalAvail < 10) insights.push({ sev:'warning', icon:'info', msg:`${totalAvail} beds available — prepare overflow protocol` });
  if (zones.ICU?.occupied > zones.ICU?.total * 0.6 && zones.Ward?.available > 4)
    insights.push({ sev:'info', icon:'cpu', msg:`Move stable ICU patients to Ward to free capacity` });
  if (events.slice(0,5).filter(e => e.severity === 'critical').length >= 3)
    insights.push({ sev:'warning', icon:'bolt', msg:`High critical event rate detected this session` });
  if (insights.length === 0)
    insights.push({ sev:'info', icon:'check', msg:'All systems nominal — operating within safe parameters' });

  const sevConfig = {
    critical: { cls:'insight-critical', color:'var(--red)',    label:'CRITICAL' },
    warning:  { cls:'insight-warning',  color:'var(--yellow)', label:'WARNING' },
    info:     { cls:'insight-info',     color:'var(--blue)',   label:'INFO' },
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div className="sage-panel-header">
        <Icon name="brain" size={12}/>
        <span className="font-head" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em' }}>AI INSIGHTS</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--brand)', animation:'blink 1.5s infinite' }}/>
          <span className="mono" style={{ fontSize:9, color:'var(--muted)' }}>LIVE</span>
        </div>
      </div>
      <div className="scroll-panel" style={{ flex:1, padding:'9px 13px' }}>
        {insights.map((ins, i) => {
          const cfg = sevConfig[ins.sev];
          return (
            <div key={i} className={`insight-card ${cfg.cls}`} style={{ animationDelay: `${i * 0.06}s` }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                <div style={{ color:cfg.color, flexShrink:0, marginTop:1 }}><Icon name={ins.icon} size={12}/></div>
                <div style={{ flex:1, fontSize:12, lineHeight:'1.5', color:'var(--text)' }}>{ins.msg}</div>
                <span className="tag" style={{ background:`${cfg.color}20`, color:cfg.color, fontSize:8, flexShrink:0 }}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ STAKE MODE PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StakeModePanel({ beds, onClose }) {
  const [simResult, setSimResult] = useState(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef();

  const runSim = useCallback(() => {
    setRunning(true);
    // Deep-clone — NEVER touch real beds
    let simBeds = JSON.parse(JSON.stringify(beds));
    const critEvents = [];

    for (let step = 0; step < 8; step++) {
      const bedList = Object.values(simBeds);
      const avail = bedList.filter(b => b.status === 'available');
      const occ   = bedList.filter(b => b.status === 'occupied' || b.status === 'critical');

      const arrivals = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < arrivals && avail.length > 0; i++) {
        const bed = avail.splice(Math.floor(Math.random() * avail.length), 1)[0];
        const isCrit = Math.random() < 0.25;
        simBeds[bed.id] = { ...simBeds[bed.id], status: isCrit ? 'critical' : 'occupied' };
        if (isCrit) critEvents.push({ bedId:bed.id, zone:bed.zone, step });
      }
      if (occ.length > 0 && Math.random() < 0.4) {
        const bed = occ[Math.floor(Math.random() * occ.length)];
        simBeds[bed.id] = { ...simBeds[bed.id], status: 'available' };
      }
    }

    const finalList = Object.values(simBeds);
    const byZone = {};
    ZONES.forEach(z => {
      const zb = finalList.filter(b => b.zone === z);
      byZone[z] = { total:zb.length, occ:zb.filter(b=>b.status!=='available').length, crit:zb.filter(b=>b.status==='critical').length };
    });
    const icuOccPct  = Math.round((byZone.ICU?.occ||0) / (byZone.ICU?.total||1) * 100);
    const totalOcc   = finalList.filter(b => b.status !== 'available').length;
    const totalPct   = Math.round(totalOcc / finalList.length * 100);
    const overflowRisk = totalPct > 85 ? 'high' : totalPct > 65 ? 'medium' : 'low';

    const suggestions = [];
    if (icuOccPct > 80) suggestions.push('Pre-alert ICU staff for surge capacity');
    if (overflowRisk === 'high') suggestions.push('Initiate overflow transfer protocol');
    if ((byZone.Emergency?.occ||0) / (byZone.Emergency?.total||1) > 0.75)
      suggestions.push('Expedite Emergency triage & discharge');
    if ((byZone.Ward?.occ||0) / (byZone.Ward?.total||1) < 0.5)
      suggestions.push('Ward has capacity — route stable patients here');
    if (suggestions.length === 0) suggestions.push('No immediate actions required — system stable');

    setTimeout(() => {
      setSimResult({ icuOccPct, totalPct, overflowRisk, critBeds:critEvents.length, byZone, suggestions });
      setRunning(false);
    }, 700);
  }, [beds]);

  useEffect(() => { runSim(); return () => clearInterval(intervalRef.current); }, [runSim]);
  useEffect(() => {
    intervalRef.current = setInterval(runSim, 12000);
    return () => clearInterval(intervalRef.current);
  }, [runSim]);

  const riskConfig = {
    low:    { badge:'stake-badge-low',  color:'var(--green)',  label:'LOW' },
    medium: { badge:'stake-badge-med',  color:'var(--yellow)', label:'MEDIUM' },
    high:   { badge:'stake-badge-high', color:'var(--red)',    label:'HIGH' },
  };

  return (
    <div className="stake-drawer" style={{
      position:'fixed', right:0, top:0, bottom:0, width:300, zIndex:90,
      display:'flex', flexDirection:'column',
    }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--stake-border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--stake-accent)', animation:'blink 1.2s infinite' }}/>
            <span className="mono" style={{ fontSize:9, color:'var(--stake-accent)', letterSpacing:'0.12em' }}>STAKE MODE · PREDICTIVE</span>
          </div>
          <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>Forward Simulation</h3>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          <button className="btn btn-ghost" style={{ padding:'4px 8px', fontSize:11 }} onClick={runSim} title="Refresh">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.5 15a9 9 0 1 1-2.7-8.7L23 10"/>
            </svg>
          </button>
          <button className="btn btn-ghost" style={{ padding:'4px 8px' }} onClick={onClose}><Icon name="x" size={12}/></button>
        </div>
      </div>

      {/* Read-only notice */}
      <div style={{ padding:'6px 13px', background:'rgba(74,144,217,0.06)', borderBottom:'1px solid var(--stake-border)', fontSize:10, color:'var(--stake-accent)', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
        <Icon name="info" size={10}/>
        Read-only · Real hospital state is NOT modified
      </div>

      <div className="scroll-panel" style={{ flex:1, padding:13 }}>
        {running ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:180, gap:10 }}>
            <div style={{ width:28, height:28, border:'2px solid var(--stake-border)', borderTopColor:'var(--stake-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            <span style={{ fontSize:12, color:'var(--muted)' }}>Running 8-step simulation…</span>
          </div>
        ) : simResult ? (
          <div className="animate-fade">
            {/* Overflow Risk */}
            <div style={{ marginBottom:13 }}>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>Overflow Risk</div>
              <div style={{
                padding:'11px 13px', borderRadius:9,
                background: simResult.overflowRisk === 'high' ? 'var(--red-bg)' : simResult.overflowRisk === 'medium' ? 'var(--yellow-bg)' : 'var(--green-bg)',
                border: `1px solid ${simResult.overflowRisk === 'high' ? 'var(--red-border)' : simResult.overflowRisk === 'medium' ? 'var(--yellow-border)' : 'var(--green-border)'}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <span className="syne" style={{ fontSize:22, fontWeight:800, color:riskConfig[simResult.overflowRisk].color }}>
                  {simResult.totalPct}%
                </span>
                <div style={{ textAlign:'right' }}>
                  <span className={`stake-badge ${riskConfig[simResult.overflowRisk].badge}`}>{riskConfig[simResult.overflowRisk].label}</span>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>predicted occupancy</div>
                </div>
              </div>
            </div>

            {/* Zone Breakdown */}
            <div style={{ marginBottom:13 }}>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>Predicted ICU Occupancy</div>
              <div className="stake-panel">
                <div className="stake-row">
                  <span style={{ color:'var(--muted)' }}>ICU Beds Occupied</span>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:70, height:3, background:'var(--stake-border)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${simResult.icuOccPct}%`, height:'100%', background: simResult.icuOccPct>80?'var(--red)':simResult.icuOccPct>60?'var(--yellow)':'var(--green)', borderRadius:2, transition:'width 0.5s' }}/>
                    </div>
                    <span className="mono" style={{ fontSize:11, minWidth:30 }}>{simResult.icuOccPct}%</span>
                  </div>
                </div>
                {ZONES.filter(z => simResult.byZone[z]).map(zone => {
                  const zd = simResult.byZone[zone];
                  const pct = Math.round(zd.occ / zd.total * 100);
                  const zc = ZONE_COLORS[zone];
                  return (
                    <div key={zone} className="stake-row">
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:zc }}/>
                        <span style={{ color:'var(--text2)', fontSize:12 }}>{zone}</span>
                      </div>
                      <span className="mono" style={{ fontSize:11, color: pct>80?'var(--red)':pct>60?'var(--yellow)':'var(--green)' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical Beds */}
            <div style={{ marginBottom:13 }}>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>Beds Likely to Go Critical</div>
              <div className="stake-panel">
                <div className="stake-row">
                  <span style={{ color:'var(--muted)' }}>New critical incidents</span>
                  <span className={`stake-badge ${simResult.critBeds>3?'stake-badge-high':simResult.critBeds>1?'stake-badge-med':'stake-badge-low'}`}>
                    {simResult.critBeds} beds
                  </span>
                </div>
                <div className="stake-row">
                  <span style={{ color:'var(--muted)' }}>Simulation horizon</span>
                  <span className="stake-badge stake-badge-info">8 steps</span>
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            <div>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>Suggested Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {simResult.suggestions.map((s, i) => (
                  <div key={i} style={{ padding:'8px 11px', borderRadius:7, background:'var(--blue-bg)', border:'1px solid var(--blue-border)', fontSize:12, color:'var(--text2)', lineHeight:'1.5', display:'flex', gap:7, alignItems:'flex-start' }}>
                    <span style={{ color:'var(--stake-accent)', flexShrink:0, marginTop:1 }}>→</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop:13, fontSize:9, color:'var(--muted)', textAlign:'center' }} className="mono">
              Auto-refreshes every 12s · Isolated clone
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// â”€â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Sidebar({ hospital, beds, autonomousMode, setAutonomousMode, onAdmitClick, onEmergency, stakeMode, setStakeMode, onOpenSetup }) {
  const total     = Object.values(beds).length;
  const available = Object.values(beds).filter(b => b.status === 'available').length;
  const occupied  = Object.values(beds).filter(b => b.status === 'occupied').length;
  const critical  = Object.values(beds).filter(b => b.status === 'critical').length;
  const cleaning  = Object.values(beds).filter(b => b.status === 'cleaning').length;
  const occPct    = Math.round((occupied + critical) / total * 100);

  const profileRef = useRef(null);
  const [isProfileActive, setIsProfileActive] = useState(false);

  useEffect(() => {
    const handleProfile = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileActive(false);
    };
    document.addEventListener('click', handleProfile);
    return () => document.removeEventListener('click', handleProfile);
  }, []);

  const hospSlug = (hospital?.name || 'hospital').toLowerCase().replace(/\s+/g, '');
  const profileEmail = `ops@${hospSlug}.local`;

  const navMain = [
    {
      id: 'dashboard',
      name: 'Overview',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width:20, height:20, flexShrink:0, opacity:0.85 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
        </svg>
      ),
    },
  ];

  const navFooter = [
    {
      name: 'Help',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width:20, height:20, flexShrink:0, opacity:0.85 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width:20, height:20, flexShrink:0, opacity:0.85 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: 'setup',
    },
  ];

  return (
    <nav className="sage-sidebar" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid var(--border)' }}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, padding:'0 12px' }}>
        {/* Profile header */}
        <div style={{ height:72, flexShrink:0, display:'flex', alignItems:'center', paddingLeft:4, borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, width:'100%' }}>
            <img
              src="https://randomuser.me/api/portraits/women/79.jpg"
              alt=""
              style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--border2)' }}
            />
            <div style={{ minWidth:0, flex:1 }}>
              <span className="font-head" style={{ display:'block', color:'var(--text2)', fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {hospital?.name || 'Hospital'}
              </span>
              <span style={{ display:'block', marginTop:2, color:'var(--muted)', fontSize:11 }}>Digital Twin</span>
            </div>
            <div ref={profileRef} style={{ position:'relative', flexShrink:0 }}>
              <button
                type="button"
                className="sage-sidebar-profile-btn"
                onClick={(e) => { e.stopPropagation(); setIsProfileActive(v => !v); }}
                aria-haspopup="menu"
                aria-expanded={isProfileActive}
                aria-controls="sage-profile-menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width:20, height:20 }} aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {isProfileActive && (
                <div id="sage-profile-menu" role="menu" className="sage-profile-popover">
                  <div style={{ padding:8, textAlign:'left' }}>
                    <span style={{ display:'block', color:'var(--muted)', fontSize:12, padding:'6px 8px' }}>{profileEmail}</span>
                    <button type="button" className="sage-sidebar-link" role="menuitem" onClick={() => setIsProfileActive(false)}>Add another account</button>
                    <div style={{ position:'relative', borderRadius:6, overflow:'hidden' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width:16, height:16, position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', opacity:0.5 }} aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                      </svg>
                      <select defaultValue="" onChange={() => {}}>
                        <option value="" disabled hidden>Theme</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                      </select>
                    </div>
                    <button type="button" className="sage-sidebar-link" onClick={() => setIsProfileActive(false)}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto', minHeight:0, paddingTop:8 }}>
          {/* Capacity (compact) */}
          <div style={{ padding:'0 4px 12px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Capacity</div>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span className="mono" style={{ fontSize:18, fontWeight:700, color: occPct>80?'var(--red)':occPct>60?'var(--yellow)':'var(--green)' }}>{occPct}%</span>
                <span style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>{occupied+critical}/{total}</span>
              </div>
              <div style={{ height:3, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ width:`${occPct}%`, height:'100%', borderRadius:2,
                  background: occPct>80?'var(--red)':occPct>60?'var(--yellow)':'var(--green)',
                  transition:'width 0.5s, background 0.3s',
                }}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[
                { label:'Free', val:available, color:'var(--green)' },
                { label:'Occupied', val:occupied, color:'var(--red)' },
                { label:'Critical', val:critical, color:'var(--purple)' },
                { label:'Cleaning', val:cleaning, color:'var(--yellow)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background:'var(--surface)', borderRadius:7, padding:'6px 8px' }}>
                  <div style={{ fontSize:14, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{val}</div>
                  <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <ul style={{ listStyle:'none', margin:0, padding:'12px 0 0', fontSize:13, fontWeight:500 }}>
            {navMain.map((item, idx) => (
              <li key={idx} style={{ marginBottom:2 }}>
                <div className="sage-sidebar-link sage-sidebar-link--active" style={{ cursor:'default' }}>
                  <span style={{ color:'var(--muted)' }}>{item.icon}</span>
                  {item.name}
                </div>
              </li>
            ))}
          </ul>

          <div style={{ paddingTop:8, marginTop:8, borderTop:'1px solid var(--border)' }}>
            <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:13, fontWeight:500 }}>
              {navFooter.map((item, idx) => (
                <li key={idx} style={{ marginBottom:2 }}>
                  <button
                    type="button"
                    className="sage-sidebar-link"
                    onClick={() => {
                      if (item.name === 'Help') alert('SAGE · Hospital Digital Twin\n\nUse the header to change hospital setup.');
                      if (item.action === 'setup') onOpenSetup && onOpenSetup();
                    }}
                  >
                    <span style={{ color:'var(--muted)' }}>{item.icon}</span>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div style={{ padding:'14px 4px 12px', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Actions</div>
            <button className="btn btn-green" style={{ width:'100%', justifyContent:'center', fontSize:12 }} onClick={onAdmitClick}>
              <Icon name="plus" size={12}/> Admit Patient
            </button>
            <button className="btn btn-red" style={{ width:'100%', justifyContent:'center', fontSize:12 }} onClick={onEmergency}>
              <Icon name="alert" size={12}/> Trigger Emergency
            </button>
            <button className="btn" onClick={() => setAutonomousMode(p => !p)} style={{
              width:'100%', justifyContent:'center', fontSize:12,
              background: autonomousMode ? 'var(--purple-bg)' : 'var(--surface)',
              border:`1px solid ${autonomousMode ? 'var(--purple-border)' : 'var(--border2)'}`,
              color: autonomousMode ? 'var(--purple)' : 'var(--muted)',
            }}>
              <Icon name="cpu" size={12}/>
              {autonomousMode ? 'AI Auto: ON' : 'AI Auto: OFF'}
              {autonomousMode && <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--purple)', marginLeft:2, animation:'pulse-subtle 1.5s infinite' }}/>}
            </button>
            <button className="btn" onClick={() => setStakeMode(p => !p)} style={{
              width:'100%', justifyContent:'center', fontSize:12,
              background: stakeMode ? 'var(--blue-bg)' : 'var(--surface)',
              border:`1px solid ${stakeMode ? 'var(--blue-border)' : 'var(--border2)'}`,
              color: stakeMode ? 'var(--blue)' : 'var(--muted)',
            }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              {stakeMode ? 'Stake Mode: ON' : 'Stake Mode'}
            </button>
          </div>

          {/* Zone Status */}
          <div style={{ padding:'0 4px 16px' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Zone Status</div>
            {ZONES.map(zone => {
              const zb   = Object.values(beds).filter(b => b.zone === zone);
              const zOcc = zb.filter(b => b.status !== 'available').length;
              const zPct = Math.round(zOcc / zb.length * 100);
              const zc   = ZONE_COLORS[zone];
              return (
                <div key={zone} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11, color:zc, fontWeight:600 }}>{zone}</span>
                    <span className="mono" style={{ fontSize:10, color:'var(--muted)' }}>{zPct}%</span>
                  </div>
                  <div style={{ height:2, background:'var(--surface2)', borderRadius:1, overflow:'hidden' }}>
                    <div style={{ width:`${zPct}%`, height:'100%', borderRadius:1, background:zc, transition:'width 0.5s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// â”€â”€â”€ STATS BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatsBar({ beds, events }) {
  const total = Object.values(beds).length;
  const stats = [
    { label:'Total Beds', val:total, color:'var(--text)' },
    { label:'Available',  val:Object.values(beds).filter(b=>b.status==='available').length, color:'var(--green)' },
    { label:'Critical',   val:Object.values(beds).filter(b=>b.status==='critical').length,  color:'var(--purple)' },
    { label:'Events',     val:events.length, color:'var(--blue)' },
  ];
  return (
    <div className="sage-stats-bar" style={{ display:'flex', gap:12, padding:'10px 20px', alignItems:'center', flexShrink:0 }}>
      <span className="nf-trending-label" style={{ flexShrink:0, marginRight:4 }}>Overview</span>
      {stats.map(({ label, val, color }) => (
        <div key={label} className="sage-stat-pill">
          <span className="mono" style={{ fontSize:15, fontWeight:700, color }}>{val}</span>
          <span className="font-head" style={{ fontSize:11, color:'var(--muted)', fontWeight:500 }}>{label}</span>
        </div>
      ))}
      <div style={{ flex:1 }}/>
      <span className="mono" style={{ fontSize:10, color:'var(--muted)' }}>
        {new Date().toLocaleString('en-IN', { weekday:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </span>
    </div>
  );
}

// â”€â”€â”€ TOP PROGRESS BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TopProgressBar({ step }) {
  const steps = [
    { n:1, label:'Setup' },
    { n:2, label:'First Admit' },
    { n:3, label:'Team Active' },
    { n:4, label:'Emergency' },
    { n:5, label:'AI Mode' },
  ];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{
              width:16, height:16, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:8, fontFamily:'var(--font-mono)', fontWeight:700,
              background: step > s.n ? 'var(--brand)' : step === s.n ? 'var(--brand-dim)' : 'var(--surface)',
              border:`1px solid ${step >= s.n ? 'var(--brand)' : 'var(--border2)'}`,
              color: step > s.n ? '#fff' : step === s.n ? 'var(--brand)' : 'var(--muted)',
              transition:'transform 0.35s var(--ease-spring), box-shadow 0.35s ease, background 0.3s ease, border-color 0.3s ease',
              flexShrink:0,
              transform: step === s.n ? 'scale(1.12)' : 'scale(1)',
              boxShadow: step === s.n ? '0 0 16px rgba(229,9,20,0.45)' : 'none',
            }}>
              {step > s.n ? <Icon name="check" size={8}/> : s.n}
            </div>
            <span style={{ fontSize:10, color: step >= s.n ? '#fff' : 'var(--muted)', whiteSpace:'nowrap', fontWeight: step >= s.n ? 600 : 400 }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:1, background: step > s.n ? 'var(--brand)' : 'var(--border)', transition:'background 0.4s', minWidth:8, maxWidth:24 }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// â”€â”€â”€ MAIN APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [initDone, setInitDone] = useState(() => !SageBackend.isConfigured());
  const [hospital,       setHospital]       = useState(null);
  const [editingSetup,   setEditingSetup]   = useState(false);
  const [beds,           setBeds]           = useState(initBeds());
  const [events,         setEvents]         = useState([]);
  const [showAdmit,      setShowAdmit]      = useState(false);
  const [selectedBed,    setSelectedBed]    = useState(null);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [stakeMode,      setStakeMode]      = useState(false);
  const [activeFloor,    setActiveFloor]    = useState('All');
  const [step,           setStep]           = useState(1);
  const [clock,          setClock]          = useState('');

  const autoRef  = useRef();
  const clockRef = useRef();
  const hospitalRef = useRef(null);
  const bedsFlushRef = useRef();

  useEffect(() => { hospitalRef.current = hospital; }, [hospital]);

  useEffect(() => {
    if (!SageBackend.isConfigured()) { setInitDone(true); return; }
    let cancelled = false;
    SageBackend.loadPersistedSession().then(data => {
      if (cancelled) return;
      if (data && data.hospital) {
        setHospital(data.hospital);
        hospitalRef.current = data.hospital;
        setBeds(data.beds && Object.keys(data.beds).length ? data.beds : initBeds());
        if (data.events && data.events.length) setEvents(data.events);
      }
      setInitDone(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Realtime: enable in Dashboard → Replication after running schema.sql. If you subscribe here,
  // guard against feedback loops with debounced upserts (e.g. only apply remote patches).

  useEffect(() => {
    if (!SageBackend.isConfigured() || !hospital?.id) return;
    clearTimeout(bedsFlushRef.current);
    bedsFlushRef.current = setTimeout(() => {
      SageBackend.upsertBeds(hospital.id, beds);
    }, 450);
    return () => clearTimeout(bedsFlushRef.current);
  }, [beds, hospital?.id]);

  useEffect(() => {
    clockRef.current = setInterval(() => setClock(timeStr()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  const addEvent = useCallback((type, message, severity = 'info') => {
    const ev = { id: generateId(), type, message, severity, time: timeStr() };
    setEvents(prev => [ev, ...prev.slice(0, 99)]);
    SageBackend.insertHospitalEvent(hospitalRef.current?.id, ev);
  }, []);

  const handleSetup = async (cfg) => {
    const reconfigure = hospital != null;

    if (SageBackend.isConfigured()) {
      if (reconfigure && hospital?.id) {
        const up = await SageBackend.updateHospital(hospital.id, cfg);
        if (!up.ok) {
          alert(up.message || 'Could not update Supabase');
          return;
        }
        setHospital(prev => ({ ...prev, ...cfg, id: prev.id }));
        hospitalRef.current = { ...hospitalRef.current, ...cfg, id: hospital.id };
        const nextBeds = pruneBedsForFloors(beds, cfg.floors);
        setBeds(nextBeds);
        await SageBackend.upsertBeds(hospital.id, nextBeds);
        setEditingSetup(false);
        setStep(2);
        if (cfg.primaryFloor) setActiveFloor(cfg.primaryFloor);
        addEvent('SYSTEM', `Hospital "${cfg.name}" configuration updated`, 'success');
        return;
      }
      const initialBeds = initBeds();
      const result = await SageBackend.setupHospital(cfg, initialBeds);
      if (!result.ok) {
        alert(result.message || 'Could not save to Supabase');
        return;
      }
      setHospital(result.hospital);
      hospitalRef.current = result.hospital;
      setBeds(initialBeds);
    } else if (reconfigure) {
      setHospital(prev => ({ ...prev, ...cfg, id: prev?.id }));
      hospitalRef.current = { ...hospitalRef.current, ...cfg, id: hospital?.id };
      setBeds(prev => pruneBedsForFloors(prev, cfg.floors));
      setEditingSetup(false);
    } else {
      setHospital(cfg);
      setBeds(initBeds());
    }
    setStep(2);
    if (cfg.primaryFloor) setActiveFloor(cfg.primaryFloor);
    addEvent('SYSTEM', reconfigure ? `Hospital "${cfg.name}" configuration updated` : `Hospital "${cfg.name}" initialized`, 'success');
  };

  const handleAdmit = (patient, bed) => {
    setBeds(prev => ({ ...prev, [bed.id]: { ...prev[bed.id], status:patient.severity==='Critical'?'critical':'occupied', patient } }));
    addEvent('ADMIT', `${patient.name} admitted to ${bed.zone} Bed #${bed.number} — ${patient.reason}`,
      patient.severity==='Critical'?'critical':patient.severity==='Urgent'?'warning':'info');
    if (step < 3) setStep(3);
  };

  const handleDischarge = (bedId) => {
    const bed = beds[bedId];
    if (bed?.patient) addEvent('DISCHARGE', `${bed.patient.name} discharged from ${bed.zone} Bed #${bed.number}`, 'success');
    setBeds(prev => ({ ...prev, [bedId]: { ...prev[bedId], status:'cleaning', patient:null } }));
    setTimeout(() => {
      setBeds(prev => ({ ...prev, [bedId]: { ...prev[bedId], status:'available' } }));
      addEvent('HOUSEKEEPING', `Bed ${bedId} cleaned and ready`, 'info');
    }, 5000);
  };

  const handleUpdateStatus = (bedId, status) => {
    setBeds(prev => ({ ...prev, [bedId]: { ...prev[bedId], status } }));
    addEvent('UPDATE', `Bed ${bedId} → ${status}`, 'info');
  };

  const handleEmergency = () => {
    const availBeds = Object.values(beds).filter(b => b.status === 'available');
    if (availBeds.length === 0) {
      addEvent('EMERGENCY', 'EMERGENCY — No beds available! Overflow protocol activated.', 'critical');
      return;
    }
    const count = Math.min(3, availBeds.length);
    const toFill = availBeds.slice(0, count);
    setBeds(prev => {
      const next = { ...prev };
      toFill.forEach(b => {
        const name   = NAMES[Math.floor(Math.random()*NAMES.length)];
        const reason = REASONS[Math.floor(Math.random()*REASONS.length)];
        next[b.id] = { ...next[b.id], status:'critical', patient:{ id:generateId(), name, reason, severity:'Critical', weight:Math.floor(50+Math.random()*50), admittedAt:new Date().toISOString() } };
      });
      return next;
    });
    addEvent('EMERGENCY', `Mass emergency! ${count} critical patients admitted`, 'critical');
    if (step < 4) setStep(4);
  };

  // Autonomous Mode (unchanged logic)
  useEffect(() => {
    if (!autonomousMode) { clearInterval(autoRef.current); return; }
    addEvent('AI', 'Autonomous mode activated', 'ai');
    autoRef.current = setInterval(() => {
      setBeds(prev => {
        const next = { ...prev };
        const bedList = Object.values(next);
        const occupied = bedList.filter(b => b.status==='occupied'||b.status==='critical');
        if (occupied.length > 0 && Math.random() < 0.35) {
          const b = occupied[Math.floor(Math.random()*occupied.length)];
          const wasName = b.patient?.name || 'Patient';
          next[b.id] = { ...next[b.id], status:'cleaning', patient:null };
          addEvent('AI', `AI discharged ${wasName} from ${b.zone} Bed #${b.number}`, 'ai');
          setTimeout(() => setBeds(pp => ({ ...pp, [b.id]:{ ...pp[b.id], status:'available' } })), 3000);
        }
        const icuCritical = bedList.filter(b => b.zone==='ICU'&&b.status==='critical');
        const wardAvail   = bedList.filter(b => b.zone==='Ward'&&b.status==='available');
        if (icuCritical.length > 3 && wardAvail.length > 0 && Math.random() < 0.4) {
          const from = icuCritical[0]; const to = wardAvail[0];
          next[to.id]   = { ...next[to.id],   status:'occupied', patient:from.patient };
          next[from.id] = { ...next[from.id],  status:'cleaning', patient:null };
          addEvent('AI', `AI transferred ${from.patient?.name||'patient'} ICU → Ward`, 'ai');
          setTimeout(() => setBeds(pp => ({ ...pp, [from.id]:{ ...pp[from.id], status:'available' } })), 4000);
        }
        const avail = bedList.filter(b => b.status==='available');
        if (avail.length > 2 && Math.random() < 0.3) {
          const b = avail[Math.floor(Math.random()*avail.length)];
          const name   = NAMES[Math.floor(Math.random()*NAMES.length)];
          const reason = REASONS[Math.floor(Math.random()*REASONS.length)];
          const isCrit = Math.random() < 0.2;
          next[b.id] = { ...next[b.id], status:isCrit?'critical':'occupied', patient:{ id:generateId(), name, reason, severity:isCrit?'Critical':'Normal', weight:Math.floor(50+Math.random()*50), admittedAt:new Date().toISOString() } };
          addEvent('AI', `AI auto-admitted ${name} to ${b.zone} Bed #${b.number}`, 'ai');
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(autoRef.current);
  }, [autonomousMode, addEvent]);

  if (!initDone) return <AppLoadingScreen />;

  if (!hospital || editingSetup) {
    return (
      <OnboardingPage
        key={editingSetup ? 'edit-setup' : 'first-setup'}
        onSetup={handleSetup}
        initialSetup={editingSetup ? hospital : null}
        onCancel={editingSetup ? () => setEditingSetup(false) : null}
      />
    );
  }
  return (
    <div className="page-shell-in sage-dashboard-root" style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <BGPattern
        variant="grid"
        mask="fade-edges"
        size={24}
        fill="rgba(255, 255, 255, 0.045)"
        style={{ zIndex:0 }}
      />
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
      {/* Header */}
      <div className="sage-header" style={{ height:56, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'var(--brand-dim)', border:'1px solid rgba(229,9,20,0.45)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--brand)' }}>
            <Icon name="hospital" size={16}/>
          </div>
          <span className="syne" style={{ fontSize:20, fontWeight:900, letterSpacing:'-0.06em', color:'var(--brand)' }}>
            SAGE
          </span>
        </div>
        <div style={{ width:1, height:20, background:'var(--border)', flexShrink:0 }}/>
        <button type="button" className="btn btn-ghost" onClick={() => setEditingSetup(true)}
          style={{ flexShrink:0, fontSize:11, padding:'5px 10px', gap:5, color:'var(--text2)' }}
          title="Change hospital name, floors, or primary unit">
          <Icon name="chevronLeft" size={12}/> Change setup
        </button>
        <div style={{ width:1, height:20, background:'var(--border)', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <TopProgressBar step={step}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {stakeMode && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'var(--blue-bg)', border:'1px solid var(--blue-border)', borderRadius:20, padding:'3px 9px' }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--blue)', animation:'blink 1s infinite' }}/>
              <span className="mono" style={{ fontSize:9, color:'var(--blue)' }}>STAKE</span>
            </div>
          )}
          {autonomousMode && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'var(--purple-bg)', border:'1px solid var(--purple-border)', borderRadius:20, padding:'3px 9px' }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--purple)', animation:'blink 0.8s infinite' }}/>
              <span className="mono" style={{ fontSize:9, color:'var(--purple)' }}>AI AUTO</span>
            </div>
          )}
          <span className="mono" style={{ fontSize:10, color:'var(--muted)' }}>{clock}</span>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--brand)' }}/>
            <span style={{ fontSize:10, color:'var(--muted)' }}>Live</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar beds={beds} events={events}/>

      {/* Main Layout */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <Sidebar
          hospital={hospital} beds={beds}
          autonomousMode={autonomousMode} setAutonomousMode={setAutonomousMode}
          stakeMode={stakeMode} setStakeMode={setStakeMode}
          onAdmitClick={() => setShowAdmit(true)}
          onEmergency={handleEmergency}
          onOpenSetup={() => setEditingSetup(true)}
        />

        {/* Center: Bed Grid */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', marginRight:stakeMode?300:0, transition:'margin-right 0.4s var(--ease-out-expo)' }}>
          <BedGrid
            beds={beds} onBedClick={setSelectedBed}
            hospital={hospital}
            activeFloor={activeFloor} setActiveFloor={setActiveFloor}
          />
        </div>

        {/* Right Panel */}
        <div className="glass" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'#000' }}>
          <div style={{ flex:'0 0 50%', borderBottom:'1px solid var(--border)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <AIInsightsPanel beds={beds} events={events}/>
          </div>
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <EventFeed events={events}/>
          </div>
        </div>
      </div>

      {/* Stake Mode Panel (overlay) */}
      {stakeMode && <StakeModePanel beds={beds} onClose={() => setStakeMode(false)}/>}

      {/* Modals */}
      {showAdmit && (
        <PatientModal beds={beds} onAdmit={handleAdmit} onClose={() => setShowAdmit(false)}/>
      )}
      {selectedBed && selectedBed.status !== 'available' && (
        <PatientDetailPanel
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
          onDischarge={handleDischarge}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
      </div>
    </div>
  );
}
