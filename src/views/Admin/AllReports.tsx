import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';

export function AllReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string>('ALL');

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Admin] Fetching all reports...');
        const data = await safeFetch('/api/admin/reports');
        console.log('[Admin] Reports loaded');
        setReports(data);
    } catch (e: any) {
        console.error('Failed to load reports', e);
        setError(e.message || 'Error occurred while loading reports.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReview = async (id: string, currentStatus: string) => {
     if (currentStatus === 'REVIEWED') return;
     try {
       await safeFetch(`/api/reports/${id}/review`, { method: 'PATCH' });
       toast.success('Marked as reviewed');
       // Refresh list silently
       const data = await safeFetch('/api/admin/reports');
       setReports(data);
     } catch(e: any) {
       toast.error(e.message || 'Error updating status');
     }
  };

  if (loading) return <LoadingState message="Loading global reports..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchReports} className="min-h-[400px]" />;

  const visibleReports = filterMode === 'ALL' ? reports : reports.filter(r => r.status === filterMode);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
         <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">All Reports</h1>
            <p className="text-[#6B7280] text-xs uppercase tracking-widest mt-1">Cross-Pathways Repository</p>
         </div>
         <div className="flex gap-2 bg-[#F5F5F5] p-1 rounded-lg">
            <button onClick={() => setFilterMode('ALL')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filterMode === 'ALL' ? 'bg-white shadow text-[#0A0A0A]' : 'text-[#6B7280]'}`}>All</button>
            <button onClick={() => setFilterMode('SUBMITTED')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filterMode === 'SUBMITTED' ? 'bg-white shadow text-[#0A0A0A]' : 'text-[#6B7280]'}`}>Needs Review</button>
            <button onClick={() => setFilterMode('REVIEWED')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${filterMode === 'REVIEWED' ? 'bg-white shadow text-[#0A0A0A]' : 'text-[#6B7280]'}`}>Reviewed</button>
         </div>
       </div>
       
       <div className="space-y-4">
          {visibleReports.map((r: any) => (
            <Card key={r.id} className="p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
               <div>
                  <p className="font-bold text-[#0A0A0A]">{r.student?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[#6B7280]">{new Date(r.submittedAt).toLocaleDateString()}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.status === 'REVIEWED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                         {r.status}
                      </span>
                      <p className="text-xs text-[#6B7280] ml-2">Cycle: {r.cycle?.name}</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Link to={`/admin/reports/${r.id}`}>
                    <Button variant="outline" className="text-xs px-3 h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Review Detail</Button>
                 </Link>
                 <Button variant="outline" className="text-xs px-3 h-8" onClick={() => window.location.href = `/api/reports/export-pdf?id=${r.id}`}>PDF</Button>
               </div>
            </Card>
          ))}
          {visibleReports.length === 0 && (
            <EmptyState 
              title="No reports found" 
              message={filterMode === 'ALL' ? "No reports have been submitted to the system yet." : `No reports found with status: ${filterMode}`}
              icon={FileSearch}
              className="py-12"
            />
          )}
       </div>
    </div>
  );
}
