import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultMoviesSeed = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'data', 'defaultMovies.json'), 'utf-8')
);

const baseState = {
  users: [
    { id: '1', email: 'demo@bookflow.com', password: 'demo123', name: 'Demo User', role: 'user', isAdmin: false },
    { id: 'admin', email: 'admin@bookflow.com', password: 'admin123', name: 'Administrator', role: 'admin', isAdmin: true },
  ],
  bookings: [],
  bookingIdCounter: 1000,
  defaultMovies: defaultMoviesSeed,
  defaultHotels: [
    { id: 'h1', name: 'Grand Plaza Hotel', city: 'New York', stars: 5, pricePerNight: 189, amenities: ['Pool', 'Spa', 'Restaurant'], image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80' },
    { id: 'h2', name: 'Coastal Inn', city: 'Miami', stars: 4, pricePerNight: 129, amenities: ['Beach', 'Breakfast'], image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' },
    { id: 'h3', name: 'Mountain Lodge', city: 'Denver', stars: 4, pricePerNight: 149, amenities: ['Ski', 'Fireplace'], image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80' },
  ],
  defaultTravels: [
    {
      id: 't1',
      type: 'Flight',
      flightCategory: 'domestic',
      from: 'New York (JFK)',
      to: 'Los Angeles (LAX)',
      date: '2026-04-12',
      price: 299,
      carrier: 'SkyWays',
      departureLocalTime: '09:20 AM',
      arrivalLocalTime: '12:35 PM',
      departureTimezone: 'EDT (UTC-4)',
      arrivalTimezone: 'PDT (UTC-7)',
    },
    {
      id: 't4',
      type: 'Flight',
      flightCategory: 'international',
      from: 'Mumbai (BOM)',
      to: 'London (LHR)',
      date: '2026-04-21',
      price: 649,
      carrier: 'AirBridge',
      departureLocalTime: '02:10 AM',
      arrivalLocalTime: '07:45 AM',
      departureTimezone: 'IST (UTC+5:30)',
      arrivalTimezone: 'BST (UTC+1)',
    },
    { id: 't2', type: 'Train', from: 'Boston', to: 'Washington DC', date: '2025-03-20', price: 89, carrier: 'Amtrak' },
    { id: 't3', type: 'Bus', from: 'Chicago', to: 'Detroit', date: '2025-03-18', price: 45, carrier: 'Greyhound' },
  ],
  adminMovies: [],
  adminHotels: [],
  adminTravels: [],
  adminMovieId: 1,
  adminHotelId: 1,
  adminTravelId: 1,
  pricingSettings: {
    weekendMultiplier: 1.2,
    infantDiscountMultiplier: 0.5,
    movieBaseMultiplier: 1,
    hotelBaseMultiplier: 1,
    travelBaseMultiplier: 1,
    refundPolicy: {
      fullRefundHours: 72,
      halfRefundHours: 24,
      partialRefundHours: 2,
      halfRefundRate: 0.5,
      partialRefundRate: 0.25,
      noDateRefundRate: 0.8,
    },
  },
  hotelReviews: {
    h1: [{ id: 'r1', userId: '1', userName: 'Demo User', rating: 5, comment: 'Excellent service and very clean rooms.', createdAt: new Date().toISOString() }],
    h2: [{ id: 'r2', userId: '1', userName: 'Demo User', rating: 4, comment: 'Great location near the beach.', createdAt: new Date().toISOString() }],
  },
};

const normalizeUserRole = (user) => {
  const role = user?.role === 'admin' || user?.isAdmin ? 'admin' : 'user';
  return {
    ...user,
    role,
    isAdmin: role === 'admin',
  };
};

const withDefaults = (data = {}) => ({
  ...baseState,
  ...data,
  users: (Array.isArray(data.users) ? data.users : baseState.users).map(normalizeUserRole),
  bookings: Array.isArray(data.bookings) ? data.bookings : baseState.bookings,
  defaultMovies: Array.isArray(data.defaultMovies) ? data.defaultMovies : baseState.defaultMovies,
  defaultHotels: Array.isArray(data.defaultHotels) ? data.defaultHotels : baseState.defaultHotels,
  defaultTravels: Array.isArray(data.defaultTravels) ? data.defaultTravels : baseState.defaultTravels,
  adminMovies: Array.isArray(data.adminMovies) ? data.adminMovies : baseState.adminMovies,
  adminHotels: Array.isArray(data.adminHotels) ? data.adminHotels : baseState.adminHotels,
  adminTravels: Array.isArray(data.adminTravels) ? data.adminTravels : baseState.adminTravels,
  pricingSettings: {
    ...baseState.pricingSettings,
    ...(data.pricingSettings || {}),
    refundPolicy: {
      ...baseState.pricingSettings.refundPolicy,
      ...((data.pricingSettings && data.pricingSettings.refundPolicy) || {}),
    },
  },
  hotelReviews: typeof data.hotelReviews === 'object' && data.hotelReviews !== null ? data.hotelReviews : baseState.hotelReviews,
});

export const store = withDefaults();

const resolveDbFile = () => {
  if (path.isAbsolute(env.dbFilePath)) {
    return env.dbFilePath;
  }
  return path.resolve(__dirname, '..', env.dbFilePath);
};

const dbFilePath = resolveDbFile();

export const persistStore = async () => {
  await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
  await fs.writeFile(dbFilePath, `${JSON.stringify(store, null, 2)}\n`, 'utf-8');
};

export const initializeStore = async () => {
  try {
    const raw = await fs.readFile(dbFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.assign(store, withDefaults(parsed));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await persistStore();
  }
};

export const getCatalog = () => ({
  movies: [...store.defaultMovies, ...store.adminMovies],
  hotels: [...store.defaultHotels, ...store.adminHotels],
  travels: [...store.defaultTravels, ...store.adminTravels],
});

export const isItemAvailable = (item) => item?.available !== false;

export const getPublicCatalog = () => {
  const catalog = getCatalog();
  return {
    movies: catalog.movies.filter(isItemAvailable),
    hotels: catalog.hotels.filter(isItemAvailable),
    travels: catalog.travels.filter(isItemAvailable),
  };
};

export const nextBookingId = () => `BKG-${++store.bookingIdCounter}`;
export const nextPaymentId = () => `PAY-${uuidv4().slice(0, 8).toUpperCase()}`;
export const nextReviewId = () => `rev-${uuidv4().slice(0, 8)}`;
export const nextAdminMovieId = () => `m-admin-${store.adminMovieId++}`;
export const nextAdminHotelId = () => `h-admin-${store.adminHotelId++}`;
export const nextAdminTravelId = () => `t-admin-${store.adminTravelId++}`;
