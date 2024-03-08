import * as anchor from "@coral-xyz/anchor";
import { TokenFaucet } from "../../target/types/token_faucet";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction, GetVersionedTransactionConfig } from "@solana/web3.js";
import mockSOL from "../lib/metadata/mockSOL.json";
import { TOKEN_METADATA_PROGRAM_ID } from "../constants";
import { logger, v0_pack } from "../helper";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const admin = provider.wallet as anchor.Wallet;
const program = anchor.workspace.TokenFaucet as anchor.Program<TokenFaucet>;


    it("Create mockSOL mint account", async () => {
        const [mintPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("mint"), Buffer.from(mockSOL.symbol)],
            program.programId
        );

        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintPDA.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const [tokenLimiterPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("limit"),
                Buffer.from(mockSOL.symbol)
            ],
            program.programId
        );

        const instructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.tokenInitialize(
                mockSOL.symbol,
                9,
                mockSOL.name,
                "https://cdn.jsdelivr.net/gh/tokamak-research/token-faucet@master/tests/lib/metadata/mockSOL.json",
                new BN(5 * 10 ** 9),
                new BN(5),
            ).accounts({
                admin: admin.publicKey,
                mintAccount: mintPDA,
                metadataAccount: metadataAddress,
                tokenLimiter: tokenLimiterPDA,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            }).instruction(),
        ];

        const tx = await provider.connection.sendTransaction(await v0_pack(instructions, admin), {skipPreflight: true});
        logger(tx);
    });
