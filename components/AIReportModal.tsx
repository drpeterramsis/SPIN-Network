import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Delivery } from '../types';
import { formatDateFriendly } from '../utils/time';
import { Sparkles, X, Copy, Check } from 'lucide-react';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveries: Delivery[];
  userEmail: string;
}

export const AIReportModal: React.FC<AIReportModalProps> = ({ isOpen, onClose, deliveries, userEmail }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateReport = async () => {
    setLoading(true);
    try {
      const recentData = deliveries.slice(0, 50).map(d => ({
        date: d.delivery_date,
        product: d.product_id,
        patient_id_masked: d.patient?.national_id ? `***${d.patient.national_id.slice(-3)}` : 'N/A',
        hcp: d.hcp?.full_name || 'Unknown'
      }));

      const prompt = `
        Act as a Supply Chain Analyst for the SPIN (Supply Insulin Pen Network).
        Analyze the following delivery data for the user ${userEmail}.
        
        Data Sample (Last 50 transactions):
        ${JSON.stringify(recentData)}

        Please generate a "Supply Chain & Distribution Report" in Markdown.
        1. **Distribution Summary**: Total volume and most distributed products.
        2. **Prescriber Trends**: Which HCPs are most active?
        3. **Anomalies**: Are there any duplicate patients or unusual patterns?
        4. **Recommendations**: Suggest stock optimization for next week.
        
        Keep it professional, data-driven, and concise.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setReport(response.text || "No analysis generated.");
    } catch (error: any) {
      setReport(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border-t-4 border-[#FFC600] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-black p-5 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <img src="/icon.svg" className="w-8 h-8 rounded border border-slate-800" alt="Logo" />
            <h3 className="font-bold text-xl tracking-tight">SPIN Intelligence</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-[#FFC600] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
          {!report && !loading && (
            <div className="text-center py-12">
              <div className="bg-white w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-md mb-6">
                <Sparkles className="w-10 h-10 text-[#FFC600]" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">AI Distribution Analysis</h4>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">Generate insights on insulin distribution, prescriber activity, and patient reach using Gemini AI.</p>
              <button 
                onClick={generateReport}
                className="bg-black hover:bg-slate-800 text-white px-8 py-3 font-bold uppercase tracking-wide transition-all shadow-lg border-b-4 border-[#FFC600] active:border-0 active:translate-y-1"
              >
                Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-[#FFC600] rounded-full animate-spin mb-6"></div>
              <p className="text-slate-600 font-medium animate-pulse">Analyzing network data...</p>
            </div>
          )}

          {report && !loading && (
            <div className="prose prose-slate max-w-none">
              <div className="bg-white p-8 shadow-sm border border-slate-200">
                {report}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
             <button 
              onClick={onClose}
              className="px-6 py-2 text-slate-600 hover:bg-slate-100 font-bold uppercase text-xs tracking-wider transition-colors"
            >
              Close
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-[#FFC600] hover:bg-yellow-400 text-black px-6 py-2 font-bold uppercase text-xs tracking-wider transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};