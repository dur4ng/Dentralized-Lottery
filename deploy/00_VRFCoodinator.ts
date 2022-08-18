import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  GAS_PRICE_LINK,
  BASE_FEE,
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

  const args = [BASE_FEE, GAS_PRICE_LINK]
  const waitBlockConfirmations = 1
  if (chainId == 31337) {
    const VRFCoordinator = await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmations: waitBlockConfirmations,
    })

    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log("----------------------------------------------------")
  }
}
export default deployFunction
deployFunction.tags = ["all", "mocks", "VRFCoordinator"]
