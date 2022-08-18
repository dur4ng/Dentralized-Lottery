//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

import "./helpers/PriceConverter.sol";

import "hardhat/console.sol";

contract DecentralizedLottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
  using PriceConverter for uint256;

  error DecentralizedLottery__NotEnoughETH();
  error DecentralizedLottery__OpenStateOperation();
  error DecentralizedLottery__OnlyOwnerCanExecute();
  error DecentralizedLottery__TransferFailed();

  enum STATES {
    OPEN,
    CLOSE
  }
  struct Ticket {
    uint8 id;
    uint8 lotteryId;
    address owner;
  }

  modifier onlyOwner() {
    if (msg.sender != i_owner)
      revert DecentralizedLottery__OnlyOwnerCanExecute();
    _;
  }
  modifier mininumUSD() {
    if (msg.value.getConversionRate(i_priceFeeder) < MINIMUM_USD)
      revert DecentralizedLottery__NotEnoughETH();
    _;
  }

  modifier stateOpen() {
    if (s_lotteryState != STATES.OPEN)
      revert DecentralizedLottery__OpenStateOperation();
    _;
  }

  uint256 private constant MINIMUM_USD = 50 * 10**18;
  address private immutable i_owner;
  // Aggregator constants
  AggregatorV3Interface internal immutable i_priceFeeder;
  // VRF constants
  VRFCoordinatorV2Interface internal immutable i_coordinator;
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;
  // Keepers
  uint256 immutable i_interval;

  STATES private s_lotteryState;
  uint8 private s_id;
  uint8 private s_lotteryId;
  Ticket[] private s_currentLotteryTickets;
  mapping(address => uint256) private s_userCurrentLotteryTicketsCount;
  address[] private s_players;
  address[] private s_winners;
  // VRF storage variables
  uint256[] private s_randomWords;
  uint256 private s_requestId;
  // Keepers
  uint256 private s_lastTimeStamp;

  event randomWordRequested(uint256 requestId);
  event newWinner(address winner);
  event priceSended(address winner, uint256 priceAmount);
  event newGameCreated(uint256 _lotteryId);

  constructor(
    address _priceFeeder,
    address _vrfCoodinator,
    uint64 _subscriptionId,
    bytes32 _gasLane,
    uint32 _callbackGasLimit,
    uint256 _interval
  )
    // using the parent constructor
    VRFConsumerBaseV2(_vrfCoodinator)
  {
    i_owner = msg.sender;
    changeStateToOpen();
    i_priceFeeder = AggregatorV3Interface(_priceFeeder);
    // VRF
    i_coordinator = VRFCoordinatorV2Interface(_vrfCoodinator);
    i_subscriptionId = _subscriptionId;
    i_gasLane = _gasLane;
    i_callbackGasLimit = _callbackGasLimit;
    //Keeper
    i_interval = _interval;
    setTimeStamp();
  }

  function buyTicket() public payable mininumUSD stateOpen {
    Ticket memory newTicket = Ticket(++s_id, s_lotteryId, msg.sender);
    s_currentLotteryTickets.push(newTicket);
    s_userCurrentLotteryTicketsCount[msg.sender] =
      s_userCurrentLotteryTicketsCount[msg.sender] +
      1;
  }

  function checkUpkeep(
    bytes calldata /* checkData */
  )
    external
    view
    override
    returns (
      bool upkeepNeeded,
      bytes memory /*performData*/
    )
  {
    //check interval
    //check players
    //check state
    upkeepNeeded =
      ((block.timestamp - s_lastTimeStamp) > i_interval) &&
      (s_currentLotteryTickets.length > 0) &&
      (s_lotteryState == STATES.OPEN);
  }

  function performUpkeep(
    bytes calldata /*performData*/
  ) external override {
    s_lotteryState = STATES.CLOSE;
    requestRandomWords();
  }

  // Assumes the subscription is funded sufficiently.
  function requestRandomWords() internal onlyOwner {
    // Will revert if subscription is not set and funded.
    s_requestId = i_coordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );

    emit randomWordRequested(s_requestId);
  }

  function fulfillRandomWords(
    uint256, /* requestId */
    uint256[] memory randomWords
  ) internal override {
    s_randomWords = randomWords;
    chooseWinner();
  }

  function chooseWinner() internal {
    //choose winner
    uint256 indexWinner = s_randomWords[0] % s_currentLotteryTickets.length;
    Ticket memory winnerTicket = s_currentLotteryTickets[indexWinner];
    address payable winnerAddress = payable(winnerTicket.owner);
    emit newWinner(winnerAddress);
    //send price
    uint256 priceAmount = address(this).balance;
    (bool success, ) = winnerAddress.call{value: priceAmount}("");
    if (!success) {
      revert DecentralizedLottery__TransferFailed();
    }
    emit priceSended(winnerAddress, priceAmount);

    //update winner list
    s_winners.push(winnerAddress);

    //reset ticket list
    //s_currentLotteryTickets = new Ticket[](0);
    delete s_currentLotteryTickets;
    //reset player mapping refactor
    //set new timestamp
    setTimeStamp();
    //update lottery id
    s_lotteryId = s_lotteryId + 1;
    //open a new game
    changeStateToOpen();
    emit newGameCreated(s_lotteryId);
  }

  function createNewGame() internal {
    //reset ticket list
    //s_currentLotteryTickets = new Ticket[](0);
    //reset player mapping refactor
    //set new timestamp
    setTimeStamp();
    //update lottery id
    s_lotteryId = s_lotteryId + 1;
    //open a new game
    changeStateToOpen();
    emit newGameCreated(s_lotteryId);
  }

  function setTimeStamp() internal {
    s_lastTimeStamp = block.timestamp;
  }

  function changeStateToOpen() internal {
    s_lotteryState = STATES.OPEN;
  }

  function getOwner() public view returns (address) {
    return i_owner;
  }

  function getState() public view returns (STATES) {
    return s_lotteryState;
  }

  function getCurrentLotteryTickets() public view returns (Ticket[] memory) {
    return s_currentLotteryTickets;
  }

  function getSenderTicketCount() public view returns (uint256) {
    return s_userCurrentLotteryTicketsCount[msg.sender];
  }

  function getWinners() public view returns (address[] memory) {
    return s_winners;
  }

  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }
}
