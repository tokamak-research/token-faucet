use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::MintRecord;

#[derive(Accounts)]
pub struct UserClose<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [&anchor_lang::solana_program::hash::hash([&user.key().to_bytes()[..], &mint_account.key().to_bytes()].concat().as_slice()).to_bytes()],
        bump,
        close = user,
    )]
    pub mint_record: AccountLoader<'info, MintRecord>,

    pub mint_account: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn user_close(ctx: Context<UserClose>) -> Result<()> {
    let mint_record = ctx.accounts.mint_record.load()?;
    require!(mint_record.unlock_slot <= ctx.accounts.clock.slot, crate::error::CloseError::UnlockSlotNotReached);
    Ok(())
}