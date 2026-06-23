import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RANKS = [
  [1,'SR'],[2,'SO'],[3,'SD'],[4,'SI'],[5,'DO'],[6,'RO'],[7,'ZO'],
  [8,'EM'],[9,'EM I'],[10,'EM II'],[11,'EM R'],[12,'EM C'],
  [13,'House 1'],[14,'House 2'],[15,'House 3'],[16,'House 4'],
  [17,'House 5'],[18,'House 6'],[19,'House 7'],[20,'House 8'],
];

export default function AdvisersPage() {
  const { user }   = useAuth();
  const isAdmin    = user?.role === 'superadmin';
  const [view,     setView]     = useState('list');
  const [advisers, setAdvisers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [detail,   setDetail]   = useState(null);
  const [credModal,setCredModal]= useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([api.get('/api/advisers/'), api.get('/api/branches/')])
      .then(([a,b]) => {
        if (a.status==='fulfilled') setAdvisers(a.value.data.data||[]);
        if (b.status==='fulfilled') setBranches(b.value.data.data||[]);
      }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending  = advisers.filter(a => !a.is_active  && !a.is_blacklisted);
  const approved = advisers.filter(a =>  a.is_active  && !a.is_blacklisted);

  // Badge count on Approved tab button
  const pendingCount = pending.length;

  const filtered = advisers.filter(a =>
    !search ||
    a.adviser_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.mobile?.includes(search)
  );

  // Flowchart: Status logic
  const getStatus = (a) => {
    if (a.is_blacklisted) return 'blacklist';
    if (!a.is_active)     return 'Not Active';
    return (a.investor_count > 0 || a.is_active) ? 'Active' : 'Not Active';
  };

  // Flowchart: Click Approve → Generate Username & Password → Display in Toaster
  const approveAdviser = async (adviser) => {
    try {
      const { data } = await api.post(`/api/advisers/${adviser.id}/approve`, { action:'approve' });
      const creds = data.data?.credentials;
      toast.success('Adviser approved!');
      if (creds) {
        setTimeout(() => setCredModal(creds), 300);
        setTimeout(() => {
          toast((t) => (
            <div>
              <div style={{fontWeight:700,color:'#00c853',marginBottom:6}}>🎉 Congratulations Adviser Created!</div>
              <div style={{fontFamily:'monospace',fontSize:'0.85rem',lineHeight:2}}>
                <div>Username: <strong>{creds.username}</strong></div>
                <div>Password: <strong>{creds.password}</strong></div>
              </div>
              <div style={{fontSize:'0.72rem',color:'#999',marginTop:4}}>10 digit hexadecimal</div>
            </div>
          ), { duration: 15000, style:{minWidth:260} });
        }, 600);
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const blacklistAdviser = async (adviser) => {
    if (!isAdmin) { toast.error('Only Admin can blacklist advisers'); return; }
    if (!window.confirm(`Blacklist ${adviser.full_name}? They cannot create investors.`)) return;
    try {
      await api.post(`/api/advisers/${adviser.id}/blacklist`);
      toast.success(`${adviser.full_name} blacklisted`);
      load();
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  const deleteAdviser = async (adviser) => {
    if (!window.confirm(`Delete ${adviser.full_name}?`)) return;
    try {
      await api.put(`/api/advisers/${adviser.id}`, { is_active:false });
      toast.success('Adviser deleted');
      load();
    } catch(e) { toast.error('Failed'); }
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Advisers</h1><p className="text-muted">Manage adviser registrations and approvals</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className={`btn ${view==='list'?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>List Adviser</button>
          <button className={`btn ${view==='create'?'btn-primary':'btn-outline'}`} onClick={()=>setView('create')}>+ New Adviser Registration</button>
          <button className={`btn ${view==='approved'?'btn-primary':'btn-outline'}`} onClick={()=>setView('approved')}>
            Approved Adviser
            {pendingCount>0 && <span style={{marginLeft:6,background:'#ff5252',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:'0.7rem',fontWeight:700}}>{pendingCount}</span>}
          </button>
        </div>
      </div>

      {/* ══ LIST ADVISER ══ */}
      {view==='list' && (
        <Panel title="List Adviser">
          {/* Search Box — find by Adviser ID */}
          <div style={{display:'flex',gap:10,marginBottom:16,maxWidth:420}}>
            <input
              style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
              placeholder="🔍 Search by Adviser ID / Name / Mobile"
              value={search} onChange={e=>setSearch(e.target.value)}
            />
            {search && <button className="btn btn-outline btn-sm" onClick={()=>setSearch('')}>✕</button>}
          </div>

          {loading ? <Loading /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr. No</th>
                  <th>Adviser ID</th>
                  <th>Rank Name & Number</th>
                  <th>Adviser Name</th>
                  <th>Father Name</th>
                  <th>Mobile Number</th>
                  <th>Date of Joining</th>
                  <th>Promoter Adviser Name</th>
                  <th>Promoter Adviser ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a,i) => {
                  const status = getStatus(a);
                  return (
                    <tr key={a.id}>
                      <td>{i+1}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{a.adviser_code}</code></td>
                      <td><strong>{a.rank_name}</strong> <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>(Rank {a.rank_id})</span></td>
                      <td><strong>{a.full_name}</strong></td>
                      <td>{a.father_name||'—'}</td>
                      <td>{a.mobile}</td>
                      <td style={{fontSize:'0.78rem'}}>{a.created_at?.split('T')[0]}</td>
                      <td style={{fontSize:'0.78rem'}}>{a.parent_adviser_name||'—'}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{a.parent_adviser_code||'—'}</code></td>
                      <td>
                        <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                          background:status==='Active'?'var(--success-bg)':status==='blacklist'?'var(--danger-bg)':'var(--warning-bg)',
                          color:status==='Active'?'var(--success)':status==='blacklist'?'var(--danger)':'var(--warning)'}}>
                          {status==='blacklist'?'Blacklisted':status}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>setDetail(a)}>View</button>
                          {isAdmin && status!=='blacklist' && (
                            <button className="btn btn-danger btn-sm" onClick={()=>blacklistAdviser(a)}>Blacklist</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No advisers found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {/* ══ NEW ADVISER REGISTRATION ══ */}
      {view==='create' && (
        <NewAdviserForm
          branches={branches}
          onDone={() => { setView('approved'); load(); }}
          onCancel={() => setView('list')}
        />
      )}

      {/* ══ APPROVED ADVISER ══ */}
      {view==='approved' && (
        <>
          {pending.length>0 && (
            <Panel title={`Pending Approval (${pending.length})`} className="mb-3"
              subtitle="Click Approve to generate Username & Password">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Promoter</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pending.map((a,i) => (
                    <tr key={a.id}>
                      <td>{i+1}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{a.adviser_code}</code></td>
                      <td><strong>{a.full_name}</strong></td>
                      <td>{a.rank_name}</td>
                      <td>{a.mobile}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{a.parent_adviser_code||'—'}</code></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-success btn-sm" onClick={()=>approveAdviser(a)}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm"  onClick={()=>deleteAdviser(a)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          <Panel title={`Approved Advisers (${approved.length})`}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {approved.map((a,i) => (
                  <tr key={a.id}>
                    <td>{i+1}</td>
                    <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{a.adviser_code}</code></td>
                    <td><strong>{a.full_name}</strong></td>
                    <td><span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>{a.rank_name}</span></td>
                    <td>{a.mobile}</td>
                    <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,background:'var(--success-bg)',color:'var(--success)'}}>Active</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setDetail(a)}>View</button>
                        {isAdmin && <button className="btn btn-danger btn-sm" onClick={()=>blacklistAdviser(a)}>Blacklist</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {approved.length===0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No approved advisers yet</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      {/* More Details Modal → 1. All Details of Adviser  2. List All Investor */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Adviser Details" size="lg">
        {detail && <AdviserDetailModal adviser={detail} onClose={()=>setDetail(null)} />}
      </Modal>

      {/* Credentials Modal */}
      <Modal open={!!credModal} onClose={()=>setCredModal(null)} title="🎉 Congratulations Adviser Created!" size="sm">
        {credModal && (
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:'2.5rem',marginBottom:12}}>🎊</div>
            <div style={{fontWeight:700,fontSize:'1rem',marginBottom:16,color:'var(--success)'}}>
              Congratulations Adviser Created
            </div>
            <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-md)',padding:'20px',fontFamily:'monospace',fontSize:'0.95rem',lineHeight:2.8,marginBottom:12,textAlign:'left'}}>
              <div style={{marginBottom:4}}>
                <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>Username:</span><br/>
                <strong style={{color:'var(--primary)',fontSize:'1.1rem'}}>{credModal.username}</strong>
              </div>
              <div>
                <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>Password: System generate password</span><br/>
                <strong style={{color:'var(--primary)',fontSize:'1.1rem'}}>{credModal.password}</strong>
              </div>
            </div>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:16}}>
              ( 10 digit hexadecimal )
            </div>
            <button className="btn btn-primary" onClick={()=>{
              navigator.clipboard.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
              toast.success('Credentials copied!');
            }}>Copy Credentials</button>
            {' '}
            <button className="btn btn-outline" onClick={()=>setCredModal(null)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══ MORE DETAILS MODAL ══ */
function AdviserDetailModal({ adviser: a, onClose }) {
  const [investors, setInvestors] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/registration/list', { params:{ adviser_code: a.adviser_code, page:1 } })
      .then(r => setInvestors(r.data.data?.items||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [a.adviser_code]);

  return (
    <div>
      {/* 1. All Details of Adviser */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px 16px',marginBottom:20}}>
        {[
          ['Adviser ID',     a.adviser_code],
          ['Full Name',      a.full_name],
          ['Father Name',    a.father_name||'—'],
          ['Mobile',         a.mobile],
          ['Email',          a.email||'—'],
          ['Rank',           `${a.rank_name} (Rank ${a.rank_id})`],
          ['Date Joined',    a.created_at?.split('T')[0]||'—'],
          ['Promoter Code',  a.parent_adviser_code||'—'],
          ['Promoter Name',  a.parent_adviser_name||'—'],
          ['Status',         a.is_blacklisted?'Blacklisted':a.is_active?'Active':'Not Active'],
        ].map(([k,v]) => (
          <div key={k} style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{k}</div>
            <div style={{fontWeight:600,fontSize:'0.85rem'}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginBottom:16,fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.8}}>
        <strong>Status:</strong>&nbsp;
        <span style={{color:'var(--success)'}}>Active</span> = has at least one investor &nbsp;|&nbsp;
        <span style={{color:'var(--warning)'}}>Not Active</span> = no investors &nbsp;|&nbsp;
        <span style={{color:'var(--danger)'}}>Blacklist</span> = Admin only · Cannot create investors
      </div>

      {/* 2. List All Investor */}
      <div style={{fontWeight:700,marginBottom:10,borderTop:'1px solid var(--border)',paddingTop:14}}>
        Investors Under This Adviser
      </div>
      {loading ? <Loading /> : investors.length===0 ? (
        <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:'0.85rem'}}>No investors yet</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Investor ID</th><th>Name</th><th>Mobile</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {investors.map(m => (
              <tr key={m.id}>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{m.investor_id}</code></td>
                <td><strong>{m.full_name}</strong></td>
                <td>{m.mobile}</td>
                <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 8px',borderRadius:10,
                  background:m.approval_status==='Approved'?'var(--success-bg)':'var(--warning-bg)',
                  color:m.approval_status==='Approved'?'var(--success)':'var(--warning)'}}>{m.approval_status}</span></td>
                <td style={{fontSize:'0.78rem'}}>{m.date_of_joining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ══ NEW ADVISER REGISTRATION FORM ══ */
function NewAdviserForm({ branches, onDone, onCancel }) {
  const { user }           = useAuth();
  const [promoterCode,     setPromoterCode]    = useState('');
  const [promoterInfo,     setPromoterInfo]    = useState(null);
  const [promoterErr,      setPromoterErr]     = useState('');
  const [visibleRanks,     setVisibleRanks]    = useState([]);
  const [form, setForm] = useState({
    full_name:'', mobile:'', email:'', father_name:'',
    rank_id:1, branch_id: user?.branch_id||'',
    parent_adviser_code:'', member_fees:650,
  });
  const [saving, setSaving] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Flowchart: Enter Promoter Adviser ID → Automatically Fetch Name & Post Number
  // Display: "Naveen Mahore · House 8 (Rank 16)"
  const verifyPromoter = async () => {
    setPromoterErr(''); setPromoterInfo(null); setVisibleRanks([]);
    if (!promoterCode.trim()) { setPromoterErr('Enter Promoter Adviser ID'); return; }
    try {
      const { data } = await api.get(`/api/advisers/${promoterCode.trim()}`);
      const adv = data.data;
      setPromoterInfo(adv);
      set('parent_adviser_code', adv.adviser_code);
      // Rank condition: Promoter on Rank N → show only ranks N-1 down to 1
      const maxRank = (adv.rank_id||1) - 1;
      const ranks   = RANKS.filter(([id]) => id <= maxRank);
      setVisibleRanks(ranks);
      if (maxRank > 0) set('rank_id', maxRank);
    } catch(e) {
      setPromoterErr(e.response?.data?.message||'Promoter ID not found');
    }
  };

  const save = async () => {
    if (!form.full_name||!form.mobile) { toast.error('Name and Mobile required'); return; }
    setSaving(true);
    try {
      await api.post('/api/advisers/', {
        ...form,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null,
      });
      toast.success('Adviser created! Go to Approved Adviser tab to approve.');
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message||'Failed to create adviser');
    } finally { setSaving(false); }
  };

  return (
    <Panel title="New Adviser Registration">
      {/* Step 1: Enter Promoter Adviser ID */}
      <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:16,marginBottom:16,border:'1px solid var(--border)'}}>
        <div style={{fontWeight:700,marginBottom:10}}>Step 1 — Enter Promoter Adviser ID</div>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input
            style={{flex:1,padding:'10px 12px',border:`1.5px solid ${promoterErr?'var(--danger)':'var(--border)'}`,borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontFamily:'monospace',fontSize:'0.9rem'}}
            placeholder="e.g. DFX-2026-000001"
            value={promoterCode}
            onChange={e=>{setPromoterCode(e.target.value.trim());setPromoterErr('');}}
            onKeyDown={e=>e.key==='Enter'&&verifyPromoter()}
          />
          <button className="btn btn-primary" onClick={verifyPromoter}>Verify →</button>
        </div>
        {promoterErr && <div style={{color:'var(--danger)',fontSize:'0.8rem'}}>{promoterErr}</div>}

        {/* Automatically Fetch Adviser Name & Post Number */}
        {/* Display: "Naveen Mahore · House 8 (Rank 16)" */}
        {promoterInfo && (
          <div style={{background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginTop:8}}>
            <div style={{fontWeight:700,color:'var(--success)',marginBottom:3}}>✅ Promoter Verified</div>
            <div style={{fontSize:'0.9rem',color:'var(--text-secondary)'}}>
              <strong>{promoterInfo.full_name}</strong> · {promoterInfo.rank_name} (Rank {promoterInfo.rank_id})
            </div>
            {visibleRanks.length>0 && (
              <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:4}}>
                Can assign ranks: <strong>{visibleRanks.map(([,n])=>n).join(', ')}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Adviser Details */}
      <div style={{fontWeight:700,marginBottom:10}}>Step 2 — Adviser Details</div>
      <div className="reg-form-row">
        <Field label="Full Name *"><Input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Full name" /></Field>
        <Field label="Father Name"><Input value={form.father_name} onChange={e=>set('father_name',e.target.value)} /></Field>
      </div>
      <div className="reg-form-row">
        <Field label="Mobile Number *"><Input value={form.mobile} onChange={e=>set('mobile',e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10} placeholder="10-digit" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></Field>
      </div>
      <div className="reg-form-row">
        <Field label="Select Rank">
          <Select value={form.rank_id} onChange={e=>set('rank_id',parseInt(e.target.value))}>
            {(visibleRanks.length>0 ? visibleRanks : RANKS).map(([id,name]) => (
              <option key={id} value={id}>{id}. {name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Branch">
          <Select value={form.branch_id} onChange={e=>set('branch_id',e.target.value)}>
            <option value="">— Select Branch —</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
          </Select>
        </Field>
      </div>
      <div className="reg-form-row">
        <Field label="Promoter Adviser ID">
          <Input value={form.parent_adviser_code} readOnly style={{fontFamily:'monospace',background:'var(--bg-table-head)'}} placeholder="Auto-filled after verify" />
        </Field>
        <Field label="Member Fees (₹)">
          <Input type="number" value={form.member_fees} readOnly style={{background:'var(--bg-table-head)'}} />
        </Field>
      </div>

      {/* Note: adviser create fee is ₹650 deducted from branch panel limit */}
      <div style={{background:'var(--warning-bg)',border:'1px solid var(--warning)',borderRadius:'var(--border-radius-sm)',padding:'10px 14px',marginBottom:14,fontSize:'0.82rem',color:'var(--warning)'}}>
        ⚠️ <strong>Note:</strong> Adviser create fee is ₹650, which is deducted from branch panel limit (if adviser successfully created).
        <br/>After creating → go to <strong>Approved Adviser</strong> tab to approve and generate login credentials.
      </div>

      <div style={{display:'flex',gap:10}}>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Creating...' : 'Create Adviser →'}
        </button>
      </div>
    </Panel>
  );
}