import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';

/* ─── helpers ────────────────────────────────────────────────────────────── */
function riskColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#eab308';
  return '#10b981';
}
function riskLabel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/* ─── SVG Arc Gauge ──────────────────────────────────────────────────────── */
function RiskGauge({ score = 0 }) {
  const pct = Math.min(100, Math.max(0, Number(score)));
  const R = 54, cx = 70, cy = 70;
  const startAngle = 210, sweep = 300;
  const toRad = (d) => (d * Math.PI) / 180;
  const polarX = (angle) => cx + R * Math.cos(toRad(angle));
  const polarY = (angle) => cy + R * Math.sin(toRad(angle));
  const endAngle = startAngle + (sweep * pct) / 100;
  const largeArc = sweep * pct / 100 > 180 ? 1 : 0;
  const col = riskColor(pct);
  return (
    <svg viewBox="0 0 140 100" style={{ width: '100%', maxWidth: 160, display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <path
        d={`M ${polarX(startAngle)} ${polarY(startAngle)} A ${R} ${R} 0 1 1 ${polarX(startAngle + sweep - 0.01)} ${polarY(startAngle + sweep - 0.01)}`}
        fill="none" stroke="var(--bg-elevated, #1a2640)" strokeWidth={10} strokeLinecap="round"
      />
      {/* Fill */}
      {pct > 0 && (
        <path
          d={`M ${polarX(startAngle)} ${polarY(startAngle)} A ${R} ${R} 0 ${largeArc} 1 ${polarX(endAngle)} ${polarY(endAngle)}`}
          fill="none" stroke={col} strokeWidth={10} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${col}80)` }}
        />
      )}
      {/* Score text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={col} fontSize={22} fontWeight={700} fontFamily="'JetBrains Mono', monospace">{Math.round(pct)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted, #6b7280)" fontSize={9} fontWeight={600}>/100</text>
      <text x={cx} y={cy + 25} textAnchor="middle" fill={col} fontSize={9} fontWeight={700} letterSpacing={1}>{riskLabel(pct)}</text>
    </svg>
  );
}

/* ─── Feature bar ────────────────────────────────────────────────────────── */
function FeatureBar({ label, value, maxVal }) {
  const pct = Math.round((value / maxVal) * 100);
  const col = value > 0.3 ? '#ef4444' : value > 0.2 ? '#f59e0b' : '#00d4b4';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: 'var(--text-secondary, #8a9bb5)', textTransform: 'capitalize' }}>
          {String(label).replace(/_/g, ' ')}
        </span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary, #f0f4ff)' }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-elevated, #1a2640)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${col}60` }} />
      </div>
    </div>
  );
}

/* ─── Custom Recharts Tooltip ────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{ background: 'var(--bg-surface, #111827)', border: '1px solid var(--border-default, #1e2d45)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-secondary, #8a9bb5)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: riskColor(val), fontWeight: 700, fontSize: 14 }}>{Number(val).toFixed(1)}</div>
    </div>
  );
}

/* ─── AI Suggestion builder ─────────────────────────────────────────────── */
function buildAISuggestion(pred, shipment) {
  if (!pred) return null;
  const mo = pred.model_outputs || {};
  const fi = pred.feature_importance || {};
  const fi_entries = Object.entries(fi).sort((a, b) => b[1] - a[1]);
  const top = fi_entries[0];
  const altRoutes = pred.alternate_routes || [];
  const bestRoute = altRoutes.find(r => r.recommended) || altRoutes[0];
  const saving = pred.financial_impact?.net_saving_usd;

  const lines = [];
  if (top) {
    const factor = String(top[0]).replace(/_/g, ' ');
    const pct = Math.round(top[1] * 100);
    lines.push(`Primary risk driver: ${factor} (${pct}% weight).`);
  }
  if (mo.predicted_delay_hr > 0) {
    lines.push(`Estimated delay: ${Number(mo.predicted_delay_hr).toFixed(1)} hrs.`);
  }
  if (mo.reroute_decision === 'REROUTE' && bestRoute) {
    lines.push(`Model recommends switching to "${bestRoute.name}".`);
  } else if (mo.reroute_decision === 'NORMAL' || mo.reroute_decision === 'STAY') {
    lines.push('Current route operating within acceptable parameters.');
  }
  if (saving > 0) {
    lines.push(`Net financial saving if rerouted: $${Number(saving).toLocaleString()}.`);
  }
  return lines.join(' ');
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function MLPanel({ shipment }) {
  const [pred, setPred]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]         = useState(false);
  const [approving, setApproving]   = useState(null);
  const [approved, setApproved]     = useState(new Set());
  const [err, setErr]         = useState('');
  const [showRoutes, setShowRoutes] = useState(false);

  const isDemoShipment = String(shipment?.shipment_id || '').startsWith('demo-');

  /* Run ML pipeline */
  const runML = async () => {
    if (!shipment?.shipment_id || isDemoShipment) return;
    setLoading(true); setErr(''); setRan(true);
    try {
      const r = await api.get(ENDPOINTS.ML_PREDICTION(shipment.shipment_id));
      setPred(r.data);
    } catch (e) {
      if (e?.response?.status === 403) setErr('Manager role required for full ML analysis.');
      else if (e?.response?.status === 404) setErr('No prediction available yet — click Run ML Analysis.');
      else setErr('ML pipeline failed. Check backend connection.');
    } finally { setLoading(false); }
  };

  /* Auto-run when shipment changes */
  useEffect(() => {
    setPred(null); setRan(false); setErr('');
    setApproved(new Set()); setShowRoutes(false);
    if (!isDemoShipment && shipment?.shipment_id) runML();
  }, [shipment?.shipment_id]); // eslint-disable-line

  /* Approve reroute */
  const approveReroute = async (routeId) => {
    setApproving(routeId);
    try {
      await api.post(`${ENDPOINTS.APPROVE_REROUTE(shipment.shipment_id)}?route_id=${routeId}`);
      setApproved(p => new Set([...p, routeId]));
    } catch { /* silent */ } finally { setApproving(null); }
  };

  /* ── Derived data ── */
  const mo   = pred?.model_outputs    || {};
  const fi   = pred?.feature_importance || {};
  const fimp = pred?.feature_importance || {};
  const alts = pred?.alternate_routes  || [];
  const fin  = pred?.financial_impact  || {};
  const traj = pred?.risk_trajectory   || [];

  /* Feature importance — sorted */
  const fiEntries = Object.entries(fimp).sort((a, b) => b[1] - a[1]);
  const fiMax     = fiEntries.length > 0 ? fiEntries[0][1] : 1;

  /* Trajectory chart data */
  const now = new Date();
  const trajData = traj.length > 0
    ? traj.map((v, i) => ({ label: i === 0 ? 'Now' : `+${i}h`, value: Number(v).toFixed(1) }))
    : Array.from({ length: 7 }, (_, i) => {
        const base = Number(shipment?.current_risk_score || 40);
        return { label: i === 0 ? 'Now' : `+${i}h`, value: (base + i * 0.8).toFixed(1) };
      });

  /* Current risk from shipment (always shown) */
  const currentRisk  = Number(shipment?.current_risk_score ?? 0);
  const currentLevel = shipment?.current_risk_level || 'unknown';
  const mlRisk       = mo.risk_score != null ? Number(mo.risk_score) : null;
  const displayRisk  = mlRisk ?? currentRisk;

  const aiSuggestion = buildAISuggestion(pred, shipment);
  const decisionColor = { REROUTE: '#ef4444', MONITOR: '#f59e0b', NORMAL: '#10b981', STAY: '#10b981' };

  /* ─── Spinner ── */
  const Spin = () => (
    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--border-default, #1e2d45)', borderTopColor: '#00d4b4', borderRadius: '50%', animation: 'mlspin .7s linear infinite' }} />
  );

  /* ─── Section wrapper ── */
  const Section = ({ title, children, noBorder }) => (
    <div style={{ padding: '14px 16px', borderBottom: noBorder ? 'none' : '1px solid var(--border-subtle, #1e2d45)' }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes mlspin { to { transform: rotate(360deg); } }
        .ml-approve-btn {
          background: linear-gradient(135deg, #00d4b4, #22d3ee);
          color: #000; font-weight: 700; font-size: 11px; padding: 5px 14px;
          border: none; border-radius: 6px; cursor: pointer; transition: all .2s;
          font-family: inherit;
        }
        .ml-approve-btn:hover { opacity: .85; transform: translateY(-1px); }
        .ml-approve-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
        .ml-route-card {
          background: var(--bg-elevated, #0d1a2e);
          border: 1px solid var(--border-default, #1e2d45);
          border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;
        }
        .ml-route-card.recommended {
          border-color: rgba(0,212,180,.4);
          background: rgba(0,212,180,.06);
        }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line { stroke: var(--border-subtle, #1e2d4530) !important; }
        .recharts-text { fill: var(--text-muted, #6b7280) !important; }
      `}</style>

      {/* ── 1. Risk Score Gauge ─────────────────────────────────────────── */}
      <Section title="Risk Assessment">
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'center' }}>
          <RiskGauge score={displayRisk} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary, #8a9bb5)' }}>
              Current Level
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: riskColor(currentRisk) }}>
              {String(currentLevel).toUpperCase()}
            </div>
            {mlRisk != null && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #8a9bb5)', marginTop: 4 }}>
                  ML Predicted
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: riskColor(mlRisk) }}>
                  {mlRisk.toFixed(1)} · {riskLabel(mlRisk)}
                </div>
              </>
            )}
            {shipment?.is_rerouted && (
              <div style={{ fontSize: 10, background: 'rgba(0,212,180,.12)', color: '#00d4b4', borderRadius: 6, padding: '3px 8px', width: 'fit-content', marginTop: 4 }}>
                ↺ Rerouted ×{shipment.reroute_count || 1}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── 2. ML Analysis section ─────────────────────────────────────── */}
      <Section title="AI / ML Analysis">
        {isDemoShipment ? (
          <div style={{ fontSize: 12, color: '#f59e0b', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ Connect backend with live data to run ML analysis.
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 12, color: 'var(--text-secondary, #8a9bb5)' }}>
            <Spin /> Running ML pipeline…
          </div>
        ) : err ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#ef4444' }}>{err}</div>
            <button className="ml-approve-btn" onClick={runML} style={{ width: 'fit-content' }}>⚡ Retry</button>
          </div>
        ) : !pred ? (
          <button className="ml-approve-btn" onClick={runML}>⚡ Run ML Analysis</button>
        ) : (
          <>
            {/* Decision badge */}
            {mo.reroute_decision && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
                  borderRadius: 20, fontWeight: 700, fontSize: 12,
                  background: `${decisionColor[mo.reroute_decision] || '#6b7280'}18`,
                  color: decisionColor[mo.reroute_decision] || '#6b7280',
                  border: `1px solid ${decisionColor[mo.reroute_decision] || '#6b7280'}40`,
                }}>
                  {mo.reroute_decision === 'REROUTE' ? '🔴' : mo.reroute_decision === 'MONITOR' ? '🟡' : '🟢'}
                  &nbsp;{mo.reroute_decision}
                </div>
                {mo.confidence_percent != null && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #8a9bb5)' }}>
                    {Number(mo.confidence_percent).toFixed(0)}% confidence
                  </span>
                )}
              </div>
            )}

            {/* Predicted delay */}
            {mo.predicted_delay_hr != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border-subtle, #1e2d4520)' }}>
                <span style={{ color: 'var(--text-secondary, #8a9bb5)' }}>Predicted Delay</span>
                <span style={{ fontWeight: 700, color: Number(mo.predicted_delay_hr) > 4 ? '#ef4444' : Number(mo.predicted_delay_hr) > 1 ? '#f59e0b' : '#10b981' }}>
                  {Number(mo.predicted_delay_hr).toFixed(1)} hrs
                </span>
              </div>
            )}

            {/* Rerun button */}
            <button className="ml-approve-btn" onClick={runML} style={{ marginTop: 10, fontSize: 10, padding: '4px 12px' }}>
              ↺ Re-run Analysis
            </button>
          </>
        )}
      </Section>

      {/* ── 3. Feature Importance Bars ─────────────────────────────────── */}
      {fiEntries.length > 0 && (
        <Section title="Risk Factor Breakdown">
          {fiEntries.map(([key, val]) => (
            <FeatureBar key={key} label={key} value={val} maxVal={fiMax} />
          ))}
        </Section>
      )}

      {/* ── 4. 6-Hour Risk Trajectory (LSTM) ───────────────────────────── */}
      <Section title={`${trajData.length}-Hour Risk Trajectory (LSTM)`}>
        <div style={{ height: 130, marginLeft: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={riskColor(displayRisk)} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={riskColor(displayRisk)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={riskColor(displayRisk)}
                strokeWidth={2}
                fill="url(#riskGrad)"
                dot={{ r: 3, fill: riskColor(displayRisk), strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginTop: 4, textAlign: 'center' }}>
          {traj.length > 0 ? 'LSTM model prediction — live data' : 'Projected trend — run ML for LSTM forecast'}
        </div>
      </Section>

      {/* ── 5. Financial Impact ─────────────────────────────────────────── */}
      {fin.net_saving_usd != null && (
        <Section title="Financial Impact">
          <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginBottom: 3 }}>Current Route Loss</div>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>${Number(fin.current_route_expected_loss_usd || 0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginBottom: 3 }}>Net Saving if Rerouted</div>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>${Number(fin.net_saving_usd || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── 6. AI Suggestion text ──────────────────────────────────────── */}
      {aiSuggestion && (
        <Section title="🤖 AI Recommendation">
          <div style={{
            background: 'var(--bg-elevated, #0d1a2e)',
            border: '1px solid rgba(0,212,180,.25)',
            borderLeft: '3px solid #00d4b4',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--text-primary, #f0f4ff)',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "{aiSuggestion}"
          </div>
        </Section>
      )}

      {/* ── 7. Alternate Routes ─────────────────────────────────────────── */}
      {alts.length > 0 && (
        <Section title="Alternate Routes" noBorder>
          <button
            onClick={() => setShowRoutes(v => !v)}
            style={{
              width: '100%', padding: '10px 16px', marginBottom: showRoutes ? 12 : 0,
              background: 'linear-gradient(135deg, #00d4b4, #22d3ee)',
              color: '#000', fontWeight: 700, fontSize: 13, border: 'none',
              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .2s',
            }}
          >
            {showRoutes ? '▲ Hide Alternate Routes' : `▼ View ${alts.length} Alternate Routes`}
          </button>

          {showRoutes && alts.slice(0, 4).map((r) => (
            <div key={r.route_id} className={`ml-route-card${r.recommended ? ' recommended' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #f0f4ff)' }}>
                    {r.recommended && <span style={{ color: '#00d4b4', marginRight: 4 }}>★</span>}
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #8a9bb5)', marginTop: 2 }}>
                    Risk {Number(r.risk_score).toFixed(1)} · +{Number(r.delay_hours).toFixed(1)}h · +${Number(r.extra_cost_usd || 0).toFixed(0)}
                  </div>
                </div>
                {r.recommended && (
                  <span style={{ fontSize: 9, background: 'rgba(0,212,180,.15)', color: '#00d4b4', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>BEST</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 8 }}>{r.description}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {approved.has(r.route_id)
                  ? <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Approved</span>
                  : (
                    <button
                      className="ml-approve-btn"
                      disabled={!!approving}
                      onClick={() => approveReroute(r.route_id)}
                    >
                      {approving === r.route_id ? '…' : 'Approve'}
                    </button>
                  )
                }
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* When no ML run yet for real shipment */}
      {!isDemoShipment && !pred && !loading && !err && ran && (
        <Section noBorder>
          <button className="ml-approve-btn" onClick={runML}>⚡ Run Full ML Analysis</button>
        </Section>
      )}
    </>
  );
}
