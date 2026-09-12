// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MaqamExecutor} from "./MaqamExecutor.sol";

/// @dev Test fixture only; never used by production app.
contract TestSmartOwner is IERC1271 {
    address public signer;
    constructor(address initialSigner){signer=initialSigner;}
    function isValidSignature(bytes32 hash,bytes memory signature) external view returns(bytes4){
        return ECDSA.recover(hash,signature)==signer?IERC1271.isValidSignature.selector:bytes4(0xffffffff);
    }
    function approveToken(ERC20 token,address spender,uint256 amount) external {
        require(msg.sender==signer,"only signer");token.approve(spender,amount);
    }
}

/// @dev Attempts reentry while it is both token and authorized executor.
contract TestReentrantToken is ERC20 {
    MaqamExecutor private target;
    MaqamExecutor.Authorization private pending;
    bytes private pendingSignature;
    bool public reentryBlocked;
    constructor() ERC20("Adversarial fixture","BAD"){}
    function mint(address to,uint256 amount) external {_mint(to,amount);}
    function launch(MaqamExecutor executor,MaqamExecutor.Authorization calldata a,bytes calldata signature) external {
        target=executor;pending=a;pendingSignature=signature;executor.execute(a,signature);
    }
    function transferFrom(address from,address to,uint256 value) public override returns(bool){
        try target.execute(pending,pendingSignature){revert("reentry succeeded");}
        catch(bytes memory reason){
            bytes4 selector;assembly {selector:=mload(add(reason,32))}
            require(selector==bytes4(keccak256("ReentrancyGuardReentrantCall()")),"unexpected rejection");
            reentryBlocked=true;
        }
        return super.transferFrom(from,to,value);
    }
}
