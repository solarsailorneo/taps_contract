// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyCollectible1155 is ERC1155, Ownable {
    constructor() ERC1155("https://myapi.com/api/token/{id}.json") { 
        // The URI is a placeholder here. Replace "https://myapi.com/api/token/{id}.json" with your actual base URI.
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) public {
        _mint(to, id, amount, data);
    }
}
