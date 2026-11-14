import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hotelsAPI, unwrapList } from '../services/api';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  Sparkles,
  ShieldCheck,
  Headphones,
  Award,
  ArrowRight,
  Wifi,
  Coffee,
  CheckCircle2,
} from 'lucide-react';

export const Home = () => {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelsAPI.getAll({ featured: 'true' });
        const featured = unwrapList(res.data);
        // If featured list is small, fallback to top hotels
        if (featured.length > 0) {
          setFeaturedHotels(featured);
        } else {
          const allRes = await hotelsAPI.getAll();
          setFeaturedHotels(unwrapList(allRes.data).slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching featured hotels:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchCity) query.append('city', searchCity);
    if (guestsCount) query.append('capacity', guestsCount);
    navigate(`/hotels?${query.toString()}`);
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={16} /> Exclusive Luxury Escapes
          </div>
          <h1 className="hero-title">
            Sanctuaries of Sophistication & Unrivaled Hospitality
          </h1>
          <p className="hero-desc">
            Reserve premium suites at world-renowned hotels, seaside villas, and private mountain retreats with bespoke amenities.
          </p>

          {/* Quick Search Widget */}
          <form onSubmit={handleSearch} className="search-bar-widget">
            <div className="search-field">
              <label className="search-label">
                <MapPin size={16} /> Destination
              </label>
              <input
                type="text"
                placeholder="City (e.g. Nice, New York, Kyoto...)"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="search-divider"></div>

            <div className="search-field">
              <label className="search-label">
                <Calendar size={16} /> Dates
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="search-input"
              />
            </div>

            <div className="search-divider"></div>

            <div className="search-field">
              <label className="search-label">
                <Users size={16} /> Guests
              </label>
              <select
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
                className="search-select"
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4+ Guests</option>
              </select>
            </div>

            <button type="submit" className="btn-search-submit">
              <Search size={18} />
              <span>Explore Stays</span>
            </button>
          </form>
        </div>
      </section>

      {/* Value Proposition Highlights */}
      <section className="features-section">
        <div className="section-header text-center">
          <span className="section-badge">Exceptional Value</span>
          <h2 className="section-heading">Why Discerning Travelers Choose LuxeStay</h2>
          <p className="section-subtext">Every detail tailored to surpass your highest expectations.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Award size={26} />
            </div>
            <h3>Verified 5-Star Standards</h3>
            <p>Every hotel and suite in our portfolio undergoes rigorous inspection for supreme quality and hygiene.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Headphones size={26} />
            </div>
            <h3>24/7 Dedicated Concierge</h3>
            <p>Direct assistance from private airport chauffeuring to bespoke restaurant bookings.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={26} />
            </div>
            <h3>Best Rate & Flexible Policy</h3>
            <p>Transparent pricing with zero hidden fees and generous complimentary cancellation policies.</p>
          </div>
        </div>
      </section>

      {/* Featured Hotels Showcase */}
      <section className="featured-hotels-section">
        <div className="section-header-row">
          <div>
            <span className="section-badge">Curated Stays</span>
            <h2 className="section-heading">Featured Luxury Hotels</h2>
          </div>
          <Link to="/hotels" className="link-see-all">
            Browse All Stays <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading curated properties...</p>
          </div>
        ) : (
          <div className="hotels-grid">
            {featuredHotels.map((hotel) => (
              <div key={hotel.id} className="hotel-card">
                <div className="hotel-card-image-box">
                  <img
                    src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                    alt={hotel.name}
                    className="hotel-card-image"
                    loading="lazy"
                  />
                  <div className="hotel-rating-badge">
                    <Star size={14} className="star-icon fill" />
                    <span>{hotel.average_rating || hotel.star_rating}.0</span>
                  </div>
                  {hotel.is_featured && (
                    <span className="hotel-badge-featured">Featured Choice</span>
                  )}
                </div>

                <div className="hotel-card-body">
                  <div className="hotel-location">
                    <MapPin size={14} />
                    <span>{hotel.city}, {hotel.country}</span>
                  </div>
                  <h3 className="hotel-card-title">{hotel.name}</h3>
                  <p className="hotel-card-desc">{hotel.description.slice(0, 110)}...</p>

                  <div className="hotel-amenities-tags">
                    {hotel.amenities?.slice(0, 3).map((amenity, idx) => (
                      <span key={idx} className="amenity-pill">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="hotel-card-footer">
                    <div className="hotel-price-box">
                      <span className="price-label">Starting from</span>
                      <span className="price-value">
                        ${hotel.min_price ? hotel.min_price : 180}
                        <small>/night</small>
                      </span>
                    </div>
                    <Link to={`/hotels/${hotel.id}`} className="btn-view-hotel">
                      View Rooms
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials / Guest Stories */}
      <section className="testimonials-section">
        <div className="section-header text-center">
          <span className="section-badge">Guest Experiences</span>
          <h2 className="section-heading">Memories That Last A Lifetime</h2>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="star-icon fill" />
              ))}
            </div>
            <p className="testimonial-quote">
              "The Grand Azure in Nice was utterly magical. From the private balcony overlooking the Mediterranean to the attentive staff, it was the best vacation our family has ever had."
            </p>
            <div className="testimonial-author">
              <span className="author-name">Alexander Wright</span>
              <span className="author-detail">Stayed in Executive Suite • July 2026</span>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="star-icon fill" />
              ))}
            </div>
            <p className="testimonial-quote">
              "Seamless booking process and pristine rooms. The Kyoto Imperial Garden Retreat felt like stepping into an imperial dream. Can't wait to book our next trip with LuxeStay."
            </p>
            <div className="testimonial-author">
              <span className="author-name">Sophia Chen</span>
              <span className="author-detail">Stayed in Deluxe Garden Room • August 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-banner">
        <div className="cta-content">
          <h2>Ready For Your Next Extraordinary Getaway?</h2>
          <p>Join thousands of travelers who book with confidence on LuxeStay.</p>
          <div className="cta-buttons">
            <Link to="/hotels" className="btn-cta-primary">
              Browse All Hotels
            </Link>
            <Link to="/register" className="btn-cta-secondary">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

