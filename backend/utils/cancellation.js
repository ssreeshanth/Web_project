const HOURS_MS = 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const extractServiceDate = (booking) => {
  const details = booking?.details || {};
  return (
    toDate(details.date) ||
    toDate(details.checkInDate) ||
    toDate(details.travelDate) ||
    toDate(details.showDate) ||
    null
  );
};

const defaultRefundPolicy = {
  fullRefundHours: 72,
  halfRefundHours: 24,
  partialRefundHours: 2,
  halfRefundRate: 0.5,
  partialRefundRate: 0.25,
  noDateRefundRate: 0.8,
};

export const calculateRefund = (booking, cancelledAt = new Date(), refundPolicy = {}) => {
  const serviceDate = extractServiceDate(booking);
  const total = Number(booking?.totalAmount || 0);
  const policy = { ...defaultRefundPolicy, ...(refundPolicy || {}) };

  let refundPercentage = 0;
  let hoursLeft = null;

  if (serviceDate) {
    hoursLeft = (serviceDate.getTime() - cancelledAt.getTime()) / HOURS_MS;
    if (hoursLeft > Number(policy.fullRefundHours)) refundPercentage = 1;
    else if (hoursLeft > Number(policy.halfRefundHours)) refundPercentage = Number(policy.halfRefundRate);
    else if (hoursLeft > Number(policy.partialRefundHours)) refundPercentage = Number(policy.partialRefundRate);
    else refundPercentage = 0;
  } else {
    refundPercentage = Number(policy.noDateRefundRate);
  }

  const refundAmount = Number((total * refundPercentage).toFixed(2));

  return {
    serviceDate: serviceDate ? serviceDate.toISOString() : null,
    hoursLeft: hoursLeft == null ? null : Number(hoursLeft.toFixed(2)),
    refundPercentage,
    refundAmount,
    status: refundAmount > 0 ? 'processed' : 'not_eligible',
  };
};
