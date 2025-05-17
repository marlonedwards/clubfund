import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

export const CONTRACT_ADDRESSES = {
  organizationFactory: '0xfbc86d1B462C76328D812C50cC2b727dF708D978',
  fundingPool: '0xea91cB28e783518E7C55c67467Aa16e54D33548E',
  expenseApproval: '0x8668b408E3bA5c8Ccd42Bd810a456104D963603A',
};

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

export const getWalletClient = (privateKey: string) => {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com'),
  });
};

export const organizationFactoryABI = parseAbi([
  "function createOrganization(string name, string description, string mission) external returns (address)",
  "function getOrganizationCount() external view returns (uint256)",
  "function getOrganizationAddressByIndex(uint256 index) external view returns (address)",
  "function organizations(address) external view returns (string name, string description, string mission, uint256 creationDate, address admin)",
  "function organizationAddresses(uint256) external view returns (address)",
  "event OrganizationCreated(address organizationAddress, string name, address admin)"
]);

export const organizationABI = parseAbi([
  "function name() external view returns (string)",
  "function description() external view returns (string)",
  "function mission() external view returns (string)",
  "function creationDate() external view returns (uint256)",
  "function members(address) external view returns (bool)",
  "function treasurers(address) external view returns (bool)",
  "function memberArray(uint256) external view returns (address)",
  "function addMember(address member) external",
  "function removeMember(address member) external",
  "function addTreasurer(address treasurer) external",
  "function removeTreasurer(address treasurer) external",
  "function getMemberCount() external view returns (uint256)",
  "function isMember(address account) external view returns (bool)",
  "function isTreasurer(address account) external view returns (bool)"
]);

export const fundingPoolABI = parseAbi([
  "function createCampaign(string name, string description, uint256 goal, uint256 deadline, uint8 fundingType, string[] expenseItems, uint256[] expenseAmounts) external returns (uint256)",
  "function contribute(uint256 campaignId) external payable",
  "function cancelCampaign(uint256 campaignId) external",
  "function withdrawFunds(uint256 campaignId, address recipient, uint256 amount) external",
  "function getContribution(uint256 campaignId, address contributor) external view returns (uint256)",
  "function getCampaignDetails(uint256 campaignId) external view returns (string name, string description, uint256 goal, uint256 collected, uint256 deadline, uint8 fundingType, uint8 status)",
  "function getExpenseItems(uint256 campaignId) external view returns (string[], uint256[])",
  "function campaigns(uint256) external view returns (string name, string description, uint256 goal, uint256 collected, uint256 deadline, uint8 fundingType, uint8 status, address organization)",
  "function campaignCount() external view returns (uint256)",
  "event CampaignCreated(uint256 campaignId, string name, uint256 goal, address organization)",
  "event FundsContributed(uint256 campaignId, address contributor, uint256 amount)",
  "event CampaignCompleted(uint256 campaignId)",
  "event CampaignCancelled(uint256 campaignId)"
]);

export const expenseApprovalABI = parseAbi([
  "function submitExpense(string description, uint256 amount, string receiptURI, uint256 campaignId, uint256 requiredApprovals) external returns (uint256)",
  "function approveExpense(uint256 expenseId) external",
  "function rejectExpense(uint256 expenseId) external",
  "function reimburseExpense(uint256 expenseId, address recipient) external payable",
  "function getExpenseStatus(uint256 expenseId) external view returns (uint8)",
  "function getExpenseDetails(uint256 expenseId) external view returns (string description, uint256 amount, string receiptURI, address requester, uint256 campaignId, uint8 status, uint256 submissionDate, uint256 requiredApprovals, uint256 approvalCount)",
  "function hasApproved(uint256 expenseId, address approver) external view returns (bool)",
  "function expenseCount() external view returns (uint256)",
  "event ExpenseSubmitted(uint256 expenseId, address requester, uint256 amount)",
  "event ExpenseApproved(uint256 expenseId, address approver)",
  "event ExpenseRejected(uint256 expenseId, address rejecter)",
  "event ExpenseReimbursed(uint256 expenseId, address recipient, uint256 amount)"
]);

export async function getOrganizationMemberCount(orgAddress: string) {
  try {
    const count = await publicClient.readContract({
      address: orgAddress as `0x${string}`,
      abi: organizationABI,
      functionName: 'getMemberCount',
    });
    
    return Number(count);
  } catch (error) {
    console.error(`Error fetching member count for ${orgAddress}:`, error);
    return 0;
  }
}

export async function getOrganizations(startIndex = 0, limit = 10) {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.organizationFactory as `0x${string}`,
      abi: organizationFactoryABI,
      functionName: 'getOrganizationCount',
    });
    
    const organizations = [];
    const endIndex = Math.min(Number(count), startIndex + limit);
    
    for (let i = startIndex; i < endIndex; i++) {
      const address = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.organizationFactory as `0x${string}`,
        abi: organizationFactoryABI,
        functionName: 'getOrganizationAddressByIndex',
        args: [BigInt(i)],
      });
      
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.organizationFactory as `0x${string}`,
        abi: organizationFactoryABI,
        functionName: 'organizations',
        args: [address],
      });
      
      organizations.push({
        address,
        name: data[0], 
        description: data[1],
        mission: data[2],
        creationDate: data[3],
        admin: data[4]
      });
    }
    
    return {
      organizations,
      total: Number(count),
      hasMore: endIndex < Number(count)
    };
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return { organizations: [], total: 0, hasMore: false };
  }
}