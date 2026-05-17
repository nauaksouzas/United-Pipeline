import { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui/Common';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { safeFetch } from '../../lib/fetchUtils';
import { motion } from 'motion/react';
import { Users, FileText, Activity, Bell, Calendar, BookOpen, Target, Sparkles } from 'lucide-react';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('[Admin] Fetching Global Analytics...');
        const json = await safeFetch('/api/admin/analytics');
        console.log('[Admin] Analytics loaded');
        setData(json);
    } catch (e: any) {
        console.error('Failed to load admin analytics', e);
        setError(e.message || 'Something went wrong while loading analytics.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Aggregating global analytics..." className="min-h-[400px]" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} className="min-h-[400px]" />;
  if (!data) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Admin Dashboard</h1>
          <p className="text-[#6B7280] text-sm mt-1 uppercase tracking-widest font-bold">Executive Reporting Overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-full">
           <div className="w-2 h-2 bg-[#FF7A00] rounded-full animate-pulse" />
           <span className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest">Live Updates Active</span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-white border-[#E5E7EB] hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-[#EFF6FF] text-[#2563EB] rounded-xl group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Active Students</p>
                <p className="text-2xl font-black tracking-tight mt-1">{data.totalActiveUsers || 0}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12"><Users className="w-16 h-16" /></div>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-white border-[#E5E7EB] hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-[#F0FDF4] text-[#16A34A] rounded-xl group-hover:scale-110 transition-transform"><FileText className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Cycle Submissions</p>
                <p className="text-2xl font-black tracking-tight mt-1">{data.submittedReportsThisCycle || 0}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12"><FileText className="w-16 h-16" /></div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 bg-white border-[#E5E7EB] hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-[#FFF4EB] text-[#FF7A00] rounded-xl group-hover:scale-110 transition-transform"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Response Rate</p>
                <p className="text-2xl font-black tracking-tight mt-1">{data.submissionRate || 0}%</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-[#FF7A00]/20">
               <div className="h-full bg-[#FF7A00]" style={{ width: `${data.submissionRate || 0}%` }} />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 bg-white border-[#E5E7EB] hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-[#FEF2F2] text-[#DC2626] rounded-xl group-hover:scale-110 transition-transform"><Bell className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest font-bold">Unresolved Alerts</p>
                <p className="text-2xl font-black tracking-tight mt-1 text-red-600">{data.activeAlerts || 0}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12"><Bell className="w-16 h-16" /></div>
          </Card>
        </motion.div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="p-8">
            <h3 className="font-bold text-sm text-[#0A0A0A] border-b border-[#E5E7EB] pb-4 mb-8 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Class Performance Distribution
            </h3>
            <div className="space-y-6">
               {data.classPerformance?.overall ? Object.entries(data.classPerformance.overall).map(([label, count]: any, idx: number) => {
                  const total = Object.values(data.classPerformance.overall).reduce((a:any,b:any) => a+b, 0) as number;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                     <div key={label} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                           <span className="flex items-center gap-1.5">
                               <div className={`w-2 h-2 rounded-full ${
                                    label === 'EXCEEDING' ? 'bg-green-500' :
                                    label === 'MEETING' ? 'bg-blue-500' :
                                    label === 'APPROACHING' ? 'bg-orange-500' :
                                    'bg-red-500'
                               }`} />
                               {label.replace('_', ' ')}
                           </span>
                           <span>{count} Students ({Math.round(percent)}%)</span>
                        </div>
                        <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percent}%` }}
                             transition={{ delay: 0.5 + (idx * 0.1), duration: 0.8 }}
                             className={`h-full rounded-full ${
                                label === 'EXCEEDING' ? 'bg-green-500' :
                                label === 'MEETING' ? 'bg-blue-500' :
                                label === 'APPROACHING' ? 'bg-orange-500' :
                                'bg-red-500'
                             }`} 
                           />
                        </div>
                     </div>
                  );
               }) : (
                 <div className="py-20 text-center text-gray-300 text-xs italic">Insufficient data for distribution chart</div>
               )}
            </div>
         </Card>
         
         <Card className="p-8">
            <h3 className="font-bold text-sm text-[#0A0A0A] border-b border-[#E5E7EB] pb-4 mb-8 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FF7A00]" />
                Daily Submission Volume (7 Days)
            </h3>
            <div className="h-64 flex items-end justify-between gap-3 px-4 pb-4">
               {data.submissionTrend?.map((t: any, idx: number) => {
                  const max = Math.max(...data.submissionTrend.map((x:any) => x.count)) || 1;
                  const heightPercent = (t.count / max) * 100;
                  return (
                    <div key={t.date} className="flex-1 group relative flex flex-col items-center h-full justify-end">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${heightPercent}%` }}
                         transition={{ delay: 0.2 + (idx * 0.05), duration: 0.5 }}
                         className="w-full bg-[#FF7A00] rounded-t-xl transition-all hover:bg-[#FF7A00]/80 cursor-help relative"
                       >
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20 font-black">
                            {t.count} REPORTS
                         </div>
                       </motion.div>
                       <div className="text-[10px] text-gray-400 mt-4 truncate text-center font-black uppercase tracking-tighter w-full overflow-hidden">
                          {new Date(t.date).toLocaleDateString(undefined, {weekday: 'short'})}
                       </div>
                    </div>
                  );
               })}
               {(!data.submissionTrend || data.submissionTrend.length === 0) && (
                  <div className="w-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                    <FileText className="w-12 h-12 text-gray-200 mb-4" />
                    <div className="text-gray-300 text-xs italic">No data available for trend analysis</div>
                  </div>
               )}
            </div>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="p-8 group hover:border-blue-200 transition-colors">
            <h3 className="font-bold text-xs uppercase tracking-widest text-[#6B7280] mb-4 flex items-center justify-between">
                Staffing Overview
                <Users className="w-4 h-4 text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-4xl font-black tracking-tighter text-gray-900">{data.totalStaff || 0}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">Active Program Managers & Coaches</p>
         </Card>
         <Card className="p-8 group hover:border-[#FF7A00]/20 transition-colors">
            <h3 className="font-bold text-xs uppercase tracking-widest text-[#6B7280] mb-4 flex items-center justify-between">
                Academic Scope
                <BookOpen className="w-4 h-4 text-[#FF7A00] opacity-20 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-4xl font-black tracking-tighter text-gray-900">{data.totalClasses || 0}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">Mapped Classes across all Pathways</p>
         </Card>
         <Card className="p-8 group hover:border-purple-200 transition-colors">
            <h3 className="font-bold text-xs uppercase tracking-widest text-[#6B7280] mb-4 flex items-center justify-between">
                Communities
                <Activity className="w-4 h-4 text-purple-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-4xl font-black tracking-tighter text-gray-900">{data.totalCommunities || 0}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">Active Student Groups</p>
         </Card>
      </div>
      
      <Card className="p-8">
         <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-6 mb-6">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF7A00]" />
                Recent System Activity
            </h3>
            <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-widest">View Audit Logs</Button>
         </div>
         <div className="space-y-6">
             {data.recentActivity && data.recentActivity.length > 0 ? data.recentActivity.map((log: any, idx: number) => (
                 <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (idx * 0.05) }}
                    key={log.id} 
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100"
                 >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-900">{log.action}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{log.description}</p>
                    </div>
                 </motion.div>
             )) : (
                 <div className="py-20 text-center text-gray-300 text-sm italic">No system activity recorded in the last 24 hours</div>
             )}
         </div>
      </Card>
    </div>
  );
}
