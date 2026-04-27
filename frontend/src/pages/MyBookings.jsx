import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiDelete, apiGet } from '../lib/api';
import styles from './MyBookings.module.css';

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadBookings = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiGet('/api/bookings', { token });
      setBookings(data);
      setLastSyncedAt(new Date());
      setError('');
    } catch (e) {
      setBookings([]);
      setError(e.message || 'Failed to load bookings');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!token) return undefined;
    const pollId = setInterval(() => {
      if (!document.hidden && !cancellingId) {
        loadBookings({ silent: true });
      }
    }, 8000);
    return () => clearInterval(pollId);
  }, [token, cancellingId, loadBookings]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        loadBookings({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadBookings]);

  if (loading) return <div className={styles.loading}>Loading your bookings…</div>;

  const grossAmount = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalRefunded = bookings.reduce(
    (sum, b) => sum + (b.status === 'cancelled' ? Number(b.cancellation?.refundAmount || 0) : 0),
    0
  );
  const totalSpent = Math.max(0, grossAmount - totalRefunded);
  const filteredBookings = bookings
    .filter((b) => (typeFilter === 'all' ? true : b.type === typeFilter))
    .filter((b) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const detailsText = JSON.stringify(b.details || {}).toLowerCase();
      return String(b.id).toLowerCase().includes(q) || String(b.type).toLowerCase().includes(q) || detailsText.includes(q);
    });

  const cancelBooking = async (bookingId) => {
    const confirmed = window.confirm('Cancel this booking? This action cannot be undone.');
    if (!confirmed) return;
    setCancellingId(bookingId);
    setError('');
    try {
      const result = await apiDelete(`/api/bookings/${bookingId}`, { token });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? result.cancelled : b)));
      setLastSyncedAt(new Date());
    } catch (e) {
      setError(e.message || 'Failed to cancel booking');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>My Bookings</h1>
      <p className={styles.lead}>View, filter, and manage your bookings.</p>
      {lastSyncedAt && (
        <p className={styles.syncText}>Auto-sync active · Last updated {lastSyncedAt.toLocaleTimeString()}</p>
      )}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span>Total bookings</span>
          <strong>{bookings.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Total spent (net)</span>
          <strong>₹{totalSpent.toFixed(2)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Total refunded</span>
          <strong>₹{totalRefunded.toFixed(2)}</strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by booking id, type, route, hotel, movie..."
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="movie">Movie</option>
          <option value="hotel">Hotel</option>
          <option value="travel">Travel</option>
        </select>
      </div>

      {filteredBookings.length === 0 ? (
        <div className={styles.empty}>
          <p>{bookings.length === 0 ? "You don't have any bookings yet." : 'No bookings match your current filters.'}</p>
          <Link to="/">Book a movie, hotel, or travel</Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredBookings.map((b) => (
            <li key={b.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.id}>{b.id}</span>
                <span className={styles.type}>{b.type}</span>
                <span className={b.status === 'cancelled' ? styles.statusCancelled : styles.statusConfirmed}>
                  {b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                </span>
                <span className={styles.amount}>₹{b.totalAmount}</span>
              </div>
              <div className={styles.itemDetails}>
                {b.type === 'movie' && (
                  <span>{b.details?.movie} · {b.details?.showtime} · {b.details?.tickets} ticket(s)</span>
                )}
                {b.type === 'hotel' && (
                  <span>
                    {b.details?.hotel} · {b.details?.city} · {b.details?.nights} night(s)
                    {b.details?.checkInDate ? ` · from ${b.details.checkInDate}` : ''}
                  </span>
                )}
                {b.type === 'travel' && (
                  <span>{b.details?.type} · {b.details?.from} → {b.details?.to} · {b.details?.date}</span>
                )}
              </div>
              {b.status === 'cancelled' && b.cancellation && (
                <div className={styles.cancelInfo}>
                  <span>Refund: ₹{Number(b.cancellation.refundAmount || 0).toFixed(2)}</span>
                  <span>Policy: {Math.round(Number(b.cancellation.refundPercentage || 0) * 100)}%</span>
                  <span>
                    {b.cancellation.hoursLeft == null
                      ? 'No service date found'
                      : `${b.cancellation.hoursLeft}h left at cancellation`}
                  </span>
                </div>
              )}
              <div className={styles.actions}>
                <Link to={`/receipt/${b.id}`} className={styles.receiptLink}>View receipt</Link>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => cancelBooking(b.id)}
                  disabled={cancellingId === b.id || b.status === 'cancelled'}
                >
                  {b.status === 'cancelled' ? 'Already cancelled' : (cancellingId === b.id ? 'Cancelling…' : 'Cancel booking')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
