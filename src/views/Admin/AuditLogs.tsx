import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const res = await fetch('/api/admin/audit', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch audit records');
        const data = await res.json();
        setLogs(data);
    } catch (e: any) {
        console.error('Failed to load audit logs', e);
        setError(e.message || 'Something went wrong while loading system records.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Decrypting audit stream..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">Audit Logs</h1>
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mt-1">System Security & Activity Records</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB]">Timestamp</th>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB]">Actor</th>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB]">Role</th>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB]">Action</th>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB]">Entity</th>
                <th className="px-6 py-4 font-bold border-b border-[#E5E7EB] w-full">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{log.actorId ? log.actorId.substring(0, 8) + '...' : 'System'}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{log.actorRole || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 bg-gray-100 text-gray-800 text-[10px] uppercase font-bold rounded-md ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                      log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-800' : ''
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{log.entityType}</td>
                  <td className="px-6 py-4 text-gray-500 truncate max-w-sm" title={log.description}>{log.description}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState 
                      title="No records found" 
                      message="System activity logs will appear here as they are generated."
                      icon={ShieldCheck}
                      className="p-0 py-12"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
