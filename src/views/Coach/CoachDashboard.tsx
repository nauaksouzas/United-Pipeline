import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { useAuth } from '../../hooks/useAuth';
import { Users, FileText, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CoachDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ students: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Coach] Loading dashboard data...');
        const [dashData, reportsData] = await Promise.all([
          safeFetch('/api/coach/dashboard'),
          safeFetch('/api/coach/reports')
        ]);
        
        console.log('[Coach] Dashboard data received');
        setData({ ...dashData, reports: reportsData });
    } catch (e: any) {
        console.error('Failed to load Coach dashboard', e);
        setError(e.message || 'Something went wrong while loading your dashboard.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Fetching coach analytics..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Coach Dashboard</h1>
        <p className="text-[#6B7280] text-sm mt-1">Review student progress and scheduled follow-ups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-xl flex items-center justify-center">
                 <Users className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">My Cohort</p>
                 <p className="text-2xl font-black">{data.students.length}</p>
              </div>
           </div>
        </Card>
        
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F0FDF4] text-[#16A34A] rounded-xl flex items-center justify-center">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Pending Review</p>
                 <p className="text-2xl font-black">{data.reports.filter((r:any) => r.status === 'SUBMITTED').length}</p>
              </div>
           </div>
        </Card>

        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FEF2F2] text-[#DC2626] rounded-xl flex items-center justify-center">
                 <Target className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">High Priority</p>
                 <p className="text-2xl font-black">{data.reports.filter((r:any) => r.needsSupport && r.status === 'SUBMITTED').length}</p>
              </div>
           </div>
        </Card>
      </div>

      <Card className="p-6">
         <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold">Weekly Performance Reports</h2>
            <Link to="/coach/reports" className="text-xs text-[#FF7A00] font-bold hover:underline">View History</Link>
         </div>
         <div className="space-y-4">
            {data.reports.slice(0, 10).map((r: any) => (
              <div key={r.id} className="p-5 border border-[#E5E7EB] rounded-xl bg-white flex justify-between items-center transition-all hover:border-[#FF7A00]">
                 <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {r.student.name}
                      {r.needsSupport && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase font-bold rounded">Needs Support</span>}
                      {r.status === 'REVIEWED' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded">Reviewed</span>}
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-1">
                        Topic: <span className="text-gray-900">{r.weeklyTopic || 'No topic specified'}</span> • Cycle: {r.cycle?.name}
                    </p>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(r.submittedAt || r.createdAt).toLocaleDateString()}</span>
                    <Link to={`/coach/reports/${r.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                            Review <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                 </div>
              </div>
            ))}
            {data.reports.length === 0 && (
                <EmptyState 
                  title="No reports to review" 
                  message="Student reports will appear here once they are submitted for the current cycle."
                  className="py-12"
                />
            )}
         </div>
      </Card>
    </div>
  );
}
