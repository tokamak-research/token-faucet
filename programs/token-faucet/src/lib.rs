use anchor_lang::prelude::*;
use instructions::*;

declare_id!("CVRkkVzuwXikYjz1FqgXLt2t3JjBB3L5k6rV5FVrfkRY");

mod error;
mod event;
mod instructions;
mod state;

#[program]
pub mod token_faucet {
    use super::*;

    pub fn user_initialize(ctx: Context<UserInitialize>) -> Result<()> {
        instructions::user_initialize(ctx)
    }

    pub fn token_initialize(
        ctx: Context<TokenInitialize>,
        token_symbol: String,
        token_decimals: u8,
        token_name: String,
        token_uri: String,
        max_amount: u64,
        refresh_interval: u64,
    ) -> Result<()> {
        instructions::token_initialize(ctx, token_symbol, token_decimals, token_name, token_uri, max_amount, refresh_interval)
    }

    pub fn token_mint(
        ctx: Context<TokenMint>,
        token_symbol: String,
        amount: u64,
    ) -> Result<()> {
        instructions::token_mint(ctx, token_symbol, amount)
    }

    pub fn user_close(ctx: Context<UserClose>) -> Result<()> {
        instructions::user_close(ctx)
    }
}
