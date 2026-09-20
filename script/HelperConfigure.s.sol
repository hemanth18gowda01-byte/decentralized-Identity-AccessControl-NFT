//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import {Script,console} from "forge-std/Script.sol";
import {SmartAccount} from "../src/accountAbstraction/SmartAccount.sol";
import {EntryPoint} from "lib/account-abstraction/contracts/core/EntryPoint.sol";

contract HelperConfigure is Script {
    error HelperConfigure__NotFromEntryPoint();

    struct NetworkConfig {
        address entryPoint;
        address account;
    }


    uint256 constant ETH_SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant ZKSYNC_SEPOLIA_CHAIN_ID = 300;
    address constant BURNER_ADDRESS = 0x29d7F532A8a271cBaf1f27f2312Bf2188612e929;
    address constant DEFAULT_ADDRESS = 0x29d7F532A8a271cBaf1f27f2312Bf2188612e929;
    address constant RANDOM_APPROVER = 0x6099506105B0Da195Dc9Ee35cdc12499dd652Cac;


    NetworkConfig public localNetworkConfig;
    mapping (uint256 chainId => NetworkConfig) public networkConfigs;

    constructor(){
        networkConfigs[ETH_SEPOLIA_CHAIN_ID] = getEthSepoliaNetworkConfig();
        networkConfigs[ZKSYNC_SEPOLIA_CHAIN_ID] = getZkSyncSepoliaNetworkConfig();
    }
    function getConfig() public view returns (NetworkConfig memory){
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        require(chainId == ETH_SEPOLIA_CHAIN_ID || chainId == ZKSYNC_SEPOLIA_CHAIN_ID, "Unsupported chain ID");
        return networkConfigs[chainId];
    }

    function getEthSepoliaNetworkConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            entryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789,
            account : BURNER_ADDRESS
        });
    }

    function getZkSyncSepoliaNetworkConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            entryPoint: address(0),
            account: BURNER_ADDRESS
        });
    }

    function getOrCreateNetworkConfig(uint256 chainId) public returns (NetworkConfig memory) {
        if (localNetworkConfig.entryPoint != address(0)) {
            return localNetworkConfig;
        } 
        //deploy mocks 
        console.log("Deploying mocks for chainId:", chainId);
        vm.startBroadcast(DEFAULT_ADDRESS);
        EntryPoint entryPoint = new EntryPoint();
        vm.stopBroadcast();
        return NetworkConfig({
            entryPoint: address(entryPoint),
            account: DEFAULT_ADDRESS
        });
    }
}