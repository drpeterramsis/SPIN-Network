
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Shield, User, CheckCircle2, XCircle, Search, Save, Loader2, Network, Briefcase, AlertCircle } from 'lucide-react';

interface AdminPanelProps {
  profiles: UserProfile[];
  onUpdate: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ profiles, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // Group profiles for manager assignment dropdowns
  const dms = profiles.filter(p => p.role === 'dm');
  const lms = profiles.filter(p => p.role === 'lm');

  const handleUpdate = async (id: string, updates: Partial<UserProfile>) => {
      setUpdatingId(id);
      setErrorId(null);
      try {
          await dataService.updateProfile(id, updates);
          // Artificial delay to ensure DB propagation before refresh
          setTimeout(() => {
              onUpdate(); 
          }, 500);
      } catch (e) {
          console.error("Update failed", e);
          setErrorId(id);
          setTimeout(() => setErrorId(null), 3000);
      } finally {
          setTimeout(() => setUpdatingId(null), 500);
      }
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case 'admin': return <span className="bg-black text-[#FFC600] px-2 py-1 rounded text-[10px] font-bold uppercase border border-[#FFC600]">Admin</span>;
          case 'lm': return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-[10px] font-bold uppercase border border-purple-200">Line Mgr</span>;
          case 'dm': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold uppercase border border-blue-200">District Mgr</span>;
          default: return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-slate-200">Med Rep</span>;
      }
  };

  const filteredProfiles = profiles.filter(p => 
      (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.corporate_email && p.corporate_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white shadow-sm border border-slate-200 animate-in fade-in rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#FFC600]" /> Admin Control Panel
                </h3>
                <p className="text-slate-500 text-xs mt-1">Manage user access, roles, and hierarchy assignments.</p>
            </div>
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Search Users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 text-sm focus:border-[#FFC600] outline-none bg-white rounded-lg shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                    <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Assigned Manager</th>
                        <th className="px-6 py-4">System Access</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredProfiles.map(user => {
                        const isUpdating = updatingId === user.id;
                        const isError = errorId === user.id;
                        return (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{user.full_name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{user.employee_id}</div>
                                            <div className="text-[10px] text-slate-400">{user.corporate_email || user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2">
                                        {getRoleBadge(user.role)}
                                        {user.role !== 'admin' && (
                                            <select 
                                                value={user.role}
                                                onChange={(e) => handleUpdate(user.id, { role: e.target.value as UserRole, manager_id: null })}
                                                className="text-xs border p-1 rounded bg-white outline-none focus:border-[#FFC600]"
                                                disabled={isUpdating}
                                            >
                                                <option value="mr">Med Rep</option>
                                                <option value="dm">District Mgr</option>
                                                <option value="lm">Line Mgr</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'admin' && <span className="text-xs text-slate-400 italic">Global Access</span>}
                                    {user.role === 'lm' && <span className="text-xs text-slate-400 italic">Top Level</span>}
                                    
                                    {/* DM Assignments */}
                                    {user.role === 'dm' && (
                                        <div className="flex items-center gap-2">
                                            <Network className="w-4 h-4 text-slate-400" />
                                            <select
                                                value={user.manager_id || ''}
                                                onChange={(e) => handleUpdate(user.id, { manager_id: e.target.value || null })}
                                                className="text-xs border p-2 rounded bg-white outline-none focus:border-[#FFC600] w-full max-w-[180px]"
                                                disabled={isUpdating}
                                            >
                                                <option value="">-- No Manager --</option>
                                                {lms.map(lm => (
                                                    <option key={lm.id} value={lm.id}>{lm.full_name} (LM)</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* MR Assignments */}
                                    {user.role === 'mr' && (
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-slate-400" />
                                            <select
                                                value={user.manager_id || ''}
                                                onChange={(e) => handleUpdate(user.id, { manager_id: e.target.value || null })}
                                                className="text-xs border p-2 rounded bg-white outline-none focus:border-[#FFC600] w-full max-w-[180px]"
                                                disabled={isUpdating}
                                            >
                                                <option value="">-- No Manager --</option>
                                                {dms.map(dm => (
                                                    <option key={dm.id} value={dm.id}>{dm.full_name} (DM)</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleUpdate(user.id, { access: user.access === 'yes' ? 'no' : 'yes' })}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${user.access === 'yes' ? 'bg-[#FFC600]' : 'bg-slate-200'}`}
                                            disabled={isUpdating || user.corporate_email === 'admin@spin.com'}
                                            title="Toggle Access"
                                        >
                                            <span 
                                                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-200 ease-in-out mt-1 ml-1 ${user.access === 'yes' ? 'translate-x-6' : 'translate-x-0'}`} 
                                            />
                                        </button>
                                        <span className={`text-xs font-bold uppercase ${user.access === 'yes' ? 'text-green-600' : 'text-slate-400'}`}>
                                            {user.access === 'yes' ? 'Active' : 'Pending'}
                                        </span>
                                        {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                        {isError && <AlertCircle className="w-3 h-3 text-red-500" title="Update failed - Check console" />}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredProfiles.length === 0 && (
                <div className="p-12 text-center text-slate-400">No users found matching search.</div>
            )}
        </div>
    </div>
  );
};
