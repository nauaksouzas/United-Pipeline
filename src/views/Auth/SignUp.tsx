import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, Button, Input, Select } from '../../components/ui/Common';
import { Logo } from '../../components/Logo';
import { motion, AnimatePresence } from 'motion/react';

export function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    programManagerId: '', coachId: '', pathwayId: '', classIds: [] as string[]
  });
  
  useEffect(() => {
    const e = searchParams.get('email');
    const n = searchParams.get('name');
    if (e || n) {
      setFormData(f => ({
        ...f,
        email: e || f.email,
        name: n || f.name,
      }));
    }
  }, [searchParams]);

  const [options, setOptions] = useState({ pms: [], coaches: [], pathways: [], classes: [] });

  const fetchOptions = async () => {
    const params = new URLSearchParams();
    if (formData.programManagerId) params.append('programManagerId', formData.programManagerId);
    if (formData.pathwayId) params.append('pathwayId', formData.pathwayId);
    const res = await fetch(`/api/signup/options?${params}`, { credentials: "include" });
    if (res.ok) setOptions(await res.json());
  };

  useEffect(() => { fetchOptions(); }, [formData.programManagerId, formData.pathwayId]);

  const handleNext = () => {
    if (step === 1 && formData.password !== formData.confirmPassword) return toast.error('Passwords do not match');
    setStep(s => s + 1);
  };

  const toggleClass = (id: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(id) 
        ? prev.classIds.filter(c => c !== id) 
        : [...prev.classIds, id]
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (formData.classIds.length === 0) return toast.error('Please select at least one class');
    setLoading(true);
    try {
      const res = await fetch('/api/signup', { credentials: "include", 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.removeItem('auth_token');
      
      toast.success('Registration successful!');
      setTimeout(() => { window.location.href = '/dashboard-redirect'; }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const availablePMs = options.pms.map((p: any) => ({ value: p.id, label: p.name }));
  const availableCoaches = options.coaches.map((c: any) => ({ value: c.id, label: c.name }));
  const availablePathways = options.pathways.map((p: any) => ({ value: p.id, label: p.name }));

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#FAFAFA] py-12">
      <div className="max-w-xl w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-4">
            <Logo className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">Student Registration</h1>
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mt-1">Echotrack • KSP DOMINION GROUP</p>
        </div>

        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-2 text-sm font-bold">
               <span className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#FF7A00] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>1</span>
               <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-[#FF7A00]' : 'bg-[#E5E7EB]'}`} />
               <span className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#FF7A00] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>2</span>
               <div className={`w-8 h-1 rounded-full ${step >= 3 ? 'bg-[#FF7A00]' : 'bg-[#E5E7EB]'}`} />
               <span className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#FF7A00] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>3</span>
           </div>
        </div>

        <Card className="p-8 bg-white overflow-hidden relative">
          <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-4">Personal Details</h2>
              <Input label="Full Name" value={formData.name} onChange={v => setFormData(f => ({...f, name: v}))} required />
              <Input label="Email" type="email" value={formData.email} onChange={v => setFormData(f => ({...f, email: v}))} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Password" type="password" value={formData.password} onChange={v => setFormData(f => ({...f, password: v}))} required />
                <Input label="Confirm" type="password" value={formData.confirmPassword} onChange={v => setFormData(f => ({...f, confirmPassword: v}))} required />
              </div>
              <Button onClick={handleNext} className="w-full h-12 text-lg" disabled={!formData.name || !formData.email || !formData.password}>Next Step</Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-4">Program Structure</h2>
              
              <Select 
                label="Program Manager" 
                placeholder="Select Program Manager" 
                options={availablePMs} 
                value={formData.programManagerId} 
                onChange={v => setFormData(f => ({...f, programManagerId: v, coachId: ''}))} 
              />
              {options.pms.length === 0 && <p className="text-red-500 text-xs font-bold">This program isn't ready for enrollment yet.</p>}
              
              <Select 
                label="Coach" 
                placeholder={!formData.programManagerId ? 'Select PM first' : 'Select Coach'} 
                options={availableCoaches} 
                value={formData.coachId} 
                onChange={v => setFormData(f => ({...f, coachId: v}))}
                disabled={!formData.programManagerId} 
              />
              {formData.programManagerId && options.coaches.length === 0 && <p className="text-red-500 text-xs font-bold">No coaches available under this PM.</p>}
              
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleNext} className="flex-1" disabled={!formData.programManagerId || !formData.coachId}>Next Step</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-xl font-bold border-b pb-4">Academic Pathway</h2>
              
              <Select 
                label="Pathway" 
                placeholder="Select Pathway" 
                options={availablePathways} 
                value={formData.pathwayId} 
                onChange={v => setFormData(f => ({...f, pathwayId: v, classIds: []}))} 
              />
              
              <div className="space-y-3 mt-6">
                 <label className="text-sm font-bold text-[#0A0A0A]">Select Classes</label>
                 {!formData.pathwayId ? (
                   <p className="text-sm text-[#6B7280]">Select a pathway to see classes.</p>
                 ) : options.classes.length === 0 ? (
                   <p className="text-sm text-red-500">No classes configured for this pathway.</p>
                 ) : (
                   options.classes.map((c: any) => (
                     <div key={c.id} onClick={() => toggleClass(c.id)} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.classIds.includes(c.id) ? 'border-[#FF7A00] bg-[#FFF4EB]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'}`}>
                        <div className="flex justify-between items-center">
                           <span className="font-bold">{c.name}</span>
                           <span className="text-xs text-[#6B7280]">Inst: {c.instructorName}</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} disabled={loading || !formData.pathwayId || formData.classIds.length === 0} className="flex-1">Complete Registration</Button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
