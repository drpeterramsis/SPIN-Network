import React, { useState, useEffect, useCallback } from 'react';
import { Auth } from './components/Auth';
import { dataService } from './services/dataService';
import { formatDateFriendly, getTodayString } from './utils/time';
import { Delivery, Patient, HCP, Custody, PRODUCTS } from './types';
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
  History,
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
  X
} from 'lucide-react';
import { AIReportModal } from './components/AIReportModal';
import { ProfileModal } from './components/ProfileModal';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// Defined locally to avoid JSON module import issues in browser environments
const METADATA = {
  name: "SPIN v2.0.006",
  version: "2.0.006"
};

type Tab = 'dashboard' | 'deliver' | 'custody' | 'history';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Data States
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [repCustody, setRepCustody] = useState<Custody | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Delivery Form States
  const [step, setStep] = useState(1);
  const [nidSearch, setNidSearch] = useState('');
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

  // HCP Creation State
  const [showHCPModal, setShowHCPModal] = useState(false);
  const [newHCP, setNewHCP] = useState({ full_name: '', specialty: '', hospital: '' });

  // Custody Actions Forms
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [newClinicForm, setNewClinicForm] = useState({ name: '', date: getTodayString() });

  // Stock Forms
  const [receiveForm, setReceiveForm] = useState({ quantity: 0, educatorName: '' });
  const [transferForm, setTransferForm] = useState({ 
      toCustodyId: '', 
      quantity: 0, 
      date: getTodayString(),
      sourceType: 'rep' as 'educator' | 'rep',
      educatorName: ''
  });

  // Initialization
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

  // Load Data & Profile
  const loadData = useCallback(async () => {
    if (!user) return; // Don't fetch data if not logged in
    try {
      const [d, h, c, repC] = await Promise.all([
        dataService.getDeliveries(),
        dataService.getHCPs(),
        dataService.getCustodies(),
        dataService.getRepCustody()
      ]);
      setDeliveries(d);
      setHcps(h);
      setCustodies(c);
      setRepCustody(repC);
    } catch (error) {
      console.error("Load error", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        loadData();

        // Fetch Profile & Validate Access on App Start/Login
        const fetchProfile = async () => {
            if (isSupabaseConfigured() && supabase) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (data) {
                    // Security Check: Re-validate access on app load
                    if (data.access !== 'yes') {
                        console.warn("Access revoked. Logging out.");
                        await supabase.auth.signOut();
                        setUser(null);
                        setUserProfile(null);
                    } else {
                        setUserProfile(data);
                    }
                }
            } else {
                // Demo Mode
                setUserProfile({ full_name: 'Demo User', access: 'yes' });
            }
        };
        fetchProfile();
    } else {
        // Clear sensitive data on logout
        setDeliveries([]);
        setHcps([]);
        setCustodies([]);
        setUserProfile(null);
    }
  }, [user, loadData]);

  // Form Logic
  const handlePatientSearch = async () => {
    if (nidSearch.length < 3) return;
    const p = await dataService.searchPatient(nidSearch);
    setFoundPatient(p);
    if (p) {
      // Check for duplicates immediately (Any previous delivery)
      const isDup = await dataService.checkDuplicateDelivery(p.id, selectedProduct);
      setDuplicateWarning(isDup);
    } else {
      setDuplicateWarning(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatientForm.full_name || !nidSearch) return;
    const newP = await dataService.createPatient({
      national_id: nidSearch,
      full_name: newPatientForm.full_name,
      phone_number: newPatientForm.phone_number
    });
    setFoundPatient(newP);
  };

  const handleCreateHCP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHCP.full_name || !newHCP.hospital) return;
    
    try {
        const created = await dataService.createHCP(newHCP);
        setHcps([...hcps, created]);
        setSelectedHCP(created.id); // Auto select
        setShowHCPModal(false);
        setNewHCP({ full_name: '', specialty: '', hospital: '' });
        alert("Doctor registered successfully!");
    } catch (error) {
        console.error(error);
        alert("Failed to register doctor.");
    }
  };

  const handleSubmitDelivery = async () => {
    if (!foundPatient || !selectedHCP || !selectedProduct || !selectedCustody || !educatorName) {
      alert("Please fill in all required fields including Reported Educator");
      return;
    }
    
    try {
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
        custody_id: selectedCustody
      });
      
      // Reset
      alert("Delivery Logged Successfully");
      setStep(1);
      setNidSearch('');
      setFoundPatient(null);
      setNewPatientForm({ full_name: '', phone_number: '' });
      setRxDate('');
      setEducatorDate('');
      setEducatorName('');
      loadData();
      setActiveTab('history');
    } catch (e) {
      alert("Failed to log delivery");
    }
  };

  // Custody Actions
  const handleReceiveStock = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repCustody) {
          alert("Rep Custody not initialized.");
          return;
      }
      const { quantity, educatorName } = receiveForm;
      if (!quantity) {
          alert("Please enter quantity.");
          return;
      }

      try {
          await dataService.processStockTransaction(
              repCustody.id,
              Number(quantity),
              getTodayString(),
              `Educator: ${educatorName || 'Unknown'}`
          );
          alert("Stock received successfully into My Inventory.");
          setReceiveForm({ quantity: 0, educatorName: '' });
          loadData();
      } catch (err: any) {
          alert("Error: " + err.message);
      }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const { toCustodyId, quantity, date, sourceType, educatorName } = transferForm;
    if (!toCustodyId || !quantity) {
        alert("Please select a destination and quantity.");
        return;
    }

    try {
        let fromCustodyId = undefined;
        let sourceLabel = `Educator: ${educatorName || 'Unknown'}`;

        if (sourceType === 'rep') {
            if (!repCustody) throw new Error("Rep custody not found");
            fromCustodyId = repCustody.id;
            sourceLabel = 'Medical Rep Transfer';
        }

        await dataService.processStockTransaction(toCustodyId, Number(quantity), date, sourceLabel, fromCustodyId);
        alert("Stock updated successfully");
        setTransferForm({ ...transferForm, quantity: 0, educatorName: '' });
        loadData();
    } catch (err: any) {
        alert("Error: " + err.message);
    }
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicForm.name) return;
    try {
        const created = await dataService.createCustody({
            name: newClinicForm.name,
            type: 'clinic',
            created_at: newClinicForm.date
        });
        alert("Clinic Custody Registered");
        setNewClinicForm({ ...newClinicForm, name: '' });
        setShowClinicModal(false);
        
        // Update list and select the new one
        const updatedCustodies = await dataService.getCustodies();
        setCustodies(updatedCustodies);
        setTransferForm(prev => ({ ...prev, toCustodyId: created.id }));
    } catch (err: any) {
        alert("Failed to add clinic: " + err.message);
    }
  };

  // Component for Locked State
  const LockedState = ({ title, description }: { title: string, description: string }) => (
    <div className="bg-white border-t-4 border-slate-200 shadow-sm p-12 text-center">
        <div className="bg-slate-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">{description}</p>
        <button 
            onClick={() => setShowLoginModal(true)}
            className="bg-[#FFC600] hover:bg-yellow-400 text-black px-8 py-3 font-bold uppercase tracking-wide shadow-lg transition-colors"
        >
            Login to Access
        </button>
    </div>
  );

  const getProductName = (id: string) => PRODUCTS.find(p => p.id === id)?.name || id;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFC600]"><Activity className="animate-spin w-10 h-10" /></div>;

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      
      <Auth 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={setUser} 
      />

      {user && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onLogout={() => {
            setUser(null);
            setShowProfileModal(false);
          }}
        />
      )}

      {/* NEW HCP MODAL */}
      {showHCPModal && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
            onClick={() => setShowHCPModal(false)}
        >
            <div 
                className="bg-white w-full max-w-md border-t-4 border-[#FFC600] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-black p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Stethoscope className="w-5 h-5 text-[#FFC600]" />
                        <h3 className="text-white font-bold">Register New Doctor</h3>
                     </div>
                     <button onClick={() => setShowHCPModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreateHCP} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name</label>
                        <input 
                            required
                            type="text" 
                            placeholder="Dr. Name"
                            className="w-full border p-2 bg-slate-50 focus:border-[#FFC600] outline-none"
                            value={newHCP.full_name}
                            onChange={e => setNewHCP({...newHCP, full_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialty</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Endocrinology"
                            className="w-full border p-2 bg-slate-50 focus:border-[#FFC600] outline-none"
                            value={newHCP.specialty}
                            onChange={e => setNewHCP({...newHCP, specialty: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hospital / Clinic</label>
                        <input 
                            required
                            type="text" 
                            placeholder="Hospital Name"
                            className="w-full border p-2 bg-slate-50 focus:border-[#FFC600] outline-none"
                            value={newHCP.hospital}
                            onChange={e => setNewHCP({...newHCP, hospital: e.target.value})}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide"
                    >
                        Add to Directory
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* NEW CLINIC MODAL */}
      {showClinicModal && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
            onClick={() => setShowClinicModal(false)}
        >
            <div 
                className="bg-white w-full max-w-md border-t-4 border-[#FFC600] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-black p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-[#FFC600]" />
                        <h3 className="text-white font-bold">Add Clinic / Location</h3>
                     </div>
                     <button onClick={() => setShowClinicModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddClinic} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location Name</label>
                        <input 
                            required
                            type="text" 
                            placeholder="Pharmacy or Clinic Name"
                            className="w-full border p-2 bg-slate-50 focus:border-[#FFC600] outline-none"
                            value={newClinicForm.name}
                            onChange={e => setNewClinicForm({...newClinicForm, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration Date</label>
                        <input 
                            type="date" 
                            className="w-full border p-2 bg-slate-50 focus:border-[#FFC600] outline-none"
                            value={newClinicForm.date}
                            onChange={e => setNewClinicForm({...newClinicForm, date: e.target.value})}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 uppercase tracking-wide"
                    >
                        Register Location
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* NAVBAR */}
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
                    <button 
                      onClick={() => setShowProfileModal(true)}
                      className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-[#FFC600] transition-colors"
                    >
                        <UserCircle className="w-4 h-4" />
                        {userProfile?.full_name || user.email}
                    </button>
                    <button onClick={() => setShowAIModal(true)} className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded transition-colors border border-slate-700 text-[#FFC600]">
                        <Sparkles className="w-3 h-3" /> Intelligence
                    </button>
                    <div className="h-8 w-px bg-slate-800 mx-1"></div>
                    <button onClick={async () => { await supabase?.auth.signOut(); setUser(null); }} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2" title="Logout">
                        <LogOut className="w-5 h-5" />
                    </button>
                  </>
              ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 bg-[#FFC600] hover:bg-yellow-400 text-black px-4 py-2 font-bold uppercase text-xs tracking-wider transition-colors"
                  >
                    <LogIn className="w-4 h-4" /> Staff Login
                  </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full">
          
          {/* TABS */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'deliver', label: 'Deliver Pen', icon: Syringe },
              { id: 'custody', label: 'Custody', icon: Building2 },
              { id: 'history', label: 'History', icon: History },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                  activeTab === t.id 
                    ? 'bg-black text-[#FFC600] shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
                {!user && t.id !== 'dashboard' && <Lock className="w-3 h-3 ml-1 opacity-50" />}
              </button>
            ))}
          </div>

          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {!user ? (
                  // PUBLIC WELCOME VIEW
                  <div className="space-y-8">
                      <div className="bg-white border-l-8 border-[#FFC600] p-8 shadow-lg">
                          <h2 className="text-4xl font-black text-slate-900 mb-4">Welcome to SPIN</h2>
                          <p className="text-lg text-slate-600 max-w-3xl">
                              The <strong>Supply Insulin Pen Network</strong> is an advanced tracking and verification system designed to ensure the secure, efficient, and traceable distribution of insulin pens to patients.
                          </p>
                      </div>
                      {/* ... public cards ... */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900">
                              <ShieldCheck className="w-12 h-12 text-[#FFC600] mb-4" />
                              <h3 className="font-bold text-lg mb-2">Secure Validation</h3>
                              <p className="text-slate-500 text-sm">Every transaction is verified against patient ID to prevent duplication and fraud.</p>
                          </div>
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900">
                              <BarChart3 className="w-12 h-12 text-[#FFC600] mb-4" />
                              <h3 className="font-bold text-lg mb-2">Real-time Tracking</h3>
                              <p className="text-slate-500 text-sm">Monitor stock levels and distribution flow across all healthcare providers instantly.</p>
                          </div>
                          <div className="bg-white p-6 shadow-sm border-t-4 border-slate-900">
                              <Users className="w-12 h-12 text-[#FFC600] mb-4" />
                              <h3 className="font-bold text-lg mb-2">Patient Centric</h3>
                              <p className="text-slate-500 text-sm">Ensuring the right patient gets the right treatment at the right time.</p>
                          </div>
                      </div>

                      <div className="text-center pt-10">
                          <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-4">Authorized access only</p>
                          <button 
                              onClick={() => setShowLoginModal(true)}
                              className="bg-black text-white hover:bg-slate-800 px-8 py-4 font-bold uppercase tracking-wide shadow-lg transition-all"
                          >
                              Access Dashboard
                          </button>
                      </div>
                  </div>
              ) : (
                  // PRIVATE DASHBOARD VIEW
                  <>
                      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <h1 className="text-2xl font-bold text-slate-900">
                              Welcome back, {userProfile?.full_name || user.email?.split('@')[0]}
                          </h1>
                          <p className="text-slate-500 text-sm">
                              Here is your daily distribution overview.
                          </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Card 1 */}
                      <div className="bg-white p-6 shadow-sm border-l-4 border-[#FFC600] flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500">
                          <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Delivered</p>
                          <h3 className="text-3xl font-black text-slate-900">{deliveries.length}</h3>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-full">
                          <Package className="w-6 h-6 text-[#FFC600]" />
                          </div>
                      </div>
                      {/* Card 2 */}
                      <div className="bg-white p-6 shadow-sm border-l-4 border-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-75">
                          <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Patients Reached</p>
                          <h3 className="text-3xl font-black text-slate-900">{new Set(deliveries.map(d => d.patient_id)).size}</h3>
                          </div>
                          <div className="bg-slate-100 p-3 rounded-full">
                          <Users className="w-6 h-6 text-slate-900" />
                          </div>
                      </div>
                      {/* Card 3 */}
                      <div className="bg-white p-6 shadow-sm border-l-4 border-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 delay-150">
                          <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Custodies</p>
                          <h3 className="text-3xl font-black text-slate-900">{custodies.length}</h3>
                          </div>
                          <div className="bg-slate-100 p-3 rounded-full">
                          <Building2 className="w-6 h-6 text-slate-900" />
                          </div>
                      </div>
                      </div>
                  </>
              )}
            </div>
          )}

          {/* CUSTODY TAB */}
          {activeTab === 'custody' && (
             !user ? (
                 <LockedState title="Inventory Locked" description="Authorized personnel only." />
             ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    
                    {/* TOP SECTION: MY REP STOCK */}
                    <div className="bg-white shadow-sm border-t-4 border-[#FFC600]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Briefcase className="w-6 h-6 text-[#FFC600]" /> My Inventory
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Medical Rep Stock (You)</p>
                            </div>
                            <div className="text-right">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {repCustody?.current_stock || 0}
                                </span>
                                <span className="text-xs text-slate-500 block uppercase font-bold mt-1">Pens Available</span>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1">
                                <h3 className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-[#FFC600]" /> Receive Pens</h3>
                                <p className="text-xs text-slate-400">Add stock received from Patient Educator.</p>
                            </div>
                            <form 
                                onSubmit={handleReceiveStock} 
                                className="flex flex-wrap gap-3 items-end w-full md:w-auto"
                            >
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Educator</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Educator Name"
                                        className="bg-slate-800 border border-slate-700 text-white text-sm p-2 rounded w-40"
                                        value={receiveForm.educatorName}
                                        onChange={e => setReceiveForm({...receiveForm, educatorName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qty Pens</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="bg-slate-800 border border-slate-700 text-white text-sm p-2 rounded w-20"
                                        placeholder="0"
                                        value={receiveForm.quantity}
                                        onChange={e => setReceiveForm({...receiveForm, quantity: Number(e.target.value)})}
                                    />
                                </div>
                                <button type="submit" className="bg-[#FFC600] text-black font-bold uppercase text-xs px-4 py-2.5 rounded hover:bg-yellow-400">
                                    Add to Stock
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* SECOND SECTION: CLINIC NETWORK & TRANSFERS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left: Clinic List */}
                        <div className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Store className="w-5 h-5" /> Clinic / Pharmacy Network</h3>
                                <span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded text-slate-600">{custodies.filter(c => c.type === 'clinic').length} Locations</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {custodies.filter(c => c.type === 'clinic').map(clinic => (
                                    <div key={clinic.id} className="p-5 hover:bg-slate-50 transition-colors group flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{clinic.name}</h4>
                                            <p className="text-xs text-slate-400">Registered: {formatDateFriendly(clinic.created_at)}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                             <div className="text-right">
                                                <span className="block text-2xl font-black text-slate-900">{clinic.current_stock || 0}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">Pens</span>
                                             </div>

                                            <button 
                                                onClick={() => {
                                                    setTransferForm(prev => ({...prev, toCustodyId: clinic.id, educatorName: ''}));
                                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-3 py-2 text-xs font-bold uppercase rounded flex items-center gap-1"
                                            >
                                                Supply <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {custodies.filter(c => c.type === 'clinic').length === 0 && (
                                    <div className="p-8 text-center text-slate-400 italic">No clinics registered yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="space-y-6">
                            
                            {/* Register Clinic (Inline removed, moved to modal via Supply form) */}
                            {/* Keeping Inline for existing user familiarity? No, prompt asked for direct add from list. I'll focus on the supply form. */}
                            <div className="bg-white shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2"><Plus className="w-4 h-4" /> New Location</h3>
                                </div>
                                <form onSubmit={handleAddClinic} className="space-y-4">
                                    <input 
                                        type="text"
                                        className="w-full border p-2 bg-slate-50 text-sm font-bold"
                                        placeholder="Clinic / Pharmacy Name"
                                        value={newClinicForm.name}
                                        onChange={e => setNewClinicForm({...newClinicForm, name: e.target.value})}
                                        required
                                    />
                                    <div className="flex gap-2">
                                        <input 
                                            type="date" 
                                            className="w-full border p-2 bg-slate-50 text-sm"
                                            value={newClinicForm.date}
                                            onChange={e => setNewClinicForm({...newClinicForm, date: e.target.value})}
                                        />
                                        <button type="submit" className="bg-black text-white px-4 font-bold uppercase text-xs">Add</button>
                                    </div>
                                </form>
                            </div>

                            {/* Transfer / Supply Stock */}
                            <div className="bg-white shadow-sm border-l-4 border-blue-500 p-6">
                                <h3 className="text-sm font-bold mb-4 uppercase text-blue-900 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Supply Clinic</h3>
                                <form onSubmit={handleTransferStock} className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-end mb-1">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Destination</label>
                                            <button 
                                                type="button"
                                                onClick={() => setShowClinicModal(true)}
                                                className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> New
                                            </button>
                                        </div>
                                        <select 
                                            className="w-full border p-2 bg-slate-50 text-sm"
                                            value={transferForm.toCustodyId}
                                            onChange={e => setTransferForm({...transferForm, toCustodyId: e.target.value})}
                                            required
                                        >
                                            <option value="">-- Select Clinic --</option>
                                            {custodies.filter(c => c.type === 'clinic').map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity (Pens)</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-full border p-2 bg-slate-50 text-sm font-bold"
                                            value={transferForm.quantity}
                                            onChange={e => setTransferForm({...transferForm, quantity: Number(e.target.value)})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source of Stock</label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="sourceType" 
                                                    checked={transferForm.sourceType === 'rep'}
                                                    onChange={() => setTransferForm({...transferForm, sourceType: 'rep', educatorName: ''})}
                                                />
                                                <span className="text-xs font-bold">My Inventory (Rep)</span>
                                                <span className="text-[10px] text-red-500 ml-auto font-bold">- Deduct</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 font-bold uppercase text-xs hover:bg-blue-700">
                                        Confirm Transfer
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
             )
          )}

          {/* DELIVERY WORKFLOW */}
          {activeTab === 'deliver' && (
            !user ? (
                <LockedState 
                  title="Delivery Module Locked" 
                  description="You must be a registered distributor or HCP to log new deliveries." 
                />
            ) : (
              <div className="bg-white shadow-lg border-t-4 border-[#FFC600] max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="bg-slate-900 text-white px-8 py-6">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                      <Syringe className="w-5 h-5 text-[#FFC600]" />
                      New Pen Delivery
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">Register a transaction and assign insulin product.</p>
                  </div>
                  
                  <div className="p-8">
                      {/* STEP 1: PATIENT */}
                      <div className={`transition-opacity ${step !== 1 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Step 1: Identify Patient</label>
                      <div className="flex gap-2 mb-4">
                          <input 
                              type="text" 
                              placeholder="Search by National ID or Phone" 
                              className="flex-1 border border-slate-300 p-3 bg-slate-50 font-mono focus:ring-2 focus:ring-[#FFC600] outline-none"
                              value={nidSearch}
                              onChange={(e) => setNidSearch(e.target.value)}
                          />
                          <button 
                              onClick={handlePatientSearch}
                              className="bg-black text-white px-6 font-bold uppercase text-xs"
                          >
                              Search
                          </button>
                      </div>

                      {foundPatient ? (
                          <div className="bg-green-50 border border-green-200 p-4 mb-6">
                              <div className="flex items-start gap-3">
                                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                  <div>
                                      <p className="font-bold text-green-800">Patient Found</p>
                                      <p className="text-sm text-green-700">{foundPatient.full_name}</p>
                                      <p className="text-xs text-green-600 font-mono">{foundPatient.national_id} | {foundPatient.phone_number}</p>
                                  </div>
                              </div>
                          </div>
                      ) : nidSearch.length > 3 && (
                          <div className="bg-slate-50 border border-slate-200 p-4 mb-6">
                              <p className="text-sm font-bold text-slate-700 mb-3">Patient not found. Register new?</p>
                              <div className="space-y-3">
                                  <input 
                                      type="text" 
                                      placeholder="Full Name" 
                                      className="w-full border border-slate-300 p-2 text-sm"
                                      value={newPatientForm.full_name}
                                      onChange={e => setNewPatientForm({...newPatientForm, full_name: e.target.value})}
                                  />
                                  <input 
                                      type="text" 
                                      placeholder="Phone Number" 
                                      className="w-full border border-slate-300 p-2 text-sm"
                                      value={newPatientForm.phone_number}
                                      onChange={e => setNewPatientForm({...newPatientForm, phone_number: e.target.value})}
                                  />
                                  <button onClick={handleCreatePatient} className="text-blue-600 text-sm font-bold underline">Save New Patient</button>
                              </div>
                          </div>
                      )}

                      {foundPatient && (
                          <>
                             {duplicateWarning && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                        <div>
                                            <p className="font-bold text-red-800 uppercase text-xs">Duplication Alert</p>
                                            <p className="text-sm text-red-700 mb-1">This patient has already received a pen recently.</p>
                                            <p className="text-xs text-red-600">Please verify: Is this a replacement? Or a different product assignment?</p>
                                        </div>
                                    </div>
                                </div>
                             )}
                             <button 
                                onClick={() => setStep(2)} 
                                className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide"
                             >
                                Next: Delivery Details
                             </button>
                          </>
                      )}
                      </div>

                      {/* STEP 2: DETAILS */}
                      <div className={`transition-opacity ${step !== 2 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                      <div className="flex justify-between items-center mb-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Step 2: Transaction Details</label>
                          <button onClick={() => setStep(1)} className="text-xs text-slate-400 underline">Back</button>
                      </div>

                      <div className="space-y-6">
                          {/* Row 1 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1">Delivery Date</label>
                                    <input 
                                        type="date"
                                        required
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={deliveryDate}
                                        onChange={e => setDeliveryDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1">From Custody (Source)</label>
                                    <select 
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={selectedCustody}
                                        onChange={e => setSelectedCustody(e.target.value)}
                                    >
                                        <option value="">-- Select Source --</option>
                                        {custodies.filter(c => c.type === 'rep').map(c => (
                                            <option key={c.id} value={c.id}>My Inventory (Rep)</option>
                                        ))}
                                        <option disabled>──────────</option>
                                        {custodies.filter(c => c.type === 'clinic').map(c => (
                                            <option key={c.id} value={c.id}>{c.name} (Clinic)</option>
                                        ))}
                                    </select>
                                </div>
                          </div>
                          
                          {/* Row 2 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="block text-sm font-bold text-slate-800">Prescribing Doctor (Rx)</label>
                                        <button 
                                            onClick={() => setShowHCPModal(true)}
                                            className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> New
                                        </button>
                                    </div>
                                    <select 
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={selectedHCP}
                                        onChange={e => setSelectedHCP(e.target.value)}
                                    >
                                        <option value="">-- Select Doctor --</option>
                                        {hcps.map(h => (
                                            <option key={h.id} value={h.id}>{h.full_name} - {h.hospital}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1">Rx Date</label>
                                    <input 
                                        type="date"
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={rxDate}
                                        onChange={e => setRxDate(e.target.value)}
                                    />
                                </div>
                          </div>

                           {/* Row 3: Educator Info */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1">Reported Educator Name</label>
                                    <input 
                                        type="text"
                                        placeholder="Name"
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={educatorName}
                                        onChange={e => setEducatorName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-1">Data Submission Date</label>
                                    <input 
                                        type="date"
                                        className="w-full border border-slate-300 p-3 bg-white focus:border-[#FFC600] outline-none"
                                        value={educatorDate}
                                        onChange={e => setEducatorDate(e.target.value)}
                                    />
                                </div>
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-800 mb-2">Assign Insulin Product</label>
                              <div className="grid grid-cols-1 gap-2">
                                  {PRODUCTS.map(p => (
                                      <button
                                          key={p.id}
                                          onClick={() => setSelectedProduct(p.id)}
                                          className={`p-3 text-left border-2 transition-all ${selectedProduct === p.id ? 'border-[#FFC600] bg-yellow-50' : 'border-slate-100 hover:border-slate-300'}`}
                                      >
                                          <div className="font-bold text-sm">{p.name}</div>
                                          <div className="text-xs text-slate-500 uppercase">{p.type}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <button 
                              onClick={handleSubmitDelivery} 
                              className={`w-full py-4 font-bold uppercase tracking-wide shadow-lg transition-all ${duplicateWarning ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black text-[#FFC600] hover:bg-slate-800'}`}
                          >
                              {duplicateWarning ? 'Confirm Duplicate Entry' : 'Confirm Delivery'}
                          </button>
                      </div>
                      </div>
                  </div>
              </div>
            )
          )}

          {/* HISTORY VIEW */}
          {activeTab === 'history' && (
            !user ? (
              <LockedState 
                  title="Distribution History Locked" 
                  description="Full delivery logs are strictly confidential and available only to authorized admin." 
                />
            ) : (
              <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500 overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Date</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Patient</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Product Assigned</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Prescriber</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Educator</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Source</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {deliveries.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm text-slate-600">
                              {formatDateFriendly(d.delivery_date)}
                          </td>
                          <td className="px-6 py-4">
                              <div className="font-bold text-slate-800">{d.patient?.full_name}</div>
                              <div className="text-xs text-slate-400 font-mono">{d.patient?.national_id}</div>
                          </td>
                          <td className="px-6 py-4">
                              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100">
                                  {getProductName(d.product_id)}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                              {d.hcp?.full_name}
                              {d.rx_date && <div className="text-[10px] text-slate-400">Rx: {formatDateFriendly(d.rx_date)}</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                              {d.educator_name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{d.custody?.name || '-'}</td>
                      </tr>
                      ))}
                  </tbody>
                  </table>
                  {deliveries.length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
              </div>
            )
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs">
            <p>SPIN - Supply Insulin Pen Network &copy; 2025 | Version {METADATA.version}</p>
        </div>
      </footer>

      {user && (
        <AIReportModal 
            isOpen={showAIModal} 
            onClose={() => setShowAIModal(false)} 
            deliveries={deliveries} 
            userEmail={user.email} 
        />
      )}
    </div>
  );
};

export default App;