import {
  getCatalog,
  nextAdminHotelId,
  nextAdminMovieId,
  nextAdminTravelId,
  persistStore,
  store,
} from '../models/store.js';
import { calculateRefund } from '../utils/cancellation.js';
import { AppError } from '../utils/errors.js';

const findById = (items, id) => items.find((item) => item.id === id);
const findCatalogItemByType = (type, id) => {
  if (type === 'movies') {
    return store.adminMovies.find((m) => m.id === id) || store.defaultMovies.find((m) => m.id === id) || null;
  }
  if (type === 'hotels') {
    return store.adminHotels.find((h) => h.id === id) || store.defaultHotels.find((h) => h.id === id) || null;
  }
  if (type === 'travels') {
    return store.adminTravels.find((t) => t.id === id) || store.defaultTravels.find((t) => t.id === id) || null;
  }
  return null;
};

export const getOverview = (_req, res) => {
  res.json({
    usersCount: store.users.length,
    bookingsCount: store.bookings.length,
    moviesCount: store.defaultMovies.length + store.adminMovies.length,
    hotelsCount: store.defaultHotels.length + store.adminHotels.length,
    travelsCount: store.defaultTravels.length + store.adminTravels.length,
    pricingSettings: store.pricingSettings,
  });
};

export const listUsers = (_req, res) => {
  const users = store.users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: !!u.isAdmin,
  }));
  res.json(users);
};

export const listAllBookings = (_req, res) => {
  const usersById = new Map(store.users.map((u) => [u.id, u]));
  const enriched = store.bookings.map((b) => ({
    ...b,
    user: usersById.has(b.userId)
      ? {
          id: usersById.get(b.userId).id,
          name: usersById.get(b.userId).name,
          email: usersById.get(b.userId).email,
        }
      : null,
  }));
  res.json(enriched);
};

export const listAllCatalog = (_req, res) => {
  const catalog = getCatalog();
  res.json({
    movies: catalog.movies,
    hotels: catalog.hotels,
    travels: catalog.travels,
  });
};

export const setCatalogAvailability = async (req, res, next) => {
  const { type, id } = req.params;
  const { available, reason } = req.body || {};
  if (!['movies', 'hotels', 'travels'].includes(type)) {
    return next(new AppError('Invalid catalog type', 400));
  }
  if (typeof available !== 'boolean') {
    return next(new AppError('available must be boolean', 400));
  }

  const item = findCatalogItemByType(type, id);
  if (!item) {
    return next(new AppError('Catalog item not found', 404));
  }

  item.available = available;
  item.unavailableReason = available ? '' : String(reason || '').trim();
  await persistStore();
  return res.json(item);
};

export const updateUserRole = async (req, res, next) => {
  const { isAdmin } = req.body || {};
  if (typeof isAdmin !== 'boolean') {
    return next(new AppError('isAdmin must be boolean', 400));
  }

  const user = findById(store.users, req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  if (user.id === req.user.id && !isAdmin) {
    return next(new AppError('You cannot remove your own admin access', 400));
  }

  user.isAdmin = isAdmin;
  user.role = isAdmin ? 'admin' : 'user';
  await persistStore();
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: !!user.isAdmin,
  });
};

export const deleteUser = async (req, res, next) => {
  const index = store.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return next(new AppError('User not found', 404));
  }

  const user = store.users[index];
  if (user.id === req.user.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  store.users.splice(index, 1);
  store.bookings = store.bookings.filter((b) => b.userId !== user.id);

  Object.keys(store.hotelReviews).forEach((hotelId) => {
    store.hotelReviews[hotelId] = (store.hotelReviews[hotelId] || []).filter((r) => r.userId !== user.id);
  });

  await persistStore();
  return res.json({ deleted: { id: user.id, email: user.email, name: user.name } });
};

export const cancelAnyBooking = async (req, res, next) => {
  const booking = store.bookings.find((b) => b.id === req.params.id);
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
    by: 'admin',
    ...refund,
  };

  await persistStore();
  return res.json({
    cancelled: booking,
    refund: booking.cancellation,
  });
};

