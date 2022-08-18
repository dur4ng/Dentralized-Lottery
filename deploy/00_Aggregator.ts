import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  PRICE_DECIMALS,
  INITIAL_PRICE,
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

  const args = [PRICE_DECIMALS, INITIAL_PRICE]
  const waitBlockConfirmations = 1
  if (chainId == 31337) {
    const aggregator = await deploy("MockV3Aggregator", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmations: waitBlockConfirmations,
    })

    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(
      `yarn hardhat read-keepers-counter --contract ${aggregator.address} --network ${networkName}`
    )
    log("----------------------------------------------------")
  }
}
export default deployFunction
deployFunction.tags = ["all", "mocks", "aggregator"]
