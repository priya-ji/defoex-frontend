import { branchService } from './branchService';

export const walletService = {
  getBranch: (branchId) => branchService.get(branchId),
  topup: (branchId, data) => branchService.topup(branchId, data),
  history: (branchId, page = 1) => branchService.walletHistory(branchId, page),
};
