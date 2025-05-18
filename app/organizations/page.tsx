'use client';

import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getOrganizations, getOrganizationMemberCount } from '@/utils/contracts';

// Define the organization type
interface Organization {
  id: string;
  address: `0x${string}`;
  name: string;
  description: string;
  mission: string;
  memberCount: number;
  createdAt: string;
}

export default function Organizations() {
  // Define the proper initial state type
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgAddressToIndexMap, setOrgAddressToIndexMap] = useState<Record<string, number>>({});
  
  console.log(orgAddressToIndexMap);
  
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const result = await getOrganizations(0, 20);
        if (result.organizations.length > 0) {
          // Create a mapping from address to index
          const addressToIndexMap: Record<string, number> = {};
          result.organizations.forEach((org, index) => {
            addressToIndexMap[org.address] = index;
          });
          setOrgAddressToIndexMap(addressToIndexMap);

          // Map the contract data to match our UI needs
          const orgsWithMemberCount = await Promise.all(
            result.organizations.map(async (org, index) => {
              const memberCount = await getOrganizationMemberCount(org.address);
              return {
                id: index.toString(), // Use numeric index for routing
                address: org.address as `0x${string}`,
                name: org.name,
                description: org.description,
                mission: org.mission,
                memberCount,
                createdAt: new Date(Number(org.creationDate) * 1000).toLocaleDateString()
              };
            })
          );
          setOrganizations(orgsWithMemberCount);
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
        setError("Failed to load organizations");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Organizations</h1>
          <Link href="/organizations/create" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Create Organization
          </Link>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading organizations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-8">
            <p>No organizations found. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div key={org.id} className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">{org.name}</h2>
                <p className="text-gray-600 mb-4">{org.description}</p>
                <div className="text-sm text-gray-500 mb-4">
                  <p><span className="font-medium">Mission:</span> {org.mission}</p>
                  <p><span className="font-medium">Members:</span> {org.memberCount || 'Unknown'}</p>
                  <p><span className="font-medium">Founded:</span> {org.createdAt}</p>
                </div>
                <Link href={`/organizations/${org.id}`} className="text-blue-600 hover:underline">
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}