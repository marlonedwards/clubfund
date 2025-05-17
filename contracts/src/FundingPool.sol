// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IOrganization {
    function isMember(address account) external view returns (bool);
    function isTreasurer(address account) external view returns (bool);
}

contract FundingPool is Ownable {
    enum FundingType { GENERAL, EVENT, TRAVEL }
    enum FundingStatus { ACTIVE, COMPLETED, CANCELLED }
    
    struct FundingCampaign {
        string name;
        string description;
        uint256 goal;
        uint256 collected;
        uint256 deadline;
        FundingType fundingType;
        FundingStatus status;
        address organization;
        string[] expenseItems;
        uint256[] expenseAmounts;
    }
    
    mapping(uint256 => FundingCampaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    uint256 public campaignCount;
    IOrganization public organizationContract;
    
    event CampaignCreated(uint256 campaignId, string name, uint256 goal, address organization);
    event FundsContributed(uint256 campaignId, address contributor, uint256 amount);
    event CampaignCompleted(uint256 campaignId);
    event CampaignCancelled(uint256 campaignId);
    
    constructor(address _organizationAddress) Ownable(msg.sender) {
        organizationContract = IOrganization(_organizationAddress);
    }
    
    function createCampaign(
        string memory name,
        string memory description,
        uint256 goal,
        uint256 deadline,
        FundingType fundingType,
        string[] memory expenseItems,
        uint256[] memory expenseAmounts
    ) external returns (uint256) {
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can create campaigns");
        
        uint256 campaignId = campaignCount++;
        
        campaigns[campaignId] = FundingCampaign({
            name: name,
            description: description,
            goal: goal,
            collected: 0,
            deadline: deadline,
            fundingType: fundingType,
            status: FundingStatus.ACTIVE,
            organization: msg.sender,
            expenseItems: expenseItems,
            expenseAmounts: expenseAmounts
        });
        
        emit CampaignCreated(campaignId, name, goal, msg.sender);
        return campaignId;
    }
    
    function contribute(uint256 campaignId) external payable {
        FundingCampaign storage campaign = campaigns[campaignId];
        
        require(campaign.status == FundingStatus.ACTIVE, "Campaign is not active");
        require(block.timestamp < campaign.deadline || campaign.deadline == 0, "Campaign deadline has passed");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        campaign.collected += msg.value;
        contributions[campaignId][msg.sender] += msg.value;
        
        emit FundsContributed(campaignId, msg.sender, msg.value);
        
        if (campaign.collected >= campaign.goal) {
            campaign.status = FundingStatus.COMPLETED;
            emit CampaignCompleted(campaignId);
        }
    }
    
    function cancelCampaign(uint256 campaignId) external {
        FundingCampaign storage campaign = campaigns[campaignId];
        
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can cancel campaigns");
        require(campaign.status == FundingStatus.ACTIVE, "Campaign is not active");
        
        campaign.status = FundingStatus.CANCELLED;
        emit CampaignCancelled(campaignId);
    }
    
    function withdrawFunds(uint256 campaignId, address payable recipient, uint256 amount) external {
        FundingCampaign storage campaign = campaigns[campaignId];
        
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can withdraw funds");
        require(campaign.status == FundingStatus.COMPLETED, "Campaign must be completed");
        require(amount <= campaign.collected, "Cannot withdraw more than collected");
        
        campaign.collected -= amount;
        recipient.transfer(amount);
    }
    
    function getContribution(uint256 campaignId, address contributor) external view returns (uint256) {
        return contributions[campaignId][contributor];
    }
    
    function getCampaignDetails(uint256 campaignId) external view returns (
        string memory name,
        string memory description,
        uint256 goal,
        uint256 collected,
        uint256 deadline,
        FundingType fundingType,
        FundingStatus status
    ) {
        FundingCampaign storage campaign = campaigns[campaignId];
        return (
            campaign.name,
            campaign.description,
            campaign.goal,
            campaign.collected,
            campaign.deadline,
            campaign.fundingType,
            campaign.status
        );
    }
    
    function getExpenseItems(uint256 campaignId) external view returns (string[] memory, uint256[] memory) {
        FundingCampaign storage campaign = campaigns[campaignId];
        return (campaign.expenseItems, campaign.expenseAmounts);
    }
}