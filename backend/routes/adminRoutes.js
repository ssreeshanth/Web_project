import { Router } from 'express';
import {
  addHotel,
  addMovie,
  addTravel,
  deleteHotel,
  deleteMovie,
  deleteTravel,
  deleteUser,
  cancelAnyBooking,
  getOverview,
  listAllBookings,
  listAllCatalog,
  listUsers,
  setCatalogAvailability,
  updateUserRole,
  updateHotel,
  updateMovie,
  updatePricingSettings,
  updateTravel,
} from '../controllers/adminController.js';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get('/overview', getOverview);
router.get('/users', listUsers);
router.put('/users/:id/role', asyncHandler(updateUserRole));
router.delete('/users/:id', asyncHandler(deleteUser));
router.get('/bookings', listAllBookings);
router.delete('/bookings/:id', asyncHandler(cancelAnyBooking));
router.get('/catalog', listAllCatalog);
router.put('/catalog/:type/:id/availability', asyncHandler(setCatalogAvailability));
router.post('/movies', asyncHandler(addMovie));
router.put('/movies/:id', asyncHandler(updateMovie));
router.delete('/movies/:id', asyncHandler(deleteMovie));
router.post('/hotels', asyncHandler(addHotel));
router.put('/hotels/:id', asyncHandler(updateHotel));
router.delete('/hotels/:id', asyncHandler(deleteHotel));
router.post('/travels', asyncHandler(addTravel));
router.put('/travels/:id', asyncHandler(updateTravel));
router.delete('/travels/:id', asyncHandler(deleteTravel));
router.put('/settings/pricing', asyncHandler(updatePricingSettings));

export default router;
