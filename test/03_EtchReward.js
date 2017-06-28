const assertJump = require('./helpers/assertJump');
const assertOutOfGas = require('./helpers/assertOutOfGas');
const timer = require('./helpers/timer');
let CONST = require('./helpers/constants');

let EtchReward = artifacts.require("../contracts/EtchReward.sol");
let EtchTokenMock = artifacts.require("../contracts/test/EtchTokenMock.sol");

let chai = require('chai');
let assert = chai.assert;

contract('03_EtchReward', function (accounts) {

	let owner = accounts[0];

	let contributor1 = accounts[1];
	let contributor2 = accounts[2];
	let contributor3 = accounts[3];
	let contributor4 = accounts[4];

	let outsider1 = accounts[5];
	let outsider2 = accounts[6];

	it("should allow the owner to set the EtchToken - ico contract - address", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		let etch = await EtchTokenMock.new({from: owner});

		await token.setIcoContract(etch.address, {from: owner});
	});

	it("should allow the owner to set the EtchToken contract twice", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		let etch1 = await EtchTokenMock.new(token.address, {from: owner});
		await token.setIcoContract(etch1.address, {from: owner});

		let etch2 = await EtchTokenMock.new(token.address, {from: owner});
		await token.setIcoContract(etch2.address, {from: owner});
	});

	it("should not allow other people to set the EtchToken contract", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		let etch = await EtchTokenMock.new(token.address, {from: owner});

		try {
			await token.setIcoContract(etch.address, {from: outsider1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should not allow token claiming before 2 weeks", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		let etch = await EtchTokenMock.new(token.address, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.addContributor(contributor1, {from: owner});
		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});

		await token.setIcoContract(etch.address, {from: owner});
		try {
			await etch.claim({from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should allow token claiming after 2 weeks; one call only", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		let etch = await EtchTokenMock.new(token.address, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.addContributor(contributor1, {from: owner});
		await token.buy({value: web3.toWei(10, "ether"), from: contributor1});

		let balanceBefore = await token.balanceOf(contributor1);
		assert.equal(balanceBefore, web3.toWei(10 * CONST.PRICE, "ether"));

		let totalSupply1 = await token.totalSupply();
		assert.isTrue(totalSupply1.equals(balanceBefore));

		await token.setIcoContract(etch.address, {from: owner});

		// move the time after 2 weeks
		await token.setBlock(CONST.START_BLOCK + CONST.AVG_BLOCKS_02W);
		await etch.claim({from: contributor1});

		let etchBalance = await etch.balanceOf(contributor1)
		assert.equal(etchBalance, web3.toWei(10 * CONST.REWARD_MULTIPLIER * CONST.PRICE, "ether"));

		let balanceAfter = await token.balanceOf(contributor1)
		assert.equal(balanceAfter, web3.toWei(0, "ether"));

		let totalSupply2 = await token.totalSupply();
		assert.equal(balanceAfter, web3.toWei(0, "ether"));

		// should not be allowed to claim more than once
		try {
			await etch.claim({from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

});
