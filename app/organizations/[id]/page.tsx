'use client';

import { Navigation } from '@/components/Navigation';
import { useAccount } from 'wagmi';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { encodeFunctionData, parseAbi } from 'viem';
import { 
  publicClient, 
  CONTRACT_ADDRESSES, 
  organizationABI,
  organizationFactoryABI,
  fundingPoolABI
} from '@/utils/contracts';

// Define interfaces for better type safety
interface OrganizationData {
  id: string;
  address: string;
  name: string;
  description: string;
  mission: string;
  createdAt: string;
  admin: string;
  adminName: string;
}

interface MemberData {
  address: string;
  name: string;
  role: string;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  goal: number;
  collected: number;
  deadline: string;
  status: string;
}

export default function OrganizationDetail({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newTreasurerAddress, setNewTreasurerAddress] = useState('');
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    async function fetchOrganizationData() {
      try {
        // Get the actual numeric index from the ID string
        const orgIndex = parseInt(params.id, 10);
        
        // Verify it's a valid number
        if (isNaN(orgIndex)) {
          throw new Error("Invalid organization ID");
        }
        
        // Fetch organization from contract using the ID
        const orgAddress = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.organizationFactory as `0x${string}`,
          abi: organizationFactoryABI,
          functionName: 'getOrganizationAddressByIndex',
          args: [BigInt(orgIndex)]
        });    

        // Get organization details
        const name = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: organizationABI,
          functionName: 'name'
        });
        
        const description = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: organizationABI,
          functionName: 'description'
        });
        
        const mission = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: organizationABI,
          functionName: 'mission'
        });
        
        const creationDate = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: organizationABI,
          functionName: 'creationDate'
        });

        // Get admin (owner)
        const ownerABI = parseAbi(["function owner() external view returns (address)"]);
        const adminAddress = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: ownerABI,
          functionName: 'owner'
        });

        // Get member count
        const memberCount = await publicClient.readContract({
          address: orgAddress as `0x${string}`,
          abi: organizationABI,
          functionName: 'getMemberCount'
        });

        // Fetch members
        const membersArray: MemberData[] = [];
        for (let i = 0; i < Number(memberCount); i++) {
          const memberAddress = await publicClient.readContract({
            address: orgAddress as `0x${string}`,
            abi: organizationABI,
            functionName: 'memberArray',
            args: [BigInt(i)]
          });

          const isTreasurer = await publicClient.readContract({
            address: orgAddress as `0x${string}`,
            abi: organizationABI,
            functionName: 'isTreasurer',
            args: [memberAddress]
          });

          const role = memberAddress === adminAddress 
            ? 'Admin' 
            : isTreasurer 
              ? 'Treasurer' 
              : 'Member';

          membersArray.push({
            address: memberAddress as string,
            name: `${(memberAddress as string).slice(0, 6)}...${(memberAddress as string).slice(-4)}`,
            role
          });
        }

        // Check if the current user is a member or admin
        if (address) {
          const checkIfMember = await publicClient.readContract({
            address: orgAddress as `0x${string}`,
            abi: organizationABI,
            functionName: 'isMember',
            args: [address]
          });
          setIsMember(!!checkIfMember);
          setIsAdmin(address === adminAddress);
        }
        
        // Set organization data
        setOrganization({
          id: params.id,
          address: orgAddress as string,
          name: name as string,
          description: description as string,
          mission: mission as string,
          createdAt: new Date(Number(creationDate) * 1000).toISOString().split('T')[0],
          admin: adminAddress as string,
          adminName: `${(adminAddress as string).slice(0, 6)}...${(adminAddress as string).slice(-4)}`,
        });
        
        setMembers(membersArray);
        
        try {
          const campaignCount = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
            abi: fundingPoolABI,
            functionName: 'campaignCount'
          });
          
          const campaignsArray: CampaignData[] = [];
          for (let i = 0; i < Number(campaignCount); i++) {
            const campaign = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.fundingPool as `0x${string}`,
              abi: fundingPoolABI,
              functionName: 'campaigns',
              args: [BigInt(i)]
            });
            
            // Check if this campaign belongs to the current organization
            if (campaign[7].toLowerCase() === orgAddress.toLowerCase()) {
              const campaignDetails: CampaignData = {
                id: i.toString(),
                name: campaign[0] as string,
                description: campaign[1] as string,
                goal: Number(campaign[2]),
                collected: Number(campaign[3]),
                deadline: Number(campaign[4]) > 0 ? new Date(Number(campaign[4]) * 1000).toLocaleDateString() : 'No deadline',
                status: ['ACTIVE', 'COMPLETED', 'CANCELLED'][Number(campaign[6])]
              };
              
              campaignsArray.push(campaignDetails);
            }
          }
          
          setCampaigns(campaignsArray);
        } catch (err) {
          console.error("Failed to fetch campaign data:", err);
          // Fallback to mock data if real data fails
          setCampaigns([
            { id: '1', name: 'Annual Tech Conference', description: '', goal: 5000, collected: 3250, deadline: '', status: 'ACTIVE' },
            { id: '3', name: 'Club Equipment Fund', description: '', goal: 2000, collected: 800, deadline: '', status: 'ACTIVE' },
          ]);
        }

      } catch (err) {
        console.error("Failed to fetch organization data:", err);
        setError("Failed to load organization data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizationData();
  }, [params.id, address]);

  // Join organization function
  const joinOrganizationCall = async () => {
    if (!organization?.address || !address) return [];
    
    const data = encodeFunctionData({
      abi: organizationABI,
      functionName: 'addMember',
      args: [address as `0x${string}`]
    });
    
    return [{
      to: organization.address as `0x${string}`,
      data,
    }];
  };
  
  // Add member function
  const addMemberCall = async () => {
    if (!organization?.address || !newMemberAddress) return [];
    
    const data = encodeFunctionData({
      abi: organizationABI,
      functionName: 'addMember',
      args: [newMemberAddress as `0x${string}`]
    });
    
    return [{
      to: organization.address as `0x${string}`,
      data,
    }];
  };
  
  // Add treasurer function
  const addTreasurerCall = async () => {
    if (!organization?.address || !newTreasurerAddress) return [];
    
    const data = encodeFunctionData({
      abi: organizationABI,
      functionName: 'addTreasurer',
      args: [newTreasurerAddress as `0x${string}`]
    });
    
    return [{
      to: organization.address as `0x${string}`,
      data,
    }];
  };

  const handleActionSuccess = () => {
    // Reset form fields
    setNewMemberAddress('');
    setNewTreasurerAddress('');
    
    // Refresh data
    window.location.reload();
  };

  if (isLoading) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading organization data...</p>
        </div>
      </main>
    );
  }

  if (error || !organization) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-red-600">{error || "Organization not found"}</p>
          <Link href="/organizations" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link href="/organizations" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Organizations
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-3xl font-bold mb-4">{organization.name}</h1>
          <p className="text-gray-600 mb-6">{organization.description}</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Organization Details</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Mission:</span> {organization.mission}</p>
                <p><span className="font-medium">Founded:</span> {organization.createdAt}</p>
                <p><span className="font-medium">Admin:</span> {organization.adminName}</p>
                <p><span className="font-medium">Member Count:</span> {members.length}</p>
                <p><span className="font-medium">Address:</span> {organization.address}</p>
              </div>
            </div>
            
            <div>
              {address && !isMember && !isAdmin && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Join Organization</h2>
                  <p className="text-gray-600 mb-4">
                    Join this organization to participate in its activities and funding campaigns.
                  </p>
                  <Transaction
                    calls={joinOrganizationCall}
                    isSponsored={true}
                    onSuccess={handleActionSuccess}
                  >
                    <TransactionButton text="Join Organization" />
                  </Transaction>
                </div>
              )}
              
              {address && (isMember || isAdmin) && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Member Actions</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Link 
                      href={`/campaigns/create?organization=${params.id}`}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center"
                    >
                      Create Campaign
                    </Link>
                    <Link 
                      href={`/expenses/create?organization=${params.id}`}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center"
                    >
                      Submit Expense
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {address && isAdmin && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Admin Actions</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Add Member</h3>
                  <div className="flex">
                    <input
                      type="text"
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      placeholder="Enter wallet address"
                      className="flex-grow p-2 border border-gray-300 rounded-l-md"
                    />
                    <Transaction
                      calls={addMemberCall}
                      isSponsored={true}
                      onSuccess={handleActionSuccess}
                    >
                      <TransactionButton 
                        text="Add" 
                        disabled={!newMemberAddress} 
                        className="rounded-l-none"
                      />
                    </Transaction>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Add Treasurer</h3>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTreasurerAddress}
                      onChange={(e) => setNewTreasurerAddress(e.target.value)}
                      placeholder="Enter member address"
                      className="flex-grow p-2 border border-gray-300 rounded-l-md"
                    />
                    <Transaction
                      calls={addTreasurerCall}
                      isSponsored={true}
                      onSuccess={handleActionSuccess}
                    >
                      <TransactionButton 
                        text="Add" 
                        disabled={!newTreasurerAddress} 
                        className="rounded-l-none"
                      />
                    </Transaction>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Members</h2>
              <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead className="text-left">
                    <tr>
                      <th className="pb-2">Address</th>
                      <th className="pb-2">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="py-2">{member.name}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            member.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                            member.role === 'Treasurer' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">Funding Campaigns</h2>
              <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
                {campaigns.length > 0 ? (
                  <div className="space-y-3">
                    {campaigns.map(campaign => (
                      <div key={campaign.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <Link 
                            href={`/campaigns/${campaign.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          <span className={`text-xs px-2 py-1 rounded ${
                            campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                            campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>
                              ${campaign.collected} of ${campaign.goal}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, Math.round((campaign.collected / campaign.goal) * 100))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No active campaigns</p>
                )}
              </div>
              
              {address && (isMember || isAdmin) && (
                <div className="mt-4 text-center">
                  <Link 
                    href={`/campaigns/create?organization=${params.id}`}
                    className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Create New Campaign
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}