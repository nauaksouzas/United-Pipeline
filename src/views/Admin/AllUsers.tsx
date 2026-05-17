import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function AllUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Admin] Fetching user directory...');
        const data = await safeFetch('/api/admin/users');
        console.log('[Admin] Directory loaded');
        setUsers(data);
    } catch (e: any) {
        console.error('Failed to load users', e);
        setError(e.message || 'Something went wrong while fetching user directory.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e: any) => {
    e.preventDefault();
    try {
      console.log(`[Admin] Inviting user: ${inviteEmail}`);
      await safeFetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: 'PROGRAM_MANAGER' })
      });
      toast.success('Program Manager invited');
      setInviteEmail('');
      setInviteName('');
      fetchUsers();
    } catch (err: any) {
      console.error('[Admin] Invite error:', err);
      toast.error(err.message || 'Failed to invite');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const isActive = newStatus === 'ACTIVE';
    try {
      console.log(`[Admin] Updating user status: ${id} to ${newStatus}`);
      await safeFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      toast.success(`User marked ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      console.error('[Admin] Update status error:', err);
      toast.error(err.message || 'Failed to update status');
    }
  };

  const roles = ['ALL', 'PROGRAM_MANAGER', 'COACH', 'INSTRUCTOR', 'STUDENT'];

  const filtered = users.filter(u => 
    (filter === 'ALL' || u.role === filter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">All Users</h1>
           <p className="text-[#6B7280] text-xs uppercase tracking-widest mt-1">Directory</p>
        </div>
        <Button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/signup`)}>
           Copy student signup link
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
          <Card className="p-6 w-full md:w-1/3 h-fit border-[#E5E7EB]">
             <h2 className="font-bold text-[#0A0A0A] mb-2">Invite Staff</h2>
             <p className="text-xs text-[#6B7280] mb-4">Coaches and Instructors are created by Program Managers. Students self-register through the signup link.</p>
             <form onSubmit={handleInvite} className="space-y-3">
                 <Input label="Name" value={inviteName} onChange={setInviteName} required />
                 <Input type="email" label="Email" value={inviteEmail} onChange={setInviteEmail} required />
                 <Button type="submit" className="w-full">Invite Program Manager</Button>
             </form>
          </Card>

          <div className="flex-1 space-y-4">
              <div className="flex gap-4 items-center bg-white p-2 rounded-xl shadow-sm border border-[#E5E7EB]">
                 <div className="flex-1 flex items-center px-4">
                   <Search className="w-4 h-4 text-[#9CA3AF] mr-2" />
                   <input 
                     className="w-full h-10 outline-none text-sm placeholder:text-[#9CA3AF]"
                     placeholder="Search by name or email..."
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                   />
                 </div>
                 <div className="hidden md:flex bg-[#F5F5F5] rounded-lg p-1 overflow-x-auto">
                    {roles.map(r => (
                      <button 
                        key={r}
                        onClick={() => setFilter(r)}
                        className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-md transition-all ${filter === r ? 'bg-white shadow-sm text-[#0A0A0A]' : 'text-[#6B7280]'}`}
                      >
                        {r.replace('_', ' ')}
                      </button>
                    ))}
                 </div>
              </div>
        
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-full">
                        <LoadingState message="Loading directory..." className="py-24" />
                    </div>
                ) : error ? (
                    <div className="col-span-full">
                        <ErrorState message={error} onRetry={fetchUsers} className="py-24" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState 
                          title="No users found" 
                          message={search ? `No users matching "${search}" in ${filter}` : `No users assigned to the role: ${filter}`}
                          icon={UserPlus}
                          className="py-24 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200"
                        />
                    </div>
                ) : (
                    filtered.map(u => (
                      <Card key={u.id} className="p-5 hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-[#FFF4EB] text-[#FF7A00] flex items-center justify-center font-black text-lg">
                                   {u.name[0]?.toUpperCase()}
                                 </div>
                                 <div>
                                   <p className="font-bold text-[#0A0A0A]">{u.name}</p>
                                   <p className="text-xs text-[#6B7280]">{u.email}</p>
                                 </div>
                             </div>
                             <Button variant="outline" className="text-[10px] h-7 px-2" onClick={() => handleToggleStatus(u.id, u.accountStatus)}>
                                {u.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                             </Button>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t border-[#E5E7EB]">
                             <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7280]">{u.role.replace('_', ' ')}</span>
                             {u.accountStatus === 'ACTIVE' && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-600">Active</span>}
                             {u.accountStatus === 'INACTIVE' && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-600">Inactive</span>}
                             {u.accountStatus === 'INVITED' && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-50 text-orange-600">Invited</span>}
                         </div>
                      </Card>
                    ))
                )}
              </div>
          </div>
      </div>
    </div>
  );
}
