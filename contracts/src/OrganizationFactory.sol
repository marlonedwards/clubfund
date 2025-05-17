// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OrganizationFactory is Ownable {
    event OrganizationCreated(address organizationAddress, string name, address admin);
    
    struct OrganizationData {
        string name;
        string description;
        string mission;
        uint256 creationDate;
        address admin;
    }
    
    mapping(address => OrganizationData) public organizations;
    address[] public organizationAddresses;
    
    constructor() Ownable(msg.sender) {}
    
    function createOrganization(
        string memory name,
        string memory description,
        string memory mission
    ) external returns (address) {
        Organization org = new Organization(name, description, mission, msg.sender);
        address orgAddress = address(org);
        
        organizations[orgAddress] = OrganizationData({
            name: name,
            description: description,
            mission: mission,
            creationDate: block.timestamp,
            admin: msg.sender
        });
        
        organizationAddresses.push(orgAddress);
        emit OrganizationCreated(orgAddress, name, msg.sender);
        
        return orgAddress;
    }
    
    function getOrganizationCount() external view returns (uint256) {
        return organizationAddresses.length;
    }
    
    function getOrganizationAddressByIndex(uint256 index) external view returns (address) {
        require(index < organizationAddresses.length, "Index out of bounds");
        return organizationAddresses[index];
    }
}

contract Organization is Ownable {
    string public name;
    string public description;
    string public mission;
    uint256 public creationDate;
    
    mapping(address => bool) public members;
    mapping(address => bool) public treasurers;
    address[] public memberArray;
    
    event MemberAdded(address member);
    event MemberRemoved(address member);
    event TreasurerAdded(address treasurer);
    event TreasurerRemoved(address treasurer);
    
    constructor(
        string memory _name,
        string memory _description,
        string memory _mission,
        address admin
    ) Ownable(admin) {
        name = _name;
        description = _description;
        mission = _mission;
        creationDate = block.timestamp;
        members[admin] = true;
        memberArray.push(admin);
        treasurers[admin] = true;
    }
    
    function addMember(address member) external onlyOwner {
        require(!members[member], "Already a member");
        members[member] = true;
        memberArray.push(member);
        emit MemberAdded(member);
    }
    
    function removeMember(address member) external onlyOwner {
        require(members[member], "Not a member");
        require(member != owner(), "Cannot remove admin");
        members[member] = false;
        
        // Remove from array (simplified - could be optimized)
        for (uint i = 0; i < memberArray.length; i++) {
            if (memberArray[i] == member) {
                memberArray[i] = memberArray[memberArray.length - 1];
                memberArray.pop();
                break;
            }
        }
        
        emit MemberRemoved(member);
    }
    
    function addTreasurer(address treasurer) external onlyOwner {
        require(members[treasurer], "Must be a member first");
        treasurers[treasurer] = true;
        emit TreasurerAdded(treasurer);
    }
    
    function removeTreasurer(address treasurer) external onlyOwner {
        require(treasurer != owner(), "Cannot remove admin as treasurer");
        treasurers[treasurer] = false;
        emit TreasurerRemoved(treasurer);
    }
    
    function getMemberCount() external view returns (uint256) {
        return memberArray.length;
    }
    
    function isMember(address account) external view returns (bool) {
        return members[account];
    }
    
    function isTreasurer(address account) external view returns (bool) {
        return treasurers[account];
    }
}