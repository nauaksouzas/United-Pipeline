import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/ui/Common';
import { toast } from 'sonner';

export function Settings() {
  const [settings, setSettings] = useState<any>({});
  
  useEffect(() => {
    fetch('/api/admin/settings', { credentials: "include" })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(e => console.error('Failed to load settings', e));
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/admin/settings', { 
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        if (res.ok) {
          toast.success('Settings saved successfully');
        } else {
          toast.error('Failed to save settings');
        }
    } catch (e) {
        toast.error('Connection error while saving settings');
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-[#0A0A0A]">Settings</h1>
            <p className="text-[#6B7280] text-[10px] font-bold uppercase tracking-widest mt-1">Application Configuration</p>
         </div>
       </div>

       <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pb-20">
           <Card className="p-6 space-y-4">
             <h2 className="font-bold text-sm mb-4 border-b pb-2 flex items-center justify-between">
                Organization & Branding
                <span className="text-[10px] bg-[#FF7A00]/10 text-[#FF7A00] px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-[#FF7A00]/20">Active</span>
             </h2>
             <Input 
               label="Organization Name" 
               value={settings.organizationName || ''} 
               onChange={v => setSettings({...settings, organizationName: v})}
             />
             <Input 
               label="Product Name" 
               value={settings.productName || ''} 
               onChange={v => setSettings({...settings, productName: v})}
             />
           </Card>

           <Card className="p-6 space-y-4">
             <h2 className="font-bold text-sm mb-4 border-b pb-2 flex items-center justify-between">
                Reporting Cycle
                <span className="text-[10px] bg-[#FF7A00]/10 text-[#FF7A00] px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-[#FF7A00]/20">Active</span>
             </h2>
             <div>
                 <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-1">Weekly Due Day</label>
                 <select className="w-full h-11 px-3 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] outline-none focus:border-[#FF7A00] transition-colors" value={settings.weeklyDueDay || 5} onChange={e => setSettings({...settings, weeklyDueDay: parseInt(e.target.value)})}>
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                 </select>
             </div>
             <Input 
               label="Weekly Due Hour (0-23)" 
               type="number"
               value={settings.weeklyDueHour || 17} 
               onChange={v => setSettings({...settings, weeklyDueHour: v})}
             />
             <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="autoClose" className="rounded border-gray-300 text-[#FF7A00] focus:ring-[#FF7A00]" checked={settings.autoCloseCycles || false} onChange={e => setSettings({...settings, autoCloseCycles: e.target.checked})} />
                <label htmlFor="autoClose" className="text-sm font-medium text-gray-700">Auto-close cycles at due date</label>
             </div>
           </Card>

           <Card className="p-6 space-y-4">
             <h2 className="font-bold text-sm mb-4 border-b pb-2 flex items-center justify-between">
                Alert Thresholds
                <span className="text-[10px] bg-[#FF7A00]/10 text-[#FF7A00] px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-[#FF7A00]/20">Active</span>
             </h2>
             <Input 
               label="Low Energy Trigger (Below X out of 10)" 
               type="number"
               value={settings.alertThresholdEnergy || 3} 
               onChange={v => setSettings({...settings, alertThresholdEnergy: v})}
             />
             <Input 
               label="Low Mood Trigger (Below X out of 10)" 
               type="number"
               value={settings.alertThresholdMood || 3} 
               onChange={v => setSettings({...settings, alertThresholdMood: v})}
             />
             <Input 
               label="Low Attendance Trigger (Below X%)" 
               type="number"
               value={settings.alertThresholdAttend || 70} 
               onChange={v => setSettings({...settings, alertThresholdAttend: v})}
             />
             <Input 
               label="Low Confidence Trigger (Below X out of 10)" 
               type="number"
               value={settings.alertThresholdConf || 3} 
               onChange={v => setSettings({...settings, alertThresholdConf: v})}
             />
           </Card>

           <Card className="p-6 space-y-4 opacity-75 bg-gray-50/50">
             <h2 className="font-bold text-sm mb-4 border-b pb-2 flex justify-between items-center">
                External Integrations
                <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-500 uppercase font-bold tracking-widest border border-gray-300">Coming Soon</span>
             </h2>
             <div className="flex items-center gap-2 mt-4 cursor-not-allowed opacity-50">
                <input type="checkbox" id="outlook" disabled checked={settings.outlookEnabled || false} />
                <label htmlFor="outlook" className="text-sm font-medium text-gray-400">Enable Microsoft Outlook Calendar Sync</label>
             </div>
             <div className="flex items-center gap-2 mt-4 cursor-not-allowed opacity-50">
                <input type="checkbox" id="bright" disabled checked={settings.brightspaceEnabled || false} />
                <label htmlFor="bright" className="text-sm font-medium text-gray-400">Enable Brightspace D2L LMS Sync</label>
             </div>
           </Card>

           <div className="md:col-span-2 pt-6">
             <Button type="submit" className="w-full md:w-auto h-12 px-8">Save Global Configuration</Button>
           </div>
       </form>
    </div>
  );
}
