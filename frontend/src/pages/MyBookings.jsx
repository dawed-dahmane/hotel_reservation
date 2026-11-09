import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reservationsAPI } from '../services/api';
import {
  CalendarCheck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Hotel,
  ArrowRight,
  Calendar,
  Users,
} from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await reservationsAPI.getAll();
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    setCancellingId(id);
    setActionMessage('');
    try {
      await reservationsAPI.cancel(id);
      setActionMessage('Reservation cancelled successfully.');
      // Refresh list
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      setActionMessage('Failed to cancel reservation. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'all') return true;
    return b.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="status-badge confirmed">Confirmed</span>;
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="bookings-page-container">
      <div className="bookings-header">
        <div>
          <h1>My Reservations & Journeys</h1>
          <p>Review and manage all your upcoming and past luxury stays.</p>
        </div>
        <Link to="/hotels" className="btn-primary">
          Book Another Stay
        </Link>
      </div>

      {actionMessage && (
        <div className="alert-box info">
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bookings-filter-tabs">
        {['all', 'confirmed', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`filter-tab-btn ${filterStatus === tab ? 'active' : ''}`}
            onClick={() => setFilterStatus(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="tab-count">
              {tab === 'all'
                ? bookings.length
                : bookings.filter((b) => b.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Retrieving your bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="empty-bookings-box">
          <CalendarCheck size={52} className="empty-icon" />
          <h3>No reservations found</h3>
          <p>You don't have any reservations under the selected status filter.</p>
          <Link to="/hotels" className="btn-primary">
            Explore Hotels & Suites
          </Link>
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map((b) => (
            <div key={b.id} className="booking-card">
              <div className="booking-card-header">
                <div>
                  <span className="booking-ref">Booking #{b.id}</span>
                  <h3 className="booking-hotel-name">
                    {b.hotel_name || b.room_details?.hotel_name}
                  </h3>
                </div>
                {getStatusBadge(b.status)}
              </div>

              <div className="booking-card-body">
                <div className="booking-room-info">
                  <strong>
                    {b.room_details?.room_type_display} (Suite #{b.room_details?.room_number})
                  </strong>
                </div>

                <div className="booking-dates-row">
                  <div className="date-block">
                    <span className="date-label">Check-In</span>
                    <span className="date-val">{b.check_in}</span>
                  </div>
                  <div className="date-arrow">→</div>
                  <div className="date-block">
                    <span className="date-label">Check-Out</span>
                    <span className="date-val">{b.check_out}</span>
                  </div>
                </div>

                <div className="booking-details-list">
                  <div className="detail-item">
                    <Users size={16} />
                    <span>{b.guests_count} Guest(s)</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span>{b.nights} Night(s)</span>
                  </div>
                  <div className="detail-item price">
                    <span>Total:</span>
                    <strong>${b.total_price}</strong>
                  </div>
                </div>

                {b.special_requests && (
                  <div className="booking-notes">
                    <strong>Special Requests:</strong> {b.special_requests}
                  </div>
                )}
              </div>

              <div className="booking-card-footer">
                <span className="booking-booked-date">
                  Booked on {b.created_at?.slice(0, 10)}
                </span>

                {b.status === 'confirmed' && (
                  <button
                    type="button"
                    disabled={cancellingId === b.id}
                    className="btn-cancel-booking"
                    onClick={() => handleCancelBooking(b.id)}
                  >
                    {cancellingId === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;

