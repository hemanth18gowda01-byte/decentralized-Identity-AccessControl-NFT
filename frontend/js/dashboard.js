import {
    apiGet
} from "./api.js";


const walletElement =
    document.getElementById("wallet");


async function loadDashboard() {

    if (!window.ethereum) {

        walletElement.innerText =
            "MetaMask not installed";

        return;
    }


    const accounts =
        await window.ethereum.request({
            method: "eth_accounts"
        });


    if (accounts.length === 0) {

        walletElement.innerText =
            "Wallet not connected";

        return;
    }


    const address =
        accounts[0];

    walletElement.innerText =
        `${address.slice(0, 6)}...${address.slice(-4)}`;


    try {

        const access =
            await apiGet(
                `/access/${address}`
            );

        console.log(
            "User access:",
            access
        );

    } catch (error) {

        console.error(
            "Could not load access information",
            error
        );
    }
}


if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        () => {
            loadDashboard();
        }
    );
}


loadDashboard();