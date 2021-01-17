const { BN, constants, balance, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const { assert } = require('chai')

const PawnSpace = artifacts.require('PawnSpace')
const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test')

contract('PawnFactory', (accounts) => {
  // Initial settings
  const owner = accounts[0]
  const setter = accounts[1]
  const orderor1 = accounts[2]
  const orderor2 = accounts[3]
  const offeror1 = accounts[4]
  const offeror2 = accounts[5]

  before(async () => {
    this.erc721_test = await ERC721_test.deployed()
    this.erc20_test = await ERC20_test.deployed()
    this.pawnFactory = await PawnFactory.deployed()
  })

  describe('Default values', async () => {
    it('feeTo', async () => {
      const feeTo = await this.pawnFactory.feeTo()
      assert.equal(feeTo, '0x0000000000000000000000000000000000000000', 'Invalid feeTo')
    })
    it('feeToSetter', async () => {
      const feeToSetter = await this.pawnFactory.feeToSetter()
      assert.equal(feeToSetter, setter, 'Invalid feeToSetter')
    })
    it('getSpace', async () => {
      const getSpace = await this.pawnFactory.getSpace(ERC721_test.address)
      assert.equal(getSpace, '0x0000000000000000000000000000000000000000', 'Invalid getSpace')
    })
    it('allSpacesLength', async () => {
      const allSpacesLength = await this.pawnFactory.allSpacesLength()
      assert.equal(allSpacesLength, 0, 'Invalid allSpacesLength')
    })
  })

  describe('Functions', async () => {
    it('createSpace', async () => {
      const receipt = await this.pawnFactory.createSpace(ERC721_test.address)
      const spaceAddress = await this.pawnFactory.allSpaces(0)
      this.pawnSpace = await PawnSpace.at(spaceAddress)
      const nftToken = await this.pawnSpace.nftToken()
      expectEvent(receipt, 'SpaceCreated', {
        token: ERC721_test.address,
        space: spaceAddress,
        length: '1',
      })
      assert.equal(nftToken, ERC721_test.address, 'Invalid nft token address')
    })

    it('setFeeTo', async () => {
      const dummyAddress = accounts[9]
      await expectRevert(this.pawnFactory.setFeeTo(dummyAddress), 'PawnFactory: FORBIDDEN')
      this.pawnFactory.setFeeTo(dummyAddress, { from: setter })
      const feeTo = await this.pawnFactory.feeTo()
      assert.equal(feeTo, dummyAddress, 'Invalid fee to address')
    })
    it('setFeeToSetter', async () => {
      const dummyAddress = accounts[9]
      await expectRevert(this.pawnFactory.setFeeToSetter(dummyAddress), 'PawnFactory: FORBIDDEN')
      this.pawnFactory.setFeeToSetter(dummyAddress, { from: setter })
      const feeToSetter = await this.pawnFactory.feeToSetter()
      assert.equal(feeToSetter, dummyAddress, 'Invalid feeTo setter address')
    })
  })
})
