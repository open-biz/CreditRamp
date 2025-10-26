#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, IntoVal, Symbol, Val, Vec,
};

const TREASURY: Symbol = symbol_short!("TREASURY");
const FEE_BPS: i128 = 300; // 3% = 300 basis points

#[contracttype]
#[derive(Copy, Clone)]
pub enum RequestType {
    SupplyCollateral = 1,
}

#[contract]
pub struct CreditRampAutoLend;

#[contractimpl]
impl CreditRampAutoLend {
    /// Initialize the contract with a treasury address for fee collection
    pub fn initialize(env: Env, treasury: Address) {
        if env.storage().instance().has(&TREASURY) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&TREASURY, &treasury);
    }

    /// Auto-lend with 3% protocol fee
    /// 
    /// Takes USDC from caller, deducts 3% fee, sends remainder to Blend pool
    /// 
    /// # Arguments
    /// * `amount` - Total amount to process (in stroops, 7 decimals)
    /// * `pool_id` - Blend pool contract address
    /// * `asset` - USDC token contract address
    /// * `from` - User address supplying funds
    /// * `to` - Address to credit in Blend (usually same as from)
    pub fn auto_lend(
        env: Env,
        amount: i128,
        pool_id: Address,
        asset: Address,
        from: Address,
        to: Address,
    ) -> i128 {
        // Require authorization from the user
        from.require_auth();

        // Calculate 3% fee
        let fee = (amount * FEE_BPS) / 10000;
        let net_amount = amount - fee;

        // Get USDC token client
        let usdc_client = token::Client::new(&env, &asset);

        // Transfer full amount from user to this contract
        usdc_client.transfer(&from, &env.current_contract_address(), &amount);

        // Transfer fee to treasury
        let treasury: Address = env
            .storage()
            .instance()
            .get(&TREASURY)
            .expect("Treasury not set");
        usdc_client.transfer(&env.current_contract_address(), &treasury, &fee);

        // Transfer net amount to Blend pool by invoking supply
        // First approve the pool to spend our tokens
        usdc_client.approve(
            &env.current_contract_address(),
            &pool_id,
            &net_amount,
            &(env.ledger().sequence() + 100), // Expiration ledger
        );

        // Build request for Blend's submit function
        // Request structure: (u32: RequestType, Address: who, Address: asset, i128: amount)
        let mut requests: Vec<Val> = Vec::new(&env);
        
        // Create supply collateral request
        let request = (
            RequestType::SupplyCollateral as u32,
            to.clone(),
            asset.clone(),
            net_amount,
        );
        requests.push_back(request.into_val(&env));

        // Call Blend pool's submit function
        // submit(from: Address, spender: Address, to: Address, requests: Vec<Request>)
        let mut args: Vec<Val> = Vec::new(&env);
        args.push_back(from.into_val(&env));
        args.push_back(env.current_contract_address().into_val(&env));
        args.push_back(to.into_val(&env));
        args.push_back(requests.into_val(&env));

        env.invoke_contract::<Val>(
            &pool_id,
            &Symbol::new(&env, "submit"),
            args,
        );

        // Return net amount supplied
        net_amount
    }

    /// Get the treasury address
    pub fn get_treasury(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&TREASURY)
            .expect("Treasury not set")
    }

    /// Get the fee in basis points (300 = 3%)
    pub fn get_fee_bps(_env: Env) -> i128 {
        FEE_BPS
    }
}

mod test;
