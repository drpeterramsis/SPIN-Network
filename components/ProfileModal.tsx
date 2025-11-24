import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { X, User, Shield, Trash2, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user && isSupabaseConfigured() && supabase) {
      setLoading(true);
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
            if (!error) setProfile(data);
            setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isOpen, user]);

  const handleDeleteAccount = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete your account and access. This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
        if (!supabase) throw new Error("Supabase not connected");

        // 1. Call RPC to delete auth user
        const { error } = await supabase.rpc('delete_user');
        
        if (error) throw error;

        // 2. Force logout
        await supabase.auth.signOut();
        onLogout();
    } catch (err: any) {
        console.error(err);
        setError("Could not delete account automatically. You may have associated delivery records preventing deletion. Please contact admin.");
        setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#FFC600]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded border border-slate-800 bg-white flex items-center justify-center text-lg">🖊️</div>
                 <h3 className="text-white font-bold text-lg uppercase tracking-wider">User Profile</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-8">
            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#FFC600]" /></div>
            ) : (
                <div className="space-y-6">
                    
                    {/* ID CARD STYLE */}
                    <div className="bg-slate-50 border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#FFC600] text-black text-[10px] font-bold px-2 py-1 uppercase">
                            {profile?.access === 'yes' ? 'Authorized' : 'Pending'}
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                                <User className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-900 leading-tight">{profile?.full_name || 'Staff Member'}</h4>
                                <p className="text-sm text-slate-500 font-mono">{profile?.employee_id || 'No ID'}</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span className="text-slate-400 uppercase text-xs font-bold">Email</span>
                                <span className="font-medium text-slate-700">{user.email}</span>
                             </div>
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span className="text-slate-400 uppercase text-xs font-bold">Role</span>
                                <span className="font-medium text-slate-700">Network Distributor</span>
                             </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="pt-4 border-t border-slate-100">
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Account Security
                        </h5>
                        
                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs p-3 mb-3 border-l-4 border-red-600">
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="w-full flex items-center justify-center gap-2 border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 py-3 font-bold text-sm uppercase tracking-wide transition-all"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Account
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            This action will remove your profile and login credentials.
                        </p>
                    </div>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};