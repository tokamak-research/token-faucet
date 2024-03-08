use anchor_lang::prelude::*;

#[error_code]
pub enum MintError {
    #[msg("Token limit reached")]
    TokenLimitReached,
}

#[error_code]
pub enum CloseError {
    #[msg("Unlock slot not reached")]
    UnlockSlotNotReached,
}