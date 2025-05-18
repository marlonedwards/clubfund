'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { useState, useEffect, Suspense } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  publicClient, 
  CONTRACT_ADDRESSES, 
  organizationFactoryABI,
  fundingPoolABI,
  getOrganizations
} from '@/utils/contracts';
import { encodeFunctionData } from 'viem';

// Component to handle search params with Suspense
function CampaignForm() {
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organizationId: searchParams.get('organization') || '',
    goal: '',
    deadline: '',
    fundingType: 'GENERAL',
    expenseItems: [''],
    expenseAmounts: [''],
  });

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const result = await getOrganizations(0, 20);
        if (result.organizations.length > 0) {
          setOrganizations(result.organizations.map(org => ({
            id: org.address,
            name: org.name
          })));
        }
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  const createCampaignCall = async () => {
    if (!formData.organizationId) return [];

    // Convert deadline to Unix timestamp
    const deadlineDate = formData.deadline ? new Date(formData.deadline) : new Date();
    const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);

    // Convert funding type to enum value
    const fundingTypeMap: {[key: string]: number} = {
      'GENERAL': 0,
      'EVENT': 1,
      'TRAVEL': 2
    };

    // Convert expense amounts to BigInt
    const expenseAmountsBigInt = formData.expenseAmounts
      .filter(amount => amount.trim() !== '')
      .map(amount => BigInt(Math.floor(parseFloat(amount) * 100))); // Convert to cents
    
    // Filter out empty expense items
    const expenseItemsFiltered = formData.expenseItems.filter(item => item.trim() !== '');

    const data = encodeFunctionData({
      abi: fundingPoolABI,
      functionName: 'createCampaign',
      args: [
        formData.name,
        formData.description,
        BigInt(Math.floor(parseFloat(formData.goal) * 100)), // Convert to cents
        BigInt(deadlineTimestamp),
        fundingTypeMap[formData.fundingType],
        expenseItemsFiltered,
        expenseAmountsBigInt
      ]
    });
    
    return [{
      to: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
      data,
    }];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExpenseItemChange = (index: number, value: string) => {
    const updatedItems = [...formData.expenseItems];
    updatedItems[index] = value;
    setFormData(prev => ({ ...prev, expenseItems: updatedItems }));
  };

  const handleExpenseAmountChange = (index: number, value: string) => {
    const updatedAmounts = [...formData.expenseAmounts];
    updatedAmounts[index] = value;
    setFormData(prev => ({ ...prev, expenseAmounts: updatedAmounts }));
  };

  const addExpenseRow = () => {
    setFormData(prev => ({
      ...prev,
      expenseItems: [...prev.expenseItems, ''],
      expenseAmounts: [...prev.expenseAmounts, ''],
    }));
  };

  const removeExpenseRow = (index: number) => {
    if (formData.expenseItems.length <= 1) return;
    
    const updatedItems = [...formData.expenseItems];
    const updatedAmounts = [...formData.expenseAmounts];
    updatedItems.splice(index, 1);
    updatedAmounts.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      expenseItems: updatedItems,
      expenseAmounts: updatedAmounts,
    }));
  };

  const handleSuccess = () => {
    router.push('/campaigns');
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl mb-4">Please connect your wallet to create a campaign.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create a Funding Campaign</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
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
          <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">
            Organization
          </label>
          <select
            id="organizationId"
            name="organizationId"
            value={formData.organizationId}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            disabled={isLoading}
          >
            <option value="">Select an organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          {isLoading && <p className="text-sm text-gray-500 mt-1">Loading organizations...</p>}
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
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
              Goal Amount (USD)
            </label>
            <input
              type="number"
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              min="1"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="fundingType" className="block text-sm font-medium text-gray-700 mb-1">
            Funding Type
          </label>
          <select
            id="fundingType"
            name="fundingType"
            value={formData.fundingType}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="GENERAL">General Expenses</option>
            <option value="EVENT">Event Funding</option>
            <option value="TRAVEL">Travel Funding</option>
          </select>
        </div>
        
        {(formData.fundingType === 'EVENT' || formData.fundingType === 'TRAVEL') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Itemized Expenses
            </label>
            
            {formData.expenseItems.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleExpenseItemChange(index, e.target.value)}
                  placeholder="Expense description"
                  className="flex-grow p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  value={formData.expenseAmounts[index]}
                  onChange={(e) => handleExpenseAmountChange(index, e.target.value)}
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  className="w-24 p-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeExpenseRow(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                >
                  ✕
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addExpenseRow}
              className="mt-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
            >
              + Add Item
            </button>
          </div>
        )}
        
        <Transaction
          calls={createCampaignCall}
          isSponsored={true}
          onSuccess={handleSuccess}
        >
          <TransactionButton 
            text="Create Campaign" 
            disabled={!formData.name || !formData.description || !formData.organizationId || !formData.goal || !formData.deadline}
          />
        </Transaction>
      </div>
    </div>
  );
}

// Fallback component for Suspense
function CampaignFormFallback() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create a Funding Campaign</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p>Loading form...</p>
      </div>
    </div>
  );
}

export default function CreateCampaign() {
  return (
    <main>
      <Navigation />
      <Suspense fallback={<CampaignFormFallback />}>
        <CampaignForm />
      </Suspense>
    </main>
  );
}