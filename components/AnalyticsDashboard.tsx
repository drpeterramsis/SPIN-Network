import React, { useState, useMemo } from 'react';
import { Delivery, HCP, PRODUCTS } from '../types';
import { X, Hexagon, Filter, Calendar, BarChart3, PieChart, TrendingUp, ArrowLeft } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Pie, Cell, PieChart as RechartsPieChart 
} from 'recharts';

interface AnalyticsDashboardProps {
  onBack: () => void;
  deliveries: Delivery[];
  hcps: HCP[];
  role: string;
}

// Product Color Mapping
const PRODUCT_COLORS: Record<string, string> = {
  'glargivin-100': '#8b5cf6', // Violet
  'humaxin-r': '#eab308',     // Yellow
  'humaxin-mix': '#f97316',   // Orange
  'default': '#94a3b8'        // Slate
};

const COLORS = ['#000000', '#FFC600', '#94a3b8', '#475569', '#cbd5e1'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack, deliveries, hcps, role }) => {
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
    const total = filteredData.length;
    
    filteredData.forEach(d => {
      const pName = PRODUCTS.find(p => p.id === d.product_id)?.name || d.product_id;
      counts[d.product_id] = (counts[d.product_id] || 0) + d.quantity;
    });

    return Object.entries(counts).map(([id, value]) => {
        const product = PRODUCTS.find(p => p.id === id);
        return {
            name: product?.name || id,
            id: id,
            value,
            percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0'
        };
    });
  }, [filteredData]);

  // 3. Monthly Trend (Stacked Bar)
  const trendData = useMemo(() => {
    // Map: 'YYYY-MM' -> { date, glargivin: 0, humaxin: 0... }
    const grouped: Record<string, any> = {};

    filteredData.forEach(d => {
        const monthKey = d.delivery_date.substring(0, 7); 
        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                date: monthKey,
                label: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            };
            // Initialize all products to 0
            PRODUCTS.forEach(p => grouped[monthKey][p.id] = 0);
        }
        grouped[monthKey][d.product_id] = (grouped[monthKey][d.product_id] || 0) + d.quantity;
    });
    
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-black text-white p-2 text-xs rounded shadow-lg border-none">
                <p className="font-bold mb-1" style={{ color: payload[0].fill }}>{data.name}</p>
                <div className="flex justify-between gap-4">
                    <span>Count:</span>
                    <span className="font-mono font-bold">{data.value}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>Share:</span>
                    <span className="font-mono font-bold">{data.percentage}%</span>
                </div>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-6 sticky top-0 z-30 shadow-md border-b-4 border-[#FFC600]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-[#FFC600]">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#FFC600]" /> Network Analytics
                    </h2>
                    <p className="text-slate-400 text-xs">
                        {role === 'mr' ? 'My Territory Analysis' : role === 'dm' ? 'District Team Performance' : role === 'lm' ? 'Regional Performance' : 'Global Admin View'}
                    </p>
                </div>
            </div>
            <button onClick={onBack} className="text-xs font-bold uppercase text-slate-300 hover:text-white border border-slate-600 hover:border-white px-4 py-2 rounded transition-all">
                Close View
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
         <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-4 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                        <Filter className="w-4 h-4 text-[#FFC600]" />
                        <span className="text-xs font-bold uppercase text-slate-500">Slicers:</span>
                    </div>
                    <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold uppercase rounded px-3 py-2 outline-none focus:border-[#FFC600] focus:bg-white transition-colors"
                    >
                        <option value="all">All Time</option>
                        <option value="year">Past Year</option>
                        <option value="90days">Last 90 Days</option>
                        <option value="30days">Last 30 Days</option>
                    </select>

                    <select 
                        value={productFilter} 
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold uppercase rounded px-3 py-2 outline-none focus:border-[#FFC600] focus:bg-white transition-colors"
                    >
                        <option value="all">All Products</option>
                        {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    Records Analyzed: {filteredData.length}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* KPI Cards */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* Monthly Trend Stacked Bar */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FFC600]" /> Product Trend (Monthly)
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px'}}
                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                                {/* Stacked Bars for each product */}
                                {PRODUCTS.map(p => (
                                    <Bar 
                                        key={p.id} 
                                        dataKey={p.id} 
                                        name={p.name}
                                        stackId="a" 
                                        fill={PRODUCT_COLORS[p.id] || PRODUCT_COLORS.default} 
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Product Mix Pie */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#FFC600]" /> Product Share
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
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {productMixData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={PRODUCT_COLORS[entry.id] || COLORS[index % COLORS.length]} 
                                            stroke="none"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    formatter={(value, entry: any) => {
                                        const item = productMixData.find(p => p.name === value);
                                        return <span className="text-xs font-bold text-slate-600 ml-1">{value} ({item?.percentage}%)</span>;
                                    }}
                                />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Prescribers */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 lg:col-span-2">
                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#FFC600]" /> Top 10 Prescribers (Volume)
                    </h4>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={prescriberData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                                <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}} 
                                    contentStyle={{backgroundColor: '#000', color: '#fff', borderRadius: '4px', border: 'none'}} 
                                    itemStyle={{color: '#FFC600'}}
                                />
                                <Bar dataKey="qty" fill="#FFC600" radius={[0, 4, 4, 0]} barSize={24} activeBar={{fill: '#EAB308'}} />
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