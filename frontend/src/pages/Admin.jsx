import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import styles from './Admin.module.css';

export default function Admin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('movie');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pricing, setPricing] = useState({
    weekendMultiplier: 1.2,
    infantDiscountMultiplier: 0.5,
    movieBaseMultiplier: 1,
    hotelBaseMultiplier: 1,
    travelBaseMultiplier: 1,
    fullRefundHours: 72,
    halfRefundHours: 24,
    partialRefundHours: 2,
    halfRefundRate: 0.5,
    partialRefundRate: 0.25,
    noDateRefundRate: 0.8,
  });
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [catalog, setCatalog] = useState({ movies: [], hotels: [], travels: [] });
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [userActionId, setUserActionId] = useState('');
  const [bookingActionId, setBookingActionId] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const grossBookedAmount = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const refundedAmount = bookings.reduce(
    (sum, b) => sum + (b.status === 'cancelled' ? Number(b.cancellation?.refundAmount || 0) : 0),
    0
  );
  const netBookedAmount = Math.max(0, grossBookedAmount - refundedAmount);

  // Movie form
  const [movie, setMovie] = useState({ title: '', genre: '', duration: '', rating: 'PG-13', showtimes: '10:00 AM, 2:00 PM, 6:00 PM', price: '' });
  // Hotel form
  const [hotel, setHotel] = useState({ name: '', city: '', stars: 4, pricePerNight: '', amenities: 'Pool, WiFi, Breakfast', image: '' });
  // Travel form
  const [travel, setTravel] = useState({
    type: 'Flight',
    from: '',
    to: '',
    date: '',
    price: '',
    carrier: '',
    flightCategory: 'domestic',
    departureLocalTime: '',
    arrivalLocalTime: '',
    departureTimezone: '',
    arrivalTimezone: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const refreshAdminData = React.useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setAdminLoading(true);
    try {
      const [overviewData, usersData, bookingsData, catalogData] = await Promise.all([
        apiGet('/api/admin/overview', { token }),
        apiGet('/api/admin/users', { token }),
        apiGet('/api/admin/bookings', { token }),
        apiGet('/api/admin/catalog', { token }),
      ]);
      setOverview(overviewData);
      setUsers(usersData);
      setBookings(bookingsData);
      setCatalog(catalogData);
      setLastSyncedAt(new Date());
    } catch (err) {
      showMsg('error', err.message || 'Failed to load admin data');
    } finally {
      if (!silent) setAdminLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    apiGet('/api/settings/pricing')
      .then((data) => setPricing({
        weekendMultiplier: data.weekendMultiplier ?? 1.2,
        infantDiscountMultiplier: data.infantDiscountMultiplier ?? 0.5,
        movieBaseMultiplier: data.movieBaseMultiplier ?? 1,
        hotelBaseMultiplier: data.hotelBaseMultiplier ?? 1,
        travelBaseMultiplier: data.travelBaseMultiplier ?? 1,
        fullRefundHours: data.refundPolicy?.fullRefundHours ?? 72,
        halfRefundHours: data.refundPolicy?.halfRefundHours ?? 24,
        partialRefundHours: data.refundPolicy?.partialRefundHours ?? 2,
        halfRefundRate: data.refundPolicy?.halfRefundRate ?? 0.5,
        partialRefundRate: data.refundPolicy?.partialRefundRate ?? 0.25,
        noDateRefundRate: data.refundPolicy?.noDateRefundRate ?? 0.8,
      }))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  React.useEffect(() => {
    if (!token || activeTab !== 'manage') return undefined;
    const pollId = setInterval(() => {
      if (!document.hidden && !submitting && !userActionId && !bookingActionId) {
        refreshAdminData({ silent: true });
      }
    }, 6000);
    return () => clearInterval(pollId);
  }, [token, activeTab, submitting, userActionId, bookingActionId, refreshAdminData]);

  React.useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && activeTab === 'manage') {
        refreshAdminData({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activeTab, refreshAdminData]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAddMovie = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const showtimes = movie.showtimes.split(',').map(s => s.trim()).filter(Boolean);
      await apiPost(
        '/api/admin/movies',
        {
          title: movie.title,
          genre: movie.genre,
          duration: movie.duration,
          rating: movie.rating,
          showtimes,
          price: Number(movie.price),
        },
        { token }
      );
      showMsg('success', 'Movie added successfully. It will appear on the Movies page.');
      await refreshAdminData();
      setMovie({ ...movie, title: '', genre: '', duration: '', showtimes: '10:00 AM, 2:00 PM, 6:00 PM', price: '' });
    } catch (err) {
      showMsg('error', err.message || 'Failed to add movie');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const amenities = hotel.amenities.split(',').map(s => s.trim()).filter(Boolean);
      await apiPost(
        '/api/admin/hotels',
        {
          name: hotel.name,
          city: hotel.city,
          stars: Number(hotel.stars),
          pricePerNight: Number(hotel.pricePerNight),
          amenities,
          image: hotel.image,
        },
        { token }
      );
      showMsg('success', 'Hotel added successfully. It will appear on the Hotels page.');
      await refreshAdminData();
      setHotel({ ...hotel, name: '', city: '', pricePerNight: '', image: '' });
    } catch (err) {
      showMsg('error', err.message || 'Failed to add hotel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTravel = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await apiPost(
        '/api/admin/travels',
        {
          type: travel.type,
          from: travel.from,
          to: travel.to,
          date: travel.date,
          price: Number(travel.price),
          carrier: travel.carrier,
          flightCategory: travel.flightCategory,
          departureLocalTime: travel.departureLocalTime,
          arrivalLocalTime: travel.arrivalLocalTime,
          departureTimezone: travel.departureTimezone,
          arrivalTimezone: travel.arrivalTimezone,
        },
        { token }
      );
      showMsg('success', 'Travel route added successfully. It will appear on the Travel page.');
      await refreshAdminData();
      setTravel({
        ...travel,
        from: '',
        to: '',
        date: '',
        price: '',
        carrier: '',
        departureLocalTime: '',
        arrivalLocalTime: '',
        departureTimezone: '',
        arrivalTimezone: '',
      });
    } catch (err) {
      showMsg('error', err.message || 'Failed to add travel route');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await apiPut(
        '/api/admin/settings/pricing',
        {
          weekendMultiplier: Number(pricing.weekendMultiplier),
          infantDiscountMultiplier: Number(pricing.infantDiscountMultiplier),
          movieBaseMultiplier: Number(pricing.movieBaseMultiplier),
          hotelBaseMultiplier: Number(pricing.hotelBaseMultiplier),
          travelBaseMultiplier: Number(pricing.travelBaseMultiplier),
          fullRefundHours: Number(pricing.fullRefundHours),
          halfRefundHours: Number(pricing.halfRefundHours),
          partialRefundHours: Number(pricing.partialRefundHours),
          halfRefundRate: Number(pricing.halfRefundRate),
          partialRefundRate: Number(pricing.partialRefundRate),
          noDateRefundRate: Number(pricing.noDateRefundRate),
        },
        { token }
      );
      showMsg('success', 'Pricing settings updated successfully.');
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to save pricing settings');
    } finally {
      setSubmitting(false);
    }
  };

  const beginEdit = (type, item) => {
    setEditingItem({ type, id: item.id });
    if (type === 'movie') {
      setEditValues({
        title: item.title || '',
        genre: item.genre || '',
        duration: item.duration || '',
        rating: item.rating || '',
        showtimes: Array.isArray(item.showtimes) ? item.showtimes.join(', ') : '',
        price: String(item.price ?? ''),
      });
      return;
    }
    if (type === 'hotel') {
      setEditValues({
        name: item.name || '',
        city: item.city || '',
        stars: String(item.stars ?? ''),
        pricePerNight: String(item.pricePerNight ?? ''),
        amenities: Array.isArray(item.amenities) ? item.amenities.join(', ') : '',
        image: item.image || '',
      });
      return;
    }
    setEditValues({
      type: item.type || 'Flight',
      from: item.from || '',
      to: item.to || '',
      date: item.date || '',
      price: String(item.price ?? ''),
      carrier: item.carrier || '',
      flightCategory: item.flightCategory || 'domestic',
      departureLocalTime: item.departureLocalTime || '',
      arrivalLocalTime: item.arrivalLocalTime || '',
      departureTimezone: item.departureTimezone || '',
      arrivalTimezone: item.arrivalTimezone || '',
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      if (editingItem.type === 'movie') {
        await apiPut(
          `/api/admin/movies/${editingItem.id}`,
          {
            title: editValues.title,
            genre: editValues.genre,
            duration: editValues.duration,
            rating: editValues.rating,
            showtimes: String(editValues.showtimes || '').split(',').map((s) => s.trim()).filter(Boolean),
            price: Number(editValues.price),
          },
          { token }
        );
      } else if (editingItem.type === 'hotel') {
        await apiPut(
          `/api/admin/hotels/${editingItem.id}`,
          {
            name: editValues.name,
            city: editValues.city,
            stars: Number(editValues.stars),
            pricePerNight: Number(editValues.pricePerNight),
            amenities: String(editValues.amenities || '').split(',').map((s) => s.trim()).filter(Boolean),
            image: editValues.image,
          },
          { token }
        );
      } else {
        await apiPut(
          `/api/admin/travels/${editingItem.id}`,
          {
            type: editValues.type,
            from: editValues.from,
            to: editValues.to,
            date: editValues.date,
            price: Number(editValues.price),
            carrier: editValues.carrier,
            flightCategory: editValues.flightCategory,
            departureLocalTime: editValues.departureLocalTime,
            arrivalLocalTime: editValues.arrivalLocalTime,
            departureTimezone: editValues.departureTimezone,
            arrivalTimezone: editValues.arrivalTimezone,
          },
          { token }
        );
      }
      showMsg('success', 'Item updated successfully.');
      cancelEdit();
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to update item');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = async (type, id) => {
    const ok = window.confirm('Delete this admin-added item?');
    if (!ok) return;
    setSubmitting(true);
    try {
      const base = type === 'movie' ? 'movies' : type === 'hotel' ? 'hotels' : 'travels';
      await apiDelete(`/api/admin/${base}/${id}`, { token });
      showMsg('success', 'Item deleted successfully.');
      if (editingItem?.id === id) cancelEdit();
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to delete item');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminAdded = (id) => String(id || '').includes('-admin-');

  const toggleUserRole = async (user) => {
    setUserActionId(user.id);
    try {
      await apiPut(`/api/admin/users/${user.id}/role`, { isAdmin: !user.isAdmin }, { token });
      showMsg('success', `User role updated for ${user.email}.`);
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to update user role');
    } finally {
      setUserActionId('');
    }
  };

  const removeUser = async (user) => {
    const ok = window.confirm(`Delete user ${user.email}? Their bookings and reviews will also be removed.`);
    if (!ok) return;
    setUserActionId(user.id);
    try {
      await apiDelete(`/api/admin/users/${user.id}`, { token });
      showMsg('success', `User deleted: ${user.email}`);
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to delete user');
    } finally {
      setUserActionId('');
    }
  };

  const cancelBookingAsAdmin = async (bookingId) => {
    const ok = window.confirm(`Cancel booking ${bookingId}?`);
    if (!ok) return;
    setBookingActionId(bookingId);
    try {
      await apiDelete(`/api/admin/bookings/${bookingId}`, { token });
      showMsg('success', `Booking ${bookingId} cancelled.`);
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to cancel booking');
    } finally {
      setBookingActionId('');
    }
  };

  const toggleAvailability = async (type, item) => {
    const currentlyAvailable = item.available !== false;
    const makeAvailable = !currentlyAvailable;
    const reason = makeAvailable
      ? ''
      : (window.prompt('Reason for marking unavailable (optional):', item.unavailableReason || '') || '');
    setSubmitting(true);
    try {
      const base = type === 'movie' ? 'movies' : type === 'hotel' ? 'hotels' : 'travels';
      await apiPut(`/api/admin/catalog/${base}/${item.id}/availability`, { available: makeAvailable, reason }, { token });
      showMsg('success', makeAvailable ? 'Marked available.' : 'Marked unavailable.');
      await refreshAdminData();
    } catch (err) {
      showMsg('error', err.message || 'Failed to update availability');
    } finally {
      setSubmitting(false);
    }
  };

  const refundPreview = (hoursLeft) => {
    const fullHours = Number(pricing.fullRefundHours);
    const halfHours = Number(pricing.halfRefundHours);
    const partialHours = Number(pricing.partialRefundHours);
    if (hoursLeft > fullHours) return 1;
    if (hoursLeft > halfHours) return Number(pricing.halfRefundRate);
    if (hoursLeft > partialHours) return Number(pricing.partialRefundRate);
    return 0;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Admin</h1>
      <p className={styles.lead}>Add new movies, hotels, and travel routes. Changes appear immediately for all users.</p>

      {message.text && (
        <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg}>{message.text}</div>
      )}

      <div className={styles.tabs}>
        <button type="button" className={activeTab === 'movie' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('movie')}>Add Movie</button>
        <button type="button" className={activeTab === 'hotel' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('hotel')}>Add Hotel</button>
        <button type="button" className={activeTab === 'travel' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('travel')}>Add Travel Route</button>
        <button type="button" className={activeTab === 'pricing' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('pricing')}>Pricing Settings</button>
        <button type="button" className={activeTab === 'manage' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('manage')}>Manage Data</button>
      </div>

      {activeTab === 'movie' && (
        <form onSubmit={handleAddMovie} className={styles.form}>
          <h2>Add a movie</h2>
          <label>Title <input value={movie.title} onChange={e => setMovie({ ...movie, title: e.target.value })} required placeholder="e.g. The New Blockbuster" /></label>
          <label>Genre <input value={movie.genre} onChange={e => setMovie({ ...movie, genre: e.target.value })} required placeholder="e.g. Action, Comedy" /></label>
          <label>Duration <input value={movie.duration} onChange={e => setMovie({ ...movie, duration: e.target.value })} required placeholder="e.g. 2h 15m" /></label>
          <label>Rating <select value={movie.rating} onChange={e => setMovie({ ...movie, rating: e.target.value })}><option value="G">G</option><option value="PG">PG</option><option value="PG-13">PG-13</option><option value="R">R</option></select></label>
          <label>Showtimes (comma-separated) <input value={movie.showtimes} onChange={e => setMovie({ ...movie, showtimes: e.target.value })} required placeholder="10:00 AM, 2:00 PM, 6:00 PM" /></label>
          <label>Price per ticket (₹) <input type="number" min="1" step="0.5" value={movie.price} onChange={e => setMovie({ ...movie, price: e.target.value })} required placeholder="12" /></label>
          <button type="submit" className={styles.submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add movie'}</button>
        </form>
      )}

      {activeTab === 'hotel' && (
        <form onSubmit={handleAddHotel} className={styles.form}>
          <h2>Add a hotel</h2>
          <label>Hotel name <input value={hotel.name} onChange={e => setHotel({ ...hotel, name: e.target.value })} required placeholder="e.g. Riverside Suites" /></label>
          <label>City <input value={hotel.city} onChange={e => setHotel({ ...hotel, city: e.target.value })} required placeholder="e.g. Seattle" /></label>
          <label>Stars (1–5) <input type="number" min="1" max="5" value={hotel.stars} onChange={e => setHotel({ ...hotel, stars: e.target.value })} /></label>
          <label>Price per night (₹) <input type="number" min="1" value={hotel.pricePerNight} onChange={e => setHotel({ ...hotel, pricePerNight: e.target.value })} required placeholder="99" /></label>
          <label>Amenities (comma-separated) <input value={hotel.amenities} onChange={e => setHotel({ ...hotel, amenities: e.target.value })} placeholder="Pool, WiFi, Breakfast" /></label>
          <label>Image URL (optional) <input value={hotel.image} onChange={e => setHotel({ ...hotel, image: e.target.value })} placeholder="https://example.com/hotel.jpg" /></label>
          <button type="submit" className={styles.submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add hotel'}</button>
        </form>
      )}

      {activeTab === 'travel' && (
        <form onSubmit={handleAddTravel} className={styles.form}>
          <h2>Add a travel route</h2>
          <label>Type <select value={travel.type} onChange={e => setTravel({ ...travel, type: e.target.value })}><option value="Flight">Flight</option><option value="Train">Train</option><option value="Bus">Bus</option></select></label>
          <label>From <input value={travel.from} onChange={e => setTravel({ ...travel, from: e.target.value })} required placeholder="e.g. NYC" /></label>
          <label>To <input value={travel.to} onChange={e => setTravel({ ...travel, to: e.target.value })} required placeholder="e.g. Miami" /></label>
          <label>Date <input type="date" value={travel.date} onChange={e => setTravel({ ...travel, date: e.target.value })} required /></label>
          <label>Price (₹) <input type="number" min="1" value={travel.price} onChange={e => setTravel({ ...travel, price: e.target.value })} required placeholder="149" /></label>
          <label>Carrier / operator <input value={travel.carrier} onChange={e => setTravel({ ...travel, carrier: e.target.value })} required placeholder="e.g. SkyWays, Amtrak" /></label>
          {travel.type === 'Flight' && (
            <>
              <label>Flight category
                <select value={travel.flightCategory} onChange={e => setTravel({ ...travel, flightCategory: e.target.value })}>
                  <option value="domestic">Domestic</option>
                  <option value="international">International</option>
                </select>
              </label>
              <label>Departure local time <input value={travel.departureLocalTime} onChange={e => setTravel({ ...travel, departureLocalTime: e.target.value })} placeholder="e.g. 09:30 AM" /></label>
              <label>Arrival local time <input value={travel.arrivalLocalTime} onChange={e => setTravel({ ...travel, arrivalLocalTime: e.target.value })} placeholder="e.g. 12:45 PM" /></label>
              <label>Departure timezone <input value={travel.departureTimezone} onChange={e => setTravel({ ...travel, departureTimezone: e.target.value })} placeholder="e.g. IST (UTC+5:30)" /></label>
              <label>Arrival timezone <input value={travel.arrivalTimezone} onChange={e => setTravel({ ...travel, arrivalTimezone: e.target.value })} placeholder="e.g. GMT (UTC+0)" /></label>
            </>
          )}
          <button type="submit" className={styles.submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add travel route'}</button>
        </form>
      )}

      {activeTab === 'pricing' && (
        <form onSubmit={handleSavePricing} className={styles.form}>
          <h2>Dynamic Pricing Settings</h2>
          <label>
            Weekend Multiplier (e.g. 1.2 for +20%)
            <input
              type="number"
              step="0.01"
              min="1"
              value={pricing.weekendMultiplier}
              onChange={(e) => setPricing({ ...pricing, weekendMultiplier: e.target.value })}
              required
            />
          </label>
          <label>
            Infant Discount Multiplier (0 to 1, e.g. 0.5 for 50%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={pricing.infantDiscountMultiplier}
              onChange={(e) => setPricing({ ...pricing, infantDiscountMultiplier: e.target.value })}
              required
            />
          </label>
          <h3>Service Price Multipliers</h3>
          <label>
            Movie Base Multiplier
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={pricing.movieBaseMultiplier}
              onChange={(e) => setPricing({ ...pricing, movieBaseMultiplier: e.target.value })}
              required
            />
          </label>
          <label>
            Hotel Base Multiplier
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={pricing.hotelBaseMultiplier}
              onChange={(e) => setPricing({ ...pricing, hotelBaseMultiplier: e.target.value })}
              required
            />
          </label>
          <label>
            Travel Base Multiplier
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={pricing.travelBaseMultiplier}
              onChange={(e) => setPricing({ ...pricing, travelBaseMultiplier: e.target.value })}
              required
            />
          </label>
          <h3>Refund Policy</h3>
          <label>
            Full Refund Hours Threshold
            <input
              type="number"
              min="0"
              value={pricing.fullRefundHours}
              onChange={(e) => setPricing({ ...pricing, fullRefundHours: e.target.value })}
              required
            />
          </label>
          <label>
            Half Refund Hours Threshold
            <input
              type="number"
              min="0"
              value={pricing.halfRefundHours}
              onChange={(e) => setPricing({ ...pricing, halfRefundHours: e.target.value })}
              required
            />
          </label>
          <label>
            Partial Refund Hours Threshold
            <input
              type="number"
              min="0"
              value={pricing.partialRefundHours}
              onChange={(e) => setPricing({ ...pricing, partialRefundHours: e.target.value })}
              required
            />
          </label>
          <label>
            Half Refund Rate (0 to 1)
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={pricing.halfRefundRate}
              onChange={(e) => setPricing({ ...pricing, halfRefundRate: e.target.value })}
              required
            />
          </label>
          <label>
            Partial Refund Rate (0 to 1)
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={pricing.partialRefundRate}
              onChange={(e) => setPricing({ ...pricing, partialRefundRate: e.target.value })}
              required
            />
          </label>
          <label>
            No-Date Refund Rate (0 to 1)
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={pricing.noDateRefundRate}
              onChange={(e) => setPricing({ ...pricing, noDateRefundRate: e.target.value })}
              required
            />
          </label>
          <div className={styles.summary}>
            <h3>Refund Policy Preview</h3>
            <p>80h left: {Math.round(refundPreview(80) * 100)}% refund</p>
            <p>30h left: {Math.round(refundPreview(30) * 100)}% refund</p>
            <p>5h left: {Math.round(refundPreview(5) * 100)}% refund</p>
            <p>1h left: {Math.round(refundPreview(1) * 100)}% refund</p>
            <p>No service date: {Math.round(Number(pricing.noDateRefundRate || 0) * 100)}% refund</p>
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Pricing Settings'}
          </button>
        </form>
      )}

      {activeTab === 'manage' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Live Admin Data</h2>
            <button type="button" className={styles.secondaryBtn} onClick={() => refreshAdminData()} disabled={adminLoading}>
              {adminLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {lastSyncedAt && (
            <p className={styles.readonlyTag}>Auto-sync active · Last updated {lastSyncedAt.toLocaleTimeString()}</p>
          )}

          {overview && (
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}><span>Users</span><strong>{overview.usersCount}</strong></div>
              <div className={styles.metricCard}><span>Bookings</span><strong>{overview.bookingsCount}</strong></div>
              <div className={styles.metricCard}><span>Movies</span><strong>{overview.moviesCount}</strong></div>
              <div className={styles.metricCard}><span>Hotels</span><strong>{overview.hotelsCount}</strong></div>
              <div className={styles.metricCard}><span>Travels</span><strong>{overview.travelsCount}</strong></div>
              <div className={styles.metricCard}><span>Gross Booked</span><strong>₹{grossBookedAmount.toFixed(2)}</strong></div>
              <div className={styles.metricCard}><span>Refunded</span><strong>₹{refundedAmount.toFixed(2)}</strong></div>
              <div className={styles.metricCard}><span>Net Revenue</span><strong>₹{netBookedAmount.toFixed(2)}</strong></div>
            </div>
          )}

          <div className={styles.listBlock}>
            <h3>Users ({users.length})</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.isAdmin ? 'Admin' : 'User'}</td>
                      <td>
                        <div className={styles.actionsRow}>
                          <button type="button" className={styles.secondaryBtn} onClick={() => toggleUserRole(u)} disabled={userActionId === u.id}>
                            {userActionId === u.id ? 'Saving…' : (u.isAdmin ? 'Make User' : 'Make Admin')}
                          </button>
                          <button type="button" className={styles.dangerBtn} onClick={() => removeUser(u)} disabled={userActionId === u.id}>
                            {userActionId === u.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.listBlock}>
            <h3>Bookings ({bookings.length})</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>ID</th><th>Type</th><th>User</th><th>Status</th><th>Total</th><th>Refund</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.type}</td>
                      <td>{b.user?.name || b.user?.email || b.userId}</td>
                      <td>{b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</td>
                      <td>₹{b.totalAmount}</td>
                      <td>{b.status === 'cancelled' ? `₹${Number(b.cancellation?.refundAmount || 0).toFixed(2)}` : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => cancelBookingAsAdmin(b.id)}
                          disabled={bookingActionId === b.id || b.status === 'cancelled'}
                        >
                          {b.status === 'cancelled' ? 'Already cancelled' : (bookingActionId === b.id ? 'Cancelling…' : 'Cancel')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {['movie', 'hotel', 'travel'].map((type) => {
            const items = type === 'movie' ? catalog.movies : type === 'hotel' ? catalog.hotels : catalog.travels;
            return (
              <div key={type} className={styles.listBlock}>
                <h3>{type[0].toUpperCase() + type.slice(1)}s ({items.length})</h3>
                <div className={styles.itemsGrid}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.itemCard}>
                      <p className={styles.itemTitle}>{type === 'movie' ? item.title : type === 'hotel' ? item.name : `${item.from} → ${item.to}`}</p>
                      <p className={styles.itemMeta}>ID: {item.id}</p>
                      <p className={styles.itemMeta}>
                        Availability: {item.available === false ? `Unavailable${item.unavailableReason ? ` (${item.unavailableReason})` : ''}` : 'Available'}
                      </p>
                      {type === 'movie' && <p className={styles.itemMeta}>{item.genre} · ₹{item.price}</p>}
                      {type === 'hotel' && <p className={styles.itemMeta}>{item.city} · ₹{item.pricePerNight}/night</p>}
                      {type === 'travel' && <p className={styles.itemMeta}>{item.type} · {item.carrier} · ₹{item.price}</p>}
                      <div className={styles.actionsRow}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => toggleAvailability(type, item)}
                          disabled={submitting}
                        >
                          {item.available === false ? 'Mark Available' : 'Mark Unavailable'}
                        </button>
                        {isAdminAdded(item.id) ? (
                          <>
                          <button type="button" className={styles.secondaryBtn} onClick={() => beginEdit(type, item)}>Edit</button>
                          <button type="button" className={styles.dangerBtn} onClick={() => deleteItem(type, item.id)} disabled={submitting}>Delete</button>
                          </>
                        ) : (
                          <p className={styles.readonlyTag}>Base item: availability only</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {editingItem && (
            <div className={styles.editPanel}>
              <h3>Edit {editingItem.type} ({editingItem.id})</h3>
              {editingItem.type === 'movie' && (
                <>
                  <input value={editValues.title || ''} onChange={(e) => setEditValues({ ...editValues, title: e.target.value })} placeholder="Title" />
                  <input value={editValues.genre || ''} onChange={(e) => setEditValues({ ...editValues, genre: e.target.value })} placeholder="Genre" />
                  <input value={editValues.duration || ''} onChange={(e) => setEditValues({ ...editValues, duration: e.target.value })} placeholder="Duration" />
                  <input value={editValues.rating || ''} onChange={(e) => setEditValues({ ...editValues, rating: e.target.value })} placeholder="Rating" />
                  <input value={editValues.showtimes || ''} onChange={(e) => setEditValues({ ...editValues, showtimes: e.target.value })} placeholder="Showtimes comma-separated" />
                  <input type="number" min="0" value={editValues.price || ''} onChange={(e) => setEditValues({ ...editValues, price: e.target.value })} placeholder="Price" />
                </>
              )}
              {editingItem.type === 'hotel' && (
                <>
                  <input value={editValues.name || ''} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} placeholder="Name" />
                  <input value={editValues.city || ''} onChange={(e) => setEditValues({ ...editValues, city: e.target.value })} placeholder="City" />
                  <input type="number" min="1" max="5" value={editValues.stars || ''} onChange={(e) => setEditValues({ ...editValues, stars: e.target.value })} placeholder="Stars" />
                  <input type="number" min="0" value={editValues.pricePerNight || ''} onChange={(e) => setEditValues({ ...editValues, pricePerNight: e.target.value })} placeholder="Price per night" />
                  <input value={editValues.amenities || ''} onChange={(e) => setEditValues({ ...editValues, amenities: e.target.value })} placeholder="Amenities comma-separated" />
                  <input value={editValues.image || ''} onChange={(e) => setEditValues({ ...editValues, image: e.target.value })} placeholder="Image URL" />
                </>
              )}
              {editingItem.type === 'travel' && (
                <>
                  <select value={editValues.type || 'Flight'} onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}>
                    <option value="Flight">Flight</option><option value="Train">Train</option><option value="Bus">Bus</option>
                  </select>
                  <input value={editValues.from || ''} onChange={(e) => setEditValues({ ...editValues, from: e.target.value })} placeholder="From" />
                  <input value={editValues.to || ''} onChange={(e) => setEditValues({ ...editValues, to: e.target.value })} placeholder="To" />
                  <input type="date" value={editValues.date || ''} onChange={(e) => setEditValues({ ...editValues, date: e.target.value })} />
                  <input type="number" min="0" value={editValues.price || ''} onChange={(e) => setEditValues({ ...editValues, price: e.target.value })} placeholder="Price" />
                  <input value={editValues.carrier || ''} onChange={(e) => setEditValues({ ...editValues, carrier: e.target.value })} placeholder="Carrier" />
                </>
              )}
              <div className={styles.actionsRow}>
                <button type="button" className={styles.submit} onClick={saveEdit} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
                <button type="button" className={styles.secondaryBtn} onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
