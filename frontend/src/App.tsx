import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
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
  Search,
  ChevronRight,
  X,
  Clock,
  ChevronLeft,
  Briefcase,
  History,
  TrendingUp,
  FileSpreadsheet,
  Terminal
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'OPERATIONS' | 'SALES';
  locationId: string | null;
  locationCode: string | null;
}

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return 'https://transit-erp.onrender.com/api';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};
const API_BASE = getApiBase();
const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444', '#f59e0b'];

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );

  
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [warehousePinInput, setWarehousePinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showDevPanel, setShowDevPanel] = useState(false);

  
  const [activeTab, setActiveTab] = useState<'inventory' | 'work-orders' | 'transfers' | 'orders'>('inventory');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeWorkspace] = useState('Transit ERP Logistics');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedBatch] = useState('');
  const [orderWarehouse, setOrderWarehouse] = useState('');
  const [woWarehouse, setWoWarehouse] = useState('');
  const [transferWarehouse, setTransferWarehouse] = useState('');

  
  const [metadata, setMetadata] = useState<{
    locations: { id: string; name: string; code: string }[];
    items: { id: string; name: string; sku: string }[];
    users: { id: string; username: string; role: string }[];
  }>({ locations: [], items: [], users: [] });

  const [inventory, setInventory] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  
  const [isRadialOpen, setIsRadialOpen] = useState(false);

  
  const [newWO, setNewWO] = useState({ locationId: '', itemId: '', requiredQty: 0, assignedUserId: '' });
  const [newTransfer, setNewTransfer] = useState({ sourceLocationId: '', destLocationId: '', itemId: '', quantity: 0 });
  const [newOrder, setNewOrder] = useState({ itemId: '', locationId: '', quantity: 0, companyName: '' });
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', categoryName: 'Electronics', locationId: '', batchCode: 'B1', initialPhysicalQty: 50 });

  
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [editingPhysicalQty, setEditingPhysicalQty] = useState<number>(0);

  
  const [activeModal, setActiveModal] = useState<null | 'wo' | 'transfer' | 'order' | 'product'>(null);

  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  
  useEffect(() => {
    if (successMsg || errorMsg) {
      const t = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg, errorMsg]);

  
  useEffect(() => {
    if (token) {
      fetchMetadata();
      fetchTabContent();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (user?.locationId && user?.role !== 'ADMIN') {
      setWoWarehouse(user.locationId);
      setTransferWarehouse(user.locationId);
      setOrderWarehouse(user.locationId);
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: loginInput,
          password: passwordInput,
          warehousePin: warehousePinInput
        })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}. If Render backend is starting from sleep, please wait 30s and try again.`);
        }
      }
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSuccessMsg(`Welcome to Transit ERP, ${data.user.username}!`);
    } catch (err: any) {
      setAuthError(err.message || 'Unable to connect to backend server.');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newProduct)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create product');

      setSuccessMsg(`Product "${newProduct.name}" (${newProduct.sku}) added successfully!`);
      setActiveModal(null);
      setNewProduct({
        name: '',
        sku: '',
        categoryName: 'Electronics',
        locationId: metadata.locations[0]?.id || '',
        batchCode: 'B1',
        initialPhysicalQty: 50
      });
      fetchMetadata();
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding new product');
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
        if (data.locations.length > 0 && data.items.length > 0) {
          setNewWO({
            locationId: data.locations[0].id,
            itemId: data.items[0].id,
            requiredQty: 10,
            assignedUserId: data.users.find((u: any) => u.role === 'OPERATIONS')?.id || data.users[0].id
          });
          setNewTransfer({
            sourceLocationId: data.locations[0].id,
            destLocationId: data.locations[1]?.id || data.locations[0].id,
            itemId: data.items[0].id,
            quantity: 10
          });
          setNewOrder({
            locationId: data.locations[0].id,
            itemId: data.items[0].id,
            quantity: 10,
            companyName: ''
          });
          setNewProduct(prev => ({
            ...prev,
            locationId: prev.locationId || data.locations[0].id
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTabContent = async () => {
    try {
      const headers = getAuthHeader();
      if (user?.role === 'ADMIN' || user?.role === 'OPERATIONS' || user?.role === 'SALES') {
        const resInv = await fetch(`${API_BASE}/inventory`, { headers });
        if (resInv.ok) setInventory(await resInv.json());
      }
      if (user?.role === 'ADMIN' || user?.role === 'OPERATIONS') {
        const resTrans = await fetch(`${API_BASE}/transfers`, { headers });
        if (resTrans.ok) setTransfers(await resTrans.json());
      }
      const resWO = await fetch(`${API_BASE}/work-orders`, { headers });
      if (resWO.ok) setWorkOrders(await resWO.json());
      if (user?.role === 'ADMIN' || user?.role === 'SALES') {
        const resOrd = await fetch(`${API_BASE}/orders`, { headers });
        if (resOrd.ok) setOrders(await resOrd.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/${selectedRow.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ physicalQty: editingPhysicalQty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setSuccessMsg('Inventory quantity updated successfully.');
      setSelectedRow(null);
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
      setActiveModal(null);
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
      setActiveModal(null);
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

      setSuccessMsg('Transfer dispatched.');
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

      setSuccessMsg('Transfer received.');
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
      setActiveModal(null);
      fetchTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  
  const filteredInventory = useMemo(() => {
    return inventory.filter(inv => {
      const matchesSearch = inv.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? inv.categoryName === selectedCategory : true;
      const matchesLocation = selectedLocation ? inv.locationName === selectedLocation : true;
      const matchesBatch = selectedBatch ? inv.batchCode === selectedBatch : true;
      return matchesSearch && matchesCategory && matchesLocation && matchesBatch;
    });
  }, [inventory, searchTerm, selectedCategory, selectedLocation, selectedBatch]);

  
  const metrics = useMemo(() => {
    const totalPhysical = inventory.reduce((sum, inv) => sum + inv.physicalQty, 0);
    const totalReserved = inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);
    const activeWorkOrders = workOrders.filter(wo => wo.status !== 'COMPLETED').length;
    const pendingTransfers = transfers.filter(tr => tr.status !== 'RECEIVED').length;
    return { totalPhysical, totalReserved, activeWorkOrders, pendingTransfers };
  }, [inventory, workOrders, transfers]);

  
  const locationChartData = useMemo(() => {
    const locMap: { [key: string]: number } = {};
    inventory.forEach(inv => {
      const avail = inv.physicalQty - inv.reservedQty;
      locMap[inv.locationCode] = (locMap[inv.locationCode] || 0) + avail;
    });
    return Object.keys(locMap).map(key => ({ name: key, value: locMap[key] }));
  }, [inventory]);

  const categoryChartData = useMemo(() => {
    const catMap: { [key: string]: number } = {};
    inventory.forEach(inv => {
      const avail = inv.physicalQty - inv.reservedQty;
      catMap[inv.categoryName] = (catMap[inv.categoryName] || 0) + avail;
    });
    return Object.keys(catMap).map(key => ({ name: key, value: catMap[key] }));
  }, [inventory]);

  
  const timelineData = useMemo(() => {
    const list: any[] = [];
    transfers.forEach(tr => {
      list.push({
        type: 'transfer',
        title: `Transfer ${tr.status}`,
        detail: `${tr.quantity} ${tr.item.name} (${tr.sourceLocation.code} → ${tr.destLocation.code})`,
        time: new Date(tr.updatedAt).toLocaleTimeString(),
        color: tr.status === 'RECEIVED' ? 'text-emerald-600' : 'text-blue-600'
      });
    });
    orders.forEach(ord => {
      list.push({
        type: 'order',
        title: `Order Reserved`,
        detail: `${ord.quantity} units of ${ord.item.name} at ${ord.location.code}`,
        time: new Date(ord.updatedAt).toLocaleTimeString(),
        color: 'text-amber-600'
      });
    });
    workOrders.forEach(wo => {
      list.push({
        type: 'workorder',
        title: `Work Order ${wo.status.replace('_', ' ')}`,
        detail: `${wo.requiredQty} ${wo.item.name} assigned to ${wo.assignedUser?.username}`,
        time: new Date(wo.updatedAt).toLocaleTimeString(),
        color: wo.status === 'COMPLETED' ? 'text-emerald-600' : 'text-indigo-600'
      });
    });
    return list.slice(0, 5);
  }, [transfers, orders, workOrders]);

  
  if (!token || !user) {
    return (
      <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#F8FAFC] relative overflow-hidden font-sans">
        {}
        <div className="absolute inset-0 z-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(#4f46e5 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px'
        }} />

        {}
        <div className="lg:w-[55%] bg-[#080D1A] relative flex flex-col justify-between p-8 lg:p-12 xl:p-14 text-white overflow-hidden shrink-0 h-full border-b lg:border-b-0 lg:border-r border-slate-800/60">
          {}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#080D1A] to-[#080D1A] z-0" />
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px] z-0 pointer-events-none" />
          <div className="absolute top-1/2 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px] z-0 pointer-events-none" />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] z-0 pointer-events-none" />

          {}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between z-10 w-full"
          >
            <div className="flex items-center gap-4">
              {}
              <div className="relative flex items-center justify-center group cursor-pointer">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 rounded-full blur-lg opacity-40 group-hover:opacity-75 transition-opacity duration-500 animate-pulse pointer-events-none" />
                <img
                  src="/logo.png"
                  alt="Transit ERP Logo"
                  className="h-11 w-auto object-contain relative z-10 drop-shadow-[0_4px_16px_rgba(59,130,246,0.65)] group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {}
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-2xl tracking-tight text-white font-sans">
                    TRANSIT
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    Enterprise Operations Terminal
                  </span>
                </div>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-emerald-400 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE CLOUD</span>
            </div>
          </motion.div>

          {}
          <div className="my-auto py-4 space-y-5 max-w-xl z-10 relative">
            {}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 via-blue-500/15 to-cyan-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold tracking-wide shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Next-Gen Autonomous Supply Network</span>
            </div>

            {}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl lg:text-[44px] font-black tracking-tight leading-[1.08] text-white"
            >
              Command Every Hub.<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(56,189,248,0.25)]">
                Sync Every Transit.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-400 text-xs lg:text-sm leading-relaxed font-medium"
            >
              Hyper-scalable warehouse intelligence connecting real-time inventory reserves, automated work orders, and instant inter-hub dispatch across all enterprise branches.
            </motion.p>

            {}
            <AnimatePresence>
              {showDevPanel ? (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-[#090E17]/95 border border-emerald-500/30 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.1)] font-mono text-left relative overflow-hidden"
                >
                  {}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500 animate-pulse" />

                  {}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 items-center">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block shadow-sm"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block shadow-sm"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                      </div>

                      <span className="text-zinc-300 font-bold ml-1">DEVELOPER MODE CREDENTIALS</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDevPanel(false)}
                      className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1 group"
                      title="Close developer mode window"
                    >
                      <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                  </div>

                  {}

                  {}
                  <div className="space-y-2">
                    {}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginInput('admin@transit.com');
                        setPasswordInput('admin123');
                        setWarehousePinInput('');
                        setSuccessMsg('Loaded Master Admin credentials. Click Sign In.');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-500/50 transition cursor-pointer group text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-[11px]">&gt; ADMIN</span>
                          <span className="text-zinc-200 text-[11px] font-mono font-semibold">admin@transit.com</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Master Administrator Access</div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-mono">admin123</span>
                        <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform font-bold text-xs">Fill ↵</span>
                      </div>
                    </button>

                    {}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginInput('ops@transit.com');
                        setPasswordInput('ops123');
                        setWarehousePinInput('');
                        setSuccessMsg('Loaded Operations credentials. Click Sign In.');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 hover:bg-cyan-950/40 border border-zinc-800 hover:border-cyan-500/50 transition cursor-pointer group text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold text-[11px]">&gt; OPERATIONS</span>
                          <span className="text-zinc-200 text-[11px] font-mono font-semibold">ops@transit.com</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Warehouse Operations Terminal</div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-mono">ops123</span>
                        <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform font-bold text-xs">Fill ↵</span>
                      </div>
                    </button>

                    {}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginInput('sales@transit.com');
                        setPasswordInput('sales123');
                        setWarehousePinInput('');
                        setSuccessMsg('Loaded Sales credentials. Click Sign In.');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/50 transition cursor-pointer group text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-bold text-[11px]">&gt; SALES</span>
                          <span className="text-zinc-200 text-[11px] font-mono font-semibold">sales@transit.com</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Sales & Customer Orders Terminal</div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-mono">sales123</span>
                        <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform font-bold text-xs">Fill ↵</span>
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="button"
                  onClick={() => setShowDevPanel(true)}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold hover:bg-emerald-900/50 hover:border-emerald-400 transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.15)] group"
                >
                  <Terminal className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>&gt; Developer Mode</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-semibold">Demo</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {}
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono z-10 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>Transit ERP Enterprise Core</span>
            </div>
            <span className="text-[10px] text-slate-500">Transit Core</span>
          </div>
        </div>

        {}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10 relative">
          {}
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-[90px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[460px] p-8 lg:p-10 rounded-[32px] border border-white/80 shadow-[0_30px_90px_rgba(79,70,229,0.18),0_15px_35px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] bg-white/75 backdrop-blur-[30px] relative overflow-hidden"
          >
            {}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            {}
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign In</h2>
              <p className="text-slate-500 text-xs mt-1 font-semibold uppercase tracking-wider">
                Terminal credentials & warehouse authentication
              </p>
            </div>

            {}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider pl-1">
                  Username / Email
                </label>
                <input
                  type="text"
                  className="w-full bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-[16px] px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/15 focus:bg-white text-sm transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,1)] hover:border-slate-300 hover:bg-white"
                  placeholder="admin@transit.com / ops@... / sales@..."
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider pl-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-[16px] px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/15 focus:bg-white text-sm transition-all duration-300 pr-12 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,1)] hover:border-slate-300 hover:bg-white"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    required
                  />
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>

              {}
              <div className="space-y-1.5">
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider pl-1 flex items-center justify-between">
                  <span>Warehouse Branch PIN</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  className="w-full bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-[16px] px-5 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/15 focus:bg-white text-sm font-mono tracking-widest transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,1)]"
                  placeholder="secret warehouse pin"
                  value={warehousePinInput}
                  onChange={e => setWarehousePinInput(e.target.value)}
                />

                {}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setWarehousePinInput('11')}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${warehousePinInput === '11'
                      ? 'bg-purple-100 border-purple-400 text-purple-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                  >
                    11 MYS
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousePinInput('22')}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${warehousePinInput === '22'
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                  >
                    22 MAA
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousePinInput('33')}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${warehousePinInput === '33'
                      ? 'bg-cyan-100 border-cyan-400 text-cyan-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                  >
                    33 BLR
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousePinInput('00')}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${warehousePinInput === '00'
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                  >
                    00 ALL
                  </button>
                </div>
              </div>

              {authError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-[14px] p-3 text-rose-600 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="group w-full bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#2563EB] hover:from-[#4338CA] hover:to-[#1D4ED8] text-white font-extrabold rounded-[16px] py-4 transition-all duration-300 shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.55)] hover:-translate-y-0.5 cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
              >
                <span>Sign In</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {}
              <div className="pt-3 mt-3 border-t border-slate-200/70 flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <p className="text-[11px] font-mono text-slate-600 font-semibold">
                    This website is currently in developer mode, and all credentials provided are for testing purposes only
                  </p>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f8fafc] text-slate-800 flex overflow-hidden relative font-sans">
      <div className="animated-bg"></div>
      <div className="aurora-glow"></div>
      <div className="noise-overlay"></div>

      {}
      <aside
        className={`bg-white/90 backdrop-blur-2xl border-r border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 z-30 shadow-sm h-screen shrink-0 overflow-hidden ${isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Transit ERP Logo" className="h-9 object-contain" />
              {!isSidebarCollapsed && (
                <span className="font-extrabold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                  Transit ERP
                </span>
              )}
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-md cursor-pointer transition hidden md:block"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {}
          {!isSidebarCollapsed && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <div className="truncate text-xs font-bold text-slate-700">{activeWorkspace}</div>
            </div>
          )}

          {}
          <nav className="space-y-1.5">
            {(user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition duration-200 cursor-pointer ${activeTab === 'inventory'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Layers className="h-4 w-4" />
                {!isSidebarCollapsed && <span>Inventory</span>}
              </button>
            )}

            <button
              onClick={() => setActiveTab('work-orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition duration-200 cursor-pointer ${activeTab === 'work-orders'
                ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <FileText className="h-4 w-4" />
              {!isSidebarCollapsed && <span>Work Orders</span>}
            </button>

            {(user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
              <button
                onClick={() => setActiveTab('transfers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition duration-200 cursor-pointer ${activeTab === 'transfers'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Send className="h-4 w-4" />
                {!isSidebarCollapsed && <span>Transfers</span>}
              </button>
            )}

            {(user.role === 'ADMIN' || user.role === 'SALES') && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition duration-200 cursor-pointer ${activeTab === 'orders'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {!isSidebarCollapsed && <span>Customer Orders</span>}
              </button>
            )}
          </nav>
        </div>

        {}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center relative">
              <User className="h-4 w-4 text-indigo-600" />
              <div className="h-2 w-2 bg-emerald-500 rounded-full absolute bottom-0 right-0 border border-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="truncate">
                <div className="text-sm font-bold text-slate-800 truncate max-w-[130px]">{user.username}</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user.role}</div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {}
      <div className="flex-1 overflow-y-auto h-screen">
        {}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 flex items-center gap-3 bg-white border border-emerald-200 rounded-2xl p-4 text-emerald-700 text-sm shadow-xl z-50"
            >
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>{successMsg}</span>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 flex items-center gap-3 bg-white border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm shadow-xl z-50"
            >
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {}
        <div className="max-w-7xl mx-auto px-6 md:px-8 pb-0 pt-6 space-y-8">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-sm backdrop-blur-md">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 capitalize">
                  {activeTab.replace('-', ' ')}
                </h1>
                <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Live Warehouse Qty
                </span>
                {user.locationCode && user.role !== 'ADMIN' && (
                  <span className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    🏢 {user.locationCode} Hub Restricted
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-1 text-sm">
                {user.locationCode && user.role !== 'ADMIN'
                  ? `Dedicated terminal for ${user.locationCode} warehouse hub.`
                  : 'Transit ERP Executive Terminal'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              {}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[16px] text-xs font-bold text-slate-600">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span>{currentTime}</span>
              </div>

              <button
                onClick={fetchTabContent}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[16px] text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                <span>Sync</span>
              </button>

              <button
                onClick={() => {
                  if (activeTab === 'inventory') setActiveModal('product');
                  else if (user.role === 'ADMIN') setActiveModal('wo');
                  else if (user.role === 'OPERATIONS') setActiveModal('transfer');
                  else if (user.role === 'SALES') setActiveModal('order');
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-[16px] px-5 py-2.5 text-xs transition cursor-pointer flex items-center gap-2 shadow-sm shadow-blue-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Action console
              </button>
            </div>
          </header>

          {}
          {activeTab === 'inventory' && (user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
            <div className="space-y-8">
              {}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    title: 'Total Stock',
                    value: metrics.totalPhysical,
                    desc: 'Aggregate physical units',
                    sparkline: [20, 30, 45, 35, 60, 50, 80]
                  },
                  {
                    title: 'Reserved Stock',
                    value: metrics.totalReserved,
                    desc: 'Customer committed items',
                    sparkline: [10, 20, 15, 30, 25, 40, 35]
                  },
                  {
                    title: 'Active Work Orders',
                    value: metrics.activeWorkOrders,
                    desc: 'Admin allocated tasks',
                    sparkline: [5, 12, 8, 15, 10, 18, 14]
                  },
                  {
                    title: 'Pending Transfers',
                    value: metrics.pendingTransfers,
                    desc: 'Inter-warehouse transit',
                    sparkline: [2, 4, 3, 7, 5, 8, 6]
                  }
                ].map((card, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4 }}
                    className="glass-card rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden group shadow-sm bg-white border border-slate-200"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-transparent to-slate-50 rounded-full pointer-events-none transition group-hover:scale-125" />
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{card.title}</span>
                      <h3 className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">{card.value}</h3>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">{card.desc}</span>
                      {}
                      <svg className="w-16 h-8 text-blue-600 stroke-current fill-none stroke-[2]" viewBox="0 0 70 30">
                        <path d={card.sparkline.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${i * 10} ${30 - val / 3}`, '')} />
                      </svg>
                    </div>
                  </motion.div>
                ))}
              </section>

              {}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {}
                  <div className="glass-card rounded-[24px] p-6 space-y-4 shadow-sm bg-white border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Stock by Location
                    </h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={locationChartData}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <ReTooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px' }} />
                          <Bar dataKey="value" fill="url(#blueGrad)" radius={[8, 8, 0, 0]}>
                            {locationChartData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {}
                  <div className="glass-card rounded-[24px] p-6 space-y-4 shadow-sm bg-white border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      Category Breakdown
                    </h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryChartData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px' }} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {}
                <div className="glass-card rounded-[24px] p-6 space-y-6 shadow-sm bg-white border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <History className="h-4 w-4 text-cyan-600" />
                    Activity Feed
                  </h4>
                  <div className="space-y-4 relative">
                    <div className="absolute left-4 top-1.5 bottom-1.5 w-0.5 bg-slate-100" />
                    {timelineData.length === 0 ? (
                      <div className="text-slate-400 text-xs text-center py-6">No recent warehouse transactions.</div>
                    ) : (
                      timelineData.map((item, idx) => (
                        <div key={idx} className="flex gap-4 relative z-10 pl-1.5">
                          <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-indigo-600 mt-1 shrink-0">
                            •
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <span>{item.title}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{item.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{item.detail}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] p-4 flex flex-wrap items-center gap-4 justify-between shadow-sm">
                <div className="flex flex-wrap items-center gap-3.5 flex-1 min-w-[280px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search SKU or Item..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-[14px] pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-400"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="bg-white border border-slate-200 rounded-[14px] px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none cursor-pointer"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(inventory.map(inv => inv.categoryName))).map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    className="bg-white border border-slate-200 rounded-[14px] px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none cursor-pointer"
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {Array.from(new Set(inventory.map(inv => inv.locationName))).map((loc, i) => (
                      <option key={i} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModal('product')}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-[14px] text-xs transition cursor-pointer shadow-sm shadow-blue-500/20 hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Product</span>
                  </button>

                  <button
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,"
                        + ["Item,SKU,Category,Location,Batch,Physical Qty,Reserved Qty,Available Qty"].join(",") + "\n"
                        + filteredInventory.map(e => `${e.itemName},${e.sku},${e.categoryName},${e.locationName},${e.batchCode},${e.physicalQty},${e.reservedQty},${e.availableQty}`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Transit_Inventory_Status.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setSuccessMsg("Exporting CSV report...");
                    }}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[14px] text-sm text-slate-600 cursor-pointer transition"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="p-4">SKU / Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Batch</th>
                      <th className="p-4">Physical Qty</th>
                      <th className="p-4">Reserved Qty</th>
                      <th className="p-4">Available Qty</th>
                      <th className="p-4 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No inventory records matching filters.</td>
                      </tr>
                    ) : (
                      filteredInventory.map((inv) => (
                        <tr
                          key={inv.id}
                          onClick={() => {
                            setSelectedRow(inv);
                            setEditingPhysicalQty(inv.physicalQty);
                          }}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block group-hover:text-blue-600 transition-colors">{inv.itemName}</span>
                            <span className="text-xs text-slate-400 font-mono tracking-wider">{inv.sku}</span>
                          </td>
                          <td className="p-4 text-slate-600 font-semibold">{inv.categoryName}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${inv.locationCode === 'BLR' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                              inv.locationCode === 'MYS' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                                'bg-cyan-50 border-cyan-200 text-cyan-600'
                              }`}>
                              {inv.locationName}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 font-mono">{inv.batchCode}</td>
                          <td className="p-4 font-bold text-slate-700">{inv.physicalQty}</td>
                          <td className="p-4 text-slate-400 font-semibold">{inv.reservedQty}</td>
                          <td className="p-4">
                            <span className={`font-bold px-2 py-1 rounded-md ${inv.availableQty <= 10 ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}>
                              {inv.availableQty} Units
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {}
          {activeTab === 'work-orders' && (
            <div className="space-y-8">

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Warehouse Work Orders</h3>
                    <p className="text-xs text-slate-500 mt-1">Select a warehouse to view stock levels and manage work orders.</p>
                  </div>
                  {user.role !== 'SALES' && (
                    <button
                      onClick={() => {
                        if (woWarehouse) {
                          setNewWO({ ...newWO, locationId: woWarehouse });
                        }
                        setActiveModal('wo');
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0"
                    >
                      + New Work Order
                    </button>
                  )}
                </div>

                {}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <button
                    onClick={() => setWoWarehouse('')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${woWarehouse === ''
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    All Warehouses
                  </button>
                  {metadata.locations.map(l => {
                    const locInventory = inventory.filter(inv => inv.locationId === l.id);
                    const totalStock = locInventory.reduce((s, inv) => s + inv.physicalQty, 0);
                    const totalReserved = locInventory.reduce((s, inv) => s + inv.reservedQty, 0);
                    const available = totalStock - totalReserved;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setWoWarehouse(l.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${woWarehouse === l.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {l.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${woWarehouse === l.id
                          ? 'bg-white/20 text-white/90'
                          : available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                          }`}>
                          {available} avail
                        </span>
                      </button>
                    );
                  })}
                </div>

                {}
                <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                  <div className="p-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Stock at {woWarehouse ? metadata.locations.find(l => l.id === woWarehouse)?.name : 'All Warehouses'}
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="p-3">Item</th>
                        {!woWarehouse && <th className="p-3">Location</th>}
                        <th className="p-3">Physical</th>
                        <th className="p-3">Reserved</th>
                        <th className="p-3">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {inventory.filter(inv => !woWarehouse || inv.locationId === woWarehouse).length === 0 ? (
                        <tr><td colSpan={!woWarehouse ? 5 : 4} className="p-4 text-center text-slate-400 text-xs">No inventory at this warehouse.</td></tr>
                      ) : (
                        inventory.filter(inv => !woWarehouse || inv.locationId === woWarehouse).map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-700">{inv.itemName} <span className="text-slate-400 font-normal">({inv.sku})</span></td>
                            {!woWarehouse && (
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${inv.locationCode === 'BLR' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                  inv.locationCode === 'MYS' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                                    'bg-cyan-50 border-cyan-200 text-cyan-600'
                                  }`}>
                                  {inv.locationName}
                                </span>
                              </td>
                            )}
                            <td className="p-3 text-slate-600">{inv.physicalQty}</td>
                            <td className="p-3 text-slate-400">{inv.reservedQty}</td>
                            <td className="p-3">
                              <span className={`font-bold ${inv.availableQty > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {inv.availableQty}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    {woWarehouse ? `Work Orders — ${metadata.locations.find(l => l.id === woWarehouse)?.name}` : 'All Work Orders'}
                  </h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="p-4">Item & Location</th>
                      <th className="p-4">Required Qty</th>
                      <th className="p-4">Assigned User</th>
                      <th className="p-4">Shortage</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {workOrders.filter(wo => !woWarehouse || wo.location?.id === woWarehouse || wo.locationId === woWarehouse).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No work orders found.</td>
                      </tr>
                    ) : (
                      workOrders.filter(wo => !woWarehouse || wo.location?.id === woWarehouse || wo.locationId === woWarehouse).map((wo) => (
                        <tr key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{wo.item.name}</span>
                            <span className="text-xs text-slate-400 font-bold">{wo.location.name}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{wo.requiredQty} Units</td>
                          <td className="p-4 text-slate-600 font-semibold">{wo.assignedUser?.username}</td>
                          <td className="p-4">
                            <span className={`font-extrabold px-2 py-0.5 rounded border ${wo.shortage > 0 ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                              {wo.shortage} units
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${wo.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              wo.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                'bg-blue-50 text-blue-600 border-blue-200'
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
                                    className="bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500 hover:text-black px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition cursor-pointer"
                                  >
                                    Start Task
                                  </button>
                                )}
                                {wo.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => handleUpdateWorkOrderStatus(wo.id, 'COMPLETED')}
                                    className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition cursor-pointer"
                                  >
                                    Mark Complete
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
          )}

          {}
          {activeTab === 'transfers' && (user.role === 'ADMIN' || user.role === 'OPERATIONS') && (
            <div className="space-y-8">
              {}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Warehouse Inventory Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-1">Select a warehouse to view live product availability across hubs.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setTransferWarehouse('')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${transferWarehouse === ''
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      All Warehouses
                    </button>
                    {metadata.locations.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setTransferWarehouse(l.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${transferWarehouse === l.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>

                {}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Stock at {transferWarehouse ? metadata.locations.find(l => l.id === transferWarehouse)?.name : 'All Warehouses'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {inventory.filter(inv => !transferWarehouse || inv.locationId === transferWarehouse).reduce((acc, i) => acc + i.availableQty, 0)} Total Available Units
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="p-3.5">Item & SKU</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Location</th>
                        <th className="p-3.5">Batch</th>
                        <th className="p-3.5">Physical Qty</th>
                        <th className="p-3.5">Reserved Qty</th>
                        <th className="p-3.5">Available for Transfer</th>
                        <th className="p-3.5 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {inventory.filter(inv => !transferWarehouse || inv.locationId === transferWarehouse).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">No inventory found at this warehouse.</td>
                        </tr>
                      ) : (
                        inventory.filter(inv => !transferWarehouse || inv.locationId === transferWarehouse).map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5 font-bold text-slate-800">
                              <span>{inv.itemName}</span>
                              <span className="text-xs text-slate-400 font-normal block">{inv.sku}</span>
                            </td>
                            <td className="p-3.5 text-slate-500 text-xs font-medium">
                              {inv.categoryName || 'General'}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${inv.locationCode === 'BLR' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                inv.locationCode === 'MYS' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                                  'bg-cyan-50 border-cyan-200 text-cyan-600'
                                }`}>
                                {inv.locationName}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 font-mono text-xs">
                              {inv.batchCode || '—'}
                            </td>
                            <td className="p-3.5 font-bold text-slate-700">{inv.physicalQty}</td>
                            <td className="p-3.5 text-slate-400">{inv.reservedQty}</td>
                            <td className="p-3.5">
                              <span className={`font-bold px-2.5 py-1 rounded-lg text-xs ${inv.availableQty > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-600 bg-rose-50 border border-rose-100'
                                }`}>
                                {inv.availableQty} Units
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => {
                                  setNewTransfer({ ...newTransfer, sourceLocationId: inv.locationId, itemId: inv.itemId });
                                  setActiveModal('transfer');
                                }}
                                disabled={inv.availableQty <= 0}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${inv.availableQty > 0
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:scale-105 cursor-pointer'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                  }`}
                              >
                                Transfer
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h3 className="font-extrabold text-slate-800 text-lg">Active Stock Transfers</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="p-4">Item</th>
                      <th className="p-4">Route Path</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Batch</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No stock transfers recorded.</td>
                      </tr>
                    ) : (
                      transfers.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{tr.item.name}</td>
                          <td className="p-4 text-slate-600 font-bold">
                            {tr.sourceLocation.code} → {tr.destLocation.code}
                          </td>
                          <td className="p-4 font-bold text-slate-700">{tr.quantity} units</td>
                          <td className="p-4 text-slate-400 font-mono">{tr.batchCode || 'Not allocated'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tr.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              tr.status === 'DISPATCHED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                              {tr.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {tr.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleDispatchTransfer(tr.id)}
                                className="bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition cursor-pointer"
                              >
                                Dispatch Stock
                              </button>
                            )}
                            {tr.status === 'DISPATCHED' && (
                              <button
                                onClick={() => handleReceiveTransfer(tr.id)}
                                className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <Truck className="h-3 w-3" /> Receive Stock
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
          )}

          {}
          {activeTab === 'orders' && (user.role === 'ADMIN' || user.role === 'SALES') && (
            <div className="space-y-8">

              {}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Reserve from Warehouse</h3>
                    <p className="text-xs text-slate-500 mt-1">Select a warehouse to view live inventory and place reservations.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setOrderWarehouse('')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${orderWarehouse === ''
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      All Warehouses
                    </button>
                    {metadata.locations.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setOrderWarehouse(l.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${orderWarehouse === l.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="p-4">Item (SKU)</th>
                        <th className="p-4">Available Stock</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {inventory.filter(inv => !orderWarehouse || inv.locationId === orderWarehouse).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-400 font-medium">No stock available in this warehouse.</td>
                        </tr>
                      ) : (
                        inventory.filter(inv => !orderWarehouse || inv.locationId === orderWarehouse).map(inv => {
                          const available = inv.physicalQty - inv.reservedQty;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <span className="font-bold text-slate-800 block">{inv.itemName}</span>
                                <span className="text-xs text-slate-400 font-bold">{inv.sku}</span>
                              </td>
                              <td className="p-4">
                                <span className={`font-bold ${available > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {available} Units
                                </span>
                                <span className="text-xs text-slate-400 block mt-0.5">Physical: {inv.physicalQty} | Reserved: {inv.reservedQty}</span>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => {
                                    setNewOrder({ ...newOrder, locationId: inv.locationId, itemId: inv.itemId });
                                    setActiveModal('order');
                                  }}
                                  disabled={available <= 0}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${available > 0
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                  Reserve
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h3 className="font-extrabold text-slate-800 text-lg">Active Customer Orders</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="p-4">Item & Location</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Ordered Quantity</th>
                      <th className="p-4">Reserved Quantity</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">No customer orders recorded.</td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{ord.item.name}</span>
                            <span className="text-xs text-slate-400 font-bold">{ord.location.name}</span>
                          </td>
                          <td className="p-4 font-semibold text-slate-700">
                            {ord.companyName || <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="p-4 font-bold text-slate-700">{ord.quantity} Units</td>
                          <td className="p-4 text-slate-400 font-semibold">{ord.reservedQty} Reserved</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ord.status === 'RESERVED'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
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
          )}

        </div>

        {}
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            onClick={() => setIsRadialOpen(!isRadialOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg cursor-pointer"
          >
            {isRadialOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </motion.button>

          <AnimatePresence>
            {isRadialOpen && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute bottom-16 right-0 bg-white border border-slate-200 rounded-[20px] shadow-2xl p-4 w-52 space-y-2"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-1.5">ERP Quick Actions</div>
                <button
                  onClick={() => { setIsRadialOpen(false); setActiveModal('product'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-500" />
                  Add New Product
                </button>
                <button
                  onClick={() => { setIsRadialOpen(false); setActiveModal('wo'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-violet-500" />
                  Allocate Work Order
                </button>
                <button
                  onClick={() => { setIsRadialOpen(false); setActiveModal('transfer'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-cyan-500" />
                  Request Transfer
                </button>
                <button
                  onClick={() => { setIsRadialOpen(false); setActiveModal('order'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
                  Reserve Stock
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {}
        <AnimatePresence>
          {selectedRow && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex justify-end">
              <div className="absolute inset-0" onClick={() => setSelectedRow(null)} />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-md bg-white border-l border-slate-200 p-6 shadow-2xl relative z-10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Item Inventory Card</h3>
                    <button onClick={() => setSelectedRow(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 cursor-pointer">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-55 border border-slate-100 p-4 rounded-2xl flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                        <Layers className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{selectedRow.itemName}</h4>
                        <span className="text-xs text-slate-450 font-mono uppercase tracking-wider">SKU: {selectedRow.sku}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Warehouse Site</span>
                        <span className="text-slate-700 text-sm font-bold mt-1 block">{selectedRow.locationName}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Batch Code</span>
                        <span className="text-slate-700 text-sm font-mono mt-1 block">{selectedRow.batchCode}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold">Physical Quantity:</span>
                        <span className="font-bold text-slate-800">{selectedRow.physicalQty} Units</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold">Reserved Quantity:</span>
                        <span className="font-bold text-slate-500">{selectedRow.reservedQty} Units</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-650 font-bold">Available Quantity:</span>
                        <span className="font-extrabold text-emerald-600">{selectedRow.availableQty} Units</span>
                      </div>
                    </div>

                    {user.role !== 'SALES' && (
                      <form onSubmit={handleUpdateInventory} className="space-y-3.5 pt-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust Physical Inventory</h4>
                        <div>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 text-sm"
                            value={editingPhysicalQty}
                            onChange={e => setEditingPhysicalQty(parseInt(e.target.value) || 0)}
                            min={selectedRow.reservedQty}
                            required
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">Cannot be lower than reservation ({selectedRow.reservedQty}).</span>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl py-2.5 text-xs transition cursor-pointer"
                        >
                          Commit Stock Update
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {}
        <AnimatePresence>
          {activeModal && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0" onClick={() => setActiveModal(null)} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white border border-slate-200 rounded-[24px] max-w-md w-full p-6 shadow-2xl relative z-10"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-800">
                    {activeModal === 'product' ? 'Add New Product & Stock' : activeModal === 'wo' ? 'Allocate Work Order' : activeModal === 'transfer' ? 'Request Stock Transfer' : 'Reserve Stock'}
                  </h3>
                  <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-650 p-1 rounded hover:bg-slate-50 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {}
                {activeModal === 'product' && (
                  <form onSubmit={handleCreateProduct} className="space-y-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Product Name</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={newProduct.name}
                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="e.g. Wireless Router"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">SKU Code</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none uppercase"
                          value={newProduct.sku}
                          onChange={e => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                          placeholder="RTR-001"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Category</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none"
                          value={newProduct.categoryName}
                          onChange={e => setNewProduct({ ...newProduct, categoryName: e.target.value })}
                          placeholder="Electronics"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Initial Warehouse Hub</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newProduct.locationId}
                        onChange={e => setNewProduct({ ...newProduct, locationId: e.target.value })}
                      >
                        {metadata.locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Batch Code</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none uppercase"
                          value={newProduct.batchCode}
                          onChange={e => setNewProduct({ ...newProduct, batchCode: e.target.value.toUpperCase() })}
                          placeholder="B1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Initial Stock Qty</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none"
                          value={newProduct.initialPhysicalQty}
                          onChange={e => setNewProduct({ ...newProduct, initialPhysicalQty: parseInt(e.target.value) || 0 })}
                          min={1}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl py-3 text-xs transition mt-2 cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Save & Initialize Stock
                    </button>
                  </form>
                )}

                {}
                {activeModal === 'wo' && (
                  <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Item</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newWO.itemId}
                        onChange={e => setNewWO({ ...newWO, itemId: e.target.value })}
                      >
                        {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider">Location</label>
                        {user?.locationId && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            🏢 Locked to {user.locationCode || 'Branch'}
                          </span>
                        )}
                      </div>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        value={user?.locationId || newWO.locationId}
                        disabled={!!user?.locationId}
                        onChange={e => setNewWO({ ...newWO, locationId: e.target.value })}
                      >
                        {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                      {user?.locationId && (
                        <p className="text-[10px] text-slate-400 mt-1">Work orders are restricted to your assigned branch.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Required Quantity</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                        value={newWO.requiredQty || ''}
                        onChange={e => setNewWO({ ...newWO, requiredQty: parseInt(e.target.value) || 0 })}
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Assigned User</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newWO.assignedUserId}
                        onChange={e => setNewWO({ ...newWO, assignedUserId: e.target.value })}
                      >
                        {metadata.users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl py-3 text-xs transition mt-2 cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Commit Work Order
                    </button>
                  </form>
                )}

                {}
                {activeModal === 'transfer' && (
                  <form onSubmit={handleCreateTransfer} className="space-y-4">
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Item</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newTransfer.itemId}
                        onChange={e => setNewTransfer({ ...newTransfer, itemId: e.target.value })}
                      >
                        {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider">Source Location (Origin)</label>
                        {user?.locationId && (
                          <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                            🏢 Current Branch ({user.locationCode || 'Origin'})
                          </span>
                        )}
                      </div>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        value={user?.locationId || newTransfer.sourceLocationId}
                        disabled={!!user?.locationId}
                        onChange={e => setNewTransfer({ ...newTransfer, sourceLocationId: e.target.value })}
                      >
                        {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                      {user?.locationId && (
                        <p className="text-[10px] text-slate-400 mt-1">Transfers must originate from your current warehouse branch.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Destination Location (Target)</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newTransfer.destLocationId}
                        onChange={e => setNewTransfer({ ...newTransfer, destLocationId: e.target.value })}
                      >
                        {metadata.locations
                          .filter(l => !user?.locationId || l.id !== user.locationId)
                          .map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Select any other destination warehouse to receive stock.</p>
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Transfer Quantity</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                        value={newTransfer.quantity || ''}
                        onChange={e => setNewTransfer({ ...newTransfer, quantity: parseInt(e.target.value) || 0 })}
                        min={1}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl py-3 text-xs transition mt-2 cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Commit Stock Transfer
                    </button>
                  </form>
                )}

                {}
                {activeModal === 'order' && (
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Item</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        value={newOrder.itemId}
                        onChange={e => setNewOrder({ ...newOrder, itemId: e.target.value })}
                      >
                        {metadata.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider">Reservation Location</label>
                        {user?.locationId && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            🏢 Locked to {user.locationCode || 'Branch'}
                          </span>
                        )}
                      </div>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        value={user?.locationId || newOrder.locationId}
                        disabled={!!user?.locationId}
                        onChange={e => setNewOrder({ ...newOrder, locationId: e.target.value })}
                      >
                        {metadata.locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                      {user?.locationId && (
                        <p className="text-[10px] text-slate-400 mt-1">Customer reservations are restricted to your assigned branch.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Order Quantity</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                        value={newOrder.quantity || ''}
                        onChange={e => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 0 })}
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-655 text-xs font-bold uppercase tracking-wider mb-2">Company Name</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={newOrder.companyName || ''}
                        onChange={e => setNewOrder({ ...newOrder, companyName: e.target.value })}
                        placeholder="e.g. Acme Corp"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl py-3 text-xs transition mt-2 cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Commit Stock Reservation
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
