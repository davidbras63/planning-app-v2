'use client';

import { useEffect, useState } from 'react';
import { checkAccessAction } from '@/app/actions/checkAccess';
import { useRouter } from 'next/navigation';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function verify() {
            try {
                const { hasAccess } = await checkAccessAction();
                setIsAllowed(hasAccess);
                if (!hasAccess) {
                    router.push('/acces-refuse');
                }
            } catch (error) {
                setIsAllowed(false);
                router.push('/acces-refuse');
            }
        }
        verify();
    }, [router]);

    // Tant que le statut n'est pas vérifié côté client, on ne rend rien du tout (zéro conflit SSR)
    if (isAllowed === null) {
        return null;
    }

    if (!isAllowed) {
        return null; 
    }

    return <>{children}</>;
}
