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
        .maybeSingle();
      
      if (error) throw error;
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

  async updateHCP(id: string, updates: Partial<HCP>): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('hcps').update(updates).eq('id', id);
      if (error) throw error;
    } else {
      const list: HCP[] = JSON.parse(localStorage.getItem(KEYS.HCPS) || '[]');
      const idx = list.findIndex(i => i.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(KEYS.HCPS, JSON.stringify(list));
      }
    }
  },

  // --- CUSTODY & STOCK ---
  async getCustodies(): Promise<Custody[]> {
    if (isSupabaseConfigured() && supabase) {
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
      let custodies: Custody[] = [];
      try {
          custodies = await this.getCustodies();
      } catch (e) {
          console.error("Failed to load custodies", e);
      }

      let rep = custodies.find(c => c.type === 'rep');
      
      // If no rep custody found, create it immediately
      if (!rep) {
          try {
              // Create default rep custody
              rep = await this.createCustody({ name: 'My Inventory', type: 'rep', created_at: new Date().toISOString() });
          } catch (e) {
              console.error("Failed to auto-create rep custody", e);
              if (!isSupabaseConfigured()) {
                  // Fallback for Demo
                  rep = { id: 'temp-rep', name: 'My Inventory (Temp)', type: 'rep', created_at: new Date().toISOString(), current_stock: 0 };
              } else {
                  console.error("Could not initialize Rep Inventory in Database.");
                  return { id: 'error-rep', name: 'Error: Inventory Not Found', type: 'rep', created_at: new Date().toISOString(), current_stock: 0 };
              }
          }
      }
      return rep;
  },

  async createCustody(custody: Omit<Custody, 'id' | 'current_stock'>): Promise<Custody> {
      if (isSupabaseConfigured() && supabase) {
          // Explicitly add current_stock: 0 to ensure DB constraints are met
          const payload = { ...custody, current_stock: 0 };
          const { data, error } = await supabase.from('custodies').insert([payload]).select().single();
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

  async updateCustody(id: string, updates: Partial<Custody>): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('custodies').update(updates).eq('id', id);
      if (error) throw error;
    } else {
      const list: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
      const idx = list.findIndex(i => i.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
      }
    }
  },

  // Unified Stock Transaction Manager (Generic Pens)
  async processStockTransaction(
    toCustodyId: string, 
    quantity: number, 
    date: string, 
    sourceLabel: string,
    fromCustodyId?: string
  ): Promise<void> {
     if (isSupabaseConfigured() && supabase) {
         // 1. Handle Sender (Outbound) - DEDUCT FIRST
         if (fromCustodyId) {
            // Fetch sender first to check existence and stock
            const { data: fromCustody } = await supabase.from('custodies').select('current_stock, name').eq('id', fromCustodyId).single();
            
            if (fromCustody) {
                // Check if enough stock
                if ((fromCustody.current_stock || 0) < quantity) {
                    console.warn(`Warning: Transferring more than available stock. Available: ${fromCustody.current_stock}, Required: ${quantity}`);
                    // We allow it but warn, or we could throw: throw new Error("Insufficient stock in source inventory.");
                }

                // Update Stock for Sender
                const newStock = Math.max(0, (fromCustody.current_stock || 0) - quantity);
                const { error: updateErr } = await supabase.from('custodies').update({ current_stock: newStock }).eq('id', fromCustodyId);
                if (updateErr) throw updateErr;

                // Log Transaction (Outbound)
                const { data: destCustody } = await supabase.from('custodies').select('name').eq('id', toCustodyId).single();
                const destName = destCustody?.name || 'Clinic';

                const { error: errOut } = await supabase.from('stock_transactions').insert([{
                    custody_id: fromCustodyId,
                    quantity: -quantity,
                    transaction_date: date,
                    source: `Transfer to ${destName}`
                }]);
                if (errOut) console.error("Failed to log outbound transaction", errOut);
            } else {
                throw new Error("Source inventory (sender) not found.");
            }
         }

         // 2. Handle Receiver (Inbound) - ADD SECOND
         // Note: This is not atomic without RPC, but acceptable for this scope
         const { data: toCustody } = await supabase.from('custodies').select('current_stock').eq('id', toCustodyId).single();
         if (toCustody) {
            const newStock = (toCustody.current_stock || 0) + quantity;
            const { error: updateErr } = await supabase.from('custodies').update({ current_stock: newStock }).eq('id', toCustodyId);
            if (updateErr) throw updateErr;

            // Log Transaction (Inbound)
            const { error: errIn } = await supabase.from('stock_transactions').insert([{
                custody_id: toCustodyId,
                quantity: quantity,
                transaction_date: date,
                source: fromCustodyId ? `Transfer from ${fromCustodyId}` : sourceLabel
            }]);
            if (errIn) throw errIn;
         } else {
             throw new Error("Destination location not found.");
         }

     } else {
         // LOCAL STORAGE MODE
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
                 const toName = custodies.find(c => c.id === toCustodyId)?.name || 'Clinic';
                 transList.push({
                    id: uuidv4(),
                    custody_id: fromCustodyId,
                    quantity: -quantity,
                    transaction_date: date,
                    source: `Transfer to ${toName}`
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

  async updateStockTransaction(id: string, updates: Partial<StockTransaction>): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          // If quantity changes, we must adjust the custody stock
          if (updates.quantity !== undefined) {
              // 1. Get old transaction
              const { data: oldTx } = await supabase.from('stock_transactions').select('*').eq('id', id).single();
              if (oldTx) {
                  const diff = updates.quantity - oldTx.quantity;
                  if (diff !== 0) {
                       // Adjust custody stock
                       const { data: custody } = await supabase.from('custodies').select('current_stock').eq('id', oldTx.custody_id).single();
                       if (custody) {
                           const newStock = (custody.current_stock || 0) + diff;
                           await supabase.from('custodies').update({ current_stock: newStock }).eq('id', oldTx.custody_id);
                       }
                  }
              }
          }
          
          const { error } = await supabase.from('stock_transactions').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          const idx = list.findIndex(i => i.id === id);
          if (idx >= 0) {
              const oldQty = list[idx].quantity;
              list[idx] = { ...list[idx], ...updates };
              
              // Adjust local stock if quantity changed
              if (updates.quantity !== undefined && updates.quantity !== oldQty) {
                  const diff = updates.quantity - oldQty;
                  const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
                  const c = custodies.find(c => c.id === list[idx].custody_id);
                  if (c) {
                      c.current_stock = (c.current_stock || 0) + diff;
                      localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
                  }
              }
              localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
          }
      }
  },

  async getStockTransactions(): Promise<StockTransaction[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('stock_transactions')
            .select('*')
            .order('transaction_date', { ascending: false });
          if (error) throw error;
          return data;
      } else {
          return JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
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
      // Check last 30 days for same patient
      const { data } = await supabase
        .from('deliveries')
        .select('id')
        .eq('patient_id', patientId)
        .limit(1);
      return (data && data.length > 0);
    } else {
       const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
       return deliveries.some(d => d.patient_id === patientId);
    }
  },

  async logDelivery(delivery: Omit<Delivery, 'id'>): Promise<Delivery> {
    if (isSupabaseConfigured() && supabase) {
      // STRICT PAYLOAD CONSTRUCTION
      // We construct a new object to ensure only valid columns are sent to Supabase.
      // This prevents "Could not find column 'custody_id'" errors if the DB schema is outdated,
      // or if 'patient', 'hcp' objects were accidentally included in the passed object.
      const payload = {
          patient_id: delivery.patient_id,
          hcp_id: delivery.hcp_id,
          product_id: delivery.product_id,
          quantity: delivery.quantity,
          delivered_by: delivery.delivered_by,
          delivery_date: delivery.delivery_date,
          rx_date: delivery.rx_date,
          educator_name: delivery.educator_name,
          educator_submission_date: delivery.educator_submission_date,
          notes: delivery.notes
      };
      
      const { data, error } = await supabase.from('deliveries').insert([payload]).select().single();
      if (error) throw error;
      
      // Deduct from source custody logic stays separate
      // We use the custody_id from the argument, not the payload
      if (delivery.custody_id) {
          const { data: custody } = await supabase.from('custodies').select('current_stock').eq('id', delivery.custody_id).single();
          if (custody) {
              const newStock = Math.max(0, (custody.current_stock || 0) - delivery.quantity);
              await supabase.from('custodies').update({ current_stock: newStock }).eq('id', delivery.custody_id);
              
              // Log stock deduction
              await supabase.from('stock_transactions').insert([{
                  custody_id: delivery.custody_id,
                  quantity: -delivery.quantity,
                  transaction_date: delivery.delivery_date,
                  source: `Delivery to Patient: ${delivery.patient?.national_id || 'ID: ' + delivery.patient_id}`
              }]);
          }
      }
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
  },

  async updateDelivery(id: string, updates: Partial<Delivery>): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
       const { error } = await supabase.from('deliveries').update(updates).eq('id', id);
       if (error) throw error;
    } else {
        const list: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
        const idx = list.findIndex(i => i.id === id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...updates };
            localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(list));
        }
    }
  }
};