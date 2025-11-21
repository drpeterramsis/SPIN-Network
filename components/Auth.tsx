import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Loader2, AlertCircle, Hexagon } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured()) {
      // DEMO LOGIN
      setTimeout(() => {
        onLogin({ id: 'demo-user', email: email || 'demo@spin-net.com' });
        setLoading(false);
      }, 800);
      return;
    }

    try {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onLogin(data.user);
    } catch (err: any) {
        setError(err.message || 'Authentication failed.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#FFC600]">
        
        {/* Header */}
        <div className="bg-black p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#FFC600]"></div>
          <div className="mx-auto bg-[#FFC600] w-16 h-16 flex items-center justify-center mb-4 transform rotate-45">
            <Hexagon className="text-black w-10 h-10 -rotate-45 fill-current" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter">SPIN</h2>
          <p className="text-[#FFC600] mt-2 text-sm font-bold tracking-widest uppercase">Supply Insulin Pen Network</p>
        </div>

        <div className="p-8">
            {!isSupabaseConfigured() && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-3 text-yellow-800 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p><strong>Demo Mode:</strong> Database not connected. Using local browser storage.</p>
                </div>
            )}

          <form onSubmit={handleAuth} className="space-y-6">
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
              <div className="text-red-600 text-sm bg-red-50 p-3 border-l-4 border-red-600">
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
                'Access Network'
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">Restricted Access System</p>
            <p className="text-[10px] text-slate-300 mt-1">© 2025 Supply Insulin Pen Network</p>
          </div>
        </div>
      </div>
    </div>
  );
};
