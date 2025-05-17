'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import Link from 'next/link';
import { 
 publicClient, 
 CONTRACT_ADDRESSES, 
 fundingPoolABI
} from '@/utils/contracts';
import { encodeFunctionData } from 'viem';

// Fixed ETH to USD conversion rate for display purposes
const ETH_TO_USD_RATE = 1800;

export default function CampaignDetail({ params }: { params: { id: string } }) {
 const { address } = useAccount();
 const [contribution, setContribution] = useState('');
 const [campaign, setCampaign] = useState<any>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 
 useEffect(() => {
   async function fetchCampaignData() {
     try {
       const campaignId = parseInt(params.id, 10);
       if (isNaN(campaignId)) {
         throw new Error('Invalid campaign ID');
       }

       // Get campaign details
       const campaignDetails = await publicClient.readContract({
         address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
         abi: fundingPoolABI,
         functionName: 'getCampaignDetails',
         args: [BigInt(campaignId)]
       });

       // Get expense items
       const expenseData = await publicClient.readContract({
         address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
         abi: fundingPoolABI,
         functionName: 'getExpenseItems',
         args: [BigInt(campaignId)]
       });

       // Get campaign organization
       const campaignRaw = await publicClient.readContract({
         address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
         abi: fundingPoolABI,
         functionName: 'campaigns',
         args: [BigInt(campaignId)]
       });
       
       const orgAddress = campaignRaw[7];
       const orgDisplayName = `${orgAddress.slice(0, 6)}...${orgAddress.slice(-4)}`;

       // Convert wei to ETH, then ETH to USD
       const collectedEth = Number(campaignDetails[3]) / 1e18;
       const collectedUsd = collectedEth * ETH_TO_USD_RATE;
       
       // Goal is already in cents, convert to dollars
       const goalUsd = Number(campaignDetails[2]) / 100;

       // Format data
       const formattedCampaign = {
         id: params.id,
         name: campaignDetails[0],
         description: campaignDetails[1],
         goal: goalUsd,
         collected: collectedUsd,
         deadline: Number(campaignDetails[4]) > 0 
           ? new Date(Number(campaignDetails[4]) * 1000).toLocaleDateString() 
           : 'No deadline',
         type: ['GENERAL', 'EVENT', 'TRAVEL'][Number(campaignDetails[5])],
         status: ['ACTIVE', 'COMPLETED', 'CANCELLED'][Number(campaignDetails[6])],
         organization: orgDisplayName,
         organizationId: orgAddress,
         expenseItems: expenseData[0].map((item: string, index: number) => ({
           name: item,
           amount: Number(expenseData[1][index]) / 100 // Convert from cents to dollars
         }))
       };

       setCampaign(formattedCampaign);
     } catch (err) {
       console.error("Failed to fetch campaign data:", err);
       setError("Failed to load campaign data");
     } finally {
       setIsLoading(false);
     }
   }

   fetchCampaignData();
 }, [params.id]);

 const contributeToCampaignCall = async () => {
   if (!contribution || parseFloat(contribution) <= 0) return [];
   
   const data = encodeFunctionData({
     abi: fundingPoolABI,
     functionName: 'contribute',
     args: [BigInt(params.id)]
   });
   
   // Convert ETH to wei
   const valueInWei = BigInt(Math.floor(parseFloat(contribution) * 1e18));
   
   return [{
     to: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
     data,
     value: valueInWei,
   }];
 };

 const handleContributeSuccess = () => {
   setContribution('');
   // Refresh campaign data
   window.location.reload();
 };

 if (isLoading) {
   return (
     <main>
       <Navigation />
       <div className="container mx-auto px-4 py-8 text-center">
         <p>Loading campaign details...</p>
       </div>
     </main>
   );
 }

 if (error || !campaign) {
   return (
     <main>
       <Navigation />
       <div className="container mx-auto px-4 py-8 text-center">
         <p className="text-red-600">{error || "Campaign not found"}</p>
         <Link href="/campaigns" className="text-blue-600 hover:underline mt-4 inline-block">
           ← Back to Campaigns
         </Link>
       </div>
     </main>
   );
 }

 return (
   <main>
     <Navigation />
     <div className="container mx-auto px-4 py-8 max-w-4xl">
       <Link href="/campaigns" className="text-blue-600 hover:underline mb-4 inline-block">
         ← Back to Campaigns
       </Link>
       
       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
         <div className="flex justify-between items-start mb-4">
           <h1 className="text-3xl font-bold">{campaign.name}</h1>
           <span className={`text-sm px-3 py-1 rounded ${
             campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
             campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
           }`}>
             {campaign.status}
           </span>
         </div>
         
         <p className="text-gray-600 mb-6">{campaign.description}</p>
         
         <div className="grid md:grid-cols-2 gap-6 mb-6">
           <div>
             <h2 className="text-xl font-semibold mb-3">Campaign Details</h2>
             <div className="space-y-2">
               <p><span className="font-medium">Organization:</span> {campaign.organization}</p>
               <p><span className="font-medium">Deadline:</span> {campaign.deadline}</p>
               <p><span className="font-medium">Type:</span> {campaign.type}</p>
             </div>
           </div>
           
           <div>
             <h2 className="text-xl font-semibold mb-3">Funding Progress</h2>
             <div className="mb-4">
               <div className="flex justify-between text-sm mb-1">
                 <span>Progress</span>
                 <span>
                   ${campaign.collected.toFixed(2)} of ${campaign.goal.toFixed(2)}
                 </span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-3">
                 <div 
                   className="bg-blue-600 h-3 rounded-full" 
                   style={{ width: `${Math.min(100, Math.round((campaign.collected / campaign.goal) * 100))}%` }}
                 ></div>
               </div>
               <p className="text-right text-sm mt-1">
                 {Math.round((campaign.collected / campaign.goal) * 100)}% funded
               </p>
             </div>
           </div>
         </div>
         
         {campaign.expenseItems?.length > 0 && (
           <div className="mb-6">
             <h2 className="text-xl font-semibold mb-3">Itemized Expenses</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-4 py-2">Item</th>
                     <th className="px-4 py-2 text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {campaign.expenseItems.map((item: any, index: number) => (
                     <tr key={index}>
                       <td className="px-4 py-2">{item.name}</td>
                       <td className="px-4 py-2 text-right">${item.amount}</td>
                     </tr>
                   ))}
                   <tr className="font-semibold">
                     <td className="px-4 py-2">Total</td>
                     <td className="px-4 py-2 text-right">
                       ${campaign.expenseItems.reduce((sum: number, item: any) => sum + item.amount, 0)}
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </div>
         )}
         
         {campaign.status === 'ACTIVE' && (
           <div>
             <h2 className="text-xl font-semibold mb-3">Support This Campaign</h2>
             <div className="grid md:grid-cols-2 gap-4">
               <div>
                 <label htmlFor="contribution" className="block text-sm font-medium text-gray-700 mb-1">
                   Contribution Amount (ETH)
                 </label>
                 <input
                   type="number"
                   id="contribution"
                   value={contribution}
                   onChange={(e) => setContribution(e.target.value)}
                   min="0.001"
                   step="0.001"
                   className="w-full p-2 border border-gray-300 rounded-md"
                   placeholder="0.05"
                 />
                 <p className="text-xs text-gray-500 mt-1">
                   Approx. ${contribution ? (parseFloat(contribution) * ETH_TO_USD_RATE).toFixed(2) : '0.00'} USD
                 </p>
               </div>
               <div className="flex items-end">
                 <Transaction
                   calls={contributeToCampaignCall}
                   isSponsored={false} // Contributions should use the user's own funds
                   onSuccess={handleContributeSuccess}
                 >
                   <TransactionButton text="Contribute" disabled={!contribution || parseFloat(contribution) <= 0} />
                 </Transaction>
               </div>
             </div>
           </div>
         )}
       </div>
     </div>
   </main>
 );
}