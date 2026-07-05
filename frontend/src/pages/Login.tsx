import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '')}`;
      
      if (authMode === 'signup') {
        if (pin.length !== 6) {
          setError('PIN must be exactly 6 digits');
          setLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setError('PINs do not match');
          setLoading(false);
          return;
        }
        const response = await axios.post(`${API_URL}/auth/pin-signup`, {
          phone_number: formattedPhone,
          name,
          pin
        });
        login(response.data.token, response.data.user);
        navigate('/');
      } else {
        // Login
        const response = await axios.post(`${API_URL}/auth/pin-login`, {
          phone_number: formattedPhone,
          pin
        });
        login(response.data.token, response.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center">
      <div className="glass-container animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Welcome to Sipper</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-color)', fontWeight: 'bold' }}>+91</span>
              <input
                id="phone"
                type="tel"
                className="input-control"
                placeholder="9876543210"
                maxLength={10}
                pattern="[0-9]{10}"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>
          
          {authMode === 'signup' && (
            <div className="input-group animate-fade-in">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                className="input-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group animate-fade-in">
            <label htmlFor="pin">{authMode === 'signup' ? 'Set 6-Digit PIN' : 'Enter 6-Digit PIN'}</label>
            <input
              id="pin"
              type="password"
              className="input-control"
              placeholder="******"
              maxLength={6}
              pattern="[0-9]{6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          
          {authMode === 'signup' && (
            <div className="input-group animate-fade-in">
              <label htmlFor="confirmPin">Confirm 6-Digit PIN</label>
              <input
                id="confirmPin"
                type="password"
                className="input-control"
                placeholder="******"
                maxLength={6}
                pattern="[0-9]{6}"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Processing...' : (authMode === 'signup' ? 'Sign Up' : 'Login')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            {authMode === 'login' ? (
              <span>New here? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('signup'); setError(''); }}>Sign up instead</a></span>
            ) : (
              <span>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setError(''); }}>Log in</a></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
