use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct TokenLimiter {
    pub max_amount: u64,
    pub refresh_interval: u64, // in slot (1 slot = 400ms)
}

#[account(zero_copy)]
pub struct MintRecord {
    pub unlock_slot: u64,
    pub amount: u64,
}