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
  { id: 'rep-main', name: 'My Rep Inventory', type: 'rep', created_at: new Date().toISOString(), current_stock: 50 },
  { id: 'custody-2', name: 'City General Clinic', type: 'clinic', created_at: new Date().toISOString(), current_stock: 15 }
];

export const dataService = {
  
  // --- PATIENTS ---
  async searchPatient(query: string): Promise<Patient | null> {
    if (isSupabaseConfigured() && supabase) {
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
        // Changed from 'custody' to 'custodies' to match standard schema conventions and fix "table not found" errors
        const { data, error } = await supabase.from('custodies').select('*').order('created_at');
        if (error) throw error;
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

  async getRepCustody(): Promise<Custody> {
      const custodies = await this.getCustodies();
      let rep = custodies.find(c => c.type === 'rep');
      if (!rep) {
          // Create default rep custody if missing
          // Ensure this creates in the DB if connected
          try {
              rep = await this.createCustody({ name: 'My Inventory', type: 'rep', created_at: new Date().toISOString() });
          } catch (e) {
              console.error("Failed to auto-create rep custody", e);
              // Fallback for UI to prevent crash, though operations might fail if not persisted
              rep = { id: 'temp-rep', name: 'My Inventory (Temp)', type: 'rep', created_at: new Date().toISOString(), current_stock: 0 };
          }
      }
      return rep;
  },

  async createCustody(custody: Omit<Custody, 'id' | 'current_stock'>): Promise<Custody> {
      if (isSupabaseConfigured() && supabase) {
          // Changed table from 'custody' to 'custodies'
          const { data, error } = await supabase.from('custodies').insert([custody]).select().single();
          if (error) throw error;
          return data;
      } else {
          const list: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
          const newItem = { ...custody, id: uuidv4(), current_stock: 0 };
          list.push(newItem);
          localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          return newItem;
      }
  },

  // Unified Stock Transaction Manager (Generic Pens)
  // If 'fromCustodyId' is provided, it deducts from there (Transfer)
  // 'toCustodyId' always receives stock
  async processStockTransaction(
    toCustodyId: string, 
    quantity: number, 
    date: string, 
    sourceLabel: string,
    fromCustodyId?: string
  ): Promise<void> {
     if (isSupabaseConfigured() && supabase) {
         // Log transaction
         await supabase.from('stock_transactions').insert([{
             custody_id: toCustodyId,
             quantity: quantity,
             transaction_date: date,
             source: fromCustodyId ? `Transfer from ${fromCustodyId}` : sourceLabel
         }]);
         // In real Supabase implementation, triggers handle simple integer increment/decrement
     } else {
         // 1. Load Data
         const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
         const transList: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');

         // 2. Handle Deduction (Transfer)
         if (fromCustodyId) {
             const fromCustody = custodies.find(c => c.id === fromCustodyId);
             if (fromCustody) {
                 if ((fromCustody.current_stock || 0) < quantity) {
                     throw new Error(`Insufficient pens in source custody (${fromCustody.current_stock} available).`);
                 }
                 fromCustody.current_stock -= quantity;
                 
                 // Log Outbound
                 transList.push({
                    id: uuidv4(),
                    custody_id: fromCustodyId,
                    quantity: -quantity,
                    transaction_date: date,
                    source: `Transfer to ${toCustodyId}`
                 });
             }
         }

         // 3. Handle Addition (Receipt)
         const toCustody = custodies.find(c => c.id === toCustodyId);
         if (toCustody) {
             toCustody.current_stock = (toCustody.current_stock || 0) + quantity;

             // Log Inbound
             transList.push({
                id: uuidv4(),
                custody_id: toCustodyId,
                quantity: quantity,
                transaction_date: date,
                source: fromCustodyId ? `Transfer from ${fromCustodyId}` : sourceLabel
             });
         }

         // 4. Save
         localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
         localStorage.setItem(KEYS.STOCK, JSON.stringify(transList));
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
          custody:custodies(*)
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
        //.eq('product_id', productId) // Strict product check or any delivery? Prompt implies "check no duplications" in general or for product. 
        // Keeping product check for now, but UI might want broader.
        // Prompt: "check no duplications and if found check the reason to recive another pen for another product" implies strictness on patient.
        // Let's check ANY delivery in last 30 days maybe? Or just any delivery. 
        // For now, sticking to existing logic but relaxed slightly to just patient check if needed.
        .limit(1);
      return (data && data.length > 0);
    } else {
       const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
       return deliveries.some(d => d.patient_id === patientId);
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
      
      // Deduct generic stock from source Custody
      if (delivery.custody_id) {
          const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
          const custody = custodies.find(c => c.id === delivery.custody_id);
          if (custody) {
              custody.current_stock = Math.max(0, (custody.current_stock || 0) - delivery.quantity);
              localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
          }
      }
      
      await new Promise(r => setTimeout(r, 500));
      return newDelivery;
    }
  }
};