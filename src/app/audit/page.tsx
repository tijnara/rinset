import { Suspense } from 'react';
import { AuditView } from '@/features/audit';
import { RoleGuard } from '@/features/auth';

export default function AuditPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
                    Loading audit...
                </div>
            }
        >
            <RoleGuard
                allowedRole="owner"
                fallbackTitle="Owner PIN Required"
                fallbackSubtitle="Z-Reading and Daily Cash Audit are restricted to Store Owners."
            >
                <AuditView />
            </RoleGuard>
        </Suspense>
    );
}