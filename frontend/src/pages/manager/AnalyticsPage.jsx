import { useEffect, useMemo, useState } from 'react';
import {
	Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
	Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Area, AreaChart,
} from 'recharts';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';

const T = {
	navy: '#080E1A', card: '#0D1526', border: '#1A2A45',
	teal: '#00D4B4', amber: '#F59E0B', red: '#EF4444',
	green: '#10B981', white: '#F0F4FF', gray: '#8A9BB5', grayDim: '#4A5F7A',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  .an-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;margin-bottom:14px;}
  .an-metric{text-align:center;padding:16px 10px;}
  .an-metric .val{font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;}
  .an-metric .lbl{font-size:11px;color:${T.gray};margin-top:4px;}
  .an-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${T.border};font-size:13px;}
  .an-row:last-child{border-bottom:none;}
  .an-row .k{color:${T.gray};} .an-row .v{font-weight:600;color:${T.white};font-family:'JetBrains Mono',monospace;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
  .section-hdr{font-size:13px;font-weight:700;color:${T.white};margin-bottom:14px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  .fade{animation:fadeUp .4s ease both;}
  .recharts-text{fill:${T.gray}!important;font-size:11px!important;}
  .recharts-cartesian-grid-horizontal line,.recharts-cartesian-grid-vertical line{stroke:${T.border}!important;}
  .custom-tooltip{background:${T.navy};border:1px solid ${T.border};border-radius:8px;padding:10px 14px;font-size:12px;color:${T.white};}
`;

function StatCard({ label, value, color, sub }) {
	return (
		<div className="an-card an-metric fade">
			<div className="val" style={{ color: color || T.teal }}>{value}</div>
			<div className="lbl">{label}</div>
			{sub && <div style={{ fontSize: 10, color: T.grayDim, marginTop: 2 }}>{sub}</div>}
		</div>
	);
}

function CustomTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="custom-tooltip">
			<div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
			{payload.map((p) => (
				<div key={p.name} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
					<span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
					<span>{p.name}: <strong>{p.value}</strong></span>
				</div>
			))}
		</div>
	);
}

export default function AnalyticsPage() {
	const [overview, setOverview] = useState(null);
	const [accuracy, setAccuracy] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const [ov, ac] = await Promise.all([
					api.get(ENDPOINTS.OVERVIEW),
					api.get(ENDPOINTS.MODEL_ACCURACY),
				]);
				setOverview(ov.data);
				setAccuracy(ac.data);
			} catch {
				setError('Unable to load analytics. Check backend connection.');
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const pieData = useMemo(() => {
		if (!overview) return [];
		return [
			{ name: 'Critical', value: overview.critical_count, color: '#ef4444' },
			{ name: 'High', value: overview.high_risk_count, color: '#f97316' },
			{ name: 'Medium', value: overview.medium_risk_count, color: '#eab308' },
			{ name: 'Low', value: overview.low_risk_count, color: '#22c55e' },
		].filter(d => d.value > 0);
	}, [overview]);

	const riskHistory = overview?.risk_history_7_days || [];

	if (loading) return <div className="an-card" style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}><Spinner size="lg" /></div>;

	return (
		<>
			<style>{css}</style>
			<div style={{ color: T.white, fontFamily: "'Space Grotesk', sans-serif" }}>
				{error && <div className="an-card" style={{ borderLeft: `3px solid ${T.red}` }}><strong style={{ color: T.red }}>{error}</strong></div>}

				{/* Page Header */}
				<div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
					<h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 Analytics & Intelligence</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>Operational metrics, ML model performance, and financial insights</div>
				</div>

				{/* KPI Row */}
				<div className="grid-4">
					<StatCard label="Active Shipments" value={overview?.total_active_shipments ?? 0} color={T.teal} />
					<StatCard label="On-Time Rate" value={`${overview?.on_time_percentage ?? 0}%`} color={Number(overview?.on_time_percentage ?? 0) >= 80 ? T.green : T.amber} sub="Last 30 days" />
					<StatCard label="Currently Delayed" value={overview?.delayed_count ?? 0} color={T.red} />
					<StatCard label="Losses Prevented" value={`$${Number(overview?.financial_losses_prevented_usd ?? 0).toLocaleString()}`} color={T.green} sub="Via rerouting" />
				</div>

				{/* Risk Distribution Row */}
				<div className="grid-4" style={{ marginTop: 0 }}>
					<StatCard label="Critical Risk" value={overview?.critical_count ?? 0} color="#ef4444" />
					<StatCard label="High Risk" value={overview?.high_risk_count ?? 0} color="#f97316" />
					<StatCard label="Medium Risk" value={overview?.medium_risk_count ?? 0} color="#eab308" />
					<StatCard label="Low Risk" value={overview?.low_risk_count ?? 0} color="#22c55e" />
				</div>

				{/* Charts Row */}
				<div className="grid-2">
					{/* Bar Chart — 7 day risk history */}
					<div className="an-card fade" style={{ height: 340 }}>
						<div className="section-hdr">Daily Risk Distribution (7 Days)</div>
						<ResponsiveContainer width="100%" height="88%">
							<BarChart data={riskHistory}>
								<CartesianGrid strokeDasharray="4 4" stroke={T.border} />
								<XAxis dataKey="date" tick={{ fill: T.gray, fontSize: 10 }} />
								<YAxis tick={{ fill: T.gray, fontSize: 10 }} />
								<Tooltip content={<CustomTooltip />} />
								<Legend wrapperStyle={{ fontSize: 11 }} />
								<Bar dataKey="critical" stackId="risk" fill="#ef4444" radius={[0,0,0,0]} />
								<Bar dataKey="high" stackId="risk" fill="#f97316" />
								<Bar dataKey="medium" stackId="risk" fill="#eab308" />
								<Bar dataKey="low" stackId="risk" fill="#22c55e" radius={[4,4,0,0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Pie Chart — Current Risk Mix */}
					<div className="an-card fade" style={{ height: 340 }}>
						<div className="section-hdr">Current Risk Mix</div>
						<ResponsiveContainer width="100%" height="88%">
							<PieChart>
								<Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
									{pieData.map((s) => <Cell key={s.name} fill={s.color} />)}
								</Pie>
								<Tooltip content={<CustomTooltip />} />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* ML Model Performance */}
				<div className="an-card fade" style={{ borderLeft: `3px solid ${T.teal}` }}>
					<div className="section-hdr">🤖 ML Model Performance</div>
					<div className="grid-3">
						<div>
							<div style={{ fontSize: 11, color: T.gray }}>XGBoost Risk R²</div>
							<div style={{ fontSize: 28, fontWeight: 700, color: T.teal, fontFamily: "'JetBrains Mono', monospace" }}>{((accuracy?.xgboost_r2 || 0) * 100).toFixed(1)}%</div>
							<div style={{ fontSize: 10, color: T.grayDim }}>RMSE: {accuracy?.xgboost_rmse || '—'}</div>
						</div>
						<div>
							<div style={{ fontSize: 11, color: T.gray }}>Delay Prediction MAE</div>
							<div style={{ fontSize: 28, fontWeight: 700, color: T.amber, fontFamily: "'JetBrains Mono', monospace" }}>{accuracy?.random_forest_delay_mae || 0}h</div>
							<div style={{ fontSize: 10, color: T.grayDim }}>Random Forest model</div>
						</div>
						<div>
							<div style={{ fontSize: 11, color: T.gray }}>Reroute Decision</div>
							<div style={{ fontSize: 28, fontWeight: 700, color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>{accuracy?.gradient_boost_accuracy || 0}%</div>
							<div style={{ fontSize: 10, color: T.grayDim }}>Gradient Boosting accuracy</div>
						</div>
					</div>
				</div>

				{/* Bottom Grid */}
				<div className="grid-2">
					{/* Financial Overview */}
					<div className="an-card fade">
						<div className="section-hdr">💰 Financial Overview</div>
						<div className="an-row"><span className="k">Total Cargo Value Monitored</span><span className="v">${Number(overview?.total_value_monitored_usd ?? 0).toLocaleString()}</span></div>
						<div className="an-row"><span className="k">Reroutes This Week</span><span className="v">{overview?.rerouted_this_week ?? 0}</span></div>
						<div className="an-row"><span className="k">Financial Losses Prevented</span><span className="v" style={{ color: T.green }}>${Number(overview?.financial_losses_prevented_usd ?? 0).toLocaleString()}</span></div>
						<div className="an-row"><span className="k">Avg Saving Per Reroute</span><span className="v">${overview?.rerouted_this_week ? Math.round(Number(overview.financial_losses_prevented_usd) / overview.rerouted_this_week).toLocaleString() : '—'}</span></div>
					</div>

					{/* Operations Stats */}
					<div className="an-card fade">
						<div className="section-hdr">⚙️ Operations Stats</div>
						<div className="an-row"><span className="k">Total Predictions Made</span><span className="v">{accuracy?.total_predictions_made ?? 0}</span></div>
						<div className="an-row"><span className="k">Correct Reroute Decisions</span><span className="v" style={{ color: T.green }}>{accuracy?.correct_reroute_decisions ?? 0}</span></div>
						<div className="an-row"><span className="k">Incorrect Decisions</span><span className="v" style={{ color: T.red }}>{accuracy?.incorrect_reroute_decisions ?? 0}</span></div>
						<div className="an-row"><span className="k">Overall Model Accuracy</span><span className="v" style={{ color: T.teal }}>{accuracy?.overall_model_accuracy ?? 0}%</span></div>
					</div>
				</div>
			</div>
		</>
	);
}
