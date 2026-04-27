import { Router } from 'express';
import {
  cancelMyBooking,
  createBooking,
  getMyBooking,
  getReceipt,
  listMyBookings,
} from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.use(authMiddleware);
router.post('/bookings', asyncHandler(createBooking));
router.get('/bookings', listMyBookings);
router.get('/bookings/:id', getMyBooking);
router.delete('/bookings/:id', asyncHandler(cancelMyBooking));
router.get('/receipt/:bookingId', getReceipt);

export default router;
