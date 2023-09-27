pragma solidity ^0.8.4;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyCollectible is ERC20 {
    constructor() ERC20("MyCollectible20", "MC20") {
    }
}