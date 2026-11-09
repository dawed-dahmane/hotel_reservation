import React from 'react';
import { Link } from 'react-router-dom';
import { Hotel, Mail, Phone, MapPin, Heart, ShieldCheck, Sparkles, Award } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-grid">
          {/* Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <Hotel size={28} className="footer-logo-icon" />
              <div>
                <span className="logo-text">LUXESTAY</span>
                <span className="logo-sub">HOTELS & RESORTS</span>
              </div>
            </div>
            <p className="footer-description">
              Curating unforgettable luxury travel experiences. Discover world-class hospitality, 
              breathtaking suites, and bespoke concierge services around the globe.
            </p>
            <div className="footer-badges">
              <span className="footer-badge">
                <Award size={14} /> 5-Star Certified
              </span>
              <span className="footer-badge">
                <ShieldCheck size={14} /> Secure Booking
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-title">Explore</h4>
            <ul className="footer-links">
              <li><Link to="/">Home & Featured</Link></li>
              <li><Link to="/hotels">All Hotels & Destinations</Link></li>
              <li><Link to="/hotels?city=Nice">Riviera Escapes (Nice)</Link></li>
              <li><Link to="/hotels?city=New York">Manhattan Suites (NYC)</Link></li>
              <li><Link to="/hotels?city=Kyoto">Zen Retreats (Kyoto)</Link></li>
            </ul>
          </div>

          {/* Guest Services */}
          <div className="footer-col">
            <h4 className="footer-title">Guest Services</h4>
            <ul className="footer-links">
              <li><Link to="/my-bookings">Manage Bookings</Link></li>
              <li><Link to="/dashboard">Guest Dashboard</Link></li>
              <li><Link to="/login">Sign In / Register</Link></li>
              <li><a href="#amenities">Bespoke Amenities</a></li>
              <li><a href="#faq">Frequently Asked Questions</a></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="footer-col">
            <h4 className="footer-title">Contact Concierge</h4>
            <div className="footer-contact-item">
              <MapPin size={16} />
              <span>742 5th Avenue, New York, NY 10019</span>
            </div>
            <div className="footer-contact-item">
              <Phone size={16} />
              <span>+1 (800) 589-3782 (24/7 Hotline)</span>
            </div>
            <div className="footer-contact-item">
              <Mail size={16} />
              <span>reservations@luxestayhotels.com</span>
            </div>
            <div className="newsletter-box">
              <span className="newsletter-text">Join Luxe Club for 15% off first stay:</span>
              <div className="newsletter-input-group">
                <input type="email" placeholder="Enter your email" className="newsletter-input" />
                <button type="button" className="btn-newsletter">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>© {new Date().getFullYear()} LuxeStay International. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <span className="dot">•</span>
            <a href="#">Terms of Service</a>
            <span className="dot">•</span>
            <a href="#">Security Standards</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

