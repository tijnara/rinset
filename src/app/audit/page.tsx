import { Suspense } from 'react';
import { AuditView } from '@/features/audit';

export default function AuditPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
                    Loading audit...
                </div>
            }
        >
            <AuditView />
        </Suspense>
    );
}