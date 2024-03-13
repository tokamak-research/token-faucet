import * as anchor from "@coral-xyz/anchor";
import { TokenFaucet } from "../../target/types/token_faucet";
import { confirmTransaction, createWallet, logger, v0_pack } from "../helper";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createHash } from "crypto";
import { assert, expect } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.TokenFaucet as anchor.Program<TokenFaucet>;

describe("Token Limiter", () => {
    it("Mint tokens on limit", async () => {
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
            await program.methods.tokenMint("mockSOL", new anchor.BN(5 * 10 ** 9))
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
        assert.equal(userbalance.value.uiAmount, 5);
    });

    it("Mint tokens beyond limit", async () => {
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
            await program.methods.tokenMint("mockSOL", new anchor.BN(10 * 10 ** 9))
                .accounts({
                    user: user.publicKey,
                    mintAccount: mintPDA,
                    tokenLimiter: tokenLimiterPDA,
                    mintRecord: mintRecordPDA,
                    associatedTokenAccount: mockSOLATA
                }).instruction(),
        ];

        const tx1 = await provider.connection.sendTransaction(await v0_pack(instructions, user), { skipPreflight: true });
        logger(tx1);

        await confirmTransaction(tx1);

        try {
            await provider.connection.getTokenAccountBalance(mockSOLATA);
        }
        catch (error) {
            expect(error.message).to.equal("failed to get token account balance: Invalid param: could not find account");
        }
    });

    it("Mint tokens on limit then wait for refresh", async () => {
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

        const instructions1: anchor.web3.TransactionInstruction[] = [
            await program.methods.userInitialize()
                .accounts({
                    user: user.publicKey,
                    mintRecord: mintRecordPDA,
                    mintAccount: mintPDA,
                }).instruction(),
            await program.methods.tokenMint("mockSOL", new anchor.BN(5 * 10 ** 9))
                .accounts({
                    user: user.publicKey,
                    mintAccount: mintPDA,
                    tokenLimiter: tokenLimiterPDA,
                    mintRecord: mintRecordPDA,
                    associatedTokenAccount: mockSOLATA
                }).instruction(),
        ];

        const refresh_blockheight = (await provider.connection.getLatestBlockhash()).lastValidBlockHeight + 5;
        const tx1 = await provider.connection.sendTransaction(await v0_pack(instructions1, user), { skipPreflight: true });
        logger(tx1);

        await confirmTransaction(tx1);

        const userbalance1 = await provider.connection.getTokenAccountBalance(mockSOLATA);
        assert.equal(userbalance1.value.uiAmount, 5);


        const instructions2: anchor.web3.TransactionInstruction[] = [
            await program.methods.tokenMint("mockSOL", new anchor.BN(10 * 10 ** 9))
                .accounts({
                    user: user.publicKey,
                    mintAccount: mintPDA,
                    tokenLimiter: tokenLimiterPDA,
                    mintRecord: mintRecordPDA,
                    associatedTokenAccount: mockSOLATA
                }).instruction(),
        ];

        const tx2 = await provider.connection.sendTransaction(await v0_pack(instructions2, user), { skipPreflight: true });
        logger(tx2);

        await confirmTransaction(tx2);

        const userbalance2 = await provider.connection.getTokenAccountBalance(mockSOLATA);
        assert.equal(userbalance2.value.uiAmount, 5);

        while (refresh_blockheight > (await provider.connection.getLatestBlockhash()).lastValidBlockHeight) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const instructions3: anchor.web3.TransactionInstruction[] = [
            await program.methods.tokenMint("mockSOL", new anchor.BN(5 * 10 ** 9))
                .accounts({
                    user: user.publicKey,
                    mintAccount: mintPDA,
                    tokenLimiter: tokenLimiterPDA,
                    mintRecord: mintRecordPDA,
                    associatedTokenAccount: mockSOLATA
                }).instruction(),
        ];

        const tx3 = await provider.connection.sendTransaction(await v0_pack(instructions3, user), { skipPreflight: true });
        logger(tx3);

        await confirmTransaction(tx3);

        const userbalance3 = await provider.connection.getTokenAccountBalance(mockSOLATA);
        assert.equal(userbalance3.value.uiAmount, 10);
    });
});