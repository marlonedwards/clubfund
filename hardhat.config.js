require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    baseSepolia: {
      url: "https://base-sepolia-rpc.publicnode.com",
      accounts: ["YOUR-WALLET-ADDRESS"],
      gasPrice: 1000000000,
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
  },
};