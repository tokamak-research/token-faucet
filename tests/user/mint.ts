import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { TokenFaucet } from "../../target/types/token_faucet";
import { confirmTransaction, createWallet, logger, v0_pack } from "../helper";
import { createHash } from "crypto";
import { assert } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const admin = provider.wallet as anchor.Wallet;
const program = anchor.workspace.TokenFaucet as anchor.Program<TokenFaucet>;

it("Mint tokens", async () => {
    const user = await createWallet();
    const [mintPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), Buffer.from("mockSOL")],
        program.programId
    );
    let hexString = createHash('sha256').update(Buffer.concat([user.publicKey.toBuffer(), mintPDA.toBuffer()])).digest('hex');
    let seed = Uint8Array.from(Buffer.from(hexString, 'hex'));
    const [mintRecordPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId
    );
    const [tokenLimiterPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("limit"),
            Buffer.from("mockSOL")
        ],
        program.programId
    );
    const mockSOLATA = getAssociatedTokenAddressSync(
        mintPDA,
        user.publicKey
    )

    const instructions: anchor.web3.TransactionInstruction[] = [
        await program.methods.userInitialize()
            .accounts({
                user: user.publicKey,
                mintRecord: mintRecordPDA,
                mintAccount: mintPDA,
            }).instruction(),
        await program.methods.tokenMint("mockSOL", new anchor.BN(1 * 10 ** 9))
            .accounts({
                user: user.publicKey,
                mintAccount: mintPDA,
                tokenLimiter: tokenLimiterPDA,
                mintRecord: mintRecordPDA,
                associatedTokenAccount: mockSOLATA
            }).instruction(),
    ];

    const tx = await provider.connection.sendTransaction(await v0_pack(instructions, user));
    logger(tx);

    await confirmTransaction(tx);

    const userbalance = await provider.connection.getTokenAccountBalance(mockSOLATA);
    assert.equal(userbalance.value.uiAmount, 1);
});