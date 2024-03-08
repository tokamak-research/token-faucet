use {
    crate::{state::{MintRecord, TokenLimiter}, event::TokenMintEvent},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{mint_to, Mint, MintTo, Token, TokenAccount},
    }
};
#[derive(Accounts)]
#[instruction(token_symbol: String)]
pub struct TokenMint<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"mint", token_symbol.as_bytes()],
        bump,
    )]
    pub mint_account: Account<'info, Mint>,

    #[account(
        seeds = [b"limit", token_symbol.as_bytes()],
        bump
    )]
    pub token_limiter: AccountLoader<'info, TokenLimiter>,

    #[account(
        mut,
        seeds = [&anchor_lang::solana_program::hash::hash([&user.key().to_bytes()[..], &mint_account.key().to_bytes()].concat().as_slice()).to_bytes()],
        bump
    )]
    pub mint_record: AccountLoader<'info, MintRecord>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_account,
        associated_token::authority = user,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn token_mint(ctx: Context<TokenMint>, token_symbol: String, amount: u64) -> Result<()> {
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.mint_account.to_account_info(),
            },
            &[&[
                &b"mint"[..],
                &token_symbol.as_bytes(),
                &[ctx.bumps.mint_account],
            ]],
        ),
        amount,
    )?;

    let mut mint_record = ctx.accounts.mint_record.load_mut()?;
    let token_limiter = ctx.accounts.token_limiter.load()?;

    if mint_record.unlock_slot < ctx.accounts.clock.slot {
        mint_record.unlock_slot = ctx.accounts.clock.slot + token_limiter.refresh_interval;
        mint_record.amount = 0;
    }

    mint_record.amount += amount;

    require!(
        mint_record.amount <= token_limiter.max_amount,
        crate::error::MintError::TokenLimitReached
    );

    emit!(TokenMintEvent {
        signer: ctx.accounts.user.key(),
        mint_account: ctx.accounts.mint_account.key(),
        amount,
    });

    Ok(())
}
