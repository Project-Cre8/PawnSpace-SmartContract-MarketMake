// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import './interfaces/IPawnFactory.sol';
import './PawnSpace.sol';

contract PawnFactory is IPawnFactory {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => address) public override getSpace;
    address[] public override allSpaces;

    event SpaceCreated(address indexed token, address space, uint256 length);

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
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
        IPawnSpace(space).initialize(token);
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
