import { AppError } from '../utils/errors.js';

export const validateNewBookingInput = ({ type, details, totalAmount }) => {
  const normalizedType = String(type || '').trim();
  const amount = Number(totalAmount);

  if (!normalizedType || !details || totalAmount == null) {
    throw new AppError('Missing booking data', 400);
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError('totalAmount must be a valid number', 400);
  }

  return {
    type: normalizedType,
    details,
    totalAmount: amount,
  };
};
