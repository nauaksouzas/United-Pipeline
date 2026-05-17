import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { useAuth } from '../../hooks/useAuth';
import { FileText, BookOpen, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ classes: [], ratings: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Instructor] Fetching dashboard data...');
        const [dashData, reportsData] = await Promise.all([
          safeFetch('/api/instructor/dashboard'),
          safeFetch('/api/instructor/reports')
        ]);
        
        console.log('[Instructor] Dashboard data received');
        setData({ ...dashData, reports: reportsData });
    } catch (e: any) {
        console.error('Failed to load Instructor dashboard', e);
        setError(e.message || 'Something went wrong while loading your dashboard.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Fetching your teaching overview..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Instructor Dashboard</h1>
        <p className="text-[#6B7280] text-sm mt-1">Monitor your classes and student feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-xl flex items-center justify-center">
                 <BookOpen className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">My Classes</p>
                 <p className="text-2xl font-black">{data.classes.length}</p>
              </div>
           </div>
        </Card>
        
        <Card className="p-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F0FDF4] text-[#16A34A] rounded-xl flex items-center justify-center">
                 <Star className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Feedback Loop</p>
                 <p className="text-2xl font-black">{data.reports.length}</p>
              </div>
           </div>
        </Card>
      </div>

      <Card className="p-6">
         <h2 className="text-xl font-bold border-b pb-4 mb-4">Relevant Student Reports</h2>
         <p className="text-xs text-gray-400 mb-6 font-medium italic">Showing reports where your classes were rated by students.</p>
         <div className="space-y-3">
            {data.reports.slice(0, 10).map((r: any) => (
              <div key={r.id} className="p-4 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#D1D5DB] transition-all flex justify-between items-center">
                 <div>
                    <p className="font-bold">{r.student?.name}</p>
                    <p className="text-xs text-[#6B7280]">{r.cycle?.name} • Submitted {new Date(r.submittedAt || r.createdAt).toLocaleDateString()}</p>
                 </div>
                 <Link to={`/instructor/reports/${r.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                        View <ArrowRight className="w-4 h-4" />
                    </Button>
                 </Link>
              </div>
            ))}
            {data.reports.length === 0 && (
                <EmptyState 
                  title="No Student Feedback" 
                  message="Reports where students verify your classes will appear here." 
                  className="py-12"
                />
            )}
         </div>
      </Card>
    </div>
  );
}
