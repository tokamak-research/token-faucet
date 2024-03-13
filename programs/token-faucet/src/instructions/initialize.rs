use {
    crate::{
        event::TokenConfigEvent,
        state::{MintRecord, TokenLimiter},
    }, anchor_lang::prelude::*, anchor_spl::{
        metadata::{
            create_metadata_accounts_v3,
            mpl_token_metadata::{accounts::Metadata as mpl_metadata, types::DataV2},
            CreateMetadataAccountsV3, Metadata,
        },
        token::{Mint, Token},
    }
};

#[derive(Accounts)]
#[instruction(token_symbol: String, _token_decimals: u8)]
pub struct TokenInitialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    // Create mint account
    // Same PDA as address of the account and mint/freeze authority
    #[account(
        init,
        seeds = [b"mint", token_symbol.as_bytes()],
        bump,
        payer = admin,
        mint::decimals = 9,
        mint::authority = mint_account.key(),
    )]
    pub mint_account: Account<'info, Mint>,

    /// CHECK: Address validated using constraint
    #[account(
        mut,
        address=mpl_metadata::find_pda(&mint_account.key()).0
    )]
    pub metadata_account: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"limit", token_symbol.as_bytes()],
        bump,
        payer = admin,
        space = 8 + std::mem::size_of::<TokenLimiter>(),
    )]
    pub token_limiter: AccountLoader<'info, TokenLimiter>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn token_initialize(
    ctx: Context<TokenInitialize>,
    token_symbol: String,
    _token_decimals: u8,
    token_name: String,
    token_uri: String,
    max_amount: u64,
    refresh_interval: u64,
) -> Result<()> {
    // Cross Program Invocation (CPI) signed by PDA
    // Invoking the create_metadata_account_v3 instruction on the token metadata program
    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint_account.to_account_info(),
                mint_authority: ctx.accounts.mint_account.to_account_info(), // PDA is mint authority
                update_authority: ctx.accounts.mint_account.to_account_info(), // PDA is update authority
                payer: ctx.accounts.admin.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &[&[
                b"mint",
                token_symbol.clone().as_bytes(),
                &[ctx.bumps.mint_account],
            ]],
        ),
        DataV2 {
            name: token_name.clone(),
            symbol: token_symbol.clone(),
            uri: token_uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false, // Is mutable
        true,  // Update authority is signer
        None,  // Collection details
    )?;

    let mut limiter = ctx.accounts.token_limiter.load_init()?;
    limiter.authority = ctx.accounts.admin.key();
    limiter.max_amount = max_amount;
    limiter.refresh_interval = refresh_interval;

    emit!(TokenConfigEvent {
        signer: ctx.accounts.admin.key(),
        authority: ctx.accounts.admin.key(),
        max_amount,
        refresh_interval,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UserInitialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        seeds = [&anchor_lang::solana_program::hash::hash([&user.key().to_bytes()[..], &mint_account.key().to_bytes()].concat().as_slice()).to_bytes()],
        bump,
        space = 8 + std::mem::size_of::<MintRecord>(),
    )]
    pub mint_record: AccountLoader<'info, MintRecord>,

    pub mint_account: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn user_initialize(ctx: Context<UserInitialize>) -> Result<()> {
    let mut mint_record = ctx.accounts.mint_record.load_init()?;
    mint_record.amount = 0;
    mint_record.unlock_slot = 0;
    Ok(())
}