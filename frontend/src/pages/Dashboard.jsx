import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  dashboardAPI,
  hotelsAPI,
  roomsAPI,
  reservationsAPI,
} from '../services/api';
import {
  LayoutDashboard,
  Hotel,
  Bed,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Search,
  Filter,
  Users,
  Building,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  // Dashboard Stats State
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Tab for Admin (bookings, hotels, rooms)
  const [activeTab, setActiveTab] = useState('bookings');

  // Data lists
  const [bookingsList, setBookingsList] = useState([]);
  const [hotelsList, setHotelsList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);

  // Search & Filter
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelFormData, setHotelFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    star_rating: 5,
    image_url: '',
    amenities: 'Free WiFi, Pool, Spa, Parking, Restaurant',
    is_featured: false,
  });

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    hotel: '',
    room_number: '',
    room_type: 'double',
    price_per_night: 200,
    capacity: 2,
    bed_type: 'King Size Bed',
    size_sqm: 40,
    description: '',
    image_url: '',
    amenities: 'Smart TV, Mini Bar, Air Conditioning, WiFi',
    is_available: true,
  });

  // Action status message
  const [alertMessage, setAlertMessage] = useState({ type: '', text: '' });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statsRes = await dashboardAPI.getStats();
      setStatsData(statsRes.data);

      if (isAdmin) {
        const [bookingsRes, hotelsRes, roomsRes] = await Promise.all([
          reservationsAPI.getAll(),
          hotelsAPI.getAll(),
          roomsAPI.getAll(),
        ]);
        setBookingsList(bookingsRes.data);
        setHotelsList(hotelsRes.data);
        setRoomsList(roomsRes.data);
      } else {
        const bookingsRes = await reservationsAPI.getAll();
        setBookingsList(bookingsRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showAlert('error', 'Could not load dashboard data from backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  const showAlert = (type, text) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage({ type: '', text: '' });
    }, 4500);
  };

  // -------------------- BOOKING ACTIONS --------------------
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      await reservationsAPI.update(bookingId, { status: newStatus });
      showAlert('success', `Booking #${bookingId} updated to ${newStatus}.`);
      setBookingsList((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      showAlert('error', 'Failed to update reservation status.');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm(`Permanently delete booking #${bookingId}?`)) return;
    try {
      await reservationsAPI.delete(bookingId, true);
      showAlert('success', `Booking #${bookingId} deleted.`);
      setBookingsList((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err) {
      console.error('Failed to delete booking:', err);
      showAlert('error', 'Could not delete booking.');
    }
  };

  // -------------------- HOTEL CRUD --------------------
  const openCreateHotelModal = () => {
    setEditingHotel(null);
    setHotelFormData({
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      star_rating: 5,
      image_url: '',
      amenities: 'Free WiFi, Pool, Spa, Parking, Restaurant',
      is_featured: false,
    });
    setHotelModalOpen(true);
  };

  const openEditHotelModal = (hotel) => {
    setEditingHotel(hotel);
    setHotelFormData({
      name: hotel.name,
      description: hotel.description,
      address: hotel.address,
      city: hotel.city,
      country: hotel.country,
      star_rating: hotel.star_rating,
      image_url: hotel.image_url || '',
      amenities: Array.isArray(hotel.amenities)
        ? hotel.amenities.join(', ')
        : hotel.amenities || '',
      is_featured: !!hotel.is_featured,
    });
    setHotelModalOpen(true);
  };

  const handleSaveHotel = async (e) => {
    e.preventDefault();
    try {
      const amenitiesArr = hotelFormData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        ...hotelFormData,
        star_rating: Number(hotelFormData.star_rating),
        amenities: amenitiesArr,
      };

      if (editingHotel) {
        const res = await hotelsAPI.update(editingHotel.id, payload);
        showAlert('success', `Hotel "${res.data.name}" updated successfully.`);
      } else {
        const res = await hotelsAPI.create(payload);
        showAlert('success', `Hotel "${res.data.name}" created successfully.`);
      }

      setHotelModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Save hotel error:', err);
      showAlert('error', 'Failed to save hotel. Check all required fields.');
    }
  };

  const handleDeleteHotel = async (hotelId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? All associated rooms and reservations will also be deleted.`)) {
      return;
    }
    try {
      await hotelsAPI.delete(hotelId);
      showAlert('success', `Hotel "${name}" was deleted.`);
      setHotelsList((prev) => prev.filter((h) => h.id !== hotelId));
    } catch (err) {
      console.error('Delete hotel error:', err);
      showAlert('error', 'Failed to delete hotel.');
    }
  };

  // -------------------- ROOM CRUD --------------------
  const openCreateRoomModal = () => {
    setEditingRoom(null);
    setRoomFormData({
      hotel: hotelsList[0]?.id || '',
      room_number: '',
      room_type: 'double',
      price_per_night: 200,
      capacity: 2,
      bed_type: 'King Size Bed',
      size_sqm: 40,
      description: '',
      image_url: '',
      amenities: 'Smart TV, Mini Bar, Air Conditioning, WiFi',
      is_available: true,
    });
    setRoomModalOpen(true);
  };

  const openEditRoomModal = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      hotel: room.hotel,
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      bed_type: room.bed_type,
      size_sqm: room.size_sqm,
      description: room.description || '',
      image_url: room.image_url || '',
      amenities: Array.isArray(room.amenities)
        ? room.amenities.join(', ')
        : room.amenities || '',
      is_available: room.is_available,
    });
    setRoomModalOpen(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      const amenitiesArr = roomFormData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        ...roomFormData,
        hotel: Number(roomFormData.hotel),
        price_per_night: parseFloat(roomFormData.price_per_night),
        capacity: Number(roomFormData.capacity),
        size_sqm: Number(roomFormData.size_sqm),
        amenities: amenitiesArr,
      };

      if (editingRoom) {
        await roomsAPI.update(editingRoom.id, payload);
        showAlert('success', `Suite #${payload.room_number} updated.`);
      } else {
        await roomsAPI.create(payload);
        showAlert('success', `Suite #${payload.room_number} added successfully.`);
      }

      setRoomModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Save room error:', err);
      showAlert('error', 'Failed to save room. Room number may already exist for this hotel.');
    }
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Delete Room #${roomNumber}?`)) return;
    try {
      await roomsAPI.delete(roomId);
      showAlert('success', `Room #${roomNumber} was deleted.`);
      setRoomsList((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      console.error('Delete room error:', err);
      showAlert('error', 'Could not delete room.');
    }
  };

  const handleToggleRoomAvailability = async (room) => {
    try {
      const updated = !room.is_available;
      await roomsAPI.patch(room.id, { is_available: updated });
      setRoomsList((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_available: updated } : r))
      );
      showAlert('success', `Room #${room.room_number} availability set to ${updated ? 'Available' : 'Unavailable'}.`);
    } catch (err) {
      console.error('Toggle availability error:', err);
      showAlert('error', 'Failed to toggle availability.');
    }
  };

  if (loading) {
    return (
      <div className="page-loading-center">
        <div className="spinner"></div>
        <p>Loading your executive dashboard...</p>
      </div>
    );
  }

  const filteredBookings = bookingsList.filter((b) => {
    if (bookingFilterStatus !== 'all' && b.status !== bookingFilterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const userMatch = b.user_details?.username?.toLowerCase().includes(term);
      const guestNameMatch = b.guest_name?.toLowerCase().includes(term);
      const hotelMatch = (b.hotel_name || b.room_details?.hotel_name)?.toLowerCase().includes(term);
      return userMatch || guestNameMatch || hotelMatch;
    }
    return true;
  });

  return (
    <div className="dashboard-page-container">
      {/* Top Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-left">
          <div className="welcome-avatar">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <div className="welcome-badge-row">
              <h2>Welcome, {user?.first_name || user?.username}</h2>
              {isAdmin ? (
                <span className="role-tag admin">
                  <ShieldCheck size={14} /> System Administrator
                </span>
              ) : (
                <span className="role-tag guest">Valued Guest</span>
              )}
            </div>
            <p className="welcome-desc">
              {isAdmin
                ? 'Overview of hotel properties, suites inventory, guest reservations, and revenue analytics.'
                : 'Manage your active reservations, explore exclusive destinations, and plan your luxury getaways.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="welcome-actions">
            <button
              type="button"
              className="btn-create-item"
              onClick={openCreateHotelModal}
            >
              <Plus size={16} /> Add Hotel
            </button>
            <button
              type="button"
              className="btn-create-item secondary"
              onClick={openCreateRoomModal}
            >
              <Plus size={16} /> Add Room
            </button>
          </div>
        )}
      </div>

      {alertMessage.text && (
        <div className={`alert-box ${alertMessage.type}`}>
          {alertMessage.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* KPI Stats Cards Grid */}
      <div className="kpi-grid">
        {isAdmin ? (
          <>
            <div className="kpi-card revenue">
              <div className="kpi-icon-box green">
                <DollarSign size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Gross Confirmed Revenue</span>
                <span className="kpi-value">
                  ${statsData?.stats?.total_revenue?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box blue">
                <CalendarCheck size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Reservations</span>
                <span className="kpi-value">
                  {statsData?.stats?.total_reservations || 0}
                </span>
                <small className="kpi-sub">
                  {statsData?.stats?.confirmed_reservations || 0} Confirmed •{' '}
                  {statsData?.stats?.cancelled_reservations || 0} Cancelled
                </small>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box purple">
                <Building size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Hotels</span>
                <span className="kpi-value">
                  {statsData?.stats?.total_hotels || 0}
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box gold">
                <Bed size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Suites & Rooms</span>
                <span className="kpi-value">
                  {statsData?.stats?.total_rooms || 0}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-icon-box blue">
                <CalendarCheck size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Bookings</span>
                <span className="kpi-value">
                  {statsData?.stats?.total_reservations || 0}
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box green">
                <CheckCircle size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Upcoming / Active Stays</span>
                <span className="kpi-value">
                  {statsData?.stats?.active_reservations || 0}
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box gold">
                <DollarSign size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Spent</span>
                <span className="kpi-value">
                  ${statsData?.stats?.total_spent?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Dashboard Workspace */}
      {isAdmin ? (
        <div className="admin-dashboard-container">
          {/* Navigation Tabs */}
          <div className="dashboard-tabs-bar">
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              <CalendarCheck size={18} />
              <span>Bookings Management ({bookingsList.length})</span>
            </button>
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'hotels' ? 'active' : ''}`}
              onClick={() => setActiveTab('hotels')}
            >
              <Building size={18} />
              <span>Hotels Management ({hotelsList.length})</span>
            </button>
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('rooms')}
            >
              <Bed size={18} />
              <span>Rooms Management ({roomsList.length})</span>
            </button>
          </div>

          {/* TAB 1: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="tab-card-wrapper">
              <div className="tab-header-controls">
                <div className="search-bar-sm">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by guest or hotel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="status-filter-pills">
                  {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        className={`btn-pill-filter ${bookingFilterStatus === st ? 'active' : ''}`}
                        onClick={() => setBookingFilterStatus(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Guest Details</th>
                      <th>Hotel & Room</th>
                      <th>Check-in / Out</th>
                      <th>Guests</th>
                      <th>Total</th>
                      <th>Status Action</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-table-cell">
                          No reservations match criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>#{b.id}</strong>
                          </td>
                          <td>
                            <div className="guest-info-cell">
                              <span className="guest-name">
                                {b.guest_name || b.user_details?.username}
                              </span>
                              <span className="guest-email">
                                {b.guest_email || b.user_details?.email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="hotel-room-cell">
                              <strong>
                                {b.hotel_name || b.room_details?.hotel_name}
                              </strong>
                              <span>
                                {b.room_details?.room_type_display} (Suite #{b.room_details?.room_number})
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dates-cell">
                              <span>{b.check_in}</span>
                              <small>to {b.check_out}</small>
                            </div>
                          </td>
                          <td>{b.guests_count} Guests</td>
                          <td>
                            <strong>${b.total_price}</strong>
                          </td>
                          <td>
                            <select
                              value={b.status}
                              onChange={(e) =>
                                handleUpdateBookingStatus(b.id, e.target.value)
                              }
                              className={`status-select ${b.status}`}
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-action-icon delete"
                              title="Delete booking record"
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: HOTELS CRUD */}
          {activeTab === 'hotels' && (
            <div className="tab-card-wrapper">
              <div className="tab-header-row">
                <h3>Hotel Properties Portfolio</h3>
                <button
                  type="button"
                  className="btn-create-item"
                  onClick={openCreateHotelModal}
                >
                  <Plus size={16} /> Create New Hotel
                </button>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Hotel Name</th>
                      <th>Location</th>
                      <th>Stars</th>
                      <th>Rooms</th>
                      <th>Min Price</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotelsList.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <img
                            src={
                              h.image_url ||
                              'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=150&q=80'
                            }
                            alt=""
                            className="table-thumb"
                          />
                        </td>
                        <td>
                          <strong>{h.name}</strong>
                          <div className="table-sub">{h.address}</div>
                        </td>
                        <td>
                          {h.city}, {h.country}
                        </td>
                        <td>★ {h.star_rating}</td>
                        <td>{h.rooms_count || 0}</td>
                        <td>${h.min_price || 0}</td>
                        <td>{h.is_featured ? 'Yes' : 'No'}</td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              type="button"
                              className="btn-action-icon edit"
                              title="Edit hotel"
                              onClick={() => openEditHotelModal(h)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-icon delete"
                              title="Delete hotel"
                              onClick={() => handleDeleteHotel(h.id, h.name)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ROOMS CRUD */}
          {activeTab === 'rooms' && (
            <div className="tab-card-wrapper">
              <div className="tab-header-row">
                <h3>Rooms & Suites Inventory</h3>
                <button
                  type="button"
                  className="btn-create-item"
                  onClick={openCreateRoomModal}
                >
                  <Plus size={16} /> Create New Room
                </button>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Room #</th>
                      <th>Hotel</th>
                      <th>Room Type</th>
                      <th>Price / Night</th>
                      <th>Capacity</th>
                      <th>Bed & Size</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomsList.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>Suite #{r.room_number}</strong>
                        </td>
                        <td>{r.hotel_name}</td>
                        <td>{r.room_type_display}</td>
                        <td>
                          <strong>${r.price_per_night}</strong>
                        </td>
                        <td>{r.capacity} Guests</td>
                        <td>
                          {r.bed_type} ({r.size_sqm} m²)
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`badge-toggle-avail ${r.is_available ? 'available' : 'unavailable'}`}
                            onClick={() => handleToggleRoomAvailability(r)}
                          >
                            {r.is_available ? 'Available' : 'Occupied / Off'}
                          </button>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              type="button"
                              className="btn-action-icon edit"
                              title="Edit room"
                              onClick={() => openEditRoomModal(r)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-icon delete"
                              title="Delete room"
                              onClick={() => handleDeleteRoom(r.id, r.room_number)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* GUEST DASHBOARD CONTENT */
        <div className="guest-dashboard-container">
          <div className="section-header-row">
            <div>
              <h3>Recent Reservations</h3>
              <p className="section-subtext">Review details or cancel upcoming journeys.</p>
            </div>
            <a href="/hotels" className="btn-primary">
              Book A New Stay
            </a>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Hotel Destination</th>
                  <th>Suite</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-table-cell">
                      You haven't made any reservations yet.
                    </td>
                  </tr>
                ) : (
                  bookingsList.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>
                        <strong>{b.hotel_name || b.room_details?.hotel_name}</strong>
                      </td>
                      <td>{b.room_details?.room_type_display}</td>
                      <td>{b.check_in}</td>
                      <td>{b.check_out}</td>
                      <td>${b.total_price}</td>
                      <td>
                        <span className={`status-badge ${b.status}`}>{b.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- HOTEL MODAL (CREATE / EDIT) ----------------- */}
      {hotelModalOpen && (
        <div className="modal-backdrop" onClick={() => setHotelModalOpen(false)}>
          <div className="modal-content lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingHotel ? 'Edit Hotel Details' : 'Add New Hotel'}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setHotelModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHotel} className="modal-form">
              <div className="form-group">
                <label className="form-label">Hotel Name</label>
                <input
                  type="text"
                  required
                  placeholder="The Grand Mirage Palace"
                  value={hotelFormData.name}
                  onChange={(e) =>
                    setHotelFormData({ ...hotelFormData, name: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Paris"
                    value={hotelFormData.city}
                    onChange={(e) =>
                      setHotelFormData({ ...hotelFormData, city: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    required
                    placeholder="France"
                    value={hotelFormData.country}
                    onChange={(e) =>
                      setHotelFormData({ ...hotelFormData, country: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="28 Rue de la Paix"
                  value={hotelFormData.address}
                  onChange={(e) =>
                    setHotelFormData({ ...hotelFormData, address: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Star Rating (1 to 5)</label>
                  <select
                    value={hotelFormData.star_rating}
                    onChange={(e) =>
                      setHotelFormData({
                        ...hotelFormData,
                        star_rating: Number(e.target.value),
                      })
                    }
                    className="form-select"
                  >
                    <option value={5}>5-Star Luxury</option>
                    <option value={4}>4-Star Premium</option>
                    <option value={3}>3-Star Standard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Featured Property?</label>
                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={hotelFormData.is_featured}
                      onChange={(e) =>
                        setHotelFormData({
                          ...hotelFormData,
                          is_featured: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="is_featured">Promote on homepage</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={hotelFormData.image_url}
                  onChange={(e) =>
                    setHotelFormData({
                      ...hotelFormData,
                      image_url: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amenities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Free WiFi, Pool, Spa, Valet Parking, Gym"
                  value={hotelFormData.amenities}
                  onChange={(e) =>
                    setHotelFormData({
                      ...hotelFormData,
                      amenities: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe property aesthetics, location benefits, unique perks..."
                  value={hotelFormData.description}
                  onChange={(e) =>
                    setHotelFormData({
                      ...hotelFormData,
                      description: e.target.value,
                    })
                  }
                  className="form-textarea"
                />
              </div>

              <div className="modal-footer-buttons">
                <button
                  type="button"
                  onClick={() => setHotelModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingHotel ? 'Save Changes' : 'Create Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- ROOM MODAL (CREATE / EDIT) ----------------- */}
      {roomModalOpen && (
        <div className="modal-backdrop" onClick={() => setRoomModalOpen(false)}>
          <div className="modal-content lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRoom ? 'Edit Room / Suite' : 'Add New Room / Suite'}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setRoomModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Hotel</label>
                  <select
                    value={roomFormData.hotel}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, hotel: e.target.value })
                    }
                    className="form-select"
                    required
                  >
                    {hotelsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Room Number / Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="301"
                    value={roomFormData.room_number}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_number: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Room Type</label>
                  <select
                    value={roomFormData.room_type}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, room_type: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="single">Single Standard</option>
                    <option value="double">Double Deluxe</option>
                    <option value="suite">Executive Suite</option>
                    <option value="family">Family Suite</option>
                    <option value="presidential">Presidential Suite</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price per Night ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={roomFormData.price_per_night}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        price_per_night: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={roomFormData.capacity}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        capacity: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bed Type</label>
                  <input
                    type="text"
                    required
                    placeholder="King Bed"
                    value={roomFormData.bed_type}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        bed_type: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Size (m²)</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={roomFormData.size_sqm}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        size_sqm: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={roomFormData.image_url}
                  onChange={(e) =>
                    setRoomFormData({
                      ...roomFormData,
                      image_url: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Amenities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Espresso Machine, Balcony, Jacuzzi, Smart TV"
                  value={roomFormData.amenities}
                  onChange={(e) =>
                    setRoomFormData({
                      ...roomFormData,
                      amenities: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe room layout, ambiance, city or ocean views..."
                  value={roomFormData.description}
                  onChange={(e) =>
                    setRoomFormData({
                      ...roomFormData,
                      description: e.target.value,
                    })
                  }
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <div className="checkbox-row">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={roomFormData.is_available}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        is_available: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="is_available">Available for reservations</label>
                </div>
              </div>

              <div className="modal-footer-buttons">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

