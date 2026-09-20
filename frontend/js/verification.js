import {
    apiPost
} from "./api.js";


const generateButton =
    document.getElementById(
        "generateProofButton"
    );

const verifyButton =
    document.getElementById(
        "verifyProofButton"
    );

const proofStatus =
    document.getElementById(
        "proofStatus"
    );

const proofInput =
    document.getElementById(
        "proof"
    );

const result =
    document.getElementById(
        "verificationResult"
    );


async function generateProof() {

    const did =
        document.getElementById("did").value;

    const type =
        document.getElementById(
            "verificationType"
        ).value;


    proofStatus.innerText =
        "Generating proof...";


    try {

        const response =
            await apiPost(
                "/verification/generate",
                {
                    did: did,
                    type: type
                }
            );


        proofInput.value =
            response.proof;

        proofStatus.innerText =
            "Proof generated";

    } catch (error) {

        console.error(error);

        proofStatus.innerText =
            "Proof generation failed";
    }
}


async function verifyProof() {

    const proof =
        proofInput.value;


    try {

        const response =
            await apiPost(
                "/verification/zk",
                {
                    proof: proof
                }
            );


        result.innerText =
            response.valid
                ? "VALID ✓"
                : "INVALID ✗";

    } catch (error) {

        console.error(error);

        result.innerText =
            "Verification failed";
    }
}


generateButton.addEventListener(
    "click",
    generateProof
);


verifyButton.addEventListener(
    "click",
    verifyProof
);