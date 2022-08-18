import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  FUND_AMOUNT,
} from "../helper-hardhat-config"
import { verify } from "../helpers/verify"
import { helpers } from "@chainlink/test-helpers"

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  // code here
  const { getNamedAccounts, deployments, getChainId } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number | undefined = network.config.chainId
  if (!chainId) return

  let args: any
  let waitBlockConfirmations: number
  let aggregatorAddress
  let vrfCoordinatorV2Mock
  let vrfCoordinatorV2MockAddress: string
  let subscriptionId

  if (chainId == 31337) {
    aggregatorAddress = (await ethers.getContract("MockV3Aggregator")).address

    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait()
    subscriptionId = transactionReceipt.events[0].args.subId
    console.log(`SubscriptionId: ${subscriptionId}`)
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    waitBlockConfirmations = 1
    args = [
      aggregatorAddress,
      vrfCoordinatorV2MockAddress,
      subscriptionId,
      networkConfig[chainId].keyHash,
      networkConfig[chainId].callbackGasLimit,
      networkConfig[chainId].keepersUpdateInterval,
    ]
  } else {
    args = [
      networkConfig[chainId].ethUsdPriceFeed,
      networkConfig[chainId].vrfCoordinator,
      networkConfig[chainId].vrfCoordinatorSubscriptionId,
      networkConfig[chainId].keyHash,
      networkConfig[chainId].callbackGasLimit,
      networkConfig[chainId].keepersUpdateInterval,
    ]
    waitBlockConfirmations = VERIFICATION_BLOCK_CONFIRMATIONS
  }

  const decentralizedLottery = await deploy("DecentralizedLottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...")
    await verify(decentralizedLottery.address, args)
  }

  const networkName = network.name == "hardhat" ? "localhost" : network.name
  log(
    `yarn hardhat read-keepers-counter --contract ${decentralizedLottery.address} --network ${networkName}`
  )
  log("----------------------------------------------------")
}
export default deployFunction
deployFunction.tags = ["all", "decentralizedLottery"]
