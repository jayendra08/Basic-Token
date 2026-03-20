#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenCount,
    Tokens,
    Token(u32),
    TokenBalances(u32),
}

#[contracttype]
#[derive(Clone)]
pub struct TokenMeta {
    pub id: u32,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub creator: Address,
    pub total_supply: i128,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn init(env: Env) {
        if env.storage().instance().has(&DataKey::TokenCount) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenCount, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::Tokens, &Vec::<u32>::new(&env));
    }

    /// Create a new token — completely permissionless, anyone can call this
    pub fn create_token(
        env: Env,
        creator: Address,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: i128,
    ) -> u32 {
        creator.require_auth();

        let count_key = DataKey::TokenCount;
        let token_id: u32 = env
            .storage()
            .instance()
            .get::<_, u32>(&count_key)
            .unwrap_or(0);

        // Initialize token balances with zero for creator if initial_supply > 0
        let mut balances: Map<Address, i128> = Map::new(&env);
        if initial_supply > 0 {
            balances.set(creator.clone(), initial_supply);
        }

        let meta = TokenMeta {
            id: token_id,
            name,
            symbol,
            decimals,
            creator: creator.clone(),
            total_supply: initial_supply,
        };

        env.storage()
            .instance()
            .set(&DataKey::Token(token_id), &meta);
        env.storage()
            .instance()
            .set(&DataKey::TokenBalances(token_id), &balances);
        env.storage().instance().set(&count_key, &(token_id + 1));

        let mut tokens: Vec<u32> = env
            .storage()
            .instance()
            .get(&DataKey::Tokens)
            .unwrap_or_else(|| Vec::new(&env));
        tokens.push_back(token_id);
        env.storage().instance().set(&DataKey::Tokens, &tokens);

        token_id
    }

    /// Mint tokens — only token creator can mint
    pub fn mint(env: Env, to: Address, token_id: u32, amount: i128) {
        let meta: TokenMeta = env
            .storage()
            .instance()
            .get(&DataKey::Token(token_id))
            .unwrap_or_else(|| panic!("token not found"));
        meta.creator.require_auth();

        let mut balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::TokenBalances(token_id))
            .unwrap();
        let to_balance = balances.get(to.clone()).unwrap_or(0);
        balances.set(to, to_balance + amount);
        env.storage()
            .instance()
            .set(&DataKey::TokenBalances(token_id), &balances);

        let mut meta = meta;
        meta.total_supply += amount;
        env.storage()
            .instance()
            .set(&DataKey::Token(token_id), &meta);
    }

    /// Burn tokens — anyone can burn their own tokens
    pub fn burn(env: Env, from: Address, token_id: u32, amount: i128) {
        from.require_auth();

        let mut balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::TokenBalances(token_id))
            .unwrap_or_else(|| panic!("token not found"));
        let from_balance = balances.get(from.clone()).unwrap_or(0);
        assert!(from_balance >= amount, "insufficient balance");

        balances.set(from.clone(), from_balance - amount);
        env.storage()
            .instance()
            .set(&DataKey::TokenBalances(token_id), &balances);

        let mut meta: TokenMeta = env
            .storage()
            .instance()
            .get(&DataKey::Token(token_id))
            .unwrap();
        meta.total_supply -= amount;
        env.storage()
            .instance()
            .set(&DataKey::Token(token_id), &meta);
    }

    /// Transfer tokens — anyone can transfer their tokens
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u32, amount: i128) {
        from.require_auth();

        let mut balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::TokenBalances(token_id))
            .unwrap_or_else(|| panic!("token not found"));
        let from_balance = balances.get(from.clone()).unwrap_or(0);
        assert!(from_balance >= amount, "insufficient balance");

        let to_balance = balances.get(to.clone()).unwrap_or(0);
        balances.set(from.clone(), from_balance - amount);
        balances.set(to.clone(), to_balance + amount);
        env.storage()
            .instance()
            .set(&DataKey::TokenBalances(token_id), &balances);
    }

    /// Get token metadata
    pub fn get_token(env: Env, token_id: u32) -> TokenMeta {
        env.storage()
            .instance()
            .get(&DataKey::Token(token_id))
            .unwrap_or_else(|| panic!("token not found"))
    }

    /// Get token balance for an address
    pub fn get_balance(env: Env, address: Address, token_id: u32) -> i128 {
        let balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::TokenBalances(token_id))
            .unwrap_or_else(|| Map::new(&env));
        balances.get(address).unwrap_or(0)
    }

    /// Get all tokens created (for discovery)
    pub fn get_all_tokens(env: Env) -> Vec<u32> {
        env.storage()
            .instance()
            .get(&DataKey::Tokens)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get total token count
    pub fn get_token_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0)
    }
}

mod test;
