import { validateReviewInput } from '../models/catalogModel.js';
import { getCatalog, isItemAvailable, nextReviewId, persistStore, store } from '../models/store.js';
import { AppError } from '../utils/errors.js';

export const getMovies = (_req, res) => res.json(getCatalog().movies);
export const getHotels = (_req, res) => res.json(getCatalog().hotels);
export const getTravels = (_req, res) => res.json(getCatalog().travels);
export const getPricingSettings = (_req, res) => res.json(store.pricingSettings);

export const getHotelReviews = (req, res, next) => {
  const { hotelId } = req.params;
  const hotel = getCatalog().hotels.find((h) => h.id === hotelId);
  if (!hotel || !isItemAvailable(hotel)) {
    return next(new AppError('Hotel not found', 404));
  }
  const reviews = store.hotelReviews[hotelId] || [];
  const averageRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  return res.json({ reviews, averageRating, count: reviews.length });
};

export const addHotelReview = async (req, res, next) => {
  const { hotelId } = req.params;
  const hotel = getCatalog().hotels.find((h) => h.id === hotelId);
  if (!hotel || !isItemAvailable(hotel)) {
    return next(new AppError('Hotel not found', 404));
  }

  let payload;
  try {
    payload = validateReviewInput(req.body || {});
  } catch (error) {
    return next(error);
  }

  const review = {
    id: nextReviewId(),
    userId: req.user.id,
    userName: store.users.find((u) => u.id === req.user.id)?.name || req.user.email,
    rating: payload.rating,
    comment: payload.comment,
    createdAt: new Date().toISOString(),
  };

  if (!store.hotelReviews[hotelId]) {
    store.hotelReviews[hotelId] = [];
  }
  store.hotelReviews[hotelId].unshift(review);
  await persistStore();

  return res.status(201).json(review);
};
