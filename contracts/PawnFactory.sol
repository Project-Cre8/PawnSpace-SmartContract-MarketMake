// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import './interfaces/IPawnFactory.sol';
import './PawnSpace.sol';

contract PawnFactory is IPawnFactory {
    address public override feeTo;
    address public override feeToSetter;
    address public DAI;
    address public aDAI;
    address public AAVE;

    mapping(address => address) public override getSpace;
    address[] public override allSpaces;

    constructor(
        address _feeToSetter,
        address dai,
        address adai,
        address lendingPool
    ) {
        feeToSetter = _feeToSetter;
        DAI = dai;
        aDAI = adai;
        AAVE = lendingPool;
    }

    function allSpacesLength() external view override returns (uint256) {
        return allSpaces.length;
    }

    function createSpace(address token) external override returns (address space) {
        require(token != address(0), 'PawnFactory: ZERO_ADDRESS');
        require(getSpace[token] == address(0), 'PawnFactory: SPACE_EXISTS');
        bytes memory bytecode = type(PawnSpace).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token));
        assembly {
            space := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IPawnSpace(space).initialize(token, DAI, aDAI, AAVE);
        getSpace[token] = space;
        allSpaces.push(space);
        emit SpaceCreated(token, space, allSpaces.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, 'PawnFactory: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, 'PawnFactory: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
