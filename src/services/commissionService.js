import api from './api';

export const commissionService = {
  list: (params) => api.get('/api/commissions/', { params }),
  chart: () => api.get('/api/commissions/chart'),
};
