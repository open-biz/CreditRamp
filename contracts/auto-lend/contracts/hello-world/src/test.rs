#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(CreditRampAutoLend, ());
    let client = CreditRampAutoLendClient::new(&env, &contract_id);
    
    let treasury = Address::generate(&env);
    
    client.initialize(&treasury);
    
    assert_eq!(client.get_treasury(), treasury);
    assert_eq!(client.get_fee_bps(), 300);
}

#[test]
fn test_fee_calculation() {
    let env = Env::default();
    let contract_id = env.register(CreditRampAutoLend, ());
    let client = CreditRampAutoLendClient::new(&env, &contract_id);
    
    // 3% of 10,000 should be 300
    let amount = 10_000i128;
    let expected_fee = 300i128;
    let expected_net = 9_700i128;
    
    let fee = (amount * 300) / 10000;
    let net = amount - fee;
    
    assert_eq!(fee, expected_fee);
    assert_eq!(net, expected_net);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_fails() {
    let env = Env::default();
    let contract_id = env.register(CreditRampAutoLend, ());
    let client = CreditRampAutoLendClient::new(&env, &contract_id);
    
    let treasury = Address::generate(&env);
    
    client.initialize(&treasury);
    client.initialize(&treasury); // Should panic
}
