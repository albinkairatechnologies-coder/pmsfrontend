'use client';

import { useEffect, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';

export default function IdleWarningModal() {
  const [show, setShow]       = useState(false);
  const [idleMin, setIdleMin] = useState(0);

  useEffect(() => {
    const onWarn = (e: any) => {
      setIdleMin(Math.floor((e.detail?.idleSec || 600) / 60));
      setShow(true);
    };
    const onResume = () => setShow(false);

    window.addEventListener('idle-warning',    onWarn);
    window.addEventListener('activity-resumed', onResume);
    return () => {
      window.removeEventListener('idle-warning',    onWarn);
      window.removeEventListener('activity-resumed', onResume);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-600
                      rounded-2xl shadow-modal p-5 w-80 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
            <FiAlertCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Are you still there?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You've been idle for {idleMin} minute{idleMin !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="btn-primary w-full text-sm py-2"
        >
          Yes, I'm here
        </button>
      </div>
    </div>
  );
}
