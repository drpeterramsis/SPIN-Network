import React, { useState, useMemo } from 'react';
import { Delivery, HCP, PRODUCTS } from '../types';
import { X, Hexagon, Filter, Calendar, BarChart3, PieChart, TrendingUp, Download } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Pie, Cell, PieChart as RechartsPieChart 
} from 'recharts';
import { formatDateFriendly } from '../utils/time';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  deliveries: Delivery[];
  hcps: HCP[];
  role: string;
}

const COLORS = ['#000000', '#FFC600', '#94a3b8', '#475569', '#cbd5e1'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose, deliveries, hcps, role }) => {
  const [timeFilter, setTimeFilter] = useState('all'); // all, 30days, 90days, year
  const [productFilter, setProductFilter] = useState('all');

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    const now = new Date();
    return deliveries.filter(d => {
      const dDate = new Date(d.delivery_date);
      
      // Time Filter
      let passTime = true;
      if (timeFilter === '30days') {
        const threshold = new Date(); threshold.setDate(now.getDate() - 30);
        passTime = dDate >= threshold;
      } else if (timeFilter === '90days') {
        const threshold = new Date(); threshold.setDate(now.getDate() - 90);
        passTime = dDate >= threshold;
      } else if (timeFilter === 'year') {
        const threshold = new Date(); threshold.setFullYear(now.getFullYear() - 1);
        passTime = dDate >= threshold;
      }

      // Product Filter
      let passProd = productFilter === 'all' || d.product_id === productFilter;

      return passTime && passProd;
    });
  }, [deliveries, timeFilter, productFilter]);

  // --- Chart Data Preparation ---

  // 1. Top Prescribers
  const prescriberData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      counts[d.hcp_id] = (counts[d.hcp_id] || 0) + d.quantity;
    });
    return Object.entries(counts)
      .map(([id, qty]) => ({
        name: hcps.find(h => h.id === id)?.full_name || 'Unknown',
        qty
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [filteredData, hcps]);

  // 2. Product Mix
  const productMixData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const pName = PRODUCTS.find(p => p.id === d.product_id)?.name || d.product_id;
      counts[pName] = (counts[pName] || 0) + d.quantity;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 3. Monthly Trend
  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
        // Format YYYY-MM
        const monthKey = d.delivery_date.substring(0, 7); 
        counts[monthKey] = (counts[monthKey] || 0) + d.quantity;
    });
    
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, qty]) => ({
         date, // YYYY-MM
         label: new Date(date + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
         qty
      }));
  }, [filteredData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-6xl min-h-[90vh] flex flex-col rounded-xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-black text-white p-6 flex justify-between items-center sticky top-0 z-20 shadow-md">
            <div className="flex items-center gap-4">
                <div className="bg-[#FFC600] p-2 rounded-lg text-black">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider">Network Analytics</h2>
                    <p className="text-slate-400 text-xs">
                        {role === 'mr' ? 'My Territory Analysis' : role === 'dm' ? 'District Team Performance' : role === 'lm' ? 'Regional Performance' : 'Global Admin View'}
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between sticky top-[88px] z-10 shadow-sm">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <Filter className="w-4 h-4 text-[#FFC600]" />
                    <span className="text-xs font-bold uppercase text-slate-500">Slicers:</span>
                 </div>
                 <select 
                    value={timeFilter} 
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="bg-slate-100 border-none text-xs font-bold uppercase rounded px-3 py-2 outline-none focus:ring-2 ring-[#FFC600]"
                >
                    <option value="all">All Time</option>
                    <option value="year">Past Year</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="30days">Last 30 Days</option>
                 </select>

                 <select 
                    value={productFilter} 
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="bg-slate-100 border-none text-xs font-bold uppercase rounded px-3 py-2 outline-none focus:ring-2 ring-[#FFC600]"
                >
                    <option value="all">All Products</option>
                    {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
             </div>
             
             <div className="text-xs font-bold text-slate-400 uppercase">
                 Data Points: {filteredData.length}
             </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[#FFC600] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Pens Distributed</p>
                        <h3 className="text-3xl font-black text-slate-900">{filteredData.length}</h3>
                    </div>
                    <Hexagon className="w-8 h-8 text-[#FFC600] opacity-20" />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-slate-800 flex items-center justify-between">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Active Prescribers</p>
                        <h3 className="text-3xl font-black text-slate-900">{new Set(filteredData.map(d => d.hcp_id)).size}</h3>
                    </div>
                    <BarChart3 className="w-8 h-8 text-slate-800 opacity-20" />
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Unique Patients</p>
                        <h3 className="text-3xl font-black text-slate-900">{new Set(filteredData.map(d => d.patient_id)).size}</h3>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FFC600]" /> Distribution Trend (Monthly)
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '4px', color: '#fff'}}
                                    itemStyle={{color: '#FFC600'}}
                                />
                                <Line type="monotone" dataKey="qty" stroke="#000" strokeWidth={3} dot={{r: 4, fill: '#FFC600', strokeWidth: 0}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Product Mix */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#FFC600]" /> Product Mix
                    </h4>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie
                                    data={productMixData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {productMixData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Prescribers */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 lg:col-span-2">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#FFC600]" /> Top Prescribers Performance
                    </h4>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={prescriberData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#000', color: '#fff', borderRadius: '4px'}} />
                                <Bar dataKey="qty" fill="#FFC600" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-100 text-center text-xs text-blue-800">
                Analysis generated based on live database records. Data includes only transactions visible to your role ({role.toUpperCase()}).
            </div>

        </div>
      </div>
    </div>
  );
};