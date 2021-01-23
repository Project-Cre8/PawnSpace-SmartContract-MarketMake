const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test')
const LendingPool_test = artifacts.require('LendingPool_test')
const AToken_test = artifacts.require('AToken_test')

const DAI = '0xc4375b7de8af5a38a93548eb8453a498222c4ff2'
const aDAI = '0xdcf0af9e59c002fa3aa091a46196b37530fd48a8'
const AAVE = '0x9fe532197ad76c5a68961439604c037eb79681f0'

module.exports = async function (deployer, network, accounts) {
  const owner = accounts[0]
  const setter = accounts[1]
  const orderor1 = accounts[2]
  const orderor2 = accounts[3]
  const offeror1 = accounts[4]
  const offeror2 = accounts[5]
  let stableTokenAddress
  let aTokenAddress
  let lendingPoolAddress
  if (network === 'kovan') {
    stableTokenAddress = DAI
    aTokenAddress = aDAI
    lendingPoolAddress = AAVE
  } else {
    await deployer.deploy(ERC721_test, 'test721', 'test721')
    await deployer.deploy(ERC20_test, 1000)
    await deployer.deploy(AToken_test, ERC20_test.address)
    await deployer.deploy(LendingPool_test, AToken_test.address)
    // TODO: Need test tokens
    stableTokenAddress = ERC20_test.address
    aTokenAddress = AToken_test.address
    lendingPoolAddress = LendingPool_test.address
  }

  await deployer.deploy(PawnFactory, setter, stableTokenAddress, aTokenAddress, lendingPoolAddress)
}
