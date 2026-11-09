import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Hotel,
  Compass,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  User,
  ShieldAlert
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
          <div className="brand-icon-wrapper">
            <Hotel className="brand-icon" size={24} />
          </div>
          <div className="brand-text">
            <span className="brand-title">LUXESTAY</span>
            <span className="brand-subtitle">RESORTS & SUITES</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Compass size={18} />
            <span>Discover</span>
          </NavLink>
          <NavLink
            to="/hotels"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Hotel size={18} />
            <span>Hotels & Rooms</span>
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink
                to="/my-bookings"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <CalendarCheck size={18} />
                <span>My Bookings</span>
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
            </>
          )}
        </div>

        {/* Desktop User Section */}
        <div className="nav-auth-desktop">
          {isAuthenticated ? (
            <div className="user-dropdown-container">
              <div className="user-profile-badge">
                <div className="user-avatar">
                  <User size={16} />
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user?.username}</span>
                  {isAdmin ? (
                    <span className="badge-role admin">
                      <ShieldAlert size={10} /> Admin
                    </span>
                  ) : (
                    <span className="badge-role customer">Guest</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                title="Sign Out"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <Link to="/login" className="btn-secondary">
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link to="/register" className="btn-primary">
                <UserPlus size={16} />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <Compass size={20} />
              <span>Discover</span>
            </NavLink>
            <NavLink
              to="/hotels"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <Hotel size={20} />
              <span>Hotels & Rooms</span>
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink
                  to="/my-bookings"
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <CalendarCheck size={20} />
                  <span>My Bookings</span>
                </NavLink>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard {isAdmin && '(Admin)'}</span>
                </NavLink>
              </>
            )}
          </div>

          <div className="mobile-auth-section">
            {isAuthenticated ? (
              <div className="mobile-user-box">
                <div className="mobile-user-details">
                  <div className="user-avatar">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="user-name">{user?.username}</div>
                    <div className="user-email">{user?.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-logout full-width"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="mobile-auth-actions">
                <Link
                  to="/login"
                  className="btn-secondary full-width"
                  onClick={closeMobileMenu}
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="btn-primary full-width"
                  onClick={closeMobileMenu}
                >
                  <UserPlus size={16} />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

