
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Loader2, AlertCircle, Hexagon, X, CheckCircle2, Eye, EyeOff, User, Briefcase, Network } from 'lucide-react';
import { UserRole } from '../types';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ isOpen, onClose, onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<UserRole>('mr');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (!isSupabaseConfigured()) {
      // DEMO MODE
      setTimeout(() => {
        if (isSignUp) {
            setSuccessMsg("Registration successful. Your account is pending approval from an administrator.");
            setLoading(false);
            setIsSignUp(false);
        } else {
            // Mock Login
            const isAdmin = email === 'admin@spin.com';
            onLogin({ 
                id: 'demo-user', 
                email: email || 'demo@spin-net.com',
                user_metadata: { role: isAdmin ? 'admin' : 'mr' } 
            });
            setLoading(false);
            onClose();
        }
      }, 800);
      return;
    }

    try {
        if (!supabase) throw new Error("Supabase client not initialized");

        // SPECIAL HANDLING FOR ADMIN REGISTRATION
        const isAdminEmail = email.toLowerCase() === 'admin@spin.com';

        if (isSignUp) {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error("Registration failed");

            // 2. Determine Role & Access
            // If it's the hardcoded admin email, force Admin role and Yes access.
            // Otherwise, use the selected role and Pending access.
            const finalRole = isAdminEmail ? 'admin' : role;
            const finalAccess = isAdminEmail ? 'yes' : 'pending';

            // 3. Create Profile with Role
            const { error: profileError } = await supabase.from('profiles').insert([
                {
                    id: authData.user.id,
                    full_name: fullName,
                    employee_id: employeeId,
                    corporate_email: email,
                    role: finalRole,
                    access: finalAccess
                }
            ]);

            if (profileError) {
                console.error("Profile creation error:", profileError);
                // Note: If user already exists in Auth but not in Profile, this might fail or need upsert.
                // We use insert here. If it fails, we might need to check why.
            }

            if (isAdminEmail) {
                setSuccessMsg("Admin account created and auto-approved. Please Login.");
            } else {
                setSuccessMsg("Registration successful. Please wait for admin approval (Status: Pending).");
            }
            
            setIsSignUp(false); 
        } else {
            // 1. Login
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                if (isAdminEmail && (error.message.includes('Invalid login') || error.message.includes('Email not confirmed'))) {
                   throw new Error("Admin account not found or password incorrect. If this is your first time, please click 'Register New Account' to initialize the Admin user.");
                }
                throw error;
            }
            
            if (data.user) {
                // 2. Check Access
                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();
                
                if (profileFetchError && profileFetchError.code !== 'PGRST116') {
                     throw profileFetchError;
                }

                // Recovery: If Admin logs in but has no profile (rare case), create it
                if (isAdminEmail && !profile) {
                     await supabase.from('profiles').insert([{
                         id: data.user.id,
                         full_name: 'Super Admin',
                         employee_id: 'ADMIN-001',
                         corporate_email: 'admin@spin.com',
                         role: 'admin',
                         access: 'yes'
                     }]);
                     // Proceed to login
                } else if (profile) {
                    const hasAccess = profile.access === 'yes' || profile.role === 'admin';
                    if (!hasAccess) {
                        await supabase.auth.signOut();
                        throw new Error("Access denied. Your account is pending approval by an administrator.");
                    }
                }

                onLogin(data.user);
                onClose();
            }
        }
    } catch (err: any) {
        setError(err.message || 'Authentication failed.');
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setError('');
      setSuccessMsg('');
      setShowPassword(false);
      setRole('mr'); // Reset to default
      
      // Auto-fill for admin convenience if typing admin email
      if (email === 'admin@spin.com') {
         setFullName('Super Admin');
         setEmployeeId('ADMIN-001');
      }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
        onClick={onClose}
    >
      <div 
        className="max-w-md w-full bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#FFC600] relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-black p-2 z-10"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-black p-8 text-center relative overflow-hidden">
          <div className="mx-auto bg-[#FFC600] w-12 h-12 flex items-center justify-center mb-3 transform rotate-45">
            <Hexagon className="text-black w-8 h-8 -rotate-45 fill-current" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">SPIN ACCESS</h2>
          <p className="text-[#FFC600] mt-2 text-xs font-bold tracking-widest uppercase">
            {isSignUp ? 'Staff Registration' : 'Authorized Personnel Only'}
          </p>
        </div>

        <div className="p-8">
            {!isSupabaseConfigured() && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-3 text-yellow-800 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p><strong>Demo Mode:</strong> Database not connected.</p>
                </div>
            )}

            {successMsg && (
                 <div className="mb-6 bg-green-50 border border-green-200 p-3 flex items-start gap-3 text-green-800 text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p>{successMsg}</p>
                </div>
            )}

          <form onSubmit={handleAuth} className="space-y-5">
            
            {isSignUp && (
                <>
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] outline-none transition-all font-medium"
                        placeholder="John Doe"
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee ID</label>
                    <input
                        type="text"
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] outline-none transition-all font-medium"
                        placeholder="EMP-12345"
                    />
                    </div>
                    
                    {email !== 'admin@spin.com' && (
                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Role</label>
                        <div className="grid grid-cols-1 gap-2">
                            <label className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${role === 'mr' ? 'border-[#FFC600] bg-yellow-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="role" value="mr" checked={role === 'mr'} onChange={() => setRole('mr')} className="accent-black w-4 h-4" />
                                <div className="flex-1">
                                    <span className="block text-sm font-bold text-slate-900">Medical Representative (MR)</span>
                                    <span className="text-xs text-slate-500">Distribution & Delivery</span>
                                </div>
                                <Briefcase className="w-4 h-4 text-slate-400" />
                            </label>
                            <label className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${role === 'dm' ? 'border-[#FFC600] bg-yellow-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="role" value="dm" checked={role === 'dm'} onChange={() => setRole('dm')} className="accent-black w-4 h-4" />
                                <div className="flex-1">
                                    <span className="block text-sm font-bold text-slate-900">District Manager (DM)</span>
                                    <span className="text-xs text-slate-500">Manages MR Team</span>
                                </div>
                                <User className="w-4 h-4 text-slate-400" />
                            </label>
                             <label className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${role === 'lm' ? 'border-[#FFC600] bg-yellow-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="role" value="lm" checked={role === 'lm'} onChange={() => setRole('lm')} className="accent-black w-4 h-4" />
                                <div className="flex-1">
                                    <span className="block text-sm font-bold text-slate-900">Line Manager (LM)</span>
                                    <span className="text-xs text-slate-500">Regional Oversight</span>
                                </div>
                                <Network className="w-4 h-4 text-slate-400" />
                            </label>
                        </div>
                        </div>
                    )}
                </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Corporate Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] outline-none transition-all font-medium"
                placeholder="user@spin.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FFC600] outline-none transition-all font-medium pr-12"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
                isSignUp ? 'Submit Registration' : 'Login to Dashboard'
              )}
            </button>

            <div className="pt-2 border-t border-slate-100 text-center">
                <button 
                    type="button"
                    onClick={toggleMode}
                    className="text-xs font-bold text-slate-400 hover:text-black uppercase tracking-wider"
                >
                    {isSignUp ? 'Back to Login' : 'Register New Account'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
