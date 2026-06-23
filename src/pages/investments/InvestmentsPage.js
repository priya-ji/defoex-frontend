import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { investmentService } from '../../services/investmentService';
import { useAuth } from '../../context/AuthContext';
import PrintReceipt from './PrintReceipt';
import BranchReceipt from './BranchReceipt';
import toast from 'react-hot-toast';

// MIS Plan definitions — from official rate chart
// 3Y: monthly×36 = total, total×(7/6) = maturity  (ROI 16.67%)
// 5Y: monthly×60 = total, total×(4/3) = maturity  (ROI 33.33%)
// 7Y: monthly×84 = total, total×(19/14) = maturity (ROI 35.71%)
const MIS_TABLE = {
  '3Y': { months:36, label:'3 Years', prefix:'6M', roi_num:7,  roi_den:6,  roi_pct:'16.67%' },
  '5Y': { months:60, label:'5 Years', prefix:'6M', roi_num:4,  roi_den:3,  roi_pct:'33.33%' },
  '7Y': { months:84, label:'7 Years', prefix:'6M', roi_num:19, roi_den:14, roi_pct:'35.71%' },
};
const ROI = {
  '3Y': { num:7,  den:6,  label:'16.67%' },
  '5Y': { num:4,  den:3,  label:'33.33%' },
  '7Y': { num:19, den:14, label:'35.71%' },
};

// Exact formula: maturity = monthly × months × (roi_num / roi_den)
// Example: 1000 × 36 × (7/6) = 42000 ✓
const calcMaturity = (monthly, tenure, months) => {
  const r = ROI[tenure];
  if (!r || !monthly) return 0;
  return Math.round(monthly * months * r.num / r.den);
};


// SIS Plan — 7.5 Years, lump sum × 2
// Multiples of ₹1,000 — minimum ₹5,000
const SIS_PLAN = {
  tenure: '7.5Y', months: 90, label: '7.5 Years',
  roi: 2, roi_pct: '100%',
  min: 5000, multiple: 1000,
};
const SIS_REF = [
  [5000,    10000],   [10000,   20000],   [20000,   40000],
  [30000,   60000],   [40000,   80000],   [50000,   100000],
  [100000,  200000],  [150000,  300000],  [200000,  400000],
  [250000,  500000],  [300000,  600000],  [350000,  700000],
  [400000,  800000],  [450000,  900000],  [500000,  1000000],
  [600000,  1200000], [700000,  1400000], [800000,  1600000],
  [900000,  1800000], [1000000, 2000000],
];

// MIS Reference table from official chart
const MIS_REF = [
  [100,   3600,   4200,   6000,   8000,   8400,   11400],
  [200,   7200,   8400,   12000,  16000,  16800,  22800],
  [500,   18000,  21000,  30000,  40000,  42000,  57000],
  [1000,  36000,  42000,  60000,  80000,  84000,  114000],
  [1500,  54000,  63000,  90000,  120000, 126000, 171000],
  [2000,  72000,  84000,  120000, 160000, 168000, 228000],
  [2500,  90000,  105000, 150000, 200000, 210000, 285000],
  [3000,  108000, 126000, 180000, 240000, 252000, 342000],
  [3500,  126000, 147000, 210000, 280000, 294000, 399000],
  [4000,  144000, 168000, 240000, 320000, 336000, 456000],
  [5000,  180000, 210000, 300000, 400000, 420000, 570000],
  [6000,  216000, 252000, 360000, 480000, 504000, 684000],
  [7500,  270000, 315000, 450000, 500000, 630000, 855000],
  [9000,  324000, 378000, 540000, 720000, 756000, 1026000],
  [10000, 360000, 420000, 600000, 800000, 840000, 1140000],
  [12000, 432000, 504000, 720000, 960000, 1008000,1368000],
  [15000, 540000, 630000, 900000, 1200000,1260000,1710000],
  [20000, 720000, 840000, 1200000,1600000,1680000,2280000],
  [25000, 900000, 1050000,1500000,2000000,2100000,2850000],
  [30000, 1080000,1260000,1800000,2400000,2520000,3420000],
];
const fmt  = n => '\u20b9' + (n||0).toLocaleString('en-IN');

