import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import styles from './Booking.module.css';

const todayISO = () => new Date().toISOString().slice(0, 10);

const addDaysISO = (isoStr, daysToAdd) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + daysToAdd);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatPrettyDate = (iso) => {
  if (!iso) return '';
  const [yy, mm, dd] = iso.split('-').map(Number);
  if (!yy || !mm || !dd) return iso;
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function Hotels() {
  const { token } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [pricingSettings, setPricingSettings] = useState({ hotelBaseMultiplier: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [nightsByHotelId, setNightsByHotelId] = useState({});
  const [step, setStep] = useState('list');
  const [paying, setPaying] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ averageRating: 0, count: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [checkInByHotelId, setCheckInByHotelId] = useState({});
  const [dateErrorByHotelId, setDateErrorByHotelId] = useState({});

  useEffect(() => {
    Promise.all([apiGet('/api/hotels'), apiGet('/api/settings/pricing').catch(() => null)])
      .then(([hotelsData, pricingData]) => {
        setHotels(hotelsData);
        if (pricingData) {
          setPricingSettings({ hotelBaseMultiplier: Number(pricingData.hotelBaseMultiplier || 1) });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getNights = (hotelId) => nightsByHotelId[hotelId] ?? 1;
  const getCheckIn = (hotelId) => checkInByHotelId[hotelId] ?? todayISO();
  const nights = selected ? getNights(selected.id) : 1;
  const checkInDate = selected ? getCheckIn(selected.id) : '';
  const checkOutDate = selected && checkInDate ? addDaysISO(checkInDate, nights) : '';

  const adjustedNightRate = selected
    ? Number(selected.pricePerNight || 0) * Number(pricingSettings.hotelBaseMultiplier || 1)
    : 0;
  const total = selected ? adjustedNightRate * nights : 0;

  const loadReviews = async (hotelId) => {
    setReviewsLoading(true);
    try {
      const data = await apiGet(`/api/hotels/${hotelId}/reviews`);
      setReviews(data.reviews || []);
      setReviewsMeta({ averageRating: data.averageRating || 0, count: data.count || 0 });
    } catch {
      setReviews([]);
      setReviewsMeta({ averageRating: 0, count: 0 });
    } finally {
      setReviewsLoading(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await apiPost(
        '/api/bookings',
        {
          type: 'hotel',
          details: {
            hotel: selected.name,
            city: selected.city,
            stars: selected.stars,
            nights,
            checkInDate,
            checkOutDate,
            pricePerNight: adjustedNightRate,
            amenities: selected.amenities,
          },
          totalAmount: total,
        },
        { token }
      );
      setBookingId(data.id);
      setStep('done');
    } catch (e) {
      alert(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setReviewSubmitting(true);
    try {
      await apiPost(`/api/hotels/${selected.id}/reviews`, { rating: reviewRating, comment: reviewComment }, { token });
      setReviewComment('');
      setReviewRating(5);
      await loadReviews(selected.id);
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading hotels…</div>;

  if (step === 'done' && bookingId) {
    window.location.href = `/receipt/${bookingId}`;
    return <div className={styles.loading}>Redirecting to receipt…</div>;
  }

  if (step === 'confirm') {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>Confirm & Pay</h1>
        <div className={styles.summary}>
          {selected.image && <img className={styles.hotelImage} src={selected.image} alt={selected.name} />}
          <h2>{selected.name}</h2>
          <p>{selected.city} · {'★'.repeat(selected.stars)}</p>
          <p className={styles.dateHint}>
            <strong>Stay</strong> · Check-in {formatPrettyDate(checkInDate)} → Check-out {formatPrettyDate(checkOutDate)}
          </p>
          <p>{nights} night(s) × ₹{adjustedNightRate.toFixed(2)} = <strong>₹{total.toFixed(2)}</strong></p>
        </div>
        <div className={styles.summary}>
          <h2>Guest Reviews</h2>
          <p>
            {reviewsMeta.count > 0
              ? `${reviewsMeta.averageRating.toFixed(1)} / 5 from ${reviewsMeta.count} review(s)`
              : 'No reviews yet for this hotel.'}
          </p>
          {reviewsLoading ? (
            <p className={styles.meta}>Loading reviews…</p>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map((r) => (
                <div key={r.id} className={styles.reviewItem}>
                  <p><strong>{'★'.repeat(r.rating)}</strong> by {r.userName}</p>
                  {r.comment && <p>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
            <label>
              Rating
              <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                <option value={5}>5 stars</option>
                <option value={4}>4 stars</option>
                <option value={3}>3 stars</option>
                <option value={2}>2 stars</option>
                <option value={1}>1 star</option>
              </select>
            </label>
            <label>
              Feedback
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience"
                rows={3}
              />
            </label>
            <button type="submit" className={styles.secondary} disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
          </form>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => setStep('list')}>Back</button>
          <button type="button" className={styles.primary} onClick={handlePay} disabled={paying}>
            {paying ? 'Processing…' : `Pay ₹${total}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Book a hotel</h1>
      <p className={styles.lead}>Choose a hotel and number of nights.</p>
      <div className={styles.grid}>
        {hotels.map((h) => (
          <div key={h.id} className={h.available === false ? styles.unavailableCard : styles.card}>
            {h.available === false && (
              <p className={styles.unavailableTag}>
                Unavailable{h.unavailableReason ? `: ${h.unavailableReason}` : ''}
              </p>
            )}
            {h.image && <img className={styles.hotelImage} src={h.image} alt={h.name} />}
            <h3>{h.name}</h3>
            <p className={styles.meta}>{h.city} · {'★'.repeat(h.stars)}</p>
            <p className={styles.amenities}>{h.amenities?.join(' · ')}</p>
            <p className={styles.price}>₹{(Number(h.pricePerNight) * Number(pricingSettings.hotelBaseMultiplier || 1)).toFixed(2)} <span>/ night</span></p>
            <div className={styles.tickets}>
              <label>Nights:</label>
              <input
                type="number"
                min={1}
                max={14}
                value={getNights(h.id)}
                onChange={(e) => {
                  const raw = Number(e.target.value) || 1;
                  const clamped = Math.min(14, Math.max(1, raw));
                  setNightsByHotelId((prev) => ({ ...prev, [h.id]: clamped }));
                }}
              />
            </div>
            <div className={styles.dateBlock}>
              <div className={styles.dateBlockLabel}>
                <span aria-hidden>📅</span> Check-in date
              </div>
              <input
                className={styles.dateInput}
                type="date"
                min={todayISO()}
                value={getCheckIn(h.id)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCheckInByHotelId((prev) => ({ ...prev, [h.id]: v }));
                  setDateErrorByHotelId((prev) => {
                    const next = { ...prev };
                    delete next[h.id];
                    return next;
                  });
                }}
              />
              <p className={styles.dateHint}>
                Check-out · <strong>{formatPrettyDate(addDaysISO(getCheckIn(h.id), getNights(h.id)))}</strong>
                <span> · {getNights(h.id)} night(s)</span>
              </p>
              {dateErrorByHotelId[h.id] && <p className={styles.dateError}>{dateErrorByHotelId[h.id]}</p>}
            </div>
            <button
              type="button"
              className={styles.primary}
              disabled={h.available === false}
              onClick={() => {
                const ci = getCheckIn(h.id);
                if (!ci || ci < todayISO()) {
                  setDateErrorByHotelId((prev) => ({
                    ...prev,
                    [h.id]: !ci ? 'Choose a check-in date' : 'Check-in cannot be in the past',
                  }));
                  return;
                }
                setDateErrorByHotelId((prev) => {
                  const next = { ...prev };
                  delete next[h.id];
                  return next;
                });
                setSelected(h);
                setStep('confirm');
                loadReviews(h.id);
              }}
            >
              {h.available === false
                ? 'Not available'
                : `Book for ₹${(Number(h.pricePerNight) * Number(pricingSettings.hotelBaseMultiplier || 1) * getNights(h.id)).toFixed(2)}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
