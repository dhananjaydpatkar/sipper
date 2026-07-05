import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import DateFilter from '../components/DateFilter';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface DetailedOrder {
  id: string;
  user_name: string;
  user_phone: string;
  coffee_type: string;
  status: string;
  created_at: string;
}

interface UserBalance {
  id: string;
  name: string;
  phone_number: string;
  balance: number;
}

interface SettlementLog {
  id: string;
  user_name: string;
  amount: number;
  date: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [ordersData, setOrdersData] = useState<{total: number, orders: DetailedOrder[]}>({ total: 0, orders: [] });
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  });
  const [slot, setSlot] = useState<'AM_10' | 'PM_3'>('AM_10');
  const [settleAmounts, setSettleAmounts] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'orders' | 'settlements'>('orders');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [settlementSearchQuery, setSettlementSearchQuery] = useState('');

  const [logs, setLogs] = useState<SettlementLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsDateFilter, setLogsDateFilter] = useState<{start?: string, end?: string}>({
    start: (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString();
    })(),
    end: undefined
  });

  useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, [date, slot]);

  useEffect(() => {
    fetchLogs();
  }, [logsPage, logsDateFilter, settlementSearchQuery]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/orders/aggregate?date=${date}&slot=${slot}`);
      setOrdersData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users/balances`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ page: logsPage.toString(), limit: '10' });
      if (logsDateFilter.start) params.append('startDate', logsDateFilter.start);
      if (logsDateFilter.end) params.append('endDate', logsDateFilter.end);
      if (settlementSearchQuery) params.append('userName', settlementSearchQuery);

      const res = await axios.get(`${API_URL}/admin/transactions?${params.toString()}`);
      setLogs(res.data.transactions);
      setTotalLogs(res.data.total);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettle = async (userId: string, fullBalance: number) => {
    try {
      const amount = settleAmounts[userId] !== undefined ? settleAmounts[userId] : fullBalance.toString();
      await axios.post(`${API_URL}/admin/users/${userId}/settle`, { amount });
      
      // Clear the local input state and refresh
      setSettleAmounts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      fetchUsers(); 
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };
  const handleCompleteOrder = async (orderId: string) => {
    try {
      await axios.post(`${API_URL}/admin/orders/${orderId}/complete`);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleOrder = async (orderId: string) => {
    try {
      await axios.post(`${API_URL}/admin/orders/${orderId}/settle`);
      fetchOrders();
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAmountChange = (userId: string, value: string) => {
    setSettleAmounts(prev => ({ ...prev, [userId]: value }));
  };

  return (
    <div className="app-wrapper animate-fade-in">
      <nav className="navbar">
        <div className="navbar-brand">Sipper Admin</div>
        <div className="navbar-links">
          <span 
            style={{ cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }} 
            onClick={() => window.location.href = '/profile'}
          >
            {user?.name} (Admin)
          </span>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders to Prepare
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlements')}
        >
          Pending Settlements
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="glass-container" style={{ marginBottom: '2rem' }}>
          <h3>Orders to Prepare</h3>
          <div className="input-group" style={{ marginTop: '1rem', maxWidth: '300px' }}>
            <label>Date</label>
            <input 
              type="date" 
              className="input-control" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <div className="input-group" style={{ maxWidth: '300px' }}>
            <label>Slot</label>
            <select 
              className="input-control" 
              value={slot} 
              onChange={(e) => setSlot(e.target.value as any)}
            >
              <option value="AM_10">10 AM</option>
              <option value="PM_3">3 PM</option>
            </select>
          </div>
          <div className="input-group" style={{ marginTop: '1rem', maxWidth: '300px' }}>
            <label>Filter by User</label>
            <input 
              type="text" 
              className="input-control" 
              placeholder="Search by name..."
              value={orderSearchQuery} 
              onChange={(e) => setOrderSearchQuery(e.target.value)} 
            />
          </div>
          
          <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <h4 style={{ color: 'var(--primary-color)' }}>Total Orders to Prepare: {ordersData.total}</h4>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order Time</th>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Coffee Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersData.orders.filter(o => o.user_name.toLowerCase().includes(orderSearchQuery.toLowerCase())).map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{o.user_name}</td>
                    <td>{o.user_phone}</td>
                    <td>{o.coffee_type}</td>
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
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      {o.status === 'PENDING' && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => handleCompleteOrder(o.id)}
                        >
                          Complete
                        </button>
                      )}
                      {(o.status === 'PENDING' || o.status === 'PREPARED' || o.status === 'COMPLETED') && (
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', opacity: o.status !== 'COMPLETED' ? 0.5 : 1, cursor: o.status !== 'COMPLETED' ? 'not-allowed' : 'pointer' }}
                          onClick={() => handleSettleOrder(o.id)}
                          disabled={o.status !== 'COMPLETED'}
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ordersData.orders.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>No orders for this slot.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="glass-container" style={{ marginBottom: '2rem' }}>
          <h3>Pending Settlements</h3>
          <div className="input-group" style={{ marginTop: '1rem', maxWidth: '300px' }}>
            <label>Filter by User</label>
            <input 
              type="text" 
              className="input-control" 
              placeholder="Search by name..."
              value={settlementSearchQuery} 
              onChange={(e) => {
                setSettlementSearchQuery(e.target.value);
                setLogsPage(1);
              }} 
            />
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount (INR)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.name.toLowerCase().includes(settlementSearchQuery.toLowerCase())).map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.balance}</td>
                    <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        className="input-control" 
                        style={{ width: '100px', padding: '0.5rem', marginBottom: 0 }} 
                        value={settleAmounts[u.id] !== undefined ? settleAmounts[u.id] : u.balance} 
                        onChange={(e) => handleAmountChange(u.id, e.target.value)}
                        max={u.balance}
                        min={1}
                      />
                      <button className="btn btn-primary" onClick={() => handleSettle(u.id, u.balance)}>Settle</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center' }}>No pending balances.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="glass-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Settlement History</h3>
            <DateFilter onFilterChange={(start, end) => { setLogsDateFilter({ start, end }); setLogsPage(1); }} />
          </div>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Amount Settled (INR)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.date).toLocaleString()}</td>
                    <td>{log.user_name}</td>
                    <td style={{ color: 'var(--success-color)' }}>{log.amount}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center' }}>No settlements found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={logsPage} total={totalLogs} limit={10} onPageChange={setLogsPage} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
