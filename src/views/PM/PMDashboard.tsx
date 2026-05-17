import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { useAuth } from '../../hooks/useAuth';
import { Users, AlertTriangle, FileText, ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PMDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ students: [], alerts: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[PM] Loading dashboard data...');
        const [dashData, reportsData] = await Promise.all([
          safeFetch('/api/pm/dashboard'),
          safeFetch('/api/pm/reports')
        ]);
        
        console.log('[PM] Dashboard data received');
        setData({ ...dashData, reports: reportsData });
    } catch (e: any) {
        console.error('Failed to load PM dashboard', e);
        setError(e.message || 'Something went wrong while loading your dashboard.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Fetching PM insights..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Program Manager</h1>
        <p className="text-[#6B7280] text-sm mt-1">Manage your active students and respond to critical alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-xl flex items-center justify-center">
                 <Users className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Students</p>
                 <p className="text-2xl font-black">{data.students.length}</p>
              </div>
           </div>
        </Card>
        
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FEF2F2] text-[#DC2626] rounded-xl flex items-center justify-center">
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Alerts</p>
                 <p className="text-2xl font-black">{data.alerts.length}</p>
              </div>
           </div>
        </Card>

        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FFF4EB] text-[#FF7A00] rounded-xl flex items-center justify-center">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Submitted</p>
                 <p className="text-2xl font-black">{data.reports.length}</p>
              </div>
           </div>
        </Card>

        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F0FDF4] text-[#16A34A] rounded-xl flex items-center justify-center">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Reviewed</p>
                 <p className="text-2xl font-black">{data.reports.filter((r:any) => r.status === 'REVIEWED').length}</p>
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
           <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">Critical Alerts</h2>
              <Link to="/pm/alerts" className="text-xs text-[#FF7A00] font-bold hover:underline">View All</Link>
           </div>
           {data.alerts.length === 0 ? (
             <EmptyState 
               title="Clear Horizon" 
               message="No critical student alerts requiring your attention right now." 
               icon={Bell}
               className="py-12"
             />
           ) : (
             <div className="space-y-4">
               {data.alerts.map((a: any) => (
                 <div key={a.id} className="p-4 rounded-xl border border-red-200 bg-red-50 flex justify-between items-start">
                    <div>
                       <p className="font-bold text-red-700">{a.student.name}</p>
                       <p className="text-sm text-red-600">{a.description}</p>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </Card>

        <Card className="p-6">
           <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">Recent Reports</h2>
              <Link to="/pm/reports" className="text-xs text-[#FF7A00] font-bold hover:underline">View All</Link>
           </div>
           <div className="space-y-3">
              {data.reports.slice(0, 5).map((r: any) => (
                <div key={r.id} className="p-4 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#D1D5DB] transition-all flex justify-between items-center">
                   <div>
                      <p className="font-bold">{r.student?.name}</p>
                      <p className="text-xs text-[#6B7280]">{new Date(r.submittedAt || r.createdAt).toLocaleDateString()} • {r.status}</p>
                   </div>
                   <Link to={`/pm/reports/${r.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                   </Link>
                </div>
              ))}
              {data.reports.length === 0 && (
                <EmptyState 
                  title="No Reports" 
                  message="No student reports have been submitted for your cohorts yet." 
                  className="py-12"
                />
              )}
           </div>
        </Card>
      </div>
    </div>
  );
}
