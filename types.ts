export type UserRole = 'admin' | 'rep' | 'educator' | 'hcp_user';

export interface Product {
  id: string;
  name: string;
  type: 'cartridge' | 'pen' | 'vial';
}

export const PRODUCTS: Product[] = [
  { id: 'glargivin-100', name: 'Glargivin 100 IU', type: 'pen' },
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

export interface Delivery {
  id: string;
  patient_id: string;
  hcp_id: string; // The prescriber
  product_id: string;
  quantity: number;
  delivered_by: string; // User ID
  delivery_date: string;
  notes?: string;
  
  // Joined fields for UI
  patient?: Patient;
  hcp?: HCP;
}

export interface DashboardStats {
  totalDeliveries: number;
  uniquePatients: number;
  topPrescriber: string;
  productBreakdown: Record<string, number>;
}
