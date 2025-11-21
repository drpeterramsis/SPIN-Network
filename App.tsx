import React, { useState, useEffect, useCallback } from 'react';
import { Auth } from './components/Auth';
import { dataService } from './services/dataService';
import { formatDateFriendly, getTodayString } from './utils/time';
import { Delivery, Patient, HCP, PRODUCTS } from './types';
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
  BarChart3
} from 'lucide-react';
import { AIReportModal } from './components/AIReportModal';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// Defined locally to avoid JSON module import issues in browser environments
const METADATA = {
  name: "SPIN v1.0.5",
  version: "1.0.5"
};

type Tab = 'dashboard' | 'deliver' | 'history';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Data States
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);

  // Delivery Form States
  const [step, setStep] = useState(1);
  const [nidSearch, setNidSearch] = useState('');
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [newPatientForm, setNewPatientForm] = useState({ full_name: '', phone_number: '' });
  const [selectedHCP, setSelectedHCP] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0].id);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

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

  // Load Data
  const loadData = useCallback(async () => {
    if (!user) return; // Don't fetch data if not logged in
    try {
      const [d, h] = await Promise.all([
        dataService.getDeliveries(),
        dataService.getHCPs()
      ]);
      setDeliveries(d);
      setHcps(h);
    } catch (error) {
      console.error("Load error", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        loadData();
    } else {
        // Clear sensitive data on logout
        setDeliveries([]);
        setHcps([]);
    }
  }, [user, loadData]);

  // Form Logic
  const handlePatientSearch = async () => {
    if (nidSearch.length < 3) return;
    const p = await dataService.getPatientByNationalID(nidSearch);
    setFoundPatient(p);
    if (p) {
      // Check for duplicates immediately
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

  const handleSubmitDelivery = async () => {
    if (!foundPatient || !selectedHCP || !selectedProduct) return;
    
    try {
      await dataService.logDelivery({
        patient_id: foundPatient.id,
        hcp_id: selectedHCP,
        product_id: selectedProduct,
        delivered_by: user.id,
        delivery_date: getTodayString(),
        quantity: 1
      });
      
      // Reset
      alert("Delivery Logged Successfully");
      setStep(1);
      setNidSearch('');
      setFoundPatient(null);
      setNewPatientForm({ full_name: '', phone_number: '' });
      loadData();
      setActiveTab('history');
    } catch (e) {
      alert("Failed to log delivery");
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      <Auth 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={setUser} 
      />

      {/* NAVBAR */}
      <nav className="bg-black text-white sticky top-0 z-40 shadow-md border-b-4 border-[#FFC600]">
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
                    <span className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
                        {user.email}
                    </span>
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

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TABS */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 w-full md:w-auto inline-flex overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'deliver', label: 'Deliver Pen', icon: Syringe },
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
                    <div className="bg-gradient-to-br from-slate-800 to-black text-white p-6 shadow-lg relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150">
                        <div className="relative z-10">
                        <p className="text-xs font-bold text-[#FFC600] uppercase mb-1">Network Status</p>
                        <h3 className="text-xl font-bold">Online</h3>
                        <p className="text-xs text-slate-400 mt-2">Syncing with SPIN Cloud</p>
                        </div>
                        <Activity className="absolute right-0 bottom-0 w-24 h-24 text-white/5 transform translate-x-4 translate-y-4" />
                    </div>
                    </div>

                    {/* Recent Activity List */}
                    <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-700">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Recent Network Activity</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {deliveries.slice(0, 5).map(d => (
                        <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">
                                {d.patient?.full_name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{d.patient?.full_name}</p>
                                <p className="text-xs text-slate-500">{getProductName(d.product_id)}</p>
                            </div>
                            </div>
                            <div className="text-right">
                            <p className="text-xs font-bold text-slate-400">{formatDateFriendly(d.delivery_date)}</p>
                            <p className="text-xs text-slate-500">{d.hcp?.full_name}</p>
                            </div>
                        </div>
                        ))}
                        {deliveries.length === 0 && <div className="p-8 text-center text-slate-400">No activity recorded yet.</div>}
                    </div>
                    </div>
                </>
            )}
          </div>
        )}

        {/* DELIVERY WORKFLOW */}
        {activeTab === 'deliver' && (
          !user ? (
              <LockedState 
                title="Delivery Module Locked" 
                description="You must be a registered distributor or HCP to log new deliveries." 
              />
          ) : (
            <div className="bg-white shadow-lg border-t-4 border-[#FFC600] max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900 text-white px-8 py-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                    <Syringe className="w-5 h-5 text-[#FFC600]" />
                    New Pen Delivery
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Register a transaction in the SPIN network.</p>
                </div>
                
                <div className="p-8">
                    {/* STEP 1: PATIENT */}
                    <div className={`transition-opacity ${step !== 1 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Step 1: Identify Patient</label>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="Enter National ID" 
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
                                    <p className="text-xs text-green-600 font-mono">{foundPatient.national_id}</p>
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
                        <button 
                            onClick={() => setStep(2)} 
                            className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide"
                        >
                            Next: Select Product
                        </button>
                    )}
                    </div>

                    {/* STEP 2: DETAILS */}
                    <div className={`transition-opacity ${step !== 2 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
                    <div className="flex justify-between items-center mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Step 2: Delivery Details</label>
                        <button onClick={() => setStep(1)} className="text-xs text-slate-400 underline">Back</button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-2">Prescribing HCP</label>
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
                            <label className="block text-sm font-bold text-slate-800 mb-2">Insulin Product</label>
                            <div className="grid grid-cols-1 gap-2">
                                {PRODUCTS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedProduct(p.id);
                                            if (foundPatient) {
                                                dataService.checkDuplicateDelivery(foundPatient.id, p.id).then(setDuplicateWarning);
                                            }
                                        }}
                                        className={`p-3 text-left border-2 transition-all ${selectedProduct === p.id ? 'border-[#FFC600] bg-yellow-50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-sm">{p.name}</div>
                                        <div className="text-xs text-slate-500 uppercase">{p.type}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {duplicateWarning && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 animate-pulse">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-red-800 uppercase text-xs">Duplicate Warning</p>
                                        <p className="text-sm text-red-700">This patient has already received this product recently.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleSubmitDelivery} 
                            className={`w-full py-4 font-bold uppercase tracking-wide shadow-lg transition-all ${duplicateWarning ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black text-[#FFC600] hover:bg-slate-800'}`}
                        >
                            {duplicateWarning ? 'Override & Deliver' : 'Confirm Delivery'}
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
            <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in duration-500">
                <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Date</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Patient</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Product</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500">Prescriber</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase text-slate-500 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {deliveries.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{formatDateFriendly(d.delivery_date)}</td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{d.patient?.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{d.patient?.national_id}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100">
                                {getProductName(d.product_id)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{d.hcp?.full_name}</td>
                        <td className="px-6 py-4 text-right">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center justify-end gap-1">
                                <CheckCircle className="w-3 h-3" /> Delivered
                            </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
                {deliveries.length === 0 && <div className="p-10 text-center text-slate-400">No records found</div>}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
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