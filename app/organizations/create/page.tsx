'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { useRouter } from 'next/navigation';
import { encodeFunctionData } from 'viem';

// Import ABI and addresses
import { CONTRACT_ADDRESSES } from '@/utils/contracts';

// This would be imported from your artifacts or a separate file
const organizationFactoryABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "mission", "type": "string" }
    ],
    "name": "createOrganization",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default function CreateOrganization() {
  const { address } = useAccount();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mission: '',
  });

  // Real contract call function
  const createOrganizationCall = async () => {
    // Encode the function data
    const data = encodeFunctionData({
      abi: organizationFactoryABI,
      functionName: 'createOrganization',
      args: [formData.name, formData.description, formData.mission]
    });
    
    // Return the contract call information
    return [{
      to: CONTRACT_ADDRESSES.organizationFactory as `0x${string}`,
      data: data,
    }];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSuccess = () => {
    router.push('/organizations');
  };

  if (!address) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-xl mb-4">Please connect your wallet to create an organization.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Create a New Organization</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            ></textarea>
          </div>
          
          <div className="mb-6">
            <label htmlFor="mission" className="block text-sm font-medium text-gray-700 mb-1">
              Mission Statement
            </label>
            <textarea
              id="mission"
              name="mission"
              value={formData.mission}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            ></textarea>
          </div>
          
          <Transaction
            calls={createOrganizationCall}
            isSponsored={true}
            onSuccess={handleSuccess}
          >
            <TransactionButton text="Create Organization" />
          </Transaction>
        </div>
      </div>
    </main>
  );
}