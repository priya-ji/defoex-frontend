import api from './api';

const BRANCHES_URL = '/api/branches/';

export const branchService = {
  list: () => api.get(BRANCHES_URL),
  get: (branchId) => api.get(`/api/branches/${branchId}`),
  create: (data) => api.post(BRANCHES_URL, data),
  topup: (branchId, data) => api.post(`/api/branches/${branchId}/topup`, data),
  adminWallet: () => api.get('/api/branches/admin-wallet'),
  walletHistory: (branchId, page = 1) =>
    api.get(`/api/branches/${branchId}/wallet-history?page=${page}`),
};
