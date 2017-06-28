pragma solidity ^0.4.11;


import "../zeppelin/contracts/ReentrancyGuard.sol";
import "../zeppelin/contracts/token/BasicToken.sol";
import "../zeppelin/contracts/lifecycle/Pausable.sol";

contract EtchReward is Pausable, BasicToken, ReentrancyGuard {

    // address public owner;                // Ownable
    // bool public paused = false;          // Pausable
    // mapping(address => uint) balances;   // BasicToken
    // uint public totalSupply;             // ERC20Basic
    // bool private rentrancy_lock = false; // ReentrancyGuard

    //
    // @dev constants
    //
    string public constant name   = "Etch Reward Token";
    string public constant symbol = "ETCHR";
    uint public constant decimals = 18;

    //
    // @dev the main address to be forwarded all ether
    //
    address public constant BENEFICIARY = 0x651A3731f717a17777c9D8d6f152Aa9284978Ea3;

    // @dev number of tokens one receives for every 1 ether they send
    uint public constant PRICE = 8;

    // avg block time = 17.20 https://etherscan.io
    uint public constant AVG_BLOCKS_24H = 5023;  // 3600 * 24 / 17.20
    uint public constant AVG_BLOCKS_02W = 70325; // 3600 * 24 * 14 / 17.20

    uint public constant MAX_ETHER_24H = 40 ether;
    uint public constant ETHER_CAP     = 2660 ether;

    uint public totalEther = 0;
    uint public blockStart = 0;
    uint public block24h   = 0;
    uint public block02w   = 0;

    // @dev address of the actual ICO contract to be deployed later
    address public icoContract = 0x0;

    //
    // @dev owner authorized addresses to participate in this pre-ico
    //
    mapping(address => bool) contributors;


    // @dev constructor function
    function EtchReward(uint _blockStart) {
        blockStart  = _blockStart;
        block24h = blockStart + AVG_BLOCKS_24H;
        block02w = blockStart + AVG_BLOCKS_02W;
    }

    //
    // @notice the ability to transfer tokens is disabled
    //
    function transfer(address, uint) {
        throw;
    }

    //
    // @notice we DO allow sending ether directly to the contract address
    //
    function () payable {
        buy();
    }

    //
    // @dev modifiers
    //
    modifier onlyContributors() {
        if(contributors[msg.sender] != true) {
            throw;
        }
        _;
    }

    modifier onlyIcoContract() {
        if(icoContract == 0x0 || msg.sender != icoContract) {
            throw;
        }
        _;
    }

    //
    // @dev call this to authorize participants to this pre-ico sale
    // @param the authorized participant address
    //
    function addContributor(address _who) public onlyOwner {
        contributors[_who] = true;
    }

    // @dev useful for contributor to check before sending ether
    function isContributor(address _who) public constant returns(bool) {
        return contributors[_who];
    }

    //
    // @dev this will be later set by the owner of this contract
    //
    function setIcoContract(address _contract) public onlyOwner {
        icoContract = _contract;
    }

    //
    // @dev function called by the ICO contract to transform the tokens into ETCH tokens
    //
    function migrate(address _contributor) public
    onlyIcoContract
    whenNotPaused {

        if(getBlock() < block02w) {
            throw;
        }
        totalSupply = totalSupply.sub(balances[_contributor]);
        balances[_contributor] = 0;
    }

    function buy() payable
    nonReentrant
    onlyContributors
    whenNotPaused {

        address _recipient = msg.sender;
        uint blockNow = getBlock();

        // are we before or after the sale period?
        if(blockNow < blockStart || block02w <= blockNow) {
            throw;
        }

        if (blockNow < block24h) {

            // only one transaction is authorized
            if (balances[_recipient] > 0) {
                throw;
            }

            // only allowed to buy a certain amount
            if (msg.value > MAX_ETHER_24H) {
                throw;
            }
        }

        // make sure we don't go over the ether cap
        if (totalEther.add(msg.value) > ETHER_CAP) {
            throw;
        }

        uint tokens = msg.value.mul(PRICE);
        totalSupply = totalSupply.add(tokens);

        balances[_recipient] = balances[_recipient].add(tokens);
        totalEther.add(msg.value);

        if (!BENEFICIARY.send(msg.value)) {
            throw;
        }
    }

    // TODO: to be used for testing and removed on final deployment
    uint blockNumber = 0;
    function setBlock(uint _block) {
        blockNumber = _block;
    }
    function getBlock() public constant returns (uint) {
        if(blockNumber != 0) {
            return blockNumber;
        }
        return block.number;
    }

}