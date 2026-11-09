import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { roomsAPI, reservationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bed,
  Users,
  Maximize2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking states
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    const today = new Date();
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    const dayAfter = new Date(tmrw);
    dayAfter.setDate(tmrw.getDate() + 3);

    setCheckIn(tmrw.toISOString().split('T')[0]);
    setCheckOut(dayAfter.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await roomsAPI.getById(id);
        setRoom(res.data);
      } catch (err) {
        console.error('Failed to load room:', err);
        setError('Room not found or error loading details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  const calculateTotal = () => {
    if (!checkIn || !checkOut || !room) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    return (diffDays * parseFloat(room.price_per_night)).toFixed(2);
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/rooms/${id}` } } });
      return;
    }

    setBookingError('');
    setBookingLoading(true);

    try {
      const res = await reservationsAPI.create({
        room: room.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Number(guestsCount),
        special_requests: specialRequests,
      });
      setBookingSuccess(res.data);
    } catch (err) {
      console.error('Booking error:', err);
      const data = err.response?.data;
      if (data?.room) {
        setBookingError(data.room[0] || data.room);
      } else {
        setBookingError('Booking could not be finalized. Please verify dates.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="error-center-box">
        <AlertCircle size={48} className="text-danger" />
        <h2>Suite Not Found</h2>
        <Link to="/hotels" className="btn-primary">
          Back to Hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="room-detail-page">
      <div className="room-detail-container">
        <div className="back-nav-bar">
          <Link to={`/hotels/${room.hotel}`} className="btn-back">
            <ArrowLeft size={16} /> Back to {room.hotel_name}
          </Link>
        </div>

        <div className="room-layout-grid">
          {/* Left Column: Media & Info */}
          <div className="room-left-col">
            <div className="room-banner-box">
              <img
                src={
                  room.image_url ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80'
                }
                alt={room.room_type_display}
                className="room-banner-img"
              />
              <span className="room-number-badge">Suite #{room.room_number}</span>
            </div>

            <div className="room-info-card">
              <span className="room-hotel-tag">{room.hotel_name}</span>
              <h1>{room.room_type_display}</h1>

              <div className="room-specs-strip">
                <div className="spec-item">
                  <Users size={18} />
                  <span>Up to {room.capacity} Guests</span>
                </div>
                <div className="spec-item">
                  <Bed size={18} />
                  <span>{room.bed_type}</span>
                </div>
                <div className="spec-item">
                  <Maximize2 size={18} />
                  <span>{room.size_sqm} m² Area</span>
                </div>
              </div>

              <div className="room-section-block">
                <h3>About This Suite</h3>
                <p>{room.description}</p>
              </div>

              <div className="room-section-block">
                <h3>Suite Amenities</h3>
                <div className="amenities-grid-display">
                  {room.amenities?.map((item, idx) => (
                    <div key={idx} className="amenity-item-card">
                      <Sparkles size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="room-right-col">
            <div className="booking-widget-card">
              <div className="widget-price-header">
                <div className="price-lead-amount">
                  ${room.price_per_night}
                  <small> / night</small>
                </div>
                <span className="avail-pill">
                  {room.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {bookingSuccess ? (
                <div className="booking-confirmed-card">
                  <CheckCircle2 size={48} className="success-icon" />
                  <h3>Booking Confirmed!</h3>
                  <p>Booking #{bookingSuccess.id} is confirmed.</p>
                  <Link to="/my-bookings" className="btn-primary full-width">
                    View in My Bookings
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="widget-booking-form">
                  {bookingError && (
                    <div className="alert-box error">
                      <AlertCircle size={16} />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Check-In</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Check-Out</label>
                    <input
                      type="date"
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Guests</label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(e.target.value)}
                      className="form-select"
                    >
                      {[...Array(room.capacity)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i + 1 === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="price-calc-box">
                    <div className="calc-row">
                      <span>
                        ${room.price_per_night} x {calculateNights()} night(s)
                      </span>
                      <span>${calculateTotal()}</span>
                    </div>
                    <div className="calc-row total">
                      <span>Total Amount</span>
                      <span>${calculateTotal()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading || !room.is_available}
                    className="btn-primary full-width"
                  >
                    {bookingLoading ? (
                      'Processing...'
                    ) : (
                      <>
                        <CreditCard size={18} /> Book This Suite
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;

