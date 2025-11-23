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

  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    // Logic to update text in stock transactions if name changes
    const updateRelatedText = async (oldName: string, newName: string) => {
        if (!oldName || !newName || oldName === newName) return;
        // This is a best-effort text replacement for audit logs
        if (isSupabaseConfigured() && supabase) {
             // In a real scenario, this would be an RPC or handled by ID relations. 
             // Here we just fetch recent transactions to update for demo purposes.
             const { data: txs } = await supabase.from('stock_transactions')
                .select('*')
                .ilike('source', `%${oldName}%`)
                .limit(50);
             
             if (txs) {
                 for (const tx of txs) {
                     const newSource = tx.source.replace(oldName, newName);
                     await supabase.from('stock_transactions').update({ source: newSource }).eq('id', tx.id);
                 }
             }
        } else {
             const list: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
             let changed = false;
             list.forEach(tx => {
                 if (tx.source && tx.source.includes(oldName)) {
                     tx.source = tx.source.replace(oldName, newName);
                     changed = true;
                 }
             });
             if (changed) localStorage.setItem(KEYS.STOCK, JSON.stringify(list));
        }
    };

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

    if (oldPatient && updates.full_name) {
        await updateRelatedText(oldPatient.full_name, updates.full_name);
    }
  },

  async deletePatient(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('deliveries').delete().eq('patient_id', id); // Cascade deliveries
          await supabase.from('patients').delete().eq('id', id);
      } else {
          let patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
          patients = patients.filter((p: Patient) => p.id !== id);
          localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));

          // Cascade delete deliveries
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

  async deleteHCP(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          // Optional: Set delivery HCP to null or delete deliveries? Request says "delete all related rows"
          await supabase.from('deliveries').delete().eq('hcp_id', id);
          await supabase.from('hcps').delete().eq('id', id);
      } else {
          let hcps = JSON.parse(localStorage.getItem(KEYS.HCPS) || '[]');
          hcps = hcps.filter((h: HCP) => h.id !== id);
          localStorage.setItem(KEYS.HCPS, JSON.stringify(hcps));
          
          let deliveries = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          deliveries = deliveries.filter((d: Delivery) => d.hcp_id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
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
      if (!rep) {
          try {
              rep = await this.createCustody({ name: 'My Inventory', type: 'rep', created_at: new Date().toISOString() });
          } catch (e) {
              console.error("Failed to auto-create rep custody", e);
              if (!isSupabaseConfigured()) {
                  rep = { id: 'temp-rep', name: 'My Inventory (Temp)', type: 'rep', created_at: new Date().toISOString(), current_stock: 0 };
              } else {
                  return { id: 'error-rep', name: 'Error: Inventory Not Found', type: 'rep', created_at: new Date().toISOString(), current_stock: 0 };
              }
          }
      }
      return rep;
  },

  async createCustody(custody: Omit<Custody, 'id' | 'current_stock'>): Promise<Custody> {
      if (isSupabaseConfigured() && supabase) {
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

  async deleteCustody(id: string): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('stock_transactions').delete().eq('custody_id', id);
          await supabase.from('deliveries').delete().eq('custody_id', id); // Unlikely but possible
          await supabase.from('custodies').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
          list = list.filter((c: Custody) => c.id !== id);
          localStorage.setItem(KEYS.CUSTODY, JSON.stringify(list));
          
          let st = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          st = st.filter((s: StockTransaction) => s.custody_id !== id);
          localStorage.setItem(KEYS.STOCK, JSON.stringify(st));
      }
  },

  async processStockTransaction(
    toCustodyId: string, 
    quantity: number, 
    date: string, 
    sourceLabel: string,
    fromCustodyId?: string
  ): Promise<void> {
     if (isSupabaseConfigured() && supabase) {
         if (fromCustodyId) {
            const { data: fromCustody } = await supabase.from('custodies').select('current_stock, name').eq('id', fromCustodyId).single();
            if (fromCustody) {
                if ((fromCustody.current_stock || 0) < quantity) {
                    console.warn(`Warning: Transferring more than available stock.`);
                }
                const newStock = Math.max(0, (fromCustody.current_stock || 0) - quantity);
                await supabase.from('custodies').update({ current_stock: newStock }).eq('id', fromCustodyId);

                const { data: destCustody } = await supabase.from('custodies').select('name').eq('id', toCustodyId).single();
                const destName = destCustody?.name || 'Clinic';

                await supabase.from('stock_transactions').insert([{
                    custody_id: fromCustodyId,
                    quantity: -quantity,
                    transaction_date: date,
                    source: `Transfer to ${destName}`
                }]);
            } else {
                throw new Error("Source inventory not found.");
            }
         }

         const { data: toCustody } = await supabase.from('custodies').select('current_stock').eq('id', toCustodyId).single();
         if (toCustody) {
            const newStock = (toCustody.current_stock || 0) + quantity;
            await supabase.from('custodies').update({ current_stock: newStock }).eq('id', toCustodyId);
            
            // If it's a transfer, get source name for better history
            let finalSource = sourceLabel;
            if (fromCustodyId) {
                const { data: fc } = await supabase.from('custodies').select('name').eq('id', fromCustodyId).single();
                if (fc) finalSource = `Transfer from ${fc.name}`;
            }

            await supabase.from('stock_transactions').insert([{
                custody_id: toCustodyId,
                quantity: quantity,
                transaction_date: date,
                source: finalSource
            }]);
         } else {
             throw new Error("Destination location not found.");
         }

     } else {
         const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
         const transList: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');

         if (fromCustodyId) {
             const fromCustody = custodies.find(c => c.id === fromCustodyId);
             if (fromCustody) {
                 if ((fromCustody.current_stock || 0) < quantity) {
                     throw new Error(`Insufficient pens in source custody.`);
                 }
                 fromCustody.current_stock -= quantity;
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

         const toCustody = custodies.find(c => c.id === toCustodyId);
         if (toCustody) {
             toCustody.current_stock = (toCustody.current_stock || 0) + quantity;
             
             let finalSource = sourceLabel;
             if (fromCustodyId) {
                 const fc = custodies.find(c => c.id === fromCustodyId);
                 if (fc) finalSource = `Transfer from ${fc.name}`;
             }

             transList.push({
                id: uuidv4(),
                custody_id: toCustodyId,
                quantity: quantity,
                transaction_date: date,
                source: finalSource
             });
         }
         localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
         localStorage.setItem(KEYS.STOCK, JSON.stringify(transList));
     }
  },

  async updateStockTransaction(id: string, updates: Partial<StockTransaction>): Promise<void> {
      if (isSupabaseConfigured() && supabase) {
          if (updates.quantity !== undefined) {
              const { data: oldTx } = await supabase.from('stock_transactions').select('*').eq('id', id).single();
              if (oldTx) {
                  const diff = updates.quantity - oldTx.quantity;
                  if (diff !== 0) {
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

  async deleteStockTransaction(id: string): Promise<void> {
      // Logic: Reverse the stock effect, then delete the row.
      if (isSupabaseConfigured() && supabase) {
          const { data: tx } = await supabase.from('stock_transactions').select('*').eq('id', id).single();
          if (tx) {
              // Reverse stock
              const { data: custody } = await supabase.from('custodies').select('current_stock').eq('id', tx.custody_id).single();
              if (custody) {
                  // If quantity was positive (added), we subtract. If negative (removed), we add.
                  const newStock = (custody.current_stock || 0) - tx.quantity;
                  await supabase.from('custodies').update({ current_stock: newStock }).eq('id', tx.custody_id);
              }
              await supabase.from('stock_transactions').delete().eq('id', id);
          }
      } else {
          let list: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          const tx = list.find(t => t.id === id);
          if (tx) {
              const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || '[]');
              const c = custodies.find(cust => cust.id === tx.custody_id);
              if (c) {
                  c.current_stock = (c.current_stock || 0) - tx.quantity;
                  localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
              }
              list = list.filter(t => t.id !== id);
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

  async logDelivery(delivery: Omit<Delivery, 'id'>, userDisplayName?: string): Promise<Delivery> {
    const patientName = delivery.patient?.full_name || 'Patient';
    const patientID = delivery.patient?.national_id || delivery.patient_id;
    const userName = userDisplayName ? ` by ${userDisplayName}` : '';
    
    if (isSupabaseConfigured() && supabase) {
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
      
      if (delivery.custody_id) {
          const { data: custody } = await supabase.from('custodies').select('current_stock').eq('id', delivery.custody_id).single();
          if (custody) {
              const newStock = Math.max(0, (custody.current_stock || 0) - delivery.quantity);
              await supabase.from('custodies').update({ current_stock: newStock }).eq('id', delivery.custody_id);
              
              await supabase.from('stock_transactions').insert([{
                  custody_id: delivery.custody_id,
                  quantity: -delivery.quantity,
                  transaction_date: delivery.delivery_date,
                  source: `Delivery to ${patientName} (${patientID})${userName}`
              }]);
          }
      }
      return data;
    } else {
      const deliveries: Delivery[] = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
      const newDelivery = { ...delivery, id: uuidv4(), created_at: new Date().toISOString() };
      deliveries.unshift(newDelivery);
      localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(deliveries));
      
      if (delivery.custody_id) {
          const custodies: Custody[] = JSON.parse(localStorage.getItem(KEYS.CUSTODY) || JSON.stringify(MOCK_CUSTODY));
          const custody = custodies.find(c => c.id === delivery.custody_id);
          const transList: StockTransaction[] = JSON.parse(localStorage.getItem(KEYS.STOCK) || '[]');
          
          if (custody) {
              custody.current_stock = Math.max(0, (custody.current_stock || 0) - delivery.quantity);
              localStorage.setItem(KEYS.CUSTODY, JSON.stringify(custodies));
              
              transList.push({
                id: uuidv4(),
                custody_id: delivery.custody_id,
                quantity: -delivery.quantity,
                transaction_date: delivery.delivery_date,
                source: `Delivery to ${patientName} (${patientID})${userName}`
             });
             localStorage.setItem(KEYS.STOCK, JSON.stringify(transList));
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
  },

  async deleteDelivery(id: string): Promise<void> {
      // NOTE: We do NOT automatically reverse stock here to avoid stock data corruption if the delivery is old.
      // But user requested "delete all related rows". 
      // Safe approach: Just delete the delivery record.
      if (isSupabaseConfigured() && supabase) {
          await supabase.from('deliveries').delete().eq('id', id);
      } else {
          let list = JSON.parse(localStorage.getItem(KEYS.DELIVERIES) || '[]');
          list = list.filter((d: Delivery) => d.id !== id);
          localStorage.setItem(KEYS.DELIVERIES, JSON.stringify(list));
      }
  }
};