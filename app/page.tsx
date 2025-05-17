import { Navigation } from '@/components/Navigation';
import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ClubFund</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simplifying university organization management and funding on the Base blockchain
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Create an Organization</h2>
            <p className="text-gray-600 mb-4">
              Establish your club or student group with on-chain governance and membership management.
            </p>
            <Link href="/organizations/create" className="block text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Get Started
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Run a Funding Campaign</h2>
            <p className="text-gray-600 mb-4">
              Raise funds for your organization&apos;s events, projects, or operating expenses.
            </p>
            <Link href="/campaigns/create" className="block text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Create Campaign
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Manage Expenses</h2>
            <p className="text-gray-600 mb-4">
              Submit expenses for approval and reimbursement with transparent tracking.
            </p>
            <Link href="/expenses/create" className="block text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Submit Expense
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}