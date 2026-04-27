import { Router } from 'express';
import {
  addHotelReview,
  getHotels,
  getHotelReviews,
  getMovies,
  getPricingSettings,
  getTravels,
} from '../controllers/catalogController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/movies', getMovies);
router.get('/hotels', getHotels);
router.get('/travels', getTravels);
router.get('/settings/pricing', getPricingSettings);
router.get('/hotels/:hotelId/reviews', getHotelReviews);
router.post('/hotels/:hotelId/reviews', authMiddleware, asyncHandler(addHotelReview));

export default router;
