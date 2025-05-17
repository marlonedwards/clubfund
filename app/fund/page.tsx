'use client';

import { Navigation } from '@/components/Navigation';
import { FundCard } from '@coinbase/onchainkit/fund';
import { useAccount } from 'wagmi';

export default function FundPage() {
  const { address } = useAccount();

  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Add Funds to Your Wallet</h1>
        
        {address ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <FundCard 
              assetSymbol="ETH"
              country="US"
              currency="USD"
            />
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-lg mb-4">Please connect your wallet to add funds.</p>
          </div>
        )}
      </div>
    </main>
  );
}