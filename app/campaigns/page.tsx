'use client';

import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { publicClient, CONTRACT_ADDRESSES, fundingPoolABI } from '@/utils/contracts';

// Fixed ETH to USD conversion rate for display purposes
const ETH_TO_USD_RATE = 1800;

export default function Campaigns() {
 const [campaigns, setCampaigns] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
   async function fetchCampaigns() {
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

           // Get organization from raw campaign data 
           const campaignRaw = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
             abi: fundingPoolABI,
             functionName: 'campaigns',
             args: [BigInt(i)]
           });
           
           // Just use the organization address instead of trying to fetch the name
           const orgAddress = campaignRaw[7];
           const orgDisplayName = `${orgAddress.slice(0, 6)}...${orgAddress.slice(-4)}`;

           // Convert wei to ETH, then ETH to USD
           const collectedEth = Number(campaignDetails[3]) / 1e18;
           const collectedUsd = collectedEth * ETH_TO_USD_RATE;
           
           // Goal is already in cents, convert to dollars
           const goalUsd = Number(campaignDetails[2]) / 100;

           campaignsArray.push({
             id: i,
             name: campaignDetails[0],
             description: campaignDetails[1],
             goal: goalUsd,
             collected: collectedUsd,
             deadline: Number(campaignDetails[4]) > 0 
               ? new Date(Number(campaignDetails[4]) * 1000).toLocaleDateString() 
               : 'No deadline',
             status: ['ACTIVE', 'COMPLETED', 'CANCELLED'][Number(campaignDetails[6])],
             organization: orgDisplayName
           });
         } catch (campaignError) {
           console.error(`Error fetching campaign ${i}:`, campaignError);
           continue;
         }
       }

       setCampaigns(campaignsArray);
     } catch (err) {
       console.error("Failed to fetch campaigns:", err);
       setError("Failed to load campaigns");
     } finally {
       setLoading(false);
     }
   }

   fetchCampaigns();
 }, []);

 return (
   <main>
     <Navigation />
     <div className="container mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Funding Campaigns</h1>
         <Link href="/campaigns/create" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
           Create Campaign
         </Link>
       </div>
       
       {loading ? (
         <div className="text-center py-8">
           <p>Loading campaigns...</p>
         </div>
       ) : error ? (
         <div className="text-center py-8 text-red-600">
           <p>{error}</p>
         </div>
       ) : campaigns.length === 0 ? (
         <div className="text-center py-8">
           <p>No campaigns found. Create one to get started!</p>
         </div>
       ) : (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {campaigns.map((campaign) => (
             <div key={campaign.id} className="bg-white p-6 rounded-lg shadow-md">
               <div className="flex justify-between items-start mb-2">
                 <h2 className="text-xl font-semibold">{campaign.name}</h2>
                 <span className={`text-xs px-2 py-1 rounded ${
                   campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                   campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                 }`}>
                   {campaign.status}
                 </span>
               </div>
               <p className="text-sm text-gray-500 mb-1">By {campaign.organization}</p>
               <p className="text-gray-600 mb-4">{campaign.description}</p>
               
               <div className="mb-4">
                 <div className="flex justify-between text-sm mb-1">
                   <span>Progress</span>
                   <span>
                     ${campaign.collected.toFixed(2)} of ${campaign.goal.toFixed(2)}
                   </span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2.5">
                   <div 
                     className="bg-blue-600 h-2.5 rounded-full" 
                     style={{ 
                       width: `${Math.min(100, Math.round((campaign.collected / campaign.goal) * 100))}%` 
                     }}
                   ></div>
                 </div>
               </div>
               
               <div className="flex justify-between items-center">
                 <div className="text-sm text-gray-500">
                   <span className="font-medium">Deadline:</span> {campaign.deadline}
                 </div>
                 <Link href={`/campaigns/${campaign.id}`} className="text-blue-600 hover:underline">
                   View Details →
                 </Link>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   </main>
 );
}