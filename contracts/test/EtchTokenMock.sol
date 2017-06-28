pragma solidity ^0.4.11;


import "../../contracts/EtchReward.sol";
import "../../zeppelin/contracts/token/StandardToken.sol";

contract EtchTokenMock is StandardToken {

  string public constant name   = "Etch Fuel Token";
  string public constant symbol = "ETCH";
  uint public constant decimals = 18;

  uint public constant rewardsMultiplier = 15;

  EtchReward public etchRewards = EtchReward(0x0);

  function EtchTokenMock(EtchReward _rewards) {
    etchRewards = _rewards;
  }

  modifier onlyRewardsHolder() {
    if(etchRewards.balanceOf(msg.sender) == 0) {
      throw;
    }
    _;
  }

  function claim() public onlyRewardsHolder {
    uint rewardTokens = etchRewards.balanceOf(msg.sender);
    etchRewards.migrate(msg.sender);
    balances[msg.sender] = balances[msg.sender].add(rewardsMultiplier*rewardTokens).div(10);
  }

}
