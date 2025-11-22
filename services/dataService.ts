import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Patient, HCP, Delivery, PRODUCTS } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const KEYS = {
  PATIENTS: 'spin_patients',
  HCPS: 'spin_hcps',
  DELIVERIES: 'spin_deliveries'
};

// Mock Data for Demo Mode
const MOCK_HCPS: HCP[] = [
  { id: 'hcp-1', full_name: 'Dr. Sarah Connor', specialty: 'Endocrinology', hospital: 'City General' },
  { id: 'hcp-2', full_name: 'Dr. John Smith', specialty: 'Internal Medicine', hospital: 'Mercy Hospital' },
];

export const dataService = {
  
  // --- PATIENTS ---
  async getPatientByNationalID(nid: string): Promise<Patient | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('national_id', nid)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // 116 is "Row not found"
      return data;
    } else {
      const patients: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      return patients.find(p => p.national_id === nid) || null;
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

  // --- DELIVERIES ---
  async getDeliveries(): Promise<Delivery[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          patient:patients(*),
          hcp:hcps(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
      const patients: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      const hcps: HCP[] = JSON.parse(localStorage.getItem(KEYS.HCPS) || JSON.stringify(MOCK_HCPS));

      // Hydrate relations
      return deliveries.map(d => ({
        ...d,
        patient: patients.find(p => p.id === d.patient_id),
        hcp: hcps.find(h => h.id === d.hcp_id)
      })).sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    }
  },

  async checkDuplicateDelivery(patientId: string, productId: string): Promise<boolean> {
    // Business Rule: Warn if patient received ANY pen in the last 30 days (simplified for now to ANY record)
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
      await new Promise(r => setTimeout(r, 500));
      return newDelivery;
    }
  }
};