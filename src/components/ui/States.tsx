import React from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Common';

export const LoadingState = ({ message = "Loading data...", className = "" }: { message?: string; className?: string }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center space-y-4 ${className}`}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="text-[#ff6b00]"
    >
      <Loader2 className="w-10 h-10" />
    </motion.div>
    <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">{message}</p>
  </div>
);

export const ErrorState = ({ 
  message = "Something went wrong while fetching data.", 
  onRetry, 
  className = "" 
}: { 
  message?: string; 
  onRetry?: () => void; 
  className?: string 
}) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center space-y-6 ${className}`}>
    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
      <AlertCircle className="w-8 h-8" />
    </div>
    <div className="space-y-2">
      <h3 className="text-lg font-black text-gray-900">Oops!</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">{message}</p>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    )}
  </div>
);

export const EmptyState = ({ 
  title = "No data found", 
  message = "There's nothing to show here yet.", 
  action,
  icon: Icon = Inbox,
  className = "" 
}: { 
  title?: string; 
  message?: string; 
  action?: React.ReactNode;
  icon?: any;
  className?: string 
}) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center space-y-6 ${className}`}>
    <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[2rem] flex items-center justify-center border border-dashed border-gray-200">
      <Icon className="w-10 h-10" />
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-black text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{message}</p>
    </div>
    {action && (
      <div className="pt-2">
        {action}
      </div>
    )}
  </div>
);

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
);
