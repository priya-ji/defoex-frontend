import SearchEngine from '../../../components/SearchEngine/SearchEngine';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import { reportService } from '../../../services/reportService';
import { branchService } from '../../../services/branchService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './SuperAdminDashboard.css';

const PERIOD_LABELS = {
  '1_month': '1 Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year': '1 Year',
  'overall': 'Overall',
};

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const fmtCr = n => {
  const num = parseFloat(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  return fmt(num);
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      reportService.dashboardStats(),
      reportService.businessSummary(),
      branchService.adminWallet(),
      branchService.list(),
    ]).then(([s, b, w, bl]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setStats({ total_members: 0, total_investments: 0, monthly_business: 0, pending_members: 0, pending_investments: 0 });
      if (b.status === 'fulfilled') setSummary(b.value.data.data);
      else setSummary(null);
      if (w.status === 'fulfilled') setWalletData(w.value.data.data);
      else setWalletData(null);
      if (bl.status === 'fulfilled') setBranches(bl.value.data.data || []);
      else setBranches([]);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const aw = walletData?.admin_wallet || {};
  const walletByBranchId = Object.fromEntries(
    (walletData?.branch_wallets || []).map(b => [b.branch_id, b])
  );

  // Merge branch list + wallet balances (fallback if admin-wallet fails)
  const branchRows = branches.map(b => {
    const w = walletByBranchId[b.id] || b.wallet || {};
    return {
      branch_id: b.id,
      branch_code: b.branch_code,
      branch_name: b.branch_name,
      city: b.city,
      state: b.state,
      manager_name: b.manager_name,
      is_active: b.is_active,
      current_balance: w.current_balance ?? 0,
      cash_wallet: w.cash_wallet ?? 0,
      is_low_balance: w.is_low_balance ?? false,
    };
  });

  // If list API failed but admin-wallet succeeded, use wallet rows
  const displayBranches = branchRows.length
    ? branchRows
    : (walletData?.branch_wallets || []);

  const usedPct = parseFloat(aw.use_percentage || 0);
  const pendingTotal = (stats?.pending_members || 0) + (stats?.pending_investments || 0);

  const chartData = summary
    ? Object.entries(PERIOD_LABELS).map(([key, label]) => ({
        name: label,
        amount: summary.summary[key]?.total_business || 0,
      }))
    : [];

  const quickActions = [
    { label: 'Pending Approvals', icon: '✅', path: '/approvals' },
    { label: 'Manage Branches', icon: '🏢', path: '/branches' },
    { label: 'Admin Wallet', icon: '💳', path: '/wallet' },
    { label: 'List Investors', icon: '📋', path: '/members' },
    { label: 'All Reports', icon: '📊', path: '/reports' },
    { label: 'Manage Users', icon: '👥', path: '/users' },
  ];

  return (
    <div className="sa-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="text-muted">Complete platform overview</p>
        </div>
        <div className="sa-header-right">
          <div className="sa-quick-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>
              Approvals {pendingTotal > 0 ? `(${pendingTotal})` : ''}
            </button>
            <button type="button" className="btn btn-accent btn-sm" onClick={() => navigate('/wallet')}>
              Admin Wallet
            </button>
          </div>
          <div className="dashboard-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <SearchEngine />

      {walletData && (
        <div className="sa-wallet-bar">
          <div className="sa-wallet-stat">
            <span>Total Limit</span>
            <strong>{fmt(aw.total_limit)}</strong>
          </div>
          <div className="sa-wallet-stat">
            <span>Available</span>
            <strong className="green">{fmt(aw.available_balance)}</strong>
          </div>
          <div className="sa-wallet-stat">
            <span>Distributed</span>
            <strong className="red">{fmtCr(aw.total_distributed)}</strong>
          </div>
          <div className="sa-wallet-stat">
            <span>In Use</span>
            <strong className="blue">{fmtCr(aw.used_amount)}</strong>
          </div>
          <div className="sa-wallet-usage">
            <span>{usedPct.toFixed(1)}% used</span>
            <div className="sa-wallet-bar-track">
              <div className="sa-wallet-bar-fill" style={{ width: `${Math.min(usedPct, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid-4 sa-stats">
        <StatCard title="Total Investors" value={stats?.total_members || 0} icon="👥" color="primary" />
        <StatCard title="Active Investments" value={stats?.total_investments || 0} icon="📊" color="success" />
        <StatCard title="This Month Business" value={fmt(stats?.monthly_business)} icon="💰" color="warning" />
        <StatCard title="Pending Approvals" value={pendingTotal} icon="⏳" color="danger" />
      </div>

      <div className="dashboard-charts mt-3">
        <Panel title="Business Summary" subtitle="Investment volumes by time period">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="sa-empty">No business data available yet</div>
          )}
        </Panel>

        <Panel title="Approval Queue & Actions">
          <div className="approval-queue">
            <div className="queue-item">
              <div className="queue-label">Pending Registrations</div>
              <div className="queue-value warning">{stats?.pending_members || 0}</div>
            </div>
            <div className="queue-item">
              <div className="queue-label">Pending Investment Plans</div>
              <div className="queue-value warning">{stats?.pending_investments || 0}</div>
            </div>
          </div>
          <div className="sa-quick-list">
            {quickActions.map(a => (
              <button key={a.path} type="button" className="sa-qa-item" onClick={() => navigate(a.path)}>
                <span className="sa-qa-icon">{a.icon}</span>
                <span>{a.label}</span>
                <span className="sa-qa-arrow">›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Branches"
        subtitle={`${displayBranches.length} active branch${displayBranches.length !== 1 ? 'es' : ''} — wallet overview`}
        className="mt-3"
        actions={
          <div className="sa-branch-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/wallet')}>Admin Wallet</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/branches')}>Manage Branches</button>
          </div>
        }
      >
        {displayBranches.length > 0 ? (
          <div className="sa-branches-grid">
            {displayBranches.map(b => (
              <div
                key={b.branch_id}
                className={`sa-branch-card${b.is_low_balance ? ' sa-branch-card--low' : ''}`}
              >
                <div className="sa-branch-card__head">
                  <div className="sa-branch-icon">{b.branch_name?.[0] || 'B'}</div>
                  <div className="sa-branch-card__info">
                    <div className="sa-branch-name">{b.branch_name}</div>
                    <div className="sa-branch-code">{b.branch_code}</div>
                  </div>
                  {b.is_low_balance
                    ? <span className="sa-status-warn">Low Balance</span>
                    : <span className="sa-status-ok">OK</span>}
                </div>
                {(b.city || b.state) && (
                  <div className="sa-branch-meta">📍 {b.city || '—'}, {b.state || '—'}</div>
                )}
                {b.manager_name && (
                  <div className="sa-branch-meta">👤 {b.manager_name}</div>
                )}
                <div className="sa-branch-balances">
                  <div className="sa-branch-bal">
                    <span>Current Balance</span>
                    <strong className={b.is_low_balance ? 'low' : ''}>{fmt(b.current_balance)}</strong>
                  </div>
                  <div className="sa-branch-bal">
                    <span>Cash Wallet</span>
                    <strong>{fmt(b.cash_wallet)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm sa-branch-topup"
                  onClick={() => navigate('/wallet')}
                >
                  Top Up →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty-icon">🏢</div>
            <p>No branches found yet.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/branches')}>
              + Create Branch
            </button>
          </div>
        )}
      </Panel>

      {summary && (
        <Panel title="Business Totals by Period" subtitle="Platform-wide investment volumes" className="mt-3">
          <div className="business-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Investments</th>
                  <th>Total Business</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => {
                  const val = summary.summary[key] || {};
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>{val.investment_count || 0}</td>
                      <td><strong>{fmt(val.total_business)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
