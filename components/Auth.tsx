import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Loader2, AlertCircle, Hexagon, X } from 'lucide-react';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured()) {
      // DEMO LOGIN
      setTimeout(() => {
        onLogin({ id: 'demo-user', email: email || 'demo@spin-net.com' });
        setLoading(false);
        onClose();
      }, 800);
      return;
    }

    try {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
            onLogin(data.user);
            onClose();
        }
    } catch (err: any) {
        setError(err.message || 'Authentication failed.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#FFC600] relative animate-in fade-in zoom-in duration-200">
        
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-black p-2"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-black p-8 text-center relative overflow-hidden">
          <div className="mx-auto bg-[#FFC600] w-12 h-12 flex items-center justify-center mb-3 transform rotate-45">
            <Hexagon className="text-black w-8 h-8 -rotate-45 fill-current" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">SPIN ACCESS</h2>
          <p className="text-[#FFC600] mt-2 text-xs font-bold tracking-widest uppercase">Authorized Personnel Only</p>
        </div>

        <div className="p-8">
            {!isSupabaseConfigured() && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-3 text-yellow-800 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p><strong>Demo Mode:</strong> Database not connected.</p>
                </div>
            )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] focus:ring-1 focus:ring-[#FFC600] outline-none transition-all font-medium"
                placeholder="user@spin.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] focus:ring-1 focus:ring-[#FFC600] outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 p-3 border-l-4 border-red-600 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFC600] hover:bg-yellow-400 text-black font-bold py-3 uppercase tracking-wide transition-colors flex items-center justify-center shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};