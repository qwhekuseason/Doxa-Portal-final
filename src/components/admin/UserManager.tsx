import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { UserProfile } from '../../types';
import { AdminTable } from './AdminCommon';
import { Download, AlertTriangle, Loader2, Eye, Trash2, X, Phone, Building2, Calendar } from 'lucide-react';

export const AdminUserManager: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [updatingUid, setUpdatingUid] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collection(db, 'users'));
            const snapshot = await getDocs(q);
            setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile)));
        } catch (e: any) {
            console.error("Error fetching users:", e);
            setError(e.message || "Failed to fetch users. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const updateRole = async (targetUid: string, newRole: string) => {
        if (targetUid === auth.currentUser?.uid && newRole !== 'admin') {
            if (!confirm("Caution: You are changing your OWN role. If you proceed, you will lose admin privileges and will be logged out of this dashboard immediately. Continue?")) return;
        }

        setUpdatingUid(targetUid);
        try {
            const userRef = doc(db, 'users', targetUid);
            console.log(`Attempting to update user ${targetUid} to role ${newRole}`);

            await updateDoc(userRef, {
                role: newRole,
                updatedAt: new Date().toISOString()
            });

            alert(`Success! Account role updated to ${newRole.toUpperCase()}. The change has been committed to Firestore.`);
            await fetchUsers();
        } catch (e: any) {
            console.error("Critical Error updating role:", e);
            alert(`Update Failed!\n\nReason: ${e.message}\n\nPlease check if you are logged in with the correct Admin account.`);
        } finally {
            setUpdatingUid(null);
        }
    };

    const deleteUserRecord = async (uid: string, displayName: string) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete the account for ${displayName}? This action cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const getRoleBadgeStyle = (role?: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'publicity': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'prayer': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white font-serif">User Management</h3>
                <button
                    onClick={async () => {
                        const confirmExport = confirm("Choose export format:\nOK for Excel (XLSX)\nCancel for PDF Document");
                        const headers = ["Name", "Email", "Role", "Phone", "Hostel"];
                        const excelData = users.map(u => ({
                            Name: u.displayName,
                            Email: u.email,
                            Role: u.role,
                            Phone: u.phoneNumber || 'N/A',
                            Hostel: u.hostelName || 'N/A'
                        }));
                        const pdfData = users.map(u => [
                            u.displayName,
                            u.email,
                            u.role || 'member',
                            u.phoneNumber || 'N/A',
                            u.hostelName || 'N/A'
                        ]);

                        const utils = await import('../../utils/exportUtils');
                        if (confirmExport) {
                            utils.exportToExcel(excelData, `User_Registry_${new Date().toISOString().slice(0, 10)}`);
                        } else {
                            utils.exportToPDF(headers, pdfData, `User_Registry_${new Date().toISOString().slice(0, 10)}`, "Doxa Portal - Member Registry");
                        }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-church-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-church-green/20"
                >
                    <Download size={14} /> Export Users
                </button>
            </div>
            {
                error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                        <AlertTriangle size={20} />
                        <span className="font-bold text-sm">{error}</span>
                        <button onClick={fetchUsers} className="ml-auto text-xs underline">Retry</button>
                    </div>
                )
            }
            {
                loading ? (
                    <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-church-green" size={40} /></div>
                ) : users.length === 0 ? (
                    <div className="p-20 text-center bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-gray-400 font-bold">No active user sessions detected.</p>
                    </div>
                ) : (
                    <AdminTable headers={['User', 'Email', 'Role', 'Actions']}>
                        {users.map(u => (
                            <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" alt="" />
                                    <span className="font-bold text-gray-900 dark:text-white">{u.displayName}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getRoleBadgeStyle(u.role)}`}>
                                        {u.role}
                                    </span>
                                    {updatingUid === u.uid && <Loader2 size={12} className="inline animate-spin ml-2 text-church-green" />}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedUser(u)}
                                            className="p-2 text-church-green hover:bg-church-green/10 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <select
                                            value={u.role}
                                            disabled={updatingUid === u.uid}
                                            onChange={(e) => updateRole(u.uid, e.target.value)}
                                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-church-green cursor-pointer mr-2 disabled:opacity-50"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="publicity">Publicity</option>
                                            <option value="prayer">Prayer</option>
                                        </select>
                                        <button
                                            onClick={() => deleteUserRecord(u.uid, u.displayName)}
                                            disabled={updatingUid === u.uid}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Remove User Record"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </AdminTable>
                )
            }

            {/* User Detail Modal */}
            {
                selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                            {/* Modal Header/Hero */}
                            <div className="relative h-32 bg-gradient-to-r from-church-green to-emerald-900">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="relative px-8 pb-10">
                                {/* Avatar Overlap */}
                                <div className="absolute -top-12 left-8">
                                    <img
                                        src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}`}
                                        className="w-24 h-24 rounded-3xl border-4 border-white dark:border-gray-900 shadow-xl object-cover"
                                        alt=""
                                    />
                                </div>

                                <div className="pt-16">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{selectedUser.displayName}</h2>
                                            <p className="text-gray-500 font-medium">{selectedUser.email}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-church-green/10 text-church-green border-church-green/20'}`}>
                                            {selectedUser.role}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-2">Biographical</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                                    <Phone size={16} className="text-church-green" />
                                                    <span className="text-sm font-bold">{selectedUser.phoneNumber || 'No phone added'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                                    <Building2 size={16} className="text-church-gold" />
                                                    <span className="text-sm font-bold">{selectedUser.hostelName || 'No residence added'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                                    <Calendar size={16} className="text-blue-500" />
                                                    <span className="text-sm font-bold">{selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : 'No birth date'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-2">Platform Activity</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.sessionsViewed || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sessions</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.quizzesTaken || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Quizzes</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.versesHighlighted || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Highlights</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.quizPoints || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">XP Points</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-12 flex justify-end">
                                        <button
                                            onClick={() => deleteUserRecord(selectedUser.uid, selectedUser.displayName)}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            <Trash2 size={16} /> Remove User Record
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
