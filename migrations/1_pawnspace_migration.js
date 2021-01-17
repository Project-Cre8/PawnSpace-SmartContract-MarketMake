const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test')

module.exports = async function (deployer, network, accounts) {
  const owner = accounts[0]
  const setter = accounts[1]
  const orderor1 = accounts[2]
  const orderor2 = accounts[3]
  const offeror1 = accounts[4]
  const offeror2 = accounts[5]

  await deployer.deploy(ERC721_test, 'test721', 'test721')
  await deployer.deploy(ERC20_test, 1000)
  await deployer.deploy(PawnFactory, setter)
}
