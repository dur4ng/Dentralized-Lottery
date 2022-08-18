import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
import { verify } from "../helpers/verify"

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

  if (chainId == 31337) {
    waitBlockConfirmations = 1
    args = [1000]
  } else {
    args = [1000]
    waitBlockConfirmations = VERIFICATION_BLOCK_CONFIRMATIONS
  }

  const coin = await deploy("Coin", {
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
    await verify(coin.address, args)
  }

  const networkName = network.name == "hardhat" ? "localhost" : network.name
  log(
    `yarn hardhat read-keepers-counter --contract ${coin.address} --network ${networkName}`
  )
  log("----------------------------------------------------")
}
export default deployFunction
deployFunction.tags = ["all", "coin"]
