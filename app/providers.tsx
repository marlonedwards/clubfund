'use client';

import { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'viem/chains';

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
      chain={baseSepolia}
      config={{
        appearance: {
          name: 'Clubfund',
          logo: '/logo.png',
          mode: 'auto',
          theme: 'default',
        },
        wallet: {
          display: 'modal',
        },
      }}
    >
      {props.children}
    </OnchainKitProvider>
  );
}