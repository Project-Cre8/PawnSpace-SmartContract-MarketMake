const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test')

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
  let daiAddress
  let aDaiAddress
  let lendingPoolAddress
  if (network === 'kovan') {
    daiAddress = DAI
    aDaiAddress = aDAI
    lendingPoolAddress = AAVE
  } else {
    // TODO: Need test tokens
    daiAddress = ''
    aDaiAddress = ''
    lendingPoolAddress = ''
  }

  await deployer.deploy(ERC721_test, 'test721', 'test721')
  await deployer.deploy(ERC20_test, 1000)
  await deployer.deploy(PawnFactory, setter, daiAddress, aDaiAddress, lendingPoolAddress)
}
