import { AppError } from '../utils/errors.js';

export const validateReviewInput = ({ rating, comment }) => {
  const normalizedRating = Number(rating);
  const normalizedComment = String(comment || '').trim();

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new AppError('Rating must be an integer between 1 and 5', 400);
  }

  return {
    rating: normalizedRating,
    comment: normalizedComment,
  };
};
