use starknet::ContractAddress;

#[starknet::interface]
pub trait IStarkFit<TContractState> {
    // Challenge functions
    fn create_challenge(
        ref self: TContractState,
        token: ContractAddress,
        stake_amount: u256,
        duration_days: u32,
        step_goal: u32,
    ) -> u64;
    fn join_challenge(ref self: TContractState, challenge_id: u64);
    fn submit_steps(
        ref self: TContractState, challenge_id: u64, player: ContractAddress, steps: u32, day: u32,
    );
    fn eliminate_player(ref self: TContractState, challenge_id: u64, player: ContractAddress);
    fn end_challenge(ref self: TContractState, challenge_id: u64);
    fn claim_reward(ref self: TContractState, challenge_id: u64);

    // Prediction market functions
    fn create_market(ref self: TContractState, challenge_id: u64, player: ContractAddress) -> u64;
    fn bet_yes(ref self: TContractState, market_id: u64, amount: u256);
    fn bet_no(ref self: TContractState, market_id: u64, amount: u256);
    fn resolve_market(ref self: TContractState, market_id: u64);
    fn claim_winnings(ref self: TContractState, market_id: u64);

    // View functions
    fn get_challenge(self: @TContractState, challenge_id: u64) -> Challenge;
    fn get_player_status(
        self: @TContractState, challenge_id: u64, player: ContractAddress,
    ) -> PlayerStatus;
    fn get_market(self: @TContractState, market_id: u64) -> PredictionMarket;
    fn get_challenge_count(self: @TContractState) -> u64;
    fn get_market_count(self: @TContractState) -> u64;
}

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct Challenge {
    pub id: u64,
    pub creator: ContractAddress,
    pub token: ContractAddress,
    pub stake_amount: u256,
    pub duration_days: u32,
    pub step_goal: u32,
    pub start_time: u64,
    pub active_players: u32,
    pub total_players: u32,
    pub total_pool: u256,
    pub is_active: bool,
    pub is_ended: bool,
}

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct PlayerStatus {
    pub is_joined: bool,
    pub is_active: bool,
    pub has_claimed: bool,
    pub last_verified_day: u32,
}

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct PredictionMarket {
    pub id: u64,
    pub challenge_id: u64,
    pub player: ContractAddress,
    pub token: ContractAddress,
    pub yes_pool: u256,
    pub no_pool: u256,
    pub is_resolved: bool,
    pub outcome: bool, // true = player completed, false = player eliminated
}

#[starknet::contract]
mod StarkFit {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::{Challenge, PlayerStatus, PredictionMarket};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        oracle: ContractAddress,
        challenge_count: u64,
        market_count: u64,
        // Challenge storage
        challenges: Map<u64, Challenge>,
        player_status: Map<(u64, ContractAddress), PlayerStatus>,
        // Prediction market storage
        markets: Map<u64, PredictionMarket>,
        user_yes_bets: Map<(u64, ContractAddress), u256>,
        user_no_bets: Map<(u64, ContractAddress), u256>,
        user_has_claimed_market: Map<(u64, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ChallengeCreated: ChallengeCreated,
        PlayerJoined: PlayerJoined,
        StepsSubmitted: StepsSubmitted,
        PlayerEliminated: PlayerEliminated,
        ChallengeEnded: ChallengeEnded,
        RewardClaimed: RewardClaimed,
        MarketCreated: MarketCreated,
        BetPlaced: BetPlaced,
        MarketResolved: MarketResolved,
        WinningsClaimed: WinningsClaimed,
    }

