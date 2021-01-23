const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test')
const LendingPool_test = artifacts.require('LendingPool_test')
const AToken_test = artifacts.require('AToken_test')

const myAddress = '0x66283ec04D16B25dD2DEa83A440b9Ee32221055B'
const token = '0xe22da380ee6B445bb8273C81944ADEB6E8450422'
const aToken = '0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0'
const AAVE = '0x9FE532197ad76c5a68961439604C037EB79681F0'

module.exports = async function (deployer, network, accounts) {
  const owner = accounts[0]
  let setter = accounts[1]
  const orderor1 = accounts[2]
  const orderor2 = accounts[3]
  const offeror1 = accounts[4]
  const offeror2 = accounts[5]
  let stableTokenAddress
  let aTokenAddress
  let lendingPoolAddress
  if (network === 'kovan' || network === 'kovan-fork') {
    setter = myAddress
    stableTokenAddress = token
    aTokenAddress = aToken
    lendingPoolAddress = AAVE
  } else {
    await deployer.deploy(ERC721_test, 'test721', 'test721')
    await deployer.deploy(ERC20_test, 1000000)
    await deployer.deploy(AToken_test, ERC20_test.address)
    await deployer.deploy(LendingPool_test, AToken_test.address)
    // TODO: Need test tokens
    stableTokenAddress = ERC20_test.address
    aTokenAddress = AToken_test.address
    lendingPoolAddress = LendingPool_test.address
  }

  await deployer.deploy(PawnFactory, setter, stableTokenAddress, aTokenAddress, lendingPoolAddress)
}
