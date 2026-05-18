import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input } from '../../components/ui/Common';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type EnrolledClass = {
  id: string;
  name: string;
  schedule?: string | null;
  instructor?: { name?: string | null } | null;
};

type TargetedQuestion = {
  id: string;
  question: string;
};

const defaultFormData = {
  energy: 5,
  mood: 5,
  attendance: 100,
  confidence: 5,
  weeklyTopic: '',
  highlights: '',
  academicProgress: '',
  classExperience: '',
  events: '',
  upcomingEvents: '',
  challengesTags: [] as string[],
  challengesText: '',
  needsSupport: false,
  supportNeeded: '',
  reflection: '',
  goals: ''
};

export function StudentReportWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [targetedQuestions, setTargetedQuestions] = useState<TargetedQuestion[]>([]);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [classRatings, setClassRatings] = useState<Record<string, string>>({});
  const [targetedAnswers, setTargetedAnswers] = useState<Record<string, string>>({});

  const totalSteps = targetedQuestions.length > 0 ? 7 : 6;
  const supportStep = targetedQuestions.length > 0 ? 6 : 5;
  const reflectionStep = targetedQuestions.length > 0 ? 7 : 6;

  useEffect(() => {
    fetch('/api/student/report-context', { credentials: 'include' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load report context');
        return data;
      })
      .then(data => {
        setClasses(data.classes || []);
        setTargetedQuestions(data.targetedQuestions || []);
        setCurrentCycle(data.currentCycle || null);
        setCurrentReport(data.currentReport || null);

        if (data.currentReport) {
          const report = data.currentReport;
          setFormData({
            ...defaultFormData,
            ...Object.fromEntries(
              Object.keys(defaultFormData).map(key => [key, report[key] ?? (defaultFormData as any)[key]])
            ),
            challengesTags: safeParseTags(report.challengesTags)
          });
          setClassRatings(Object.fromEntries((report.classRatings || []).map((rating: any) => [rating.classId, rating.rating])));
          setTargetedAnswers(Object.fromEntries((report.targetedAnswers || []).map((answer: any) => [answer.questionId, answer.answer])));
        }
      })
      .catch(err => toast.error(err.message || 'Failed to load report details'))
      .finally(() => setContextLoading(false));
  }, []);

  const isSubmitted = currentReport?.status === 'SUBMITTED' || currentReport?.status === 'REVIEWED';
  const hasRequiredClassRatings = classes.length === 0 || Object.keys(classRatings).length === classes.length;
  const hasRequiredTargetedAnswers = useMemo(
    () => targetedQuestions.every(q => (targetedAnswers[q.id] || '').trim().length > 0),
    [targetedAnswers, targetedQuestions]
  );

  const handleNext = () => setStep(s => Math.min(totalSteps, s + 1));
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const buildPayload = (status: 'DRAFT' | 'SUBMITTED') => ({
    ...formData,
    challengesTags: JSON.stringify(formData.challengesTags),
    classRatings: Object.entries(classRatings).map(([classId, rating]) => ({ classId, rating })),
    targetedAnswers,
    status
  });

  const saveReport = async (status: 'DRAFT' | 'SUBMITTED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(status))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report save failed');
      setCurrentReport((previous: any) => ({ ...(previous || {}), id: data.id, status }));
      toast.success(status === 'DRAFT' ? 'Draft saved. You can resume it later.' : 'Report submitted successfully!');
      if (status === 'SUBMITTED') setTimeout(() => { window.location.href = '/student'; }, 1000);
    } catch(e: any) {
      toast.error(e.message || (status === 'DRAFT' ? 'Failed to save draft' : 'Failed to submit report'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex items-center justify-center p-20">Loading wizard...</div>;

  const performanceLabels = ['EXCEEDING', 'MEETING', 'APPROACHING', 'BEGINNING'];

  if (contextLoading) {
    return <Card className="max-w-3xl mx-auto mt-8 p-8 text-sm text-[#6B7280]">Loading your current report cycle, classes, and questions...</Card>;
  }

  if (!currentCycle) {
    return (
      <Card className="max-w-3xl mx-auto mt-8 p-8">
        <h1 className="text-2xl font-black mb-2">No open report cycle</h1>
        <p className="text-sm text-[#6B7280]">There is not an open reporting cycle for your pathway right now. Check back when your program team opens the next cycle.</p>
      </Card>
    );
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-3xl mx-auto mt-8 p-8">
        <h1 className="text-2xl font-black mb-2">Report already submitted</h1>
        <p className="text-sm text-[#6B7280]">Your report for {currentCycle.name} is {currentReport.status.toLowerCase()}. You can view it from your dashboard or export a copy.</p>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
         <div>
           <h1 className="text-3xl font-black font-display tracking-tight text-[#0A0A0A]">Weekly Report</h1>
           <p className="text-[#6B7280] text-sm mt-1">Reflect on your progress for {currentCycle.name} and share updates with your coach.</p>
         </div>
         <Button variant="outline" onClick={() => saveReport('DRAFT')} disabled={loading}>{loading ? 'Saving...' : 'Save Draft'}</Button>
      </div>

      <div className="flex gap-2 mb-8">
         {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-[#FF7A00]' : 'bg-[#E5E7EB]'}`} />
         ))}
      </div>

      <Card className="p-8 bg-white min-h-[400px]">
         <AnimatePresence mode="wait">
            {step === 1 && (
               <motion.div key="s1" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Check-In</h2>
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-bold block mb-2">Energy this week (1-10)</label>
                        <input type="range" min="1" max="10" value={formData.energy} onChange={e => setFormData(f => ({...f, energy: Number(e.target.value)}))} className="w-full accent-[#FF7A00]" />
                        <div className="text-center font-bold text-[#FF7A00]">{formData.energy}</div>
                     </div>
                     <div>
                        <label className="text-sm font-bold block mb-2">Mood (1-10)</label>
                        <input type="range" min="1" max="10" value={formData.mood} onChange={e => setFormData(f => ({...f, mood: Number(e.target.value)}))} className="w-full accent-[#FF7A00]" />
                        <div className="text-center font-bold text-[#FF7A00]">{formData.mood}</div>
                     </div>
                     <Input label="What's the main thing you want to discuss with your coach this week?" value={formData.weeklyTopic} onChange={(v: string) => setFormData(f => ({...f, weeklyTopic: v}))} required />
                  </div>
                  <div className="flex justify-end pt-4"><Button onClick={handleNext}>Next Step</Button></div>
               </motion.div>
            )}

            {step === 2 && (
               <motion.div key="s2" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Classes Performance</h2>
                  <div className="space-y-8">
                     {classes.length === 0 && <p className="text-sm text-[#6B7280]">No active class enrollments are attached to your profile yet. You can still continue this report.</p>}
                     {classes.map(c => (
                        <div key={c.id} className="p-4 border rounded-xl">
                            <div className="mb-4">
                              <h3 className="font-bold">{c.name}</h3>
                              <p className="text-xs text-[#6B7280]">{c.instructor?.name || 'Instructor unassigned'}{c.schedule ? ` • ${c.schedule}` : ''}</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                               {performanceLabels.map(l => (
                                  <button
                                    key={l}
                                    type="button"
                                    onClick={() => setClassRatings(r => ({...r, [c.id]: l}))}
                                    className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${classRatings[c.id] === l ? 'border-[#FF7A00] bg-[#FFF4EB] text-[#FF7A00]' : 'border-transparent bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
                                  >
                                     {l}
                                  </button>
                               ))}
                            </div>
                        </div>
                     ))}
                  </div>
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext} disabled={!hasRequiredClassRatings}>Next Step</Button>
                  </div>
               </motion.div>
            )}

            {step === 3 && (
               <motion.div key="s3" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Targeted Questions</h2>
                  {questions.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No specific questions for you this cycle.</div>
                  ) : (
                    <div className="space-y-6">
                       {questions.map(q => (
                         <div key={q.id}>
                            <label className="text-sm font-bold block mb-2">{q.question}</label>
                            <textarea 
                                className="w-full h-24 p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl outline-none" 
                                value={targetedAnswers[q.id] || ''} 
                                onChange={e => setTargetedAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                            />
                         </div>
                       ))}
                    </div>
                  )}
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext}>Next Step</Button>
                  </div>
               </motion.div>
            )}
            
            {step === 4 && (
               <motion.div key="s4" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Progress & Events</h2>
                  <Input label="What did you work on or learn this week?" value={formData.academicProgress} onChange={(v: string) => setFormData(f => ({...f, academicProgress: v}))} />
                  <Input label="What important events happened this week?" value={formData.events} onChange={(v: string) => setFormData(f => ({...f, events: v}))} />
                  <Input label="What upcoming events, deadlines, or meetings should your coach know about?" value={formData.upcomingEvents} onChange={(v: string) => setFormData(f => ({...f, upcomingEvents: v}))} required />
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext}>Next Step</Button>
                  </div>
               </motion.div>
            )}

            {step === 5 && (
               <motion.div key="s5" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Challenges</h2>
                  <div className="flex flex-wrap gap-2">
                     {['Academic', 'Personal', 'Health', 'Time Management', 'Financial', 'Technology'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFormData(f => ({
                             ...f,
                             challengesTags: f.challengesTags.includes(tag) ? f.challengesTags.filter(t => t !== tag) : [...f.challengesTags, tag]
                          }))}
                          className={`px-4 py-2 rounded-full text-sm font-bold border ${formData.challengesTags.includes(tag) ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white text-[#6B7280] hover:bg-[#F5F5F5]'}`}
                        >
                           {tag}
                        </button>
                     ))}
                  </div>
                  <Input label="Describe any specific challenges" value={formData.challengesText} onChange={(v: string) => setFormData(f => ({...f, challengesText: v}))} />
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext}>Next Step</Button>
                  </div>
               </motion.div>
            )}

            {targetedQuestions.length > 0 && step === 5 && (
               <motion.div key="s5q" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Staff Questions</h2>
                  <p className="text-sm text-[#6B7280]">Your program team assigned these questions for the current report cycle.</p>
                  <div className="space-y-4">
                    {targetedQuestions.map(q => (
                      <div key={q.id}>
                        <label className="text-sm font-bold mb-2 block">{q.question}</label>
                        <textarea className="w-full h-24 p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl outline-none" value={targetedAnswers[q.id] || ''} onChange={e => setTargetedAnswers(a => ({ ...a, [q.id]: e.target.value }))} required />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext} disabled={!hasRequiredTargetedAnswers}>Next Step</Button>
                  </div>
               </motion.div>
            )}

            {step === supportStep && (
               <motion.div key="s-support" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Support</h2>
                  <div className="flex items-center gap-4 p-4 border rounded-xl">
                     <input type="checkbox" className="w-5 h-5 accent-[#FF7A00]" checked={formData.needsSupport} onChange={e => setFormData(f => ({...f, needsSupport: e.target.checked}))} />
                     <span className="font-bold">I need support from my coach or PM this week.</span>
                  </div>
                  {formData.needsSupport && (
                     <Input label="What kind of support do you need?" value={formData.supportNeeded} onChange={(v: string) => setFormData(f => ({...f, supportNeeded: v}))} required />
                  )}
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <Button onClick={handleNext}>Next Step</Button>
                  </div>
               </motion.div>
            )}

            {step === reflectionStep && (
               <motion.div key="s-reflection" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="space-y-6">
                  <h2 className="text-xl font-bold border-b pb-4">Goals & Reflection</h2>
                  <div className="space-y-4">
                    <div>
                       <label className="text-sm font-bold mb-2 block">Write your closing reflection in 3-5 sentences.</label>
                       <textarea className="w-full h-32 p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl outline-none" value={formData.reflection} onChange={e => setFormData(f => ({...f, reflection: e.target.value}))} required />
                    </div>
                    <Input label="Goals for next week" value={formData.goals} onChange={(v: string) => setFormData(f => ({...f, goals: v}))} />
                  </div>
                  <div className="flex justify-between pt-4">
                     <Button variant="outline" onClick={handleBack}>Back</Button>
                     <div className="flex gap-3">
                       <Button variant="outline" onClick={() => saveReport('DRAFT')} disabled={loading}>{loading ? 'Saving...' : 'Save Draft'}</Button>
                       <Button onClick={() => {
                          if(window.confirm('Are you sure you want to submit this report? You cannot edit it after submission.')) {
                              saveReport('SUBMITTED');
                          }
                       }} disabled={loading || !hasRequiredClassRatings || !hasRequiredTargetedAnswers}>{loading ? 'Submitting...' : 'Submit Report'}</Button>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </Card>
    </div>
  );
}

function safeParseTags(tags: string | string[] | null | undefined) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
