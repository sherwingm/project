export type UPIApp = 'gpay' | 'phonepe' | 'paytm';

export const isMobileDevice = () => /Android|iPhone|iPad/i.test(navigator.userAgent);

export const isValidUpiId = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 50 && trimmed.includes('@');
};

export const getBudgetSplitExpenseNote = (groupName: string, expenseName: string) => {
  return `BudgetSplit: ${groupName} - ${expenseName}`;
};

export const getBudgetSplitSettlementNote = (groupName: string) => {
  return `BudgetSplit: ${groupName} - Settlement`;
};

export const getGroupJoinUrl = (shareCode: string) => {
  return `${window.location.origin}/join/${encodeURIComponent(shareCode)}`;
};

export const openUPIPayment = (toUpiId: string, toName: string, amount: number, note: string) => {
  const upiLink = `upi://pay?pa=${toUpiId}&pn=${encodeURIComponent(toName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  window.location.href = upiLink;
};

export const buildAppUPILink = (app: UPIApp, amount: number, name: string, upiId?: string, note?: string) => {
  const normalizedAmount = amount.toFixed(2);

  if (upiId) {
    const settlementNote = note || 'BudgetSplit';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${normalizedAmount}&cu=INR&tn=${encodeURIComponent(settlementNote)}`;
  }

  if (app === 'gpay') {
    return `tez://upi/pay?pn=${encodeURIComponent(name)}&am=${normalizedAmount}&cu=INR`;
  }

  if (app === 'phonepe') {
    return `phonepe://pay?pn=${encodeURIComponent(name)}&amount=${normalizedAmount}`;
  }

  if (app === 'paytm') {
    return `paytmmp://pay?pn=${encodeURIComponent(name)}&amount=${normalizedAmount}`;
  }

  return '';
};
