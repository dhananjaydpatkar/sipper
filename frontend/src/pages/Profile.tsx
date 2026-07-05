import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Profile: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPin.length !== 6) {
      setError('New PIN must be exactly 6 digits');
      return;
    }
    
    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match');
      return;
    }

    if (oldPin === newPin) {
      setError('New PIN must be different from Old PIN');
      return;
    }

    setLoading(true);

    try {
      await axios.put(
        `${API_URL}/auth/update-pin`,
        { old_pin: oldPin, new_pin: newPin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('PIN updated successfully!');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')} 
        style={{ marginBottom: '1.5rem' }}
      >
        &larr; Back to Dashboard
      </button>

      <div className="glass-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem' }}>My Profile</h2>
        <p style={{ color: 'var(--text-color)', marginBottom: '2rem' }}>
          <strong>Name:</strong> {user?.name} <br />
          <strong>Phone:</strong> {user?.phone_number} <br />
          <strong>Role:</strong> {user?.role}
        </p>

        <h3 style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          Change Login PIN
        </h3>

        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ color: '#4caf50', marginBottom: '1rem' }}>{success}</div>}

        <form onSubmit={handleUpdatePin}>
          <div className="input-group">
            <label htmlFor="oldPin">Current 6-Digit PIN</label>
            <input
              id="oldPin"
              type="password"
              className="input-control"
              placeholder="******"
              maxLength={6}
              pattern="[0-9]{6}"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="newPin">New 6-Digit PIN</label>
            <input
              id="newPin"
              type="password"
              className="input-control"
              placeholder="******"
              maxLength={6}
              pattern="[0-9]{6}"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPin">Confirm New PIN</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update PIN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
