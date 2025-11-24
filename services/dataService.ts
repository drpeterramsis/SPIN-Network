
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Patient, HCP, Delivery, Custody, StockTransaction, UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const KEYS = {
  PATIENTS: 'spin_patients',
  HCPS: 'spin_hcps',
  DELIVERIES: 'spin_deliveries',
  CUSTODY: 'spin_custody',
  STOCK: 'spin_stock_transactions',
  PROFILES: 'spin_profiles' // For local demo mode
};

// Helper to cascade text updates (renaming)
const updateHistoryText = async (oldText: string, newText: string) => {
    if (!oldText || !newText || oldText === newText) return;
    
    // We only attempt to replace reasonably long names to avoid replacing common substrings accidentally
    if (oldText.length < 3) return;

    // Helper to safely replace text avoiding partial matches where possible
    const safeReplace = (source: string, find: string, replace: string) => {
        try {
            // Escape special regex characters
            const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Attempt to match word boundaries if it looks like a name/word
            const regex = new RegExp(`\\b${escapedFind}\\b`, 'gi');
            if (regex.test(source)) {
                return source.replace(regex, replace);
            }
            // Fallback to simple replace if strict boundary check fails but string is present
            // (e.g. if punctuation interferes)
            return source.split(find).join(replace);
        } catch (e) {
            return source.split(find).join(replace);
        }
    };

    if (isSupabaseConfigured() && supabase) {
         // Get transactions that might contain the old text
         const { data: txs } = await supabase.from('stock_transactions')
            .select('*')
            .ilike('source', `%${oldText}%`)
            .limit(500);
         
         if (txs && txs.length > 0) {
             for (const tx of txs) {
                 const newSource = safeReplace(tx.source, oldText, newText);
                 if (newSource !== tx.source) {
                    await supabase.from('stock_transactions').update({ source: newSource }).eq('id', tx.id);
                 }
             }
         }
    } else {
         const list: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
         let changed = false;
         list.forEach(tx => {
             if (tx.source && tx.source.toLowerCase().includes(oldText.toLowerCase())) {
                 const newSource = safeReplace(tx.source, oldText, newText);
                 if (newSource !== tx.source) {
                     tx.source = newSource;
                     changed = true;
                 }
             }
         });
         if (changed) localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
    }
};

