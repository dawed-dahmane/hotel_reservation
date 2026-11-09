import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hotelsAPI, reservationsAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  Star,
  Users,
  Maximize2,
  Bed,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  MessageSquare,
  Send,
  Hotel as HotelIcon,
} from 'lucide-react';

export const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Modal State
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Review state
  const [reviews, setReviews] = useState([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  // Set default dates: tomorrow and +3 days
  useEffect(() => {
    const today = new Date();
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    const dayAfter = new Date(tmrw);
    dayAfter.setDate(tmrw.getDate() + 3);

    setCheckIn(tmrw.toISOString().split('T')[0]);
    setCheckOut(dayAfter.toISOString().split('T')[0]);
  }, []);

  const fetchHotelData = async () => {
    try {
      const res = await hotelsAPI.getById(id);
      setHotel(res.data);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Error fetching hotel details:', err);
      setError('Could not find hotel property or network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, [id]);

  // Calculate live total price
  const calculateTotal = () => {
    if (!checkIn || !checkOut || !selectedRoom) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    return (diffDays * parseFloat(selectedRoom.price_per_night)).toFixed(2);
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const openBookingModal = (room) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/hotels/${id}` } } });
      return;
    }
    setSelectedRoom(room);
    setGuestsCount(Math.min(room.capacity, 2));
    setBookingError('');
    setBookingSuccess(null);
    setModalOpen(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);

    try {
      const payload = {
        room: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Number(guestsCount),
        special_requests: specialRequests,
      };

      const res = await reservationsAPI.create(payload);
      setBookingSuccess(res.data);
    } catch (err) {
      console.error('Booking creation error:', err);
      const data = err.response?.data;
      if (data?.room) {
        setBookingError(data.room[0] || data.room);
      } else if (data?.check_out) {
        setBookingError(data.check_out[0] || data.check_out);
      } else if (data?.guests_count) {
        setBookingError(data.guests_count[0] || data.guests_count);
      } else if (data?.detail) {
        setBookingError(data.detail);
      } else {
        setBookingError('Unable to complete reservation. Please review inputs.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setReviewSubmitting(true);
    setReviewMsg('');
    try {
      const res = await reviewsAPI.create({
        hotel: hotel.id,
        rating: ratingInput,
        comment: commentInput,
      });
      setReviews([res.data, ...reviews]);
      setCommentInput('');
      setReviewMsg('Your review has been successfully posted. Thank you!');
    } catch (err) {
      console.error('Review submission error:', err);
      setReviewMsg('Could not submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading-center">
        <div className="spinner"></div>
        <p>Loading luxury hotel details...</p>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="error-center-box">
        <AlertCircle size={48} className="text-danger" />
        <h2>Property Not Found</h2>
        <p>{error || 'The requested hotel property does not exist.'}</p>
        <Link to="/hotels" className="btn-primary">
          Back to Hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="hotel-detail-page">
      {/* Hotel Hero Showcase */}
      <div className="hotel-hero-header">
        <div className="hotel-hero-bg">
          <img
            src={
              hotel.image_url ||
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80'
            }
            alt={hotel.name}
            className="hotel-hero-img"
          />
          <div className="hotel-hero-overlay"></div>
        </div>

        <div className="hotel-hero-info">
          <div className="hotel-tags-row">
            <div className="stars-badge">
              {[...Array(hotel.star_rating)].map((_, i) => (
                <Star key={i} size={16} className="star-icon fill" />
              ))}
              <span>{hotel.star_rating}-Star Luxury</span>
            </div>
            {hotel.is_featured && (
              <span className="featured-badge">
                <Sparkles size={14} /> Premier Collection
              </span>
            )}
          </div>

          <h1 className="hotel-title">{hotel.name}</h1>

          <div className="hotel-location-row">
            <MapPin size={18} />
            <span>
              {hotel.address}, {hotel.city}, {hotel.country}
            </span>
          </div>
        </div>
      </div>

      <div className="hotel-detail-body">
        {/* About Section & Amenities */}
        <div className="hotel-main-content">
          <section className="detail-section">
            <h2 className="section-title">About This Sanctuary</h2>
            <p className="detail-description">{hotel.description}</p>
          </section>

          <section className="detail-section">
            <h2 className="section-title">Hotel Amenities & Services</h2>
            <div className="amenities-grid-display">
              {hotel.amenities?.map((amenity, idx) => (
                <div key={idx} className="amenity-item-card">
                  <Check size={18} className="amenity-check-icon" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Rooms & Suites Section */}
          <section className="detail-section rooms-section">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">Available Suites & Rooms</h2>
                <p className="section-subtitle">
                  Select your preferred accommodation to reserve your stay.
                </p>
              </div>
            </div>

            <div className="rooms-list-grid">
              {hotel.rooms?.map((room) => (
                <div key={room.id} className="room-card-horizontal">
                  <div className="room-image-box">
                    <img
                      src={
                        room.image_url ||
                        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={`Room ${room.room_number}`}
                      className="room-img"
                    />
                    <span className="room-number-tag">Suite #{room.room_number}</span>
                  </div>

                  <div className="room-details-box">
                    <div className="room-header-row">
                      <h3 className="room-type-title">{room.room_type_display}</h3>
                      <div className="room-price-tag">
                        <span className="price-currency">${room.price_per_night}</span>
                        <span className="price-period"> / night</span>
                      </div>
                    </div>

                    <div className="room-specs-row">
                      <div className="spec-pill">
                        <Users size={16} />
                        <span>Up to {room.capacity} Guests</span>
                      </div>
                      <div className="spec-pill">
                        <Bed size={16} />
                        <span>{room.bed_type}</span>
                      </div>
                      <div className="spec-pill">
                        <Maximize2 size={16} />
                        <span>{room.size_sqm} m²</span>
                      </div>
                    </div>

                    <p className="room-description">{room.description}</p>

                    <div className="room-amenities-tags">
                      {room.amenities?.map((am, i) => (
                        <span key={i} className="room-amenity-pill">
                          {am}
                        </span>
                      ))}
                    </div>

                    <div className="room-action-row">
                      {room.is_available ? (
                        <button
                          type="button"
                          className="btn-book-room"
                          onClick={() => openBookingModal(room)}
                        >
                          Book This Room
                        </button>
                      ) : (
                        <span className="badge-room-unavailable">
                          Currently Occupied / Maintenance
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Guest Reviews Section */}
          <section className="detail-section reviews-section">
            <div className="section-header-row">
              <h2 className="section-title">
                Guest Reviews ({reviews.length})
              </h2>
            </div>

            {/* Post Review Form for Logged in Users */}
            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} className="add-review-form">
                <h4>Share Your Experience</h4>
                {reviewMsg && <div className="alert-box info">{reviewMsg}</div>}
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <div className="rating-select-row">
                    {[5, 4, 3, 2, 1].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setRatingInput(num)}
                        className={`star-select-btn ${ratingInput === num ? 'active' : ''}`}
                      >
                        <Star size={16} className="fill" /> {num} Stars
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Comment</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your stay, the hospitality, the amenities..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="form-textarea"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="btn-primary"
                >
                  <Send size={16} />
                  <span>{reviewSubmitting ? 'Posting...' : 'Submit Review'}</span>
                </button>
              </form>
            ) : (
              <div className="review-login-prompt">
                <p>
                  Have you stayed here?{' '}
                  <Link to="/login" className="auth-link">
                    Sign in to leave a verified review.
                  </Link>
                </p>
              </div>
            )}

            {/* Reviews List */}
            <div className="reviews-list">
              {reviews.length === 0 ? (
                <p className="no-reviews-text">
                  No reviews yet for this hotel. Be the first to share your experience!
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="review-item">
                    <div className="review-header">
                      <div className="review-user-name">
                        <strong>{rev.user_name || 'Guest'}</strong>
                      </div>
                      <div className="review-stars">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} size={14} className="star-icon fill" />
                        ))}
                      </div>
                    </div>
                    <p className="review-body">{rev.comment}</p>
                    <span className="review-date">
                      {rev.created_at?.slice(0, 10)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <HotelIcon size={20} className="modal-icon" />
                <h3>Reserve Suite #{selectedRoom?.room_number}</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="modal-success-box">
                <CheckCircle2 size={54} className="success-icon" />
                <h3>Reservation Confirmed!</h3>
                <p>
                  Your booking #{bookingSuccess.id} for{' '}
                  <strong>{selectedRoom?.room_type_display}</strong> at{' '}
                  <strong>{hotel.name}</strong> is successfully secured.
                </p>
                <div className="booking-summary-pill">
                  <span>
                    Check-in: <strong>{bookingSuccess.check_in}</strong>
                  </span>
                  <span>
                    Check-out: <strong>{bookingSuccess.check_out}</strong>
                  </span>
                  <span>
                    Total: <strong>${bookingSuccess.total_price}</strong>
                  </span>
                </div>
                <div className="modal-actions-group">
                  <Link to="/my-bookings" className="btn-primary">
                    View My Bookings
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="modal-form">
                {bookingError && (
                  <div className="alert-box error">
                    <AlertCircle size={18} />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="modal-room-summary">
                  <div>
                    <strong>{selectedRoom?.room_type_display}</strong>
                    <div className="modal-room-sub">
                      Max {selectedRoom?.capacity} guests • {selectedRoom?.bed_type}
                    </div>
                  </div>
                  <div className="modal-room-rate">
                    ${selectedRoom?.price_per_night} / night
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Check-in Date</label>
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
                    <label className="form-label">Check-out Date</label>
                    <input
                      type="date"
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Guests</label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    className="form-select"
                  >
                    {[...Array(selectedRoom?.capacity || 1)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} {i + 1 === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Special Requests (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="E.g., high floor, airport pick-up, late check-in..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="form-textarea"
                  />
                </div>

                {/* Live Cost Breakdown */}
                <div className="booking-price-summary">
                  <div className="price-line">
                    <span>
                      ${selectedRoom?.price_per_night} x {calculateNights()} night(s)
                    </span>
                    <span>${calculateTotal()}</span>
                  </div>
                  <div className="price-line taxes">
                    <span>Taxes & Luxury Resort Fees</span>
                    <span>Complimentary ($0.00)</span>
                  </div>
                  <div className="price-line-total">
                    <span>Grand Total</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>

                <div className="modal-footer-buttons">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading || calculateNights() <= 0}
                    className="btn-primary"
                  >
                    {bookingLoading ? (
                      'Securing Reservation...'
                    ) : (
                      <>
                        <CreditCard size={18} /> Confirm & Book Stay
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetail;

