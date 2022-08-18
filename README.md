# Decentralized-Lottery

## Ticket logic

- ticket struct
  - id
  - owner
  - lotteryId
- Users can buy tickets of the current open game for 10 usd
- counter of tickets
- counter of lotteries

## Lottery game logic

- lottery requirements:
  - two player minimum
  - interval of 5 min
- users can join in a lottery pool
  - if ticket && open game player enters in lottery
  - else reject transaction
- Close the lottery:
  - check requirements
    - true
      - change the state of the game to close
      - choose a winner
      - send price to the winner
      - reset data
      - reopen the game
    - false
      - reset the interval
- wants to save the historical of all winners

## Required implementations

- use of chainlink VRF for obtain a random number
- https://docs.chain.link/docs/get-a-random-number/
- use of chainlink keepers to automatize the game flow
- https://docs.chain.link/docs/chainlink-keepers/compatible-contracts/

## Staging tests

- constract: https://rinkeby.etherscan.io/address/0x4d3a9e952825cecc45953293308d5242a942f7ef#code

- vrf subscription transaction: https://rinkeby.etherscan.io/tx/0x1d3bb308fbc79ef3ecdfe4f81b04beec6e45fd198f276176903f1bf12f987896
- admin address: 0x78757297e33d89a9b65adec20248b70fcbaac378
- subcription manager: https://vrf.chain.link/rinkeby/8815
- balance: 6 LINK

- UpKeep: need create a time-based upkeep
  https://keepers.chain.link/new-time-based

- https://github.com/PatrickAlphaC/hardhat-smartcontract-lottery-fcc/tree/typescript
- https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol

# Coin

It is a EIP-20 contract for the creation of a token for DecentralizedLottery project.
It implements the ERC-20 contract from openzeppelin.
