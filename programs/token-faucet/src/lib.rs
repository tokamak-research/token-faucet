use anchor_lang::prelude::*;

declare_id!("Ceu7xwhh4URJ9pFEyLSWhaQWXpbk92PhUzWsw1C8GsKZ");

#[program]
pub mod token_faucet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
