
import React, { useState, useEffect, useCallback } from 'react';
import { Auth } from './components/Auth';
import { dataService } from './services/dataService';
import { formatDateFriendly, getTodayString } from './utils/time';
import { Delivery, Patient, HCP, Custody, PRODUCTS, StockTransaction, UserProfile, UserRole } from './types';
import { 
  LogOut, 
  LogIn,
  Plus, 
  Search,
  Users, 
  Package, 
  Activity,
  Hexagon,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  Database,
  Syringe,
  Lock,
  ShieldCheck,
  BarChart3,
  UserCircle,
  Stethoscope,
  Building2,
  ArrowRight,
  ArrowLeftRight,
  Briefcase,
  Store,
  X,
  Undo2,
  History,
  Pencil,
  Save,
  Trash2,
  Info,
  Download,
  ArrowLeft,
  RefreshCw,
  Loader2,
  RotateCcw,
  Shield,
  UserCog,
  Network,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { AIReportModal } from './components/AIReportModal';
import { ProfileModal } from './components/ProfileModal';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const METADATA = {
  name: "SPIN v2.0.024",
  version: "2.0.024"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

// --- CUSTOM DATE INPUT TO FORCE DD/MM/YYYY ---
// Ensures strict user input compliance and consistent display
const DateInput = ({ value, onChange, className, required, placeholder }: { value: string, onChange: (val: string) => void, className?: string, required?: boolean, placeholder?: string }) => {
    // Value = YYYY-MM-DD (ISO) for backend/storage
    // Display = DD/MM/YYYY
    
    // Convert YYYY-MM-DD -> DD/MM/YYYY
    const formatDisplay = (iso: string) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${y}`;
    };

    const [displayVal, setDisplayVal] = useState(formatDisplay(value));

    useEffect(() => {
        setDisplayVal(formatDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;
        // Allow only numbers and slash
        input = input.replace(/[^0-9/]/g, '');
        
        // Auto-insert slash logic for better UX
        if (input.length === 2 && displayVal.length === 1) input += '/';
        if (input.length === 5 && displayVal.length === 4) input += '/';
        
        setDisplayVal(input);

        // Try to parse if complete (DD/MM/YYYY = 10 chars)
        if (input.length === 10) {
            const [d, m, y] = input.split('/');
            if (d && m && y && !isNaN(Number(d)) && !isNaN(Number(m)) && !isNaN(Number(y))) {
                // Simple validation
                const date = new Date(`${y}-${m}-${d}`);
                if (!isNaN(date.getTime())) {
                    onChange(`${y}-${m}-${d}`);
                }
            }
        } else if (input === '') {
            onChange('');
        }
    };

    return (
        <div className="relative">
            <input 
                type="text"
                placeholder={placeholder || "DD/MM/YYYY"}
                maxLength={10}
                className={`${className} font-mono tracking-widest`}
                value={displayVal}
                onChange={handleChange}
                required={required}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-bold bg-white px-1">
                DD/MM/YYYY
            </div>
        </div>
    );
};

// --- TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);
    const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    return (
        <div className={`fixed bottom-6 right-6 z-[100] ${bg} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300`}>
            {type === 'success' && <CheckCircle className="w-5 h-5" />}
            {type === 'error' && <AlertTriangle className="w-5 h-5" />}
            {type === 'info' && <Info className="w-5 h-5" />}
            <span className="font-bold text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1"><X className="w-4 h-4" /></button>
        </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // For Admin
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dbView, setDbView] = useState<DBView>('deliveries');
  
  // Data States
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [repCustody, setRepCustody] = useState<Custody | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Suggestions & Filters
  const [educatorSuggestions, setEducatorSuggestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Delivery Form States
  const [step, setStep] = useState(1);
  const [nidSearch, setNidSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [newPatientForm, setNewPatientForm] = useState({ full_name: '', phone_number: '' });
  
  const [selectedHCP, setSelectedHCP] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0].id);
  const [selectedCustody, setSelectedCustody] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(getTodayString());
  const [rxDate, setRxDate] = useState('');
  const [educatorName, setEducatorName] = useState('');
  const [educatorDate, setEducatorDate] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Admin States
  const [adminSearch, setAdminSearch] = useState('');

  // Stock Forms
  const [receiveForm, setReceiveForm] = useState({ quantity: 0, educatorName: '', date: getTodayString() });
  const [transferForm, setTransferForm] = useState({ toCustodyId: '', quantity: 0, date: getTodayString() });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setNotification({ msg, type });
  };

  // Check Auth
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
        });
      }
      setAuthLoading(false);
    };
    checkSession();
  }, []);

  // --- HIERARCHY CALCULATION ---
  // Recursive function to get all subordinates' IDs
  const getNetworkIds = useCallback((rootUser: UserProfile, profiles: UserProfile[]): string[] => {
      if (rootUser.role === 'admin') return profiles.map(p => p.id);
      if (rootUser.role === 'rep') return [rootUser.id];

      // Find direct reports
      const directReports = profiles.filter(p => p.reports_to === rootUser.id);
      
      let networkIds = [rootUser.id, ...directReports.map(dr => dr.id)];
      
      // If LM, drill down to their DMs' Reps
      directReports.forEach(dr => {
          if (dr.role === 'dm') {
              const reps = profiles.filter(p => p.reports_to === dr.id);
              networkIds = [...networkIds, ...reps.map(r => r.id)];
          }
      });

      return [...new Set(networkIds)];
  }, []);

  // Load Data
  const loadData = useCallback(async () => {
    if (!user) return;
    
    const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch (e) { console.error("Fetch error:", e); return fallback; }
    };

    try {
      const [d, h, c, s, p, profiles] = await Promise.all([
        safeFetch(() => dataService.getDeliveries(), []),
        safeFetch(() => dataService.getHCPs(), []),
        safeFetch(() => dataService.getCustodies(), []),
        safeFetch(() => dataService.getStockTransactions(), []),
        safeFetch(() => dataService.getPatients(), []),
        safeFetch(() => dataService.getAllProfiles(), [])
      ]);
      
      setDeliveries(d); setHcps(h); setCustodies(c); setStockTransactions(s); setPatients(p); setAllUsers(profiles);
      
      const repC = await dataService.getRepCustody();
      setRepCustody(repC);

      // Suggestions
      const edSet = new Set<string>();
      d.forEach(item => { if (item.educator_name) edSet.add(item.educator_name); });
      setEducatorSuggestions(Array.from(edSet).sort());

    } catch (error) { console.error("Critical Load error", error); }
  }, [user]);

  // Fetch Profile & Handle Default Admin
  useEffect(() => {
    if (user) {
        loadData();
        const fetchProfile = async () => {
            if (isSupabaseConfigured() && supabase) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                
                // EMERGENCY ADMIN ACCESS for 'admin@spin.com'
                if (user.email === 'admin@spin.com') {
                    setUserProfile({
                        id: user.id,
                        email: user.email,
                        full_name: 'Super Admin',
                        role: 'admin',
                        access: 'yes',
                        reports_to: undefined
                    });
                    if (!data) showToast("Emergency Admin Access Granted", "info");
                    return;
                }

                if (data) {
                    if (data.access === 'yes') {
                        setUserProfile(data);
                    } else {
                        await supabase.auth.signOut();
                        setUser(null);
                        showToast("Account pending approval from Admin.", "info");
                    }
                } else {
                    // Profile missing (white screen fix)
                    setUserProfile({
                        id: user.id,
                        email: user.email,
                        full_name: 'Unknown User',
                        role: 'pending',
                        access: 'no'
                    });
                }
            } else {
                // Demo Mode
                setUserProfile({ 
                    id: user.id, full_name: 'Demo User', role: 'admin', access: 'yes', email: user.email 
                });
            }
        };
        fetchProfile();
    } else {
        setDeliveries([]); setUserProfile(null);
    }
  }, [user, loadData]);

  // Filtering logic
  const getAccessibleDeliveries = () => {
      if (!userProfile) return [];
      if (userProfile.role === 'admin' || userProfile.role === 'lm') {
          const ids = getNetworkIds(userProfile, allUsers);
          return deliveries.filter(d => ids.includes(d.delivered_by));
      }
      if (userProfile.role === 'dm') {
          const ids = getNetworkIds(userProfile, allUsers);
          return deliveries.filter(d => ids.includes(d.delivered_by));
      }
      return deliveries.filter(d => d.delivered_by === user.id);
  };

  const filteredDeliveries = getAccessibleDeliveries();

  // Actions
  const handlePatientSearch = async () => {
    if (nidSearch.length < 3) { showToast("Enter 3+ chars", "error"); return; }
    setHasSearched(true);
    const p = await dataService.searchPatient(nidSearch);
    setFoundPatient(p);
    if (p) {
      const isDup = await dataService.checkDuplicateDelivery(p.id, selectedProduct);
      setDuplicateWarning(isDup);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatientForm.full_name || !nidSearch) return;
    setIsSubmitting(true);
    try {
        const newP = await dataService.createPatient({
          national_id: nidSearch,
          full_name: newPatientForm.full_name,
          phone_number: newPatientForm.phone_number
        });
        setFoundPatient(newP);
        showToast("Patient Registered", "success");
    } catch(e) { showToast("Error", "error"); } finally { setIsSubmitting(false); }
  };

  const handleSubmitDelivery = async () => {
    if (!foundPatient || !selectedHCP || !selectedProduct || !selectedCustody || !educatorName) {
        showToast("All fields required.", "error"); return;
    }
    setIsSubmitting(true);
    try {
      await dataService.logDelivery({
        patient_id: foundPatient.id, hcp_id: selectedHCP, product_id: selectedProduct,
        delivered_by: user.id, quantity: 1, delivery_date: deliveryDate, rx_date: rxDate,
        educator_name: educatorName, educator_submission_date: educatorDate, custody_id: selectedCustody,
        patient: foundPatient 
      }, userProfile?.full_name || user.email);
      showToast("Delivery Recorded", "success");
      setStep(1); setNidSearch(''); setFoundPatient(null); setHasSearched(false);
      setActiveTab('database');
    } catch (e: any) { showToast(e.message, "error"); } finally { setIsSubmitting(false); }
  };

  // --- ADMIN ACTIONS ---
  const handleUpdateRole = async (uid: string, role: UserRole) => {
      if(!confirm(`Change role to ${role.toUpperCase()}?`)) return;
      await dataService.updateUserProfile(uid, { role });
      showToast("Role Updated", "success"); loadData();
  };
  
  const handleUpdateManager = async (uid: string, managerId: string) => {
      await dataService.updateUserProfile(uid, { reports_to: managerId || undefined });
      showToast("Hierarchy Updated", "success"); loadData();
  };

  const handleToggleAccess = async (u: UserProfile) => {
      const newAccess = u.access === 'yes' ? 'no' : 'yes';
      await dataService.updateUserProfile(u.id, { access: newAccess });
      showToast(`Access ${newAccess === 'yes' ? 'Granted' : 'Revoked'}`, "success"); loadData();
  };

  const handleReceiveStock = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); if(repCustody) await dataService.processStockTransaction(repCustody.id, receiveForm.quantity, receiveForm.date, `Educator: ${receiveForm.educatorName}`); loadData(); setIsSubmitting(false); };
  const handleTransferStock = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); await dataService.processStockTransaction(transferForm.toCustodyId, transferForm.quantity, transferForm.date, 'Transfer', repCustody?.id); loadData(); setIsSubmitting(false); };
  const handleDeleteItem = async (type: DBView | 'tx', id: string) => { if(confirm("Delete record?")) { setIsSubmitting(true); if(type==='deliveries') await dataService.deleteDelivery(id); if(type==='stock'||type==='tx') await dataService.deleteStockTransaction(id); loadData(); setIsSubmitting(false); } };

  // Role Checks
  const canDeliver = userProfile?.role === 'rep' || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'dm' || userProfile?.role === 'lm' || isAdmin;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFC600]"><Activity className="animate-spin w-10 h-10" /></div>;

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden relative">
      {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
      {isSubmitting && <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#FFC600] animate-spin" /></div>}
      <Auth isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={setUser} />
      {user && <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} onLogout={() => { setUser(null); setShowProfileModal(false); }} />}

      {/* NAVBAR */}
      <nav className="bg-black text-white sticky top-0 z-40 shadow-md border-b-4 border-[#FFC600] shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFC600] p-1.5 transform rotate-3"><Hexagon className="w-6 h-6 text-black fill-current transform -rotate-3" /></div>
              <div className="flex flex-col"><span className="font-black text-2xl leading-none tracking-tighter">SPIN</span><span className="text-[10px] font-bold text-[#FFC600] uppercase tracking-widest">v{METADATA.version}</span></div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                  <>
                    <button onClick={() => setShowProfileModal(true)} className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase hover:text-[#FFC600]"><UserCircle className="w-4 h-4" />{userProfile?.full_name || user.email}</button>
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${isAdmin ? 'bg-red-500 text-white border-red-600' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>{userProfile?.role || 'GUEST'}</div>
                    {isManager && <button onClick={() => setShowAIModal(true)} className="hidden md:flex items-center gap-2 text-xs font-bold uppercase bg-slate-800 px-3 py-1.5 rounded text-[#FFC600]"><Sparkles className="w-3 h-3" /> AI Report</button>}
                  </>
              ) : (
                  <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-[#FFC600] text-black px-4 py-2 font-bold uppercase text-xs"><LogIn className="w-4 h-4" /> Staff Login</button>
              )}
            </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative flex flex-col">
        <main className="max-w-7xl w-full mx-auto px-4 py-8 min-h-full flex-grow">
          
          {/* TABS */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
            {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'deliver', label: 'Deliver Pen', icon: Syringe, hidden: !canDeliver },
                { id: 'custody', label: 'Custody', icon: Building2, hidden: !canDeliver },
                { id: 'database', label: 'Database', icon: Database, hidden: !isManager && !canDeliver },
                { id: 'admin', label: 'Admin Panel', icon: Shield, hidden: !isAdmin }
            ].filter(t => !t.hidden).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><t.icon className="w-4 h-4" /> {t.label} {!user && t.id !== 'dashboard' && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            ))}
          </div>

          {/* --- ADMIN PANEL --- */}
          {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white shadow-lg rounded-sm border-t-4 border-red-500">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-red-500" /> Access & Hierarchy</h2>
                            <p className="text-slate-500 text-sm mt-1">Manage user roles, assign managers, and control system access.</p>
                          </div>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 border rounded bg-slate-50 text-sm w-64" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} />
                          </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                      <th className="p-4">User Profile</th>
                                      <th className="p-4">System Role</th>
                                      <th className="p-4">Reports To (Manager)</th>
                                      <th className="p-4 text-center">Access</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {allUsers.filter(u => u.full_name.toLowerCase().includes(adminSearch.toLowerCase()) || u.email.toLowerCase().includes(adminSearch.toLowerCase())).map(u => (
                                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="p-4">
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.role==='admin'?'bg-red-500':u.role==='lm'?'bg-purple-500':u.role==='dm'?'bg-blue-500':'bg-slate-400'}`}>
                                                      {u.full_name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <div className="font-bold text-slate-800">{u.full_name}</div>
                                                      <div className="text-xs text-slate-400">{u.email}</div>
                                                      {u.employee_id && <div className="text-[10px] font-mono bg-slate-100 px-1 rounded inline-block mt-1">{u.employee_id}</div>}
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="p-4">
                                              <div className="flex flex-wrap gap-1">
                                                  {['rep', 'dm', 'lm', 'admin'].map((role) => (
                                                      <button 
                                                        key={role}
                                                        onClick={() => u.role !== role && handleUpdateRole(u.id, role as UserRole)}
                                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border transition-all ${u.role === role ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                                                      >
                                                          {role}
                                                      </button>
                                                  ))}
                                              </div>
                                          </td>
                                          <td className="p-4">
                                              {/* HIERARCHY ASSIGNMENT: Only Reps and DMs report to someone */}
                                              {(u.role === 'rep' || u.role === 'dm') ? (
                                                  <div className="relative group">
                                                      <select 
                                                        className="appearance-none w-full bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-slate-500 text-sm font-medium"
                                                        value={u.reports_to || ''}
                                                        onChange={(e) => handleUpdateManager(u.id, e.target.value)}
                                                      >
                                                          <option value="">-- No Manager --</option>
                                                          {/* If user is REP, show DMs. If user is DM, show LMs. */}
                                                          {allUsers
                                                            .filter(m => (u.role === 'rep' ? m.role === 'dm' : m.role === 'lm'))
                                                            .map(m => (
                                                                <option key={m.id} value={m.id}>
                                                                    {m.role.toUpperCase()} - {m.full_name}
                                                                </option>
                                                            ))
                                                          }
                                                      </select>
                                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                                                          <ChevronDown className="w-4 h-4" />
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <span className="text-xs text-slate-300 italic">Top Level / No Manager</span>
                                              )}
                                          </td>
                                          <td className="p-4 text-center">
                                              {/* SWITCH UI */}
                                              <button 
                                                onClick={() => handleToggleAccess(u)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.access === 'yes' ? 'bg-green-500' : 'bg-slate-200'}`}
                                              >
                                                  <span className={`${u.access === 'yes' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}/>
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'dashboard' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
                        <p className="text-slate-500 text-sm">
                            Welcome back, {userProfile?.full_name || 'Guest'}. 
                            {userProfile?.role !== 'rep' && userProfile?.role !== 'admin' && ` Viewing data for ${userProfile?.role.toUpperCase()} Level.`}
                        </p>
                    </div>
                    {userProfile && <span className={`px-3 py-1 text-xs font-bold text-white rounded uppercase shadow-sm ${userProfile.role === 'admin' ? 'bg-red-500' : 'bg-slate-900'}`}>{userProfile.role} View</span>}
                 </div>

                 {/* DASHBOARD STATS */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                         <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Package className="w-24 h-24" /></div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Deliveries</p>
                         <h3 className="text-4xl font-black text-slate-900">{filteredDeliveries.length}</h3>
                         <div className="mt-4 text-xs font-bold text-green-600 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> In your network</div>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                         <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="w-24 h-24" /></div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unique Patients</p>
                         <h3 className="text-4xl font-black text-slate-900">{new Set(filteredDeliveries.map(d => d.patient_id)).size}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                         <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Stethoscope className="w-24 h-24" /></div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Prescribers</p>
                         <h3 className="text-4xl font-black text-slate-900">{new Set(filteredDeliveries.map(d => d.hcp_id)).size}</h3>
                     </div>
                 </div>
                 
                 {/* ACTIVITY LIST */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                     <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-[#FFC600]" /> Recent Network Activity</h3>
                     <div className="space-y-4">
                         {filteredDeliveries.slice(0, 8).map(d => (
                             <div key={d.id} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0 hover:bg-slate-50 p-2 rounded transition-colors">
                                 <div className="flex items-center gap-3">
                                     <div className="bg-slate-100 p-2 rounded-full"><Syringe className="w-4 h-4 text-slate-400" /></div>
                                     <div>
                                         <p className="font-bold text-sm text-slate-800">{PRODUCTS.find(p => p.id === d.product_id)?.name}</p>
                                         <p className="text-xs text-slate-500">Patient: {d.patient?.full_name}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-xs font-bold text-slate-700">{formatDateFriendly(d.delivery_date)}</p>
                                     <p className="text-[10px] text-slate-400 uppercase font-bold">
                                         Rep: {allUsers.find(u => u.id === d.delivered_by)?.full_name || 'Unknown'}
                                     </p>
                                 </div>
                             </div>
                         ))}
                         {filteredDeliveries.length === 0 && <div className="text-center py-10 text-slate-400">No activity recorded in your assigned network yet.</div>}
                     </div>
                 </div>
             </div>
          )}

          {activeTab === 'deliver' && canDeliver && (
              <div className="bg-white shadow-2xl border-t-4 border-[#FFC600] max-w-3xl mx-auto animate-in fade-in relative rounded-b-lg overflow-hidden">
                  <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center gap-2"><Syringe className="w-5 h-5 text-[#FFC600]" /> New Delivery Record</h2>
                      <div className="flex gap-2">
                          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#FFC600]' : 'bg-slate-700'}`}></div>
                          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#FFC600]' : 'bg-slate-700'}`}></div>
                      </div>
                  </div>
                  <div className="p-8">
                      {step === 1 && (
                          <div className="space-y-6 text-center">
                             <div className="max-w-md mx-auto">
                                 <label className="block text-xs font-bold uppercase text-slate-400 mb-2 text-left">Identify Patient</label>
                                 <div className="flex gap-2">
                                     <input type="text" placeholder="Search National ID or Phone..." className="flex-1 border-2 border-slate-200 p-4 rounded-lg bg-slate-50 focus:bg-white focus:border-black outline-none font-mono text-lg transition-all" value={nidSearch} onChange={e => setNidSearch(e.target.value)} />
                                     <button onClick={handlePatientSearch} className="bg-black text-white px-6 rounded-lg font-bold uppercase hover:bg-slate-800 transition-colors"><Search className="w-6 h-6" /></button>
                                 </div>
                             </div>
                             
                             {foundPatient ? (
                                 <div className="bg-green-50 p-6 border-2 border-green-100 rounded-xl mt-6 animate-in zoom-in-95 duration-200">
                                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><UserCircle className="w-8 h-8 text-green-600" /></div>
                                     <h3 className="font-black text-xl text-green-900">{foundPatient.full_name}</h3>
                                     <p className="text-sm font-mono text-green-700 mt-1">{foundPatient.national_id}</p>
                                     {duplicateWarning && <div className="mt-4 text-xs font-bold text-yellow-800 bg-yellow-100 p-2 rounded flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> Warning: Patient received this product recently.</div>}
                                     <button onClick={() => { setStep(2); if(!selectedCustody && repCustody) setSelectedCustody(repCustody.id); }} className="mt-6 w-full bg-[#FFC600] py-4 font-bold uppercase text-sm hover:bg-yellow-400 rounded-lg shadow-lg text-black flex items-center justify-center gap-2">Continue to Details <ArrowRight className="w-4 h-4" /></button>
                                 </div>
                             ) : hasSearched && (
                                 <div className="bg-slate-50 p-6 border-2 border-slate-200 rounded-xl mt-6 text-left animate-in fade-in">
                                     <h3 className="font-bold text-lg mb-4">Register New Patient</h3>
                                     <div className="grid gap-4">
                                         <div><label className="text-xs font-bold uppercase text-slate-400">Full Name</label><input className="w-full border p-3 rounded font-bold" value={newPatientForm.full_name} onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})} /></div>
                                         <div><label className="text-xs font-bold uppercase text-slate-400">Phone</label><input className="w-full border p-3 rounded font-bold" value={newPatientForm.phone_number} onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})} /></div>
                                     </div>
                                     <button onClick={handleCreatePatient} className="w-full bg-black text-white py-3 rounded mt-4 font-bold uppercase text-xs hover:bg-slate-800">Create & Select</button>
                                 </div>
                             )}
                          </div>
                      )}
                      {step === 2 && (
                          <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div><label className="block text-xs font-bold uppercase mb-1">Delivery Date</label><DateInput value={deliveryDate} onChange={setDeliveryDate} className="w-full border p-3 rounded bg-slate-50 font-bold" required /></div>
                                  <div><label className="block text-xs font-bold uppercase mb-1">Prescription Date</label><DateInput value={rxDate} onChange={setRxDate} className="w-full border p-3 rounded bg-slate-50 font-bold" /></div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold uppercase mb-1">Prescriber (HCP)</label>
                                      <select className="w-full border p-3 bg-white rounded" value={selectedHCP} onChange={e => setSelectedHCP(e.target.value)}>
                                          <option value="">Select Doctor...</option>
                                          {hcps.map(h => <option key={h.id} value={h.id}>{h.full_name} ({h.hospital})</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold uppercase mb-1">Inventory Source</label>
                                      <select className="w-full border p-3 bg-white rounded" value={selectedCustody} onChange={e => setSelectedCustody(e.target.value)}>
                                          <option value="">Select Source...</option>
                                          {custodies.filter(c => c.type==='rep').map(c=><option key={c.id} value={c.id}>My Personal Stock ({c.current_stock})</option>)}
                                          {custodies.filter(c => c.type==='clinic').map(c=><option key={c.id} value={c.id}>{c.name} ({c.current_stock})</option>)}
                                      </select>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-xs font-bold uppercase mb-1">Educator Name</label>
                                  <input className="w-full border p-3 rounded" value={educatorName} onChange={e => setEducatorName(e.target.value)} list="educators" placeholder="Type to search..." />
                                  <datalist id="educators">{educatorSuggestions.map(s => <option key={s} value={s} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Submission Date</label>
                                    <DateInput value={educatorDate} onChange={setEducatorDate} className="w-full border p-3 rounded" />
                                </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold uppercase mb-2">Select Product</label>
                                  <div className="grid grid-cols-1 gap-2">
                                      {PRODUCTS.map(p => (
                                          <button key={p.id} onClick={() => setSelectedProduct(p.id)} className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${selectedProduct === p.id ? 'border-[#FFC600] bg-yellow-50 shadow-md' : 'border-slate-100 hover:border-slate-300'}`}>
                                              <span className="font-bold">{p.name}</span>
                                              {selectedProduct === p.id && <CheckCircle className="w-5 h-5 text-green-600" />}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="flex gap-4 pt-4">
                                  <button onClick={() => setStep(1)} className="w-1/3 bg-white border-2 border-slate-200 text-slate-600 font-bold uppercase rounded-lg hover:bg-slate-50">Back</button>
                                  <button onClick={handleSubmitDelivery} className="w-2/3 bg-black text-[#FFC600] py-4 font-bold uppercase rounded-lg shadow-xl hover:bg-slate-900 transition-transform active:scale-95">Confirm Delivery</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'custody' && canDeliver && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-8 rounded-xl shadow-sm border-l-8 border-[#FFC600] flex justify-between items-center">
                      <div><h2 className="font-black text-3xl text-slate-900">Inventory</h2><p className="text-sm font-bold text-slate-400 uppercase">My Current Stock</p></div>
                      <div className="text-6xl font-black tracking-tighter text-slate-900">{repCustody?.current_stock || 0}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-green-700"><ArrowLeft className="w-5 h-5" /> Receive Stock</h3>
                           <form onSubmit={handleReceiveStock} className="space-y-4">
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">Date Received</label><DateInput value={receiveForm.date} onChange={(d) => setReceiveForm({...receiveForm, date: d})} className="w-full border p-3 rounded font-bold" /></div>
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">Quantity</label><input type="number" className="w-full border p-3 rounded font-bold" value={receiveForm.quantity} onChange={e => setReceiveForm({...receiveForm, quantity: Number(e.target.value)})} /></div>
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">From Educator</label><input type="text" className="w-full border p-3 rounded font-bold" value={receiveForm.educatorName} onChange={e => setReceiveForm({...receiveForm, educatorName: e.target.value})} /></div>
                               <button className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold uppercase text-sm shadow-lg transition-transform active:scale-95">Add to Inventory</button>
                           </form>
                       </div>
                       <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-blue-700">Transfer to Clinic <ArrowRight className="w-5 h-5" /></h3>
                           <form onSubmit={handleTransferStock} className="space-y-4">
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">Select Clinic</label><select className="w-full border p-3 rounded bg-white font-bold" value={transferForm.toCustodyId} onChange={e => setTransferForm({...transferForm, toCustodyId: e.target.value})}><option value="">Choose Location...</option>{custodies.filter(c => c.type==='clinic').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">Transfer Date</label><DateInput value={transferForm.date} onChange={(d) => setTransferForm({...transferForm, date: d})} className="w-full border p-3 rounded font-bold" /></div>
                               <div><label className="text-[10px] font-bold uppercase text-slate-400">Quantity</label><input type="number" className="w-full border p-3 rounded font-bold" value={transferForm.quantity} onChange={e => setTransferForm({...transferForm, quantity: Number(e.target.value)})} /></div>
                               <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold uppercase text-sm shadow-lg transition-transform active:scale-95">Transfer Stock</button>
                           </form>
                       </div>
                  </div>
              </div>
          )}

          {activeTab === 'database' && (
              <div className="space-y-4 animate-in fade-in">
                   <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200 inline-flex">
                       {['deliveries', 'patients', 'hcps', 'locations', 'stock'].map(v => (
                           <button key={v} onClick={() => setDbView(v as any)} className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${dbView === v ? 'bg-black text-[#FFC600] shadow' : 'text-slate-500 hover:bg-slate-50'}`}>{v}</button>
                       ))}
                   </div>
                   
                   <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                       <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                           <input placeholder="Search records..." className="w-full bg-transparent outline-none font-medium text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                       </div>
                       <div className="overflow-x-auto">
                           <table className="w-full text-left">
                               <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase font-bold"><th className="p-4">Primary Data</th><th className="p-4 text-right">Metadata</th></tr></thead>
                               <tbody className="divide-y divide-slate-50">
                                   {(dbView === 'deliveries' ? filteredDeliveries : 
                                     dbView === 'patients' ? patients : 
                                     dbView === 'hcps' ? hcps : 
                                     dbView === 'locations' ? custodies : stockTransactions
                                   ).filter((item: any) => 
                                      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
                                   ).map((item: any) => (
                                       <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                           <td className="p-4">
                                               <div className="font-bold text-slate-900">{item.full_name || item.name || item.source || `Transaction`}</div>
                                               <div className="text-xs text-slate-500 mt-1">
                                                   {item.national_id || item.specialty || (item.product_id ? `${PRODUCTS.find(p=>p.id===item.product_id)?.name}` : '')}
                                                   {item.patient && ` • Patient: ${item.patient.full_name}`}
                                               </div>
                                           </td>
                                           <td className="p-4 text-right">
                                               <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded inline-block">{formatDateFriendly(item.created_at || item.delivery_date || item.transaction_date)}</div>
                                               {isAdmin && <button onClick={() => handleDeleteItem(dbView==='stock'?'stock':dbView, item.id)} className="ml-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                       <div className="bg-slate-50 p-3 text-center text-[10px] font-bold uppercase text-slate-400 border-t border-slate-100">
                           End of List • Only showing authorized records
                       </div>
                   </div>
              </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
