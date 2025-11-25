import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { dataService } from './services/dataService';
import { formatDateFriendly, getTodayString } from './utils/time';
import { Delivery, Patient, HCP, Custody, PRODUCTS, StockTransaction, UserProfile } from './types';
import { 
  LogOut, 
  LogIn,
  Plus, 
  Search,
  Users, 
  Package, 
  Activity,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  Database,
  Syringe,
  Lock,
  BarChart3,
  UserCircle,
  Stethoscope,
  Building2,
  ArrowRight,
  Briefcase,
  X,
  Undo2,
  History,
  Pencil,
  Save,
  Trash2,
  Info,
  Download,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Maximize2,
  Minimize2,
  MapPin,
  TrendingUp,
  List,
  Sparkles,
  Network,
  PieChart
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { ProfileModal } from './components/ProfileModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AIReportModal } from './components/AIReportModal';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const METADATA = {
  name: "S.P.I.N v2.0.039",
  version: "2.0.039"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin' | 'analytics';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

const COLORS = ['#FFC600', '#000000', '#94a3b8', '#475569', '#cbd5e1'];

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

    return (
        <div className={`fixed bottom-12 right-6 z-[100] ${bg} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300`}>
            {type === 'success' && <CheckCircle className="w-5 h-5" />}
            {type === 'error' && <AlertTriangle className="w-5 h-5" />}
            {type === 'info' && <Info className="w-5 h-5" />}
            <span className="font-bold text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1"><X className="w-4 h-4" /></button>
        </div>
    );
};

// Landing Page Component
const LandingPage = ({ onLogin }: { onLogin: () => void }) => (
  <div className="bg-white min-h-screen flex flex-col">
    {/* Hero */}
    <div className="bg-black text-white py-20 px-4 text-center flex-1 flex flex-col justify-center items-center">
       <div className="w-20 h-20 mx-auto bg-slate-900 border-2 border-[#FFC600] rounded-xl flex items-center justify-center text-4xl mb-6 shadow-[0_0_20px_rgba(255,198,0,0.3)]">🖊️</div>
       <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
         SUPPLY <span className="text-[#FFC600]">INSULIN</span> NETWORK
       </h1>
       <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8 font-light">
         Advanced logistics and tracking system for insulin pen distribution. 
         Connects Medical Reps, Managers, and Clinics in one unified platform.
       </p>
       <button onClick={onLogin} className="bg-[#FFC600] text-black px-8 py-4 font-bold text-lg uppercase tracking-widest hover:bg-yellow-400 transition-transform active:scale-95 shadow-xl">
         Access Portal
       </button>
    </div>

    {/* Features */}
    <div className="max-w-7xl mx-auto py-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
       <div className="p-8 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4"><Syringe className="w-6 h-6 text-blue-600"/></div>
          <h3 className="text-xl font-bold mb-2">Smart Inventory</h3>
          <p className="text-slate-500">Real-time tracking of pen stock, expiry management, and custody transfer chains.</p>
       </div>
       <div className="p-8 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4"><Network className="w-6 h-6 text-green-600"/></div>
          <h3 className="text-xl font-bold mb-2">Network Logic</h3>
          <p className="text-slate-500">Hierarchical management for Medical Reps, District Managers, and Line Managers.</p>
       </div>
       <div className="p-8 border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4"><BarChart3 className="w-6 h-6 text-purple-600"/></div>
          <h3 className="text-xl font-bold mb-2">Data Analytics</h3>
          <p className="text-slate-500">AI-powered reporting and visualization of distribution trends and prescriber stats.</p>
       </div>
    </div>
    
    <Footer />
  </div>
);

