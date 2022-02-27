// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract Wallet {
    address[] public approvers;
    uint public quorum; // number of approvals needed to approve a transfer
    struct Transfer {
        uint id;
        uint amount;
        address payable to; // to send Ether to this address
        uint approvals; // number of approvals received
        bool sent; // indicate transfer status
    }

    Transfer[] public transfers;  // array to hold all these transfers
    mapping(address => mapping(uint => bool)) public approvals; // record who has approved what

    constructor(address[] memory _approvers, uint _quorum) public {
        approvers = _approvers;
        quorum = _quorum;
    }

    function getApprovers() external view returns(address[] memory) {
        return approvers;
    }

    function getTransfers() external view returns(Transfer[] memory) {
        return transfers;
    }

    function createTransfer(uint amount, address payable to) external onlyApprover() {
        transfers.push(Transfer(
            transfers.length,
            amount,
            to,
            0,
            false
        ));
    }

    function approveTransfer(uint id) external onlyApprover() {
        require(transfers[id].sent == false, 'transfer has already been sent'); // make sure transfer has not been sent
        require(approvals[msg.sender][id] == false, 'cannot approve transfer twice'); // check sender of the transaction has not already approved transfer

        approvals[msg.sender][id] = true;
        transfers[id].approvals++; // increment the num of approvals by 1

        if (transfers[id].approvals >= quorum) { // check num of approvals >= min num of approvals required to send a transfer
            transfers[id].sent = true;  // set transfer status to true
            address payable to = transfers[id].to;
            uint amount = transfers[id].amount;
            to.transfer(amount); // method attached to type payable to transfer Ether
        }
    }

    receive() external payable {} // send ether to smart contract and have it received

    modifier onlyApprover() { // access control to restrict function execution to the addresses inside the approvers array
        bool allowed = false;
        for(uint i = 0; i < approvers.length; i++) {
            if (approvers[i] == msg.sender) {
                allowed = true;
            }
        }
        require(allowed == true, 'only approver allowed');
        _;
    }
}
