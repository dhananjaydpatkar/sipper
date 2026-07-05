import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import DateFilter from '../components/DateFilter';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CoffeeType {
  id: string;
  name: string;
  current_price_inr: number;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [coffeeTypes, setCoffeeTypes] = useState<CoffeeType[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<{start?: string, end?: string}>({
    start: (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString();
    })(),
    end: undefined
  });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (text: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (dateFilter.start) params.append('startDate', dateFilter.start);
      if (dateFilter.end) params.append('endDate', dateFilter.end);
      
      const res = await axios.get(`${API_URL}/orders?${params.toString()}`);
      setOrders(res.data.orders);
      setTotalOrders(res.data.total);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, dateFilter]);

  useEffect(() => {
    const fetchCoffeeTypes = async () => {
      try {
        const res = await axios.get(`${API_URL}/coffee-types`);
        setCoffeeTypes(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCoffeeTypes();
    fetchOrders();
  }, []);

  const handleOrderDaily = async (coffeeTypeId: string, slot: 'AM_10' | 'PM_3') => {
    setLoading(true);
    try {
      const today = new Date();
      const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      
      await axios.post(`${API_URL}/orders/daily`, {
        coffee_type_id: coffeeTypeId,
        slot,
        date: localDate
      });
      showToast('Daily order placed successfully!', 'success');
      refreshUser();
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderWeekly = async (coffeeTypeId: string) => {
    setLoading(true);
    try {
      // Find next Monday
      const d = new Date();
      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
      const localDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      
      await axios.post(`${API_URL}/orders/weekly`, {
        coffee_type_id: coffeeTypeId,
        startDate: localDate
      });
      showToast('Weekly orders placed successfully!', 'success');
      refreshUser();
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to place weekly order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper animate-fade-in">
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>

      <nav className="navbar">
        <div className="navbar-brand">Sipper</div>
        <div className="navbar-links">
          <span 
            style={{ cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }} 
            onClick={() => window.location.href = '/profile'}
          >
            {user?.name}
          </span>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="glass-container" style={{ marginBottom: '2rem' }}>
        <h2>Dashboard</h2>
        <p>Amount Yet to be Settled: <strong style={{ color: 'var(--primary-color)' }}>INR {user?.balance}</strong></p>
      </div>

      <h3 style={{ marginBottom: '1rem' }}>Order Coffee</h3>
      <div className="card-grid">
        {coffeeTypes.map((coffee) => (
          <div key={coffee.id} className="glass-container">
            <h4>{coffee.name}</h4>
            <p style={{ marginBottom: '1.5rem' }}>INR {coffee.current_price_inr}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOrderDaily(coffee.id, 'AM_10')}
                disabled={loading}
              >
                Order for Today 10 AM
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOrderDaily(coffee.id, 'PM_3')}
                disabled={loading}
              >
                Order for Today 3 PM
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleOrderWeekly(coffee.id)}
                disabled={loading}
              >
                Book for Next Week (Mon-Fri)
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-container" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>My Orders</h3>
          <DateFilter onFilterChange={(start, end) => { setDateFilter({ start, end }); setPage(1); }} />
        </div>
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Slot</th>
                <th>Coffee</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id}>
                  <td>{new Date(o.date).toLocaleDateString()}</td>
                  <td>{o.slot === 'AM_10' ? '10 AM' : '3 PM'}</td>
                  <td>{o.coffee_type?.name}</td>
                  <td>
                    <span style={{ 
                      color: o.status === 'SETTLED' ? 'var(--success-color)' : 
                             o.status === 'COMPLETED' ? 'var(--primary-color)' :
                             o.status === 'CANCELLED' ? 'var(--error-color)' : 
                             'inherit' 
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td>INR {o.price_at_order_time}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={totalOrders} limit={10} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default Dashboard;
