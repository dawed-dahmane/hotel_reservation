import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { hotelsAPI, unwrapList } from '../services/api';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  Hotel,
  DollarSign,
  ArrowUpDown,
  X,
  Sparkles,
} from 'lucide-react';

export const HotelList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || 'all');
  const [sortBy, setSortBy] = useState('recommended');

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity;

      const res = await hotelsAPI.getAll({ ...params, page_size: 100 });
      let data = unwrapList(res.data);

      // Filter by min rating if specified
      if (minRating !== 'all') {
        const ratingNum = parseInt(minRating, 10);
        data = data.filter((h) => h.star_rating >= ratingNum);
      }

      // Client-side sorting
      if (sortBy === 'price_asc') {
        data.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
      } else if (sortBy === 'price_desc') {
        data.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
      } else if (sortBy === 'rating_desc') {
        data.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      }

      setHotels(data);
    } catch (err) {
      console.error('Failed to load hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [selectedCity, minRating, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHotels();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setMinRating('all');
    setSortBy('recommended');
    setSearchParams({});
    hotelsAPI.getAll({ page_size: 100 }).then((res) => setHotels(unwrapList(res.data)));
  };

  return (
    <div className="page-catalog-container">
      {/* Header Banner */}
      <div className="catalog-header">
        <div className="catalog-header-content">
          <h1>Explore World-Class Accommodations</h1>
          <p>Hand-picked luxury properties designed for unforgettable stays.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="catalog-toolbar">
        <form onSubmit={handleSearchSubmit} className="catalog-search-form">
          <div className="search-input-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by hotel name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="catalog-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => {
                  setSearchTerm('');
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-filter-apply">
            Search
          </button>
        </form>

        <div className="filters-row">
          <div className="filter-select-wrapper">
            <MapPin size={16} className="filter-icon" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="filter-select"
            >
              <option value="">All Destinations</option>
              <option value="Nice">Nice, France</option>
              <option value="New York">New York, USA</option>
              <option value="Kyoto">Kyoto, Japan</option>
              <option value="Zermatt">Zermatt, Switzerland</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Star size={16} className="filter-icon" />
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="filter-select"
            >
              <option value="all">Any Rating</option>
              <option value="5">5 Stars Luxury</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <ArrowUpDown size={16} className="filter-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>

          {(searchTerm || selectedCity || minRating !== 'all') && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-reset-filters"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Hotel Cards Grid */}
      <div className="catalog-content-section">
        <div className="catalog-meta-info">
          <span>
            Showing <strong>{hotels.length}</strong> available properties
          </span>
        </div>

        {loading ? (
          <div className="catalog-loading">
            <div className="spinner"></div>
            <p>Fetching luxury destinations...</p>
          </div>
        ) : hotels.length === 0 ? (
          <div className="empty-catalog-box">
            <Hotel size={48} className="empty-icon" />
            <h3>No hotels matched your search criteria</h3>
            <p>Try adjusting your search terms or clearing your active filters.</p>
            <button type="button" onClick={clearFilters} className="btn-primary">
              View All Properties
            </button>
          </div>
        ) : (
          <div className="catalog-hotels-grid">
            {hotels.map((hotel) => (
              <div key={hotel.id} className="catalog-hotel-card">
                <div className="card-media">
                  <img
                    src={
                      hotel.image_url ||
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={hotel.name}
                    className="card-img"
                    loading="lazy"
                  />
                  <div className="badge-rating">
                    <Star size={14} className="star-icon fill" />
                    <span>{hotel.average_rating || hotel.star_rating}.0</span>
                  </div>
                  {hotel.is_featured && (
                    <span className="badge-featured">
                      <Sparkles size={12} /> Featured
                    </span>
                  )}
                </div>

                <div className="card-details">
                  <div className="card-top-row">
                    <div className="card-city">
                      <MapPin size={14} />
                      <span>
                        {hotel.city}, {hotel.country}
                      </span>
                    </div>
                    <span className="rooms-count-pill">
                      {hotel.rooms_count} Rooms Available
                    </span>
                  </div>

                  <h3 className="card-hotel-title">
                    <Link to={`/hotels/${hotel.id}`}>{hotel.name}</Link>
                  </h3>

                  <p className="card-hotel-address">{hotel.address}</p>
                  <p className="card-hotel-description">
                    {hotel.description.slice(0, 130)}...
                  </p>

                  <div className="card-amenities-list">
                    {hotel.amenities?.slice(0, 4).map((amenity, idx) => (
                      <span key={idx} className="amenity-chip">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="card-footer-action">
                    <div className="card-price-container">
                      <span className="price-lead">From</span>
                      <span className="price-amount">
                        ${hotel.min_price || 150}
                        <small> / night</small>
                      </span>
                    </div>

                    <Link to={`/hotels/${hotel.id}`} className="btn-explore-rooms">
                      View Suites & Reserve
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelList;

