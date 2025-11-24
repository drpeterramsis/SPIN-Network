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
  FileText,
  PieChart,
  ChevronDown,
  ChevronUp,
  Network
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { AIReportModal } from './components/AIReportModal';
import { ProfileModal } from './components/ProfileModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const METADATA = {
  name: "S.P.I.N v2.0.030",
  version: "2.0.030"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin' | 'analytics';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

const COLORS = ['#FFC600', '#000000', '#94a3b8', '#475569', '#cbd5e1'];

// Product Color Mapping for small charts in dashboard
const PRODUCT_COLOR_MAP: Record<string, string> = {
  'glargivin-100': '#8b5cf6', // Violet
  'humaxin-r': '#eab308',     // Yellow
  'humaxin-mix': '#f97316',   // Orange
};

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
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dbView, setDbView] = useState<DBView>('deliveries');
  
  // Data States
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [repCustody, setRepCustody] = useState<Custody | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);

  const [showAIModal, setShowAIModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Dashboard Expand States
  const [expandPrescribers, setExpandPrescribers] = useState(false);
  const [expandDeliveries, setExpandDeliveries] = useState(true);

  // Computed Suggestions
  const [hcpSpecialties, setHcpSpecialties] = useState<string[]>([]);
  const [hcpHospitals, setHcpHospitals] = useState<string[]>([]);

  // Edit State
  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<DBView | null>(null);
  const [editDuplicateWarning, setEditDuplicateWarning] = useState(false);
  const [editPatientDetails, setEditPatientDetails] = useState<{national_id: string, phone_number: string} | null>(null);
  
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
          
          // Reset state on logout to prevent white screen / stale data
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
      setCustodies(c);
      setStockTransactions(s);
      setPatients(p);
      setAllProfiles(profs);
      
      // Load Current User Profile
      let currentProf = profs.find(pr => pr.id === user.id);
      
      // Safety Check for Super Admin
      if (user.email === 'admin@spin.com') {
          if (!currentProf) {
             // Create phantom profile in memory if DB sync lagged
             currentProf = { id: user.id, email: user.email, full_name: 'Super Admin', employee_id: 'ADMIN', role: 'admin', access: 'yes' };
          } else if (currentProf.role !== 'admin') {
              currentProf.role = 'admin';
              currentProf.access = 'yes';
          }
      }
      
      // Default to MR if undefined
      if (currentProf && !currentProf.role) currentProf.role = 'mr';
      setUserProfile(currentProf || null);

      try {
          const repC = await dataService.getRepCustody();
          setRepCustody(repC);
      } catch (e) {
          console.error("Error loading Rep Custody", e);
      }

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

  // HIERARCHY FILTERING LOGIC
  const getVisibleDeliveries = () => {
      if (!userProfile) return [];
      if (userProfile.role === 'admin') return deliveries;

      if (userProfile.role === 'mr') {
          // MR sees only their own
          return deliveries.filter(d => d.delivered_by === user.id);
      }

      if (userProfile.role === 'dm') {
          // DM sees their MRs
          const myMRs = allProfiles.filter(p => p.manager_id === user.id).map(p => p.id);
          return deliveries.filter(d => myMRs.includes(d.delivered_by));
      }

      if (userProfile.role === 'lm') {
          // LM sees their DMs' MRs
          const myDMs = allProfiles.filter(p => p.manager_id === user.id).map(p => p.id);
          const myTeamMRs = allProfiles.filter(p => p.manager_id && myDMs.includes(p.manager_id)).map(p => p.id);
          return deliveries.filter(d => myTeamMRs.includes(d.delivered_by));
      }

      return [];
  };

  const getVisibleStock = () => {
      if (!userProfile) return [];
      if (userProfile.role === 'admin') return stockTransactions;
      
      // MR only sees stock transactions for their own custody
      if (userProfile.role === 'mr' && repCustody) {
          return stockTransactions.filter(t => t.custody_id === repCustody.id);
      }

      // Default: show empty or global if needed, but for now restrict to admin/mr own
      return []; 
  };

  const visibleDeliveries = getVisibleDeliveries();
  const visibleStock = getVisibleStock();

  // Helper to resolve Hierarchy Names
  const getMrAndDm = (mrId: string) => {
      const mr = allProfiles.find(p => p.id === mrId);
      const dm = mr?.manager_id ? allProfiles.find(p => p.id === mr.manager_id) : null;
      return { 
          mrName: mr?.full_name || 'Unknown', 
          dmName: dm?.full_name || 'Unassigned' 
      };
  };

  // --- ANALYTICS CALCULATIONS ---
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

  const checkEditDuplication = async () => {
      if (editType === 'deliveries' && editItem?.patient_id && editItem?.product_id) {
          const isDup = await dataService.checkDuplicateDelivery(editItem.patient_id, editItem.product_id);
          setEditDuplicateWarning(isDup);
          if (isDup) {
             showToast("Duplicate Detected: Patient recently received this product.", "info");
          } else {
             showToast("No duplicates found.", "success");
          }
      }
  };

  useEffect(() => {
      if (editType === 'deliveries' && editItem?.patient_id && editItem?.product_id) {
          dataService.checkDuplicateDelivery(editItem.patient_id, editItem.product_id).then(setEditDuplicateWarning);
      } else {
          setEditDuplicateWarning(false);
      }
  }, [editItem?.patient_id, editItem?.product_id, editType]);

  useEffect(() => {
      if (editType === 'deliveries' && editItem?.patient_id) {
          const p = patients.find(pat => pat.id === editItem.patient_id);
          if (p) {
              setEditPatientDetails({ national_id: p.national_id, phone_number: p.phone_number });
          } else {
              setEditPatientDetails(null);
          }
      } else {
          setEditPatientDetails(null);
      }
  }, [editItem, editType, patients]);


  const handlePatientSearch = async () => {
    if (nidSearch.length < 3) {
        showToast("Please enter at least 3 characters", "error");
        return;
    }
    setHasSearched(true);
    const p = await dataService.searchPatient(nidSearch);
    setFoundPatient(p);
    if (p) {
      const isDup = await dataService.checkDuplicateDelivery(p.id, selectedProduct);
      setDuplicateWarning(isDup);
    } else {
      setDuplicateWarning(false);
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
        showToast("New patient registered", "success");
    } catch(e) {
        showToast("Error creating patient", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancelDelivery = () => {
      if(window.confirm("Are you sure you want to cancel this transaction? All data will be lost.")) {
        setStep(1);
        setFoundPatient(null);
        setNidSearch('');
        setHasSearched(false);
        setNewPatientForm({ full_name: '', phone_number: '' });
        setDuplicateWarning(false);
        setEducatorName('');
        setEducatorDate('');
        setRxDate('');
      }
  };

  const handleCreateHCP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHCP.full_name || !newHCP.hospital) return;
    setIsSubmitting(true);
    try {
        const created = await dataService.createHCP(newHCP);
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

  const handleSubmitDelivery = async () => {
    if (!foundPatient) { showToast("No patient selected", "error"); return; }
    if (!selectedHCP) { showToast("Please select a Prescribing Doctor", "error"); return; }
    if (!selectedProduct) { showToast("Please select a Product", "error"); return; }
    if (!selectedCustody) { showToast("Please select a Source Custody", "error"); return; }
    if (!educatorName) { showToast("Please enter the Reported Educator Name", "error"); return; }
    
    setIsSubmitting(true);
    try {
      const userDisplayName = userProfile?.full_name || user.email;
      await dataService.logDelivery({
        patient_id: foundPatient.id,
        hcp_id: selectedHCP,
        product_id: selectedProduct,
        delivered_by: user.id,
        quantity: 1,
        delivery_date: deliveryDate,
        rx_date: rxDate,
        educator_name: educatorName,
        educator_submission_date: educatorDate,
        custody_id: selectedCustody,
        patient: foundPatient 
      }, userDisplayName);
      
      showToast("Delivery Logged Successfully", "success");
      setStep(1);
      setNidSearch('');
      setFoundPatient(null);
      setHasSearched(false);
      setNewPatientForm({ full_name: '', phone_number: '' });
      setRxDate('');
      setEducatorDate('');
      setEducatorName('');
      loadData();
      setActiveTab('database');
      setDbView('deliveries');
    } catch (e: any) {
      showToast("Failed to log delivery: " + e.message, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        let targetRep = await dataService.getRepCustody();
        if (!targetRep) {
            try {
                targetRep = await dataService.createCustody({
                    name: 'My Rep Inventory',
                    type: 'rep',
                    created_at: new Date().toISOString()
                });
                setRepCustody(targetRep);
                setCustodies(prev => [...prev, targetRep!]);
            } catch (createErr) {
                targetRep = await dataService.getRepCustody();
            }
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

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const { toCustodyId, quantity, date, sourceType, educatorName } = transferForm;
    if (!toCustodyId || !quantity) {
        showToast("Please select a destination and quantity.", "error");
        return;
    }
    
    setIsSubmitting(true);

    try {
        let fromCustodyId = undefined;
        let sourceLabel = `Educator: ${educatorName || 'Unknown'}`;

        if (sourceType === 'rep') {
            let r = await dataService.getRepCustody();
            if (!r) {
                try {
                    r = await dataService.createCustody({
                        name: 'My Rep Inventory',
                        type: 'rep',
                        created_at: new Date().toISOString()
                    });
                    setRepCustody(r);
                    setCustodies(prev => [...prev, r!]);
                } catch (createErr) {
                    r = await dataService.getRepCustody();
                }
            }

            if (!r || !r.id) throw new Error("Rep custody not initialized.");
            fromCustodyId = r.id;
            sourceLabel = 'Medical Rep Transfer';
        }

        await dataService.processStockTransaction(toCustodyId, Number(quantity), date, sourceLabel, fromCustodyId);
        showToast("Stock transferred successfully", "success");
        setTransferForm({ ...transferForm, quantity: 0, educatorName: '' });
        await loadData();
    } catch (err: any) {
        showToast("Transfer Failed: " + err.message, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicForm.name) return;
    setIsSubmitting(true);
    try {
        const finalName = newClinicForm.isPharmacy ? `${newClinicForm.name} (Pharmacy)` : newClinicForm.name;
        const created = await dataService.createCustody({
            name: finalName,
            type: 'clinic',
            created_at: newClinicForm.date
        });
        showToast("Location Registered", "success");
        setNewClinicForm({ name: '', date: getTodayString(), isPharmacy: false });
        setShowClinicModal(false);
        await loadData();
        
        if(activeTab === 'deliver') {
            setSelectedCustody(created.id);
        } else {
            setTransferForm(prev => ({ ...prev, toCustodyId: created.id }));
        }
    } catch (err: any) {
        showToast(err.message, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (type: DBView | 'tx', id: string) => {
      if (!window.confirm("Are you sure you want to delete this record? This will delete all related records (cascading) and restore stock if applicable.")) return;
      setIsSubmitting(true);
      try {
          if (type === 'deliveries') await dataService.deleteDelivery(id);
          if (type === 'hcps') await dataService.deleteHCP(id);
          if (type === 'locations') await dataService.deleteCustody(id);
          if (type === 'stock' || type === 'tx') await dataService.deleteStockTransaction(id);
          if (type === 'patients') await dataService.deletePatient(id);
          
          showToast("Record deleted and database updated.", "success");
          loadData();
      } catch (err: any) {
          showToast("Delete failed: " + err.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleRetrieveStock = async (tx: StockTransaction) => {
      const custody = custodies.find(c => c.id === tx.custody_id);
      if (!custody) return;
      if (!repCustody) { showToast("Rep inventory not found", "error"); return; }
      
      if (!window.confirm(`Retrieve ${tx.quantity} pens from ${custody.name} back to My Inventory?`)) return;

      setIsSubmitting(true);
      try {
          await dataService.processStockTransaction(
              repCustody.id,
              tx.quantity,
              getTodayString(),
              `Retrieved from ${custody.name}`, 
              custody.id 
          );
          
          showToast("Stock retrieved successfully.", "success");
          loadData();
      } catch(e: any) {
          showToast("Retrieve failed: " + e.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const openEditModal = (type: DBView | 'tx', item: any) => {
      setEditType(type === 'tx' ? 'stock' : type);
      setEditItem(item);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          if (editType === 'deliveries') {
              if (editItem?.patient_id && editItem?.product_id) {
                  const isDup = await dataService.checkDuplicateDelivery(editItem.patient_id, editItem.product_id);
                  if (isDup) {
                      const confirm = window.confirm("WARNING: DUPLICATE DETECTED!\n\nThis patient has already received this product recently. Are you sure you want to approve this assignment?");
                      if (!confirm) { setIsSubmitting(false); return; }
                  }
              }

              if (editItem.patient_id && editPatientDetails) {
                 await dataService.updatePatient(editItem.patient_id, {
                     national_id: editPatientDetails.national_id,
                     phone_number: editPatientDetails.phone_number
                 });
              }

              await dataService.updateDelivery(editItem.id, {
                  delivery_date: editItem.delivery_date,
                  rx_date: editItem.rx_date,
                  educator_name: editItem.educator_name,
                  notes: editItem.notes,
                  hcp_id: editItem.hcp_id,
                  custody_id: editItem.custody_id,
                  product_id: editItem.product_id,
                  patient_id: editItem.patient_id
              });
          } else if (editType === 'hcps') {
              await dataService.updateHCP(editItem.id, {
                  full_name: editItem.full_name,
                  specialty: editItem.specialty,
                  hospital: editItem.hospital
              });
          } else if (editType === 'locations') {
              await dataService.updateCustody(editItem.id, {
                  name: editItem.name,
                  current_stock: Number(editItem.current_stock),
                  created_at: editItem.created_at
              });
          } else if (editType === 'stock') {
              await dataService.updateStockTransaction(editItem.id, {
                  transaction_date: editItem.transaction_date,
                  source: editItem.source,
                  quantity: Number(editItem.quantity)
              });
          } else if (editType === 'patients') {
              await dataService.updatePatient(editItem.id, {
                  full_name: editItem.full_name,
                  national_id: editItem.national_id,
                  phone_number: editItem.phone_number
              });
          }
          showToast("Record updated successfully", "success");
          setEditItem(null);
          setEditType(null);
          setEditDuplicateWarning(false);
          setEditPatientDetails(null);
          loadData();
      } catch (err: any) {
          showToast("Update failed: " + err.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const resolveSourceText = (text: string) => {
      if (!text) return '-';
      let resolved = text;
      custodies.forEach(c => {
          if (resolved.includes(c.id)) resolved = resolved.split(c.id).join(c.name);
      });
      hcps.forEach(h => {
          if (resolved.includes(h.id)) resolved = resolved.split(h.id).join(h.full_name);
      });
      patients.forEach(p => {
          if (resolved.includes(p.id)) resolved = resolved.split(p.id).join(p.full_name);
      });
      if (user && resolved.includes(user.id)) resolved = resolved.split(user.id).join(userProfile?.full_name || 'Me');
      
      return resolved;
  };

  const filterData = (data: any[]) => {
      if (!searchTerm) return data;
      const lower = searchTerm.toLowerCase();
      return data.filter(item => {
          const stringify = (obj: any): string => {
             return Object.values(obj || {}).map(v => typeof v === 'object' ? stringify(v) : v).join(' ');
          };
          return stringify(item).toLowerCase().includes(lower);
      });
  };

  const getLastSupplyDate = (custodyId: string) => {
      const supplies = stockTransactions
        .filter(t => t.custody_id === custodyId && t.quantity > 0)
        .sort((a,b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      
      if (supplies.length === 0) return 'Never';
      return formatDateFriendly(supplies[0].transaction_date);
  };

  const getProductStyles = (id: string) => {
    switch (id) {
        case 'glargivin-100': return 'bg-violet-100 text-violet-800 border-violet-200';
        case 'humaxin-r': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'humaxin-mix': return 'bg-orange-100 text-orange-800 border-orange-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getProductButtonStyles = (id: string, selected: boolean) => {
    if (!selected) return 'border-slate-100 hover:border-slate-300 bg-white';
    switch(id) {
        case 'glargivin-100': return 'border-violet-500 bg-violet-50 text-violet-900';
        case 'humaxin-r': return 'border-yellow-500 bg-yellow-50 text-yellow-900';
        case 'humaxin-mix': return 'border-orange-500 bg-orange-50 text-orange-900';
        default: return 'border-slate-500 bg-slate-50';
    }
  };

  const LockedState = ({ title, description, loginRequired }: { title: string, description: string, loginRequired?: boolean }) => (
    <div className="bg-white border-t-4 border-slate-200 shadow-sm p-12 text-center">
        <div className="bg-slate-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">{description}</p>
        {loginRequired && (
            <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-[#FFC600] hover:bg-yellow-400 text-black px-8 py-3 font-bold uppercase tracking-wide shadow-lg transition-colors"
            >
                Login to Access
            </button>
        )}
    </div>
  );

  const renderTeamStats = () => {
      if (userProfile?.role === 'dm') {
          const myMrs = allProfiles.filter(p => p.manager_id === user.id);
          const stats = myMrs.map(mr => {
              const count = deliveries.filter(d => d.delivered_by === mr.id).length;
              return { ...mr, count };
          }).sort((a,b) => b.count - a.count);

          return (
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                          <tr><th className="p-3">Medical Representative</th><th className="p-3">Employee ID</th><th className="p-3 text-right">Deliveries</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {stats.map(mr => (
                              <tr key={mr.id}>
                                  <td className="p-3 font-bold text-slate-700">{mr.full_name}</td>
                                  <td className="p-3 text-slate-500 font-mono text-xs">{mr.employee_id}</td>
                                  <td className="p-3 text-right font-black">{mr.count}</td>
                              </tr>
                          ))}
                          {stats.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">No team members assigned.</td></tr>}
                      </tbody>
                  </table>
              </div>
          );
      }
      
      if (userProfile?.role === 'lm') {
           const myDms = allProfiles.filter(p => p.manager_id === user.id);
           // Build tree
           const tree = myDms.map(dm => {
               const dmMrs = allProfiles.filter(p => p.manager_id === dm.id);
               const mrStats = dmMrs.map(mr => ({
                   ...mr,
                   count: deliveries.filter(d => d.delivered_by === mr.id).length
               }));
               const total = mrStats.reduce((sum, item) => sum + item.count, 0);
               return { dm, mrStats, total };
           }).sort((a,b) => b.total - a.total);

           return (
               <div className="space-y-4">
                   {tree.map(node => (
                       <div key={node.dm.id} className="border border-slate-200 rounded-lg overflow-hidden">
                           <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                               <div>
                                   <h4 className="font-bold text-slate-800 text-sm">{node.dm.full_name} <span className="text-xs font-normal text-slate-500">(DM)</span></h4>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">{node.mrStats.length} MRs Assigned</p>
                               </div>
                               <div className="bg-black text-[#FFC600] px-3 py-1 rounded text-xs font-black">{node.total}</div>
                           </div>
                           <div className="divide-y divide-slate-50">
                               {node.mrStats.map(mr => (
                                   <div key={mr.id} className="p-2 pl-4 flex justify-between items-center text-xs hover:bg-slate-50">
                                       <span className="text-slate-600 font-medium">{mr.full_name}</span>
                                       <span className="font-mono text-slate-400">{mr.count}</span>
                                   </div>
                               ))}
                               {node.mrStats.length === 0 && <div className="p-2 text-center text-[10px] text-slate-400">No MRs in this district.</div>}
                           </div>
                       </div>
                   ))}
                   {tree.length === 0 && <div className="p-4 text-center text-slate-400 italic">No districts assigned.</div>}
               </div>
           );
      }
      return null;
  };

  const getProductName = (id: string) => PRODUCTS.find(p => p.id === id)?.name || id;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFC600]"><Activity className="animate-spin w-10 h-10" /></div>;

  const canDeliver = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const canManageStock = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';
  const isReadOnly = userProfile?.role === 'dm' || userProfile?.role === 'lm';

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden relative">
      
      {notification && (
          <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />
      )}

      {isSubmitting && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
             <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-200">
                 <Loader2 className="w-10 h-10 text-[#FFC600] animate-spin mb-3" />
                 <p className="font-bold text-slate-800 animate-pulse">Processing...</p>
             </div>
          </div>
      )}

      {installPrompt && (
          <div className="bg-black text-white p-3 flex justify-between items-center z-50 sticky top-0 shadow-lg">
              <div className="flex items-center gap-3">
                  <img src="icon.svg" className="w-8 h-8 rounded border border-slate-700" alt="Icon" />
                  <div className="text-xs">
                      <p className="font-bold text-[#FFC600]">INSTALL S.P.I.N</p>
                      <p className="text-slate-400">Add Supply Network to your home screen.</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setInstallPrompt(null)} className="text-slate-400 hover:text-white p-2"><X className="w-4 h-4"/></button>
                  <button onClick={handleInstallClick} className="bg-[#FFC600] text-black px-3 py-1.5 text-xs font-bold uppercase rounded hover:bg-yellow-400 flex items-center gap-1"><Download className="w-3 h-3"/> Install</button>
              </div>
          </div>
      )}

      <Auth isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={setUser} />
      {user && <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} onLogout={() => { setUser(null); setShowProfileModal(false); }} />}
      
      {/* Full Page Analytics View */}
      {user && activeTab === 'analytics' && (
          <div className="fixed inset-0 z-[60] bg-slate-100 overflow-y-auto">
            <AnalyticsDashboard 
                onBack={() => setActiveTab('dashboard')} 
                deliveries={visibleDeliveries} 
                hcps={hcps} 
                role={userProfile?.role || 'mr'} 
            />
          </div>
      )}

      {editItem && editType && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => { setEditItem(null); setEditType(null); setEditDuplicateWarning(false); setEditPatientDetails(null); }}>
             <div className="bg-white w-full max-w-md border-t-4 border-[#FFC600] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                 <div className="bg-black p-4 flex items-center justify-between sticky top-0 z-10">
                     <div className="flex items-center gap-3">
                        <Pencil className="w-5 h-5 text-[#FFC600]" />
                        <h3 className="text-white font-bold">Edit Record</h3>
                     </div>
                     <button onClick={() => { setEditItem(null); setEditType(null); setEditDuplicateWarning(false); setEditPatientDetails(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                    {/* Form fields */}
                    {editType === 'deliveries' && (
                        <>
                             {editDuplicateWarning && (
                                <div className="bg-red-50 rounded p-3 border border-red-200 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-red-800 uppercase">Duplicate Alert</p>
                                        <p className="text-xs text-red-700">Patient recently received this product. Approval required on save.</p>
                                    </div>
                                </div>
                             )}
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date</label><input type="date" className="w-full border p-2" value={editItem.delivery_date} onChange={e => setEditItem({...editItem, delivery_date: e.target.value})} /></div>
                             <div className="border-b border-slate-100 pb-4 mb-4">
                                 <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Patient</label>
                                    <button type="button" onClick={checkEditDuplication} className="text-[10px] bg-slate-100 hover:bg-[#FFC600] px-2 py-1 rounded flex items-center gap-1 font-bold uppercase transition-colors"><RefreshCw className="w-3 h-3" /> Check Duplication</button>
                                 </div>
                                 <select className="w-full border p-2 bg-white mb-2" value={editItem.patient_id} onChange={e => setEditItem({...editItem, patient_id: e.target.value})}>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
                             </div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prescriber</label><select className="w-full border p-2 bg-white" value={editItem.hcp_id} onChange={e => setEditItem({...editItem, hcp_id: e.target.value})}>{hcps.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}</select></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product</label><select className="w-full border p-2 bg-white" value={editItem.product_id} onChange={e => setEditItem({...editItem, product_id: e.target.value})}>{PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Custody</label>
                                 <select className="w-full border p-2 bg-white" value={editItem.custody_id} onChange={e => setEditItem({...editItem, custody_id: e.target.value})}>
                                     {custodies.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                 </select>
                             </div>
                        </>
                    )}
                    {/* Logic remains same */}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                         <Save className="w-4 h-4" /> Save Changes
                    </button>
                </form>
             </div>
         </div>
      )}

      {/* HCP Modal */}
      {showHCPModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm animate-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-[#FFC600]" /> Add New Prescriber</h3>
                <form onSubmit={handleCreateHCP} className="space-y-3">
                    <input type="text" placeholder="Dr. Full Name" className="w-full border p-2 text-sm" value={newHCP.full_name} onChange={e => setNewHCP({...newHCP, full_name: e.target.value})} required />
                    <input type="text" placeholder="Specialty" className="w-full border p-2 text-sm" list="spec-suggestions" value={newHCP.specialty} onChange={e => setNewHCP({...newHCP, specialty: e.target.value})} />
                    <datalist id="spec-suggestions">{hcpSpecialties.map((s, i) => <option key={i} value={s} />)}</datalist>
                    <input type="text" placeholder="Hospital / Clinic Name" className="w-full border p-2 text-sm" list="hosp-suggestions" value={newHCP.hospital} onChange={e => setNewHCP({...newHCP, hospital: e.target.value})} required />
                    <datalist id="hosp-suggestions">{hcpHospitals.map((s, i) => <option key={i} value={s} />)}</datalist>
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setShowHCPModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-slate-800">Save Doctor</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Clinic Modal */}
      {showClinicModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm animate-in zoom-in duration-200">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#FFC600]" /> Add Network Location</h3>
                 <form onSubmit={handleAddClinic} className="space-y-3">
                     <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location Name</label>
                         <input type="text" placeholder="e.g. City Pharmacy" className="w-full border p-2 text-sm" value={newClinicForm.name} onChange={e => setNewClinicForm({...newClinicForm, name: e.target.value})} required />
                     </div>
                     <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Date</label>
                         <input type="date" className="w-full border p-2 text-sm" value={newClinicForm.date} onChange={e => setNewClinicForm({...newClinicForm, date: e.target.value})} required />
                     </div>
                     <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded cursor-pointer" onClick={() => setNewClinicForm(prev => ({...prev, isPharmacy: !prev.isPharmacy}))}>
                         <div className={`w-4 h-4 border flex items-center justify-center ${newClinicForm.isPharmacy ? 'bg-black border-black' : 'bg-white border-slate-300'}`}>
                             {newClinicForm.isPharmacy && <CheckCircle className="w-3 h-3 text-[#FFC600]" />}
                         </div>
                         <span className="text-xs font-bold text-slate-700">Is this a Pharmacy?</span>
                     </div>
                     <div className="flex justify-end gap-2 mt-4">
                         <button type="button" onClick={() => setShowClinicModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100">Cancel</button>
                         <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-slate-800">Register Location</button>
                     </div>
                 </form>
             </div>
         </div>
      )}


      {/* Main Navbar */}
      <nav className="bg-black text-white sticky top-0 z-40 shadow-md border-b-4 border-[#FFC600] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <img src="icon.svg" className="w-10 h-10 rounded-lg border-2 border-[#FFC600]" alt="SPIN Logo" />
              <div className="flex flex-col">
                <span className="font-black text-2xl leading-none tracking-tighter">S.P.I.N</span>
                <span className="text-[10px] font-bold text-[#FFC600] uppercase tracking-widest">Supply Insulin Pen Network</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                  <>
                    <button onClick={() => setShowProfileModal(true)} className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-[#FFC600] transition-colors"><UserCircle className="w-4 h-4" />{userProfile?.full_name || user.email}</button>
                    <div className="px-3 py-1 bg-slate-800 rounded text-[10px] font-bold uppercase text-[#FFC600] border border-slate-700">
                        {userProfile?.role === 'mr' ? 'Med Rep' : userProfile?.role === 'dm' ? 'District Mgr' : userProfile?.role === 'lm' ? 'Line Mgr' : 'Admin'}
                    </div>
                    <button onClick={() => setShowAIModal(true)} className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded transition-colors border border-slate-700 text-[#FFC600]"><Sparkles className="w-3 h-3" /> Intelligence</button>
                    <div className="h-8 w-px bg-slate-800 mx-1"></div>
                    <button onClick={() => supabase?.auth.signOut()} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2" title="Logout"><LogOut className="w-5 h-5" /></button>
                  </>
              ) : (
                  <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-[#FFC600] hover:bg-yellow-400 text-black px-4 py-2 font-bold uppercase text-xs tracking-wider transition-colors"><LogIn className="w-4 h-4" /> Staff Login</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Hidden when analytics is full screen */}
      {activeTab !== 'analytics' && (
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative flex flex-col">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full flex-grow">
          
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard className="w-4 h-4" /> Dashboard</button>
            {(userProfile?.role === 'mr' || userProfile?.role === 'admin') && (
                <button onClick={() => setActiveTab('deliver')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'deliver' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Syringe className="w-4 h-4" /> Deliver Pen {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            )}
            <button onClick={() => setActiveTab('custody')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'custody' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Building2 className="w-4 h-4" /> Custody {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            <button onClick={() => setActiveTab('database')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Database className="w-4 h-4" /> Database {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            {isAdmin && (
                <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'admin' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><ShieldCheck className="w-4 h-4" /> Admin Panel</button>
            )}
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {!user ? (
                  <div className="space-y-8">
                      <div className="bg-white border-l-8 border-[#FFC600] p-8 shadow-lg">
                          <h2 className="text-4xl font-black text-slate-900 mb-4">Welcome to S.P.I.N</h2>
                          <p className="text-lg text-slate-600 max-w-3xl">The <strong>Supply Insulin Pen Network</strong> is an advanced tracking and verification system designed to ensure the secure, efficient, and traceable distribution of insulin pens to patients.</p>
                      </div>
                      <div className="text-center pt-10"><button onClick={() => setShowLoginModal(true)} className="bg-black text-white hover:bg-slate-800 px-8 py-4 font-bold uppercase tracking-wide shadow-lg transition-all">Access Dashboard</button></div>
                  </div>
              ) : (
                  <>
                      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {userProfile?.full_name || user.email?.split('@')[0]}</h1>
                            <p className="text-slate-500 text-sm">Here is your daily distribution overview.</p>
                        </div>
                        <button onClick={() => setActiveTab('analytics')} className="hidden md:flex items-center gap-2 bg-[#FFC600] hover:bg-yellow-400 text-black px-5 py-2.5 font-bold uppercase text-xs tracking-wider transition-colors shadow-lg">
                            <BarChart3 className="w-4 h-4" /> Full Analytics
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* MY INVENTORY CARD */}
                        {canManageStock && (
                            <div onClick={() => { setActiveTab('custody'); }} className="bg-white p-6 shadow-sm border-l-4 border-blue-500 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 cursor-pointer hover:bg-blue-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">My Inventory</p><h3 className="text-3xl font-black text-slate-900">{repCustody?.current_stock || 0}</h3></div><div className="bg-blue-50 p-3 rounded-full group-hover:bg-blue-200 transition-colors"><Briefcase className="w-6 h-6 text-blue-600 group-hover:text-black" /></div></div>
                        )}

                        {/* TOTAL DELIVERED - UPDATED */}
                        <div className="bg-white shadow-sm border-l-4 border-[#FFC600] animate-in slide-in-from-bottom-4 duration-500 delay-75 group flex flex-col relative overflow-hidden">
                             <div className="p-6 cursor-pointer hover:bg-yellow-50 transition-colors" onClick={() => setExpandDeliveries(!expandDeliveries)}>
                                <div className="flex items-center justify-between mb-2">
                                    <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Delivered</p><h3 className="text-3xl font-black text-slate-900">{visibleDeliveries.length}</h3></div>
                                    <div className="bg-yellow-50 p-3 rounded-full group-hover:bg-[#FFC600] transition-colors"><Package className="w-6 h-6 text-[#FFC600] group-hover:text-black" /></div>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                                    <span>{expandDeliveries ? 'Hide' : 'Show'} Breakdown</span>
                                    {expandDeliveries ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </div>
                             </div>
                             
                             {expandDeliveries && (
                                 <div className="bg-slate-50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                                     <div className="h-[150px] w-full">
                                         <ResponsiveContainer width="100%" height="100%">
                                             <RechartsPieChart>
                                                 <Pie data={productBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                                                     {productBreakdown.map((entry, index) => (
                                                         <Cell key={`cell-${index}`} fill={PRODUCT_COLOR_MAP[entry.id] || COLORS[index % COLORS.length]} />
                                                     ))}
                                                 </Pie>
                                                 <RechartsTooltip 
                                                    contentStyle={{backgroundColor: 'black', color: 'white', fontSize: '10px', borderRadius: '4px', border: 'none'}} 
                                                    itemStyle={{color: '#FFC600'}}
                                                    formatter={(value: any, name: any, props: any) => [`${value} (${props.payload.percentage}%)`, name]}
                                                 />
                                             </RechartsPieChart>
                                         </ResponsiveContainer>
                                     </div>
                                     <div className="grid grid-cols-2 gap-2 mt-2">
                                         {productBreakdown.slice(0,4).map((p,i) => (
                                             <div key={i} className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-500">
                                                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: PRODUCT_COLOR_MAP[p.id] || '#cbd5e1'}}></div>
                                                 <span className="truncate">{p.name}: <span className="text-black">{p.value} ({p.percentage}%)</span></span>
                                             </div>
                                         ))}
                                     </div>
                                     <button onClick={() => setActiveTab('analytics')} className="mt-4 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 uppercase flex items-center justify-center gap-1">Full Analysis <ArrowRight className="w-3 h-3"/></button>
                                 </div>
                             )}
                        </div>
                        
                        {/* ACTIVE PRESCRIBERS - UPDATED EXPANDABLE CARD */}
                        <div className="bg-white shadow-sm border-l-4 border-slate-800 animate-in slide-in-from-bottom-4 duration-500 delay-100 group flex flex-col relative overflow-hidden">
                            <div className="p-6 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandPrescribers(!expandPrescribers)}>
                                <div className="flex items-center justify-between mb-2">
                                    <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Prescribers</p><h3 className="text-3xl font-black text-slate-900">{uniquePrescribersCount}</h3></div>
                                    <div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200 transition-colors"><Stethoscope className="w-6 h-6 text-slate-900" /></div>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                                    <span>{expandPrescribers ? 'Hide' : 'Show'} Top 5</span>
                                    {expandPrescribers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </div>
                            </div>
                            
                            {expandPrescribers && (
                                <div className="bg-slate-50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-1">Top 5 Doctors (By Volume)</h4>
                                    <ul className="space-y-2">
                                        {topPrescribers.map((tp, i) => (
                                            <li key={i} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-400 text-[10px]">0{i+1}</span>
                                                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{tp.name}</span>
                                                </div>
                                                <span className="bg-[#FFC600] text-black px-1.5 py-0.5 rounded text-[10px] font-bold">{tp.count}</span>
                                            </li>
                                        ))}
                                        {topPrescribers.length === 0 && <li className="text-[10px] italic text-slate-400">No data available</li>}
                                    </ul>
                                    <button onClick={() => setActiveTab('analytics')} className="mt-4 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 uppercase flex items-center justify-center gap-1">Full Prescriber Analysis <ArrowRight className="w-3 h-3"/></button>
                                </div>
                            )}
                        </div>

                        {/* ACTIVE CUSTODIES - STANDARD CARD */}
                        <div onClick={() => { setActiveTab('database'); setDbView('locations'); }} className="bg-white p-6 shadow-sm border-l-4 border-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-150 cursor-pointer hover:bg-slate-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Locations</p><h3 className="text-3xl font-black text-slate-900">{custodies.length}</h3></div><div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200"><Building2 className="w-6 h-6 text-slate-900" /></div></div>
                      </div>

                      {/* Hierarchy Breakdown for Managers */}
                      {(userProfile?.role === 'dm' || userProfile?.role === 'lm') && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 animate-in slide-in-from-bottom-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Network className="w-5 h-5 text-[#FFC600]" />
                                {userProfile.role === 'lm' ? 'Regional Performance (Line Manager)' : 'Team Performance (District Manager)'}
                            </h3>
                            {renderTeamStats()}
                        </div>
                      )}
                  </>
              )}
            </div>
          )}

          {activeTab === 'deliver' && (
             !user ? (
                 <LockedState title="Delivery Access Restricted" description="Please login to access the delivery portal." loginRequired />
             ) : !canDeliver ? (
                 <LockedState title="Access Denied" description="Only Medical Representatives can dispense products." />
             ) : (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-black text-[#FFC600]' : 'bg-slate-200 text-slate-500'}`}>1</div>
                        <div className="h-0.5 bg-slate-100 flex-1"></div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-black text-[#FFC600]' : 'bg-slate-200 text-slate-500'}`}>2</div>
                    </div>

                    {step === 1 && (
                        <div className="bg-white shadow-sm border-t-4 border-[#FFC600] p-8">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><UserCircle className="w-6 h-6 text-[#FFC600]" /> Patient Identification</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">National ID / Phone Number</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Enter ID to search..." className="flex-1 border-2 border-slate-200 p-3 font-mono text-lg focus:border-black outline-none transition-colors" value={nidSearch} onChange={e => setNidSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePatientSearch()} />
                                        <button onClick={handlePatientSearch} className="bg-black text-white px-6 font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors"><Search className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                
                                {hasSearched && !foundPatient && (
                                    <div className="mt-8 bg-slate-50 p-6 border border-slate-200 animate-in fade-in zoom-in duration-300">
                                        <div className="flex items-center gap-3 mb-4 text-orange-600">
                                            <AlertTriangle className="w-5 h-5" />
                                            <span className="font-bold">Patient not found in directory.</span>
                                        </div>
                                        <h3 className="font-bold text-lg mb-4">Register New Patient</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" className="w-full border p-2" value={newPatientForm.full_name} onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})} placeholder="Patient Name" /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label><input type="text" className="w-full border p-2" value={newPatientForm.phone_number} onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})} placeholder="01xxxxxxxxx" /></div>
                                        </div>
                                        <button onClick={handleCreatePatient} disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                                            Create & Continue <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {foundPatient && (
                                    <div className="mt-6 bg-green-50 border border-green-200 p-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                                        <div><h3 className="font-bold text-green-900">{foundPatient.full_name}</h3><p className="text-sm text-green-700 font-mono">ID: {foundPatient.national_id}</p></div>
                                        <button onClick={() => setStep(2)} className="bg-green-600 text-white px-4 py-2 font-bold uppercase text-xs rounded hover:bg-green-700 flex items-center gap-2">Continue <ArrowRight className="w-3 h-3" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                         <div className="bg-white shadow-sm border-t-4 border-black p-8 animate-in slide-in-from-right-4 duration-300">
                             <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                <div><h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Package className="w-6 h-6 text-[#FFC600]" /> Delivery Details</h2><p className="text-xs text-slate-500 mt-1">Dispensing to: <span className="font-bold text-slate-900">{foundPatient?.full_name}</span></p></div>
                                <button onClick={handleCancelDelivery} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase">Cancel</button>
                             </div>

                             {duplicateWarning && (
                                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <div><h4 className="font-bold text-red-800 text-sm uppercase">Duplicate Warning</h4><p className="text-xs text-red-700 mt-1">This patient has already received this product within the last 20 days. Please verify prescription.</p></div>
                                </div>
                             )}

                             <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex justify-between items-end mb-1"><label className="block text-xs font-bold text-slate-500 uppercase">Prescribing Doctor</label><button onClick={() => setShowHCPModal(true)} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3" /> New</button></div>
                                        <select className="w-full border p-3 bg-white focus:border-[#FFC600] outline-none" value={selectedHCP} onChange={e => setSelectedHCP(e.target.value)}><option value="">-- Select HCP --</option>{hcps.map(h => <option key={h.id} value={h.id}>{h.full_name} - {h.hospital}</option>)}</select>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-end mb-1"><label className="block text-xs font-bold text-slate-500 uppercase">Source Location</label><button onClick={() => setShowClinicModal(true)} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3" /> New</button></div>
                                        <select className="w-full border p-3 bg-white focus:border-[#FFC600] outline-none" value={selectedCustody} onChange={e => setSelectedCustody(e.target.value)}>
                                            {repCustody && <option value={repCustody.id}>My Inventory (Rep)</option>}
                                            {custodies.filter(c => c.type === 'clinic').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Product</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {PRODUCTS.map(p => (
                                            <button key={p.id} onClick={() => setSelectedProduct(p.id)} className={`p-4 border-2 text-left transition-all ${getProductButtonStyles(p.id, selectedProduct === p.id)}`}>
                                                <div className="font-bold">{p.name}</div>
                                                <div className="text-[10px] opacity-70 uppercase">{p.type}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-200">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rx Date</label><input type="date" className="w-full border p-2 text-sm" value={rxDate} onChange={e => setRxDate(e.target.value)} /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Delivery Date</label><input type="date" className="w-full border p-2 text-sm" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Educator Report Date</label><input type="date" className="w-full border p-2 text-sm" value={educatorDate} onChange={e => setEducatorDate(e.target.value)} /></div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reported Educator Name</label>
                                        <input type="text" className="w-full border p-2 text-sm" value={educatorName} onChange={e => setEducatorName(e.target.value)} list="educator-suggestions-main" placeholder="Educator who verified" />
                                        <datalist id="educator-suggestions-main">{educatorSuggestions.map(s => <option key={s} value={s} />)}</datalist>
                                    </div>
                                </div>

                                <button onClick={handleSubmitDelivery} disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-4 text-lg uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99]">
                                    Confirm Delivery <CheckCircle className="w-6 h-6" />
                                </button>
                             </div>
                        </div>
                    )}
                </div>
             )
          )}
           {activeTab === 'database' && (
             !user ? (
                 <LockedState title="Database Locked" description="Authorized personnel only." loginRequired />
             ) : (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 shadow-sm border border-slate-200">
                         <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                             {(['deliveries', 'hcps', 'locations', 'stock', 'patients'] as DBView[]).map(view => (
                                 <button key={view} onClick={() => setDbView(view)} className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${dbView === view ? 'bg-black text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                     {view === 'hcps' ? 'Doctors' : view.charAt(0).toUpperCase() + view.slice(1)}
                                 </button>
                             ))}
                         </div>
                         <div className="relative w-full md:w-64">
                             <input type="text" placeholder="Search records..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm rounded focus:border-black outline-none transition-colors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                         </div>
                     </div>
                     {/* ... Table implementation ... */}
                     <div className="bg-white shadow-sm border border-slate-200 overflow-hidden">
                         <div className="overflow-x-auto">
                             <table className="w-full text-left border-collapse">
                                 <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                     <tr>
                                         {dbView === 'deliveries' && <><th className="p-4">Date</th><th className="p-4">Patient</th><th className="p-4">Product</th><th className="p-4">HCP</th><th className="p-4">Source</th><th className="p-4">Educator</th>
                                         {(userProfile?.role === 'dm' || userProfile?.role === 'lm') && <th className="p-4">Medical Rep</th>}
                                         {userProfile?.role === 'lm' && <th className="p-4">District Mgr</th>}
                                         <th className="p-4 text-right">Actions</th></>}
                                         {dbView === 'hcps' && <><th className="p-4">Doctor Name</th><th className="p-4">Specialty</th><th className="p-4">Hospital</th><th className="p-4 text-right">Actions</th></>}
                                         {dbView === 'locations' && <><th className="p-4">Name</th><th className="p-4">Type</th><th className="p-4">Stock</th><th className="p-4 text-right">Actions</th></>}
                                         {dbView === 'stock' && <><th className="p-4">Date</th><th className="p-4">Source / Destination</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Actions</th></>}
                                         {dbView === 'patients' && <><th className="p-4">Full Name</th><th className="p-4">National ID</th><th className="p-4">Phone</th><th className="p-4 text-right">Actions</th></>}
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 text-sm">
                                     {dbView === 'deliveries' && filterData(visibleDeliveries).map((item: Delivery) => (
                                         <tr key={item.id} className="hover:bg-slate-50 group">
                                             <td className="p-4 font-mono text-slate-500 text-xs">{formatDateFriendly(item.delivery_date)}</td>
                                             <td className="p-4"><div className="font-bold text-slate-900">{item.patient?.full_name}</div><div className="text-[10px] text-slate-400 font-mono">{item.patient?.national_id}</div></td>
                                             <td className="p-4"><span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${getProductStyles(item.product_id)}`}>{getProductName(item.product_id)}</span></td>
                                             <td className="p-4 text-slate-600 text-xs">{item.hcp?.full_name}</td>
                                             <td className="p-4 text-slate-500 text-xs">{item.custody?.name}</td>
                                             <td className="p-4 text-slate-500 text-xs">{item.educator_name || '-'}</td>
                                             
                                             {(userProfile?.role === 'dm' || userProfile?.role === 'lm') && (
                                                <td className="p-4 text-xs font-bold text-slate-700">{getMrAndDm(item.delivered_by).mrName}</td>
                                             )}
                                             {userProfile?.role === 'lm' && (
                                                <td className="p-4 text-xs text-slate-600">{getMrAndDm(item.delivered_by).dmName}</td>
                                             )}

                                             <td className="p-4 text-right">
                                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     {!isReadOnly && <button onClick={() => openEditModal('deliveries', item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>}
                                                     {(isAdmin || (item.delivered_by === user.id && !isReadOnly)) && <button onClick={() => handleDeleteItem('deliveries', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                     {dbView === 'hcps' && filterData(hcps).map((item: HCP) => (
                                         <tr key={item.id} className="hover:bg-slate-50 group">
                                             <td className="p-4 font-bold text-slate-900">{item.full_name}</td>
                                             <td className="p-4 text-slate-600">{item.specialty}</td>
                                             <td className="p-4 text-slate-600">{item.hospital}</td>
                                             <td className="p-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{!isReadOnly && <><button onClick={() => openEditModal('hcps', item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDeleteItem('hcps', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</div></td>
                                         </tr>
                                     ))}
                                     {dbView === 'locations' && filterData(custodies).map((item: Custody) => (
                                         <tr key={item.id} className="hover:bg-slate-50 group">
                                             <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                             <td className="p-4 text-xs uppercase font-bold text-slate-500">{item.type}</td>
                                             <td className="p-4 font-mono font-bold">{item.current_stock}</td>
                                             <td className="p-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{!isReadOnly && <><button onClick={() => openEditModal('locations', item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDeleteItem('locations', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</div></td>
                                         </tr>
                                     ))}
                                     {dbView === 'stock' && filterData(visibleStock).map((item: StockTransaction) => (
                                         <tr key={item.id} className="hover:bg-slate-50 group">
                                             <td className="p-4 font-mono text-slate-500 text-xs">{formatDateFriendly(item.transaction_date)}</td>
                                             <td className="p-4 text-xs font-bold text-slate-700">{resolveSourceText(item.source)}</td>
                                             <td className={`p-4 font-mono font-bold text-center ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td>
                                             <td className="p-4 text-right">
                                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     {!isReadOnly && item.custody_id !== repCustody?.id && item.quantity < 0 && <button onClick={() => handleRetrieveStock(item)} title="Retrieve Stock" className="p-1 text-orange-500 hover:bg-orange-50 rounded"><Undo2 className="w-4 h-4" /></button>}
                                                     {!isReadOnly && <button onClick={() => openEditModal('tx', item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>}
                                                     {!isReadOnly && <button onClick={() => handleDeleteItem('tx', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                     {dbView === 'patients' && filterData(patients).map((item: Patient) => (
                                         <tr key={item.id} className="hover:bg-slate-50 group">
                                             <td className="p-4 font-bold text-slate-900">{item.full_name}</td>
                                             <td className="p-4 font-mono text-slate-600 text-xs">{item.national_id}</td>
                                             <td className="p-4 font-mono text-slate-600 text-xs">{item.phone_number}</td>
                                             <td className="p-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{!isReadOnly && <><button onClick={() => openEditModal('patients', item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDeleteItem('patients', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</div></td>
                                         </tr>
                                     ))}
                                     {/* Empty States */}
                                     {dbView === 'deliveries' && visibleDeliveries.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">No delivery records found.</td></tr>}
                                     {dbView === 'stock' && visibleStock.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No stock history available.</td></tr>}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>
             )
          )}
          {activeTab === 'admin' && isAdmin && (
              <AdminPanel profiles={allProfiles} onUpdate={loadData} />
          )}
          {activeTab === 'custody' && (
             !user ? (
                 <LockedState title="Inventory Locked" description="Authorized personnel only." />
             ) : !canManageStock ? (
                 <LockedState title="Read Only View" description="District & Line Managers do not manage personal stock." />
             ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-white shadow-sm border-t-4 border-[#FFC600]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div><h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Briefcase className="w-6 h-6 text-[#FFC600]" /> My Inventory</h2><p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Medical Rep Stock (You)</p></div>
                            <div className="text-right"><span className="text-5xl font-black text-slate-900 tracking-tighter">{repCustody?.current_stock || 0}</span><span className="text-xs text-slate-500 block uppercase font-bold mt-1">Pens Available</span></div>
                        </div>
                        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                                <h3 className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-[#FFC600]" /> Receive Pens</h3>
                                <p className="text-xs text-slate-400 mb-3">Add stock received from Patient Educator.</p>
                                <form onSubmit={handleReceiveStock} className="flex flex-wrap gap-3 items-end w-full">
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Receive Date</label>
                                        <input type="date" className="bg-slate-800 border border-slate-700 text-white text-sm p-2 rounded w-full" value={receiveForm.date} onChange={e => setReceiveForm({...receiveForm, date: e.target.value})} />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Educator</label>
                                        <input type="text" required placeholder="Educator Name" className="bg-slate-800 border border-slate-700 text-white text-sm p-2 rounded w-full" value={receiveForm.educatorName} onChange={e => setReceiveForm({...receiveForm, educatorName: e.target.value})} list="educator-suggestions" />
                                        <datalist id="educator-suggestions">{educatorSuggestions.map((name, i) => <option key={i} value={name} />)}</datalist>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qty Pens</label>
                                        <input type="number" min="1" className="bg-slate-800 border border-slate-700 text-white text-sm p-2 rounded w-full" placeholder="0" value={receiveForm.quantity} onChange={e => setReceiveForm({...receiveForm, quantity: Number(e.target.value)})} />
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="bg-[#FFC600] text-black font-bold uppercase text-xs px-4 py-2.5 rounded hover:bg-yellow-400 whitespace-nowrap disabled:opacity-50 flex items-center gap-2">
                                        Add to Stock
                                    </button>
                                </form>
                            </div>
                            <div className="w-full md:w-80 border-l border-slate-700 md:pl-4 mt-6 md:mt-0">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><History className="w-3 h-3" /> Recent Additions</h4>
                                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                    {stockTransactions.filter(t => t.custody_id === repCustody?.id && t.quantity > 0).slice(0, 5).map(t => (
                                        <div key={t.id} className="text-[10px] text-slate-300 flex justify-between items-center group">
                                            <span>{formatDateFriendly(t.transaction_date)}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#FFC600] font-bold">+{t.quantity}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditModal('tx', t)} className="text-slate-500 hover:text-blue-400 transition-colors" title="Edit"><Pencil className="w-3 h-3" /></button>
                                                    <button onClick={() => handleDeleteItem('tx', t.id)} className="text-slate-500 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stockTransactions.filter(t => t.custody_id === repCustody?.id && t.quantity > 0).length === 0 && <p className="text-[10px] text-slate-500 italic">No recent additions.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ... Clinic and Transfer ... */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Store className="w-5 h-5" /> Clinic / Pharmacy Network</h3>
                                <div className="flex items-center gap-3"><button onClick={() => setShowClinicModal(true)} className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Clinic</button><span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded text-slate-600">{custodies.filter(c => c.type === 'clinic').length} Locations</span></div>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {custodies.filter(c => c.type === 'clinic').map(clinic => {
                                    const isPharmacy = clinic.name.toLowerCase().includes('pharmacy');
                                    return (
                                    <div key={clinic.id} className="p-5 hover:bg-slate-50 transition-colors group flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                {clinic.name}
                                                {isPharmacy && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold uppercase">Pharmacy</span>}
                                                {!isPharmacy && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase">Clinic</span>}
                                            </h4>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <p className="text-xs text-slate-400">Registered: {formatDateFriendly(clinic.created_at)}</p>
                                                <p className="text-xs text-slate-500 font-bold">Last Supplied: {getLastSupplyDate(clinic.id)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                             <div className="text-right"><span className="block text-2xl font-black text-slate-900">{clinic.current_stock || 0}</span><span className="text-[10px] text-slate-400 uppercase font-bold">Pens</span></div>
                                            <button onClick={() => { setTransferForm(prev => ({...prev, toCustodyId: clinic.id, educatorName: ''})); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }} className="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-3 py-2 text-xs font-bold uppercase rounded flex items-center gap-1">Supply <ArrowRight className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                )})}
                                {custodies.filter(c => c.type === 'clinic').length === 0 && <div className="p-8 text-center text-slate-400 italic">No clinics registered yet.</div>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white shadow-sm border-l-4 border-blue-500 p-6">
                                <h3 className="text-sm font-bold mb-4 uppercase text-blue-900 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Supply Clinic</h3>
                                <form onSubmit={handleTransferStock} className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-end mb-1"><label className="block text-[10px] font-bold text-slate-400 uppercase">Destination</label><button type="button" onClick={() => setShowClinicModal(true)} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3" /> New</button></div>
                                        <select className="w-full border p-2 bg-slate-50 text-sm" value={transferForm.toCustodyId} onChange={e => setTransferForm({...transferForm, toCustodyId: e.target.value})} required><option value="">-- Select Clinic --</option>{custodies.filter(c => c.type === 'clinic').map(c => (<option key={c.id} value={c.id}>{c.name.toLowerCase().includes('pharmacy') ? c.name : `${c.name} (Clinic)`}</option>))}</select>
                                    </div>
                                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity (Pens)</label><input type="number" min="1" className="w-full border p-2 bg-slate-50 text-sm font-bold" value={transferForm.quantity} onChange={e => setTransferForm({...transferForm, quantity: Number(e.target.value)})} /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Supply Date</label><input type="date" className="w-full border p-2 bg-slate-50 text-sm" value={transferForm.date} onChange={e => setTransferForm({...transferForm, date: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source of Stock</label>
                                        <div className="flex flex-col gap-2"><label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer"><input type="radio" name="sourceType" checked={transferForm.sourceType === 'rep'} onChange={() => setTransferForm({...transferForm, sourceType: 'rep', educatorName: ''})} /><span className="text-xs font-bold">My Inventory (Rep)</span><span className="text-[10px] text-red-500 ml-auto font-bold">- Deduct</span></label></div>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 font-bold uppercase text-xs hover:bg-blue-700 flex items-center justify-center gap-2">
                                        Confirm Transfer
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
             )
          )}
        </main>
      </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-0.5 shrink-0 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] relative">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-6">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <img src="icon.svg" className="w-4 h-4 rounded-sm border border-slate-300" alt="Logo" />
                <span>SPIN v{METADATA.version}</span>
            </div>
            <div className="text-[10px] text-slate-400">
                &copy; {new Date().getFullYear()} Supply Insulin Pen Network
            </div>
        </div>
      </footer>

      <AIReportModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} deliveries={deliveries} userEmail={user?.email || ''} />
    </div>
  );
};

export default App;