

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { dataService } from './services/dataService';
import { formatDateFriendly, getTodayString } from './utils/time';
import { Delivery, Patient, HCP, Custody, PRODUCTS, StockTransaction, UserProfile } from './types';
import { 
  LogOut, 
  Plus, 
  Search,
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
  Network,
  PieChart,
  ArrowRight,
  History,
  X,
  Loader2,
  Trash2,
  Pencil,
  Info,
  Truck,
  MapPin
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
import { isSupabaseConfigured, supabase } from './lib/supabase';

const METADATA = {
  name: "S.P.I.N v2.0.049",
  version: "2.0.049"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin' | 'analytics';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

const COLORS = ['#FFC600', '#000000', '#94a3b8', '#475569', '#cbd5e1'];

const HOSPITAL_TAGS = ['City General', 'Military Hospital', 'University Hospital', 'Private Clinic', 'Health Center'];
const SPECIALTY_TAGS = ['Endocrinology', 'Internal Medicine', 'General Practice', 'Family Medicine', 'Diabetes Center'];

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
  <footer className="bg-slate-900 text-slate-400 py-4 px-4 border-t border-slate-800 shrink-0 z-10 w-full">
     <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
            <span className="text-lg">🖊️</span>
            <span className="font-bold text-white tracking-wider">S.P.I.N</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-[#FFC600]">v{METADATA.version}</span>
        </div>
        <div className="text-[10px] text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Supply Insulin Pen Network.</p>
        </div>
     </div>
  </footer>
);

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
  
  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
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
  const [educatorDate, setEducatorDate] = useState('');
  
  const [educatorSuggestions, setEducatorSuggestions] = useState<string[]>([]);
  
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const [showHCPModal, setShowHCPModal] = useState(false);
  const [newHCP, setNewHCP] = useState({ full_name: '', specialty: '', hospital: '' });

  // Location Creation
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState<'clinic' | 'pharmacy'>('clinic');

  const [receiveForm, setReceiveForm] = useState({ quantity: 0, educatorName: '', date: getTodayString() });
  
  // Transfer Form State
  const [transferForm, setTransferForm] = useState({ quantity: 0, targetCustodyId: '', date: getTodayString() });

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

      let repC = c.find(x => x.type === 'rep' && x.owner_id === user.id) || null;
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

    } catch (error) {
      console.error("Critical Load error", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        loadData();
    }
  }, [user, loadData]);

  const handleLogout = async () => {
      await supabase?.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setShowProfileModal(false);
      setActiveTab('dashboard');
  };

  const myStockLevel = useMemo(() => {
    return repCustody?.current_stock || 0;
  }, [repCustody]);

  // Helper to get hierarchy info
  const getUserContext = useCallback((userId: string) => {
      const prof = allProfiles.find(p => p.id === userId);
      if (!prof) return { mr: 'Unknown', dm: '-', lm: '-' };
      
      const dm = allProfiles.find(p => p.id === prof.manager_id);
      const lm = dm ? allProfiles.find(p => p.id === dm.manager_id) : null;
      
      return {
          mr: prof.full_name,
          dm: dm?.full_name || '-',
          lm: lm?.full_name || '-'
      };
  }, [allProfiles]);

  // Manager View Calculations
  const managerStockData = useMemo(() => {
    if (!userProfile || (userProfile.role !== 'dm' && userProfile.role !== 'lm')) return [];

    if (userProfile.role === 'dm') {
        // Direct Reports (MRs)
        const myMrs = allProfiles.filter(p => p.manager_id === user.id && p.role === 'mr');
        return myMrs.map(mr => {
            const c = custodies.find(item => item.owner_id === mr.id && item.type === 'rep');
            return {
                id: mr.id,
                name: mr.full_name,
                role: 'Medical Rep',
                manager_name: userProfile.full_name,
                stock: c?.current_stock || 0
            };
        }).sort((a,b) => b.stock - a.stock);
    }

    if (userProfile.role === 'lm') {
        // Flattened view: All MRs under my DMs
        const myDms = allProfiles.filter(p => p.manager_id === user.id && p.role === 'dm');
        let flattenedMrs: any[] = [];
        
        myDms.forEach(dm => {
            const teamMrs = allProfiles.filter(p => p.manager_id && p.manager_id === dm.id && p.role === 'mr');
            const mrData = teamMrs.map(mr => {
                const c = custodies.find(item => item.owner_id === mr.id && item.type === 'rep');
                return {
                    id: mr.id,
                    name: mr.full_name,
                    role: 'Medical Rep',
                    manager_name: dm.full_name,
                    stock: c?.current_stock || 0
                };
            });
            flattenedMrs = [...flattenedMrs, ...mrData];
        });

        return flattenedMrs.sort((a, b) => {
            // Sort by Manager Name then Stock
            if (a.manager_name < b.manager_name) return -1;
            if (a.manager_name > b.manager_name) return 1;
            return b.stock - a.stock;
        });
    }
    return [];
  }, [userProfile, allProfiles, custodies, user]);

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
  
  const uniquePrescribersCount = useMemo(() => {
      return new Set(visibleDeliveries.map(d => d.hcp_id)).size;
  }, [visibleDeliveries]);

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

  // Delivery Logic
  const handleSearchPatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nidSearch) return;
      
      const found = await dataService.searchPatient(nidSearch);
      setHasSearched(true);
      if (found) {
          setFoundPatient(found);
          setStep(2);
          showToast('Patient record found.', 'success');
      } else {
          setFoundPatient(null);
          showToast('Patient not found. Please register.', 'info');
      }
  };

  const handleCreatePatient = async () => {
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
        setStep(2); // Auto advance
        showToast("New patient registered", "success");
    } catch(e: any) {
        showToast(`Error creating patient: ${e.message}`, "error");
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
        showToast("Doctor registered successfully!", "success");
    } catch (error) {
        showToast("Failed to register doctor.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleCreateNewLocation = async () => {
      if (!newLocationName) return;
      setIsSubmitting(true);
      try {
          const newLoc = await dataService.createCustody({
              name: newLocationName,
              type: newLocationType, 
              created_at: new Date().toISOString(),
              owner_id: user.id // Associate with creating Rep
          });
          await loadData();
          setTransferForm(prev => ({ ...prev, targetCustodyId: newLoc.id }));
          setShowLocationModal(false);
          setNewLocationName('');
          setNewLocationType('clinic');
          showToast("New location created", "success");
      } catch (e: any) {
          console.error(e);
          if (e.message && e.message.includes('custodies_type_check')) {
              showToast("Database Error: Type 'pharmacy' not allowed. Please run the provided db_update.sql script.", "error");
          } else {
              showToast(e.message, "error");
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  // Duplicate Check
  useEffect(() => {
      const check = async () => {
          if (foundPatient && selectedProduct) {
              const isDup = await dataService.checkDuplicateDelivery(foundPatient.id, selectedProduct);
              setDuplicateWarning(isDup);
          }
      };
      if (step === 2) check();
  }, [foundPatient, selectedProduct, step]);

  const handleSubmitDelivery = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!foundPatient || !selectedHCP || !selectedProduct) {
          showToast("Please complete all fields", "error");
          return;
      }
      
      if (selectedCustody) {
          const custody = custodies.find(c => c.id === selectedCustody);
          if (custody && (custody.current_stock || 0) < 1) {
              showToast("Insufficient stock in selected inventory!", "error");
              return;
          }
      } else {
          showToast("No inventory source selected", "error");
          return;
      }

      setIsSubmitting(true);
      try {
          await dataService.logDelivery({
              patient_id: foundPatient.id,
              hcp_id: selectedHCP,
              product_id: selectedProduct,
              quantity: 1, 
              delivered_by: user.id,
              delivery_date: deliveryDate,
              rx_date: rxDate || undefined,
              custody_id: selectedCustody,
              educator_name: educatorName,
              educator_submission_date: educatorDate
          }, user.email);
          
          showToast("Delivery logged successfully", "success");
          
          setStep(1);
          setNidSearch('');
          setFoundPatient(null);
          setHasSearched(false);
          setRxDate('');
          setEducatorName('');
          setEducatorDate('');
          setDuplicateWarning(false);
          await loadData();
      } catch (err: any) {
          showToast(err.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        let targetRep = repCustody;
        if (!targetRep) throw new Error("Inventory not found");

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

  const handleTransferStock = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          if (!repCustody) throw new Error("Source inventory not found");
          const { quantity, targetCustodyId, date } = transferForm;
          
          if (!targetCustodyId) {
              showToast("Please select a destination", "error");
              return;
          }
          if (quantity > (repCustody.current_stock || 0)) {
              showToast("Insufficient stock for transfer", "error");
              return;
          }

          await dataService.processStockTransaction(
              targetCustodyId,
              Number(quantity),
              date || getTodayString(),
              "Transfer from Rep",
              repCustody.id
          );
          showToast("Stock transferred successfully", "success");
          setTransferForm({ quantity: 0, targetCustodyId: '', date: getTodayString() });
          await loadData();
      } catch (err: any) {
          showToast(err.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeleteItem = async (type: DBView, id: string) => {
      if (!window.confirm("Are you sure you want to delete this record?")) return;
      try {
          if (type === 'deliveries') await dataService.deleteDelivery(id);
          if (type === 'patients') await dataService.deletePatient(id);
          if (type === 'hcps') await dataService.deleteHCP(id);
          if (type === 'stock') await dataService.deleteStockTransaction(id);
          if (type === 'locations') await dataService.deleteCustody(id);
          
          showToast("Record deleted", "success");
          await loadData();
      } catch (e: any) {
          showToast("Delete failed: " + e.message, "error");
      }
  };

  const openEditModal = (item: any, type: DBView) => {
      setEditingItem({...item}); // copy
      setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
      if (!editingItem) return;
      setIsSubmitting(true);
      try {
          if (dbView === 'patients') {
              await dataService.updatePatient(editingItem.id, {
                  full_name: editingItem.full_name,
                  phone_number: editingItem.phone_number,
                  national_id: editingItem.national_id
              });
          } else if (dbView === 'hcps') {
              await dataService.updateHCP(editingItem.id, {
                  full_name: editingItem.full_name,
                  hospital: editingItem.hospital,
                  specialty: editingItem.specialty
              });
          } else if (dbView === 'locations') {
              await dataService.updateCustody(editingItem.id, {
                  name: editingItem.name
              });
          } else if (dbView === 'deliveries') {
              // Full Edit Capability for Delivery
              await dataService.updateDelivery(editingItem.id, {
                  quantity: editingItem.quantity,
                  delivery_date: editingItem.delivery_date,
                  product_id: editingItem.product_id,
                  hcp_id: editingItem.hcp_id,
                  rx_date: editingItem.rx_date,
                  educator_name: editingItem.educator_name,
                  educator_submission_date: editingItem.educator_submission_date
              });
          } else if (dbView === 'stock') {
              await dataService.updateStockTransaction(editingItem.id, {
                 quantity: editingItem.quantity,
                 transaction_date: editingItem.transaction_date,
                 source: editingItem.source
              });
          }
          showToast("Record updated", "success");
          setShowEditModal(false);
          setEditingItem(null);
          await loadData();
      } catch (e: any) {
          showToast("Update failed: " + e.message, "error");
      } finally {
          setIsSubmitting(false);
      }
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
            onLogout={handleLogout}
        />
        
        {/* Generic Edit Modal */}
        {showEditModal && editingItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-black text-white p-4 font-bold flex justify-between shrink-0">
                        <span>Edit Record</span>
                        <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        {dbView === 'patients' && (
                            <>
                                <input className="w-full border p-2 rounded" placeholder="Name" value={editingItem.full_name} onChange={e=>setEditingItem({...editingItem, full_name: e.target.value})} />
                                <input className="w-full border p-2 rounded" placeholder="National ID" value={editingItem.national_id} onChange={e=>setEditingItem({...editingItem, national_id: e.target.value})} />
                                <input className="w-full border p-2 rounded" placeholder="Phone" value={editingItem.phone_number} onChange={e=>setEditingItem({...editingItem, phone_number: e.target.value})} />
                            </>
                        )}
                        {dbView === 'hcps' && (
                            <>
                                <input className="w-full border p-2 rounded" placeholder="Dr Name" value={editingItem.full_name} onChange={e=>setEditingItem({...editingItem, full_name: e.target.value})} />
                                <input className="w-full border p-2 rounded" placeholder="Hospital" value={editingItem.hospital} onChange={e=>setEditingItem({...editingItem, hospital: e.target.value})} />
                                <input className="w-full border p-2 rounded" placeholder="Specialty" value={editingItem.specialty} onChange={e=>setEditingItem({...editingItem, specialty: e.target.value})} />
                            </>
                        )}
                        {dbView === 'locations' && (
                             <input className="w-full border p-2 rounded" placeholder="Location Name" value={editingItem.name} onChange={e=>setEditingItem({...editingItem, name: e.target.value})} />
                        )}
                        {dbView === 'deliveries' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
                                        <input type="number" className="w-full border p-2 rounded" value={editingItem.quantity} onChange={e=>setEditingItem({...editingItem, quantity: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Delivery Date</label>
                                        <input type="date" className="w-full border p-2 rounded" value={editingItem.delivery_date} onChange={e=>setEditingItem({...editingItem, delivery_date: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
                                    <select className="w-full border p-2 rounded bg-white" value={editingItem.product_id} onChange={e=>setEditingItem({...editingItem, product_id: e.target.value})}>
                                        {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Prescribing HCP</label>
                                    <select className="w-full border p-2 rounded bg-white" value={editingItem.hcp_id} onChange={e=>setEditingItem({...editingItem, hcp_id: e.target.value})}>
                                        {hcps.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Rx Date</label>
                                    <input type="date" className="w-full border p-2 rounded" value={editingItem.rx_date || ''} onChange={e=>setEditingItem({...editingItem, rx_date: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Educator Informed</label>
                                        <input className="w-full border p-2 rounded" value={editingItem.educator_name || ''} onChange={e=>setEditingItem({...editingItem, educator_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Info Date</label>
                                        <input type="date" className="w-full border p-2 rounded" value={editingItem.educator_submission_date || ''} onChange={e=>setEditingItem({...editingItem, educator_submission_date: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {dbView === 'stock' && (
                            <>
                                <label className="text-xs font-bold uppercase">Quantity (Negative for outgoing)</label>
                                <input type="number" className="w-full border p-2 rounded" value={editingItem.quantity} onChange={e=>setEditingItem({...editingItem, quantity: Number(e.target.value)})} />
                                <label className="text-xs font-bold uppercase">Source/Note</label>
                                <input className="w-full border p-2 rounded" value={editingItem.source} onChange={e=>setEditingItem({...editingItem, source: e.target.value})} />
                            </>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                        <button 
                            onClick={handleSaveEdit} 
                            disabled={isSubmitting}
                            className="w-full bg-[#FFC600] text-black font-bold py-3 uppercase tracking-wider hover:bg-yellow-400 rounded"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* New Location Modal */}
        {showLocationModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden border-t-4 border-[#FFC600]">
                    <div className="p-6">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#FFC600]"/> New Transfer Location
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">Create a new clinic or pharmacy to transfer stock to.</p>
                        <div className="space-y-4">
                            <input 
                                className="w-full border p-3 rounded bg-slate-50 outline-none focus:border-[#FFC600]" 
                                placeholder="Location Name" 
                                value={newLocationName} 
                                onChange={e => setNewLocationName(e.target.value)}
                                autoFocus
                            />
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Location Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-slate-50 flex-1">
                                        <input 
                                            type="radio" 
                                            name="locType" 
                                            checked={newLocationType === 'clinic'} 
                                            onChange={() => setNewLocationType('clinic')}
                                            className="accent-black w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">Clinic</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-slate-50 flex-1">
                                        <input 
                                            type="radio" 
                                            name="locType" 
                                            checked={newLocationType === 'pharmacy'} 
                                            onChange={() => setNewLocationType('pharmacy')}
                                            className="accent-black w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">Pharmacy</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={() => setShowLocationModal(false)}
                                    className="flex-1 bg-slate-100 py-3 rounded font-bold text-sm uppercase text-slate-500 hover:text-black hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateNewLocation}
                                    disabled={isSubmitting || !newLocationName.trim()}
                                    className="flex-1 bg-black text-white py-3 rounded font-bold text-sm uppercase hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {!user ? (
            <div className="flex-1 overflow-y-auto">
                <LandingPage onLogin={() => setShowLoginModal(true)} />
            </div>
        ) : (
          <>
             {/* Header */}
            <header className="bg-black text-white p-4 shadow-lg border-b-4 border-[#FFC600] z-20 sticky top-0">
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
                    <div className="absolute inset-0 z-40 bg-slate-100 overflow-y-auto">
                        <AnalyticsDashboard 
                            onBack={() => setActiveTab('dashboard')} 
                            deliveries={deliveries} 
                            hcps={hcps}
                            role={userProfile?.role || 'mr'}
                            profiles={allProfiles}
                            currentUserId={user.id}
                        />
                    </div>
                )}

                {/* Navigation Tabs */}
                {userProfile?.access === 'yes' && (
                    <nav className="bg-white border-b border-slate-200 px-4 shadow-sm overflow-x-auto shrink-0 z-10">
                        <div className="max-w-7xl mx-auto flex space-x-1">
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                // DELIVERY TAB: Only for MRs and Admins
                                ...(userProfile?.role === 'mr' || userProfile?.role === 'admin' ? [{ id: 'deliver', label: 'New Delivery', icon: Plus }] : []),
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
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => window.location.reload()} className="w-full bg-slate-100 py-2 rounded text-sm font-bold text-slate-700 hover:bg-slate-200">
                                        Check Status Again
                                    </button>
                                    <button onClick={handleLogout} className="w-full bg-black py-2 rounded text-sm font-bold text-white hover:bg-slate-800 flex items-center justify-center gap-2">
                                        <LogOut className="w-4 h-4"/> Log Out
                                    </button>
                                </div>
                            </div>
                        )}

                        {userProfile?.access === 'yes' && (
                            <>
                                {/* DASHBOARD TAB */}
                                {activeTab === 'dashboard' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        
                                        {/* Stats Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Stock Widget - Show Personal for MR/Admin, Team for Manager */}
                                            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400 uppercase">
                                                            {(userProfile.role === 'dm' || userProfile.role === 'lm') ? 'Network Stock' : 'My Stock'}
                                                        </p>
                                                        <h3 className="text-2xl font-black text-slate-900 mt-1">
                                                            {(userProfile.role === 'dm' || userProfile.role === 'lm') 
                                                                ? managerStockData.reduce((acc, i) => acc + i.stock, 0)
                                                                : myStockLevel
                                                            }
                                                        </h3>
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
                                                        <p className="text-xs font-bold text-slate-400 uppercase">Deliveries</p>
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

                                            {/* Mini Stats */}
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

                                {/* DELIVER TAB */}
                                {activeTab === 'deliver' && (userProfile?.role === 'mr' || userProfile?.role === 'admin') && (
                                    <div className="max-w-2xl mx-auto animate-in fade-in">
                                         
                                         {/* Step Indicator */}
                                         <div className="flex items-center justify-between mb-8 px-8">
                                            <div className={`flex flex-col items-center gap-2 z-10 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step >= 1 ? 'bg-black text-white border-black' : 'bg-white text-slate-300 border-slate-200'}`}>1</div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Identify</span>
                                            </div>
                                            <div className={`flex-1 h-1 mx-4 transition-all ${step >= 2 ? 'bg-black' : 'bg-slate-200'}`}></div>
                                            <div className={`flex flex-col items-center gap-2 z-10 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step >= 2 ? 'bg-[#FFC600] text-black border-[#FFC600]' : 'bg-white text-slate-300 border-slate-200'}`}>2</div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Details</span>
                                            </div>
                                         </div>

                                         {/* Step 1: Search */}
                                         {step === 1 && (
                                             <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
                                                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                     <Search className="w-8 h-8" />
                                                 </div>
                                                 <h3 className="text-xl font-bold text-slate-900 mb-2">Identify Patient</h3>
                                                 <p className="text-slate-500 mb-6 text-sm">Enter the patient's National ID or Phone to continue.</p>
                                                 
                                                 <form onSubmit={handleSearchPatient} className="max-w-md mx-auto relative mb-6">
                                                     <input 
                                                         type="text" 
                                                         placeholder="National ID / Phone Number"
                                                         className="w-full pl-5 pr-12 py-4 border-2 border-slate-200 rounded-lg text-lg outline-none focus:border-[#FFC600] font-bold tracking-widest"
                                                         value={nidSearch}
                                                         onChange={(e) => setNidSearch(e.target.value)}
                                                         autoFocus
                                                     />
                                                     <button type="submit" className="absolute right-2 top-2 bottom-2 bg-black text-white px-4 rounded font-bold uppercase text-sm hover:bg-slate-800 transition-colors">
                                                         Find
                                                     </button>
                                                 </form>

                                                 {hasSearched && !foundPatient && (
                                                     <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 animate-in zoom-in-95 duration-200">
                                                         <h4 className="font-bold text-slate-800 mb-4 flex items-center justify-center gap-2">
                                                             <Plus className="w-4 h-4 text-[#FFC600]" /> Register New Patient
                                                         </h4>
                                                         <div className="space-y-4 max-w-sm mx-auto">
                                                             <input 
                                                                 type="text" 
                                                                 placeholder="Full Patient Name"
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-black"
                                                                 value={newPatientForm.full_name}
                                                                 onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})}
                                                             />
                                                             <input 
                                                                 type="tel" 
                                                                 placeholder="Phone Number (Optional)"
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-black"
                                                                 value={newPatientForm.phone_number}
                                                                 onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})}
                                                             />
                                                             <button 
                                                                 onClick={handleCreatePatient}
                                                                 disabled={isSubmitting}
                                                                 className="w-full bg-[#FFC600] text-black font-bold py-3 rounded hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                                             >
                                                                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Create & Continue'}
                                                             </button>
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         )}

                                         {/* Step 2: Form */}
                                         {step === 2 && foundPatient && (
                                             <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                                 <div className="bg-black text-white p-4 flex justify-between items-center">
                                                     <div className="flex items-center gap-3">
                                                         <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                                                             {foundPatient.full_name.charAt(0)}
                                                         </div>
                                                         <div>
                                                             <h3 className="font-bold text-lg">{foundPatient.full_name}</h3>
                                                             <p className="text-xs text-slate-400 font-mono tracking-wider">{foundPatient.national_id}</p>
                                                         </div>
                                                     </div>
                                                     <button onClick={() => { setStep(1); setNidSearch(''); setFoundPatient(null); setHasSearched(false); }} className="text-slate-400 hover:text-white">
                                                         <X className="w-6 h-6" />
                                                     </button>
                                                 </div>

                                                 <form onSubmit={handleSubmitDelivery} className="p-6 md:p-8 space-y-6">
                                                     {/* Custody Warning */}
                                                     {myStockLevel < 1 && (
                                                         <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm flex items-start gap-3">
                                                             <AlertTriangle className="w-5 h-5 shrink-0" />
                                                             <div>
                                                                 <p className="font-bold">Out of Stock</p>
                                                                 <p>You have 0 pens in your inventory. You cannot log a delivery.</p>
                                                             </div>
                                                         </div>
                                                     )}

                                                     {/* Duplicate Warning */}
                                                     {duplicateWarning && (
                                                         <div className="bg-yellow-50 border-l-4 border-[#FFC600] p-4 text-yellow-800 text-sm flex items-start gap-3 animate-pulse">
                                                             <AlertTriangle className="w-5 h-5 shrink-0" />
                                                             <div>
                                                                 <p className="font-bold">Possible Duplicate</p>
                                                                 <p>This patient received this product recently. Verify prescription.</p>
                                                             </div>
                                                         </div>
                                                     )}

                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                         <div className="space-y-2">
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Prescribing Doctor</label>
                                                             <div className="flex gap-2">
                                                                 <select 
                                                                     required
                                                                     className="flex-1 px-4 py-3 border border-slate-300 bg-slate-50 rounded outline-none focus:border-[#FFC600]"
                                                                     value={selectedHCP}
                                                                     onChange={e => setSelectedHCP(e.target.value)}
                                                                 >
                                                                     <option value="">-- Select HCP --</option>
                                                                     {hcps.map(h => (
                                                                         <option key={h.id} value={h.id}>{h.full_name} ({h.hospital})</option>
                                                                     ))}
                                                                 </select>
                                                                 <button 
                                                                     type="button" 
                                                                     onClick={() => setShowHCPModal(true)}
                                                                     className="bg-slate-100 hover:bg-slate-200 p-3 rounded border border-slate-300 text-slate-600"
                                                                     title="Add New Doctor"
                                                                 >
                                                                     <Plus className="w-5 h-5" />
                                                                 </button>
                                                             </div>
                                                         </div>

                                                         <div className="space-y-2">
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Product</label>
                                                             <select 
                                                                 required
                                                                 className="w-full px-4 py-3 border border-slate-300 bg-slate-50 rounded outline-none focus:border-[#FFC600]"
                                                                 value={selectedProduct}
                                                                 onChange={e => setSelectedProduct(e.target.value)}
                                                             >
                                                                 {PRODUCTS.map(p => (
                                                                     <option key={p.id} value={p.id}>{p.name}</option>
                                                                 ))}
                                                             </select>
                                                         </div>
                                                         
                                                         <div className="space-y-2">
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Date of Delivery</label>
                                                             <input 
                                                                 type="date"
                                                                 required
                                                                 className="w-full px-4 py-3 border border-slate-300 bg-slate-50 rounded outline-none focus:border-[#FFC600]"
                                                                 value={deliveryDate}
                                                                 onChange={e => setDeliveryDate(e.target.value)}
                                                             />
                                                         </div>

                                                         <div className="space-y-2">
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Rx Date (Optional)</label>
                                                             <input 
                                                                 type="date"
                                                                 className="w-full px-4 py-3 border border-slate-300 bg-slate-50 rounded outline-none focus:border-[#FFC600]"
                                                                 value={rxDate}
                                                                 onChange={e => setRxDate(e.target.value)}
                                                             />
                                                         </div>

                                                         {/* Educator Section */}
                                                         <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded border border-slate-100">
                                                             <div className="space-y-2">
                                                                 <label className="text-xs font-bold text-slate-500 uppercase">Educator Informed</label>
                                                                 <input 
                                                                     type="text" 
                                                                     list="educators"
                                                                     placeholder="Name of Educator"
                                                                     className="w-full px-4 py-3 border border-slate-300 bg-white rounded outline-none focus:border-[#FFC600]"
                                                                     value={educatorName}
                                                                     onChange={e => setEducatorName(e.target.value)}
                                                                 />
                                                                  <datalist id="educators">
                                                                     {educatorSuggestions.map(s => <option key={s} value={s} />)}
                                                                 </datalist>
                                                             </div>
                                                             <div className="space-y-2">
                                                                 <label className="text-xs font-bold text-slate-500 uppercase">Date of Information</label>
                                                                 <input 
                                                                     type="date"
                                                                     className="w-full px-4 py-3 border border-slate-300 bg-white rounded outline-none focus:border-[#FFC600]"
                                                                     value={educatorDate}
                                                                     onChange={e => setEducatorDate(e.target.value)}
                                                                 />
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {/* Modal for New HCP */}
                                                     {showHCPModal && (
                                                         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                                             <div className="bg-white p-6 rounded-lg w-full max-w-sm border-t-4 border-[#FFC600]">
                                                                 <h4 className="font-bold text-lg mb-4">Add New Doctor</h4>
                                                                 <div className="space-y-4">
                                                                     <input type="text" placeholder="Dr. Name" className="w-full border p-2 rounded" value={newHCP.full_name} onChange={e => setNewHCP({...newHCP, full_name: e.target.value})} />
                                                                     
                                                                     <div>
                                                                        <input type="text" placeholder="Hospital/Clinic" className="w-full border p-2 rounded mb-2" value={newHCP.hospital} onChange={e => setNewHCP({...newHCP, hospital: e.target.value})} />
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {HOSPITAL_TAGS.map(tag => (
                                                                                <button 
                                                                                    key={tag}
                                                                                    type="button"
                                                                                    onClick={() => setNewHCP({...newHCP, hospital: tag})}
                                                                                    className="text-[10px] bg-slate-100 hover:bg-[#FFC600] hover:text-black px-2 py-1 rounded border border-slate-200"
                                                                                >
                                                                                    {tag}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                     </div>

                                                                     <div>
                                                                        <input type="text" placeholder="Specialty" className="w-full border p-2 rounded mb-2" value={newHCP.specialty} onChange={e => setNewHCP({...newHCP, specialty: e.target.value})} />
                                                                         <div className="flex flex-wrap gap-2">
                                                                            {SPECIALTY_TAGS.map(tag => (
                                                                                <button 
                                                                                    key={tag}
                                                                                    type="button"
                                                                                    onClick={() => setNewHCP({...newHCP, specialty: tag})}
                                                                                    className="text-[10px] bg-slate-100 hover:bg-[#FFC600] hover:text-black px-2 py-1 rounded border border-slate-200"
                                                                                >
                                                                                    {tag}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                     </div>

                                                                     <div className="flex gap-2 pt-2">
                                                                         <button onClick={() => setShowHCPModal(false)} className="flex-1 bg-slate-100 py-2 rounded font-bold">Cancel</button>
                                                                         <button onClick={handleCreateHCP} className="flex-1 bg-black text-white py-2 rounded font-bold">Save</button>
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     )}

                                                     <button 
                                                         type="submit"
                                                         disabled={isSubmitting || myStockLevel < 1}
                                                         className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-black uppercase tracking-widest py-4 rounded shadow-lg transform transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                                     >
                                                         {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Confirm Delivery'}
                                                     </button>
                                                 </form>
                                             </div>
                                         )}
                                    </div>
                                )}
                                
                                {/* CUSTODY TAB */}
                                {activeTab === 'custody' && (
                                    <div className="space-y-6 animate-in fade-in">
                                         {/* Header */}
                                         <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                                             <div className="flex items-center gap-4">
                                                 <div className="w-16 h-16 bg-slate-900 text-[#FFC600] rounded-full flex items-center justify-center">
                                                     <Package className="w-8 h-8" />
                                                 </div>
                                                 <div>
                                                     <h2 className="text-2xl font-black text-slate-900">
                                                        {(userProfile.role === 'dm' || userProfile.role === 'lm') ? 'TEAM INVENTORY' : 'MY INVENTORY'}
                                                     </h2>
                                                     <p className="text-slate-500 text-sm">
                                                        {(userProfile.role === 'dm' || userProfile.role === 'lm') ? 'Stock overview of your network' : 'Manage your stock levels'}
                                                     </p>
                                                 </div>
                                             </div>
                                             <div className="text-center md:text-right bg-slate-50 px-6 py-4 rounded border border-slate-100">
                                                 <span className="block text-4xl font-black text-slate-900">
                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') 
                                                        ? managerStockData.reduce((acc, i) => acc + i.stock, 0)
                                                        : myStockLevel
                                                     }
                                                 </span>
                                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pens</span>
                                             </div>
                                         </div>

                                         {/* ROLE BASED CONTENT */}
                                         
                                         {/* 1. MR & ADMIN VIEW: Interactive */}
                                         {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                 {/* Receive Form */}
                                                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                                     <h3 className="font-bold text-slate-900 uppercase text-sm mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                                         <Plus className="w-4 h-4"/> Receive Stock
                                                     </h3>
                                                     <form onSubmit={handleReceiveStock} className="space-y-4">
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Quantity In</label>
                                                             <input 
                                                                 type="number" 
                                                                 min="1"
                                                                 required
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600]"
                                                                 value={receiveForm.quantity}
                                                                 onChange={e => setReceiveForm({...receiveForm, quantity: Number(e.target.value)})}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Date Received</label>
                                                             <input 
                                                                 type="date"
                                                                 required
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600]"
                                                                 value={receiveForm.date}
                                                                 onChange={e => setReceiveForm({...receiveForm, date: e.target.value})}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">From Educator</label>
                                                             <input 
                                                                 type="text" 
                                                                 list="educators"
                                                                 required
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600]"
                                                                 value={receiveForm.educatorName}
                                                                 onChange={e => setReceiveForm({...receiveForm, educatorName: e.target.value})}
                                                                 placeholder="e.g. Nurse Joy"
                                                             />
                                                             <datalist id="educators">
                                                                 {educatorSuggestions.map(s => <option key={s} value={s} />)}
                                                             </datalist>
                                                         </div>
                                                         <button 
                                                             type="submit"
                                                             disabled={isSubmitting}
                                                             className="w-full bg-black text-white font-bold py-3 rounded hover:bg-slate-800 transition-colors uppercase text-sm tracking-wide"
                                                         >
                                                             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Log Receipt'}
                                                         </button>
                                                     </form>
                                                 </div>

                                                 {/* Transfer Form - NEW */}
                                                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                                     <h3 className="font-bold text-slate-900 uppercase text-sm mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                                         <Truck className="w-4 h-4"/> Transfer Stock
                                                     </h3>
                                                     <form onSubmit={handleTransferStock} className="space-y-4">
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Quantity Out</label>
                                                             <input 
                                                                 type="number" 
                                                                 min="1"
                                                                 max={myStockLevel}
                                                                 required
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600]"
                                                                 value={transferForm.quantity}
                                                                 onChange={e => setTransferForm({...transferForm, quantity: Number(e.target.value)})}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">Transfer Date</label>
                                                             <input 
                                                                 type="date"
                                                                 required
                                                                 className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600]"
                                                                 value={transferForm.date}
                                                                 onChange={e => setTransferForm({...transferForm, date: e.target.value})}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-bold text-slate-500 uppercase">To Location</label>
                                                             <div className="flex gap-1">
                                                                <select 
                                                                    required
                                                                    className="flex-1 px-4 py-2 border border-slate-300 rounded outline-none focus:border-[#FFC600] w-full"
                                                                    value={transferForm.targetCustodyId}
                                                                    onChange={e => setTransferForm({...transferForm, targetCustodyId: e.target.value})}
                                                                >
                                                                    <option value="">-- Select Destination --</option>
                                                                    {custodies.filter(c => c.type !== 'rep').map(c => (
                                                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowLocationModal(true)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 rounded flex items-center justify-center"
                                                                    title="Create New Location"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                             </div>
                                                         </div>
                                                         <button 
                                                             type="submit"
                                                             disabled={isSubmitting || myStockLevel < 1}
                                                             className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold py-3 rounded transition-colors uppercase text-sm tracking-wide"
                                                         >
                                                             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Transfer'}
                                                         </button>
                                                     </form>
                                                 </div>

                                                 {/* Recent Transactions */}
                                                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col lg:col-span-1 md:col-span-2">
                                                     <h3 className="font-bold text-slate-900 uppercase text-sm mb-4 border-b border-slate-100 pb-2">
                                                         Stock History
                                                     </h3>
                                                     <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3">
                                                         {stockTransactions.filter(t => t.custody_id === repCustody?.id).map(tx => (
                                                             <div key={tx.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded border border-slate-100">
                                                                 <div>
                                                                     <span className={`font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                         {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                                                                     </span>
                                                                     <span className="text-slate-500 ml-2">{formatDateFriendly(tx.transaction_date)}</span>
                                                                 </div>
                                                                 <div className="text-xs text-slate-400 max-w-[150px] truncate" title={tx.source}>
                                                                     {tx.source}
                                                                 </div>
                                                             </div>
                                                         ))}
                                                         {stockTransactions.filter(t => t.custody_id === repCustody?.id).length === 0 && (
                                                             <p className="text-center text-slate-400 py-4 text-xs">No transactions found.</p>
                                                         )}
                                                     </div>
                                                 </div>
                                            </div>
                                         )}

                                         {/* 2. DM & LM VIEW: Detailed Table */}
                                         {(userProfile.role === 'dm' || userProfile.role === 'lm') && (
                                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                                    <h3 className="font-bold text-slate-900 uppercase text-sm">
                                                        {userProfile.role === 'dm' ? 'District Team Breakdown' : 'Regional Network Breakdown'}
                                                    </h3>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-6 py-3">Medical Rep</th>
                                                                <th className="px-6 py-3">Reporting To (DM)</th>
                                                                <th className="px-6 py-3">Role</th>
                                                                <th className="px-6 py-3 text-right">Current Stock</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {managerStockData.map(item => (
                                                                <tr key={item.id} className="hover:bg-slate-50">
                                                                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                                                                    <td className="px-6 py-4 text-slate-600">{item.manager_name}</td>
                                                                    <td className="px-6 py-4 text-slate-500 text-xs uppercase">{item.role}</td>
                                                                    <td className="px-6 py-4 text-right font-mono font-bold">
                                                                        {item.stock} <span className="text-xs text-slate-400 font-sans">pens</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {managerStockData.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                                                        No team members assigned or no stock data available.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                         )}
                                    </div>
                                )}

                                {/* DATABASE TAB */}
                                {activeTab === 'database' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
                                         <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                                             <div className="flex gap-2">
                                                 {(['deliveries', 'patients', 'hcps', 'locations', 'stock'] as DBView[]).map(view => (
                                                     <button
                                                         key={view}
                                                         onClick={() => setDbView(view)}
                                                         className={`px-4 py-2 text-xs font-bold uppercase rounded-full border transition-colors ${dbView === view ? 'bg-black text-white border-black' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                     >
                                                         {view === 'stock' ? 'Transactions' : view.charAt(0).toUpperCase() + view.slice(1)}
                                                     </button>
                                                 ))}
                                             </div>
                                             
                                             <div className="relative">
                                                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                 <input 
                                                     type="text" 
                                                     placeholder="Search records..." 
                                                     value={searchTerm}
                                                     onChange={e => setSearchTerm(e.target.value)}
                                                     className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-full outline-none focus:border-[#FFC600] w-64"
                                                 />
                                             </div>
                                         </div>

                                         <div className="overflow-x-auto">
                                             <table className="w-full text-left text-sm">
                                                 <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                                                     <tr>
                                                         {dbView === 'deliveries' && (
                                                             <>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Patient</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">National ID</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Phone</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Product</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Qty</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Prescriber</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Rx Date</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Educator</th>
                                                                 <th className="px-6 py-3 whitespace-nowrap">Info Date</th>
                                                                 {/* Hierarchical Columns */}
                                                                 {(userProfile.role === 'dm' || userProfile.role === 'lm') && <th className="px-6 py-3">Medical Rep</th>}
                                                                 {userProfile.role === 'lm' && <th className="px-6 py-3">District Mgr</th>}
                                                             </>
                                                         )}
                                                         {dbView === 'patients' && (
                                                             <>
                                                                 <th className="px-6 py-3">Name</th>
                                                                 <th className="px-6 py-3">National ID</th>
                                                                 <th className="px-6 py-3">Phone</th>
                                                                 {(userProfile.role === 'dm' || userProfile.role === 'lm') && <th className="px-6 py-3">Medical Rep</th>}
                                                                 {userProfile.role === 'lm' && <th className="px-6 py-3">District Mgr</th>}
                                                             </>
                                                         )}
                                                         {dbView === 'hcps' && (
                                                             <>
                                                                 <th className="px-6 py-3">Doctor Name</th>
                                                                 <th className="px-6 py-3">Hospital</th>
                                                                 <th className="px-6 py-3">Specialty</th>
                                                                 {(userProfile.role === 'dm' || userProfile.role === 'lm') && <th className="px-6 py-3">Medical Rep</th>}
                                                                 {userProfile.role === 'lm' && <th className="px-6 py-3">District Mgr</th>}
                                                             </>
                                                         )}
                                                         {dbView === 'locations' && (
                                                             <>
                                                                 <th className="px-6 py-3">Name</th>
                                                                 <th className="px-6 py-3">Type</th>
                                                                 <th className="px-6 py-3 text-right">Stock</th>
                                                                 {(userProfile.role === 'dm' || userProfile.role === 'lm') && <th className="px-6 py-3">Owner/Rep</th>}
                                                                 {userProfile.role === 'lm' && <th className="px-6 py-3">District Mgr</th>}
                                                             </>
                                                         )}
                                                         {dbView === 'stock' && (
                                                             <>
                                                                 <th className="px-6 py-3">Date</th>
                                                                 <th className="px-6 py-3">Source/Desc</th>
                                                                 <th className="px-6 py-3 text-right">Qty</th>
                                                                 {(userProfile.role === 'dm' || userProfile.role === 'lm') && <th className="px-6 py-3">Location Owner</th>}
                                                                 {userProfile.role === 'lm' && <th className="px-6 py-3">District Mgr</th>}
                                                             </>
                                                         )}
                                                         
                                                         {/* Action Column for MRs only */}
                                                         {(userProfile.role === 'mr' || userProfile.role === 'admin') && <th className="px-6 py-3 text-right">Actions</th>}
                                                     </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-100">
                                                     {dbView === 'deliveries' && visibleDeliveries
                                                         .filter(d => 
                                                             (d.patient?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                             (d.hcp?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                                         )
                                                         .map(d => {
                                                             const ctx = getUserContext(d.delivered_by);
                                                             return (
                                                                 <tr key={d.id} className="hover:bg-slate-50">
                                                                     <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">{formatDateFriendly(d.delivery_date)}</td>
                                                                     <td className="px-6 py-3 font-bold whitespace-nowrap">{d.patient?.full_name}</td>
                                                                     <td className="px-6 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{d.patient?.national_id}</td>
                                                                     <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{d.patient?.phone_number}</td>
                                                                     <td className="px-6 py-3 whitespace-nowrap">{PRODUCTS.find(p=>p.id===d.product_id)?.name}</td>
                                                                     <td className="px-6 py-3 font-bold whitespace-nowrap">{d.quantity}</td>
                                                                     <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{d.hcp?.full_name}</td>
                                                                     <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{d.rx_date ? formatDateFriendly(d.rx_date) : '-'}</td>
                                                                     <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{d.educator_name || '-'}</td>
                                                                     <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{d.educator_submission_date ? formatDateFriendly(d.educator_submission_date) : '-'}</td>
                                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') && <td className="px-6 py-3 text-blue-600 font-medium text-xs">{ctx.mr}</td>}
                                                                     {userProfile.role === 'lm' && <td className="px-6 py-3 text-purple-600 font-medium text-xs">{ctx.dm}</td>}
                                                                     {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                                            <button onClick={() => openEditModal(d, 'deliveries')} className="text-slate-400 hover:text-black"><Pencil className="w-4 h-4"/></button>
                                                                            <button onClick={() => handleDeleteItem('deliveries', d.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                                        </td>
                                                                     )}
                                                                 </tr>
                                                             );
                                                         })
                                                     }
                                                     {dbView === 'patients' && patients
                                                         .filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                         .map(p => {
                                                             const ctx = getUserContext(p.created_by || '');
                                                             return (
                                                                 <tr key={p.id} className="hover:bg-slate-50">
                                                                     <td className="px-6 py-3 font-bold">{p.full_name}</td>
                                                                     <td className="px-6 py-3 font-mono text-slate-500">{p.national_id}</td>
                                                                     <td className="px-6 py-3 text-slate-500">{p.phone_number}</td>
                                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') && <td className="px-6 py-3 text-xs text-slate-400">{ctx.mr}</td>}
                                                                     {userProfile.role === 'lm' && <td className="px-6 py-3 text-xs text-purple-600">{ctx.dm}</td>}
                                                                     {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                                            <button onClick={() => openEditModal(p, 'patients')} className="text-slate-400 hover:text-black"><Pencil className="w-4 h-4"/></button>
                                                                            <button onClick={() => handleDeleteItem('patients', p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                                        </td>
                                                                     )}
                                                                 </tr>
                                                             );
                                                         })
                                                     }
                                                     {dbView === 'hcps' && hcps
                                                         .filter(h => h.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                         .map(h => {
                                                             const ctx = getUserContext(h.created_by || '');
                                                             return (
                                                                 <tr key={h.id} className="hover:bg-slate-50">
                                                                     <td className="px-6 py-3 font-bold">{h.full_name}</td>
                                                                     <td className="px-6 py-3">{h.hospital}</td>
                                                                     <td className="px-6 py-3 text-slate-500">{h.specialty}</td>
                                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') && <td className="px-6 py-3 text-xs text-slate-400">{ctx.mr}</td>}
                                                                     {userProfile.role === 'lm' && <td className="px-6 py-3 text-xs text-purple-600">{ctx.dm}</td>}
                                                                     {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                                            <button onClick={() => openEditModal(h, 'hcps')} className="text-slate-400 hover:text-black"><Pencil className="w-4 h-4"/></button>
                                                                            <button onClick={() => handleDeleteItem('hcps', h.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                                        </td>
                                                                     )}
                                                                 </tr>
                                                             );
                                                         })
                                                     }
                                                     {dbView === 'locations' && custodies
                                                         .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                         .map(c => {
                                                             const ctx = getUserContext(c.owner_id || '');
                                                             return (
                                                                 <tr key={c.id} className="hover:bg-slate-50">
                                                                     <td className="px-6 py-3 font-bold">{c.name}</td>
                                                                     <td className="px-6 py-3 uppercase text-xs font-bold text-slate-500">{c.type}</td>
                                                                     <td className="px-6 py-3 text-right font-mono">{c.current_stock}</td>
                                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') && <td className="px-6 py-3 text-xs text-slate-400">{c.owner_id ? ctx.mr : '-'}</td>}
                                                                     {userProfile.role === 'lm' && <td className="px-6 py-3 text-xs text-purple-600">{c.owner_id ? ctx.dm : '-'}</td>}
                                                                     {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                                            <button onClick={() => openEditModal(c, 'locations')} className="text-slate-400 hover:text-black"><Pencil className="w-4 h-4"/></button>
                                                                            <button onClick={() => handleDeleteItem('locations', c.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                                        </td>
                                                                     )}
                                                                 </tr>
                                                             );
                                                         })
                                                     }
                                                     {dbView === 'stock' && stockTransactions
                                                         .filter(t => t.source.toLowerCase().includes(searchTerm.toLowerCase()))
                                                         .map(t => {
                                                             // Find owner of the custody for this transaction
                                                             const c = custodies.find(c => c.id === t.custody_id);
                                                             const ctx = getUserContext(c?.owner_id || '');
                                                             
                                                             // Filter visibility based on role for Transactions
                                                             let visible = true;
                                                             if (userProfile.role === 'mr' && c?.owner_id !== user.id) visible = false;
                                                             if (userProfile.role === 'dm') {
                                                                 const isMyRep = allProfiles.find(p => p.id === c?.owner_id)?.manager_id === user.id;
                                                                 if (!isMyRep && c?.owner_id !== user.id) visible = false;
                                                             }

                                                             if (!visible && userProfile.role !== 'admin' && userProfile.role !== 'lm') return null;

                                                             return (
                                                                 <tr key={t.id} className="hover:bg-slate-50">
                                                                     <td className="px-6 py-3 font-mono text-xs">{formatDateFriendly(t.transaction_date)}</td>
                                                                     <td className="px-6 py-3">{t.source}</td>
                                                                     <td className={`px-6 py-3 text-right font-bold ${t.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                         {t.quantity > 0 ? '+' : ''}{t.quantity}
                                                                     </td>
                                                                     {(userProfile.role === 'dm' || userProfile.role === 'lm') && <td className="px-6 py-3 text-xs text-slate-400">{c?.owner_id ? ctx.mr : '-'}</td>}
                                                                     {userProfile.role === 'lm' && <td className="px-6 py-3 text-xs text-purple-600">{c?.owner_id ? ctx.dm : '-'}</td>}
                                                                     {(userProfile.role === 'mr' || userProfile.role === 'admin') && (
                                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                                            <button onClick={() => openEditModal(t, 'stock')} className="text-slate-400 hover:text-black"><Pencil className="w-4 h-4"/></button>
                                                                            <button onClick={() => handleDeleteItem('stock', t.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                                        </td>
                                                                     )}
                                                                 </tr>
                                                             );
                                                         })
                                                     }
                                                 </tbody>
                                             </table>
                                             {/* Empty States */}
                                             {(
                                                 (dbView === 'deliveries' && visibleDeliveries.length === 0) ||
                                                 (dbView === 'patients' && patients.length === 0) ||
                                                 (dbView === 'hcps' && hcps.length === 0)
                                             ) && (
                                                 <div className="p-12 text-center text-slate-400 text-sm">No records found.</div>
                                             )}
                                         </div>
                                    </div>
                                )}
                            </>
                        )}
                        
                    </div>
                </div>
                
                {/* Footer placed outside scroll area */}
                <Footer />
            </main>
          </>
        )}
    </div>
  );
};