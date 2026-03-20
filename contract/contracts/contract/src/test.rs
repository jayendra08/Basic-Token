#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_init() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    // Token count should start at 0
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_create_token_permissionless() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // User 1 creates token with initial supply
    let token_id1 = client.create_token(
        &user1,
        &String::from_str(&env, "First Token"),
        &String::from_str(&env, "FST"),
        &7u32,
        &1000i128,
    );
    assert_eq!(token_id1, 0);

    // User 2 creates another token (permissionless - no approval needed)
    let token_id2 = client.create_token(
        &user2,
        &String::from_str(&env, "Second Token"),
        &String::from_str(&env, "SND"),
        &8u32,
        &500i128,
    );
    assert_eq!(token_id2, 1);

    // Verify token count
    assert_eq!(client.get_token_count(), 2);

    // Verify token metadata
    let meta1 = client.get_token(&0u32);
    assert_eq!(meta1.name, String::from_str(&env, "First Token"));
    assert_eq!(meta1.symbol, String::from_str(&env, "FST"));
    assert_eq!(meta1.decimals, 7u32);
    assert_eq!(meta1.total_supply, 1000i128);

    // Verify initial balance
    assert_eq!(client.get_balance(&user1, &0u32), 1000i128);
}

#[test]
fn test_mint_by_creator() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token_id = client.create_token(
        &user1,
        &String::from_str(&env, "My Token"),
        &String::from_str(&env, "MTK"),
        &8u32,
        &100i128,
    );

    // Creator mints more tokens to user2
    client.mint(&user2, &token_id, &50i128);

    // Check balances
    assert_eq!(client.get_balance(&user1, &token_id), 100i128);
    assert_eq!(client.get_balance(&user2, &token_id), 50i128);

    // Check total supply increased
    let meta = client.get_token(&token_id);
    assert_eq!(meta.total_supply, 150i128);
}

#[test]
fn test_burn_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user = Address::generate(&env);

    let token_id = client.create_token(
        &user,
        &String::from_str(&env, "Burnable Token"),
        &String::from_str(&env, "BRN"),
        &6u32,
        &500i128,
    );

    // User burns some tokens
    client.burn(&user, &token_id, &200i128);

    // Check balance decreased
    assert_eq!(client.get_balance(&user, &token_id), 300i128);

    // Check total supply decreased
    let meta = client.get_token(&token_id);
    assert_eq!(meta.total_supply, 300i128);
}

#[test]
fn test_transfer_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token_id = client.create_token(
        &user1,
        &String::from_str(&env, "Transfer Token"),
        &String::from_str(&env, "TRF"),
        &5u32,
        &1000i128,
    );

    // User1 transfers to user2
    client.transfer(&user1, &user2, &token_id, &300i128);

    // Check balances
    assert_eq!(client.get_balance(&user1, &token_id), 700i128);
    assert_eq!(client.get_balance(&user2, &token_id), 300i128);

    // Total supply unchanged
    let meta = client.get_token(&token_id);
    assert_eq!(meta.total_supply, 1000i128);
}

#[test]
fn test_get_all_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.create_token(
        &user1,
        &String::from_str(&env, "Token A"),
        &String::from_str(&env, "TKA"),
        &6u32,
        &100i128,
    );
    client.create_token(
        &user2,
        &String::from_str(&env, "Token B"),
        &String::from_str(&env, "TKB"),
        &7u32,
        &200i128,
    );
    client.create_token(
        &user1,
        &String::from_str(&env, "Token C"),
        &String::from_str(&env, "TKC"),
        &8u32,
        &300i128,
    );

    let all_tokens = client.get_all_tokens();
    assert_eq!(all_tokens.len(), 3);
    assert_eq!(all_tokens.get(0), Some(0u32));
    assert_eq!(all_tokens.get(1), Some(1u32));
    assert_eq!(all_tokens.get(2), Some(2u32));
}

#[test]
fn test_multiple_tokens_same_user() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init();

    let user = Address::generate(&env);

    // Same user creates multiple tokens
    let token1 = client.create_token(
        &user,
        &String::from_str(&env, "My Coin"),
        &String::from_str(&env, "COIN"),
        &8u32,
        &1000i128,
    );
    let token2 = client.create_token(
        &user,
        &String::from_str(&env, "My Token"),
        &String::from_str(&env, "TOKEN"),
        &9u32,
        &500i128,
    );

    // Tokens have different IDs
    assert_eq!(token1, 0);
    assert_eq!(token2, 1);

    // Each token has its own supply and balances
    assert_eq!(client.get_balance(&user, &token1), 1000i128);
    assert_eq!(client.get_balance(&user, &token2), 500i128);

    // Transfer from token1 only affects token1 balance
    client.transfer(&user, &Address::generate(&env), &token1, &100i128);
    assert_eq!(client.get_balance(&user, &token1), 900i128);
    assert_eq!(client.get_balance(&user, &token2), 500i128); // unchanged
}
