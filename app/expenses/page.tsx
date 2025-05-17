'use client';

import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
 publicClient, 
 CONTRACT_ADDRESSES, 
 expenseApprovalABI,
 fundingPoolABI 
} from '@/utils/contracts';

const getStatusBadge = (status: number) => {
 const statusLabels = ['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'];
 const statusLabel = statusLabels[status] || 'UNKNOWN';
 
 switch (statusLabel) {
   case 'PENDING':
     return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Pending</span>;
   case 'APPROVED':
     return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Approved</span>;
   case 'REJECTED':
     return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Rejected</span>;
   case 'REIMBURSED':
     return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Reimbursed</span>;
   default:
     return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{statusLabel}</span>;
 }
};

export default function Expenses() {
 const [expenses, setExpenses] = useState();
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
   async function fetchExpenses() {
     try {
       // Get expense count
       const expenseCount = await publicClient.readContract({
         address: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
         abi: expenseApprovalABI,
         functionName: 'expenseCount'
       });

       const expensesArray = [];
       for (let i = 0; i < Number(expenseCount); i++) {
         try {
           // Get expense details
           const expenseDetails = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
             abi: expenseApprovalABI,
             functionName: 'getExpenseDetails',
             args: [BigInt(i)]
           });

           // Get campaign details for the expense
           const campaignDetails = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
             abi: fundingPoolABI,
             functionName: 'getCampaignDetails',
             args: [expenseDetails[4]] // campaignId
           });

           // Get campaign organization
           const campaignRaw = await publicClient.readContract({
             address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
             abi: fundingPoolABI,
             functionName: 'campaigns',
             args: [expenseDetails[4]] // campaignId
           });
           
           const orgAddress = campaignRaw[7];
           const orgDisplayName = `${orgAddress.slice(0, 6)}...${orgAddress.slice(-4)}`;
           const requesterDisplayName = `${(expenseDetails[3] as string).slice(0, 6)}...${(expenseDetails[3] as string).slice(-4)}`;

           expensesArray.push({
             id: i,
             description: expenseDetails[0],
             amount: Number(expenseDetails[1]) / 100, // Convert from cents to dollars
             receiptURI: expenseDetails[2],
             requester: requesterDisplayName,
             campaignId: Number(expenseDetails[4]),
             campaignName: campaignDetails[0],
             status: Number(expenseDetails[5]),
             submissionDate: new Date(Number(expenseDetails[6]) * 1000).toLocaleDateString(),
             requiredApprovals: Number(expenseDetails[7]),
             approvalCount: Number(expenseDetails[8]),
             organization: orgDisplayName
           });
         } catch (expenseError) {
           console.error(`Error fetching expense ${i}:`, expenseError);
           // Skip this expense and continue
           continue;
         }
       }

       setExpenses(expensesArray);
     } catch (err) {
       console.error("Failed to fetch expenses:", err);
       setError("Failed to load expenses");
     } finally {
       setLoading(false);
     }
   }

   fetchExpenses();
 }, []);

 return (
   <main>
     <Navigation />
     <div className="container mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Expenses</h1>
         <Link href="/expenses/create" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
           Submit Expense
         </Link>
       </div>
       
       {loading ? (
         <div className="text-center py-8">
           <p>Loading expenses...</p>
         </div>
       ) : error ? (
         <div className="text-center py-8 text-red-600">
           <p>{error}</p>
         </div>
       ) : expenses.length === 0 ? (
         <div className="text-center py-8">
           <p>No expenses found.</p>
         </div>
       ) : (
         <div className="bg-white rounded-lg shadow-md overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-4 py-3 text-left">Description</th>
                   <th className="px-4 py-3 text-left">Organization</th>
                   <th className="px-4 py-3 text-left">Campaign</th>
                   <th className="px-4 py-3 text-right">Amount</th>
                   <th className="px-4 py-3 text-center">Status</th>
                   <th className="px-4 py-3 text-right">Submitted</th>
                   <th className="px-4 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {expenses.map((expense) => (
                   <tr key={expense.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3">{expense.description}</td>
                     <td className="px-4 py-3">{expense.organization}</td>
                     <td className="px-4 py-3">{expense.campaignName}</td>
                     <td className="px-4 py-3 text-right">${expense.amount}</td>
                     <td className="px-4 py-3 text-center">{getStatusBadge(expense.status)}</td>
                     <td className="px-4 py-3 text-right">{expense.submissionDate}</td>
                     <td className="px-4 py-3 text-right">
                       <Link href={`/expenses/${expense.id}`} className="text-blue-600 hover:underline">
                         View
                       </Link>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
       )}
     </div>
   </main>
 );
}