export const updatePricingSettings = async (req, res, next) => {
  const weekendMultiplier = Number(req.body?.weekendMultiplier);
  const infantDiscountMultiplier = Number(req.body?.infantDiscountMultiplier);
  const movieBaseMultiplier = Number(req.body?.movieBaseMultiplier);
  const hotelBaseMultiplier = Number(req.body?.hotelBaseMultiplier);
  const travelBaseMultiplier = Number(req.body?.travelBaseMultiplier);
  const fullRefundHours = Number(req.body?.fullRefundHours);
  const halfRefundHours = Number(req.body?.halfRefundHours);
  const partialRefundHours = Number(req.body?.partialRefundHours);
  const halfRefundRate = Number(req.body?.halfRefundRate);
  const partialRefundRate = Number(req.body?.partialRefundRate);
  const noDateRefundRate = Number(req.body?.noDateRefundRate);

  if (!Number.isFinite(weekendMultiplier) || weekendMultiplier < 1) {
    return next(new AppError('weekendMultiplier must be a number >= 1', 400));
  }
  if (!Number.isFinite(infantDiscountMultiplier) || infantDiscountMultiplier < 0 || infantDiscountMultiplier > 1) {
    return next(new AppError('infantDiscountMultiplier must be between 0 and 1', 400));
  }
  if (!Number.isFinite(movieBaseMultiplier) || movieBaseMultiplier <= 0) {
    return next(new AppError('movieBaseMultiplier must be > 0', 400));
  }
  if (!Number.isFinite(hotelBaseMultiplier) || hotelBaseMultiplier <= 0) {
    return next(new AppError('hotelBaseMultiplier must be > 0', 400));
  }
  if (!Number.isFinite(travelBaseMultiplier) || travelBaseMultiplier <= 0) {
    return next(new AppError('travelBaseMultiplier must be > 0', 400));
  }
  if (!Number.isFinite(fullRefundHours) || fullRefundHours < 0) {
    return next(new AppError('fullRefundHours must be >= 0', 400));
  }
  if (!Number.isFinite(halfRefundHours) || halfRefundHours < 0 || halfRefundHours > fullRefundHours) {
    return next(new AppError('halfRefundHours must be >= 0 and <= fullRefundHours', 400));
  }
  if (!Number.isFinite(partialRefundHours) || partialRefundHours < 0 || partialRefundHours > halfRefundHours) {
    return next(new AppError('partialRefundHours must be >= 0 and <= halfRefundHours', 400));
  }
  if (!Number.isFinite(halfRefundRate) || halfRefundRate < 0 || halfRefundRate > 1) {
    return next(new AppError('halfRefundRate must be between 0 and 1', 400));
  }
  if (!Number.isFinite(partialRefundRate) || partialRefundRate < 0 || partialRefundRate > 1) {
    return next(new AppError('partialRefundRate must be between 0 and 1', 400));
  }
  if (partialRefundRate > halfRefundRate) {
    return next(new AppError('partialRefundRate cannot exceed halfRefundRate', 400));
  }
  if (!Number.isFinite(noDateRefundRate) || noDateRefundRate < 0 || noDateRefundRate > 1) {
    return next(new AppError('noDateRefundRate must be between 0 and 1', 400));
  }

  store.pricingSettings.weekendMultiplier = weekendMultiplier;
  store.pricingSettings.infantDiscountMultiplier = infantDiscountMultiplier;
  store.pricingSettings.movieBaseMultiplier = movieBaseMultiplier;
  store.pricingSettings.hotelBaseMultiplier = hotelBaseMultiplier;
  store.pricingSettings.travelBaseMultiplier = travelBaseMultiplier;
  store.pricingSettings.refundPolicy = {
    fullRefundHours,
    halfRefundHours,
    partialRefundHours,
    halfRefundRate,
    partialRefundRate,
    noDateRefundRate,
  };
  await persistStore();
  return res.json(store.pricingSettings);
};

export const addMovie = async (req, res, next) => {
  const { title, genre, duration, rating, showtimes, price } = req.body || {};
  if (!title || !genre || !duration || !rating || !Array.isArray(showtimes) || !showtimes.length || price == null) {
    return next(new AppError('Missing fields: title, genre, duration, rating, showtimes (array), price', 400));
  }

  const movie = {
    id: nextAdminMovieId(),
    title,
    genre,
    duration,
    rating,
    showtimes,
    price: Number(price),
    available: true,
    unavailableReason: '',
  };
  store.adminMovies.push(movie);
  await persistStore();
  return res.status(201).json(movie);
};

export const addHotel = async (req, res, next) => {
  const { name, city, stars, pricePerNight, amenities, image } = req.body || {};
  if (!name || !city || stars == null || pricePerNight == null) {
    return next(new AppError('Missing fields: name, city, stars, pricePerNight', 400));
  }

  const id = nextAdminHotelId();
  const hotel = {
    id,
    name,
    city,
    stars: Number(stars),
    pricePerNight: Number(pricePerNight),
    amenities: Array.isArray(amenities) ? amenities : [],
    image: image || `https://picsum.photos/seed/${encodeURIComponent(id)}/1200/800`,
    available: true,
    unavailableReason: '',
  };
  store.adminHotels.push(hotel);
  await persistStore();
  return res.status(201).json(hotel);
};

