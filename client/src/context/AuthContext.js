import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      checkUserLoggedIn();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Check if user is logged in
  const checkUserLoggedIn = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const response = await axios.get('http://localhost:5000/api/auth/me', config);
      
      setCurrentUser(response.data.data.user);
      setIsLoading(false);
    } catch (error) {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setError(error.response?.data?.message || 'Failed to authenticate');
      setIsLoading(false);
    }
  };

  // Register a new user
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', userData);
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      
      // Set user
      setCurrentUser(response.data.data.user);
      setIsLoading(false);
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      setIsLoading(false);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      
      // Set user
      setCurrentUser(response.data.data.user);
      setIsLoading(false);
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      setIsLoading(false);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to update your profile');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const response = await axios.put(
        'http://localhost:5000/api/auth/update-profile', 
        profileData,
        config
      );
      
      // Update user state with new information
      setCurrentUser(response.data.data.user);
      setIsLoading(false);
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      setIsLoading(false);
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isLoading,
    error,
    register,
    login,
    logout,
    updateProfile,
    checkUserLoggedIn
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext; 