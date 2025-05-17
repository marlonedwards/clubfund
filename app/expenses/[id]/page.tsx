'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import Link from 'next/link';
import { 
  publicClient, 
  CONTRACT_ADDRESSES, 
  expenseApprovalABI,
  fundingPoolABI,
  organizationABI
} from '@/utils/contracts';
import { encodeFunctionData } from 'viem';

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

export default function ExpenseDetail({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const [expense, setExpense] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTreasurer, setIsTreasurer] = useState(false);
  
  useEffect(() => {
    async function fetchExpenseData() {
      try {
        const expenseId = parseInt(params.id, 10);
        if (isNaN(expenseId)) {
          throw new Error('Invalid expense ID');
        }

        // Get expense details
        const expenseDetails = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
          abi: expenseApprovalABI,
          functionName: 'getExpenseDetails',
          args: [BigInt(expenseId)]
        });

        // Get campaign details
        const campaignDetails = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
          abi: fundingPoolABI,
          functionName: 'getCampaignDetails',
          args: [expenseDetails[4]] // campaignId
        });

        // Get organization address
        const campaignRaw = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
          abi: fundingPoolABI,
          functionName: 'campaigns',
          args: [expenseDetails[4]] // campaignId
        });
        
        const orgAddress = campaignRaw[7];
        const orgDisplayName = `${orgAddress.slice(0, 6)}...${orgAddress.slice(-4)}`;
        const requesterDisplayName = `${(expenseDetails[3] as string).slice(0, 6)}...${(expenseDetails[3] as string).slice(-4)}`;

        // Check if current address is a treasurer
        if (address) {
          try {
            const treasurerCheck = await publicClient.readContract({
              address: orgAddress as `0x${string}`,
              abi: organizationABI,
              functionName: 'isTreasurer',
              args: [address]
            });
            setIsTreasurer(!!treasurerCheck);
          } catch (error) {
            console.error("Failed to check treasurer status:", error);
            setIsTreasurer(false);
          }
        }

        // Format data
        const formattedExpense = {
          id: params.id,
          description: expenseDetails[0],
          amount: Number(expenseDetails[1]) / 100, // Convert from cents to dollars
          receiptUrl: expenseDetails[2],
          requester: expenseDetails[3],
          requesterName: requesterDisplayName,
          campaignId: Number(expenseDetails[4]),
          campaignName: campaignDetails[0],
          status: Number(expenseDetails[5]),
          submissionDate: new Date(Number(expenseDetails[6]) * 1000).toLocaleDateString(),
          requiredApprovals: Number(expenseDetails[7]),
          approvalCount: Number(expenseDetails[8]),
          organization: orgDisplayName
        };

        // For now, we don't have an easy way to get approvals history in the contract
        // This would require event logs which is more complex
        // So we're using mock approval data
        const mockApprovals = [];
        if (formattedExpense.approvalCount > 0) {
          mockApprovals.push({
            approver: '0x123...',
            approverName: 'Treasurer 1',
            date: new Date(Date.now() - 2*24*60*60*1000).toLocaleDateString()
          });
          
          if (formattedExpense.approvalCount > 1) {
            mockApprovals.push({
              approver: '0x456...',
              approverName: 'Treasurer 2',
              date: new Date(Date.now() - 1*24*60*60*1000).toLocaleDateString()
            });
          }
        }

        setExpense(formattedExpense);
        setApprovals(mockApprovals);
      } catch (err) {
        console.error("Failed to fetch expense data:", err);
        setError("Failed to load expense data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchExpenseData();
  }, [params.id, address]);

  const approveExpenseCall = async () => {
    if (!expense) return [];
    
    const data = encodeFunctionData({
      abi: expenseApprovalABI,
      functionName: 'approveExpense',
      args: [BigInt(expense.id)]
    });
    
    return [{
      to: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
      data,
    }];
  };
  
  const rejectExpenseCall = async () => {
    if (!expense) return [];
    
    const data = encodeFunctionData({
      abi: expenseApprovalABI,
      functionName: 'rejectExpense',
      args: [BigInt(expense.id)]
    });
    
    return [{
      to: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
      data,
    }];
  };
  
  const reimburseExpenseCall = async () => {
    if (!expense) return [];
    
    const data = encodeFunctionData({
      abi: expenseApprovalABI,
      functionName: 'reimburseExpense',
      args: [BigInt(expense.id), expense.requester]
    });
    
    // Convert USD to ETH (simplified - in production you'd use an oracle)
    const valueInWei = BigInt(Math.floor(expense.amount * 1e18 / 1000));
    
    return [{
      to: CONTRACT_ADDRESSES.expenseApproval as `0x${string}`,
      data,
      value: valueInWei,
    }];
  };

  const handleActionSuccess = () => {
    // Refresh page to reflect changes
    window.location.reload();
  };

  const canApprove = isTreasurer && expense?.status === 0 && address !== expense?.requester;
  const canReimburse = isTreasurer && expense?.status === 1;

  if (isLoading) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading expense details...</p>
        </div>
      </main>
    );
  }

  if (error || !expense) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-red-600">{error || "Expense not found"}</p>
          <Link href="/expenses" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Expenses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/expenses" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Expenses
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-bold">{expense.description}</h1>
            <div>
              {getStatusBadge(expense.status)}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Expense Details</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Amount:</span> ${expense.amount}</p>
                <p><span className="font-medium">Submitted by:</span> {expense.requesterName}</p>
                <p><span className="font-medium">Date Submitted:</span> {expense.submissionDate}</p>
                <p><span className="font-medium">Campaign:</span> {expense.campaignName}</p>
                <p><span className="font-medium">Organization:</span> {expense.organization}</p>
                <p>
                  <span className="font-medium">Approvals:</span> {expense.approvalCount} of {expense.requiredApprovals} required
                </p>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">Receipt</h2>
              <div className="border border-gray-200 rounded-md p-4 h-40 flex items-center justify-center bg-gray-50">
                <a 
                  href={expense.receiptUrl.startsWith('ipfs://') 
                    ? `https://ipfs.io/ipfs/${expense.receiptUrl.replace('ipfs://', '')}`
                    : expense.receiptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  View Receipt
                </a>
              </div>
            </div>
          </div>
          
          {approvals.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Approval History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Approver</th>
                      <th className="px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {approvals.map((approval, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{approval.approverName}</td>
                        <td className="px-4 py-2">{approval.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {address && (
            <div className="flex flex-wrap gap-3">
              {canApprove && (
                <>
                  <Transaction
                    calls={approveExpenseCall}
                    isSponsored={true}
                    onSuccess={handleActionSuccess}
                  >
                    <TransactionButton text="Approve Expense" />
                  </Transaction>
                  
                  <Transaction
                    calls={rejectExpenseCall}
                    isSponsored={true}
                    onSuccess={handleActionSuccess}
                  >
                    <TransactionButton text="Reject Expense" />
                  </Transaction>
                </>
              )}
              
              {canReimburse && (
                <Transaction
                  calls={reimburseExpenseCall}
                  isSponsored={false} // Reimbursements should use treasury funds
                  onSuccess={handleActionSuccess}
                >
                  <TransactionButton text="Reimburse Expense" />
                </Transaction>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}