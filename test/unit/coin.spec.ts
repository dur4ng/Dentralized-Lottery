import { assert, expect } from "chai"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Coin } from "../../typechain"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Coin", () => {
      let coin: Coin
      let namedAccounts
      let deployer: string
      let accounts: SignerWithAddress[]
      beforeEach(async () => {
        accounts = await ethers.getSigners()
        namedAccounts = await getNamedAccounts()
        deployer = namedAccounts.deployer

        await deployments.fixture(["coin"])
        coin = await ethers.getContract("Coin", deployer)
      })
      describe("Constructor", async () => {
        it("The token has a name", async () => {
          const txResponse = await coin.name()
          const expectedName = "Coin"
          assert.equal(txResponse, expectedName)
        })
        it("The token has decimals", async () => {
          const txResponse = await coin.decimals()
          const expectedDecimals = 18
          assert.equal(txResponse, expectedDecimals)
        })
        it("The token has a symbol", async () => {
          const txResponse = await coin.symbol()
          const expectedSymbol = "DLC"
          assert.equal(txResponse, expectedSymbol)
        })
        it("The token has a initial supply", async () => {
          const txResponse = await coin.totalSupply()
          const expectedSupply = 1000
          assert.equal(txResponse.toString(), expectedSupply.toString())
        })
        it("Owner has all the balance", async () => {
          const txResponse = await coin.balanceOf(deployer)
          const expectedBalance = 1000
          assert.equal(txResponse.toString(), expectedBalance.toString())
        })
      })
      describe("Transfers", async () => {
        it("Reverse the transaction if sender is 0x0")
        it("Reverse the transaction if receiver is 0x0")
        it("Reverse the transaction if the sender doesn't have enough funds", async () => {
          const coinConnectedWithAccountOne = coin.connect(accounts[1])
          await expect(
            coinConnectedWithAccountOne.transfer(deployer, 30)
          ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })
        it("Tranfers funds from sender to receiver and fires Tranfer event", async () => {
          const balance = 50
          await expect(coin.transfer(accounts[1].address, balance)).to.emit(
            coin,
            "Transfer"
          )
          const accountOneBalance = await coin.balanceOf(accounts[1].address)
          assert.equal(accountOneBalance.toString(), balance.toString())
        })
      })
      describe("TransferFrom, approvals and allowances", async () => {
        it("Reverse the transaction if _from account hasn't authorize this transaction", async () => {
          await expect(
            coin.transferFrom(accounts[1].address, accounts[2].address, 50)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })
        it("Tranfers funds from sender to receiver and fires Tranfer event", async () => {
          const balance = 100
          const coinConnectedWithAccountOne = await coin.connect(accounts[1])
          // sends 100 tokens to account one
          await coin.transfer(accounts[1].address, 100)
          const initialAccountOneBalance = await coin.balanceOf(
            accounts[1].address
          )
          assert.equal(initialAccountOneBalance.toString(), balance.toString())

          // account one approve the allowance of 100 tokens to account zero
          coinConnectedWithAccountOne.approve(accounts[0].address, 100)
          const allowance = await coin.allowance(
            accounts[1].address,
            accounts[0].address
          )
          assert.equal(allowance.toString(), balance.toString())

          // acount zero does a transferFrom account one to two of 100 tokens
          await coin.transferFrom(accounts[1].address, accounts[2].address, 100)

          const finalAccountOneBalance = await coin.balanceOf(
            accounts[1].address
          )
          assert.equal(finalAccountOneBalance.toString(), "0")
        })
      })
    })
