
import React, { useState, useEffect, useCallback } from 'react';
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
  Shield
} from 'lucide-react';
import { AIReportModal } from './components/AIReportModal';
import { ProfileModal } from './components/ProfileModal';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const METADATA = {
  name: "SPIN v2.0.023",
  version: "2.0.023"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
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
    } else {
        setDeliveries([]);
        setHcps([]);
        setCustodies([]);
        setStockTransactions([]);
        setUserProfile(null);
        setAllProfiles([]);
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

  const visibleDeliveries = getVisibleDeliveries();

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
    if (!selectedCustody) { showToast("Please select the Source Custody", "error"); return; }
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

  const getProductName = (id: string) => PRODUCTS.find(p => p.id === id)?.name || id;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFC600]"><Activity className="animate-spin w-10 h-10" /></div>;

  const canDeliver = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const canManageStock = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';

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
                  <div className="bg-[#FFC600] p-1"><Hexagon className="w-4 h-4 text-black" /></div>
                  <div className="text-xs">
                      <p className="font-bold text-[#FFC600]">INSTALL WEB APP</p>
                      <p className="text-slate-400">Add SPIN to your home screen for better experience.</p>
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
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date (DD/MM/YYYY)</label><input type="date" className="w-full border p-2" value={editItem.delivery_date} onChange={e => setEditItem({...editItem, delivery_date: e.target.value})} /></div>
                             <div className="border-b border-slate-100 pb-4 mb-4">
                                 <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Patient</label>
                                    <button type="button" onClick={checkEditDuplication} className="text-[10px] bg-slate-100 hover:bg-[#FFC600] px-2 py-1 rounded flex items-center gap-1 font-bold uppercase transition-colors"><RefreshCw className="w-3 h-3" /> Check Duplication</button>
                                 </div>
                                 <select className="w-full border p-2 bg-white mb-2" value={editItem.patient_id} onChange={e => setEditItem({...editItem, patient_id: e.target.value})}>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
                                 {editPatientDetails && (
                                     <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">Edit Patient Info</p>
                                         <input type="text" placeholder="National ID" className="w-full text-xs border p-1" value={editPatientDetails.national_id} onChange={e => setEditPatientDetails({...editPatientDetails, national_id: e.target.value})} />
                                         <input type="text" placeholder="Phone" className="w-full text-xs border p-1" value={editPatientDetails.phone_number} onChange={e => setEditPatientDetails({...editPatientDetails, phone_number: e.target.value})} />
                                     </div>
                                 )}
                             </div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prescriber (HCP)</label><select className="w-full border p-2 bg-white" value={editItem.hcp_id} onChange={e => setEditItem({...editItem, hcp_id: e.target.value})}>{hcps.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}</select></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product</label><select className="w-full border p-2 bg-white" value={editItem.product_id} onChange={e => setEditItem({...editItem, product_id: e.target.value})}>{PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Custody</label>
                                 <select className="w-full border p-2 bg-white" value={editItem.custody_id} onChange={e => setEditItem({...editItem, custody_id: e.target.value})}>
                                     {custodies.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name.toLowerCase().includes('pharmacy') ? c.name : c.type === 'clinic' ? `${c.name} (Clinic)` : c.name}
                                        </option>
                                    ))}
                                 </select>
                             </div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rx Date</label><input type="date" className="w-full border p-2" value={editItem.rx_date || ''} onChange={e => setEditItem({...editItem, rx_date: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Educator Name</label><input type="text" className="w-full border p-2" value={editItem.educator_name} onChange={e => setEditItem({...editItem, educator_name: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label><textarea className="w-full border p-2" rows={3} value={editItem.notes || ''} onChange={e => setEditItem({...editItem, notes: e.target.value})} /></div>
                        </>
                    )}
                    {editType === 'hcps' && (
                        <>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name</label><input type="text" className="w-full border p-2" value={editItem.full_name} onChange={e => setEditItem({...editItem, full_name: e.target.value})} /></div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialty</label>
                                <input type="text" className="w-full border p-2" value={editItem.specialty} onChange={e => setEditItem({...editItem, specialty: e.target.value})} list="specialty-suggestions-edit" />
                                <datalist id="specialty-suggestions-edit">{hcpSpecialties.map(s => <option key={s} value={s} />)}</datalist>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital</label>
                                <input type="text" className="w-full border p-2" value={editItem.hospital} onChange={e => setEditItem({...editItem, hospital: e.target.value})} list="hospital-suggestions-edit" />
                                <datalist id="hospital-suggestions-edit">{hcpHospitals.map(h => <option key={h} value={h} />)}</datalist>
                             </div>
                        </>
                    )}
                    {editType === 'locations' && (
                        <>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location Name</label><input type="text" className="w-full border p-2" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registered Date</label><input type="date" className="w-full border p-2" value={editItem.created_at ? editItem.created_at.split('T')[0] : ''} onChange={e => setEditItem({...editItem, created_at: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock (Override)</label><input type="number" className="w-full border p-2 font-bold text-red-600" value={editItem.current_stock} onChange={e => setEditItem({...editItem, current_stock: e.target.value})} /></div>
                        </>
                    )}
                    {editType === 'stock' && (
                        <>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label><input type="date" className="w-full border p-2" value={editItem.transaction_date} onChange={e => setEditItem({...editItem, transaction_date: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label><input type="number" className="w-full border p-2" value={editItem.quantity} onChange={e => setEditItem({...editItem, quantity: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source / Reason</label><input type="text" className="w-full border p-2" value={editItem.source} onChange={e => setEditItem({...editItem, source: e.target.value})} /></div>
                        </>
                    )}
                    {editType === 'patients' && (
                        <>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" className="w-full border p-2" value={editItem.full_name} onChange={e => setEditItem({...editItem, full_name: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">National ID</label><input type="text" className="w-full border p-2 font-mono" value={editItem.national_id} onChange={e => setEditItem({...editItem, national_id: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label><input type="text" className="w-full border p-2 font-mono" value={editItem.phone_number} onChange={e => setEditItem({...editItem, phone_number: e.target.value})} /></div>
                        </>
                    )}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                         <Save className="w-4 h-4" /> Save Changes
                    </button>
                </form>
             </div>
         </div>
      )}

      {showHCPModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setShowHCPModal(false)}>
            <div className="bg-white w-full max-w-md border-t-4 border-[#FFC600] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="bg-black p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3"><Stethoscope className="w-5 h-5 text-[#FFC600]" /><h3 className="text-white font-bold">Register New Doctor</h3></div>
                     <button onClick={() => setShowHCPModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreateHCP} className="p-6 space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name</label><input required type="text" placeholder="Dr. Name" className="w-full border p-2" value={newHCP.full_name} onChange={e => setNewHCP({...newHCP, full_name: e.target.value})} /></div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialty</label>
                        <input type="text" placeholder="e.g. Endocrinology" className="w-full border p-2" value={newHCP.specialty} onChange={e => setNewHCP({...newHCP, specialty: e.target.value})} list="specialty-suggestions" />
                        <datalist id="specialty-suggestions">{hcpSpecialties.map(s => <option key={s} value={s} />)}</datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital / Clinic</label>
                        <input required type="text" placeholder="Hospital Name" className="w-full border p-2" value={newHCP.hospital} onChange={e => setNewHCP({...newHCP, hospital: e.target.value})} list="hospital-suggestions" />
                        <datalist id="hospital-suggestions">{hcpHospitals.map(h => <option key={h} value={h} />)}</datalist>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                        Add to Directory
                    </button>
                </form>
            </div>
        </div>
      )}

      {showClinicModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setShowClinicModal(false)}>
            <div className="bg-white w-full max-w-md border-t-4 border-[#FFC600] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="bg-black p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3"><Store className="w-5 h-5 text-[#FFC600]" /><h3 className="text-white font-bold">Add Clinic / Location</h3></div>
                     <button onClick={() => setShowClinicModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddClinic} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location Name</label>
                        <input required type="text" placeholder="Pharmacy or Clinic Name" className="w-full border p-2" value={newClinicForm.name} onChange={e => setNewClinicForm({...newClinicForm, name: e.target.value})} />
                    </div>
                    <div>
                         <label className="flex items-center gap-2 p-2 border rounded bg-slate-50 cursor-pointer hover:bg-slate-100">
                             <input type="checkbox" checked={newClinicForm.isPharmacy} onChange={e => setNewClinicForm({...newClinicForm, isPharmacy: e.target.checked})} />
                             <span className="text-sm font-bold">This is a Pharmacy</span>
                         </label>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration Date</label>
                        <input type="date" className="w-full border p-2" value={newClinicForm.date} onChange={e => setNewClinicForm({...newClinicForm, date: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                         Register Location
                    </button>
                </form>
            </div>
        </div>
      )}

      <nav className="bg-black text-white sticky top-0 z-40 shadow-md border-b-4 border-[#FFC600] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFC600] p-1.5 transform rotate-3">
                <Hexagon className="w-6 h-6 text-black fill-current transform -rotate-3" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl leading-none tracking-tighter">SPIN</span>
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
                    <button onClick={async () => { await supabase?.auth.signOut(); setUser(null); }} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2" title="Logout"><LogOut className="w-5 h-5" /></button>
                  </>
              ) : (
                  <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-[#FFC600] hover:bg-yellow-400 text-black px-4 py-2 font-bold uppercase text-xs tracking-wider transition-colors"><LogIn className="w-4 h-4" /> Staff Login</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative flex flex-col">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full flex-grow">
          
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard className="w-4 h-4" /> Dashboard</button>
            <button onClick={() => setActiveTab('deliver')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'deliver' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Syringe className="w-4 h-4" /> Deliver Pen {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
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
                          <h2 className="text-4xl font-black text-slate-900 mb-4">Welcome to SPIN</h2>
                          <p className="text-lg text-slate-600 max-w-3xl">The <strong>Supply Insulin Pen Network</strong> is an advanced tracking and verification system designed to ensure the secure, efficient, and traceable distribution of insulin pens to patients.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900"><ShieldCheck className="w-12 h-12 text-[#FFC600] mb-4" /><h3 className="font-bold text-lg mb-2">Secure Validation</h3><p className="text-slate-500 text-sm">Every transaction is verified against patient ID to prevent duplication and fraud.</p></div>
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900"><BarChart3 className="w-12 h-12 text-[#FFC600] mb-4" /><h3 className="font-bold text-lg mb-2">Real-time Tracking</h3><p className="text-slate-500 text-sm">Monitor stock levels and distribution flow across all healthcare providers instantly.</p></div>
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900"><Users className="w-12 h-12 text-[#FFC600] mb-4" /><h3 className="font-bold text-lg mb-2">Patient Centric</h3><p className="text-slate-500 text-sm">Ensuring the right patient gets the right treatment at the right time.</p></div>
                      </div>
                      <div className="text-center pt-10"><p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-4">Authorized access only</p><button onClick={() => setShowLoginModal(true)} className="bg-black text-white hover:bg-slate-800 px-8 py-4 font-bold uppercase tracking-wide shadow-lg transition-all">Access Dashboard</button></div>
                  </div>
              ) : (
                  <>
                      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500"><h1 className="text-2xl font-bold text-slate-900">Welcome back, {userProfile?.full_name || user.email?.split('@')[0]}</h1><p className="text-slate-500 text-sm">Here is your daily distribution overview.</p></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Conditional Dashboard Cards based on Permission */}
                        {canManageStock && (
                            <div onClick={() => { setActiveTab('custody'); }} className="bg-white p-6 shadow-sm border-l-4 border-blue-500 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 cursor-pointer hover:bg-blue-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">My Inventory</p><h3 className="text-3xl font-black text-slate-900">{repCustody?.current_stock || 0}</h3></div><div className="bg-blue-50 p-3 rounded-full group-hover:bg-blue-200 transition-colors"><Briefcase className="w-6 h-6 text-blue-600 group-hover:text-black" /></div></div>
                        )}

                        <div onClick={() => { setActiveTab('database'); setDbView('deliveries'); }} className="bg-white p-6 shadow-sm border-l-4 border-[#FFC600] flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-75 cursor-pointer hover:bg-yellow-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Delivered</p><h3 className="text-3xl font-black text-slate-900">{visibleDeliveries.length}</h3></div><div className="bg-yellow-50 p-3 rounded-full group-hover:bg-[#FFC600] transition-colors"><Package className="w-6 h-6 text-[#FFC600] group-hover:text-black" /></div></div>
                        <div onClick={() => { setActiveTab('database'); setDbView('deliveries'); }} className="bg-white p-6 shadow-sm border-l-4 border-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-100 cursor-pointer hover:bg-slate-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Patients Reached</p><h3 className="text-3xl font-black text-slate-900">{new Set(visibleDeliveries.map(d => d.patient_id)).size}</h3></div><div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200"><Users className="w-6 h-6 text-slate-900" /></div></div>
                        <div onClick={() => { setActiveTab('database'); setDbView('locations'); }} className="bg-white p-6 shadow-sm border-l-4 border-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-150 cursor-pointer hover:bg-slate-50 transition-colors group"><div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Custodies</p><h3 className="text-3xl font-black text-slate-900">{custodies.length}</h3></div><div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200"><Building2 className="w-6 h-6 text-slate-900" /></div></div>
                      </div>
                  </>
              )}
            </div>
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

          {activeTab === 'deliver' && (
            !user ? (
                <LockedState title="Delivery Module Locked" description="You must be a registered distributor or HCP to log new deliveries." />
            ) : !canDeliver ? (
                <LockedState title="Delivery Access Restricted" description="Only Medical Representatives can register new deliveries." />
            ) : (
              <div className="bg-white shadow-lg border-t-4 border-[#FFC600] max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
                  <button onClick={handleCancelDelivery} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 z-10 bg-slate-800/50 hover:bg-red-50 p-2 rounded-full transition-colors border border-transparent hover:border-red-200" title="Cancel Transaction"><X className="w-4 h-4" /></button>
                  <div className="bg-slate-900 text-white px-8 py-6"><h2 className="text-xl font-bold flex items-center gap-2"><Syringe className="w-5 h-5 text-[#FFC600]" /> New Pen Delivery</h2><p className="text-slate-400 text-sm mt-1">Register a transaction and assign insulin product.</p></div>
                  <div className="p-8">
                      <div className={`transition-opacity ${step !== 1 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Step 1: Identify Patient</label>
                      <div className="flex gap-2 mb-4"><input type="text" placeholder="Search by National ID or Phone" className="flex-1 border border-slate-300 p-3 bg-slate-50 font-mono focus:ring-2 focus:ring-[#FFC600] outline-none" value={nidSearch} onChange={(e) => setNidSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()} /><button onClick={handlePatientSearch} className="bg-black text-white px-6 font-bold uppercase text-xs">Search</button></div>
                      {foundPatient ? (
                          <div className="bg-green-50 border border-green-200 p-4 mb-6 animate-in fade-in"><div className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /><div className="flex-1"><p className="font-bold text-green-800">Patient Found</p><p className="text-sm text-green-700">{foundPatient.full_name}</p><p className="text-xs text-green-600 font-mono">{foundPatient.national_id} | {foundPatient.phone_number}</p></div></div></div>
                      ) : hasSearched && (
                          <div className="bg-slate-50 border border-slate-200 p-4 mb-6 animate-in fade-in"><p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#FFC600]" /> Patient not found. Register new?</p><div className="space-y-3"><input type="text" placeholder="Full Name" className="w-full border border-slate-300 p-2 text-sm" value={newPatientForm.full_name} onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})} /><input type="text" placeholder="Phone Number" className="w-full border border-slate-300 p-2 text-sm" value={newPatientForm.phone_number} onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})} /><button onClick={handleCreatePatient} disabled={isSubmitting} className="bg-black text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">Save & Select Patient</button></div></div>
                      )}
                      {foundPatient && (
                          <>
                             {duplicateWarning && (
                                <div className="bg-yellow-50 rounded-lg p-3 mb-4 animate-in slide-in-from-top-2 border border-yellow-200 flex items-center gap-3">
                                    <div className="bg-yellow-100 p-1.5 rounded-full"><Info className="w-4 h-4 text-yellow-700" /></div>
                                    <div>
                                        <p className="font-bold text-yellow-800 text-xs uppercase tracking-wide">Duplication Notice</p>
                                        <p className="text-xs text-yellow-700">Patient recently received this product. Proceed with caution.</p>
                                    </div>
                                </div>
                             )}
                             <button onClick={() => setStep(2)} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">{duplicateWarning ? 'Acknowledge & Continue' : 'Next: Delivery Details'} <ArrowRight className="w-4 h-4" /></button>
                          </>
                      )}
                      </div>

                      <div className={`transition-opacity ${step !== 2 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                      <div className="flex justify-between items-center mb-6"><label className="block text-xs font-bold text-slate-500 uppercase">Step 2: Transaction Details</label><button onClick={() => setStep(1)} className="text-xs text-slate-400 underline flex items-center gap-1"><Undo2 className="w-3 h-3"/> Change Patient</button></div>
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-slate-800 mb-1">Delivery Date (DD/MM/YYYY)</label><input type="date" required className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div><div><div className="flex justify-between items-end mb-1"><label className="block text-sm font-bold text-slate-800">From Custody (Source) <span className="text-red-500">*</span></label><button onClick={() => setShowClinicModal(true)} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3" /> Add New</button></div><select className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={selectedCustody} onChange={e => setSelectedCustody(e.target.value)}><option value="">-- Select Source --</option>{custodies.filter(c => c.type === 'rep').map(c => (<option key={c.id} value={c.id}>My Inventory (Rep)</option>))}<option disabled>──────────</option>{custodies.filter(c => c.type === 'clinic').map(c => (<option key={c.id} value={c.id}>{c.name.toLowerCase().includes('pharmacy') ? c.name : `${c.name} (Clinic)`}</option>))}</select></div></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><div className="flex justify-between items-end mb-1"><label className="block text-sm font-bold text-slate-800">Prescribing Doctor (Rx)</label><button onClick={() => setShowHCPModal(true)} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3" /> New</button></div><select className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={selectedHCP} onChange={e => setSelectedHCP(e.target.value)}><option value="">-- Select Doctor --</option>{hcps.map(h => (<option key={h.id} value={h.id}>{h.full_name} - {h.hospital}</option>))}</select></div><div><label className="block text-sm font-bold text-slate-800 mb-1">Rx Date</label><input type="date" className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={rxDate} onChange={e => setRxDate(e.target.value)} /></div></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-slate-800 mb-1">Reported Educator Name <span className="text-red-500">*</span></label><input type="text" placeholder="Name" className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={educatorName} onChange={e => setEducatorName(e.target.value)} list="educator-list-delivery" /><datalist id="educator-list-delivery">{educatorSuggestions.map((name, i) => <option key={i} value={name} />)}</datalist><div className="flex flex-wrap gap-1 mt-1">{educatorSuggestions.slice(0, 6).map(s => (<button key={s} onClick={() => setEducatorName(s)} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded hover:bg-[#FFC600]">{s}</button>))}</div></div><div><label className="block text-sm font-bold text-slate-800 mb-1">Data Submission Date</label><input type="date" className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none" value={educatorDate} onChange={e => setEducatorDate(e.target.value)} /></div></div>
                          <div><label className="block text-sm font-bold text-slate-800 mb-2">Assign Insulin Product</label><div className="grid grid-cols-1 gap-2">
                              {PRODUCTS.map(p => {
                                  const styles = getProductButtonStyles(p.id, selectedProduct === p.id);
                                  return (
                                  <button key={p.id} onClick={() => { setSelectedProduct(p.id); if(foundPatient) dataService.checkDuplicateDelivery(foundPatient.id, p.id).then(setDuplicateWarning); }} className={`p-3 text-left border-2 transition-all ${styles}`}>
                                      <div className="font-bold text-sm">{p.name}</div>
                                      <div className="text-xs uppercase opacity-70">{p.type}</div>
                                  </button>
                                  );
                              })}
                          </div></div>
                          <button onClick={handleSubmitDelivery} disabled={isSubmitting} className={`w-full py-4 font-bold uppercase tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${duplicateWarning ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-black text-[#FFC600] hover:bg-slate-800'}`}>
                             {duplicateWarning ? 'Confirm Delivery (Review)' : 'Confirm Delivery'}
                          </button>
                      </div>
                      </div>
                  </div>
              </div>
            )
          )}

          {activeTab === 'database' && (
            !user ? (
              <LockedState title="Database Access Locked" description="Full system records are strictly confidential and available only to authorized admin." />
            ) : (
              <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                          <button onClick={() => setActiveTab('dashboard')} className="text-slate-400 hover:text-black p-2 bg-white border border-slate-200 rounded-lg shadow-sm" title="Back to Dashboard"><ArrowLeft className="w-5 h-5" /></button>
                          <div className="flex gap-4 border-b border-slate-200 pb-2 md:pb-0 md:border-0 pl-2">
                              <button onClick={() => setDbView('deliveries')} className={`pb-2 md:pb-0 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap ${dbView === 'deliveries' ? 'border-b-4 md:border-0 md:text-[#FFC600] md:bg-black md:px-3 md:py-1 md:rounded border-[#FFC600] text-black' : 'text-slate-400 hover:text-black'}`}>Transactions</button>
                              <button onClick={() => setDbView('patients')} className={`pb-2 md:pb-0 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap ${dbView === 'patients' ? 'border-b-4 md:border-0 md:text-[#FFC600] md:bg-black md:px-3 md:py-1 md:rounded border-[#FFC600] text-black' : 'text-slate-400 hover:text-black'}`}>Patients</button>
                              <button onClick={() => setDbView('hcps')} className={`pb-2 md:pb-0 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap ${dbView === 'hcps' ? 'border-b-4 md:border-0 md:text-[#FFC600] md:bg-black md:px-3 md:py-1 md:rounded border-[#FFC600] text-black' : 'text-slate-400 hover:text-black'}`}>Doctors</button>
                              <button onClick={() => setDbView('locations')} className={`pb-2 md:pb-0 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap ${dbView === 'locations' ? 'border-b-4 md:border-0 md:text-[#FFC600] md:bg-black md:px-3 md:py-1 md:rounded border-[#FFC600] text-black' : 'text-slate-400 hover:text-black'}`}>Locations</button>
                              <button onClick={() => setDbView('stock')} className={`pb-2 md:pb-0 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap ${dbView === 'stock' ? 'border-b-4 md:border-0 md:text-[#FFC600] md:bg-black md:px-3 md:py-1 md:rounded border-[#FFC600] text-black' : 'text-slate-400 hover:text-black'}`}>History</button>
                          </div>
                      </div>
                      <div className="relative w-full md:w-64">
                          <input 
                              type="text" 
                              placeholder="Search Database..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 text-sm focus:border-[#FFC600] outline-none bg-white rounded-lg shadow-sm"
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                  </div>

                  {dbView === 'deliveries' && (
                    <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto rounded-lg">
                        <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Date</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Patient</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Product</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Prescriber</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Educator</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 w-24">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{filterData(visibleDeliveries).map(d => (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{formatDateFriendly(d.delivery_date)}</td>
                                <td className="px-6 py-4"><div className="font-bold text-slate-800">{d.patient?.full_name}</div><div className="text-xs text-slate-400 font-mono">{d.patient?.national_id}</div></td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getProductStyles(d.product_id)}`}>
                                        {getProductName(d.product_id)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{d.hcp?.full_name}{d.rx_date && <div className="text-[10px] text-slate-400">Rx: {formatDateFriendly(d.rx_date)}</div>}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{d.educator_name || '-'}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    {isAdmin || (userProfile?.role === 'mr' && d.delivered_by === user.id) ? (
                                        <>
                                            <button onClick={() => openEditModal('deliveries', d)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteItem('deliveries', d.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                        </>
                                    ) : <span className="text-slate-300"><Lock className="w-4 h-4" /></span>}
                                </td>
                            </tr>
                        ))}</tbody>
                        </table>
                        {filterData(visibleDeliveries).length === 0 && <div className="p-10 text-center text-slate-400">No records found. {userProfile?.role === 'mr' ? 'Log your first delivery.' : ''}</div>}
                    </div>
                  )}

                  {dbView === 'patients' && (
                     <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto rounded-lg">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Patient Name</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Identifiers</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Current Therapy</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Last Delivery</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filterData(patients).map(p => {
                                    const patientDeliveries = deliveries.filter(d => d.patient_id === p.id).sort((a,b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
                                    const lastDelivery = patientDeliveries[0];
                                    const latestProductId = lastDelivery ? lastDelivery.product_id : null;
                                    const latestProductName = latestProductId ? getProductName(latestProductId) : '-';

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{p.full_name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono text-slate-600">ID: {p.national_id}</div>
                                                <div className="text-xs font-mono text-slate-500">Ph: {p.phone_number}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {latestProductId ? (
                                                    <span className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getProductStyles(latestProductId)}`}>
                                                        {latestProductName}
                                                    </span>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {lastDelivery ? formatDateFriendly(lastDelivery.delivery_date) : <span className="text-slate-400 italic">No history</span>}
                                            </td>
                                            <td className="px-6 py-4 flex gap-2">
                                                {isAdmin || canManageStock ? (
                                                    <>
                                                        <button onClick={() => openEditModal('patients', p)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDeleteItem('patients', p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                    </>
                                                ) : <span className="text-slate-300"><Lock className="w-4 h-4" /></span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filterData(patients).length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
                     </div>
                  )}

                  {dbView === 'hcps' && (
                     <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto rounded-lg">
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Doctor Name</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Specialty</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Hospital</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 w-24">Actions</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                              {filterData(hcps).map(h => (
                                 <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800">{h.full_name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{h.specialty || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{h.hospital || '-'}</td>
                                    <td className="px-6 py-4 flex gap-2">
                                       {isAdmin || canManageStock ? (
                                            <>
                                                <button onClick={() => openEditModal('hcps', h)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteItem('hcps', h.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                            </>
                                       ) : <span className="text-slate-300"><Lock className="w-4 h-4" /></span>}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        {filterData(hcps).length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
                     </div>
                  )}

                  {dbView === 'locations' && (
                     <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto rounded-lg">
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Location Name</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Type</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Current Stock</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Registered</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 w-24">Actions</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                              {filterData(custodies).map(c => (
                                 <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                                    <td className="px-6 py-4"><span className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${c.type === 'rep' ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{c.type}</span></td>
                                    <td className="px-6 py-4 font-mono font-bold">{c.current_stock}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateFriendly(c.created_at)}</td>
                                    <td className="px-6 py-4 flex gap-2">
                                       {isAdmin || canManageStock ? (
                                            <>
                                                <button onClick={() => openEditModal('locations', c)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteItem('locations', c.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                            </>
                                       ) : <span className="text-slate-300"><Lock className="w-4 h-4" /></span>}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        {filterData(custodies).length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
                     </div>
                  )}

                  {dbView === 'stock' && (
                     <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto rounded-lg">
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Date</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Target Custody</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Quantity</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Source / Notes</th><th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 w-24">Actions</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                              {filterData(stockTransactions).map(t => {
                                 const custodyName = custodies.find(c => c.id === t.custody_id)?.name || t.custody_id;
                                 return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                       <td className="px-6 py-4 font-mono text-sm text-slate-600">{formatDateFriendly(t.transaction_date)}</td>
                                       <td className="px-6 py-4 font-bold text-slate-800">{custodyName}</td>
                                       <td className={`px-6 py-4 font-bold ${t.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{t.quantity > 0 ? '+' : ''}{t.quantity}</td>
                                       <td className="px-6 py-4 text-sm text-slate-600">{resolveSourceText(t.source)}</td>
                                       <td className="px-6 py-4 flex gap-2">
                                          {isAdmin || (userProfile?.role === 'mr' && t.quantity < 0) ? (
                                              <>
                                                  <button onClick={() => openEditModal('stock', t)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4"/></button>
                                                  {t.quantity > 0 && custodies.find(c => c.id === t.custody_id)?.type !== 'rep' && canManageStock && (
                                                      <button onClick={() => handleRetrieveStock(t)} className="text-slate-400 hover:text-orange-500" title="Retrieve Stock"><RotateCcw className="w-4 h-4" /></button>
                                                  )}
                                                  <button onClick={() => handleDeleteItem('stock', t.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                              </>
                                          ) : <span className="text-slate-300"><Lock className="w-4 h-4" /></span>}
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                        {filterData(stockTransactions).length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
                     </div>
                  )}

              </div>
            )
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-slate-200 py-0.5 shrink-0 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] relative">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-6">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Hexagon className="w-3 h-3 text-[#FFC600] fill-current" />
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
