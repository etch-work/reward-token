const assertJump = require('./helpers/assertJump');
const timer = require('./helpers/timer');

let CONST = require('./helpers/constants');
let EtchReward = artifacts.require("../contracts/EtchReward.sol");

let chai = require('chai');
let assert = chai.assert;

contract('02_EtchReward', function (accounts) {

	let owner = accounts[0];
	let beneficiary = "0x651A3731f717a17777c9D8d6f152Aa9284978Ea3" //accounts[9];

	let contributor1 = accounts[1];
	let contributor2 = accounts[2];
	let contributor3 = accounts[3];
	let contributor4 = accounts[4];

	let outsider1 = accounts[5];
	let outsider2 = accounts[6];

	let beneficiaryInitialBalance = 0;

	before(async () => {
		beneficiaryInitialBalance = await web3.eth.getBalance(beneficiary);
	})

	it("should not allow buying tokens before the start time", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		try {
			await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	})

	it("should allow buying tokens within first 24h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});
		await token.addContributor(contributor2, {from: owner});
		await token.addContributor(contributor3, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_24H / 2);
		await token.buy({value: web3.toWei(10, "ether"), from: contributor2});
		balance = await token.balanceOf(contributor2);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_24H - 1);
		await token.buy({value: web3.toWei(10, "ether"), from: contributor3});
		balance = await token.balanceOf(contributor3);
		assert.equal(balance, web3.toWei(10 * CONST.PRICE, "ether"));

	})


	it("should allow buying tokens after the 24h", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_24H);

		await token.buy({value: web3.toWei(110, "ether"), from: contributor1});
		let balance = await token.balanceOf(contributor1);
		assert.equal(balance, web3.toWei(110 * CONST.PRICE, "ether"));
	})

	it("should not allow buying tokens after the 2w", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_02W);

		try {
			await token.buy({value: web3.toWei(110, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}

		assert.fail('should have thrown before');
	})

	it("should not allow anybody to buy above the total cap of ether", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor4, {from: owner});

		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_24H);

		try {
			await token.buy({value: web3.toWei(10000.00001, "ether"), from: contributor4});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	})

	it("should have a fixed amount of ether in the beneficiary account", async () => {
		let beneficiaryEnd = await web3.eth.getBalance(beneficiary);
		assert.isTrue(beneficiaryEnd.equals(web3.toWei(140, "ether")), "beneficiary should have 140 ether balance");
	})

});
