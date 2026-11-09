import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Key, AlertCircle, CheckCircle } from 'lucide-react';

export const Register = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      confirm_password: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await registerAuth(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const firstKey = Object.keys(errorData)[0];
          const msg = Array.isArray(errorData[firstKey])
            ? errorData[firstKey][0]
            : errorData[firstKey];
          setServerError(`${firstKey}: ${msg}`);
        } else {
          setServerError('Registration failed. Please check the inputs.');
        }
      } else {
        setServerError('Network error. Make sure the backend server is running.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-icon-circle">
            <UserPlus size={28} className="auth-icon" />
          </div>
          <h2 className="auth-title">Create an Account</h2>
          <p className="auth-subtitle">Join LuxeStay to reserve exclusive suites & earn VIP privileges</p>
        </div>

        {serverError && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">
                First Name
              </label>
              <input
                id="first_name"
                type="text"
                placeholder="Eleanor"
                className={`form-input ${errors.first_name ? 'is-invalid' : ''}`}
                {...register('first_name', { required: 'First name is required' })}
              />
              {errors.first_name && (
                <span className="form-error-msg">{errors.first_name.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="last_name">
                Last Name
              </label>
              <input
                id="last_name"
                type="text"
                placeholder="Vance"
                className={`form-input ${errors.last_name ? 'is-invalid' : ''}`}
                {...register('last_name', { required: 'Last name is required' })}
              />
              {errors.last_name && (
                <span className="form-error-msg">{errors.last_name.message}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                placeholder="eleanor_v"
                className={`form-input ${errors.username ? 'is-invalid' : ''}`}
                {...register('username', {
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                })}
              />
            </div>
            {errors.username && (
              <span className="form-error-msg">{errors.username.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="eleanor@example.com"
                className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
            </div>
            {errors.email && (
              <span className="form-error-msg">{errors.email.message}</span>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
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
                      message: 'Minimum 6 characters',
                    },
                  })}
                />
              </div>
              {errors.password && (
                <span className="form-error-msg">{errors.password.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm_password">
                Confirm Password
              </label>
              <div className="input-with-icon">
                <Key className="input-icon" size={18} />
                <input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  className={`form-input ${errors.confirm_password ? 'is-invalid' : ''}`}
                  {...register('confirm_password', {
                    required: 'Please confirm password',
                    validate: (value) =>
                      value === passwordValue || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirm_password && (
                <span className="form-error-msg">{errors.confirm_password.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-submit full-width"
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner-sm"></span> Creating Account...
              </span>
            ) : (
              <span>Complete Sign Up with React Hook Form</span>
            )}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Already registered?</span>{' '}
          <Link to="/login" className="auth-link">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

