'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrincipalRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/principal/dashboard');
  }, [router]);

  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  );
}
