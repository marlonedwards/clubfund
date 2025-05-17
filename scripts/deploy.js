const hre = require("hardhat");

async function main() {
  try {
    // Deploy Organization Factory
    const OrganizationFactory = await hre.ethers.getContractFactory("OrganizationFactory");
    const organizationFactory = await OrganizationFactory.deploy();
    await organizationFactory.waitForDeployment();
    
    const factoryAddress = await organizationFactory.getAddress();
    console.log("OrganizationFactory deployed to:", factoryAddress);
    
    // Create an organization
    const tx = await organizationFactory.createOrganization("Test Org", "Test Description", "Test Mission");
    await tx.wait();
    
    // Get organization directly from contract state
    const count = await organizationFactory.getOrganizationCount();
    // Convert BigInt to Number for safe comparison/indexing
    const orgIndex = Number(count) - 1;
    const orgAddress = await organizationFactory.getOrganizationAddressByIndex(orgIndex);
    console.log("Sample organization created at:", orgAddress);
    
    // Deploy FundingPool
    const FundingPool = await hre.ethers.getContractFactory("FundingPool");
    const fundingPool = await FundingPool.deploy(orgAddress);
    await fundingPool.waitForDeployment();
    console.log("FundingPool deployed to:", await fundingPool.getAddress());
    
    // Deploy ExpenseApproval
    const ExpenseApproval = await hre.ethers.getContractFactory("ExpenseApproval");
    const expenseApproval = await ExpenseApproval.deploy(orgAddress);
    await expenseApproval.waitForDeployment();
    console.log("ExpenseApproval deployed to:", await expenseApproval.getAddress());
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });