import { useEffect, useState } from 'react';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';

const C = { teal:'#00d4b4', amber:'#f59e0b', red:'#ef4444', green:'#10b981', gray:'#8a9bb5', dim:'#4a5f7a', border:'#1e2d45', white:'#f0f4ff' };

const css = `
.ml-section{padding:14px 16px;border-bottom:1px solid ${C.border};}
.ml-label{font-size:10px;color:${C.dim};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;}
.ml-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;}
.ml-val{font-weight:700;color:${C.white};}
.ml-route-card{background:#0d1a2e;border:1px solid ${C.border};border-radius:8px;padding:10px 12px;margin-bottom:8px;}
.ml-route-card.recommended{border-color:rgba(0,212,180,.4);background:rgba(0,212,180,.06);}
.ml-approve-btn{background:linear-gradient(135deg,${C.teal},#22d3ee);color:#000;font-weight:700;font-size:11px;padding:5px 14px;border:none;border-radius:6px;cursor:pointer;transition:all .2s;}
.ml-approve-btn:disabled{opacity:.5;cursor:not-allowed;}
.ml-approved{font-size:11px;color:${C.green};font-weight:700;}
.ml-bar-wrap{background:#1a2640;border-radius:4px;height:6px;overflow:hidden;margin-top:4px;}
.ml-bar{height:100%;border-radius:4px;transition:width .8s ease;}
.ml-decision{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;}
.ml-decision.REROUTE{background:rgba(239,68,68,.15);color:${C.red};border:1px solid rgba(239,68,68,.3);}
.ml-decision.MONITOR{background:rgba(245,158,11,.15);color:${C.amber};border:1px solid rgba(245,158,11,.3);}
.ml-decision.NORMAL{background:rgba(16,185,129,.15);color:${C.green};border:1px solid rgba(16,185,129,.3);}
.ml-spin{display:inline-block;width:14px;height:14px;border:2px solid ${C.border};border-top-color:${C.teal};border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
`;

function riskCol(level){ return {critical:C.red,high:C.red,medium:C.amber,low:C.green}[String(level||'').toLowerCase()]||C.gray; }

