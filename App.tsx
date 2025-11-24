
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
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Network,
  Filter,
  Maximize2,
  Minimize2
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
  name: "S.P.I.N v2.0.033",
  version: "2.0.033"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'database' | 'admin' | 'analytics';
type DBView = 'deliveries' | 'hcps' | 'locations' | 'stock' | 'patients';

const COLORS = ['#FFC600', '#000000', '#94a3b8', '#475569', '#cbd5e1'];

const PRODUCT_COLOR_MAP: Record<string, string> = {
  'glargivin-100': '#8b5cf6', 
  'humaxin-r': '#eab308',     
  'humaxin-mix': '#f97316',   
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
  
  const [expandPrescribers, setExpandPrescribers] = useState(false);
  const [expandDeliveries, setExpandDeliveries] = useState(true);
  const [expandAll, setExpandAll] = useState(false);

  // Database Filters (DM/LM)
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

      // Ensure Rep Custody Exists
      let repC = c.find(x => x.type === 'rep' && x.owner_id === user.id) || null;
      
      // Auto-create custody if missing for MR/Admin
      if (!repC && (currentProf?.role === 'mr' || currentProf?.role === 'admin')) {
          try {
              repC = await dataService.ensureRepCustody(user.id);
              // Update local list with new custody
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
    if (!newPatientForm.full_name || !nidSearch) return;
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
        showToast(`Error creating patient: ${e.message || 'Unknown error'}`, "error");
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

  const getFilteredDatabaseData = (data: any[]) => {
      const isDM = userProfile?.role === 'dm';
      const isLM = userProfile?.role === 'lm';
      if (!isDM && !isLM) return data;

      return data.filter(item => {
          let ownerId = null;
          if (dbView === 'deliveries') ownerId = item.delivered_by;
          else if (dbView === 'stock') {
              const cust = custodies.find(c => c.id === item.custody_id);
              if (cust && cust.type === 'rep') ownerId = cust.owner_id;
          }
          else if (dbView === 'hcps' || dbView === 'patients') {
              ownerId = item.created_by;
          }
          else if (dbView === 'locations') {
              ownerId = item.owner_id; 
          }

          if (!ownerId && dbView === 'locations' && item.type === 'clinic') return true;
          if (!ownerId) return true; // Show admin records or global records

          if (filterMrId !== 'all' && ownerId !== filterMrId) return false;
          
          if (isLM && filterDmId !== 'all') {
              const ownerProfile = allProfiles.find(p => p.id === ownerId);
              if (ownerProfile?.manager_id !== filterDmId) return false;
          }

          if (isDM) {
             const ownerProfile = allProfiles.find(p => p.id === ownerId);
             if (ownerProfile?.manager_id !== user.id && ownerId !== user.id) return false;
          }

          if (isLM) {
              const ownerProfile = allProfiles.find(p => p.id === ownerId);
              const ownerManager = ownerProfile?.manager_id ? allProfiles.find(m => m.id === ownerProfile.manager_id) : null;
              if (ownerManager?.manager_id !== user.id && ownerId !== user.id) return false;
          }

          return true;
      });
  };

  const renderTeamInventory = () => {
      if (userProfile?.role !== 'dm' && userProfile?.role !== 'lm') return null;

      // DM View: Show direct MRs
      if (userProfile.role === 'dm') {
          const teamMembers = allProfiles.filter(p => p.role === 'mr' && p.manager_id === user.id);
          const teamCustodies = custodies.filter(c => c.type === 'rep' && teamMembers.map(m => m.id).includes(c.owner_id || ''));
          const totalStock = teamCustodies.reduce((sum, c) => sum + (c.current_stock || 0), 0);

          return (
              <div className="space-y-6">
                  <div className="bg-white p-6 shadow-sm border-l-4 border-blue-500 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                          <div>
                              <h3 className="text-lg font-bold text-slate-900">District Inventory</h3>
                              <p className="text-xs text-slate-500">Stock Breakdown by Medical Rep</p>
                          </div>
                          <div className="text-right">
                              <span className="text-4xl font-black text-slate-900">{totalStock}</span>
                              <span className="block text-[10px] font-bold uppercase text-slate-400">Total Pens</span>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="p-3">Medical Rep</th>
                                    <th className="p-3 text-right">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {teamMembers.map(mr => {
                                    const c = teamCustodies.find(tc => tc.owner_id === mr.id);
                                    return (
                                        <tr key={mr.id}>
                                            <td className="p-3 font-bold text-slate-700">{mr.full_name}</td>
                                            <td className="p-3 text-right font-mono font-bold">
                                                {c ? c.current_stock : <span className="text-slate-300">0</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                  </div>
              </div>
          );
      }

      // LM View: Hierarchical Breakdown
      if (userProfile.role === 'lm') {
          const myDMs = allProfiles.filter(p => p.role === 'dm' && p.manager_id === user.id);
          
          // Compute tree
          const data = myDMs.map(dm => {
              const mrs = allProfiles.filter(p => p.role === 'mr' && p.manager_id === dm.id);
              const mrStocks = mrs.map(mr => {
                  const c = custodies.find(x => x.type === 'rep' && x.owner_id === mr.id);
                  return {
                      ...mr,
                      stock: c?.current_stock || 0
                  };
              });
              const dmTotal = mrStocks.reduce((sum, item) => sum + item.stock, 0);
              return { dm, mrStocks, dmTotal };
          });

          const regionTotal = data.reduce((sum, group) => sum + group.dmTotal, 0);

          return (
               <div className="space-y-6">
                  <div className="bg-white p-6 shadow-sm border-l-4 border-purple-500 rounded-lg">
                      <div className="flex justify-between items-center mb-6">
                          <div>
                              <h3 className="text-lg font-bold text-slate-900">Regional Inventory</h3>
                              <p className="text-xs text-slate-500">Breakdown by District</p>
                          </div>
                          <div className="text-right">
                              <span className="text-4xl font-black text-slate-900">{regionTotal}</span>
                              <span className="block text-[10px] font-bold uppercase text-slate-400">Total Pens</span>
                          </div>
                      </div>

                      <div className="space-y-4">
                        {data.map(group => (
                            <div key={group.dm.id} className="border border-slate-200 rounded overflow-hidden">
                                <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-100 p-1.5 rounded-full"><UserCircle className="w-4 h-4 text-blue-600"/></div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{group.dm.full_name}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">District Manager</p>
                                        </div>
                                    </div>
                                    <div className="bg-black text-[#FFC600] px-3 py-1 rounded text-xs font-bold">
                                        Total: {group.dmTotal}
                                    </div>
                                </div>
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-50 text-xs">
                                        {group.mrStocks.map((mr) => (
                                            <tr key={mr.id}>
                                                <td className="p-2 pl-4 text-slate-600 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                    {mr.full_name}
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-slate-700">{mr.stock}</td>
                                            </tr>
                                        ))}
                                        {group.mrStocks.length === 0 && (
                                            <tr><td colSpan={2} className="p-3 text-center text-slate-400 italic">No Medical Reps assigned</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                      </div>
                  </div>
              </div>
          );
      }
      return null;
  };

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
            let r = await dataService.getRepCustody(user.id);
            if (!r) {
                 r = await dataService.ensureRepCustody(user.id);
                 setRepCustody(r);
                 if(r) setCustodies(prev => [...prev, r!]);
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
        // Global clinics usually don't have an owner, or are owned by creator. 
        // We set current user as owner so they can see it, but type 'clinic' usually implies shared.
        const created = await dataService.createCustody({
            name: finalName,
            type: 'clinic',
            created_at: newClinicForm.date,
            owner_id: user.id // Tag with creator for visibility in strict mode
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
      let d = getFilteredDatabaseData(data); 
      if (!searchTerm) return d;
      const lower = searchTerm.toLowerCase();
      return d.filter(item => {
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

  const handleToggleAll = () => {
    setExpandAll(!expandAll);
    setExpandDeliveries(!expandAll);
    setExpandPrescribers(!expandAll);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFC600]"><Activity className="animate-spin w-10 h-10" /></div>;

  const canDeliver = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const canManageStock = userProfile?.role === 'mr' || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';
  const isDM = userProfile?.role === 'dm';
  const isLM = userProfile?.role === 'lm';
  const isReadOnly = isDM || isLM; 

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
                  <div className="w-8 h-8 rounded border border-slate-700 bg-white flex items-center justify-center text-lg">🖊️</div>
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
                profiles={allProfiles}
                currentUserId={user.id}
            />
          </div>
      )}

      {/* Edit Modal */}
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
                             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date</label><input type="date" className="w-full border p-2" value={editItem.delivery_date} onChange={e => setEditItem({...editItem, delivery_date: e.target.value})} /></div>
                             <div className="border-b border-slate-100 pb-4 mb-4">
                                 <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Patient</label>
                                    <button type="button" onClick={checkEditDuplication} className="text-[10px] bg-slate-100 hover:bg-[#FFC600] px-2 py-1 rounded flex items-center gap-1 font-bold uppercase transition-colors"><RefreshCw className="w-3 h-3" /> Check Duplication</button>
                                 </div>
                                 <select className="w-full border p-2 bg-white mb-2" value={editItem.patient_id} onChange={e => setEditItem({...editItem, patient_id: e.target.value})}>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
                             </div>
                        </>
                    )}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide flex items-center justify-center gap-2">
                         <Save className="w-4 h-4" /> Save Changes
                    </button>
                </form>
             </div>
         </div>
      )}

      {/* HCP & Clinic Modals */}
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
              <div className="w-10 h-10 rounded-lg border-2 border-[#FFC600] flex items-center justify-center bg-slate-900 text-2xl">🖊️</div>
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
                    {/* AI Button Hidden */}
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

      {/* Main Content Area */}
      {activeTab !== 'analytics' && (
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative flex flex-col">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard className="w-4 h-4" /> Dashboard</button>
            {(userProfile?.role === 'mr' || userProfile?.role === 'admin') && (
                <button onClick={() => setActiveTab('deliver')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'deliver' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Syringe className="w-4 h-4" /> Deliver Pen {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            )}
            <button onClick={() => setActiveTab('custody')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'custody' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Building2 className="w-4 h-4" /> Custody {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            <button onClick={() => setActiveTab('database')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-black text-[#FFC600] shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Database className="w-4 h-4" /> Database {!user && <Lock className="w-3 h-3 ml-1 opacity-50" />}</button>
            {isAdmin && (
                <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'admin' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Admin Panel</button>
            )}
          </div>

          {!user && activeTab !== 'dashboard' ? (
              <LockedState title="Restricted Access" description="Please login to access the secure distribution network and patient data." loginRequired />
          ) : (
            <>
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                             <h2 className="text-xl font-bold text-slate-800">
                                 {userProfile?.role === 'mr' ? `Territory Dashboard: ${userProfile.full_name}` : 
                                  userProfile?.role === 'dm' ? `District Dashboard: ${userProfile.full_name}` : 
                                  userProfile?.role === 'lm' ? `Regional Dashboard: ${userProfile.full_name}` : 
                                  'Network Dashboard'}
                             </h2>
                             <div className="flex items-center gap-2">
                                <button onClick={() => setActiveTab('analytics')} className="flex items-center gap-2 text-xs font-bold uppercase bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded transition-colors">
                                    <BarChart3 className="w-4 h-4" /> View Full Analytics
                                </button>
                                <button onClick={handleToggleAll} className="flex items-center gap-2 text-xs font-bold uppercase bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded transition-colors" title={expandAll ? "Collapse All" : "Expand All"}>
                                    {expandAll ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                             </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[#FFC600] relative overflow-hidden group hover:translate-y-[-2px] transition-transform">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Deliveries</p>
                                    <h3 className="text-3xl font-black text-slate-900">{visibleDeliveries.length}</h3>
                                </div>
                                <Syringe className="absolute right-4 bottom-4 w-12 h-12 text-[#FFC600] opacity-10 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-slate-800 relative overflow-hidden group hover:translate-y-[-2px] transition-transform">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Prescribers</p>
                                    <h3 className="text-3xl font-black text-slate-900">{uniquePrescribersCount}</h3>
                                </div>
                                <Stethoscope className="absolute right-4 bottom-4 w-12 h-12 text-slate-800 opacity-10 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 relative overflow-hidden group hover:translate-y-[-2px] transition-transform">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">My Stock Level</p>
                                    <h3 className="text-3xl font-black text-slate-900">{repCustody?.current_stock || 0}</h3>
                                </div>
                                <Package className="absolute right-4 bottom-4 w-12 h-12 text-blue-500 opacity-10 group-hover:scale-110 transition-transform" />
                            </div>
                             <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 relative overflow-hidden group hover:translate-y-[-2px] transition-transform">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Unique Patients</p>
                                    <h3 className="text-3xl font-black text-slate-900">{new Set(visibleDeliveries.map(d => d.patient_id)).size}</h3>
                                </div>
                                <Users className="absolute right-4 bottom-4 w-12 h-12 text-green-500 opacity-10 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center cursor-pointer bg-slate-50" onClick={() => setExpandDeliveries(!expandDeliveries)}>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-[#FFC600]" /> Recent Deliveries</h3>
                                {expandDeliveries ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                            {expandDeliveries && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Prescriber</th>
                                                <th className="p-4">Product</th>
                                                <th className="p-4">Patient</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {visibleDeliveries.slice(0, 5).map(d => (
                                                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-mono text-xs text-slate-500">{formatDateFriendly(d.delivery_date)}</td>
                                                    <td className="p-4 font-bold text-slate-700">{d.hcp?.full_name}</td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${getProductStyles(d.product_id)}`}>
                                                            {getProductName(d.product_id)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-600">***{d.patient?.national_id.slice(-4)}</td>
                                                    <td className="p-4"><span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit"><CheckCircle className="w-3 h-3" /> COMPLETED</span></td>
                                                </tr>
                                            ))}
                                            {visibleDeliveries.length === 0 && (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No recent delivery records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'custody' && (
                    <div className="space-y-8">
                         {renderTeamInventory()}

                         {(userProfile?.role === 'mr' || userProfile?.role === 'admin') && (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">My Inventory</h3>
                                                <p className="text-xs text-slate-500">Current Stock Level</p>
                                            </div>
                                            <div className="bg-blue-50 p-2 rounded-lg">
                                                <Package className="w-8 h-8 text-blue-500" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-2 mb-8">
                                            <span className="text-5xl font-black text-slate-900">{repCustody?.current_stock || 0}</span>
                                            <span className="text-sm font-bold text-slate-400 uppercase">Pens Available</span>
                                        </div>
                                        
                                        <form onSubmit={handleReceiveStock} className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Plus className="w-3 h-3" /> Add Stock from Educator</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="number" placeholder="Qty" className="w-full p-2 text-sm border rounded" value={receiveForm.quantity || ''} onChange={e => setReceiveForm({...receiveForm, quantity: parseInt(e.target.value)})} />
                                                <input type="date" className="w-full p-2 text-sm border rounded" value={receiveForm.date} onChange={e => setReceiveForm({...receiveForm, date: e.target.value})} />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Educator Name" 
                                                className="w-full p-2 text-sm border rounded" 
                                                value={receiveForm.educatorName} 
                                                onChange={e => setReceiveForm({...receiveForm, educatorName: e.target.value})}
                                                list="educators"
                                            />
                                            <datalist id="educators">{educatorSuggestions.map((e,i) => <option key={i} value={e} />)}</datalist>
                                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 text-xs uppercase rounded">Confirm Receipt</button>
                                        </form>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                     <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-[#FFC600]">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-900">Supply Locations</h3>
                                            <button onClick={() => setShowClinicModal(true)} className="text-xs font-bold uppercase bg-black text-[#FFC600] px-3 py-1.5 rounded hover:bg-slate-800 flex items-center gap-1"><Plus className="w-3 h-3"/> New Location</button>
                                        </div>

                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {custodies.filter(c => c.type === 'clinic').map(clinic => (
                                                <div key={clinic.id} className="p-4 border border-slate-200 rounded hover:border-[#FFC600] transition-colors bg-slate-50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-slate-800">{clinic.name}</h4>
                                                        <span className="bg-white px-2 py-1 rounded text-xs font-mono font-bold border shadow-sm">{clinic.current_stock || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                                                        <span>Updated: {getLastSupplyDate(clinic.id)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 p-1 border rounded text-xs" 
                                                            placeholder="Qty" 
                                                            id={`transfer-${clinic.id}`}
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const el = document.getElementById(`transfer-${clinic.id}`) as HTMLInputElement;
                                                                if(el.value) {
                                                                    setTransferForm({
                                                                        ...transferForm,
                                                                        toCustodyId: clinic.id,
                                                                        quantity: parseInt(el.value),
                                                                        sourceType: 'rep'
                                                                    });
                                                                    // We need to trigger submit, but state update is async.
                                                                    // For simplicity in this UI, let's just create a quick inline handler or modal. 
                                                                    // Better: Populate the transfer form below or handle immediately.
                                                                    // Let's modify the transfer form state and simulate a submit or just call the function.
                                                                    if (window.confirm(`Transfer ${el.value} pens to ${clinic.name}?`)) {
                                                                        dataService.processStockTransaction(clinic.id, parseInt(el.value), getTodayString(), 'Transfer from MR', repCustody?.id)
                                                                            .then(() => { showToast("Transfer Successful", "success"); loadData(); el.value = ''; })
                                                                            .catch(e => showToast(e.message, "error"));
                                                                    }
                                                                }
                                                            }}
                                                            className="flex-1 bg-[#FFC600] hover:bg-yellow-400 text-black font-bold text-[10px] uppercase rounded py-1"
                                                        >
                                                            Supply
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {custodies.filter(c => c.type === 'clinic').length === 0 && (
                                                <p className="text-center text-slate-400 italic text-sm py-8">No clinics or pharmacies registered yet.</p>
                                            )}
                                        </div>
                                     </div>
                                </div>
                             </div>
                         )}
                    </div>
                )}
                
                {activeTab === 'deliver' && (
                     <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-black p-4 text-center">
                            <h2 className="text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2"><Syringe className="w-5 h-5 text-[#FFC600]" /> Record Delivery</h2>
                        </div>
                        
                        <div className="p-6 md:p-8">
                             {/* STEP 1: PATIENT ID */}
                             {step === 1 && (
                                 <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Patient National ID / Phone</label>
                                     <div className="flex gap-2 mb-6">
                                         <input 
                                            type="text" 
                                            value={nidSearch} 
                                            onChange={e => setNidSearch(e.target.value)} 
                                            className="flex-1 border-2 border-slate-200 p-4 rounded-lg text-lg font-mono focus:border-[#FFC600] outline-none transition-colors"
                                            placeholder="Search ID..."
                                            onKeyDown={e => e.key === 'Enter' && handlePatientSearch()}
                                         />
                                         <button onClick={handlePatientSearch} className="bg-black text-[#FFC600] px-6 rounded-lg font-bold uppercase hover:bg-slate-800 transition-colors"><Search className="w-6 h-6" /></button>
                                     </div>

                                     {hasSearched && !foundPatient && (
                                         <div className="bg-slate-50 p-6 rounded-lg border-2 border-dashed border-slate-300 text-center animate-in fade-in zoom-in">
                                             <p className="text-slate-800 font-bold mb-4">Patient not found. Register new?</p>
                                             <div className="space-y-3">
                                                 <input type="text" placeholder="Full Name" className="w-full p-3 border rounded" value={newPatientForm.full_name} onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})} />
                                                 <input type="text" placeholder="Phone Number" className="w-full p-3 border rounded" value={newPatientForm.phone_number} onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})} />
                                                 <button onClick={handleCreatePatient} className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase rounded shadow-sm">Register & Continue</button>
                                             </div>
                                         </div>
                                     )}

                                     {foundPatient && (
                                         <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex justify-between items-center animate-in fade-in zoom-in">
                                             <div>
                                                 <p className="text-xs font-bold text-green-700 uppercase">Patient Verified</p>
                                                 <p className="font-bold text-lg text-green-900">{foundPatient.full_name}</p>
                                                 <p className="font-mono text-sm text-green-700">{foundPatient.national_id}</p>
                                             </div>
                                             <button onClick={() => setStep(2)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold uppercase text-sm shadow-lg flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* STEP 2: DETAILS */}
                             {step === 2 && foundPatient && (
                                 <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                                     <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                         <div>
                                             <p className="text-xs font-bold text-slate-400 uppercase">Patient</p>
                                             <p className="font-bold text-slate-900">{foundPatient.full_name}</p>
                                         </div>
                                         <button onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 hover:text-black uppercase">Change</button>
                                     </div>

                                     <div>
                                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Product</label>
                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                             {PRODUCTS.map(p => (
                                                 <button 
                                                    key={p.id}
                                                    onClick={() => { setSelectedProduct(p.id); dataService.checkDuplicateDelivery(foundPatient.id, p.id).then(setDuplicateWarning); }}
                                                    className={`p-3 rounded border-2 text-left transition-all ${getProductButtonStyles(p.id, selectedProduct === p.id)}`}
                                                 >
                                                     <div className="font-bold text-sm mb-1">{p.name}</div>
                                                     <div className="text-[10px] opacity-70 uppercase">{p.type}</div>
                                                 </button>
                                             ))}
                                         </div>
                                         {duplicateWarning && (
                                             <div className="mt-2 bg-red-50 border border-red-200 p-3 rounded flex items-start gap-2">
                                                 <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                                 <p className="text-xs text-red-700 font-medium"><strong>Duplicate Warning:</strong> This patient received this product recently. Please verify.</p>
                                             </div>
                                         )}
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <div className="flex justify-between mb-1">
                                                 <label className="block text-xs font-bold text-slate-500 uppercase">Prescriber</label>
                                                 <button onClick={() => setShowHCPModal(true)} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">+ Add New</button>
                                             </div>
                                             <select className="w-full p-3 bg-white border rounded" value={selectedHCP} onChange={e => setSelectedHCP(e.target.value)}>
                                                 <option value="">-- Select Doctor --</option>
                                                 {hcps.map(h => <option key={h.id} value={h.id}>{h.full_name} ({h.hospital})</option>)}
                                             </select>
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RX Date (Prescription)</label>
                                              <input type="date" className="w-full p-3 bg-white border rounded" value={rxDate} onChange={e => setRxDate(e.target.value)} />
                                          </div>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reported Educator Name</label>
                                              <input 
                                                type="text" 
                                                className="w-full p-3 bg-white border rounded" 
                                                value={educatorName} 
                                                onChange={e => setEducatorName(e.target.value)}
                                                list="educators-list"
                                                placeholder="e.g. Nurse Joy"
                                              />
                                              <datalist id="educators-list">{educatorSuggestions.map((e,i) => <option key={i} value={e} />)}</datalist>
                                         </div>
                                         <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Educator Submission Date</label>
                                              <input type="date" className="w-full p-3 bg-white border rounded" value={educatorDate} onChange={e => setEducatorDate(e.target.value)} />
                                         </div>
                                     </div>

                                     <div className="pt-4 border-t border-slate-100 flex gap-3">
                                         <button onClick={handleCancelDelivery} className="flex-1 py-3 font-bold uppercase text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                                         <button onClick={handleSubmitDelivery} disabled={isSubmitting} className="flex-1 bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase rounded shadow-lg flex items-center justify-center gap-2">
                                             {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                             Confirm Delivery
                                         </button>
                                     </div>
                                 </div>
                             )}
                        </div>
                     </div>
                )}

                {activeTab === 'database' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded shadow-sm border border-slate-200">
                             {['deliveries', 'hcps', 'locations', 'stock', 'patients'].map(v => (
                                 <button 
                                    key={v}
                                    onClick={() => setDbView(v as DBView)}
                                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${dbView === v ? 'bg-black text-[#FFC600]' : 'text-slate-500 hover:bg-slate-50'}`}
                                 >
                                     {v}
                                 </button>
                             ))}
                        </div>

                        {renderDatabaseFilters()}

                        <div className="relative mb-4">
                            <input 
                                type="text" 
                                placeholder="Search records..." 
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg shadow-sm focus:border-[#FFC600] outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                                        <tr>
                                            {dbView === 'deliveries' && (
                                                <>
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Patient</th>
                                                    <th className="p-4">Product</th>
                                                    <th className="p-4">Prescriber</th>
                                                    <th className="p-4">MR / Owner</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </>
                                            )}
                                            {dbView === 'stock' && (
                                                <>
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Source / Note</th>
                                                    <th className="p-4 text-right">Qty</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </>
                                            )}
                                            {dbView === 'hcps' && (
                                                <>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">Specialty</th>
                                                    <th className="p-4">Hospital</th>
                                                    <th className="p-4">Created By</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </>
                                            )}
                                            {dbView === 'locations' && (
                                                <>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">Type</th>
                                                    <th className="p-4 text-right">Stock</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </>
                                            )}
                                            {dbView === 'patients' && (
                                                <>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">National ID</th>
                                                    <th className="p-4">Phone</th>
                                                    <th className="p-4">Created By</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filterData(
                                            dbView === 'deliveries' ? deliveries :
                                            dbView === 'stock' ? stockTransactions :
                                            dbView === 'hcps' ? hcps :
                                            dbView === 'locations' ? custodies :
                                            patients
                                        ).map((item: any) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                {dbView === 'deliveries' && (
                                                    <>
                                                        <td className="p-4 text-slate-500 font-mono text-xs">{formatDateFriendly(item.delivery_date)}</td>
                                                        <td className="p-4 font-bold text-slate-700">{item.patient?.full_name}</td>
                                                        <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${getProductStyles(item.product_id)}`}>{getProductName(item.product_id)}</span></td>
                                                        <td className="p-4 text-slate-600 text-xs">{item.hcp?.full_name}</td>
                                                        <td className="p-4 text-slate-600 text-xs">{getOwnerDetails(item.delivered_by).mrName}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => openEditModal('deliveries', item)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteItem('deliveries', item.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </>
                                                )}
                                                {dbView === 'stock' && (
                                                    <>
                                                        <td className="p-4 text-slate-500 font-mono text-xs">{formatDateFriendly(item.transaction_date)}</td>
                                                        <td className="p-4 text-slate-700 text-xs max-w-xs truncate" title={item.source}>{resolveSourceText(item.source)}</td>
                                                        <td className={`p-4 text-right font-mono font-bold ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td>
                                                        <td className="p-4 text-right flex justify-end gap-2">
                                                            {item.quantity < 0 && item.source && item.source.startsWith("Transfer to") && (
                                                                <button onClick={() => handleRetrieveStock(item)} className="text-xs bg-slate-100 hover:bg-[#FFC600] p-1 rounded" title="Retrieve Stock"><Undo2 className="w-4 h-4" /></button>
                                                            )}
                                                            <button onClick={() => handleDeleteItem('stock', item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </>
                                                )}
                                                {dbView === 'hcps' && (
                                                    <>
                                                        <td className="p-4 font-bold text-slate-700">{item.full_name}</td>
                                                        <td className="p-4 text-slate-500 text-xs">{item.specialty}</td>
                                                        <td className="p-4 text-slate-500 text-xs">{item.hospital}</td>
                                                        <td className="p-4 text-slate-500 text-xs">{getOwnerDetails(item.created_by).mrName}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => openEditModal('hcps', item)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteItem('hcps', item.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </>
                                                )}
                                                {dbView === 'locations' && (
                                                    <>
                                                        <td className="p-4 font-bold text-slate-700">{item.name}</td>
                                                        <td className="p-4"><span className="text-[10px] uppercase font-bold bg-slate-100 px-2 py-1 rounded">{item.type}</span></td>
                                                        <td className="p-4 text-right font-mono font-bold">{item.current_stock}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => openEditModal('locations', item)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteItem('locations', item.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </>
                                                )}
                                                {dbView === 'patients' && (
                                                    <>
                                                        <td className="p-4 font-bold text-slate-700">{item.full_name}</td>
                                                        <td className="p-4 font-mono text-xs text-slate-500">{item.national_id}</td>
                                                        <td className="p-4 font-mono text-xs text-slate-500">{item.phone_number}</td>
                                                        <td className="p-4 text-slate-500 text-xs">{getOwnerDetails(item.created_by).mrName}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => openEditModal('patients', item)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteItem('patients', item.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'admin' && isAdmin && (
                    <AdminPanel profiles={allProfiles} onUpdate={loadData} />
                )}
            </>
          )}
        </main>
        
        {/* Footer */}
        <footer className="bg-slate-900 text-slate-500 text-center p-6 text-xs border-t border-slate-800">
            <p className="font-bold text-slate-400 mb-1">SPIN &copy; {new Date().getFullYear()}</p>
            <p className="mb-2">Supply & Insulin Pen Network Management System</p>
            <p className="font-mono text-[10px] opacity-50">v{METADATA.version}</p>
        </footer>
      </div>
      )}
    </div>
  );
};
