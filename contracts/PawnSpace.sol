// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import './interfaces/IPawnSpace.sol';
import './interfaces/IPawnFactory.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';

contract PawnSpace is IPawnSpace, ERC721 {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeERC20 for IERC20;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    address public constant STABLE_TOKEN = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2; // DAI

    address public override factory;
    address public override nftToken;
    uint256 internal _orderId;
    uint256 internal _offerId;

    struct Order {
        uint256[] tokenIds;
        uint256 period;
        uint256 requestAmount;
        uint256 interest;
        address offeror;
        uint256 createdBlockTimestamp;
        uint256 offeredBlockTimestamp;
    }

    mapping(uint256 => Order) public orders;
    // mapping(uint256 => uint256) internal _offerIds;

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
            if (_order.offeror == address(0)) {
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
            uint256 period,
            uint256 interest,
            address offeror,
            uint256 createdBlockTimestamp,
            uint256 offeredBlockTimestamp
        )
    {
        require(_exists(id), 'PawnSpace: NONEXIST_ORDER');

        owner = ownerOf(id);
        tokenIds = orders[id].tokenIds;
        period = orders[id].period;
        requestAmount = orders[id].requestAmount;
        interest = orders[id].interest;
        offeror = orders[id].offeror;
        createdBlockTimestamp = orders[id].createdBlockTimestamp;
        offeredBlockTimestamp = orders[id].offeredBlockTimestamp;
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
            period: period,
            interest: 0,
            offeror: address(0),
            createdBlockTimestamp: block.timestamp,
            offeredBlockTimestamp: 0
        });

        _mint(msg.sender, _orderId);
        orderId = _orderId;
        _orderId = _orderId.add(1);
        // TODO: deposit DAI to Aave

        emit MintOrder(msg.sender, orderId, tokenIds, requestAmount, period, block.timestamp);
    }

    function burnOrder(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(ownerOf(orderId) == msg.sender, 'PawnSpace: NOT_OWNER');
        require(orders[orderId].offeredBlockTimestamp == 0, 'PawnSpace: ALREADY_OFFERED');

        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }
        _burn(orderId);
        emit BurnOrder(msg.sender, orderId);
    }

    function offer(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(ownerOf(orderId) != msg.sender, 'PawnSpace: FORBIDDEN');
        require(orders[orderId].offeredBlockTimestamp == 0, 'PawnSpace: ALREADY_OFFERED');
        require(
            IERC20(STABLE_TOKEN).balanceOf(msg.sender) >= orders[orderId].requestAmount,
            'PawnSpace: NOT_ENOUGH_BALANCE'
        );
        require(
            IERC20(STABLE_TOKEN).allowance(msg.sender, address(this)) >= orders[orderId].requestAmount,
            'PawnSpace: NO_ALLOWANCE'
        );

        orders[orderId].offeror = msg.sender;
        orders[orderId].offeredBlockTimestamp = block.timestamp;
        // TODO: How to decide the interest
        uint256 interest = 0;
        orders[orderId].interest = interest;

        emit Offer(msg.sender, orderId, interest, block.timestamp);
    }

    function payback(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(ownerOf(orderId) == msg.sender, 'PawnSpace: NOT_OWNER');
        require(orders[orderId].offeredBlockTimestamp > 0, 'PawnSpace: NOT_OFFERED');
        require(
            orders[orderId].offeredBlockTimestamp.add(orders[orderId].period) >= block.timestamp,
            'PawnSpace: EXPIRED'
        );

        IERC20(STABLE_TOKEN).safeTransferFrom(
            msg.sender,
            orders[orderId].offeror,
            orders[orderId].requestAmount.add(orders[orderId].interest)
        );
        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }
        // TODO: withdraw DAI from Aave and send back to borrower

        emit Payback(msg.sender, orderId);
    }

    function withdraw(uint256 orderId) external override {
        require(_exists(orderId), 'PawnSpace: NONEXIST_ORDER');
        require(orders[orderId].offeredBlockTimestamp > 0, 'PawnSpace: NOT_OFFERED');
        require(
            orders[orderId].offeredBlockTimestamp.add(orders[orderId].period) < block.timestamp,
            'PawnSpace: NOT_EXPIRED'
        );
        require(orders[orderId].offeror == msg.sender, 'PawnSpace: NOT_LENDER');

        for (uint256 i = 0; i < orders[orderId].tokenIds.length; i++) {
            IERC721(nftToken).transferFrom(address(this), msg.sender, orders[orderId].tokenIds[i]);
        }

        emit Withdraw(msg.sender, orderId);
    }
}
