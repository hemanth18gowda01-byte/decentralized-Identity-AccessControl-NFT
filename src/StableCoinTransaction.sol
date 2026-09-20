// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StableCoinTransaction {
    IERC20 public immutable usdcToken;

    constructor(address _usdcAddress) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcAddress);
    }

    function forwardUSDC(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Cannot send to zero address");

        uint256 allowance = usdcToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient contract allowance. Approve first!");

        return usdcToken.transferFrom(msg.sender, to, amount);
    }
}
