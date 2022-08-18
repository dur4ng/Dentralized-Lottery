import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { network, deployments, ethers, run, getNamedAccounts } from "hardhat"
import { developmentChains, PRICE_DECIMALS } from "../../helper-hardhat-config"
import { solidity } from "ethereum-waffle"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
  DecentralizedLottery,
  MockV3Aggregator,
  VRFCoordinatorV2Mock,
} from "../../typechain"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("DecentralizedLottery", () => {
      let decentralizedLottery: DecentralizedLottery
      let mockAggregator: MockV3Aggregator
      let vrfCoordinatorMock: VRFCoordinatorV2Mock
      let namedAccounts
      let deployer: string
      let accounts: SignerWithAddress[]
      const interval = 30
      beforeEach(async () => {
        accounts = await ethers.getSigners()
        namedAccounts = await getNamedAccounts()
        deployer = namedAccounts.deployer

        await deployments.fixture(["all", "mocks"])
        decentralizedLottery = await ethers.getContract(
          "DecentralizedLottery",
          deployer
        )
        mockAggregator = await ethers.getContract("MockV3Aggregator", deployer)
        vrfCoordinatorMock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        )
      })
      describe("Constructor", async () => {
        it("the owner is the deployer", async () => {
          const response = await decentralizedLottery.getOwner()
          assert.equal(response, deployer)
        })
        it("The Lottery state is OPEN", async () => {
          const response = await decentralizedLottery.getState()
          assert.equal(response, 0)
        })
        it("currentLotteryTickets is empty", async () => {
          const response = await decentralizedLottery.getCurrentLotteryTickets()
          const expectedLength = 0
          assert.equal(response.length, expectedLength)
        })
        it("amountUsersTickets is empty", async () => {
          const response = await decentralizedLottery.getSenderTicketCount()
          const expected = "0"
          assert.equal(response.toString(), expected)
        })
        it("winners is empty", async () => {
          const response = await decentralizedLottery.getWinners()
          const expected = 0
          assert.equal(response.length, expected)
        })
        it("The aggregator price of eth in usd is working", async () => {
          const response = await mockAggregator.latestRoundData()
          const price =
            response.answer.toNumber() / Math.pow(10, PRICE_DECIMALS)
          const expectedPrice = 1230
          assert.equal(price, expectedPrice)
        })
      })
      describe("Tickets Management", async () => {
        describe("BUY TICKET", () => {
          it("Reverse the transaction if not enough usd", async () => {
            //must be reverted
            await expect(
              decentralizedLottery.buyTicket({ value: 10 })
            ).to.be.revertedWith("DecentralizedLottery__NotEnoughETH()")
          })
          it("Must accept the transaction if enouth usd", async () => {
            await expect(
              decentralizedLottery.buyTicket({
                value: ethers.utils.parseEther("1"),
              })
            ).to.not.be.reverted
          })
          it("Users can't buy tickets if the lottery is closed")
          it("Users can buy tickets if the lottery is open", async () => {
            await expect(
              decentralizedLottery.buyTicket({
                value: ethers.utils.parseEther("1"),
              })
            ).to.not.be.reverted
          })
          it("After users buys tickets, they can see them tickets correctly", async () => {
            await decentralizedLottery.buyTicket({
              value: ethers.utils.parseEther("1"),
            })
            const tickets =
              await decentralizedLottery.getCurrentLotteryTickets()
            const count = await decentralizedLottery.getSenderTicketCount()
            const expectedCount = "1"
            assert.equal(tickets[0].owner, deployer)
            assert.equal(count.toString(), expectedCount)
          })
        })
      })
      describe("Game logic", async () => {
        describe("checkUpKeep", async () => {
          it("return false when interval is low than minimal", async () => {
            //user join game
            await decentralizedLottery.buyTicket({
              value: ethers.utils.parseEther("1"),
            })
            //by default the game is open
            //call checkUpkeep to check the value using callstatic
            const { upkeepNeeded } =
              await decentralizedLottery.callStatic.checkUpkeep("0x")
            assert(!upkeepNeeded)
          })
          it("return false when s_currentLotteryTickets.length is less than 1", async () => {
            const { upkeepNeeded } =
              await decentralizedLottery.callStatic.checkUpkeep("0x")
            assert(!upkeepNeeded)
          })
          it("return false when lottery state is close")
          it("return true when all requirements are passed", async () => {
            //user join game
            await decentralizedLottery.buyTicket({
              value: ethers.utils.parseEther("1"),
            })
            //by default the game is open
            //wait the interval
            await network.provider.send("evm_increaseTime", [interval + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            //call checkUpkeep to check the value using callstatic
            const { upkeepNeeded } =
              await decentralizedLottery.callStatic.checkUpkeep("0x")
            assert.equal(upkeepNeeded, true)
          })
        })
        describe("chooseWinner", () => {
          it(
            "Steps: \n" +
              "             1. Choose a winner, \n" +
              "             2. send the price, \n" +
              "             3. update the winner list, \n" +
              "             4. create new game",
            async () => {
              //users join game
              const additionalEntrances = 3
              const startingIndex = 2
              for (
                let i = startingIndex;
                i < startingIndex + additionalEntrances;
                i++
              ) {
                const connectedDecentralizedLottery =
                  decentralizedLottery.connect(accounts[i])

                const buyTicketResponseTrasaction =
                  await connectedDecentralizedLottery.buyTicket({
                    value: ethers.utils.parseEther("1"),
                  })
                buyTicketResponseTrasaction.wait(1)
              }
              //by default the game is open

              // storage starting balances
              const startingAccountFourBalance = await accounts[4].getBalance()
              // create a listener for the newWinner event
              await new Promise<void>(async (resolve, reject) => {
                // this will be executed win the newWinner events from chooseWinner() fires, in this simulation the account 4 always wins participant wins always
                decentralizedLottery.once(
                  "priceSended",
                  async (winner, priceAmount) => {
                    try {
                      // testing the winner
                      const expectedWinner = accounts[4].address
                      assert.equal(winner, expectedWinner)
                      // testing the withdraw
                      const winnerBalance = await accounts[4].getBalance()
                      const ethString = ethers.utils.parseEther("1")
                      const ethBigNumber = BigNumber.from(ethString)
                      assert.equal(
                        winnerBalance.toString(),
                        startingAccountFourBalance
                          .add(ethBigNumber.mul(3))
                          .toString()
                      )
                      // check winner list
                      const expectedInitialLegth = 0
                      const winnerList = await decentralizedLottery.getWinners()
                      assert.equal(winnerList.length, expectedInitialLegth + 1)
                      //resolve()
                    } catch (error) {
                      reject()
                    }
                  }
                )
                decentralizedLottery.once(
                  "newGameCreated",
                  async (_lotteryId) => {
                    try {
                      // check new game
                      // - reset s_currentLotteryTickets
                      const expectedTicketsLength = 0
                      const currentTickets =
                        await decentralizedLottery.getCurrentLotteryTickets()
                      console.log(currentTickets)
                      assert.equal(currentTickets.length, expectedTicketsLength)
                      // - reset s_userCurrentLotteryTicketsCount TODO
                      const connectedDecLottery =
                        await decentralizedLottery.connect(accounts[4])

                      const expectedAccountFourCount = 0
                      const currentAccountFourCount =
                        await connectedDecLottery.getSenderTicketCount()
                      assert.equal(
                        currentAccountFourCount.toString(),
                        expectedAccountFourCount.toString()
                      )
                      // - set new s_lastTimeStamp
                      // - update s_lotteryId
                      // - change the state to open
                      const expectedState = 0
                      const currentState = await decentralizedLottery.getState()
                      assert.equal(currentState, expectedState)
                      resolve()
                    } catch (error) {
                      console.log(error)
                      reject()
                    }
                  }
                )
                //wait the interval
                await network.provider.send("evm_increaseTime", [interval + 1])
                await network.provider.request({
                  method: "evm_mine",
                  params: [],
                })

                //call checkUpkeep to check the value using callstatic
                await decentralizedLottery.callStatic.checkUpkeep("0x")
                // this will execute the randomWordRequested()
                const performUpKeepTransactionResponse =
                  await decentralizedLottery.performUpkeep("0x")
                const performUpKeepTransactionReceipt =
                  await performUpKeepTransactionResponse.wait(1)
                const requestId = await performUpKeepTransactionReceipt!
                  .events![1].args!.requestId
                // Simulation of the Coordinator callback with the random words
                await vrfCoordinatorMock.fulfillRandomWords(
                  requestId,
                  decentralizedLottery.address
                )
              })
            }
          )
        })
      })
    })
