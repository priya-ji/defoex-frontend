import React from 'react';
import Modal from '../Modal/Modal';
import toast from 'react-hot-toast';

/** Show username/password after investor is created or approved. */
export default function InvestorCredentialsModal({ creds, onClose }) {
  if (!creds) return null;

  const copy = () => {
    const text = creds.password
      ? `Username: ${creds.username}\nPassword: ${creds.password}`
      : `Username: ${creds.username}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied!');
  };

  return (
    <Modal open={!!creds} onClose={onClose} title="🎉 Congratulations Investor Created!" size="sm">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎊</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--success)' }}>
          Investor Account Created Successfully!
        </div>
        <div style={{
          background: 'var(--bg-input)', borderRadius: 'var(--border-radius-md)',
          padding: '16px', fontFamily: 'monospace', fontSize: '0.9rem',
          lineHeight: 2.5, marginBottom: 12,
        }}>
          <div>Username: <strong style={{ color: 'var(--primary)' }}>{creds.username}</strong></div>
          {creds.password ? (
            <div>Password: <strong style={{ color: 'var(--primary)' }}>{creds.password}</strong></div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              (Login already existed — password not regenerated)
            </div>
          )}
        </div>
        {creds.password && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            System generated password (10 digit hexadecimal)
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={copy}>Copy Credentials</button>
        {' '}
        <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export function showInvestorCredentialToasts(creds) {
  if (!creds?.username) return;
  toast.success('Investor created successfully!');
  if (creds.password) {
    setTimeout(() => {
      toast(t => (
        <div>
          <div style={{ fontWeight: 700, color: '#00c853', marginBottom: 6 }}>🎉 Login Credentials</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 2 }}>
            <div>Username: <strong>{creds.username}</strong></div>
            <div>Password: <strong>{creds.password}</strong></div>
          </div>
        </div>
      ), { duration: 15000, style: { minWidth: 260 } });
    }, 400);
  }
}
