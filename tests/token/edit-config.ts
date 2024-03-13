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

describe("Edit config", () => {
    it("Edit mockSOL mint limiter account", async () => {
        const [tokenLimiterPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("limit"),
                Buffer.from(mockSOL.symbol)
            ],
            program.programId
        );

        const instructions: anchor.web3.TransactionInstruction[] = [
            await program.methods.editConfig("mockSOL", admin.publicKey, new BN(100 * 10 ** 9), new BN(1))
                .accounts({
                    admin: admin.publicKey,
                    tokenLimiter: tokenLimiterPDA,
                }).instruction(),
        ];

        const tx = await provider.connection.sendTransaction(await v0_pack(instructions, admin), { skipPreflight: true });
        logger(tx);
    });
});