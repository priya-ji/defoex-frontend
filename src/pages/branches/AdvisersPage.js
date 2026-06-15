import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RANKS = [
  [1,'SR — Senior Representative'],[2,'SO — Sales Officer'],[3,'SD — Sales Director'],
  [4,'SI — Sales Incharge'],[5,'DO — District Officer'],[6,'RO — Regional Officer'],
  [7,'ZO — Zonal Officer'],[8,'EM'],[9,'EM I'],[10,'EM II'],[11,'EM R'],[12,'EM C'],
  [13,'House 1'],[14,'House 2'],[15,'House 3'],[16,'House 4'],
  [17,'House 5'],[18,'House 6'],[19,'House 7'],[20,'House 8 (Owner)'],
];

export default function AdvisersPage() {
  const [advisers,    setAdvisers]    = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [lookup,      setLookup]      = useState(null);
  const [checking,    setChecking]    = useState(false);
  const [form, setForm] = useState({
    full_name:'', mobile:'', email:'', rank_id:1, branch_id:'', parent_adviser_code:''
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/api/advisers/'), api.get('/api/branches/')])
      .then(([a,b]) => {
        setAdvisers(a.data.data || []);
        setBranches(b.data.data || []);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const onMobileChange = async (val) => {
    const clean = val.replace(/\D/g,'').slice(0,10);
    set('mobile', clean);
    setLookup(null);
    if (clean.length === 10) {
      setChecking(true);
      try {
        const { data } = await api.get(`/api/advisers/lookup-by-mobile/${clean}`);
        const info = data.data;
        setLookup(info);
        if (info.full_name) set('full_name', info.full_name);
      } catch {}
      finally { setChecking(false); }
    }
  };

  const create = async () => {
    if (!form.full_name.trim()) return toast.error('Enter full name');
    if (form.mobile.length !== 10) return toast.error('Enter valid 10-digit mobile');
    setSaving(true);
    try {
      const { data } = await api.post('/api/advisers/', {
        ...form,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null,
      });
      toast.success(data.message);
      if (data.data?.note) {
        toast(data.data.note, { icon: 'ℹ️', duration: 6000 });
      }
      setShowCreate(false);
      setForm({ full_name:'', mobile:'', email:'', rank_id:1, branch_id:'', parent_adviser_code:'' });
      setLookup(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create adviser');
    } finally { setSaving(false); }
  };

  const closeModal = () => { setShowCreate(false); setLookup(null); };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Advisers</h1>
          <p className="text-muted">One person = one code for both investor and adviser roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Adviser</button>
      </div>

      {/* How codes work */}
      <div style={{background:'var(--bg-table-head)',border:'1px solid var(--border)',borderRadius:'var(--border-radius)',padding:'14px 18px',marginBottom:20,display:'flex',gap:32,alignItems:'center',flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:'0.72rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Investor Code</div>
          <code style={{fontSize:'0.9rem',fontWeight:700,color:'var(--primary)'}}>DFX-2026-000001</code>
        </div>
        <div style={{fontSize:'1.4rem',color:'var(--text-muted)'}}>＝</div>
        <div>
          <div style={{fontSize:'0.72rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Adviser Code (same person)</div>
          <code style={{fontSize:'0.9rem',fontWeight:700,color:'var(--success)'}}>DFX-2026-000001</code>
        </div>
        <div style={{fontSize:'1.4rem',color:'var(--text-muted)'}}>≠</div>
        <div>
          <div style={{fontSize:'0.72rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Investment Bond IRN</div>
          <code style={{fontSize:'0.9rem',fontWeight:700,color:'var(--warning)'}}>DFX-IRN-2026-00001</code>
        </div>
      </div>

      <Panel title="All Advisers" subtitle={`${advisers.length} registered`}>
        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Adviser Code</th>
                <th>Full Name</th>
                <th>Mobile</th>
                <th>Rank</th>
                <th>Branch</th>
                <th>Dual Role?</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {advisers.map((a,i) => (
                <tr key={a.id}>
                  <td>{i+1}</td>
                  <td>
                    <code style={{background:'var(--primary-glow)',color:'var(--primary)',padding:'3px 8px',borderRadius:4,fontSize:'0.78rem',fontFamily:'monospace'}}>
                      {a.adviser_code}
                    </code>
                  </td>
                  <td><strong>{a.full_name}</strong>{a.is_company_owner&&<span style={{marginLeft:6,fontSize:'0.7rem',color:'var(--warning)'}}>👑</span>}</td>
                  <td>{a.mobile}</td>
                  <td>
                    <span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>
                      {a.rank_name}
                    </span>
                  </td>
                  <td>{branches.find(b=>b.id===a.branch_id)?.branch_name||'—'}</td>
                  <td><DualRoleBadge code={a.adviser_code} /></td>
                  <td><Badge status={a.is_active?'Active':'Inactive'} /></td>
                </tr>
              ))}
              {!advisers.length && (
                <tr><td colSpan={8} className="text-center text-muted" style={{padding:32}}>No advisers yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>

      {/* ── CREATE MODAL ── */}
      <Modal open={showCreate} onClose={closeModal} title="Create New Adviser" size="md">
        <div style={{fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:16,lineHeight:1.6,padding:'10px 14px',background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',borderLeft:'3px solid var(--primary)'}}>
          Enter the person's <strong>mobile number</strong> first. If they are already a registered investor, their existing code will be used as the adviser code — <strong>same person, same code</strong>.
        </div>

        {/* Mobile → auto lookup */}
        <Field label="Mobile Number" required>
          <div style={{position:'relative'}}>
            <Input
              value={form.mobile}
              onChange={e => onMobileChange(e.target.value)}
              placeholder="10-digit mobile"
              maxLength={10}
              style={{fontFamily:'monospace',letterSpacing:1,paddingRight:checking?36:12}}
              autoFocus
            />
            {checking && (
              <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:'0.72rem',color:'var(--text-muted)'}}>
                checking...
              </span>
            )}
          </div>
        </Field>

        {/* Lookup result */}
        {lookup && (
          <div style={{
            marginBottom:12,padding:'12px 14px',borderRadius:'var(--border-radius-sm)',
            border:`1px solid ${lookup.is_adviser ? 'var(--danger)' : lookup.will_reuse ? 'var(--success)' : 'var(--info)'}`,
            background: lookup.is_adviser ? 'var(--danger-bg)' : lookup.will_reuse ? 'var(--success-bg)' : 'var(--info-bg)',
          }}>
            {lookup.is_adviser && (
              <div style={{color:'var(--danger)',fontWeight:700,fontSize:'0.82rem'}}>
                ❌ Already an adviser — Code: <code>{lookup.adviser_code}</code>
              </div>
            )}
            {!lookup.is_adviser && lookup.will_reuse && (
              <>
                <div style={{color:'var(--success)',fontWeight:700,fontSize:'0.85rem',marginBottom:4}}>
                  ✅ Already an investor — same code will be used
                </div>
                <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>
                  Name: <strong>{lookup.full_name}</strong>
                </div>
                <div style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginTop:3}}>
                  Adviser code will be: <code style={{color:'var(--success)',fontWeight:700}}>{lookup.code_to_reuse}</code>
                </div>
              </>
            )}
            {!lookup.is_adviser && !lookup.will_reuse && (
              <div style={{color:'var(--info)',fontSize:'0.82rem'}}>
                ℹ️ New person — a fresh code will be generated (e.g. DFX-2026-000002)
              </div>
            )}
          </div>
        )}

        <div className="reg-form-row" style={{marginTop:8}}>
          <Field label="Full Name" required>
            <Input value={form.full_name} onChange={e => set('full_name',e.target.value)} placeholder="Adviser's full name" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => set('email',e.target.value)} />
          </Field>
        </div>

        <div className="reg-form-row">
          <Field label="Rank">
            <Select value={form.rank_id} onChange={e => set('rank_id',parseInt(e.target.value))}>
              {RANKS.map(([id,name]) => <option key={id} value={id}>{id}. {name}</option>)}
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={form.branch_id} onChange={e => set('branch_id',e.target.value)}>
              <option value="">— Select Branch —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Parent Adviser Code (Upline — optional)">
          <Input
            value={form.parent_adviser_code}
            onChange={e => set('parent_adviser_code',e.target.value)}
            placeholder="e.g. DFX-2026-000001"
            style={{fontFamily:'monospace'}}
          />
        </Field>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={create}
            disabled={saving || lookup?.is_adviser}>
            {saving ? 'Creating...' :
             lookup?.will_reuse ? `✓ Create Adviser (reuse ${lookup.code_to_reuse})` :
             '✓ Create Adviser'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Badge showing if adviser is also an investor
function DualRoleBadge({ code }) {
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    api.get(`/api/registration/${code}`)
      .then(() => setStatus('both'))
      .catch(() => setStatus('adviser-only'));
  }, [code]);
  if (status === 'loading') return <span style={{color:'var(--text-muted)',fontSize:'0.72rem'}}>...</span>;
  if (status === 'both') return (
    <span style={{background:'var(--success-bg)',color:'var(--success)',padding:'2px 9px',borderRadius:10,fontSize:'0.72rem',fontWeight:700}}>
      ✓ Investor + Adviser
    </span>
  );
  return <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>Adviser only</span>;
}