export const addTravel = async (req, res, next) => {
  const { type, from, to, date, price, carrier, flightCategory, departureLocalTime, arrivalLocalTime, departureTimezone, arrivalTimezone } = req.body || {};
  if (!type || !from || !to || !date || price == null || !carrier) {
    return next(new AppError('Missing fields: type, from, to, date, price, carrier', 400));
  }

  const travel = {
    id: nextAdminTravelId(),
    type,
    from,
    to,
    date,
    price: Number(price),
    carrier,
    available: true,
    unavailableReason: '',
  };

  if (type === 'Flight') {
    travel.flightCategory = flightCategory === 'international' ? 'international' : 'domestic';
    travel.departureLocalTime = departureLocalTime || '09:00 AM';
    travel.arrivalLocalTime = arrivalLocalTime || '12:00 PM';
    travel.departureTimezone = departureTimezone || 'Local time';
    travel.arrivalTimezone = arrivalTimezone || 'Local time';
  }

  store.adminTravels.push(travel);
  await persistStore();
  return res.status(201).json(travel);
};

export const updateMovie = async (req, res, next) => {
  const movie = findById(store.adminMovies, req.params.id);
  if (!movie) {
    return next(new AppError('Admin-added movie not found', 404));
  }

  const { title, genre, duration, rating, showtimes, price } = req.body || {};
  if (title != null) movie.title = String(title).trim();
  if (genre != null) movie.genre = String(genre).trim();
  if (duration != null) movie.duration = String(duration).trim();
  if (rating != null) movie.rating = String(rating).trim();
  if (showtimes != null) {
    if (!Array.isArray(showtimes)) return next(new AppError('showtimes must be an array', 400));
    movie.showtimes = showtimes;
  }
  if (price != null) {
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) return next(new AppError('price must be a valid number', 400));
    movie.price = parsed;
  }

  await persistStore();
  return res.json(movie);
};

export const deleteMovie = async (req, res, next) => {
  const index = store.adminMovies.findIndex((m) => m.id === req.params.id);
  if (index === -1) {
    return next(new AppError('Admin-added movie not found', 404));
  }
  const [deleted] = store.adminMovies.splice(index, 1);
  await persistStore();
  return res.json({ deleted });
};

export const updateHotel = async (req, res, next) => {
  const hotel = findById(store.adminHotels, req.params.id);
  if (!hotel) {
    return next(new AppError('Admin-added hotel not found', 404));
  }

  const { name, city, stars, pricePerNight, amenities, image } = req.body || {};
  if (name != null) hotel.name = String(name).trim();
  if (city != null) hotel.city = String(city).trim();
  if (stars != null) {
    const parsed = Number(stars);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return next(new AppError('stars must be between 1 and 5', 400));
    hotel.stars = parsed;
  }
  if (pricePerNight != null) {
    const parsed = Number(pricePerNight);
    if (!Number.isFinite(parsed) || parsed < 0) return next(new AppError('pricePerNight must be a valid number', 400));
    hotel.pricePerNight = parsed;
  }
  if (amenities != null) {
    if (!Array.isArray(amenities)) return next(new AppError('amenities must be an array', 400));
    hotel.amenities = amenities;
  }
  if (image != null) hotel.image = String(image).trim();

  await persistStore();
  return res.json(hotel);
};

export const deleteHotel = async (req, res, next) => {
  const index = store.adminHotels.findIndex((h) => h.id === req.params.id);
  if (index === -1) {
    return next(new AppError('Admin-added hotel not found', 404));
  }
  const [deleted] = store.adminHotels.splice(index, 1);
  delete store.hotelReviews[deleted.id];
  await persistStore();
  return res.json({ deleted });
};

export const updateTravel = async (req, res, next) => {
  const travel = findById(store.adminTravels, req.params.id);
  if (!travel) {
    return next(new AppError('Admin-added travel not found', 404));
  }

  const { type, from, to, date, price, carrier, flightCategory, departureLocalTime, arrivalLocalTime, departureTimezone, arrivalTimezone } = req.body || {};
  if (type != null) travel.type = String(type).trim();
  if (from != null) travel.from = String(from).trim();
  if (to != null) travel.to = String(to).trim();
  if (date != null) travel.date = String(date).trim();
  if (carrier != null) travel.carrier = String(carrier).trim();
  if (price != null) {
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) return next(new AppError('price must be a valid number', 400));
    travel.price = parsed;
  }

  if (travel.type === 'Flight') {
    if (flightCategory != null) travel.flightCategory = flightCategory === 'international' ? 'international' : 'domestic';
    if (departureLocalTime != null) travel.departureLocalTime = String(departureLocalTime).trim();
    if (arrivalLocalTime != null) travel.arrivalLocalTime = String(arrivalLocalTime).trim();
    if (departureTimezone != null) travel.departureTimezone = String(departureTimezone).trim();
    if (arrivalTimezone != null) travel.arrivalTimezone = String(arrivalTimezone).trim();
  } else {
    delete travel.flightCategory;
    delete travel.departureLocalTime;
    delete travel.arrivalLocalTime;
    delete travel.departureTimezone;
    delete travel.arrivalTimezone;
  }

  await persistStore();
  return res.json(travel);
};

export const deleteTravel = async (req, res, next) => {
  const index = store.adminTravels.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return next(new AppError('Admin-added travel not found', 404));
  }
  const [deleted] = store.adminTravels.splice(index, 1);
  await persistStore();
  return res.json({ deleted });
};
