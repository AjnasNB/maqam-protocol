// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Testnet prototype: single-use, exact ERC20 payment authorization.
/// @dev The owner retains funds and separately grants an ERC20 allowance.
contract MaqamExecutor is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Authorization {
        address owner;
        address executor;
        address token;
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
        uint256 epoch;
        bytes32 evidenceHash;
    }

    bytes32 public constant AUTHORIZATION_TYPEHASH = keccak256(
        "Authorization(address owner,address executor,address token,address recipient,uint256 amount,uint256 nonce,uint256 deadline,uint256 epoch,bytes32 evidenceHash)"
    );
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    mapping(address => uint256) public epochs;

    error InvalidAddress();
    error InvalidAmount();
    error Expired();
    error WrongExecutor();
    error NonceUnavailable();
    error EpochInvalidated();
    error InvalidSignature();

    event Executed(bytes32 indexed digest, address indexed owner, address indexed recipient,
        address executor, address token, uint256 amount, uint256 nonce, uint256 epoch, bytes32 evidenceHash);
    event Cancelled(address indexed owner, uint256 indexed nonce);
    event EpochInvalidatedByOwner(address indexed owner, uint256 epoch);

    constructor() EIP712("Maqam Protocol", "1") {}

    function hashAuthorization(Authorization calldata a) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(AUTHORIZATION_TYPEHASH,
            a.owner, a.executor, a.token, a.recipient, a.amount,
            a.nonce, a.deadline, a.epoch, a.evidenceHash)));
    }

    function validate(Authorization calldata a, bytes calldata signature) public view returns (bytes32 digest) {
        if (a.owner == address(0) || a.executor == address(0) || a.recipient == address(0) || a.token.code.length == 0) revert InvalidAddress();
        if (a.amount == 0) revert InvalidAmount();
        if (block.timestamp > a.deadline) revert Expired();
        if (msg.sender != a.executor) revert WrongExecutor();
        if (usedNonces[a.owner][a.nonce]) revert NonceUnavailable();
        if (a.epoch != epochs[a.owner]) revert EpochInvalidated();
        digest = hashAuthorization(a);
        if (!SignatureChecker.isValidSignatureNow(a.owner, digest, signature)) revert InvalidSignature();
    }

    function execute(Authorization calldata a, bytes calldata signature) external nonReentrant returns (bytes32 digest) {
        digest = validate(a, signature);
        usedNonces[a.owner][a.nonce] = true;
        IERC20(a.token).safeTransferFrom(a.owner, a.recipient, a.amount);
        emit Executed(digest, a.owner, a.recipient, a.executor, a.token, a.amount, a.nonce, a.epoch, a.evidenceHash);
    }

    function cancel(uint256 nonce) external {
        if (usedNonces[msg.sender][nonce]) revert NonceUnavailable();
        usedNonces[msg.sender][nonce] = true;
        emit Cancelled(msg.sender, nonce);
    }

    function invalidateAll() external {
        uint256 nextEpoch = ++epochs[msg.sender];
        emit EpochInvalidatedByOwner(msg.sender, nextEpoch);
    }
}
