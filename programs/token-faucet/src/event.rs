use anchor_lang::prelude::*;

#[event]
pub struct TokenConfigEvent {
    pub signer: Pubkey,
    pub mint_account: Pubkey,
    pub max_amount: u64,
    pub refresh_interval: u64,
}

#[event]
pub struct TokenMintEvent {
    pub signer: Pubkey,
    pub mint_account: Pubkey,
    pub amount: u64,
}