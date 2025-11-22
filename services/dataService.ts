import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Patient, HCP, Delivery, Custody, StockTransaction, PRODUCTS } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const KEYS = {
  PATIENTS: 'spin_patients',
  HCPS: 'spin_hcps',
  DELIVERIES: 'spin_deliveries',
  CUSTODY: 'spin_custody',
  STOCK: 'spin_stock_transactions'
};

// Mock Data for Demo Mode
const MOCK_HCPS: HCP[] = [
  { id: 'hcp-1', full_name: 'Dr. Sarah Connor', specialty: 'Endocrinology', hospital: 'City General' },
  { id: 'hcp-2', full_name: 'Dr. John Smith', specialty: 'Internal Medicine', hospital: 'Mercy Hospital' },
];

const MOCK_CUSTODY: Custody[] = [
  { id: 'custody-1', name: 'Main Rep Stock', type: 'rep', created_at: new Date().toISOString(), stock: { 'glargivin-100': 50, 'humaxin-r': 30 } },
  { id: 'custody-2', name: 'City General Clinic', type: 'clinic', created_at: new Date().toISOString(), stock: { 'glargivin-100': 10 } }
];

export const dataService = {
  
  // --- PATIENTS ---
  async searchPatient(query: string): Promise<Patient | null> {
    if (isSupabaseConfigured() && supabase) {
      // Search by National ID OR Phone Number
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`national_id.eq.${query},phone_number.eq.${query}`)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } else {
      const patients: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      return patients.find(p => p.national_id === query || p.phone_number === query) || null;
    }
  },

  async getPatientByNationalID(nid: string): Promise<Patient | null> {
    return this.searchPatient(nid);
  },

  async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('patients').insert([patient]).select().single();
      if (error) throw error;
      return data;
    } else {
      const patients: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      const newPatient = { ...patient, id: uuidv4(), created_at: new Date().toISOString() };
      patients.push(newPatient);
      localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
      return newPatient;
    }
  },

  // --- HCPs ---
  async getHCPs(): Promise<HCP[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('hcps').select('*').order('full_name');
      if (error) throw error;
      return data;
    } else {
      const stored = localStorage.getItem(KEYS.HCPS);
      if (!stored) {
        localStorage.setItem(KEYS.HCPS, JSON.stringify(MOCK_HCPS));
        return MOCK_HCPS;
      }
      return JSON.parse(stored);
    }
  },

  async createHCP(hcp: Omit<HCP, 'id'>): Promise<HCP> {
    if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.from('hcps').insert([hcp]).select().single();
        if (error) throw error;
        return data;
    } else {
        const hcps: HCP[] = JSON.parse(localStorage.getItem(KEYS.HCPS) || JSON.stringify(MOCK_HCPS));
        const newHCP = { ...hcp, id: uuidv4() };
        hcps.push(newHCP);
        localStorage.setItem(KEYS.HCPS, JSON.stringify(hcps));
        return newHCP;
    }
  },

  // --- CUSTODY & STOCK ---
  async getCustodies(): Promise<Custody[]> {
    if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.from('custody').select('*');
        if (error) throw error;
        // For Supabase, we'd need to aggregate stock from transactions or a separate table
        // Currently returning simplified structure
        return data;
    } else {
        const stored = localStorage.getItem(KEYS.CUSTODY);
        if (!stored) {
            localStorage.setItem(KEYS.CUSTODY, JSON.stringify(MOCK_CUSTODY));
            return MOCK_CUSTODY;
        }
        return JSON.parse(stored);
    }
  },

  async createCustody(custody: Omit<Custody, 'id' | 'stock'>): Promise<Custody> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('custody').insert([custody]).select().single();
          if (error) throw error;
          return data;
      } else {
          const list: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
          const newItem = { ...custody, id: uuidv4(), stock: {} };
          list.push(newItem);
          localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          return newItem;
      }
  },

  async addStock(transaction: Omit<StockTransaction, 'id'>): Promise<void> {
     if (isSupabaseConfigured() && supabase) {
         await supabase.from('stock_transactions').insert([transaction]);
         // Trigger or function would update aggregates in real DB
     } else {
         // Update Local Storage Transaction Log
         const transList: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
         transList.push({ ...transaction, id: uuidv4() });
         localStorage.setItem(KEYS.STOCK, JSON.stringify(transList));

         // Update Aggregated Stock in Custody Object (Mock Logic)
         const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
         const custody = custodies.find(c => c.id === transaction.custody_id);
         if (custody) {
             if (!custody.stock) custody.stock = {};
             const current = custody.stock[transaction.product_id] || 0;
             custody.stock[transaction.product_id] = current + transaction.quantity;
             localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
         }
     }
  },

  // --- DELIVERIES ---
  async getDeliveries(): Promise<Delivery[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          patient:patients(*),
          hcp:hcps(*),
          custody:custody(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
      const patients: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      const hcps: HCP[] = JSON.parse(localStorage.getItem(KEYS.HCPS) || JSON.stringify(MOCK_HCPS));
      const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));

      // Hydrate relations
      return deliveries.map(d => ({
        ...d,
        patient: patients.find(p => p.id === d.patient_id),
        hcp: hcps.find(h => h.id === d.hcp_id),
        custody: custodies.find(c => c.id === d.custody_id)
      })).sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    }
  },

  async checkDuplicateDelivery(patientId: string, productId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase
        .from('deliveries')
        .select('id')
        .eq('patient_id', patientId)
        .eq('product_id', productId)
        .limit(1);
      return (data && data.length > 0);
    } else {
       const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
       // Check last 30 days typically, but for now ANY record
       return deliveries.some(d => d.patient_id === patientId && d.product_id === productId);
    }
  },

  async logDelivery(delivery: Omit<Delivery, 'id'>): Promise<Delivery> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('deliveries').insert([delivery]).select().single();
      if (error) throw error;
      return data;
    } else {
      const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
      const newDelivery = { ...delivery, id: uuidv4(), created_at: new Date().toISOString() };
      deliveries.unshift(newDelivery);
      localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
      
      // Deduct stock in mock mode
      if (delivery.custody_id) {
          const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
          const custody = custodies.find(c => c.id === delivery.custody_id);
          if (custody && custody.stock) {
              const current = custody.stock[delivery.product_id] || 0;
              custody.stock[delivery.product_id] = Math.max(0, current - delivery.quantity);
              localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
          }
      }
      
      await new Promise(r => setTimeout(r, 500));
      return newDelivery;
    }
  }
};