const { BN, constants, balance, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')

const PawnSpace = artifacts.require('PawnSpace')
const PawnFactory = artifacts.require('PawnFactory')
const ERC721_test = artifacts.require('ERC721_test')
const ERC20_test = artifacts.require('ERC20_test') //Stable Coin
const LendingPool_test = artifacts.require('LendingPool_test')
const AToken_test = artifacts.require('AToken_test')

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
    this.lendingPool = await LendingPool_test.deployed()
    this.aToken = await AToken_test.deployed()
  })

  describe('Default values', async () => {
    it('factory', async () => {
      const factory = await this.pawnSpace.factory()
      assert.equal(factory, this.pawnFactory.address, 'Invalid factory address')
    })
    it('nftToken', async () => {
      const nftToken = await this.pawnSpace.nftToken()
      assert.equal(nftToken, this.erc721_test.address, 'Invalid NFT address')
    })
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
      await this.erc721_test.mint(orderor1)
      await this.erc721_test.mint(orderor2)
      await this.erc721_test.mint(orderor2)
      await this.erc20_test.mint(100, { from: orderor1 })
      await this.erc20_test.mint(100, { from: orderor2 })
      await this.erc20_test.mint(100, { from: offeror1 })
      await this.erc20_test.mint(100, { from: offeror2 })
    })
    it('initialize', async () => {
      const dummyAddress = _accounts[9]
      await expectRevert(
        this.pawnSpace.initialize(dummyAddress, dummyAddress, dummyAddress, dummyAddress),
        'PawnSpace: FORBIDDEN'
      )
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
      await this.erc721_test.approve(this.pawnSpace.address, 0, { from: orderor1 })
      await this.erc20_test.approve(this.pawnSpace.address, additionalCollateral, { from: orderor1 })
      const receipt = await this.pawnSpace.order([0], requestAmount, interest, period, additionalCollateral, {
        from: orderor1,
      })
      const block = await web3.eth.getBlock('latest')

      assert.equal(parseInt(await this.pawnSpace.totalSupply()), 1, 'Invalid total supply')
      const orders = await this.pawnSpace.getOrders()
      assert.equal(parseInt(orders[0]), 0, 'Invalid orders')

      const order = await this.pawnSpace.getOrder(0)
      assert.equal(parseInt(order.tokenIds[0]), 0, 'Invalid tokenIds')
      assert.equal(order.owner, orderor1, 'Invalid owner')
      assert.equal(parseInt(order.requestAmount), requestAmount, 'Invalid requestAmount')
      assert.equal(parseInt(order.interest), interest, 'Invalid interest')
      assert.equal(parseInt(order.period), period, 'Invalid period')
      assert.equal(parseInt(order.additionalCollateral), additionalCollateral, 'Invalid additionalCollateral')
      assert.equal(parseInt(order.createdAt), block.timestamp, 'Invalid createdAt')
      assert.equal(parseInt(order.offeredAt), 0, 'Invalid offeredAt')
      assert.equal(parseInt(order.paidBackAt), 0, 'Invalid paidBackAt')
      assert.equal(parseInt(order.withdrewAt), 0, 'Invalid withdrewAt')

      assert.equal(await this.aToken.balanceOf(this.pawnSpace.address), additionalCollateral, 'Invalid aToken balance')
      assert.equal(parseInt(await this.erc721_test.balanceOf(orderor1)), 0, 'Invalid balanceOf')
      // expectEvent(receipt, 'MintOrder', {
      //   sender: orderor1,
      //   orderId: '0',
      //   tokenIds: [new BN(0)], // Could not compare array(tokenIds)
      //   requestAmount: requestAmount.toString(),
      //   interest: interest,
      //   period: period.toString(),
      //   additionalCollateral: additionalCollateral,
      //   createdAt: block.timestamp,
      // })
    })
    it('burnOrder', async () => {
      await expectRevert(this.pawnSpace.burnOrder(1), 'PawnSpace: NONEXIST_ORDER')
      await expectRevert(this.pawnSpace.burnOrder(0), 'PawnSpace: NOT_OWNER')

      const receipt = await this.pawnSpace.burnOrder(0, { from: orderor1 })

      assert.equal(parseInt(await this.pawnSpace.totalSupply()), 0, 'Invalid total supply')
      assert.equal(parseInt(await this.aToken.balanceOf(this.pawnSpace.address)), 0, 'Invalid aToken balanceOF aToken')
      assert.equal(parseInt(await this.erc721_test.balanceOf(orderor1)), 1, 'Invalid balanceOf NFT')
      assert.equal(parseInt(await this.erc20_test.balanceOf(orderor1)), 100, 'Invalid balanceOf token')
    })
    it('offer', async () => {
      const period = 30 * 24 * 60 * 60
      const requestAmount = 100
      const interest = 10
      const additionalCollateral = 30

      await this.erc721_test.approve(this.pawnSpace.address, 1, { from: orderor2 })
      await this.erc721_test.approve(this.pawnSpace.address, 2, { from: orderor2 })
      await this.erc20_test.approve(this.pawnSpace.address, additionalCollateral, { from: orderor2 })
      await this.pawnSpace.order([1, 2], requestAmount, interest, period, additionalCollateral, {
        from: orderor2,
      })
      const blockOrder = await web3.eth.getBlock('latest')

      await this.erc20_test.approve(this.pawnSpace.address, requestAmount, { from: offeror1 })
      const receipt = await this.pawnSpace.offer(1, { from: offeror1 })
      const blockOffer = await web3.eth.getBlock('latest')
      expectEvent(receipt, 'Offer', {
        sender: offeror1,
        orderId: '1',
        offeredAt: new BN(blockOffer.timestamp),
      })

      const order = await this.pawnSpace.getOrder(1)
      assert.equal(parseInt(order.tokenIds[0]), 1, 'Invalid tokenIds')
      assert.equal(order.owner, orderor2, 'Invalid owner')
      assert.equal(parseInt(order.requestAmount), requestAmount, 'Invalid requestAmount')
      assert.equal(parseInt(order.interest), interest, 'Invalid interest')
      assert.equal(parseInt(order.period), period, 'Invalid period')
      assert.equal(parseInt(order.additionalCollateral), additionalCollateral, 'Invalid additionalCollateral')
      assert.equal(parseInt(order.createdAt), blockOrder.timestamp, 'Invalid createdAt')
      assert.equal(parseInt(order.offeredAt), blockOffer.timestamp, 'Invalid offeredAt')
      assert.equal(parseInt(order.paidBackAt), 0, 'Invalid paidBackAt')
      assert.equal(parseInt(order.withdrewAt), 0, 'Invalid withdrewAt')

      assert.equal(
        parseInt(await this.erc20_test.balanceOf(orderor2)),
        100 - additionalCollateral + requestAmount,
        'Invalid balanceOf orderor'
      )
      assert.equal(
        parseInt(await this.erc20_test.balanceOf(offeror1)),
        100 - requestAmount,
        'Invalid balanceOf offeror'
      )
    })
    it('payback', async () => {
      const period = 30 * 24 * 60 * 60
      const requestAmount = 100
      const interest = 10
      const additionalCollateral = 30

      await this.erc20_test.approve(this.pawnSpace.address, requestAmount + interest, { from: orderor2 })
      const receipt = await this.pawnSpace.payBack(1, { from: orderor2 })
      const blockPayBack = await web3.eth.getBlock('latest')
      expectEvent(receipt, 'Payback', {
        sender: orderor2,
        orderId: '1',
        paidBackAt: new BN(blockPayBack.timestamp),
      })

      const order = await this.pawnSpace.getOrder(1)
      assert.equal(parseInt(order.tokenIds[0]), 1, 'Invalid tokenIds')
      assert.equal(order.owner, orderor2, 'Invalid owner')
      assert.equal(parseInt(order.requestAmount), requestAmount, 'Invalid requestAmount')
      assert.equal(parseInt(order.interest), interest, 'Invalid interest')
      assert.equal(parseInt(order.period), period, 'Invalid period')
      assert.equal(parseInt(order.additionalCollateral), additionalCollateral, 'Invalid additionalCollateral')
      assert.equal(parseInt(order.paidBackAt), blockPayBack.timestamp, 'Invalid paidBackAt')
      assert.equal(parseInt(order.withdrewAt), 0, 'Invalid withdrewAt')

      assert.equal(parseInt(await this.erc20_test.balanceOf(orderor2)), 100 - interest, 'Invalid balanceOf orderor')
      assert.equal(parseInt(await this.erc20_test.balanceOf(offeror1)), 100 + interest, 'Invalid balanceOf offeror')
    })
    it('withdraw', async () => {
      const requestAmount = 100
      const interest = 10
      const additionalCollateral = 30

      await this.erc721_test.approve(this.pawnSpace.address, 0, { from: orderor1 })
      await this.erc20_test.approve(this.pawnSpace.address, additionalCollateral, { from: orderor1 })
      await this.pawnSpace.order([0], requestAmount, interest, 0, additionalCollateral, {
        from: orderor1,
      })
      await this.erc20_test.approve(this.pawnSpace.address, requestAmount, { from: offeror2 })
      await this.pawnSpace.offer(2, { from: offeror2 })

      const receipt = await this.pawnSpace.withdraw(2, { from: offeror2 })
      const blockWithdraw = await web3.eth.getBlock('latest')
      expectEvent(receipt, 'Withdraw', {
        sender: offeror2,
        orderId: '2',
        withdrewAt: new BN(blockWithdraw.timestamp),
      })

      const order = await this.pawnSpace.getOrder(2)
      assert.equal(parseInt(order.tokenIds[0]), 0, 'Invalid tokenIds')
      assert.equal(order.owner, orderor1, 'Invalid owner')
      assert.equal(parseInt(order.requestAmount), requestAmount, 'Invalid requestAmount')
      assert.equal(parseInt(order.interest), interest, 'Invalid interest')
      assert.equal(parseInt(order.period), 0, 'Invalid period')
      assert.equal(parseInt(order.additionalCollateral), additionalCollateral, 'Invalid additionalCollateral')
      assert.equal(parseInt(order.paidBackAt), 0, 'Invalid paidBackAt')
      assert.equal(parseInt(order.withdrewAt), blockWithdraw.timestamp, 'Invalid withdrewAt')

      assert.equal(parseInt(await this.erc721_test.balanceOf(offeror2)), 1, 'Invalid balanceOf NFT')
      assert.equal(parseInt(await this.erc721_test.ownerOf(0)), offeror2, 'Invalid owner NFT')
    })
  })

  describe('Scenario: 2 orders -> 2 offers -> accept -> payback', async () => {})

  describe('Scenario: 2 orders -> transfer -> 2 offers -> accept -> withdraw', async () => {})
})
