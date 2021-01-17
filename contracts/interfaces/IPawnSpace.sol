// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

interface IPawnSpace {
    function factory() external view returns (address);

    function nftToken() external view returns (address);

    function getOrders() external view returns (uint256[] memory);

    function getNotAcceptedOrders() external view returns (uint256[] memory);

    function getOrder(uint256 orderId)
        external
        view
        returns (
            uint256[] memory tokenIds,
            address owner,
            uint256 requestAmount,
            uint256 borrowingPeriod,
            uint256 createdBlockTimestamp,
            uint256 offeredBlockTimestamp,
            uint256 offerId
        );

    function getOffer(uint256 offerId)
        external
        view
        returns (
            uint256 orderId,
            address offeror,
            uint256 interest,
            uint256 createdBlockTimestamp
        );

    function order(
        uint256[] calldata tokenIds,
        uint256 requestAmount,
        uint256 period
    ) external returns (uint256 orderId);

    function burnOrder(uint256 orderId) external;

    function offer(uint256 orderId) external returns (uint256 offerId);

    function payback(uint256 offerId) external;

    function withdraw(uint256 orderId) external;

    function initialize(address) external;

    event MintOrder(address indexed sender, uint256 orderId, uint256[] tokenIds, uint256 requestAmount, uint256 period);
    event BurnOrder(address indexed sender, uint256 orderId);
    event MintOffer(address indexed sender, uint256 offerId, uint256 orderId, uint256 interest);
    event Payback(address indexed sender, uint256 orderId, uint256 offerId);
    event Withdraw(address indexed sender, uint256 orderId);
}
