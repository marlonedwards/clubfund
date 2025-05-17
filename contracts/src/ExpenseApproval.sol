// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOrganization {
    function isMember(address account) external view returns (bool);
    function isTreasurer(address account) external view returns (bool);
}

contract ExpenseApproval is Ownable {
    enum ExpenseStatus { PENDING, APPROVED, REJECTED, REIMBURSED }
    
    struct Expense {
        string description;
        uint256 amount;
        string receiptURI;
        address requester;
        uint256 campaignId;
        ExpenseStatus status;
        uint256 submissionDate;
        uint256 requiredApprovals;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }
    
    mapping(uint256 => Expense) public expenses;
    uint256 public expenseCount;
    
    IOrganization public organizationContract;
    
    event ExpenseSubmitted(uint256 expenseId, address requester, uint256 amount);
    event ExpenseApproved(uint256 expenseId, address approver);
    event ExpenseRejected(uint256 expenseId, address rejecter);
    event ExpenseReimbursed(uint256 expenseId, address recipient, uint256 amount);
    
    constructor(address _organizationAddress) Ownable(msg.sender) {
        organizationContract = IOrganization(_organizationAddress);
    }
    
    function submitExpense(
        string memory description,
        uint256 amount,
        string memory receiptURI,
        uint256 campaignId,
        uint256 requiredApprovals
    ) external returns (uint256) {
        require(organizationContract.isMember(msg.sender), "Only members can submit expenses");
        
        uint256 expenseId = expenseCount++;
        
        Expense storage expense = expenses[expenseId];
        expense.description = description;
        expense.amount = amount;
        expense.receiptURI = receiptURI;
        expense.requester = msg.sender;
        expense.campaignId = campaignId;
        expense.status = ExpenseStatus.PENDING;
        expense.submissionDate = block.timestamp;
        expense.requiredApprovals = requiredApprovals;
        expense.approvalCount = 0;
        
        emit ExpenseSubmitted(expenseId, msg.sender, amount);
        return expenseId;
    }
    
    function approveExpense(uint256 expenseId) external {
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can approve expenses");
        
        Expense storage expense = expenses[expenseId];
        require(expense.status == ExpenseStatus.PENDING, "Expense is not pending");
        require(!expense.approvals[msg.sender], "Already approved");
        require(expense.requester != msg.sender, "Cannot approve own expense");
        
        expense.approvals[msg.sender] = true;
        expense.approvalCount++;
        
        emit ExpenseApproved(expenseId, msg.sender);
        
        if (expense.approvalCount >= expense.requiredApprovals) {
            expense.status = ExpenseStatus.APPROVED;
        }
    }
    
    function rejectExpense(uint256 expenseId) external {
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can reject expenses");
        
        Expense storage expense = expenses[expenseId];
        require(expense.status == ExpenseStatus.PENDING, "Expense is not pending");
        
        expense.status = ExpenseStatus.REJECTED;
        emit ExpenseRejected(expenseId, msg.sender);
    }
    
    function reimburseExpense(uint256 expenseId, address payable recipient) external payable {
        Expense storage expense = expenses[expenseId];
        
        require(organizationContract.isTreasurer(msg.sender), "Only treasurers can reimburse expenses");
        require(expense.status == ExpenseStatus.APPROVED, "Expense must be approved");
        require(msg.value >= expense.amount, "Insufficient reimbursement amount");
        
        expense.status = ExpenseStatus.REIMBURSED;
        recipient.transfer(expense.amount);
        
        // Return any excess funds
        if (msg.value > expense.amount) {
            payable(msg.sender).transfer(msg.value - expense.amount);
        }
        
        emit ExpenseReimbursed(expenseId, recipient, expense.amount);
    }
    
    function getExpenseStatus(uint256 expenseId) external view returns (ExpenseStatus) {
        return expenses[expenseId].status;
    }
    
    function getExpenseDetails(uint256 expenseId) external view returns (
        string memory description,
        uint256 amount,
        string memory receiptURI,
        address requester,
        uint256 campaignId,
        ExpenseStatus status,
        uint256 submissionDate,
        uint256 requiredApprovals,
        uint256 approvalCount
    ) {
        Expense storage expense = expenses[expenseId];
        return (
            expense.description,
            expense.amount,
            expense.receiptURI,
            expense.requester,
            expense.campaignId,
            expense.status,
            expense.submissionDate,
            expense.requiredApprovals,
            expense.approvalCount
        );
    }
    
    function hasApproved(uint256 expenseId, address approver) external view returns (bool) {
        return expenses[expenseId].approvals[approver];
    }
}