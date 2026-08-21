import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileText,
  Send,
  ShoppingCart,
  LogOut,
  User,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Truck,
  Check
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'OPERATIONS' | 'SALES';
  locationId: string | null;
  locationCode: string | null;
}

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );

  // Authentication states
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active tab state
  const [activeTab, setActiveTab] = useState<'inventory' | 'work-orders' | 'transfers' | 'orders'>('inventory');

  // Metadata dropdowns
  const [metadata, setMetadata] = useState<{
    locations: { id: string; name: string; code: string }[];
    items: { id: string; name: string; sku: string }[];
    users: { id: string; username: string; role: string }[];
  }>({ locations: [], items: [], users: [] });

  // Module state
  const [inventory, setInventory] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [newWO, setNewWO] = useState({ locationId: '', itemId: '', requiredQty: 0, assignedUserId: '' });
  const [newTransfer, setNewTransfer] = useState({ sourceLocationId: '', destLocationId: '', itemId: '', quantity: 0 });
  const [newOrder, setNewOrder] = useState({ itemId: '', locationId: '', quantity: 0 });

  // Modal / Editing state
  const [editInventory, setEditInventory] = useState<{ id: string; physicalQty: number; itemName: string; batchCode: string } | null>(null);

  // Auto clear alerts
  useEffect(() => {
    if (successMsg || errorMsg) {
      const t = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg, errorMsg]);

  // Load backend data if logged in
  useEffect(() => {
    if (token) {
      fetchMetadata();
      fetchTabContent();
    }
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: loginInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSuccessMsg(`Welcome back, ${data.user.username}!`);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/meta`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMetadata(data);
        // Pre-populate forms
        if (data.locations.length > 0 && data.items.length > 0) {
          setNewWO(prev => ({
            ...prev,
            locationId: data.locations[0].id,
            itemId: data.items[0].id,
            assignedUserId: data.users.find((u: any) => u.role === 'OPERATIONS')?.id || data.users[0].id
          }));
          setNewTransfer(prev => ({
            ...prev,
            sourceLocationId: data.locations[0].id,
            destLocationId: data.locations[1]?.id || data.locations[0].id,
            itemId: data.items[0].id
          }));
          setNewOrder(prev => ({
            ...prev,
            locationId: data.locations[0].id,
            itemId: data.items[0].id
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  };

  const fetchTabContent = async () => {
    try {
      if (activeTab === 'inventory' && (user?.role === 'ADMIN' || user?.role === 'OPERATIONS')) {
        const res = await fetch(`${API_BASE}/inventory`, { headers: getAuthHeader() });
        if (res.ok) setInventory(await res.json());
      } else if (activeTab === 'work-orders') {
        const res = await fetch(`${API_BASE}/work-orders`, { headers: getAuthHeader() });
        if (res.ok) setWorkOrders(await res.json());
      } else if (activeTab === 'transfers' && (user?.role === 'ADMIN' || user?.role === 'OPERATIONS')) {
        const res = await fetch(`${API_BASE}/transfers`, { headers: getAuthHeader() });
        if (res.ok) setTransfers(await res.json());
      } else if (activeTab === 'orders' && (user?.role === 'ADMIN' || user?.role === 'SALES')) {
        const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeader() });
        if (res.ok) setOrders(await res.json());
      }
    } catch (err) {
      console.error('Error loading tab content', err);
    }
  };

  // Actions
  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInventory) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/${editInventory.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ physicalQty: editInventory.physicalQty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setSuccessMsg('Inventory physical quantity updated.');
      setEditInventory(null);
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/work-orders`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newWO)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create work order');

      setSuccessMsg('Work order created successfully.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateWorkOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/work-orders/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');

      setSuccessMsg('Work order status updated.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newTransfer)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer request failed');

      setSuccessMsg('Stock transfer requested.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDispatchTransfer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transfers/dispatch`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Dispatch failed');

      setSuccessMsg('Transfer dispatched. Source inventory reduced.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleReceiveTransfer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transfers/receive`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Receive failed');

      setSuccessMsg('Transfer received. Destination inventory increased.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newOrder)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reservation failed');

      setSuccessMsg('Customer stock reserved successfully.');
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Login view
  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(51,65,85,0.15),transparent)] pointer-events-none"></div>
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 transition duration-300 hover:border-slate-700/60">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Transit ERP Logo" className="h-20 object-contain mb-3" />
            <h1 className="text-2xl font-bold text-white tracking-wide">Mini Operations ERP</h1>
            <p className="text-slate-400 text-sm mt-1">Please sign in to manage operations</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email or Username</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. admin@fundsroom.com or admin"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 transition duration-200 shadow-lg shadow-indigo-600/20"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-5 text-center">
            <span className="text-slate-500 text-xs">Demo Credentials:</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div onClick={() => { setLoginInput('admin@fundsroom.com'); setPasswordInput('admin123'); }} className="bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2 rounded cursor-pointer text-xs text-slate-300">Admin</div>
              <div onClick={() => { setLoginInput('ops@fundsroom.com'); setPasswordInput('ops123'); }} className="bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2 rounded cursor-pointer text-xs text-slate-300">Ops</div>
              <div onClick={() => { setLoginInput('sales@fundsroom.com'); setPasswordInput('sales123'); }} className="bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2 rounded cursor-pointer text-xs text-slate-300">Sales</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900/70 border-b md:border-b-0 md:border-r border-slate-800/80 p-5 flex flex-col justify-between backdrop-blur-xl">
        <div>
          <div className="flex items-center justify-center mb-8 px-2">
            <img src="/logo.png" alt="Transit ERP Logo" className="h-14 object-contain" />
          </div>

          <nav className="space-y-1.5">
            {(user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'inventory'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" />
                Inventory
              </button>
            )}

            <button
              onClick={() => setActiveTab('work-orders')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${
                activeTab === 'work-orders'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              Work Orders
            </button>

            {(user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
              <button
                onClick={() => setActiveTab('transfers')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'transfers'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Send className="h-4 w-4" />
                Internal Transfers
              </button>
            )}

            {(user.role === 'ADMIN' || user.role === 'SALES') && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'orders'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Customer Orders
              </button>
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="border-t border-slate-800/80 pt-4 mt-6">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 bg-slate-800 border border-slate-700/60 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white truncate max-w-[130px]">{user.username}</div>
              <div className="text-xs text-slate-500 font-mono tracking-wider">{user.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Toast Alerts */}
        {successMsg && (
          <div className="fixed bottom-5 right-5 flex items-center gap-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm shadow-xl z-50 animate-bounce">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="fixed bottom-5 right-5 flex items-center gap-3 bg-red-950/80 backdrop-blur-md border border-red-500/30 rounded-xl p-4 text-red-300 text-sm shadow-xl z-50 animate-bounce">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white capitalize tracking-wide">{activeTab.replace('-', ' ')}</h2>
            <p className="text-slate-400 mt-1 text-sm">ERP control console</p>
          </div>
          <button
            onClick={fetchTabContent}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        {/* TAB 1: Inventory */}
        {activeTab === 'inventory' && (user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4">SKU / Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Physical Qty</th>
                    <th className="p-4">Reserved Qty</th>
                    <th className="p-4">Available Qty</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">No inventory entries available.</td>
                    </tr>
                  ) : (
                    inventory.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-900/20 transition">
                        <td className="p-4">
                          <span className="font-semibold text-white block">{inv.itemName}</span>
                          <span className="text-xs text-slate-500 font-mono">{inv.sku}</span>
                        </td>
                        <td className="p-4 text-slate-300">{inv.categoryName}</td>
                        <td className="p-4">
                          <span className="bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded text-xs text-indigo-400 font-medium">
                            {inv.locationName} ({inv.locationCode})
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono">{inv.batchCode}</td>
                        <td className="p-4 font-semibold text-slate-200">{inv.physicalQty}</td>
                        <td className="p-4 text-slate-400">{inv.reservedQty}</td>
                        <td className="p-4">
                          <span className={`font-bold ${inv.availableQty <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {inv.availableQty}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setEditInventory(inv)}
                            className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-3 py-1 rounded text-xs transition"
                          >
                            Edit Physical
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Edit Stock Modal */}
            {editInventory && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Adjust Physical Quantity</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Item: <span className="text-white font-semibold">{editInventory.itemName}</span> (Batch: {editInventory.batchCode})
                  </p>
                  <form onSubmit={handleUpdateInventory} className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-1.5">New Physical Quantity</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        value={editInventory.physicalQty}
                        onChange={e => setEditInventory({ ...editInventory, physicalQty: parseInt(e.target.value) || 0 })}
                        min={0}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditInventory(null)}
                        className="bg-slate-850 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm text-white font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Work Orders */}
        {activeTab === 'work-orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Item & Location</th>
                      <th className="p-4">Required Qty</th>
                      <th className="p-4">Assigned User</th>
                      <th className="p-4">Shortage</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm">
                    {workOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">No work orders created.</td>
                      </tr>
                    ) : (
                      workOrders.map((wo) => (
                        <tr key={wo.id} className="hover:bg-slate-900/20 transition">
                          <td className="p-4">
                            <span className="font-semibold text-white block">{wo.item.name}</span>
                            <span className="text-xs text-slate-400">{wo.location.name}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-200">{wo.requiredQty}</td>
                          <td className="p-4 text-slate-300">{wo.assignedUser?.username}</td>
                          <td className="p-4">
                            <span className={`font-bold ${wo.shortage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {wo.shortage}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              wo.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                              wo.status === 'IN_PROGRESS' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                              'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                            }`}>
                              {wo.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {user.role !== 'SALES' && wo.status !== 'COMPLETED' && (
                              <div className="flex justify-end gap-1.5">
                                {wo.status === 'ASSIGNED' && (
                                  <button
                                    onClick={() => handleUpdateWorkOrderStatus(wo.id, 'IN_PROGRESS')}
                                    className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-black px-2.5 py-1 rounded text-xs transition"
                                  >
                                    Start
                                  </button>
                                )}
                                {wo.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => handleUpdateWorkOrderStatus(wo.id, 'COMPLETED')}
                                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black px-2.5 py-1 rounded text-xs transition"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Creation Panel */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 h-fit shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Create Work Order</h3>
              {user.role === 'ADMIN' ? (
                <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Item</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                      value={newWO.itemId}
                      onChange={e => setNewWO({ ...newWO, itemId: e.target.value })}
                    >
                      {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Location</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                      value={newWO.locationId}
                      onChange={e => setNewWO({ ...newWO, locationId: e.target.value })}
                    >
                      {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Required Quantity</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                      value={newWO.requiredQty || ''}
                      onChange={e => setNewWO({ ...newWO, requiredQty: parseInt(e.target.value) || 0 })}
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Assign User</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                      value={newWO.assignedUserId}
                      onChange={e => setNewWO({ ...newWO, assignedUserId: e.target.value })}
                    >
                      {metadata.users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 transition duration-200 mt-2 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Create Work Order
                  </button>
                </form>
              ) : (
                <div className="text-slate-500 text-sm p-4 text-center border border-dashed border-slate-800 rounded-xl">
                  Only Admins can create new Work Orders.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Internal Transfers */}
        {activeTab === 'transfers' && (user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Item</th>
                      <th className="p-4">Source → Dest</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Batch</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">No stock transfers recorded.</td>
                      </tr>
                    ) : (
                      transfers.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-900/20 transition">
                          <td className="p-4 font-semibold text-white">{tr.item.name}</td>
                          <td className="p-4 text-slate-300">
                            {tr.sourceLocation.code} → {tr.destLocation.code}
                          </td>
                          <td className="p-4 font-mono text-slate-200">{tr.quantity}</td>
                          <td className="p-4 font-mono text-slate-400">{tr.batchCode || '—'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              tr.status === 'RECEIVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                              tr.status === 'DISPATCHED' ? 'bg-blue-950 text-blue-400 border border-blue-800/50' :
                              'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {tr.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {tr.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleDispatchTransfer(tr.id)}
                                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-3 py-1 rounded text-xs transition"
                              >
                                Dispatch
                              </button>
                            )}
                            {tr.status === 'DISPATCHED' && (
                              <button
                                onClick={() => handleReceiveTransfer(tr.id)}
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded text-xs transition flex items-center gap-1 ml-auto"
                              >
                                <Truck className="h-3 w-3" /> Receive
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Creation Panel */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 h-fit shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Request Stock Transfer</h3>
              <form onSubmit={handleCreateTransfer} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Item</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newTransfer.itemId}
                    onChange={e => setNewTransfer({ ...newTransfer, itemId: e.target.value })}
                  >
                    {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Source Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newTransfer.sourceLocationId}
                    onChange={e => setNewTransfer({ ...newTransfer, sourceLocationId: e.target.value })}
                  >
                    {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Destination Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newTransfer.destLocationId}
                    onChange={e => setNewTransfer({ ...newTransfer, destLocationId: e.target.value })}
                  >
                    {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Quantity</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newTransfer.quantity || ''}
                    onChange={e => setNewTransfer({ ...newTransfer, quantity: parseInt(e.target.value) || 0 })}
                    min={1}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 transition duration-200 mt-2 flex items-center justify-center gap-2"
                >
                  Request Transfer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: Customer Orders */}
        {activeTab === 'orders' && (user.role === 'ADMIN' || user.role === 'SALES') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Item & Location</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Reserved Quantity</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">No customer orders recorded.</td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-900/20 transition">
                          <td className="p-4">
                            <span className="font-semibold text-white block">{ord.item.name}</span>
                            <span className="text-xs text-slate-400">{ord.location.name}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-200">{ord.quantity}</td>
                          <td className="p-4 font-mono text-slate-400">{ord.reservedQty}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Creation Panel */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 h-fit shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Create Order & Reserve</h3>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Item</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newOrder.itemId}
                    onChange={e => setNewOrder({ ...newOrder, itemId: e.target.value })}
                  >
                    {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newOrder.locationId}
                    onChange={e => setNewOrder({ ...newOrder, locationId: e.target.value })}
                  >
                    {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Quantity</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    value={newOrder.quantity || ''}
                    onChange={e => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 0 })}
                    min={1}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 transition duration-200 mt-2 flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" /> Reserve Stock
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
