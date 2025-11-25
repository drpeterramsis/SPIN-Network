
export type UserRole = 'admin' | 'lm' | 'dm' | 'mr';

export interface Product {
  id: string;
  name: string;
  type: 'cartridge' | 'pen' | 'vial';
}

export const PRODUCTS: Product[] = [
  { id: 'glargivin-100', name: 'Glargivin 100 IU', type: 'cartridge' },
  { id: 'humaxin-r', name: 'Humaxin R Cart', type: 'cartridge' },
  { id: 'humaxin-mix', name: 'Humaxin Mix 70/30 Cart', type: 'cartridge' }
];

export interface UserProfile {
  id: string;
  email?: string;
  corporate_email?: string; 
  full_name: string;
  employee_id: string;
  role: UserRole;
  manager_id?: string | null; 
  access: 'yes' | 'no' | 'pending';
}

export interface Patient {
  id: string;
  national_id: string;
  full_name: string;
  phone_number: string;
  created_at?: string;
  created_by?: string; // Critical for DM/LM filtering
}

export interface HCP {
  id: string;
  full_name: string;
  specialty?: string;
  hospital?: string;
  created_by?: string; // Critical for DM/LM filtering
}

export interface Custody {
  id: string;
  name: string;
  type: 'rep' | 'clinic' | 'pharmacy';
  created_at: string;
  current_stock: number;
  owner_id?: string; // Critical for Rep inventory linking
}

export interface StockTransaction {
  id: string;
  custody_id: string;
  quantity: number;
  transaction_date: string;
  source: string;
  notes?: string;
}

export interface Delivery {
  id: string;
  patient_id: string;
  hcp_id: string;
  product_id: string;
  quantity: number;
  delivered_by: string; 
  delivery_date: string;
  rx_date?: string; 
  custody_id?: string;
  educator_name?: string; 
  educator_submission_date?: string; 
  notes?: string;
  patient?: Patient;
  hcp?: HCP;
  custody?: Custody;
}

export interface DashboardStats {
  totalDeliveries: number;
  uniquePatients: number;
  topPrescriber: string;
  productBreakdown: Record<string, number>;
}