// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import './interfaces/IPawnSpace.sol';
import './interfaces/IPawnFactory.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';

contract PawnSpace is IPawnSpace, ERC721 {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    address public override factory;
    address public override nftToken;
    uint256 internal _orderId;
    uint256 internal _offerId;

    struct Order {
        uint256[] tokenIds;
        uint256 borrowingPeriod;
        uint256 requestAmount;
        uint256 createdBlockTimestamp;
        uint256 offeredBlockTimestamp;
        uint256 offerId;
    }
    struct Offer {
        uint256 orderId;
        address offeror;
        uint256 amount;
        uint256 interest;
        uint256 createdBlockTimestamp;
        uint256 expiredTimestamp;
    }

    mapping(uint256 => Order) public orders;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => EnumerableSet.UintSet) internal _offerIds;

    uint256 private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'PawnSpace: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getOrders() external view override returns (uint256[] memory ids) {
        require(totalSupply() > 0, 'PawnSpace: NONEXIST_ORDERS');

        ids = new uint256[](totalSupply());
        for (uint256 i = 0; i < ids.length; i++) {
            ids[i] = tokenByIndex(i);
        }
    }

    function getNotAcceptedOrders() external view override returns (uint256[] memory ids) {
        require(totalSupply() > 0, 'PawnSpace: NONEXIST_ORDERS');

        ids = new uint256[](totalSupply());
        for (uint256 i = 0; i < totalSupply(); i++) {
            uint256 id = tokenByIndex(i);
            Order memory _order = orders[id];
            if (_order.offeredBlockTimestamp == 0) {
                ids[i] = id;
            }
        }

        return ids;
    }

    function getOrder(uint256 id)
        external
        view
        override
        returns (
            uint256[] memory tokenIds,
            address owner,
            uint256 requestAmount,
            uint256 borrowingPeriod,
            uint256 createdBlockTimestamp,
            uint256 offeredBlockTimestamp,
            uint256 offerId
        )
    {
        require(_exists(id), 'PawnSpace: NONEXIST_ORDER');

        owner = ownerOf(id);
        tokenIds = orders[id].tokenIds;
        requestAmount = orders[id].requestAmount;
        borrowingPeriod = orders[id].borrowingPeriod;
        createdBlockTimestamp = orders[id].createdBlockTimestamp;
        offeredBlockTimestamp = orders[id].offeredBlockTimestamp;
        offerId = orders[id].offerId;
    }

    function getOffer(uint256 offerId)
        external
        view
        override
        returns (
            uint256 orderId,
            address offeror,
            uint256 interest,
            uint256 createdBlockTimestamp
        )
    {
        require(offers[offerId].createdBlockTimestamp > 0, 'PawnSpace: NONEXIST_OFFER');

        orderId = offers[offerId].orderId;
        offeror = offers[offerId].offeror;
        interest = offers[offerId].interest;
        createdBlockTimestamp = offers[offerId].createdBlockTimestamp;
    }

    function _safeTransfer(
        address token,
        address to,
        uint256 value
    ) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'PawnSpace: TRANSFER_FAILED');
    }

    constructor() ERC721('PawnSpace', 'PWN') {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    function initialize(address _token) external override {
        require(msg.sender == factory, 'PawnSpace: FORBIDDEN'); // sufficient check
        nftToken = _token;
    }

    function order(
        uint256[] calldata tokenIds,
        uint256 requestAmount,
        uint256 period
    ) external override returns (uint256 orderId) {
        require(tokenIds.length > 0, 'PawnSpace: NO_NFT');

        for (uint256 i = 0; i < tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(msg.sender, address(this), tokenIds[i]);
        }

        orders[_orderId] = Order({
            tokenIds: tokenIds,
            requestAmount: requestAmount,
            borrowingPeriod: period,
            createdBlockTimestamp: block.timestamp,
            offeredBlockTimestamp: 0,
            offerId: 0
        });

        _mint(msg.sender, _orderId);
        orderId = _orderId;
        emit MintOrder(msg.sender, _orderId, tokenIds, requestAmount, period);
        _orderId = _orderId.add(1);
    }

    function burnOrder(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(ownerOf(orderId) == msg.sender, 'PawnSpace: NOT_OWNER');
        require(orders[orderId].offeredBlockTimestamp == 0, 'PawnSpace: ALREADY_ACCEPTED');

        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }
        _burn(orderId);
        emit BurnOrder(msg.sender, orderId);
    }

    function offer(uint256 orderId) external override returns (uint256 offerId) {
        // require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        // require(ownerOf(orderId) != msg.sender, 'PawnSpace: FORBIDDEN');
        // require(orders[orderId].offeredBlockTimestamp == 0, 'PawnSpace: ALREADY_ACCEPTED');
        // require(orders[orderId].minAmount <= amount, 'PawnSpace: less than minimum amount');
        // require(IERC20(orders[orderId].requestToken).balanceOf(msg.sender) >= amount, 'PawnSpace: NOT_ENOUGH_BALANCE');
        // require(
        //     IERC20(orders[orderId].requestToken).allowance(msg.sender, address(this)) >= amount,
        //     'PawnSpace: NO_ALLOWANCE'
        // );
        // offers[_offerId] = Offer({
        //     orderId: orderId,
        //     offeror: msg.sender,
        //     amount: amount,
        //     interest: interest,
        //     createdBlockTimestamp: block.timestamp,
        //     expiredTimestamp: block.timestamp.add(period)
        // });
        // _offerIds[orderId].add(_offerId);
        // offerId = _offerId;
        // emit MintOffer(msg.sender, _offerId, orderId, amount, interest, period);
        // _offerId = _offerId.add(1);
    }

    function payback(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: burn for NONEXIST_ORDER');
        require(ownerOf(orderId) == msg.sender, 'PawnSpace: NOT_OWNER');
        require(orders[orderId].offeredBlockTimestamp > 0, 'PawnSpace: NOT_ACCEPTED');
        require(
            orders[orderId].offeredBlockTimestamp.add(orders[orderId].borrowingPeriod) >= block.timestamp,
            'PawnSpace: EXPIRED'
        );

        uint256 offerId = orders[orderId].offerId;
        // IERC20(daiAddress).transferFrom(
        //     msg.sender,
        //     offers[offerId].offeror,
        //     orders[orderId].requestAmount.add(offers[offerId].interest)
        // );
        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }

        emit Payback(msg.sender, orderId, offerId);
    }

    function withdraw(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(orders[orderId].offeredBlockTimestamp > 0, 'PawnSpace: NOT_ACCEPTED');
        require(
            orders[orderId].offeredBlockTimestamp.add(orders[orderId].borrowingPeriod) < block.timestamp,
            'PawnSpace: NOT_EXPIRED'
        );
        uint256 offerId = orders[orderId].offerId;
        require(offers[offerId].offeror == msg.sender, 'PawnSpace: NOT_LENDER');

        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }

        emit Withdraw(msg.sender, orderId);
    }
}
