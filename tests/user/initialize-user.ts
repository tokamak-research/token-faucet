import * as anchor from "@coral-xyz/anchor";
import { TokenFaucet } from "../../target/types/token_faucet";
import { createWallet, logger, v0_pack } from "../helper";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.TokenFaucet as anchor.Program<TokenFaucet>;


it("Create user account", async () => {
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

    const instructions: anchor.web3.TransactionInstruction[] = [
        await program.methods.userInitialize().accounts({
            user: user.publicKey,
            mintRecord: mintRecordPDA,
            mintAccount: mintPDA,
        }).instruction(),
    ];

    const tx = await provider.connection.sendTransaction(await v0_pack(instructions, user), { skipPreflight: true });
    logger(tx);
});
