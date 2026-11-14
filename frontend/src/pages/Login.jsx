import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, User, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await login(data.username, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Invalid credentials. Please verify your username and password.';
      setServerError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick helper to fill demo credentials
  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-circle">
            <LogIn size={28} className="auth-icon" />
          </div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your LuxeStay account to manage reservations</p>
        </div>

        {serverError && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username or Email
            </label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                placeholder="Enter your username or email"
                className={`form-input ${errors.username ? 'is-invalid' : ''}`}
                {...register('username', {
                  required: 'Username or email is required',
                })}
              />
            </div>
            {errors.username && (
              <span className="form-error-msg">{errors.username.message}</span>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="password">
                Password
              </label>
            </div>
            <div className="input-with-icon">
              <Key className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
            </div>
            {errors.password && (
              <span className="form-error-msg">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-submit full-width"
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner-sm"></span> Signing In...
              </span>
            ) : (
              <span>Sign In with React Hook Form & Axios</span>
            )}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Don't have an account yet?</span>{' '}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;