/* Investment Status label: 6M-1of36 */
const statusLabel = (plan) => {
  const prefix = '6M';
  const paid   = plan.installments_paid || 0;
  const total  = plan.total_installments || (plan.plan_tenure==='3Y'?36:plan.plan_tenure==='5Y'?60:84);
  return `${prefix}-${paid}of${total}`;
};

export default function InvestmentsPage() {
  const { user } = useAuth();
  const [view, setView] = useState('list');

  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Investment Plans</h1><p className="text-muted">MIS / SIS plan management</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[
            ['list',    'All Plans'],
            ['mis',     'New MIS Plan'],
            ['sis',     'New SIS Plan'],
            ['contrib', 'MIS Contribution'],
            ['approve', 'Approve Investment'],
          ].map(([key,label]) => (
            <button key={key}
              className={`btn ${view===key?'btn-primary':'btn-outline'}`}
              onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'list'    && <PlanList />}
      {view === 'mis'     && <NewPlanForm type="MIS" onDone={() => setView('approve')} />}
      {view === 'sis'     && <NewSISForm onDone={() => setView('approve')} />}
      {view === 'contrib' && <MISContribution onDone={() => setView('approve')} />}
      {view === 'approve' && <ApproveInvestment />}
    </div>
  );
}

/* ══ LIST INVESTMENT ══ */
function PlanList() {
  const { user } = useAuth();
  const [data,    setData]    = useState({ items:[] });
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [receiptIrn,       setReceiptIrn]       = useState(null);
  const [branchReceiptIrn, setBranchReceiptIrn] = useState(null);

  useEffect(() => {
    setLoading(true);
    investmentService.list({ page:1 })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? (data.items||[]).filter(p =>
        p.irn?.toLowerCase().includes(search.toLowerCase()) ||
        p.investor_id?.toLowerCase().includes(search.toLowerCase()))
    : (data.items||[]);

  return (
    <>
      <Panel title="All Investment Plans">
        {/* Search by Bond No. */}
        <div style={{display:'flex',gap:10,marginBottom:14,maxWidth:420}}>
          <input
            style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
            placeholder="🔍 Search by Bond No. (IRN)"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="btn btn-outline btn-sm" onClick={() => setSearch('')}>✕</button>}
        </div>

        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>IRN (Bond No.)</th><th>Investor ID</th>
                <th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th><th>ROI</th>
                <th>Investment Status</th>
                <th>Approval</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={p.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{p.investor_id}</code></td>
                  <td><strong>{p.plan_name}</strong></td>
                  <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                  <td>{fmt(p.total_investment_amount)}</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                  <td style={{color:'var(--primary)',fontWeight:700}}>{p.roi_display}</td>
                  {/* Investment Status: 6M-1of36, 6M-1of60, 6M-1of84 */}
                  <td>
                    <span style={{fontFamily:'monospace',fontSize:'0.75rem',background:'var(--bg-table-head)',padding:'3px 9px',borderRadius:4,fontWeight:700,color:'var(--text-primary)'}}>
                      {statusLabel(p)}
                    </span>
                  </td>
                  <td>
                    <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                      background:p.approval_status==='Approved'?'var(--success-bg)':p.approval_status==='Rejected'?'var(--danger-bg)':'var(--warning-bg)',
                      color:p.approval_status==='Approved'?'var(--success)':p.approval_status==='Rejected'?'var(--danger)':'var(--warning)'}}>
                      {p.approval_status}
                    </span>
                  </td>
                  <td>
                    {user?.role === 'superadmin'
                      ? <button className="btn btn-primary btn-sm" onClick={() => setReceiptIrn(p.irn)}>📜 Bond</button>
                      : <button className="btn btn-outline btn-sm" onClick={() => setBranchReceiptIrn(p.irn)}>🧾 Receipt</button>
                    }
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                  {search ? `No results for "${search}"` : 'No plans found'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>
      {receiptIrn      && <PrintReceipt  irn={receiptIrn}       onClose={() => setReceiptIrn(null)} />}
      {branchReceiptIrn && <BranchReceipt irn={branchReceiptIrn} onClose={() => setBranchReceiptIrn(null)} />}
    </>
  );
}

/* ══ NEW MIS / SIS PLAN ══ */
function NewPlanForm({ type, onDone }) {
  const [investorId,   setInvestorId]   = useState('');
  const [investorInfo, setInvestorInfo] = useState(null);
  const [fetching,     setFetching]     = useState(false);
  const [tenure,       setTenure]       = useState('3Y');
  const [monthly,      setMonthly]      = useState('');
  const [payMode,      setPayMode]      = useState('Cash');
  const [invDate,      setInvDate]      = useState(new Date().toISOString().split('T')[0]);
  const [submitting,   setSubmitting]   = useState(false);

  const months   = MIS_TABLE[tenure]?.months || 36;
  const total    = parseFloat(monthly||0) * months;
  const maturity = calcMaturity(parseFloat(monthly||0), tenure, months);

  /* Get Details button — works for both Investor ID and Adviser ID */
  const getDetails = async () => {
    if (!investorId.trim()) { toast.error('Enter Investor ID or Adviser ID'); return; }
    setFetching(true);
    setInvestorInfo(null);
    try {
      const { data } = await api.get(`/api/investment-plans/get-investor-details/${investorId.trim()}`);
      setInvestorInfo(data.data);
      toast.success('Details fetched');
    } catch(e) {
      toast.error(e.response?.data?.message || 'ID not found');
    } finally { setFetching(false); }
  };

  const submit = async () => {
    if (!investorId || !monthly || parseFloat(monthly) <= 0) {
      toast.error('Enter Investor ID and Monthly Amount'); return;
    }
    setSubmitting(true);
    try {
      await investmentService.create({
        investor_id:    investorId.trim(),
        plan_type:      type,
        plan_tenure:    tenure,
        monthly_amount: parseFloat(monthly),
        payment_mode:   payMode,
        investment_date:invDate,
      });
      toast.success(`${type} Plan created! Go to Approve Investment tab.`);
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,alignItems:'start'}}>
      <Panel title={`New ${type} Plan`}>

        {/* Enter Investor ID / Adviser ID — Note: investor & adviser can do investment */}
        <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:14,marginBottom:14,border:'1px solid var(--border)'}}>
          <Field label="Enter Investor ID / Adviser ID">
            <div style={{display:'flex',gap:8}}>
              <Input value={investorId}
                onChange={e => { setInvestorId(e.target.value.trim()); setInvestorInfo(null); }}
                placeholder="e.g. DFX-2026-000002"
                style={{flex:1,fontFamily:'monospace'}} />
              <button className="btn btn-outline" onClick={getDetails} disabled={fetching} style={{flexShrink:0}}>
                {fetching ? '...' : 'Get Details'}
              </button>
            </div>
          </Field>
          <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>
            Note: Investor &amp; Adviser can do investment
          </div>

          {/* Fetch the Investor Details */}
          {investorInfo && (
            <div style={{background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-sm)',padding:'12px 14px',marginTop:10}}>
              <div style={{fontWeight:700,color:'var(--success)',marginBottom:8}}>✅ Details Fetched</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:'0.82rem'}}>
                {[
                  ['Adviser/Investor ID', investorInfo.investor_id],
                  ['Investor Name',       investorInfo.investor_name],
                  ['Father Name',         investorInfo.father_name||'—'],
                  ['Mobile',              investorInfo.mobile],
                  ['Adviser ID',          investorInfo.adviser_id],
                  ['Adviser Name',        investorInfo.adviser_name||'—'],
                  ['Nominee',             investorInfo.nominee_name||'—'],
                  ['Relation',            investorInfo.nominee_relation||'—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{k}: </span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ADD PLAN section */}
        <div style={{fontWeight:700,marginBottom:10,fontSize:'0.9rem'}}>Add Plan</div>

        {/* Tenure selector */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
          {Object.entries(MIS_TABLE).map(([key,v]) => (
            <div key={key} onClick={() => setTenure(key)} style={{
              padding:14, textAlign:'center', cursor:'pointer',
              border:`2px solid ${tenure===key?'var(--primary)':'var(--border)'}`,
              borderRadius:'var(--border-radius-lg)',
              background: tenure===key ? 'var(--primary)' : 'var(--bg-input)',
            }}>
              <div style={{fontWeight:700,color:tenure===key?'#fff':'var(--text-primary)'}}>{type} {key}</div>
              <div style={{fontSize:'0.78rem',color:tenure===key?'rgba(255,255,255,0.7)':'var(--text-muted)'}}>{v.label}</div>
              <div style={{fontSize:'0.75rem',color:tenure===key?'rgba(255,255,255,0.6)':'var(--text-muted)'}}>{v.months} Months</div>
              {/* Investment Status field */}
              <div style={{marginTop:4,fontFamily:'monospace',fontSize:'0.7rem',fontWeight:700,
                background:tenure===key?'rgba(255,255,255,0.15)':'var(--bg-table-head)',
                padding:'2px 6px',borderRadius:4,color:tenure===key?'#fff':'var(--text-muted)'}}>
                {v.prefix}-0of{v.months}
              </div>
            </div>
          ))}
        </div>

        <div className="reg-form-row">
          <Field label="Monthly Amount (₹) *">
            <Input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="e.g. 1000" min="100" />
          </Field>
          <Field label="Payment Mode">
            <Select value={payMode} onChange={e => setPayMode(e.target.value)}>
              {['Cash','Cheque','DD','UPI','NEFT'].map(m => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Investment Date">
          <Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
        </Field>

        <div style={{background:'var(--warning-bg)',border:'1px solid var(--warning)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginBottom:12,fontSize:'0.82rem',color:'var(--warning)'}}>
          ⚠️ After creating → go to <strong>Approve Investment</strong> tab
        </div>
        <button className="btn btn-primary btn-full" onClick={submit}
          disabled={submitting || !monthly || !investorId}>
          {submitting ? 'Creating...' : `✓ Create ${type} Plan`}
        </button>
      </Panel>

      {/* Plan Preview */}
      <div style={{background:'var(--bg-sidebar)',borderRadius:'var(--border-radius-lg)',padding:20,position:'sticky',top:16}}>
        <div style={{fontWeight:700,color:'#fff',marginBottom:16,fontSize:'0.9rem'}}>Plan Preview</div>
        {[
          ['Tenure',          `${MIS_TABLE[tenure]?.label}`],
          ['Installments',    months],
          ['Monthly',         <span style={{color:'var(--accent-light)',fontWeight:700}}>{fmt(parseFloat(monthly)||0)}</span>],
          ['Total Invest',    fmt(total)],
          ['Maturity',        <span style={{color:'#a5d6a7',fontWeight:800,fontSize:'1.1rem'}}>{fmt(maturity)}</span>],
          ['ROI',             <span style={{color:'var(--accent-light)',fontWeight:700}}>{ROI[tenure]?.label}</span>],
          ['Status',          <span style={{fontFamily:'monospace',fontSize:'0.8rem'}}>{MIS_TABLE[tenure]?.prefix}-0of{months}</span>],
        ].map(([k,v]) => (
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:'0.82rem'}}>
            <span style={{color:'rgba(255,255,255,0.4)'}}>{k}</span>
            <span style={{color:'#fff',fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ MIS CONTRIBUTION ══ */
function MISContribution({ onDone }) {
  const [irnInput, setIrnInput]   = useState('');
  const [info,     setInfo]       = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [paying,   setPaying]     = useState(false);

  /* Enter Investment ID → Get Details */
  const getDetails = async () => {
    if (!irnInput.trim()) { toast.error('Enter Investment ID (IRN)'); return; }
    setLoading(true); setInfo(null);
    try {
      const { data } = await api.get(`/api/investment-plans/by-irn/${irnInput.trim()}`);
      setInfo(data.data);
    } catch(e) {
      toast.error(e.response?.data?.message || 'Investment ID not found');
    } finally { setLoading(false); }
  };

  const pay = async () => {
    if (!info) return;
    setPaying(true);
    try {
      const { data } = await api.post(`/api/investment-plans/pay-installment/${info.investment.id}`);
      const r = info.investment;
      if (r.is_overdue) {
        toast.success(
          `✅ Payment successful!\n₹${r.base_amount.toLocaleString('en-IN')} + ₹${r.penalty_amount} penalty = ₹${r.payable_amount.toLocaleString('en-IN')}\nGo to Approve Investment Tab.`,
          { duration: 7000 }
        );
      } else {
        toast.success(
          `✅ Payment successful! ₹${r.payable_amount.toLocaleString('en-IN')}\nGo to Approve Investment Tab.`,
          { duration: 5000 }
        );
      }
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  const inv = info?.investment;
  const investor = info?.investor;

  return (
    <Panel title="MIS Contribution" subtitle="Enter Investment ID to view and pay installments">

      {/* Enter Investment ID */}
      <div style={{display:'flex',gap:8,marginBottom:16,maxWidth:500}}>
        <Input value={irnInput}
          onChange={e => { setIrnInput(e.target.value.trim()); setInfo(null); }}
          placeholder="Enter Investment ID e.g. DFX-IRN-2026-00001"
          style={{flex:1,fontFamily:'monospace'}} />
        <button className="btn btn-primary" onClick={getDetails} disabled={loading}>
          {loading ? '...' : 'Get Details'}
        </button>
      </div>

      {loading && <Loading />}

      {info && (
        <>
          {/* Fetch the Investor Details */}
          <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:'14px 16px',marginBottom:16,border:'1px solid var(--border)'}}>
            <div style={{fontWeight:700,marginBottom:8,fontSize:'0.9rem'}}>Investor Details</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px 16px',fontSize:'0.82rem'}}>
              {[
                ['Investor ID',  investor?.investor_id],
                ['Investor Name',investor?.investor_name],
                ['Father Name',  investor?.father_name||'—'],
                ['Mobile',       investor?.mobile],
                ['Adviser ID',   investor?.adviser_id],
                ['Nominee',      investor?.nominee_name ? `${investor.nominee_name} (${investor.nominee_relation||'—'})` : '—'],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{k}</div>
                  <strong>{v||'—'}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Info + Status */}
          <div style={{border:'1px solid var(--border)',borderRadius:'var(--border-radius-lg)',padding:16,marginBottom:14,background:'var(--bg-card)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div>
                <code style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--success)',background:'var(--success-bg)',padding:'2px 8px',borderRadius:4}}>{inv.irn}</code>
                <span style={{marginLeft:10,fontWeight:700}}>{inv.plan_name}</span>
              </div>
              {/* Investment Status: 1 of 36 */}
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Investment Status:</span>
                <span style={{fontFamily:'monospace',fontWeight:800,fontSize:'0.9rem',background:'var(--bg-table-head)',padding:'4px 12px',borderRadius:6,color:'var(--text-primary)'}}>
                  {inv.status_label}
                </span>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px 16px',fontSize:'0.82rem',marginBottom:14}}>
              <div><span style={{color:'var(--text-muted)'}}>Monthly: </span><strong>{fmt(inv.monthly_amount)}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Next Due: </span>
                <strong style={{color:inv.is_overdue?'var(--danger)':'var(--text-primary)'}}>
                  {inv.next_due_date||'—'}{inv.is_overdue?' ⚠️':''}
                </strong>
              </div>
              <div><span style={{color:'var(--text-muted)'}}>Maturity: </span><strong style={{color:'var(--success)'}}>{fmt(inv.total_maturity_amount)}</strong></div>
            </div>

            {/* "6M = Scheduled Payment" × number */}
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:12,padding:'6px 10px',background:'var(--bg-input)',borderRadius:4}}>
              6M = Scheduled Payment × {inv.total_installments} installments
            </div>

            {/* Case 1 / Case 2 — amount display */}
            <div style={{
              background: inv.is_overdue ? 'var(--danger-bg)' : 'var(--success-bg)',
              border: `1.5px solid ${inv.is_overdue ? 'var(--danger)' : 'var(--success)'}`,
              borderRadius:'var(--border-radius-sm)',
              padding:'14px 16px', marginBottom:14
            }}>
              {inv.is_overdue ? (
                /* Case where due date is exceeded → show with penalty */
                <div>
                  <div style={{fontWeight:700,color:'var(--danger)',marginBottom:6}}>⚠️ Due Date Exceeded — Penalty Added</div>
                  <div style={{fontSize:'0.9rem'}}>
                    Amount: <strong>{fmt(inv.base_amount)}</strong>
                    <span style={{margin:'0 8px',color:'var(--text-muted)'}}>+</span>
                    Penalty: <strong>₹{inv.penalty_amount}</strong>
                    <span style={{margin:'0 8px',color:'var(--text-muted)'}}>→</span>
                    Total: <strong style={{fontSize:'1.1rem',color:'var(--danger)'}}>{fmt(inv.payable_amount)}</strong>
                  </div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>
                    Example: ₹{inv.base_amount.toLocaleString('en-IN')}+₹{inv.penalty_amount} = ₹{inv.payable_amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ) : (
                /* Case where due date NOT exceeded → show normal amount */
                <div>
                  <div style={{fontWeight:700,color:'var(--success)',marginBottom:6}}>✅ On Time</div>
                  <div style={{fontSize:'0.9rem'}}>
                    Amount: <strong style={{fontSize:'1.2rem'}}>{fmt(inv.payable_amount)}</strong>
                  </div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>
                    Example: ₹{inv.payable_amount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            {/* Continue Investment button */}
            <button className="btn btn-primary"
              style={{width:'100%',padding:'12px',fontSize:'0.95rem',fontWeight:700}}
              onClick={pay}
              disabled={paying || (inv.installments_paid >= inv.total_installments)}>
              {paying ? 'Processing...'
                : inv.installments_paid >= inv.total_installments
                ? '✅ All Installments Paid'
                : `Continue Investment — Pay ${fmt(inv.payable_amount)}`}
            </button>

            {!paying && (
              <div style={{textAlign:'center',fontSize:'0.75rem',color:'var(--text-muted)',marginTop:8}}>
                Payment successful → we will have to go Approve Tab
              </div>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ══ APPROVE INVESTMENT ══ */
function ApproveInvestment() {
  const [data,   setData]   = useState({ items:[] });
  const [loading,setLoading]= useState(true);
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    investmentService.list({ status:'Pending' })
      .then(r => setData(r.data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (plan, action) => {
    setActing(plan.id);
    try {
      await investmentService.approve(plan.id, action);
      if (action === 'approve') {
        /* Generate Investment ID → Display in Toaster */
        toast((t) => (
          <div>
            <div style={{fontWeight:700,color:'var(--success)',marginBottom:6}}>🎉 Investment Successfully Created!</div>
            <div style={{fontFamily:'monospace',fontSize:'0.85rem',lineHeight:1.8}}>
              Investment ID: <strong style={{color:'var(--primary)'}}>{plan.irn}</strong>
            </div>
          </div>
        ), { duration: 10000, style:{minWidth:280} });
      } else {
        toast.success(`Investment ${plan.irn} deleted`);
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setActing(null); }
  };

  return (
    <Panel title="Approve Investment Tab"
      subtitle="Click Approve to generate Investment ID and display in Toaster">
      {loading ? <Loading /> : (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>IRN</th><th>Investor ID</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(data.items||[]).map((p,i) => (
              <tr key={p.id}>
                <td>{i+1}</td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{p.investor_id}</code></td>
                <td><strong>{p.plan_name}</strong></td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                <td>{fmt(p.total_investment_amount)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                <td><span style={{fontFamily:'monospace',fontSize:'0.75rem',background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontWeight:700}}>{statusLabel(p)}</span></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-success btn-sm" disabled={acting===p.id} onClick={() => act(p,'approve')}>
                      {acting===p.id ? '...' : '✓ Approve'}
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={acting===p.id} onClick={() => act(p,'reject')}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!(data.items||[]).length && (
              <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                No pending investments
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

/* ══ NEW SIS PLAN FORM ══ */
function NewSISForm({ onDone }) {
  const [investorId,   setInvestorId]   = useState('');
  const [investorInfo, setInvestorInfo] = useState(null);
  const [fetching,     setFetching]     = useState(false);
  const [amount,       setAmount]       = useState('');
  const [payMode,      setPayMode]      = useState('Cash');
  const [invDate,      setInvDate]      = useState(new Date().toISOString().split('T')[0]);
  const [submitting,   setSubmitting]   = useState(false);
  const [amtErr,       setAmtErr]       = useState('');

  const maturity  = parseFloat(amount||0) * 2;
  const isValid   = parseFloat(amount||0) >= 5000 && parseFloat(amount||0) % 1000 === 0;

  const validateAmt = (val) => {
    const n = parseFloat(val||0);
    if (n < 5000)      setAmtErr('Minimum investment is ₹5,000');
    else if (n % 1000) setAmtErr('Amount must be in multiples of ₹1,000');
    else               setAmtErr('');
  };

  const getDetails = async () => {
    if (!investorId.trim()) { toast.error('Enter Investor ID or Adviser ID'); return; }
    setFetching(true); setInvestorInfo(null);
    try {
      const { data } = await api.get(`/api/investment-plans/get-investor-details/${investorId.trim()}`);
      setInvestorInfo(data.data);
      toast.success('Details fetched');
    } catch(e) {
      toast.error(e.response?.data?.message || 'ID not found');
    } finally { setFetching(false); }
  };

  const submit = async () => {
    if (!investorId || !isValid) { toast.error('Enter valid investor ID and amount'); return; }
    setSubmitting(true);
    try {
      await investmentService.create({
        investor_id:    investorId.trim(),
        plan_type:      'SIS',
        plan_tenure:    '7.5Y',
        monthly_amount: parseFloat(amount),  // lump sum stored as monthly_amount
        payment_mode:   payMode,
        investment_date:invDate,
      });
      toast.success('SIS Plan created! Go to Approve Investment tab.');
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
      <Panel title="New SIS Plan — 7.5 Years">

        {/* Enter Investor ID / Adviser ID */}
        <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:14,marginBottom:14,border:'1px solid var(--border)'}}>
          <Field label="Enter Investor ID / Adviser ID">
            <div style={{display:'flex',gap:8}}>
              <Input value={investorId}
                onChange={e => { setInvestorId(e.target.value.trim()); setInvestorInfo(null); }}
                placeholder="e.g. DFX-2026-000002" style={{flex:1,fontFamily:'monospace'}} />
              <button className="btn btn-outline" onClick={getDetails} disabled={fetching} style={{flexShrink:0}}>
                {fetching ? '...' : 'Get Details'}
              </button>
            </div>
          </Field>

          {investorInfo && (
            <div style={{background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-sm)',padding:'12px 14px',marginTop:10}}>
              <div style={{fontWeight:700,color:'var(--success)',marginBottom:6}}>✅ Investor Details</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:'0.82rem'}}>
                {[
                  ['Investor ID',  investorInfo.investor_id],
                  ['Investor Name',investorInfo.investor_name],
                  ['Father Name',  investorInfo.father_name||'—'],
                  ['Mobile',       investorInfo.mobile],
                  ['Adviser ID',   investorInfo.adviser_id],
                  ['Adviser Name', investorInfo.adviser_name||'—'],
                  ['Nominee',      investorInfo.nominee_name ? `${investorInfo.nominee_name} (${investorInfo.nominee_relation||'—'})` : '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{k}: </span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plan Info */}
        <div style={{background:'var(--primary-glow)',border:'1px solid var(--primary)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginBottom:14,fontSize:'0.85rem'}}>
          <strong style={{color:'var(--primary)'}}>SIS Plan — Single Investment Scheme</strong>
          <div style={{color:'var(--text-muted)',marginTop:3}}>
            Tenure: <strong>7.5 Years (90 months)</strong> &nbsp;·&nbsp;
            ROI: <strong style={{color:'var(--success)'}}>100% return</strong> &nbsp;·&nbsp;
            Your money doubles
          </div>
        </div>

        {/* Investment Amount */}
        <Field label="Investment Amount (₹) *" error={amtErr}>
          <Input type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); validateAmt(e.target.value); }}
            placeholder="Minimum ₹5,000 — multiples of ₹1,000"
            min="5000" step="1000" />
        </Field>

        {/* Quick amount buttons from SIS_REF */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:6}}>Quick select:</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {[5000,10000,20000,50000,100000,200000,500000,1000000].map(a => (
              <button key={a}
                style={{padding:'4px 10px',fontSize:'0.75rem',border:'1px solid var(--border)',
                  borderRadius:4,background:parseFloat(amount)===a?'var(--primary)':'var(--bg-input)',
                  color:parseFloat(amount)===a?'#fff':'var(--text-primary)',cursor:'pointer'}}
                onClick={() => { setAmount(String(a)); setAmtErr(''); }}>
                {fmt(a)}
              </button>
            ))}
          </div>
        </div>

        <div className="reg-form-row">
          <Field label="Payment Mode">
            <Select value={payMode} onChange={e => setPayMode(e.target.value)}>
              {['Cash','Cheque','DD','UPI','NEFT'].map(m => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Investment Date">
            <Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
          </Field>
        </div>

        <div style={{background:'var(--warning-bg)',border:'1px solid var(--warning)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginBottom:12,fontSize:'0.82rem',color:'var(--warning)'}}>
          ⚠️ After creating → go to <strong>Approve Investment</strong> tab
        </div>

        <button className="btn btn-primary btn-full" onClick={submit}
          disabled={submitting || !amount || !isValid || !investorId}>
          {submitting ? 'Creating...' : '✓ Create SIS Plan'}
        </button>
      </Panel>

      {/* SIS Preview */}
      <div>
        <div style={{background:'var(--bg-sidebar)',borderRadius:'var(--border-radius-lg)',padding:20,marginBottom:12}}>
          <div style={{fontWeight:700,color:'#fff',marginBottom:16,fontSize:'0.9rem'}}>Plan Preview</div>
          {[
            ['Plan Type',       'SIS — Single Investment'],
            ['Tenure',          '7.5 Years (90 months)'],
            ['Investment',      <span style={{color:'var(--accent-light)',fontWeight:700}}>{fmt(parseFloat(amount)||0)}</span>],
            ['Maturity',        <span style={{color:'#a5d6a7',fontWeight:800,fontSize:'1.1rem'}}>{fmt(maturity)}</span>],
            ['ROI',             <span style={{color:'var(--accent-light)',fontWeight:700}}>100% (Money Doubles)</span>],
            ['Profit',          <span style={{color:'#a5d6a7',fontWeight:700}}>{fmt(maturity - (parseFloat(amount)||0))}</span>],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:'0.82rem'}}>
              <span style={{color:'rgba(255,255,255,0.4)'}}>{k}</span>
              <span style={{color:'#fff',fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>

        {/* SIS Reference Table */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--border-radius-lg)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem'}}>SIS Rate Chart</div>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
              <thead>
                <tr style={{background:'var(--bg-table-head)'}}>
                  <th style={{padding:'6px 12px',textAlign:'right',fontWeight:700}}>Investment</th>
                  <th style={{padding:'6px 12px',textAlign:'right',fontWeight:700,color:'var(--success)'}}>Maturity (7.5Y)</th>
                </tr>
              </thead>
              <tbody>
                {SIS_REF.map(([inv, mat]) => (
                  <tr key={inv}
                    style={{background:parseFloat(amount)===inv?'var(--primary-glow)':'',cursor:'pointer'}}
                    onClick={() => { setAmount(String(inv)); setAmtErr(''); }}>
                    <td style={{padding:'5px 12px',textAlign:'right',color:'var(--text-secondary)'}}>{fmt(inv)}</td>
                    <td style={{padding:'5px 12px',textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmt(mat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}