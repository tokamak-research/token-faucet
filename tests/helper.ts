import * as anchor from "@coral-xyz/anchor";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { loglevel } from "./constants";

const provider = anchor.AnchorProvider.env();

export async function v0_pack(instructions: anchor.web3.TransactionInstruction[], payer: anchor.web3.Keypair | anchor.Wallet, signer: anchor.web3.Keypair = null) {
    const blockhash = await provider.connection
        .getLatestBlockhash()
        .then(res => res.blockhash);

    const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    if (payer instanceof anchor.Wallet) transaction.sign([payer.payer]);
    else if (payer instanceof anchor.web3.Keypair) transaction.sign([payer]);
    if (signer) transaction.sign([signer]);

    return transaction;
}

export async function createWallet() {
    const payer = anchor.web3.Keypair.generate();
    const setup = await provider.connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 1,
    );
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: setup
    });
    return payer;
}

export async function confirmTransaction(tx) {
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx
    });
}

export function logger(message) {
    if (loglevel === "none") return;
    console.log("https://explorer.solana.com/tx/" + message + "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899");
}
