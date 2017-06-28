const assertJump = require('./helpers/assertJump');
const assertOutOfGas = require('./helpers/assertOutOfGas');
const timer = require('./helpers/timer');
let CONST = require('./helpers/constants');

let EtchReward = artifacts.require("../contracts/EtchReward.sol");
let EtchTokenMock = artifacts.require("../contracts/test/EtchTokenMock.sol");

let chai = require('chai');
let assert = chai.assert;

contract('04_EtchReward', function (accounts) {

	let owner = accounts[0];

	let contributor1 = accounts[1];
	let contributor2 = accounts[2];
	let contributor3 = accounts[3];
	let contributor4 = accounts[4];

	let outsider1 = accounts[5];
	let outsider2 = accounts[6];

	it("should not allow contributors to buy any more if contract is stopped for emergency", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.pause({from: owner})
		try {
			await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	});

	it("should allow contributors to buy if contract is released from emergency", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});
		await token.addContributor(contributor1, {from: owner});
		await token.addContributor(contributor2, {from: owner});

		await token.setBlock(CONST.START_BLOCK);

		await token.pause({from: owner})
		try {
			await token.buy({value: web3.toWei(10, "ether"), from: contributor1});
		} catch (error) {
			assertJump(error);
		}

		await token.unpause({from: owner})
		await token.buy({value: web3.toWei(10, "ether"), from: contributor2});
	});

	it("should only allow the owner to stop for emergency", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		try {
			await token.pause({from: outsider1})
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	})

	it("should only allow the owner to release from emergency", async () => {
		let token = await EtchReward.new(CONST.START_BLOCK, {from: owner});

		await token.pause({from: owner})
		try {
			await token.unpause({from: outsider1})
		} catch (error) {
			return assertJump(error);
		}
		assert.fail('should have thrown before');
	})
});
