import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, Inbox } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Dashboard] Fetching student session and reports...');
        const [meData, reportsData] = await Promise.all([
          safeFetch('/api/student/me'),
          safeFetch('/api/student/reports')
        ]);
        
        console.log('[Dashboard] Data received successfully');
        setMe(meData);
        setReports(reportsData);
    } catch (e: any) {
        console.error('Failed to load student dashboard', e);
        setError(e.message || 'Something went wrong while loading your dashboard.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Preparing your workspace..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;

  const currentReport = me?.currentReport;
  const currentCycle = me?.currentCycle;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-[#6B7280] text-sm mt-1">Here is your academic progress overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {currentCycle ? (
            <Card className="p-6 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] text-white">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <h2 className="text-xl font-bold">{currentCycle.name}</h2>
                     <p className="text-xs text-gray-400">Due: {new Date(currentCycle.endDate).toLocaleDateString()}</p>
                  </div>
                  {currentReport?.status === 'SUBMITTED' ? (
                     <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider">Submitted</div>
                  ) : currentReport?.status === 'DRAFT' ? (
                     <div className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-[10px] font-bold uppercase tracking-wider">Draft</div>
                  ) : (
                     <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider">Open</div>
                  )}
               </div>
               
               <p className="text-sm text-gray-300 mb-6">
                  {currentReport?.status === 'SUBMITTED' 
                     ? "You've successfully submitted your report for this cycle. Your coach will review it soon."
                     : currentReport?.status === 'DRAFT'
                     ? "You have an unfinished report for this cycle. Resume where you left off."
                     : "It's time to submit your weekly progress report for your coach."
                  }
               </p>

               {currentReport?.status !== 'SUBMITTED' && (
                  <Link to="/student/report">
                     <Button className="bg-[#FF7A00] hover:bg-[#E66D00] border-transparent text-white w-full sm:w-auto">
                     {currentReport?.status === 'DRAFT' ? 'Resume Wizard' : 'Start Wizard'}
                     </Button>
                  </Link>
               )}
            </Card>
         ) : (
            <Card className="p-6 bg-gray-50 border-dashed border-2 flex flex-col items-center justify-center text-center">
               <Clock className="w-10 h-10 text-gray-300 mb-2" />
               <p className="text-sm font-bold text-gray-400">No active report cycle</p>
            </Card>
         )}
         
         <Card className="p-6 bg-white border-[#E5E7EB]">
            <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-gray-400">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-2xl font-black">{reports.filter(r => r.status === 'SUBMITTED').length}</p>
                  <p className="text-xs text-gray-500">Reports Submitted</p>
               </div>
               <div>
                  <p className="text-2xl font-black">{me?.studentProfile?.classEnrollments?.length || 0}</p>
                  <p className="text-xs text-gray-500">Active Classes</p>
               </div>
            </div>
         </Card>
      </div>

      <h2 className="text-xl font-bold border-b pb-4 mt-8">Past Reports</h2>
      <div className="space-y-4">
         {reports.length === 0 ? (
            <EmptyState 
              title="First cycle?" 
              message="Your submitted progress reports will appear here for your records."
              className="py-12"
            />
         ) : (
           reports.map(r => (
             <Card key={r.id} className="p-5 flex justify-between items-center transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-[#F5F5F5] rounded-xl text-[#6B7280]">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="font-bold">{r.cycle?.name || 'Weekly Report'}</p>
                      <p className="text-xs text-[#6B7280]">
                        {r.status === 'REVIEWED' ? (
                           <span className="text-green-600 font-medium">Reviewed</span>
                        ) : (
                           <span>Submitted on {new Date(r.submittedAt || r.createdAt).toLocaleDateString()}</span>
                        )}
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="text-xs px-3 h-8" onClick={() => window.location.href = `/api/reports/export-pdf?id=${r.id}`}>PDF</Button>
                  <Button variant="outline" className="text-xs px-3 h-8" onClick={() => window.location.href = `/api/reports/export-docx?id=${r.id}`}>DOCX</Button>
                </div>
             </Card>
           ))
         )}
      </div>
    </div>
  );
}
