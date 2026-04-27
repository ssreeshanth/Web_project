import { validateNewBookingInput } from '../models/bookingModel.js';
import { nextBookingId, nextPaymentId, persistStore, store } from '../models/store.js';
import { calculateRefund } from '../utils/cancellation.js';
import { AppError } from '../utils/errors.js';

export const createBooking = async (req, res, next) => {
  let payload;
  try {
    payload = validateNewBookingInput(req.body || {});
  } catch (error) {
    return next(error);
  }

  const booking = {
    id: nextBookingId(),
    userId: req.user.id,
    type: payload.type,
    details: payload.details,
    totalAmount: payload.totalAmount,
    status: 'confirmed',
    cancellation: null,
    createdAt: new Date().toISOString(),
    paymentId: nextPaymentId(),
  };
  store.bookings.push(booking);
  await persistStore();

  return res.status(201).json(booking);
};

export const listMyBookings = (req, res) => {
  const userBookings = store.bookings.filter((b) => b.userId === req.user.id);
  res.json(userBookings);
};

export const getMyBooking = (req, res, next) => {
  const booking = store.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }
  return res.json(booking);
};

export const getReceipt = (req, res, next) => {
  const booking = store.bookings.find((b) => b.id === req.params.bookingId && b.userId === req.user.id);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  const user = store.users.find((u) => u.id === req.user.id);
  const passengerName = booking?.details?.passenger?.fullName?.trim?.();
  return res.json({
    booking,
    user: user
      ? {
          name: passengerName || user.name,
          email: user.email,
        }
      : null,
  });
};

export const cancelMyBooking = async (req, res, next) => {
  const booking = store.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }
  if (booking.status === 'cancelled') {
    return next(new AppError('Booking is already cancelled', 400));
  }

  const cancelledAt = new Date();
  const refund = calculateRefund(booking, cancelledAt, store.pricingSettings?.refundPolicy);
  booking.status = 'cancelled';
  booking.cancelledAt = cancelledAt.toISOString();
  booking.cancellation = {
    by: 'user',
    ...refund,
  };

  await persistStore();
  return res.json({
    cancelled: booking,
    refund: booking.cancellation,
  });
};
