export type UserRole = 'admin' | 'rep' | 'educator' | 'hcp_user';

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

export interface Patient {
  id: string;
  national_id: string;
  full_name: string;
  phone_number: string;
  created_at?: string;
}

export interface HCP {
  id: string;
  full_name: string;
  specialty?: string;
  hospital?: string;
}

export interface Custody {
  id: string;
  name: string;
  type: 'rep' | 'clinic';
  created_at: string;
  // Simplified: Custody is just "Pens", no specific product mix until delivery
  current_stock: number; 
}

export interface StockTransaction {
  id: string;
  custody_id: string;
  quantity: number; // Number of pens
  transaction_date: string;
  source: string; // e.g. 'Educator: John Doe', 'Transfer from Rep'
  notes?: string;
}

export interface Delivery {
  id: string;
  patient_id: string;
  hcp_id: string; // The prescriber
  
  // Product is assigned AT delivery
  product_id: string; 
  
  quantity: number; // Always 1 pen usually
  delivered_by: string; // User ID
  
  delivery_date: string;
  rx_date?: string; // Prescription Date
  
  custody_id?: string; // Source Custody ID (Clinic or Rep)
  
  // Educator Data
  educator_name?: string; // Reported Educator Name
  educator_submission_date?: string; // Date of report

  notes?: string;
  
  // Joined fields for UI
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