const { BN, constants, balance, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')

const PawnSpace = artifacts.require('PawnSpace')
const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test') //DAI

contract('PawnSpace', (_accounts) => {
  // Initial settings
  const owner = _accounts[0]
  const orderor1 = _accounts[1]
  const orderor2 = _accounts[2]
  const offeror1 = _accounts[3]
  const offeror2 = _accounts[4]

  before(async () => {
    this.erc721_test = await ERC721_test.deployed()
    this.erc20_test = await ERC20_test.deployed()
    this.pawnFactory = await PawnFactory.deployed()
    await this.pawnFactory.createSpace(ERC721_test.address)
    const spaceAddress = await this.pawnFactory.allSpaces(0)
    this.pawnSpace = await PawnSpace.at(spaceAddress)
  })

  describe('Default values', async () => {
    it('totalSupply', async () => {
      const totalSupply = await this.pawnSpace.totalSupply()
      assert.equal(parseInt(totalSupply), 0, 'Invalid total supply')
    })
    it('getOrders', async () => {
      await expectRevert(this.pawnSpace.getOrders(), 'PawnSpace: NONEXIST_ORDERS')
    })
    it('getNotAcceptedOrders', async () => {
      await expectRevert(this.pawnSpace.getNotAcceptedOrders(), 'PawnSpace: NONEXIST_ORDERS')
    })
    it('getOrder', async () => {
      await expectRevert(this.pawnSpace.getOrder(0), 'PawnSpace: NONEXIST_ORDER')
    })
  })
  describe('Functions', async () => {
    before(async () => {
      this.erc721_test.mint(orderor1)
      this.erc721_test.mint(orderor2)
      this.erc721_test.mint(orderor2)
    })
    it('initialize', async () => {
      const dummyAddress = _accounts[9]
      await expectRevert(this.pawnSpace.initialize(dummyAddress), 'PawnSpace: FORBIDDEN')
    })
    it('order', async () => {
      const period = 30 * 24 * 60 * 60
      const requestAmount = 100
      const interest = 10
      const additionalCollateral = 30

      await expectRevert(
        this.pawnSpace.order([], requestAmount, interest, period, additionalCollateral),
        'PawnSpace: NO_NFT'
      )
      await expectRevert(
        this.pawnSpace.order([0], requestAmount, interest, period, additionalCollateral),
        'ERC721: transfer caller is not owner nor approved'
      )
      this.erc721_test.approve(this.pawnSpace.address, 0, { from: orderor1 })
      const receipt = await this.pawnSpace.order([0], requestAmount, interest, period, additionalCollateral, {
        from: orderor1,
      })
      const block = await web3.eth.getBlock('latest')

      const totalSupply = await this.pawnSpace.totalSupply()
      assert.equal(parseInt(totalSupply), 1, 'Invalid total supply')
      const orders = await this.pawnSpace.getOrders()
      assert.equal(parseInt(orders[0]), 0, 'Invalid orders')
      const order = await this.pawnSpace.getOrder(0)
      assert.equal(parseInt(order.tokenIds[0]), 0, 'Invalid tokenIds')
      assert.equal(order.owner, orderor1, 'Invalid owner')
      assert.equal(parseInt(order.requestAmount), requestAmount, 'Invalid requestAmount')
      assert.equal(parseInt(order.borrowingPeriod), period, 'Invalid borrowingPeriod')
      assert.equal(parseInt(order.createdBlockTimestamp), block.timestamp, 'Invalid createdBlockTimestamp')
      assert.equal(parseInt(order.offeredBlockTimestamp), 0, 'Invalid offeredBlockTimestamp')
      assert.equal(parseInt(order.offerId), 0, 'Invalid offerId')
      // expectEvent(receipt, 'MintOrder', {
      //   sender: orderor1,
      //   orderId: '0',
      //   tokenIds: [new BN(0)], // Could not compare array(tokenIds)
      //   requestToken: requestToken,
      //   period: period.toString(),
      //   requestAmount: requestAmount.toString()
      // })
    })
    it('burnOrder', async () => {
      await expectRevert(this.pawnSpace.burnOrder(1), 'PawnSpace: NONEXIST_ORDER')
      await expectRevert(this.pawnSpace.burnOrder(0), 'PawnSpace: NOT_OWNER')

      const receipt = await this.pawnSpace.burnOrder(0, { from: orderor1 })
    })
    it('offer', async () => {})
    it('payback', async () => {})
    it('withdraw', async () => {})
  })
  describe('Scenario: 2 orders -> 2 offers -> accept -> payback', async () => {})
  describe('Scenario: 2 orders -> transfer -> 2 offers -> accept -> withdraw', async () => {})
})
