deploy:
	forge script script/Deploy.s.sol --rpc-url "$(SEPOLIA_RPC_URL)" --private-key "$(PRIVATE_KEY)" --broadcast