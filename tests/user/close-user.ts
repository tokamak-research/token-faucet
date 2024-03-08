import * as anchor from "@coral-xyz/anchor";
import { TokenFaucet } from "../../target/types/token_faucet";
import { confirmTransaction, createWallet, logger, v0_pack } from "../helper";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import { assert, expect } from "chai";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.TokenFaucet as anchor.Program<TokenFaucet>;

describe("Close user account", () => {
    it("Close user account with no mint record", async () => {
        const user = await createWallet();
        const [mintPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("mint"), Buffer.from("mockSOL")],
            program.programId
        );
        let hexString = createHash('sha256').update(Buffer.concat([user.publicKey.toBytes(), mintPDA.toBytes()])).digest('hex');
        let seed = Uint8Array.from(Buffer.from(hexString, 'hex'));

        const [mintRecordPDA] = PublicKey.findProgramAddressSync(
            [seed],
            program.programId
        );

        const createInstructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.userInitialize().accounts({
                user: user.publicKey,
                mintRecord: mintRecordPDA,
                mintAccount: mintPDA,
            }).instruction(),
        ];

        const tx1 = await provider.connection.sendTransaction(await v0_pack(createInstructions, user), { skipPreflight: true });
        logger(tx1);

        await confirmTransaction(tx1);

        const closeInstructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.userClose()
                .accounts({
                    user: user.publicKey,
                    mintRecord: mintRecordPDA,
                    mintAccount: mintPDA,
                }).instruction(),
        ];

        const tx2 = await provider.connection.sendTransaction(await v0_pack(closeInstructions, user), { skipPreflight: true });
        logger(tx2);

        await confirmTransaction(tx2);

        const accountInfo = await provider.connection.getAccountInfo(mintRecordPDA);
        expect(accountInfo).to.be.null;
    });

    it("Close user account with mint record", async () => {
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

        const tx1 = await provider.connection.sendTransaction(await v0_pack(instructions, user));
        logger(tx1);

        await confirmTransaction(tx1);

        const userbalance = await provider.connection.getTokenAccountBalance(mockSOLATA);
        assert.equal(userbalance.value.uiAmount, 1);

        const closeInstructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.userClose()
                .accounts({
                    user: user.publicKey,
                    mintRecord: mintRecordPDA,
                    mintAccount: mintPDA,
                }).instruction(),
        ];

        const tx2 = await provider.connection.sendTransaction(await v0_pack(closeInstructions, user), { skipPreflight: true });
        logger(tx2);

        await confirmTransaction(tx2);

        const accountInfo = await provider.connection.getAccountInfo(mintRecordPDA);
        expect(accountInfo).to.not.be.null;
    });

    it("Close user account with mint record then wait for refresh", async () => {
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

        const refresh_blockheight = (await provider.connection.getLatestBlockhash()).lastValidBlockHeight + 5;
        const tx1 = await provider.connection.sendTransaction(await v0_pack(instructions, user));
        logger(tx1);

        await confirmTransaction(tx1);

        const userbalance = await provider.connection.getTokenAccountBalance(mockSOLATA);
        assert.equal(userbalance.value.uiAmount, 1);

        while (refresh_blockheight > (await provider.connection.getLatestBlockhash()).lastValidBlockHeight) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const closeInstructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.userClose()
                .accounts({
                    user: user.publicKey,
                    mintRecord: mintRecordPDA,
                    mintAccount: mintPDA,
                }).instruction(),
        ];

        const tx2 = await provider.connection.sendTransaction(await v0_pack(closeInstructions, user), { skipPreflight: true });
        logger(tx2);

        await confirmTransaction(tx2);

        const accountInfo = await provider.connection.getAccountInfo(mintRecordPDA);
        expect(accountInfo).to.be.null;
    });
});
