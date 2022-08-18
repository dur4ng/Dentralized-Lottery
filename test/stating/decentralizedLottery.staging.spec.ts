import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { network, deployments, ethers, run, getNamedAccounts } from "hardhat"
import { developmentChains, PRICE_DECIMALS } from "../../helper-hardhat-config"
import { solidity } from "ethereum-waffle"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { DecentralizedLottery } from "../../typechain"

developmentChains.includes(network.name)
  ? describe.skip
  : describe("DecentralizedLottery", () => {
      let decentralizedLottery: DecentralizedLottery
      let namedAccounts
      let deployer: string
      let accounts: SignerWithAddress[]
      const interval = 30
      beforeEach(async () => {
        accounts = await ethers.getSigners()
        namedAccounts = await getNamedAccounts()
        deployer = namedAccounts.deployer
        decentralizedLottery = await ethers.getContract(
          "DecentralizedLottery",
          deployer
        )
      })
      describe("Game logic", async () => {
        describe("chooseWinner", () => {
          it(
            "Steps: \n" +
              "             1. Choose a winner, \n" +
              "             2. send the price, \n" +
              "             3. update the winner list, \n" +
              "             4. create new game",
            async () => {
              const signers = await ethers.getSigners()
              const deployer = signers[0]

              // create a listener for the priceSended and newGameCreated events
              await new Promise<void>(async (resolve, reject) => {
                // this will be executed win the newWinner events from chooseWinner() fires, in this simulation the account 4 always wins participant wins always
                decentralizedLottery.once(
                  "priceSended",
                  async (winner, priceAmount) => {
                    try {
                      // testing the winner
                      const expectedWinner = deployer
                      assert.equal(winner, expectedWinner)
                      // testing the withdraw
                      const winnerBalance = await deployer.getBalance()
                      const ethString = ethers.utils.parseEther("0.01")
                      const ethBigNumber = BigNumber.from(ethString)
                      assert.equal(
                        winnerBalance.toString(),
                        startingDeployerBalance.add(ethBigNumber).toString()
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
                      /*
                      const connectedDecLottery =
                        await decentralizedLottery.connect(accounts[4])

                      const expectedAccountFourCount = 0
                      const currentAccountFourCount =
                        await connectedDecLottery.getSenderTicketCount()
                      assert.equal(
                        currentAccountFourCount.toString(),
                        expectedAccountFourCount.toString()
                      )
                      */
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
                //user join game
                const tx = await decentralizedLottery.buyTicket({
                  value: ethers.utils.parseEther("0.01"),
                })
                await tx.wait(1)
                // storage starting balances
                const startingDeployerBalance = await deployer.getBalance()
                //wait the interval
                console.log("Waiting the interval...")
                // Simulation of the Coordinator callback with the random words
              })
            }
          )
        })
      })
    })
