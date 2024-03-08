# Token Faucet
This token faucet is designed for Tokamak Aggregator. It is fully open-sourced.
## Feature
- Mint mutli token in one program
- Token limiter to limit token mint in specific slot range
## Program Address
| Cluster | Address | 
| --- | --- |
| testnet | |
| devnet | CVRkkVzuwXikYjz1FqgXLt2t3JjBB3L5k6rV5FVrfkRY | 
## Seed
### Mint Account
```
const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), Buffer.from(mockSOL.symbol)],
    program.programId
);
````
### Token Limiter
```
const [tokenLimiterPDA] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("limit"),
        Buffer.from(mockSOL.symbol)
    ],
    program.programId
);
```
### Mint Record
```
let hexString = createHash('sha256').update(Buffer.concat([user.publicKey.toBytes(), mintPDA.toBytes()])).digest('hex');
let seed = Uint8Array.from(Buffer.from(hexString,'hex'));

const [mintRecordPDA] = PublicKey.findProgramAddressSync(
    [seed],
    program.programId
);
```
## Example
Reference to `/test`