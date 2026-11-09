import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          if (decoded.exp && decoded.exp < currentTime) {
            // Token has expired
            logout();
          } else {
            // Try fetching latest profile or fallback to decoded data / localStorage
            const storedUser = localStorage.getItem('user_data');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            } else {
              setUser({
                id: decoded.user_id,
                username: decoded.username,
                email: decoded.email,
                is_staff: decoded.is_staff,
              });
            }

            try {
              const res = await authAPI.getProfile();
              setUser(res.data);
              localStorage.setItem('user_data', JSON.stringify(res.data));
            } catch (err) {
              console.warn('Could not refresh user profile:', err);
            }
          }
        } catch (error) {
          console.error('Invalid token found in storage:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.login({ username, password });
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_data', JSON.stringify(userData));

    setToken(access);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { access, refresh, user: newUser } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_data', JSON.stringify(newUser));

    setToken(access);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: !!user?.is_staff,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

