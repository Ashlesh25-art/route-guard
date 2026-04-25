import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Truck, Package, Navigation, DollarSign, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';

const STATUS_COLOR = { sent:'#3B82F6', negotiating:'#F59E0B', accepted:'#10B981', rejected:'#EF4444', draft:'#8A9BB5' };
const CARGO_LABELS = { standard:'Standard Dry', electronics:'Electronics', refrigerated:'Refrigerated', hazardous:'Hazardous', liquid_bulk:'Liquid Bulk', oversized:'Oversized' };

function calcRec(req) {
  const offered = 45000;
  const cost = Math.round((req.weight_kg||2400)*5.8) + Math.round(offered*0.377);
  return { offered, cost, recommended: Math.round(offered*1.078), minRate: Math.round(cost*1.08) };
}

function Pill({ status }) {
  const c = STATUS_COLOR[status] || '#8A9BB5';
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:8, color:c, background:`${c}20`, letterSpacing:'0.06em' }}>{String(status||'').toUpperCase()}</span>;
}

export default function ManagerCommunication() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selId, setSelId] = useState('');
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [channel, setChannel] = useState('sender');
  const [msgBody, setMsgBody] = useState('');
  const [offerAmt, setOfferAmt] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [driverMsg, setDriverMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const chatRef = useRef(null);

  const sel = requests.find(r => r.request_id === selId) || null;
  const assignedDriver = drivers.find(d => d.status === 'en-route') || drivers[0];

  const loadAll = async () => {
    setLoading(true);
    const [rR, dR] = await Promise.allSettled([api.get(ENDPOINTS.QUOTE_REQUESTS), api.get(ENDPOINTS.MANAGER_DRIVERS)]);
    const reqs = rR.status === 'fulfilled' && Array.isArray(rR.value.data) ? rR.value.data : [];
    setRequests(reqs);
    setDrivers(dR.status === 'fulfilled' && Array.isArray(dR.value.data) ? dR.value.data : []);
    if (!selId && reqs.length > 0) setSelId(reqs[0].request_id);
    setLoading(false);
  };

  const loadThread = async (id) => {
    if (!id) return;
    const [oR, mR] = await Promise.allSettled([api.get(ENDPOINTS.QUOTE_OFFERS(id)), api.get(ENDPOINTS.QUOTE_MESSAGES(id))]);
    setOffers(oR.status === 'fulfilled' && Array.isArray(oR.value.data) ? oR.value.data : []);
    setMessages(mR.status === 'fulfilled' && Array.isArray(mR.value.data) ? mR.value.data : []);
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (selId) loadThread(selId); }, [selId]);

  const sendMsg = async () => {
    if (!msgBody.trim() || !selId) return;
    setSending(true);
    try {
      await api.post(ENDPOINTS.QUOTE_MESSAGES(selId), { message_type:'text', body:msgBody.trim() });
      setMsgBody('');
      await loadThread(selId);
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed to send.'); }
    finally { setSending(false); }
  };

  const sendOffer = async () => {
    if (!offerAmt || !selId) return;
    setSending(true);
    try {
      await api.post(ENDPOINTS.QUOTE_OFFERS(selId), { offered_amount_usd: Number(offerAmt), currency:'USD', notes: offerNote||null });
      await api.post(ENDPOINTS.QUOTE_MESSAGES(selId), { message_type:'counter', body:`Offer proposal: $${Number(offerAmt).toLocaleString()} USD${offerNote?' — '+offerNote:''}`, counter_amount_usd: Number(offerAmt) });
      toast.success('Offer sent!');
      setOfferAmt(''); setOfferNote(''); setShowOffer(false);
      await Promise.all([loadAll(), loadThread(selId)]);
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed.'); }
    finally { setSending(false); }
  };

  const sendDriverMsg = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 400));
    toast.success(channel === 'emergency' ? '🚨 Emergency alert sent!' : 'Message sent to driver.');
    setDriverMsg('');
    setSending(false);
  };

  if (loading) return <div style={{ minHeight:400, display:'grid', placeItems:'center' }}><Spinner size="lg" /></div>;

  const CHANNELS = [
    { key:'sender', label:'💬 Sender Negotiation', color:'#3B82F6' },
    { key:'driver', label:'🚛 Driver Line', color:'#F59E0B' },
    { key:'emergency', label:'🚨 Emergency', color:'#EF4444' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Communication Hub</h1>
          <p className="page-subtitle">Negotiate with senders, message drivers, and manage emergency alerts.</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {requests.filter(r=>r.status==='negotiating').length > 0 &&
            <span style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>
              {requests.filter(r=>r.status==='negotiating').length} Negotiating
            </span>}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16, height:'calc(100vh - 200px)', minHeight:500 }}>

        {/* LEFT — conversation list */}
        <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-default)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'0.05em' }}>ACTIVE REQUESTS</div>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {requests.length === 0 && <p style={{ padding:16, color:'var(--text-muted)', fontSize:13 }}>No requests yet.</p>}
            {requests.map(req => (
              <div key={req.request_id} onClick={() => setSelId(req.request_id)}
                style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-default)', background: selId===req.request_id ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: selId===req.request_id ? '3px solid var(--accent-primary)' : '3px solid transparent', transition:'all 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:'var(--accent-primary)' }}>REQ-{req.request_id.slice(0,6).toUpperCase()}</span>
                  <Pill status={req.status} />
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{req.shipper_name || 'Sender'}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>
                  <Package size={10} style={{ display:'inline', marginRight:3 }} />
                  {CARGO_LABELS[req.cargo_type] || req.cargo_type || 'Cargo'}
                  {req.weight_kg ? ` · ${Number(req.weight_kg).toLocaleString()} kg` : ''}
                </div>
                {(req.origin_port_name || req.destination_port_name) && (
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    <Navigation size={10} style={{ display:'inline', marginRight:3 }} />
                    {req.origin_port_name||'Origin'} → {req.destination_port_name||'Dest'}
                  </div>
                )}
                {req.offer_count > 0 && <div style={{ fontSize:10, color:'var(--accent-primary)', marginTop:3 }}>● {req.offer_count} offer{req.offer_count>1?'s':''}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — chat area */}
        {!sel ? (
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-default)', display:'grid', placeItems:'center' }}>
            <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ opacity:0.2, marginBottom:12 }} />
              <p style={{ fontSize:14 }}>Select a request to open communication</p>
            </div>
          </div>
        ) : (
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-default)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--accent-primary)' }}>REQ-{sel.request_id.slice(0,6).toUpperCase()}</span>
                  <Pill status={sel.status} />
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                  {sel.shipper_name||'Sender'}{sel.shipper_company ? ` · ${sel.shipper_company}` : ''} · {CARGO_LABELS[sel.cargo_type]||sel.cargo_type||'Cargo'}
                </div>
              </div>
            </div>

            {/* Channel tabs */}
            <div style={{ display:'flex', gap:4, padding:'10px 14px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)' }}>
              {CHANNELS.map(ch => (
                <button key={ch.key} type="button" onClick={() => setChannel(ch.key)}
                  style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.2s',
                    background: channel===ch.key ? ch.color : 'var(--bg-card)',
                    color: channel===ch.key ? '#fff' : 'var(--text-secondary)' }}>
                  {ch.label}
                </button>
              ))}
            </div>

            {/* ── SENDER CHANNEL ── */}
            {channel === 'sender' && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {/* Offers strip */}
                {offers.length > 0 && (
                  <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-elevated)', display:'flex', gap:8, overflowX:'auto' }}>
                    {offers.map(o => (
                      <div key={o.offer_id} style={{ flexShrink:0, padding:'6px 12px', borderRadius:8, background:'var(--bg-card)', borderLeft:`3px solid ${o.status==='accepted'?'#10B981':o.status==='rejected'?'#EF4444':'#3B82F6'}` }}>
                        <div style={{ fontSize:14, fontWeight:800 }}>${Number(o.offered_amount_usd).toLocaleString()}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:o.status==='accepted'?'#10B981':o.status==='rejected'?'#EF4444':'#3B82F6' }}>{String(o.status).toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                  {messages.length === 0
                    ? <div style={{ margin:'auto', textAlign:'center', color:'var(--text-muted)' }}>
                        <MessageSquare size={32} style={{ opacity:0.2, marginBottom:8 }} />
                        <p style={{ fontSize:13 }}>No messages yet — start the conversation</p>
                      </div>
                    : messages.map(m => {
                        const mine = String(m.sender_user_id) === String(user?.user_id);
                        const isOffer = m.message_type === 'counter' && m.counter_amount_usd != null;
                        return (
                          <div key={m.message_id} style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start' }}>
                            {isOffer ? (
                              <div style={{ maxWidth:'70%', borderRadius:12, overflow:'hidden', background:mine?'linear-gradient(135deg,#3B82F6,#6366F1)':'var(--bg-elevated)', boxShadow:'0 2px 10px rgba(0,0,0,0.12)' }}>
                                <div style={{ padding:'8px 14px 5px', borderBottom:`1px solid ${mine?'rgba(255,255,255,0.15)':'var(--border-default)'}` }}>
                                  <div style={{ fontSize:9, fontWeight:700, opacity:0.7, color:mine?'#fff':'var(--text-muted)', marginBottom:1, letterSpacing:'0.08em' }}>
                                    {mine ? '📤 OFFER PROPOSAL' : '📥 COUNTER OFFER'} · {new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                  </div>
                                  <div style={{ fontSize:24, fontWeight:800, color:mine?'#fff':'var(--text-primary)', lineHeight:1.1 }}>
                                    ${Number(m.counter_amount_usd).toLocaleString()} <span style={{ fontSize:12, fontWeight:400, opacity:0.7 }}>USD</span>
                                  </div>
                                </div>
                                {m.body && <div style={{ padding:'5px 14px 8px', fontSize:12, color:mine?'rgba(255,255,255,0.85)':'var(--text-secondary)' }}>{m.body}</div>}
                              </div>
                            ) : (
                              <div style={{ maxWidth:'72%', padding:'8px 12px', borderRadius:mine?'12px 12px 4px 12px':'12px 12px 12px 4px', background:mine?'var(--accent-primary)':'var(--bg-elevated)', color:mine?'#fff':'var(--text-primary)' }}>
                                <div style={{ fontSize:10, opacity:0.65, marginBottom:3 }}>{mine?'You (Manager)':sel.shipper_name||'Sender'} · {new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                <div style={{ fontSize:13 }}>{m.body}</div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  }
                </div>

                {/* Offer form */}
                {showOffer && sel.status !== 'accepted' && (
                  <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border-default)', background:'rgba(59,130,246,0.06)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#3B82F6', marginBottom:8 }}>💰 Send Offer Proposal</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>AMOUNT (USD)</div>
                        <input type="number" className="input" value={offerAmt} onChange={e=>setOfferAmt(e.target.value)} placeholder={`e.g. ${calcRec(sel).recommended.toLocaleString()}`} />
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>NOTE (optional)</div>
                        <input type="text" className="input" value={offerNote} onChange={e=>setOfferNote(e.target.value)} placeholder="Transit time, terms..." />
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8 }}>
                      Recommended: ${calcRec(sel).recommended.toLocaleString()} · Min viable: ${calcRec(sel).minRate.toLocaleString()}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button type="button" className="btn-primary" disabled={sending||!offerAmt} onClick={sendOffer} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <CheckCircle2 size={14} />{sending?'Sending…':'Send Offer in Chat'}
                      </button>
                      <button type="button" onClick={()=>{setShowOffer(false);setOfferAmt('');setOfferNote('');}} style={{ padding:'6px 14px', borderRadius:6, border:'1px solid var(--border-default)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Input bar */}
                {sel.status !== 'accepted' && !showOffer && (
                  <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border-default)', display:'flex', gap:8, alignItems:'flex-end' }}>
                    <textarea className="textarea" rows={2} value={msgBody} onChange={e=>setMsgBody(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                      placeholder="Message to sender... (Enter to send)" style={{ flex:1, resize:'none' }} />
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <button type="button" className="btn-primary" disabled={sending||!msgBody.trim()} onClick={sendMsg} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px' }}>
                        <Send size={14} />{sending?'…':'Send'}
                      </button>
                      <button type="button" onClick={()=>setShowOffer(true)} style={{ padding:'7px 10px', borderRadius:6, border:'1px solid rgba(59,130,246,0.4)', background:'rgba(59,130,246,0.08)', color:'#3B82F6', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                        💰 Offer
                      </button>
                    </div>
                  </div>
                )}
                {sel.status === 'accepted' && (
                  <div style={{ padding:'12px 18px', borderTop:'1px solid #10B981', background:'rgba(16,185,129,0.06)', color:'#10B981', fontWeight:600, fontSize:13, textAlign:'center' }}>
                    ✅ Deal accepted — shipment has been created
                  </div>
                )}
              </div>
            )}

            {/* ── DRIVER CHANNEL ── */}
            {channel === 'driver' && (
              <div style={{ flex:1, padding:'18px', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(245,158,11,0.15)', display:'grid', placeItems:'center', flexShrink:0 }}>
                      <Truck size={22} style={{ color:'#F59E0B' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{assignedDriver?.full_name || 'No driver assigned'}</div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{assignedDriver?.email || ''}{assignedDriver?.phone_number ? ` · ${assignedDriver.phone_number}` : ''}</div>
                      {assignedDriver && <div style={{ fontSize:11, color:'#F59E0B', fontWeight:600, marginTop:2 }}>● {assignedDriver.status === 'en-route' ? 'On Route' : 'Available'}</div>}
                    </div>
                    <span style={{ padding:'6px 14px', borderRadius:8, background:'rgba(16,185,129,0.1)', color:'#10B981', fontSize:12, fontWeight:700, cursor:'pointer' }}>📞 Call</span>
                  </div>
                </div>
                <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:10 }}>📨 MESSAGE TO DRIVER</div>
                  <textarea className="textarea" rows={4} value={driverMsg} onChange={e=>setDriverMsg(e.target.value)} placeholder="Instructions, route update, pickup time, delivery notes..." style={{ marginBottom:10 }} />
                  <button type="button" className="btn-primary" disabled={sending||!driverMsg.trim()} onClick={sendDriverMsg} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Send size={14} />{sending?'Sending…':'Send to Driver'}
                  </button>
                </div>
              </div>
            )}

            {/* ── EMERGENCY CHANNEL ── */}
            {channel === 'emergency' && (
              <div style={{ flex:1, padding:'18px', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(239,68,68,0.15)', display:'grid', placeItems:'center' }}>
                      <span style={{ fontSize:22 }}>🚨</span>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:'#EF4444' }}>Emergency Alert System</div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Broadcasts to driver, dispatch, and operations team immediately</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {['Driver is unresponsive', 'Cargo damage reported', 'Road accident — need help', 'Customs hold — urgent', 'Vehicle breakdown', 'Route blockage'].map(p => (
                      <button key={p} type="button" onClick={()=>setDriverMsg(p)}
                        style={{ padding:'9px 12px', borderRadius:7, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.05)', color:'var(--text-primary)', textAlign:'left', cursor:'pointer', fontSize:12 }}>
                        ⚠️ {p}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea className="textarea" rows={4} value={driverMsg} onChange={e=>setDriverMsg(e.target.value)} placeholder="Describe the emergency in detail..." style={{ border:'1px solid rgba(239,68,68,0.4)' }} />
                <button type="button" disabled={sending} onClick={sendDriverMsg}
                  style={{ padding:'14px', borderRadius:10, border:'none', background:sending?'var(--bg-elevated)':'linear-gradient(135deg,#EF4444,#B91C1C)', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  🚨 {sending ? 'Sending Emergency Alert…' : 'SEND EMERGENCY ALERT TO ALL'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