export const dataService = {
  
  // --- PROFILES & HIERARCHY ---
  async getAllProfiles(): Promise<UserProfile[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) throw error;
          return data as UserProfile[];
      } else {
          const stored = localStorage.getItem(KEYS.PROFILES);
          if (!stored) return [];
          return JSON.parse(stored);
      }
  },

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('profiles').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]');
          const idx = list.findIndex((p: UserProfile) => p.id === id);
          if (idx >= 0) {
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(KEYS.PROFILES, JSON.stringify(list));
          }
      }
  },

  // --- PATIENTS ---
  async getPatients(): Promise<Patient[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('patients').select('*').order('full_name');
          return data || [];
      } else {
          return JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
      }
  },

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

  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    let oldPatient: Patient | null = null;

    if (isSupabaseConfigured() && supabase) {
        const { data } = await supabase.from('patients').select('*').eq('id', id).single();
        oldPatient = data;
        const { error } = await supabase.from('patients').update(updates).eq('id', id);
        if (error) throw error;
    } else {
        const list: Patient[] = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
        const idx = list.findIndex(i => i.id === id);
        if (idx >= 0) {
            oldPatient = list[idx];
            list[idx] = { ...list[idx], ...updates };
            localStorage.setItem(KEYS.PATIENTS, JSON.stringify(list));
        }
    }

    // Smart Rename: Update historical text references
    if (oldPatient && updates.full_name && oldPatient.full_name !== updates.full_name) {
        await updateHistoryText(oldPatient.full_name, updates.full_name);
        // Also try to update if ID was used in text
        await updateHistoryText(id, updates.full_name); 
    }
  },

  async deletePatient(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          // Cascade: Delete deliveries first
          await supabase.from('deliveries').delete().eq('patient_id', id); 
          await supabase.from('patients').delete().eq('id', id);
      } else {
          let patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
          patients = patients.filter((p: Patient) => p.id !== id);
          localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));

          let deliveries = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          deliveries = deliveries.filter((d: Delivery) => d.patient_id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
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
         const mocks = [
            { id: 'hcp-1', full_name: 'Dr. Sarah Connor', specialty: 'Endocrinology', hospital: 'City General' },
            { id: 'hcp-2', full_name: 'Dr. John Smith', specialty: 'Internal Medicine', hospital: 'Mercy Hospital' },
         ];
         localStorage.setItem(KEYS.HCPS, JSON.stringify(mocks));
         return mocks;
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
          const list = JSON.parse(localStorage.getItem(KEYS.HCPS) || '[]');
          const newItem = { ...hcp, id: uuidv4() };
          list.push(newItem);
          localStorage.setItem(KEYS.HCPS, JSON.stringify(list));
          return newItem;
      }
  },

  async updateHCP(id: string, updates: Partial<HCP>): Promise<void> {
      let oldHCP: HCP | null = null;
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('hcps').select('*').eq('id', id).single();
          oldHCP = data;
          const { error } = await supabase.from('hcps').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.HCPS) || '[]');
          const idx = list.findIndex((i: HCP) => i.id === id);
          if (idx >= 0) {
              oldHCP = list[idx];
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(KEYS.HCPS, JSON.stringify(list));
          }
      }
      
      if (oldHCP && updates.full_name && oldHCP.full_name !== updates.full_name) {
          await updateHistoryText(oldHCP.full_name, updates.full_name);
          await updateHistoryText(id, updates.full_name);
      }
  },

  async deleteHCP(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('deliveries').delete().eq('hcp_id', id);
          await supabase.from('hcps').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.HCPS) || '[]');
          list = list.filter((i: HCP) => i.id !== id);
          localStorage.setItem(KEYS.HCPS, JSON.stringify(list));
          
          let deliveries = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          deliveries = deliveries.filter((d: Delivery) => d.hcp_id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
      }
  },

  // --- CUSTODY ---
  // Using 'custodies' table for consistency with plural convention
  async getCustodies(): Promise<Custody[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('custodies').select('*').order('name');
          if (error) throw error;
          return data;
      } else {
          const stored = localStorage.getItem(KEYS.CUSTODY);
          if (!stored) {
             const mocks = [
                { id: 'rep-main', name: 'My Rep Inventory', type: 'rep', created_at: new Date().toISOString(), current_stock: 50 },
                { id: 'custody-2', name: 'City General Clinic', type: 'clinic', created_at: new Date().toISOString(), current_stock: 15 }
             ];
             localStorage.setItem(KEYS.CUSTODY, JSON.stringify(mocks));
             return mocks as Custody[];
          }
          return JSON.parse(stored);
      }
  },

  async getRepCustody(): Promise<Custody | null> {
     const all = await this.getCustodies();
     return all.find(c => c.type === 'rep') || null;
  },

  async createCustody(custody: Omit<Custody, 'id'|'current_stock'>): Promise<Custody> {
      const newItem = { ...custody, current_stock: 0 };
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('custodies').insert([newItem]).select().single();
          if (error) throw error;
          return data;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
          const created = { ...newItem, id: uuidv4() };
          list.push(created);
          localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          return created as Custody;
      }
  },

  async updateCustody(id: string, updates: Partial<Custody>): Promise<void> {
      let oldCustody: Custody | null = null;
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('custodies').select('*').eq('id', id).single();
          oldCustody = data;
          const { error } = await supabase.from('custodies').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
          const idx = list.findIndex((i: Custody) => i.id === id);
          if (idx >= 0) {
              oldCustody = list[idx];
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          }
      }

      if (oldCustody && updates.name && oldCustody.name !== updates.name) {
          await updateHistoryText(oldCustody.name, updates.name);
          await updateHistoryText(id, updates.name);
      }
  },

  async deleteCustody(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          // Cascade delete transactions and deliveries related to this custody
          await supabase.from('stock_transactions').delete().eq('custody_id', id);
          await supabase.from('deliveries').delete().eq('custody_id', id);
          await supabase.from('custodies').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
          list = list.filter((i: Custody) => i.id !== id);
          localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          
          let txs = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          txs = txs.filter((t: StockTransaction) => t.custody_id !== id);
          localStorage.setItem(KEYS.STOCK, JSON.stringify(txs));

          let deliveries = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          deliveries = deliveries.filter((d: Delivery) => d.custody_id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
      }
  },

  // --- DELIVERIES ---
  async getDeliveries(): Promise<Delivery[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
              .from('deliveries')
              // Note: Using 'custodies' alias for the join to match the table name change
              .select('*, patient:patients(*), hcp:hcps(*), custody:custodies(*)')
              .order('delivery_date', { ascending: false });
          if (error) throw error;
          return data;
      } else {
          const deliveries = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          const patients = await this.getPatients();
          const hcps = await this.getHCPs();
          const custodies = await this.getCustodies();
          
          return deliveries.map((d: Delivery) => ({
              ...d,
              patient: patients.find(p => p.id === d.patient_id),
              hcp: hcps.find(h => h.id === d.hcp_id),
              custody: custodies.find(c => c.id === d.custody_id)
          })).sort((a: Delivery, b: Delivery) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
      }
  },

  async checkDuplicateDelivery(patientId: string, productId: string): Promise<boolean> {
      const deliveries = await this.getDeliveries();
      // Simple logic: check if patient received SAME product in last 20 days
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 20);
      
      return deliveries.some(d => 
          d.patient_id === patientId && 
          d.product_id === productId &&
          new Date(d.delivery_date) > threshold
      );
  },

  async logDelivery(delivery: Omit<Delivery, 'id'>, userName: string): Promise<void> {
      // 1. Deduct Stock using processStockTransaction (it handles custody update)
      // Fixed: Removed manual updateCustody call to prevent double deduction
      if (delivery.custody_id) {
          await this.processStockTransaction(
              delivery.custody_id,
              -1,
              delivery.delivery_date,
              `Delivery to Patient: ${delivery.patient?.full_name || delivery.patient_id}`
          );
      }

      // 2. Save Delivery
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('deliveries').insert([{
             patient_id: delivery.patient_id,
             hcp_id: delivery.hcp_id,
             product_id: delivery.product_id,
             quantity: delivery.quantity,
             delivered_by: delivery.delivered_by,
             delivery_date: delivery.delivery_date,
             rx_date: delivery.rx_date,
             custody_id: delivery.custody_id,
             educator_name: delivery.educator_name,
             educator_submission_date: delivery.educator_submission_date,
             notes: delivery.notes
          }]);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          list.push({ ...delivery, id: uuidv4() });
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(list));
      }
  },

  async updateDelivery(id: string, updates: Partial<Delivery>): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('deliveries').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          const idx = list.findIndex((d: Delivery) => d.id === id);
          if (idx >= 0) {
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(list));
          }
      }
  },

  async deleteDelivery(id: string): Promise<void> {
      // 1. Get the delivery details first
      let delivery: Delivery | null = null;
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('deliveries').select('*').eq('id', id).single();
          delivery = data;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          delivery = list.find((d: Delivery) => d.id === id);
      }

      // 2. Restore Stock and Remove Transaction History
      if (delivery && delivery.custody_id) {
          // A. Restore Stock to Custody
          const custodies = await this.getCustodies();
          const custody = custodies.find(c => c.id === delivery.custody_id);
          
          if (custody) {
              // Add stock back (delivery was -1, so we add 1)
              // But simpler: just use deleteStockTransaction on the deduction record which handles balance
              
              // Find the transaction first
              let txIdToDelete = null;
              
              if (isSupabaseConfigured() && supabase) {
                   // Search for a transaction: same custody, same negative qty, same date
                   const { data: txs } = await supabase.from('stock_transactions')
                      .select('*')
                      .eq('custody_id', custody.id)
                      .eq('quantity', -delivery.quantity)
                      .eq('transaction_date', delivery.delivery_date)
                      .limit(1); // Take the first match
                   
                   if (txs && txs.length > 0) {
                       txIdToDelete = txs[0].id;
                   }
              } else {
                   const txs = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
                   const match = txs.find((t: StockTransaction) => 
                       t.custody_id === custody.id && 
                       t.quantity === -delivery.quantity && 
                       t.transaction_date === delivery.delivery_date
                   );
                   if (match) txIdToDelete = match.id;
              }

              if (txIdToDelete) {
                  await this.deleteStockTransaction(txIdToDelete);
              } else {
                  // Fallback if transaction missing: manual update
                  await this.updateCustody(custody.id, { current_stock: (custody.current_stock || 0) + delivery.quantity });
              }
          }
      }

      // 3. Delete the Delivery Record
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('deliveries').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          list = list.filter((d: Delivery) => d.id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(list));
      }
  },

  // --- STOCK TRANSACTIONS ---
  async getStockTransactions(): Promise<StockTransaction[]> {
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('stock_transactions').select('*').order('transaction_date', { ascending: false });
          if (error) throw error;
          return data;
      } else {
          return JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
      }
  },

  async processStockTransaction(custodyId: string, quantity: number, date: string, source: string, fromCustodyId?: string): Promise<void> {
      // 1. Update Target Custody
      const custodies = await this.getCustodies();
      const target = custodies.find(c => c.id === custodyId);
      if (target) {
          await this.updateCustody(target.id, { current_stock: (target.current_stock || 0) + quantity });
      }

      // 2. If transfer, deduct from source
      if (fromCustodyId) {
          const sourceCustody = custodies.find(c => c.id === fromCustodyId);
          if (sourceCustody) {
               await this.updateCustody(sourceCustody.id, { current_stock: (sourceCustody.current_stock || 0) - quantity });
               
               // Log deduction for source
               const deductionTx = {
                   custody_id: sourceCustody.id,
                   quantity: -quantity,
                   transaction_date: date,
                   source: `Transfer to ${target?.name || custodyId}`
               };
               await this.saveTransaction(deductionTx);
          }
      }

      // 3. Log Addition for target
      // If it's a transfer, the source text usually says "Transfer from [ID]"
      // We will try to resolve the name here if we have it
      let finalSource = source;
      if (fromCustodyId) {
          const sourceName = custodies.find(c => c.id === fromCustodyId)?.name || fromCustodyId;
          finalSource = `Transfer from ${sourceName}`;
      }

      await this.saveTransaction({
          custody_id: custodyId,
          quantity: quantity,
          transaction_date: date,
          source: finalSource
      });
  },

  async saveTransaction(tx: Omit<StockTransaction, 'id'>) {
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('stock_transactions').insert([tx]);
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          list.unshift({ ...tx, id: uuidv4() });
          localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
      }
  },

  async updateStockTransaction(id: string, updates: Partial<StockTransaction>): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('stock_transactions').update(updates).eq('id', id);
          if (error) throw error;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          const idx = list.findIndex((t: StockTransaction) => t.id === id);
          if (idx >= 0) {
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
          }
      }
  },

  // IMPROVED DELETE: Safe deletion that restores balance
  async deleteStockTransaction(id: string): Promise<void> {
      let tx: StockTransaction | null = null;
      
      // 1. Fetch transaction to get quantity and custody
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('stock_transactions').select('*').eq('id', id).single();
          tx = data;
      } else {
          const list = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          tx = list.find((t: StockTransaction) => t.id === id) || null;
      }

      // 2. Reverse the stock impact
      if (tx) {
          const custodies = await this.getCustodies();
          const custody = custodies.find(c => c.id === tx!.custody_id);
          
          if (custody) {
              // If tx.quantity was +10, we subtract 10. If -5, we add 5.
              const reverseQty = -1 * tx.quantity;
              await this.updateCustody(custody.id, { current_stock: (custody.current_stock || 0) + reverseQty });
          }
      }

      // 3. Delete the record
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('stock_transactions').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          list = list.filter((t: StockTransaction) => t.id !== id);
          localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
      }
  }
};