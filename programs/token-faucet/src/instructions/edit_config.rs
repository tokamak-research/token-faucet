use std::ptr::null;

use anchor_lang::prelude::*;
use crate::{event::TokenConfigEvent, state::TokenLimiter};

#[derive(Accounts)]
#[instruction(_token_symbol: String)]
pub struct EditConfig<'info> {
    #[account(
        mut,
        constraint = admin.key() == token_limiter.load()?.authority
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"limit", _token_symbol.as_bytes()],
        bump,
    )]
    pub token_limiter: AccountLoader<'info, TokenLimiter>,

    pub system_program: Program<'info, System>,
}

pub fn edit_config(
    ctx: Context<EditConfig>,
    _token_symbol: String,
    new_authority: Option<Pubkey>,
    max_amount: Option<u64>,
    refresh_interval: Option<u64>,
) -> Result<()> {
    let mut token_limter = ctx.accounts.token_limiter.load_mut()?;
    
    if Some(new_authority) != None {
        token_limter.authority = new_authority.unwrap()
    }

    if Some(max_amount) != None {
        token_limter.max_amount = max_amount.unwrap()
    }

    if Some(refresh_interval) != None {
        token_limter.refresh_interval = refresh_interval.unwrap()
    }

    emit!(
        TokenConfigEvent {
            signer: *ctx.accounts.admin.key,
            authority: token_limter.authority,
            max_amount: token_limter.max_amount,
            refresh_interval: token_limter.refresh_interval,
        }
    );

    Ok(())
}
