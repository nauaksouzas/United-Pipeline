import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/ui/Common';
import { useAuth } from '../../hooks/useAuth';
import { safeFetch, downloadFile } from '../../lib/fetchUtils';
import { toast } from 'sonner';
import { 
  ArrowLeft, CheckCircle2, MessageSquare, AlertCircle, 
  Calendar, User, BookOpen, Target, Sparkles, Smile, Zap,
  Activity, Award, FileText
} from 'lucide-react';
import { motion } from 'motion/react';

export function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetch(`/api/reports/${id}`)
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load report');
        setLoading(false);
      });
  }, [id]);

  const handleReview = async () => {
    try {
      await safeFetch(`/api/reports/${id}/review`, { method: 'PATCH' });
      toast.success('Report marked as reviewed');
      setReport({ ...report, status: 'REVIEWED' });
    } catch(e: any) {
      toast.error(e.message || 'Failed to mark as reviewed');
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    try {
      await safeFetch(`/api/reports/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: feedback })
      });
      toast.success('Feedback added');
      setReport({
        ...report,
        coachFeedback: [...(report.coachFeedback || []), { 
          id: Date.now().toString(), 
          feedback: feedback, 
          coach: user, 
          createdAt: new Date().toISOString() 
        }]
      });
      setFeedback('');
    } catch(e: any) {
      toast.error(e.message || 'Failed to add feedback');
    }
  };

  const handleExportPDF = async () => {
    try {
      await downloadFile(`/api/reports/export-pdf?id=${id}`, `Report_${id}.pdf`);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    }
  };

  if (loading) return <div className="p-10 animate-pulse">Loading report details...</div>;
  if (!report) return <div className="p-10 text-center">Report not found.</div>;

  const challenges = JSON.parse(report.challengesTags || '[]');

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">
              Report Detail
            </h1>
            <p className="text-[#6B7280] text-sm">
              Submitted by <span className="font-bold text-gray-900">{report.student?.name}</span> for {report.cycle?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            Export PDF
          </Button>
          {report.status !== 'REVIEWED' && (
            <Button onClick={handleReview} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Mark Reviewed
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white">
               <div className="flex items-center gap-2 text-[#FF7A00] mb-2">
                 <Zap className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Energy</span>
               </div>
               <p className="text-2xl font-black">{report.energy}/10</p>
            </Card>
            <Card className="p-4 bg-white">
               <div className="flex items-center gap-2 text-blue-500 mb-2">
                 <Smile className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Mood</span>
               </div>
               <p className="text-2xl font-black">{report.mood}/10</p>
            </Card>
            <Card className="p-4 bg-white">
               <div className="flex items-center gap-2 text-green-500 mb-2">
                 <Activity className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Attendance</span>
               </div>
               <p className="text-2xl font-black">{report.attendance}%</p>
            </Card>
            <Card className="p-4 bg-white">
               <div className="flex items-center gap-2 text-purple-500 mb-2">
                 <Award className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Confidence</span>
               </div>
               <p className="text-2xl font-black">{report.confidence}/10</p>
            </Card>
          </div>

          {/* Reflections */}
          <Card className="p-8 space-y-6">
             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                  Weekly Topic & Highlights
                </h3>
                <p className="font-bold text-lg text-gray-900 italic">"{report.weeklyTopic}"</p>
                <div className="text-gray-600 whitespace-pre-wrap">{report.academicProgress}</div>
             </div>

             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Challenges & Barriers</h3>
                <div className="flex flex-wrap gap-2">
                   {challenges.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-red-100">{tag}</span>
                   ))}
                </div>
                <p className="text-gray-600 italic">"{report.challengesText || 'No specific challenges noted.'}"</p>
             </div>

             {report.needsSupport && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                   <div className="flex items-center gap-2 text-orange-600 font-bold text-sm mb-2">
                      <AlertCircle className="w-4 h-4" />
                      Support Requested
                   </div>
                   <p className="text-gray-700 text-sm">{report.supportNeeded}</p>
                </div>
             )}

             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Final Reflection</h3>
                <div className="p-4 bg-gray-50 rounded-2xl text-gray-700 italic leading-relaxed">
                  {report.reflection}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Goals for Next Week</h3>
                <p className="text-gray-900 font-medium">{report.goals || 'None set.'}</p>
             </div>
          </Card>

          {/* Class Ratings */}
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#FF7A00]" />
            Student Class Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {report.classRatings?.map((cr: any) => (
                <Card key={cr.id} className="p-6">
                   <h4 className="font-bold text-gray-900 mb-1">{cr.classModel?.name}</h4>
                   <div className="flex items-center justify-between mt-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                        cr.rating === 'EXCEEDING' ? 'bg-green-100 text-green-600' :
                        cr.rating === 'MEETING' ? 'bg-blue-100 text-blue-600' :
                        cr.rating === 'APPROACHING' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {cr.rating}
                      </span>
                   </div>
                </Card>
             ))}
          </div>

          {/* Targeted Answers */}
          {report.targetedAnswers?.length > 0 && (
            <>
              <h2 className="text-xl font-bold flex items-center gap-2 pt-4">
                <Target className="w-6 h-6 text-purple-500" />
                Targeted Question Responses
              </h2>
              <div className="space-y-4">
                 {report.targetedAnswers.map((ta: any) => (
                    <Card key={ta.id} className="p-6 bg-white">
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Question</p>
                       <p className="font-bold text-gray-900 mb-4">{ta.question?.question}</p>
                       <p className="text-gray-600 bg-gray-50 p-4 rounded-xl italic">"{ta.answer}"</p>
                    </Card>
                 ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Actions & Feedback */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-24">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Staff Review & Feedback
            </h3>

            {/* Existing Feedback */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-2">
               {report.coachFeedback?.map((fb: any) => (
                 <div key={fb.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-xs font-bold text-gray-900">{fb.coach?.name}</span>
                       <span className="text-[10px] text-gray-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-transparent group-hover:border-gray-100 transition-colors">
                       {fb.feedback}
                    </div>
                 </div>
               ))}
               {!report.coachFeedback?.length && (
                 <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No feedback yet.</p>
                 </div>
               )}
            </div>

            <div className="space-y-3">
               <textarea 
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-[#FF7A00] transition-all resize-none"
                  placeholder="Type feedback for the student..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
               />
               <Button className="w-full" onClick={submitFeedback} disabled={!feedback.trim()}>
                 Add Feedback
               </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Student Context</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold">
                    {report.student?.name?.[0]}
                 </div>
                 <div>
                    <p className="text-sm font-bold">{report.student?.name}</p>
                    <p className="text-[10px] text-gray-400">{report.student?.email}</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4">
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Pathway:</span>
                    <span className="font-bold">{report.student?.studentProfile?.pathway?.name || 'N/A'}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Coach:</span>
                    <span className="font-bold">{report.student?.studentProfile?.coach?.name || 'N/A'}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Prog. Manager:</span>
                    <span className="font-bold">{report.student?.studentProfile?.programManager?.name || 'N/A'}</span>
                 </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
