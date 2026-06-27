import React, { useState, useEffect, useRef } from 'react';
import Loading from '../../components/Loading/Loading';
import { investmentService } from '../../services/investmentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './BranchReceipt.css';

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const fmtIST = (utcStr) => {
  if (!utcStr) return '—';
  const d = new Date(utcStr);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yy = ist.getUTCFullYear();
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mn = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mn} IST`;
};

export default function BranchReceipt({ irn, onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef();

  const canPrint = ['branchmanager', 'superadmin'].includes(user?.role);

  useEffect(() => {
    if (!canPrint) {
      setError('Only Branch Manager can print receipts');
      setLoading(false);
      return;
    }
    investmentService.receipt(irn)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [irn, canPrint]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=700,height=900');
    win.document.write(`<!DOCTYPE html>
<html><head>
  <title>Receipt — ${irn}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a237e;background:#fff}
    .br-page{width:190mm;margin:0 auto;padding:10mm}
    .br-header{text-align:center;border-bottom:2px solid #0d47a1;padding-bottom:8px;margin-bottom:12px}
    .br-company{font-size:16px;font-weight:900;color:#0d47a1}
    .br-cin{font-size:8px;color:#546e7a;margin-top:2px}
    .br-title{font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0d47a1;margin-top:6px}
    .br-meta{display:flex;justify-content:space-between;font-size:9px;color:#546e7a;margin-bottom:12px}
    .br-meta b{color:#0d47a1}
    .br-section{border:1px solid #0d47a1;margin-bottom:10px}
    .br-section-title{background:#0d47a1;color:#fff;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 8px}
    .br-row{display:flex;border-bottom:1px solid #e8f0fe}
    .br-row:last-child{border-bottom:none}
    .br-label{width:130px;flex:none;padding:4px 8px;font-size:9px;color:#546e7a;background:#f8faff;border-right:1px solid #e8f0fe}
    .br-val{flex:1;padding:4px 8px;font-size:10px;font-weight:600}
    .br-val.green{color:#00695c;font-weight:900}
    .br-val.blue{color:#0d47a1;font-weight:900}
    .br-amount-box{border:2px solid #0d47a1;border-radius:4px;padding:10px 14px;margin:12px 0;background:#f0f4ff;text-align:center}
    .br-amount-label{font-size:9px;color:#546e7a;text-transform:uppercase;letter-spacing:1px}
    .br-amount-val{font-size:20px;font-weight:900;color:#00695c;margin-top:4px}
    .br-status{display:inline-block;background:#e8f5e9;color:#2e7d32;font-weight:800;padding:4px 12px;border-radius:4px;font-family:monospace;font-size:11px}
    .br-sigs{display:flex;justify-content:space-between;margin-top:24px;padding-top:12px;border-top:1px solid #0d47a1}
    .br-sig{text-align:center;font-size:9px;color:#546e7a}
    .br-sig-line{width:110px;border-bottom:1px solid #546e7a;height:28px;margin:0 auto 4px}
    .br-footer{text-align:center;font-size:8px;color:#546e7a;margin-top:14px;padding-top:8px;border-top:1px dashed #c5cae9}
    @media print{@page{size:A4 portrait;margin:8mm}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style>
</head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    toast.success('Receipt sent to printer');
  };

  if (!canPrint) {
    return (
      <div className="br-modal-wrap" onClick={onClose}>
        <div className="br-modal br-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="br-denied">
            <div className="br-denied-icon">🔒</div>
            <h3>Access Denied</h3>
            <p>Receipt printing is available for <strong>Branch Manager</strong> only.</p>
            <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="br-modal-wrap">
        <div className="br-modal"><Loading text="Loading receipt..." /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="br-modal-wrap" onClick={onClose}>
        <div className="br-modal br-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="br-denied">
            <div className="br-denied-icon">⚠️</div>
            <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
            <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const inv = data?.investor || {};
  const plan = data?.investment || {};
  const adv = data?.adviser || {};
  const paid = data?.installments_paid || 0;
  const total = data?.total_installments || 0;
  const pct = data?.completion_pct || 0;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="br-modal-wrap" onClick={onClose}>
      <div className="br-modal" onClick={e => e.stopPropagation()}>
        <div className="br-toolbar no-print">
          <div>
            <div className="br-toolbar-title">🧾 Branch Receipt</div>
            <div className="br-toolbar-irn">{irn}</div>
          </div>
          <div className="br-toolbar-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>✕ Close</button>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>🖨️ Print Receipt</button>
          </div>
        </div>

        <div className="br-scroll">
          <div ref={printRef}>
            <div className="br-page">
              <div className="br-header">
                <div className="br-company">DEFOEX INFRATECH PVT. LTD.</div>
                <div className="br-cin">CIN – U68100MP2026PTC083560</div>
                <div className="br-title">Investment Receipt</div>
              </div>

              <div className="br-meta">
                <span>IRN: <b>{data?.irn}</b></span>
                <span>Date: <b>{today}</b></span>
                <span>Status: <span className="br-status">{data?.status_label || `${paid} of ${total}`}</span></span>
              </div>

              <div className="br-section">
                <div className="br-section-title">Investor Details</div>
                {[
                  ['Investor ID', inv.investor_id],
                  ['Name', inv.full_name],
                  ["Father's Name", inv.father_spouse_name],
                  ['Mobile', inv.mobile],
                  ['City', inv.corr_city],
                ].map(([k, v]) => (
                  <div key={k} className="br-row">
                    <div className="br-label">{k}</div>
                    <div className="br-val">{v || '—'}</div>
                  </div>
                ))}
              </div>

              <div className="br-section">
                <div className="br-section-title">Plan Details</div>
                {[
                  ['Plan', plan.plan_name],
                  ['Tenure', plan.plan_tenure],
                  ['Monthly Amount', fmt(plan.monthly_amount)],
                  ['Total Investment', fmt(plan.total_investment_amount)],
                  ['Maturity Amount', fmt(plan.total_maturity_amount)],
                  ['ROI', plan.roi_display],
                  ['Payment Mode', plan.payment_mode],
                  ['Investment Date', plan.investment_date],
                  ['Approval', plan.approval_status],
                ].map(([k, v]) => (
                  <div key={k} className="br-row">
                    <div className="br-label">{k}</div>
                    <div className={`br-val ${k === 'Maturity Amount' ? 'green' : k === 'Monthly Amount' ? 'blue' : ''}`}>{v || '—'}</div>
                  </div>
                ))}
              </div>

              {(adv?.adviser_code || inv.adviser_code) && (
                <div className="br-section">
                  <div className="br-section-title">Adviser</div>
                  {[
                    ['Adviser Code', adv.adviser_code || inv.adviser_code],
                    ['Name', adv.full_name],
                    ['Rank', adv.rank_name],
                  ].map(([k, v]) => (
                    <div key={k} className="br-row">
                      <div className="br-label">{k}</div>
                      <div className="br-val">{v || '—'}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="br-amount-box">
                <div className="br-amount-label">Installment Progress</div>
                <div className="br-amount-val">{paid} / {total} paid ({pct}%)</div>
                <div style={{ marginTop: 8, fontSize: '9px', color: '#546e7a' }}>
                  Remaining installments: {data?.remaining_installments ?? (total - paid)}
                </div>
              </div>

              <div className="br-sigs">
                <div className="br-sig">
                  <div className="br-sig-line" />
                  Investor Signature
                </div>
                <div className="br-sig">
                  <div className="br-sig-line" />
                  Branch Manager
                </div>
                <div className="br-sig">
                  <div className="br-sig-line" />
                  Company Seal
                </div>
              </div>

              <div className="br-footer">
                Printed by {user?.full_name} ({user?.role}) · {fmtIST(data?.printed_at)}
                <br />
                This is a computer-generated receipt. No signature required for electronic copy.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
