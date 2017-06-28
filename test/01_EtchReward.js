const assertJump = require('./helpers/assertJump');
import expectThrow from './helpers/expectThrow';
import expectOutOfGas from './helpers/expectOutOfGas'

let Promise = require('bluebird');
let CONST = require('./helpers/constants');

let EtchReward = artifacts.require("../contracts/EtchReward.sol");

let chai = require('chai');
let assert = chai.assert;


contract('01_EtchReward', function (accounts) {

	let owner = accounts[0];
	let beneficiary = "0x651A3731f717a17777c9D8d6f152Aa9284978Ea3"; //accounts[9];

	let contributor1 = accounts[1];
	let contributor2 = accounts[2];
	let contributor3 = accounts[3];
	let contributor4 = accounts[4];

	let outsider1 = accounts[5];
	let outsider2 = accounts[6];

	let pSendTransaction = Promise.promisify(web3.eth.sendTransaction);
	let pGetTransactionReceipt = Promise.promisify(web3.eth.getTransactionReceipt);
	let pGetTransaction = Promise.promisify(web3.eth.getTransaction);

	console.log("blockStart= " + CONST.START_BLOCK);
	console.log("accounts= " + JSON.stringify(accounts, null, 2));
	console.log("999 ether= " + web3.toWei(999, "ether") + " wei");

	it("should show the correct balances for each of the test accounts", async () => {
		let ow = await web3.eth.getBalance(owner);
		assert.isTrue(ow.greaterThan(web3.toWei(900, "ether")), "owner should start with more than 900 ether balance");

		let c1 = await web3.eth.getBalance(contributor1);
		assert.isTrue(c1.greaterThan(web3.toWei(900, "ether")), "contributor2 should start with 999 ether balance");

		let c4 = await web3.eth.getBalance(contributor4);
		assert.isTrue(c4.equals(web3.toWei(99999, "ether")), "contributor4 should start with 999 ether balance");

		let b1 = await web3.eth.getBalance(beneficiary);
		assert.isTrue(b1.equals(web3.toWei(0, "ether")), "beneficiary should start with 0 ether balance");
	});

	it("should have set the correct block numbers values upon construction", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});


		//let data = EtchReward.new.getData(CONST.START_BLOCK, {from: owner});
		//EtchReward.unlinked_binary
		//EtchReward.abi
		//console.log(JSON.stringify(EtchReward, null, 2));
		let data = web3.eth.contract(EtchReward.abi).new.getData({data: EtchReward.unlinked_binary});
		console.log(JSON.stringify(data, null, 2));

		let _blockStart = await token.blockStart();
		assert.equal(CONST.START_BLOCK, _blockStart, "blockStart is not set properly");


		let block24h = await token.block24h();
		assert.equal(CONST.START_BLOCK + CONST.AVG_BLOCKS_24H, block24h, "block24h is not set properly");


		let block02w = await token.block02w();
		assert.equal(CONST.START_BLOCK + CONST.AVG_BLOCKS_02W, block02w, "block02w is not set properly");

	});

	it("should return the correct totalSupply after construction", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		let totalSupply = await token.totalSupply();

		assert.equal(totalSupply, 0);
	});

	it("should only allow the owner to whitelist contributors", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		try {
			await token.addContributor(contributor1, {from: outsider1});
		} catch (error) {
			return assertJump(error);
		}

		assert.fail('should have thrown before');
	});

	it("should allow the owner to whitelist contributors", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		let reg1 = await token.isContributor.call(contributor1);
		assert.isFalse(reg1, "should not be registered before owner adds it");

		await token.addContributor(contributor1, {from: owner});
		let reg2 = await token.isContributor.call(contributor1);
		assert.isTrue(reg2, "should be registered after being added by owner");
	});

	it("should not allow sending of ether without the address being whitelisted first", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		try {
			await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should not allow a contributor to send 2 transactions in the first 48h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);
		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});

		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		try {
			await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should allow a whitelisted contributor to send less than 1 ether in the first 24h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);
		await token.buy({value: web3.toWei(0.1, "ether"), from: contributor1});
	});

	it("should not allow a whitelisted contributor to send more than CONST.MAX_ETHER_24H ether in the first 24h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		try {
			await token.buy({value: web3.toWei(CONST.MAX_ETHER_24H+0.1, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should allow a whitelisted contributor to send between >0 and <=100 ether in the first 48h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		// we only executed one buy so the total should be the same as balance above
		let totalSupply = await token.totalSupply()
		assert.isTrue(totalSupply.equals(balance));
	});


	it("should allow calling buy by using send with data field", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		let data = "0xa6f2ae3a";
		let tx = await pSendTransaction({
			data: data,
			value: web3.toWei(10, "ether"),
			from: contributor1,
			to: token.address,
			gas: 100000
		})

		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		let totalSupply = await token.totalSupply()
		assert.isTrue(totalSupply.equals(balance));
	});

	it("should allow sending ETH directly to the contract address with enough gas", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		let tx = await pSendTransaction({
			value: web3.toWei(10, "ether"),
			from: contributor1,
			to: token.address,
			gas: 100000
		})

		let receipt = await pGetTransactionReceipt(tx);
		console.log(JSON.stringify(receipt, null, 2))

		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		let totalSupply = await token.totalSupply()
		assert.isTrue(totalSupply.equals(balance));
	});

	it("should not allow a contributor to transfer tokens to a different address; tokens are locked", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);
		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});

		try {
			await token.transfer(contributor2, web3.toWei(10, "ether"), {from: contributor1})
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	})

});
