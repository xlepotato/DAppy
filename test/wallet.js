const { assert } = require("console");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const Wallet = artifacts.require('Wallet');

contract('Wallet', (accounts) => {
    let wallet;
    beforeEach(async () => {
        wallet = await Wallet.new([accounts[0], accounts[1], accounts[2]], 2);
        // truffle inject a web3 object in your test file, so you can reference it like this
        // and in order to send to a smart contract with web3, you access the
        await web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 1000});
    });
    it('should have correct approvers and quorum', async () => { // create a new test
        const approvers = await wallet.getApprovers(); // read-only function
        // use your pointer to the smart contract and then call the name of the Solidity function
        const quorum = await wallet.quorum();
        assert(approvers.length === 3);
        assert(approvers[0] === accounts[0]);
        assert(approvers[0] === accounts[1]);
        assert(approvers[0] === accounts[2]);
        assert(quorum.toNumber() === 2)
        // assert(quorum.toString() === '2000000000000'); // if the number is big, use string
    });
    it('should create transfers', async () => { // create a new test
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]}); // transaction receipt - ignore return value
        const transfers = await wallet.getTransfers();
        // Numbers that are fields of struct are not wrapped in BN.js objects, but are string instead ...
        // Need to change the way we compare numbers ...
        assert(transfers.length === 1);
        assert(transfers[0].id === '0');
        assert(transfers[0].amount === '100');
        assert(transfers[0].to === accounts[5]);
        assert(transfers[0].approvals === '0');
        assert(transfers[0].sent === false);
    });
    it('should NOT create transfers if sender is not approved', async () => {
        // using expectRevert function of @openzeppelin/test-helpers package
        await expectRevert(wallet.createTransfer(100, accounts[5], {from: accounts[4]}), 'only approver allowed');
    });
    it('should increment approvals', async () => {
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]})
        const transfers = await wallet.getTransfers();
        const balance = await web3.eth.getBalance(wallet.address); // getBalance method from Web3
        assert(transfers[0].approvals === '1');
        assert(transfers[0].sent === false);
        assert(balance === '1000');
    });
    it('should send transfer if quorum reached', async () => {
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        assert(balanceAfter.sub(balanceBefore).toNumber() === 100);
    });
    it('should NOT approve transfer if sender is not approved', async () => {
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
        await expectRevert(wallet.approveTransfer(0, {from: accounts[4]}), 'only approver allowed');
    });
    it('should NOT approve transfer if transfer is already sent', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        await expectRevert(wallet.approveTransfer(0, {from: accounts[2]}), 'transfer has already been sent');
    });
    it('should NOT approve transfer twice', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[0]});
        await expectRevert(wallet.approveTransfer(0, {from: accounts[0]}), 'cannot approve transfer twice');
    });
    // test comprehensively - all the functions of your smart contract (includes both happy path and unhappy path)

});
