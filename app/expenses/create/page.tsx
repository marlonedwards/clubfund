'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
 publicClient, 
 CONTRACT_ADDRESSES, 
 fundingPoolABI,
 expenseApprovalABI,
} from '@/utils/contracts';
import { encodeFunctionData } from 'viem';

export default function SubmitExpense() {
 const { address } = useAccount();
 const router = useRouter();
 const searchParams = useSearchParams();
 const [campaigns, setCampaigns] = useState();
 const [loading, setLoading] = useState(true);
 const [formData, setFormData] = useState({
   description: '',
   amount: '',
   campaignId: searchParams.get('campaign') || '',
   receiptUrl: '',
   requiredApprovals: '2',
 });
 const [fileUploaded, setFileUploaded] = useState(false);

 useEffect(() => {
   async function fetchData() {
     try {
       // Get campaign count
       const campaignCount = await publicClient.readContract({
         address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
         abi: fundingPoolABI,
         functionName: 'campaignCount'
       });

       const campaignsArray = [];
       
       for (let i = 0; i < Number(campaignCount); i++) {
         try {
           // Get campaign details
           const campaignDetails = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
             abi: fundingPoolABI,
             functionName: 'getCampaignDetails',
             args: [BigInt(i)]
           });

           // Get organization from campaign data
           const campaignRaw = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
             abi: fundingPoolABI,
             functionName: 'campaigns',
             args: [BigInt(i)]
           });
           
           const orgAddress = campaignRaw[7];
           const orgDisplayName = `${orgAddress.slice(0, 6)}...${orgAddress.slice(-4)}`;

           // Only show active campaigns
           if (Number(campaignDetails[6]) === 0) { // ACTIVE status
             campaignsArray.push({
               id: i.toString(),
               name: campaignDetails[0],
               organization: orgDisplayName,
               orgAddress: orgAddress
             });
           }
         } catch (campaignError) {
           console.error(`Error fetching campaign ${i}:`, campaignError);
           continue;
         }
       }

       setCampaigns(campaignsArray);
     } catch (err) {
       console.error("Failed to fetch data:", err);
     } finally {
       setLoading(false);
     }
   }

   fetchData();
 }, [address]);

 const submitExpenseCall = async () => {
   if (!formData.description || !formData.amount || !formData.campaignId || !fileUploaded) {
     return [];
   }
   
   const data = encodeFunctionData({
     abi: expenseApprovalABI,
     functionName: 'submitExpense',
     args: [
       formData.description,
       BigInt(Math.floor(parseFloat(formData.amount) * 100)), // Convert to cents
       formData.receiptUrl,
       BigInt(formData.campaignId),
       BigInt(formData.requiredApprovals)
     ]
   });
   
   return [{
     to: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
     data,
   }];
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
   const { name, value } = e.target;
   setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
   if (e.target.files && e.target.files.length > 0) {
     setFileUploaded(true);
     const mockIPFSHash = `ipfs://${Math.random().toString(36).substring(2, 15)}`;
     setFormData(prev => ({ ...prev, receiptUrl: mockIPFSHash }));
   }
 };

 const handleSuccess = () => {
   router.push('/expenses');
 };

 if (!address) {
   return (
     <main>
       <Navigation />
       <div className="container mx-auto px-4 py-8 text-center">
         <p className="text-xl mb-4">Please connect your wallet to submit an expense.</p>
       </div>
     </main>
   );
 }

 return (
   <main>
     <Navigation />
     <div className="container mx-auto px-4 py-8 max-w-2xl">
       <h1 className="text-2xl font-bold mb-6">Submit an Expense</h1>
       
       <div className="bg-white p-6 rounded-lg shadow-md">
         <div className="mb-4">
           <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
             Expense Description
           </label>
           <input
             type="text"
             id="description"
             name="description"
             value={formData.description}
             onChange={handleChange}
             className="w-full p-2 border border-gray-300 rounded-md"
             required
           />
         </div>
         
         <div className="mb-4">
           <label htmlFor="campaignId" className="block text-sm font-medium text-gray-700 mb-1">
             Campaign
           </label>
           <select
             id="campaignId"
             name="campaignId"
             value={formData.campaignId}
             onChange={handleChange}
             className="w-full p-2 border border-gray-300 rounded-md"
             required
             disabled={loading}
           >
             <option value="">Select a campaign</option>
             {campaigns.map(campaign => (
               <option key={campaign.id} value={campaign.id}>
                 {campaign.name} ({campaign.organization})
               </option>
             ))}
           </select>
           {loading ? (
             <p className="text-sm text-gray-500 mt-1">Loading campaigns...</p>
           ) : campaigns.length === 0 ? (
             <p className="text-sm text-red-500 mt-1">No active campaigns found. Please create a campaign first.</p>
           ) : null}
         </div>
         
         <div className="mb-4">
           <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
             Amount (USD)
           </label>
           <input
             type="number"
             id="amount"
             name="amount"
             value={formData.amount}
             onChange={handleChange}
             min="0.01"
             step="0.01"
             className="w-full p-2 border border-gray-300 rounded-md"
             required
           />
         </div>
         
         <div className="mb-4">
           <label htmlFor="receiptUpload" className="block text-sm font-medium text-gray-700 mb-1">
             Upload Receipt
           </label>
           <div className="mt-1 flex items-center">
             <input
               type="file"
               id="receiptUpload"
               onChange={handleFileUpload}
               className="sr-only"
               accept="image/*,.pdf"
             />
             <label
               htmlFor="receiptUpload"
               className={`cursor-pointer px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                 fileUploaded ? 'bg-green-100 text-green-800' : 'bg-white text-gray-700'
               }`}
             >
               {fileUploaded ? 'Receipt Uploaded' : 'Choose File'}
             </label>
             {fileUploaded && (
               <span className="ml-3 text-sm text-gray-500">
                 File uploaded successfully
               </span>
             )}
           </div>
           <p className="mt-1 text-sm text-gray-500">
             JPG, PNG, or PDF up to 10MB
           </p>
         </div>
         
         <div className="mb-6">
           <label htmlFor="requiredApprovals" className="block text-sm font-medium text-gray-700 mb-1">
             Required Approvals
           </label>
           <select
             id="requiredApprovals"
             name="requiredApprovals"
             value={formData.requiredApprovals}
             onChange={handleChange}
             className="w-full p-2 border border-gray-300 rounded-md"
             required
           >
             <option value="1">1 Approver</option>
             <option value="2">2 Approvers</option>
             <option value="3">3 Approvers</option>
           </select>
         </div>
         
         <Transaction
           calls={submitExpenseCall}
           isSponsored={true}
           onSuccess={handleSuccess}
         >
           <TransactionButton 
             text="Submit Expense" 
             disabled={!formData.description || !formData.amount || !formData.campaignId || !fileUploaded || campaigns.length === 0} 
           />
         </Transaction>
       </div>
     </div>
   </main>
 );
}