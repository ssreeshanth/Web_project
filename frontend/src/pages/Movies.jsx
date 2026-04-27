import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import styles from './Booking.module.css';

export default function Movies() {
  const { token } = useAuth();
  const [movies, setMovies] = useState([]);
  const [pricingSettings, setPricingSettings] = useState({ movieBaseMultiplier: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showtime, setShowtime] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [step, setStep] = useState('list');
  const [paying, setPaying] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const seatRows = [
    { row: 'A', count: 14, zone: 'front' },
    { row: 'B', count: 14, zone: 'front' },
    { row: 'C', count: 14, zone: 'front' },
    { row: 'D', count: 11, zone: 'middle' },
    { row: 'E', count: 13, zone: 'middle' },
    { row: 'F', count: 13, zone: 'middle' },
    { row: 'G', count: 13, zone: 'last' },
    { row: 'H', count: 13, zone: 'last' },
    { row: 'I', count: 17, zone: 'last' },
  ];

  useEffect(() => {
    Promise.all([apiGet('/api/movies'), apiGet('/api/settings/pricing').catch(() => null)])
      .then(([data, pricingData]) => {
        setMovies(data);
        if (pricingData) {
          setPricingSettings({ movieBaseMultiplier: Number(pricingData.movieBaseMultiplier || 1) });
        }
        const fallbackDates = Array.from({ length: 3 }, (_, idx) => {
          const d = new Date();
          d.setDate(d.getDate() + idx);
          return d.toISOString().slice(0, 10);
        });
        const allDates = [...new Set(data.flatMap((m) => m.availableDates || fallbackDates))].sort();
        setSelectedDate(allDates[0] || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const getSeatZone = (seatId) => {
    const row = seatId.charAt(0);
    if (['A', 'B', 'C'].includes(row)) return 'front';
    if (['D', 'E', 'F'].includes(row)) return 'middle';
    return 'last';
  };

  const seatPriceFor = (seatId) => {
    if (!selectedMovie) return 0;
    const adjustedBase = Number(selectedMovie.price || 0) * Number(pricingSettings.movieBaseMultiplier || 1);
    const zone = getSeatZone(seatId);
    if (zone === 'front') return Math.max(1, adjustedBase - 2);
    if (zone === 'last') return adjustedBase + 3;
    return adjustedBase;
  };

  const total = selectedSeats.reduce((sum, seat) => sum + seatPriceFor(seat), 0);

  const handleBook = () => {
    if (!selectedMovie || selectedMovie.available === false || !showtime || selectedSeats.length === 0) return;
    setStep('confirm');
  };

  const toggleSeat = (seat) => {
    setSelectedSeats((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]));
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await apiPost(
        '/api/bookings',
        {
          type: 'movie',
          details: {
            movie: selectedMovie.title,
            genre: selectedMovie.genre,
            date: selectedDate,
            showtime,
            seats: selectedSeats,
            tickets: selectedSeats.length,
            seatPrices: selectedSeats.map((seat) => ({ seat, price: seatPriceFor(seat), zone: getSeatZone(seat) })),
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

  if (loading) return <div className={styles.loading}>Loading movies…</div>;

  if (step === 'done' && bookingId) {
    window.location.href = `/receipt/${bookingId}`;
    return <div className={styles.loading}>Redirecting to receipt…</div>;
  }

  if (step === 'confirm') {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>Confirm & Pay</h1>
        <div className={styles.summary}>
          {selectedMovie.image && (
            <img
              className={styles.moviePoster}
              src={selectedMovie.image}
              alt={`${selectedMovie.title} poster`}
              style={{ maxHeight: 220 }}
            />
          )}
          <h2>{selectedMovie.title}</h2>
          <p>{selectedMovie.genre} · {selectedDate} · {showtime}</p>
          <p>Seats: {selectedSeats.join(', ')}</p>
          <p>Front seats: ₹{Math.max(1, (selectedMovie.price * pricingSettings.movieBaseMultiplier) - 2)} | Middle: ₹{(selectedMovie.price * pricingSettings.movieBaseMultiplier).toFixed(2)} | Last: ₹{((selectedMovie.price * pricingSettings.movieBaseMultiplier) + 3).toFixed(2)}</p>
          <p>Total: <strong>₹{total}</strong></p>
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

  const fallbackDates = Array.from({ length: 3 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    return d.toISOString().slice(0, 10);
  });
  const genres = ['All', ...new Set(movies.map((m) => m.genre || 'Other'))];
  const dates = [...new Set(movies.flatMap((m) => m.availableDates || fallbackDates))].sort();
  const genreFilteredMovies = selectedGenre === 'All' ? movies : movies.filter((m) => m.genre === selectedGenre);
  const dateFilteredMovies = genreFilteredMovies.filter((m) => (m.availableDates || fallbackDates).includes(selectedDate));
  const showtimes = selectedMovie && selectedDate
    ? (selectedMovie.showtimesByDate?.[selectedDate] || selectedMovie.showtimes || ['10:00 AM', '2:00 PM', '6:00 PM'])
    : [];

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Book a movie</h1>
      <p className={styles.lead}>Select genre, then date, then movie, timing and seats.</p>

      <div className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Genres</h2>
        <div className={styles.tabs}>
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              className={selectedGenre === genre ? styles.tabActive : styles.tab}
              onClick={() => {
                setSelectedGenre(genre);
                setSelectedMovie(null);
                setShowtime('');
                setSelectedSeats([]);
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Select Date</h2>
        <div className={styles.showtimes}>
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              className={selectedDate === date ? styles.selectedSlot : styles.slot}
              onClick={() => {
                setSelectedDate(date);
                setSelectedMovie(null);
                setShowtime('');
                setSelectedSeats([]);
              }}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {dateFilteredMovies.map((m) => (
          <div key={m.id} className={m.available === false ? styles.unavailableCard : styles.card}>
            {m.available === false && (
              <p className={styles.unavailableTag}>
                Unavailable{m.unavailableReason ? `: ${m.unavailableReason}` : ''}
              </p>
            )}
            {m.image && (
              <img
                className={styles.moviePoster}
                src={m.image}
                alt={`${m.title} poster`}
                loading="lazy"
                decoding="async"
              />
            )}
            <h3>{m.title}</h3>
            <p className={styles.meta}>{m.genre} · {m.duration} · {m.rating}</p>
            <p className={styles.price}>₹{(Number(m.price) * Number(pricingSettings.movieBaseMultiplier || 1)).toFixed(2)} <span>ticket</span></p>
            <button
              type="button"
              className={styles.primary}
              disabled={m.available === false}
              onClick={() => {
                setSelectedMovie(m);
                setShowtime('');
                setSelectedSeats([]);
              }}
            >
              {m.available === false ? 'Not available' : (selectedMovie?.id === m.id ? 'Selected' : 'Select movie')}
            </button>
          </div>
        ))}
      </div>

      {selectedMovie && (
        <div className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>Show timings for {selectedMovie.title}</h2>
          <div className={styles.showtimes}>
            {showtimes.map((t) => (
              <button
                key={t}
                type="button"
                className={showtime === t ? styles.selectedSlot : styles.slot}
                onClick={() => {
                  setShowtime(t);
                  setSelectedSeats([]);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMovie && showtime && (
        <div className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>Select seats</h2>
          <p className={styles.meta}>Front: ₹{Math.max(1, (selectedMovie.price * pricingSettings.movieBaseMultiplier) - 2)} | Middle: ₹{(selectedMovie.price * pricingSettings.movieBaseMultiplier).toFixed(2)} | Last: ₹{((selectedMovie.price * pricingSettings.movieBaseMultiplier) + 3).toFixed(2)}</p>
          <div className={styles.screen}>Screen</div>
          <div className={styles.cinemaSeats}>
            {seatRows.map((row) => (
              <div key={row.row} className={styles.cinemaRow}>
                <span className={styles.rowLabel}>{row.row}</span>
                <div className={styles.rowSeats}>
                  {Array.from({ length: row.count }, (_, i) => {
                    const seat = `${row.row}${i + 1}`;
                    const isSelected = selectedSeats.includes(seat);
                    return (
                      <button
                        key={seat}
                        type="button"
                        className={isSelected ? styles.seatSelected : styles.seat}
                        onClick={() => toggleSeat(seat)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className={styles.meta}>Selected: {selectedSeats.length ? selectedSeats.join(', ') : 'None'}</p>
          <button type="button" className={styles.primary} onClick={handleBook} disabled={selectedSeats.length === 0}>
            Book for ₹{total}
          </button>
        </div>
      )}

      {dateFilteredMovies.length === 0 && (
        <div className={styles.summary}>
          <p>No movies found for selected genre/date.</p>
        </div>
      )}
    </div>
  );
}
