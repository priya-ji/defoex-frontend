import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './WalletPage.css';

export default function WalletPage() {
  const { user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const [topupAmt, setTopupAmt] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [topping, setTopping] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const branchId = isSuperAdmin ? selectedBranch : user?.branch_id;

  // Load branches
  useEffect(() => {
    if (isSuperAdmin) {
      api
        .get('/api/branches/')
        .then((r) => {
          const list = r.data.data || [];
          setBranches(list);

          if (list.length > 0) {
            setSelectedBranch(list[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  // Load wallet and history
  useEffect(() => {
    if (!branchId) return;

    loadWalletData();
  }, [branchId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      const [branchRes, historyRes] = await Promise.all([
        api.get(`/api/branches/${branchId}`),
        api.get(`/api/branches/${branchId}/wallet-history`)
      ]);

      setWallet(branchRes.data.data?.wallet || null);
      setHistory(historyRes.data.data || { items: [] });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const doTopup = async () => {
    if (!topupAmt || parseFloat(topupAmt) <= 0) {
      return toast.error('Enter valid amount');
    }

    if (!branchId) {
      return toast.error('Select a branch first');
    }

    try {
      setTopping(true);

      const response = await api.post(
        `/api/branches/${branchId}/topup`,
        {
          amount: parseFloat(topupAmt),
          description: topupDesc || 'Admin top-up'
        }
      );

      toast.success(
        `₹${parseFloat(topupAmt).toLocaleString(
          'en-IN'
        )} added successfully`
      );

      setWallet(response.data.data);

      setTopupAmt('');
      setTopupDesc('');

      await loadWalletData();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || 'Top-up failed'
      );
    } finally {
      setTopping(false);
    }
  };

  // TEST API BUTTON
  const testTopup = async () => {
    if (!branchId) {
      toast.error('Select a branch first');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5001/api/branches/${branchId}/topup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Bearer ' +
              localStorage.getItem('access_token')
          },
          body: JSON.stringify({
            amount: 500000,
            description: 'Initial allocation'
          })
        }
      );

      const data = await response.json();

      console.log('Topup Response:', data);

      if (response.ok) {
        toast.success('₹5,00,000 added successfully');

        await loadWalletData();
      } else {
        toast.error(
          data.message || 'Top-up request failed'
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('API Error');
    }
  };

  const fmt = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Branch Wallet</h1>
      </div>

      {isSuperAdmin && branches.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            maxWidth: 350
          }}
        >
          <Field label="Select Branch">
            <Select
              value={selectedBranch}
              onChange={(e) =>
                setSelectedBranch(e.target.value)
              }
            >
              {branches.map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.branch_name} (
                  {branch.branch_code})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          {wallet && (
            <div className="wallet-header-cards">
              <div
                className={`whc-card ${
                  wallet.is_low_balance
                    ? 'low'
                    : ''
                }`}
              >
                <div className="whc-label">
                  Current Balance
                </div>

                <div className="whc-amount">
                  {fmt(wallet.current_balance)}
                </div>

                <div className="whc-sub">
                  Investment spending limit
                </div>

                {wallet.is_low_balance && (
                  <div className="whc-alert">
                    ⚠️ LOW — Top up needed
                  </div>
                )}
              </div>

              <div className="whc-card accent">
                <div className="whc-label">
                  Cash Wallet
                </div>

                <div className="whc-amount">
                  {fmt(wallet.cash_wallet)}
                </div>

                <div className="whc-sub">
                  Accumulated from approved plans
                </div>
              </div>
            </div>
          )}

          {!wallet && branchId && (
            <Alert type="warning">
              No wallet found for this branch.
              It will be created automatically
              when you top up.
            </Alert>
          )}

          {isSuperAdmin && (
            <Panel
              title="Top-Up Branch Wallet"
              className="mt-3"
            >
              <div className="topup-form">
                <Field
                  label="Amount (₹)"
                  required
                >
                  <Input
                    type="number"
                    value={topupAmt}
                    onChange={(e) =>
                      setTopupAmt(
                        e.target.value
                      )
                    }
                    placeholder="e.g. 500000"
                  />
                </Field>

                <Field label="Description">
                  <Input
                    value={topupDesc}
                    onChange={(e) =>
                      setTopupDesc(
                        e.target.value
                      )
                    }
                    placeholder="e.g. June allocation"
                  />
                </Field>

                <button
                  className="btn btn-primary"
                  onClick={doTopup}
                  disabled={
                    topping || !branchId
                  }
                >
                  {topping
                    ? 'Processing...'
                    : '+ Add Funds'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={testTopup}
                  style={{
                    marginLeft: '10px'
                  }}
                >
                  Test ₹5,00,000 Topup
                </button>
              </div>

              <Alert
                type="info"
                className="mt-2"
              >
                After topping up, the
                Branch Manager can create
                investment plans up to
                this balance.
              </Alert>
            </Panel>
          )}

          <Panel
            title="Transaction History"
            className="mt-3"
          >
            {history.items?.length === 0 ? (
              <div
                className="text-center text-muted"
                style={{
                  padding: '32px'
                }}
              >
                No transactions yet
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Balance After</th>
                    <th>Cash Wallet</th>
                  </tr>
                </thead>

                <tbody>
                  {history.items?.map(
                    (txn) => (
                      <tr key={txn.id}>
                        <td>
                          {txn.created_at?.split(
                            'T'
                          )[0]}
                        </td>

                        <td>
                          <span
                            className={`txn-type ${txn.transaction_type?.toLowerCase()}`}
                          >
                            {
                              txn.transaction_type
                            }
                          </span>
                        </td>

                        <td
                          className={
                            txn.transaction_type ===
                            'Deduction'
                              ? 'text-danger'
                              : 'text-success'
                          }
                        >
                          {txn.transaction_type ===
                          'Deduction'
                            ? '-'
                            : '+'}
                          {fmt(txn.amount)}
                        </td>

                        <td>
                          {txn.description}
                        </td>

                        <td>
                          <strong>
                            {fmt(
                              txn.balance_after
                            )}
                          </strong>
                        </td>

                        <td>
                          {fmt(
                            txn.cash_wallet_after
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}