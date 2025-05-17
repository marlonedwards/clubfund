// utils/gasless.ts
import { Contract } from 'ethers';
import { GelatoRelay } from '@gelatonetwork/relay-sdk';

// Initialize Gelato Relay for gasless transactions
const relay = new GelatoRelay();

// Your API key from Gelato
const GELATO_API_KEY = process.env.NEXT_PUBLIC_GELATO_API_KEY || '';

export async function sendGaslessTransaction(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  userAddress: string
) {
  try {
    // Encode the function data
    const contract = new Contract(contractAddress, abi);
    const data = contract.interface.encodeFunctionData(functionName, args);
    
    // Prepare the request
    const request = {
      chainId: 84532, // Base Sepolia
      target: contractAddress,
      data,
      user: userAddress,
    };
    
    // Send the gasless transaction
    const response = await relay.sponsoredCall(request, GELATO_API_KEY);
    
    return {
      taskId: response.taskId,
      success: true,
    };
  } catch (error) {
    console.error('Error sending gasless transaction:', error);
    return {
      error,
      success: false,
    };
  }
}