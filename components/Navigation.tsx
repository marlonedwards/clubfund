import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Address, Identity } from '@coinbase/onchainkit/identity';
import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-green-600">
            Clubfund
          </Link>
          <div className="space-x-4 hidden md:flex">
            <Link href="/organizations" className="text-gray-600 hover:text-blue-600">
              Organizations
            </Link>
            <Link href="/campaigns" className="text-gray-600 hover:text-blue-600">
              Campaigns
            </Link>
            <Link href="/expenses" className="text-gray-600 hover:text-blue-600">
              Expenses
            </Link>
            <Link href="/fund" className="text-gray-600 hover:text-blue-600">
              Add Funds
            </Link>
          </div>
        </div>
        <div>
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
    </nav>
  );
}