export default function MLPanel({ shipment }) {
  const [pred, setPred] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [approving, setApproving] = useState(null);
  const [approved, setApproved] = useState(new Set());
  const [err, setErr] = useState('');

  const isDemoShipment = String(shipment?.shipment_id||'').startsWith('demo-');

  const runML = async () => {
    if (!shipment?.shipment_id || isDemoShipment) return;
    setLoading(true); setErr(''); setRan(true);
    try {
      const r = await api.get(ENDPOINTS.ML_PREDICTION(shipment.shipment_id));
      setPred(r.data);
    } catch(e) {
      setErr(e?.response?.status === 403 ? 'Manager role required for full ML analysis.' : 'ML pipeline failed. Check backend connection.');
    } finally { setLoading(false); }
  };

  // Auto-run when shipment changes (reset state)
  useEffect(() => {
    setPred(null); setRan(false); setErr(''); setApproved(new Set());
    if (!isDemoShipment && shipment?.shipment_id) runML();
  }, [shipment?.shipment_id]);

  const approveReroute = async (routeId) => {
    setApproving(routeId);
    try {
      await api.post(`${ENDPOINTS.APPROVE_REROUTE(shipment.shipment_id)}?route_id=${routeId}`);
      setApproved(p => new Set([...p, routeId]));
    } catch { /* silent */ } finally { setApproving(null); }
  };

  const mo = pred?.model_outputs || {};
  const fi = pred?.financial_impact || {};
  const feat = pred?.feature_importance || {};

  return (
    <>
      <style>{css}</style>

      {/* Current Risk from shipment data */}
      <div className="ml-section">
        <div className="ml-label">Current Risk Assessment</div>
        <div className="ml-row">
          <span style={{color:C.gray}}>Risk Score</span>
          <span className="ml-val" style={{color:riskCol(shipment?.current_risk_level),fontSize:18}}>
            {shipment?.current_risk_score != null ? Number(shipment.current_risk_score).toFixed(1) : '—'}
          </span>
        </div>
        <div className="ml-row">
          <span style={{color:C.gray}}>Risk Level</span>
          <span className="ml-val" style={{color:riskCol(shipment?.current_risk_level)}}>
            {String(shipment?.current_risk_level||'Unknown').toUpperCase()}
          </span>
        </div>
        {shipment?.is_rerouted && (
          <div className="ml-row">
            <span style={{color:C.gray}}>Rerouted</span>
            <span className="ml-val" style={{color:C.teal}}>Yes ×{shipment.reroute_count||1}</span>
          </div>
        )}
      </div>

      {/* ML Analysis Section */}
      <div className="ml-section">
        <div className="ml-label">AI / ML Analysis</div>

        {isDemoShipment ? (
          <div style={{fontSize:12,color:C.amber,padding:'8px 0'}}>
            ⚠ Connect backend with live shipment data to run ML analysis.
          </div>
        ) : loading ? (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',fontSize:12,color:C.gray}}>
            <span className="ml-spin"/> Running ML pipeline…
          </div>
        ) : err ? (
          <div style={{fontSize:12,color:C.red,padding:'8px 0'}}>{err}</div>
        ) : !pred ? (
          <button className="ml-approve-btn" onClick={runML} style={{marginTop:4}}>⚡ Run ML Analysis</button>
        ) : (
          <>
            {/* Model outputs */}
            <div style={{marginBottom:12}}>
              {mo.reroute_decision && (
                <div className="ml-row" style={{marginBottom:8}}>
                  <span style={{color:C.gray}}>ML Decision</span>
                  <span className={`ml-decision ${mo.reroute_decision}`}>{mo.reroute_decision}</span>
                </div>
              )}
              {mo.risk_score != null && (
                <div className="ml-row">
                  <span style={{color:C.gray}}>Predicted Risk</span>
                  <span className="ml-val" style={{color:riskCol(mo.risk_level)}}>{Number(mo.risk_score).toFixed(1)}</span>
                </div>
              )}
              {mo.predicted_delay_hr != null && (
                <div className="ml-row">
                  <span style={{color:C.gray}}>Predicted Delay</span>
                  <span className="ml-val" style={{color:Number(mo.predicted_delay_hr)>2?C.amber:C.green}}>
                    {Number(mo.predicted_delay_hr).toFixed(1)}h
                  </span>
                </div>
              )}
            </div>

            {/* Feature importance bars */}
            {Object.keys(feat).length > 0 && (
              <div style={{marginBottom:12}}>
                <div className="ml-label" style={{marginBottom:6}}>Risk Factors</div>
                {Object.entries(feat).map(([k,v])=>(
                  <div key={k} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.gray,marginBottom:2}}>
                      <span>{k.replace(/_/g,' ')}</span><span>{(Number(v)*100).toFixed(0)}%</span>
                    </div>
                    <div className="ml-bar-wrap">
                      <div className="ml-bar" style={{width:`${Number(v)*100}%`,background:Number(v)>0.3?C.red:Number(v)>0.2?C.amber:C.teal}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Impact */}
            {fi.net_saving_usd != null && (
              <div style={{background:'rgba(16,185,129,.08)',border:`1px solid rgba(16,185,129,.2)`,borderRadius:8,padding:'10px 12px',marginBottom:12}}>
                <div className="ml-label" style={{marginBottom:6}}>Financial Impact</div>
                <div className="ml-row">
                  <span style={{color:C.gray}}>Expected Loss (current)</span>
                  <span className="ml-val" style={{color:C.red}}>${Number(fi.current_route_expected_loss_usd||0).toLocaleString()}</span>
                </div>
                <div className="ml-row">
                  <span style={{color:C.gray}}>Net Saving if Rerouted</span>
                  <span className="ml-val" style={{color:C.green}}>${Number(fi.net_saving_usd||0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Alternate Routes */}
            {pred.alternate_routes?.length > 0 && (
              <>
                <div className="ml-label">Alternate Routes</div>
                {pred.alternate_routes.slice(0,4).map(r=>(
                  <div key={r.route_id} className={`ml-route-card${r.recommended?' recommended':''}`}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.white}}>{r.name}</div>
                        <div style={{fontSize:11,color:C.gray}}>
                          Risk {Number(r.risk_score).toFixed(1)} · +{Number(r.delay_hours).toFixed(1)}h · +${Number(r.extra_cost_usd).toFixed(0)}
                        </div>
                      </div>
                      {r.recommended && <span style={{fontSize:10,color:C.teal,fontWeight:700}}>★ Best</span>}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:11,color:C.dim}}>{r.description}</span>
                      {approved.has(r.route_id)
                        ? <span className="ml-approved">✓ Approved</span>
                        : <button className="ml-approve-btn" disabled={!!approving} onClick={()=>approveReroute(r.route_id)}>
                            {approving===r.route_id?'…':'Approve'}
                          </button>
                      }
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
