import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { safeFetch, downloadFile } from '../../lib/fetchUtils';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, Edit3 } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/student/reports', { credentials: 'include' }).then(res => res.ok ? res.json() : Promise.reject(new Error('Unable to load reports'))),
      fetch('/api/student/me', { credentials: 'include' }).then(res => res.ok ? res.json() : Promise.reject(new Error('Unable to load current cycle')))
    ])
      .then(([reportData, profileData]) => {
        setReports(reportData);
        setProfile(profileData);
      })
      .catch(err => setError(err.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const currentReport = profile?.currentReport;
  const currentCycle = profile?.currentCycle;
  const reportStatus = currentReport?.status || 'DUE';
  const actionLabel = currentReport?.status === 'DRAFT' ? 'Resume Draft' : 'Start Wizard';
  const statusIcon = currentReport?.status === 'REVIEWED' ? CheckCircle2 : currentReport?.status === 'DRAFT' ? Edit3 : Clock;
  const StatusIcon = statusIcon;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-[#6B7280] text-sm mt-1">Here is your academic progress overview.</p>
      </div>

      {error && <Card className="p-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}
      {loading && <Card className="p-4 text-sm text-[#6B7280]">Loading your report status...</Card>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="p-6 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">Weekly Report</h2>
                  <p className="text-sm text-gray-300 mb-4">{currentCycle ? currentCycle.name : 'No open cycle'}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  <StatusIcon className="w-4 h-4" />
                  {reportStatus}
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-6">
                {currentCycle
                  ? currentReport?.status === 'SUBMITTED' || currentReport?.status === 'REVIEWED'
                    ? 'Your report has been submitted for this cycle.'
                    : currentReport?.status === 'DRAFT'
                      ? 'You have an in-progress draft ready to finish.'
                      : 'It is time to submit your weekly progress report for your coach.'
                  : 'There is not an open report cycle right now.'}
              </p>
              <Link to="/student/report">
                 <Button className="bg-[#FF7A00] hover:bg-[#E66D00] border-transparent text-white w-full sm:w-auto" disabled={!currentCycle || currentReport?.status === 'SUBMITTED' || currentReport?.status === 'REVIEWED'}>
                   {actionLabel}
                 </Button>
              </Link>
           </Card>
        </div>
      )}

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
                      <p className="text-xs text-[#6B7280]">{r.submittedAt ? `Submitted on ${new Date(r.submittedAt).toLocaleDateString()}` : `Draft updated ${new Date(r.updatedAt).toLocaleDateString()}`}</p>
                   </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="text-xs px-3 h-8" onClick={() => handleExportPDF(r.id)}>PDF</Button>
                  <Button variant="outline" className="text-xs px-3 h-8" onClick={() => handleExportDOCX(r.id)}>DOCX</Button>
                </div>
             </Card>
           ))
         )}
      </div>
    </div>
  );
}