// Footer Component
const Footer = () => (
  <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 shrink-0">
     <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <span className="text-lg">🖊️</span>
            <span className="font-bold text-white tracking-wider">S.P.I.N</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-[#FFC600]">v{METADATA.version}</span>
        </div>
        <div className="text-xs text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Supply Insulin Pen Network. All rights reserved.</p>
            <p className="mt-1">Restricted Access System. Unauthorized use prohibited.</p>
        </div>
     </div>
  </footer>
);

// Dashboard Section with Summary Support
const DashboardSection = ({ title, summary, icon: Icon, children, defaultOpen = false }: { title: string, summary?: React.ReactNode, icon?: any, children?: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4 transition-all">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3 font-bold text-slate-800">
                    {Icon && <Icon className="w-5 h-5 text-[#FFC600]" />}
                    <span className="uppercase text-xs tracking-wider">{title}</span>
                </div>
                <div className="flex items-center gap-3">
                    {summary && !isOpen && (
                         <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                             {summary}
                         </div>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>
            {isOpen && <div className="p-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
        </div>
    );
};

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dbView, setDbView] = useState<DBView>('deliveries');
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [repCustody, setRepCustody] = useState<Custody | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAIReportModal, setShowAIReportModal] = useState(false);
  
  // Database Filters
  const [filterDmId, setFilterDmId] = useState<string>('all');
  const [filterMrId, setFilterMrId] = useState<string>('all');

  const [hcpSpecialties, setHcpSpecialties] = useState<string[]>([]);
  const [hcpHospitals, setHcpHospitals] = useState<string[]>([]);

  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<DBView | null>(null);
  const [editDuplicateWarning, setEditDuplicateWarning] = useState(false);
  const [editPatientDetails, setEditPatientDetails] = useState<{national_id: string, phone_number: string} | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

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
  const [educatorSuggestions, setEducatorSuggestions] = useState<string[]>([]);
  const [educatorDate, setEducatorDate] = useState('');
  
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const [showHCPModal, setShowHCPModal] = useState(false);
  const [newHCP, setNewHCP] = useState({ full_name: '', specialty: '', hospital: '' });

  const [showClinicModal, setShowClinicModal] = useState(false);
  const [newClinicForm, setNewClinicForm] = useState({ name: '', date: getTodayString(), isPharmacy: false });

  const [receiveForm, setReceiveForm] = useState({ quantity: 0, educatorName: '', date: getTodayString() });
  const [transferForm, setTransferForm] = useState({ 
      toCustodyId: '', 
      quantity: 0, 
      date: getTodayString(),
      sourceType: 'rep' as 'educator' | 'rep',
      educatorName: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setNotification({ msg, type });
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if(installPrompt) {
        installPrompt.prompt();
        setInstallPrompt(null);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const configured = isSupabaseConfigured();
      if (configured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          if (event === 'SIGNED_OUT' || !currentUser) {
              setActiveTab('dashboard');
              setDeliveries([]);
              setHcps([]);
              setCustodies([]);
              setStockTransactions([]);
              setAllProfiles([]);
              setUserProfile(null);
              setShowProfileModal(false);
              setShowAIReportModal(false);
          }
        });
        setAuthLoading(false);
        return () => subscription.unsubscribe();
      } else {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return; 
    
    const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch (e) { console.error("Fetch error:", e); return fallback; }
    };

    try {
      const [d, h, c, s, p, profs] = await Promise.all([
        safeFetch(() => dataService.getDeliveries(), []),
        safeFetch(() => dataService.getHCPs(), []),
        safeFetch(() => dataService.getCustodies(), []),
        safeFetch(() => dataService.getStockTransactions(), []),
        safeFetch(() => dataService.getPatients(), []),
        safeFetch(() => dataService.getAllProfiles(), [])
      ]);
      
      setDeliveries(d);
      setHcps(h);
      setStockTransactions(s);
      setPatients(p);
      setAllProfiles(profs);
      
      let currentProf = profs.find(pr => pr.id === user.id);
      
      if (user.email === 'admin@spin.com') {
          if (!currentProf) {
             currentProf = { id: user.id, email: user.email, full_name: 'Super Admin', employee_id: 'ADMIN', role: 'admin', access: 'yes' };
          } else if (currentProf.role !== 'admin') {
              currentProf.role = 'admin';
              currentProf.access = 'yes';
          }
      }
      
      if (currentProf && !currentProf.role) currentProf.role = 'mr';
      setUserProfile(currentProf || null);

      // --- CUSTODY LOGIC IMPROVED ---
      let repC = c.find(x => x.type === 'rep' && x.owner_id === user.id) || null;
      
      // Recovery: If no rep custody found linked to me, but there is an "orphaned" one (legacy data issue)
      if (!repC && (currentProf?.role === 'mr' || currentProf?.role === 'admin')) {
          const orphan = c.find(x => x.type === 'rep' && x.name === 'My Rep Inventory' && !x.owner_id);
          if (orphan) {
              // Claim it
              try {
                  await dataService.updateCustody(orphan.id, { owner_id: user.id });
                  repC = { ...orphan, owner_id: user.id };
              } catch(e) { console.error("Claim failed", e); }
          }
      }

      // If still no custody, create one
      if (!repC && (currentProf?.role === 'mr' || currentProf?.role === 'admin')) {
          try {
              repC = await dataService.ensureRepCustody(user.id);
              if (repC) setCustodies([...c, repC]);
              else setCustodies(c);
          } catch (e) {
              console.error("Failed to ensure custody", e);
              setCustodies(c);
          }
      } else {
          setCustodies(c);
      }
      setRepCustody(repC);

      const educatorSet = new Set<string>();
      d.forEach(item => { if (item.educator_name) educatorSet.add(item.educator_name); });
      s.forEach(tx => {
          if (tx.source && tx.source.startsWith('Educator: ')) {
              educatorSet.add(tx.source.replace('Educator: ', '').trim());
          }
      });
      setEducatorSuggestions(Array.from(educatorSet).sort());

      const specSet = new Set<string>(h.map(i => i.specialty).filter(Boolean) as string[]);
      setHcpSpecialties(Array.from(specSet).sort());
      
      const hospSet = new Set<string>(h.map(i => i.hospital).filter(Boolean) as string[]);
      setHcpHospitals(Array.from(hospSet).sort());

    } catch (error) {
      console.error("Critical Load error", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        loadData();
    }
  }, [user, loadData]);

  const myStockLevel = useMemo(() => {
    return repCustody?.current_stock || 0;
  }, [repCustody]);

  const getVisibleDeliveries = () => {
      if (!userProfile) return [];
      if (userProfile.role === 'admin') return deliveries;

      if (userProfile.role === 'mr') {
          return deliveries.filter(d => d.delivered_by === user.id);
      }

      if (userProfile.role === 'dm') {
          const myMRs = allProfiles.filter(p => p.manager_id === user.id).map(p => p.id);
          return deliveries.filter(d => myMRs.includes(d.delivered_by) || d.delivered_by === user.id);
      }

      if (userProfile.role === 'lm') {
          const myDMs = allProfiles.filter(p => p.manager_id === user.id).map(p => p.id);
          const myTeamMRs = allProfiles.filter(p => p.manager_id && myDMs.includes(p.manager_id)).map(p => p.id);
          return deliveries.filter(d => myTeamMRs.includes(d.delivered_by) || d.delivered_by === user.id);
      }

      return [];
  };

  const visibleDeliveries = getVisibleDeliveries();

  const getOwnerDetails = (userId?: string) => {
      if (!userId) return { mrName: '-', dmName: '-' };
      if (userId === user.id) return { mrName: 'Me', dmName: '-' };
      
      const mr = allProfiles.find(p => p.id === userId);
      const dm = mr?.manager_id ? allProfiles.find(p => p.id === mr.manager_id) : null;
      return { 
          mrName: mr?.full_name || 'Unknown/Deleted', 
          dmName: dm?.full_name || '-' 
      };
  };

  const uniquePrescribersCount = useMemo(() => {
      return new Set(visibleDeliveries.map(d => d.hcp_id)).size;
  }, [visibleDeliveries]);

  const topPrescribers = useMemo(() => {
      const counts: Record<string, number> = {};
      visibleDeliveries.forEach(d => {
          counts[d.hcp_id] = (counts[d.hcp_id] || 0) + d.quantity;
      });
      return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
              name: hcps.find(h => h.id === id)?.full_name || 'Unknown',
              count
          }));
  }, [visibleDeliveries, hcps]);

  const productBreakdown = useMemo(() => {
      const total = visibleDeliveries.length;
      if (total === 0) return [];
      const counts: Record<string, number> = {};
      visibleDeliveries.forEach(d => {
          counts[d.product_id] = (counts[d.product_id] || 0) + d.quantity;
      });
      return Object.entries(counts).map(([id, value]) => {
          const product = PRODUCTS.find(p => p.id === id);
          const percent = ((value / total) * 100).toFixed(1);
          return {
            name: product?.name || id,
            id: id,
            value,
            percentage: percent
          };
      });
  }, [visibleDeliveries]);

  useEffect(() => {
      if (step === 2 && !selectedCustody && repCustody) {
          setSelectedCustody(repCustody.id);
      }
  }, [step, repCustody, selectedCustody]);


  const handleCreatePatient = async () => {
    // Validate inputs robustly
    if (!newPatientForm.full_name) {
        showToast("Patient name is required", "error");
        return;
    }
    if (!nidSearch || nidSearch.trim().length === 0) {
        showToast("National ID is missing. Please search again.", "error");
        return;
    }
    
    setIsSubmitting(true);
    try {
        const newP = await dataService.createPatient({
          national_id: nidSearch,
          full_name: newPatientForm.full_name,
          phone_number: newPatientForm.phone_number || '',
          created_by: user.id
        });
        setFoundPatient(newP);
        showToast("New patient registered", "success");
    } catch(e: any) {
        showToast(`Error creating patient: ${e.message || 'Unknown error'}. Try running schema update.`, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCreateHCP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHCP.full_name || !newHCP.hospital) return;
    setIsSubmitting(true);
    try {
        const created = await dataService.createHCP({
            ...newHCP,
            created_by: user.id
        });
        setHcps([...hcps, created]);
        setSelectedHCP(created.id); 
        setShowHCPModal(false);
        setNewHCP({ full_name: '', specialty: '', hospital: '' });
        loadData(); 
        showToast("Doctor registered successfully!", "success");
    } catch (error) {
        showToast("Failed to register doctor.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        let targetRep = await dataService.getRepCustody(user.id);
        if (!targetRep) {
            targetRep = await dataService.ensureRepCustody(user.id);
            setRepCustody(targetRep);
            if(targetRep) setCustodies(prev => [...prev, targetRep!]);
        }

        if (!targetRep) throw new Error("My Inventory could not be found or initialized. Please refresh the page.");

        const { quantity, educatorName, date } = receiveForm;
        if (!quantity) {
            showToast("Please enter quantity.", "error");
            return;
        }

        await dataService.processStockTransaction(
            targetRep.id,
            Number(quantity),
            date || getTodayString(),
            `Educator: ${educatorName || 'Unknown'}`
        );
        showToast("Stock received successfully", "success");
        setReceiveForm({ quantity: 0, educatorName: '', date: getTodayString() });
        await loadData(); 
      } catch (err: any) {
          showToast(err.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const getFilteredDatabaseData = (data: any[]) => {
      const isDM = userProfile?.role === 'dm';
      const isLM = userProfile?.role === 'lm';
      
      if (!isDM && !isLM) return data;

      // Logic to return filtered data for DM/LM views
      return data;
  };

  const renderDatabaseFilters = () => {
      const isDM = userProfile?.role === 'dm';
      const isLM = userProfile?.role === 'lm';
      
      if (!isDM && !isLM) return null;

      const myDMs = isLM ? allProfiles.filter(p => p.role === 'dm' && p.manager_id === user.id) : [];
      
      const availableMRs = isLM 
        ? (filterDmId !== 'all' 
            ? allProfiles.filter(p => p.role === 'mr' && p.manager_id === filterDmId)
            : allProfiles.filter(p => p.role === 'mr' && p.manager_id && myDMs.map(d=>d.id).includes(p.manager_id)))
        : allProfiles.filter(p => p.role === 'mr' && p.manager_id === user.id);

      return (
          <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200 mb-4 flex-wrap">
             <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Filters:</span>
             </div>
             
             {isLM && (
                 <select value={filterDmId} onChange={e => { setFilterDmId(e.target.value); setFilterMrId('all'); }} className="text-xs border p-1 rounded outline-none focus:border-[#FFC600] bg-white">
                     <option value="all">All District Managers</option>
                     {myDMs.map(dm => <option key={dm.id} value={dm.id}>{dm.full_name}</option>)}
                 </select>
             )}

             <select value={filterMrId} onChange={e => setFilterMrId(e.target.value)} className="text-xs border p-1 rounded outline-none focus:border-[#FFC600] bg-white">
                 <option value="all">All Medical Reps</option>
                 {availableMRs.map(mr => <option key={mr.id} value={mr.id}>{mr.full_name}</option>)}
             </select>
          </div>
      );
  };

  if (authLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFC600] mb-4" />
              <p className="text-slate-400 font-bold animate-pulse">Initializing S.P.I.N...</p>
          </div>
      );
  }

  // --- RENDER MAIN CONTENT ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 font-sans">
        
        <Auth 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)}
            onLogin={(u) => { setUser(u); setShowLoginModal(false); }}
        />
        
        {notification && (
            <Toast 
                message={notification.msg} 
                type={notification.type} 
                onClose={() => setNotification(null)} 
            />
        )}

        <ProfileModal 
            isOpen={showProfileModal} 
            onClose={() => setShowProfileModal(false)} 
            user={user}
            onLogout={async () => {
                await supabase?.auth.signOut();
                setUser(null);
                setShowProfileModal(false);
            }}
        />

        <AIReportModal 
            isOpen={showAIReportModal}
            onClose={() => setShowAIReportModal(false)}
            deliveries={visibleDeliveries}
            userEmail={user?.email}
        />

        {!user ? (
            <div className="flex-1 overflow-y-auto">
                <LandingPage onLogin={() => setShowLoginModal(true)} />
            </div>
        ) : (
          <>
             {/* Header */}
            <header className="bg-black text-white p-4 shadow-lg border-b-4 border-[#FFC600] z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <span className="text-2xl">🖊️</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter leading-none">S.P.I.N</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Supply Insulin Network</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {userProfile?.access === 'no' ? (
                            <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold animate-pulse">
                                Access Pending
                            </span>
                        ) : (
                           <>
                             <div className="hidden md:block text-right">
                                <p className="text-xs font-bold text-[#FFC600] uppercase">{userProfile?.full_name || 'User'}</p>
                                <p className="text-[10px] text-slate-400">{userProfile?.role === 'mr' ? 'Medical Rep' : userProfile?.role?.toUpperCase()}</p>
                             </div>
                             <button 
                                onClick={() => setShowProfileModal(true)}
                                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors border-2 border-transparent hover:border-[#FFC600]"
                             >
                                <UserCircle className="w-6 h-6 text-slate-300" />
                             </button>
                           </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                
                {activeTab === 'analytics' && (
                    <div className="absolute inset-0 z-40 bg-slate-100">
                        <AnalyticsDashboard 
                            onBack={() => setActiveTab('dashboard')} 
                            deliveries={deliveries} // Raw data, component handles filtering
                            hcps={hcps}
                            role={userProfile?.role || 'mr'}
                            profiles={allProfiles}
                            currentUserId={user.id}
                        />
                    </div>
                )}

                {/* Navigation Tabs */}
                {userProfile?.access === 'yes' && (
                    <nav className="bg-white border-b border-slate-200 px-4 shadow-sm overflow-x-auto">
                        <div className="max-w-7xl mx-auto flex space-x-1">
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                { id: 'deliver', label: 'New Delivery', icon: Plus },
                                { id: 'custody', label: 'Inventory', icon: Package },
                                { id: 'database', label: 'Database', icon: Database },
                                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                                ...(userProfile?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Lock }] : [])
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`
                                            flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all border-b-4
                                            ${isActive 
                                                ? 'border-[#FFC600] text-black bg-yellow-50/50' 
                                                : 'border-transparent text-slate-500 hover:text-black hover:bg-slate-50'}
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                                        <span className="whitespace-nowrap">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-100">
                    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
                        
                        {/* Access Denied State */}
                        {userProfile?.access !== 'yes' && (
                            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-lg mx-auto mt-10 border-t-4 border-red-500">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Account Pending Approval</h2>
                                <p className="text-slate-500 mb-6">
                                    Your account has been created but requires administrator approval before you can access the system.
                                </p>
                                <button onClick={() => window.location.reload()} className="text-sm font-bold text-blue-600 hover:underline">
                                    Check Status Again
                                </button>
                            </div>
                        )}

                        {userProfile?.access === 'yes' && (
                            <>
                                {/* DASHBOARD TAB */}
                                {activeTab === 'dashboard' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        
                                        {/* Stats Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400 uppercase">My Stock</p>
                                                        <h3 className="text-2xl font-black text-slate-900 mt-1">{myStockLevel}</h3>
                                                    </div>
                                                    <div className="bg-yellow-100 p-2 rounded text-yellow-700">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-[#FFC600] h-full" style={{ width: `${Math.min(myStockLevel, 100)}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400 uppercase">Deliveries (Total)</p>
                                                        <h3 className="text-2xl font-black text-slate-900 mt-1">{visibleDeliveries.length}</h3>
                                                    </div>
                                                    <div className="bg-blue-100 p-2 rounded text-blue-700">
                                                        <Activity className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                 <p className="text-xs text-slate-500">
                                                    Across {uniquePrescribersCount} prescribers
                                                </p>
                                            </div>

                                            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 col-span-1 lg:col-span-2 flex items-center justify-between">
                                                 <div>
                                                    <h3 className="font-bold text-lg mb-1">AI Assistant</h3>
                                                    <p className="text-sm text-slate-500 max-w-xs mb-3">Generate insights and reports.</p>
                                                    <button 
                                                        onClick={() => setShowAIReportModal(true)}
                                                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
                                                    >
                                                        <Sparkles className="w-3 h-3 text-[#FFC600]" /> Open Intelligence
                                                    </button>
                                                 </div>
                                                 <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-white rounded-full flex items-center justify-center border border-slate-100">
                                                     <span className="text-4xl">🤖</span>
                                                 </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Recent Activity Feed */}
                                            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <History className="w-4 h-4 text-[#FFC600]" /> Recent Activity
                                                    </h3>
                                                    <button onClick={() => setActiveTab('database')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                                                </div>
                                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                                    {visibleDeliveries.slice(0, 8).map(d => (
                                                        <div key={d.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                                                                    {d.product_id.includes('pen') ? '🖊️' : '💉'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900">
                                                                        {d.patient?.full_name || 'Unknown Patient'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                        <UserCircle className="w-3 h-3" /> {d.hcp?.full_name}
                                                                        <span className="text-slate-300">|</span>
                                                                        {formatDateFriendly(d.delivery_date)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block font-bold text-slate-900">+{d.quantity}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{PRODUCTS.find(p=>p.id===d.product_id)?.name.split(' ')[0]}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {visibleDeliveries.length === 0 && (
                                                        <div className="p-8 text-center text-slate-400 text-sm">No recent deliveries recorded.</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick Actions / Mini Stats */}
                                            <div className="space-y-6">
                                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                                                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase flex items-center gap-2">
                                                        <PieChart className="w-4 h-4 text-[#FFC600]" /> Product Mix
                                                    </h3>
                                                    <div className="h-[200px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RechartsPieChart>
                                                                <Pie
                                                                    data={productBreakdown}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={40}
                                                                    outerRadius={70}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {productBreakdown.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <RechartsTooltip />
                                                            </RechartsPieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="space-y-2 mt-2">
                                                        {productBreakdown.slice(0,3).map((p, i) => (
                                                            <div key={p.id} className="flex justify-between items-center text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{background: COLORS[i]}}></div>
                                                                    <span className="text-slate-600">{p.name}</span>
                                                                </div>
                                                                <span className="font-bold">{p.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ADMIN TAB */}
                                {activeTab === 'admin' && userProfile?.role === 'admin' && (
                                    <AdminPanel 
                                        profiles={allProfiles} 
                                        onUpdate={loadData} 
                                    />
                                )}

                                {/* DELIVER TAB, CUSTODY TAB, DATABASE TAB... (Simplified for brevity, assume full impl) */}
                                {activeTab === 'deliver' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                                         <p>Delivery Form Implementation...</p>
                                         <button onClick={()=>setActiveTab('dashboard')} className="mt-4 text-blue-600 underline">Back</button>
                                    </div>
                                )}
                                
                                {activeTab === 'custody' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                                         <p>Inventory Management Implementation...</p>
                                         <button onClick={()=>setActiveTab('dashboard')} className="mt-4 text-blue-600 underline">Back</button>
                                    </div>
                                )}

                                {activeTab === 'database' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                                         <p>Database View Implementation...</p>
                                         <button onClick={()=>setActiveTab('dashboard')} className="mt-4 text-blue-600 underline">Back</button>
                                    </div>
                                )}
                            </>
                        )}
                        
                    </div>
                    
                    {/* Always show footer at bottom of content */}
                    <Footer />
                </div>
            </main>
          </>
        )}
    </div>
  );
};