    #[derive(Drop, starknet::Event)]
    struct ChallengeCreated {
        #[key]
        challenge_id: u64,
        creator: ContractAddress,
        token: ContractAddress,
        stake_amount: u256,
        duration_days: u32,
        step_goal: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct PlayerJoined {
        #[key]
        challenge_id: u64,
        #[key]
        player: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct StepsSubmitted {
        #[key]
        challenge_id: u64,
        #[key]
        player: ContractAddress,
        steps: u32,
        day: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct PlayerEliminated {
        #[key]
        challenge_id: u64,
        #[key]
        player: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ChallengeEnded {
        #[key]
        challenge_id: u64,
        survivors: u32,
        total_pool: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RewardClaimed {
        #[key]
        challenge_id: u64,
        #[key]
        player: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct MarketCreated {
        #[key]
        market_id: u64,
        challenge_id: u64,
        player: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BetPlaced {
        #[key]
        market_id: u64,
        bettor: ContractAddress,
        is_yes: bool,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct MarketResolved {
        #[key]
        market_id: u64,
        outcome: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct WinningsClaimed {
        #[key]
        market_id: u64,
        bettor: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, oracle: ContractAddress) {
        self.owner.write(owner);
        self.oracle.write(oracle);
        self.challenge_count.write(0);
        self.market_count.write(0);
    }

    #[abi(embed_v0)]
    impl StarkFitImpl of super::IStarkFit<ContractState> {
        fn create_challenge(
            ref self: ContractState,
            token: ContractAddress,
            stake_amount: u256,
            duration_days: u32,
            step_goal: u32,
        ) -> u64 {
            assert(stake_amount > 0, 'Stake must be > 0');
            assert(duration_days > 0, 'Duration must be > 0');
            assert(step_goal > 0, 'Step goal must be > 0');

            let caller = get_caller_address();
            let challenge_id = self.challenge_count.read() + 1;
            self.challenge_count.write(challenge_id);

            let challenge = Challenge {
                id: challenge_id,
                creator: caller,
                token,
                stake_amount,
                duration_days,
                step_goal,
                start_time: get_block_timestamp(),
                active_players: 0,
                total_players: 0,
                total_pool: 0,
                is_active: true,
                is_ended: false,
            };

            self.challenges.write(challenge_id, challenge);

            self
                .emit(
                    ChallengeCreated {
                        challenge_id, creator: caller, token, stake_amount, duration_days, step_goal,
                    },
                );

            challenge_id
        }

        fn join_challenge(ref self: ContractState, challenge_id: u64) {
            let caller = get_caller_address();
            let mut challenge = self.challenges.read(challenge_id);

            assert(challenge.is_active, 'Challenge not active');
            assert(!challenge.is_ended, 'Challenge ended');

            let status = self.player_status.read((challenge_id, caller));
            assert(!status.is_joined, 'Already joined');

            // Transfer stake from player to contract
            let token = IERC20Dispatcher { contract_address: challenge.token };
            token.transfer_from(caller, starknet::get_contract_address(), challenge.stake_amount);

            // Update challenge
            challenge.active_players += 1;
            challenge.total_players += 1;
            challenge.total_pool += challenge.stake_amount;
            self.challenges.write(challenge_id, challenge);

            // Set player status
            self
                .player_status
                .write(
                    (challenge_id, caller),
                    PlayerStatus {
                        is_joined: true, is_active: true, has_claimed: false, last_verified_day: 0,
                    },
                );

            self.emit(PlayerJoined { challenge_id, player: caller });
        }

        fn submit_steps(
            ref self: ContractState,
            challenge_id: u64,
            player: ContractAddress,
            steps: u32,
            day: u32,
        ) {
            // Only oracle can submit steps
            let caller = get_caller_address();
            assert(caller == self.oracle.read(), 'Only oracle can submit');

            let challenge = self.challenges.read(challenge_id);
            assert(challenge.is_active, 'Challenge not active');

            let mut status = self.player_status.read((challenge_id, player));
            assert(status.is_joined, 'Player not joined');
            assert(status.is_active, 'Player eliminated');

            status.last_verified_day = day;
            self.player_status.write((challenge_id, player), status);

            self.emit(StepsSubmitted { challenge_id, player, steps, day });

            // Auto-eliminate if steps below goal
            if steps < challenge.step_goal {
                self._eliminate(challenge_id, player);
            }
        }

        fn eliminate_player(
            ref self: ContractState, challenge_id: u64, player: ContractAddress,
        ) {
            let caller = get_caller_address();
            assert(
                caller == self.oracle.read() || caller == self.owner.read(),
                'Only oracle/owner',
            );

            self._eliminate(challenge_id, player);
        }

        fn end_challenge(ref self: ContractState, challenge_id: u64) {
            let caller = get_caller_address();
            assert(
                caller == self.oracle.read() || caller == self.owner.read(),
                'Only oracle/owner',
            );

            let mut challenge = self.challenges.read(challenge_id);
            assert(challenge.is_active, 'Already inactive');
            assert(!challenge.is_ended, 'Already ended');

            challenge.is_active = false;
            challenge.is_ended = true;
            self.challenges.write(challenge_id, challenge);

            self
                .emit(
                    ChallengeEnded {
                        challenge_id,
                        survivors: challenge.active_players,
                        total_pool: challenge.total_pool,
                    },
                );
        }

        fn claim_reward(ref self: ContractState, challenge_id: u64) {
            let caller = get_caller_address();
            let challenge = self.challenges.read(challenge_id);
            assert(challenge.is_ended, 'Challenge not ended');

            let mut status = self.player_status.read((challenge_id, caller));
            assert(status.is_active, 'Player was eliminated');
            assert(!status.has_claimed, 'Already claimed');

            // Calculate share: total_pool / active_players
            assert(challenge.active_players > 0, 'No active players');
            let reward = challenge.total_pool / challenge.active_players.into();

            status.has_claimed = true;
            self.player_status.write((challenge_id, caller), status);

            // Transfer reward
            let token = IERC20Dispatcher { contract_address: challenge.token };
            token.transfer(caller, reward);

            self.emit(RewardClaimed { challenge_id, player: caller, amount: reward });
        }

        // ===== Prediction Market =====

        fn create_market(
            ref self: ContractState, challenge_id: u64, player: ContractAddress,
        ) -> u64 {
            let challenge = self.challenges.read(challenge_id);
            assert(challenge.is_active, 'Challenge not active');

            let status = self.player_status.read((challenge_id, player));
            assert(status.is_joined, 'Player not in challenge');

            let market_id = self.market_count.read() + 1;
            self.market_count.write(market_id);

            let market = PredictionMarket {
                id: market_id,
                challenge_id,
                player,
                token: challenge.token,
                yes_pool: 0,
                no_pool: 0,
                is_resolved: false,
                outcome: false,
            };

            self.markets.write(market_id, market);

            self.emit(MarketCreated { market_id, challenge_id, player });

            market_id
        }

        fn bet_yes(ref self: ContractState, market_id: u64, amount: u256) {
            assert(amount > 0, 'Amount must be > 0');
            let caller = get_caller_address();
            let mut market = self.markets.read(market_id);
            assert(!market.is_resolved, 'Market resolved');

            // Transfer tokens
            let token = IERC20Dispatcher { contract_address: market.token };
            token.transfer_from(caller, starknet::get_contract_address(), amount);

            market.yes_pool += amount;
            self.markets.write(market_id, market);

            let current_bet = self.user_yes_bets.read((market_id, caller));
            self.user_yes_bets.write((market_id, caller), current_bet + amount);

            self.emit(BetPlaced { market_id, bettor: caller, is_yes: true, amount });
        }

        fn bet_no(ref self: ContractState, market_id: u64, amount: u256) {
            assert(amount > 0, 'Amount must be > 0');
            let caller = get_caller_address();
            let mut market = self.markets.read(market_id);
            assert(!market.is_resolved, 'Market resolved');

            // Transfer tokens
            let token = IERC20Dispatcher { contract_address: market.token };
            token.transfer_from(caller, starknet::get_contract_address(), amount);

            market.no_pool += amount;
            self.markets.write(market_id, market);

            let current_bet = self.user_no_bets.read((market_id, caller));
            self.user_no_bets.write((market_id, caller), current_bet + amount);

            self.emit(BetPlaced { market_id, bettor: caller, is_yes: false, amount });
        }

        fn resolve_market(ref self: ContractState, market_id: u64) {
            let caller = get_caller_address();
            assert(
                caller == self.oracle.read() || caller == self.owner.read(),
                'Only oracle/owner',
            );

            let mut market = self.markets.read(market_id);
            assert(!market.is_resolved, 'Already resolved');

            let challenge = self.challenges.read(market.challenge_id);
            assert(challenge.is_ended, 'Challenge not ended');

            // Check if player survived
            let status = self.player_status.read((market.challenge_id, market.player));
            market.outcome = status.is_active;
            market.is_resolved = true;
            self.markets.write(market_id, market);

            self.emit(MarketResolved { market_id, outcome: market.outcome });
        }

        fn claim_winnings(ref self: ContractState, market_id: u64) {
            let caller = get_caller_address();
            let market = self.markets.read(market_id);
            assert(market.is_resolved, 'Market not resolved');

            let has_claimed = self.user_has_claimed_market.read((market_id, caller));
            assert(!has_claimed, 'Already claimed');

            let total_pool = market.yes_pool + market.no_pool;
            let winnings: u256 = if market.outcome {
                // YES won - pay YES bettors proportionally
                let user_bet = self.user_yes_bets.read((market_id, caller));
                assert(user_bet > 0, 'No winning bet');
                (user_bet * total_pool) / market.yes_pool
            } else {
                // NO won - pay NO bettors proportionally
                let user_bet = self.user_no_bets.read((market_id, caller));
                assert(user_bet > 0, 'No winning bet');
                (user_bet * total_pool) / market.no_pool
            };

            self.user_has_claimed_market.write((market_id, caller), true);

            let token = IERC20Dispatcher { contract_address: market.token };
            token.transfer(caller, winnings);

            self.emit(WinningsClaimed { market_id, bettor: caller, amount: winnings });
        }

        // ===== View Functions =====

        fn get_challenge(self: @ContractState, challenge_id: u64) -> Challenge {
            self.challenges.read(challenge_id)
        }

        fn get_player_status(
            self: @ContractState, challenge_id: u64, player: ContractAddress,
        ) -> PlayerStatus {
            self.player_status.read((challenge_id, player))
        }

        fn get_market(self: @ContractState, market_id: u64) -> PredictionMarket {
            self.markets.read(market_id)
        }

        fn get_challenge_count(self: @ContractState) -> u64 {
            self.challenge_count.read()
        }

        fn get_market_count(self: @ContractState) -> u64 {
            self.market_count.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _eliminate(ref self: ContractState, challenge_id: u64, player: ContractAddress) {
            let mut status = self.player_status.read((challenge_id, player));
            assert(status.is_joined, 'Player not joined');
            assert(status.is_active, 'Already eliminated');

            status.is_active = false;
            self.player_status.write((challenge_id, player), status);

            let mut challenge = self.challenges.read(challenge_id);
            challenge.active_players -= 1;
            self.challenges.write(challenge_id, challenge);

            self.emit(PlayerEliminated { challenge_id, player });
        }
    }
}
