// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './ERC721A.sol';

contract MyNFT is ERC721A {
    uint256 private _maxSupply;

    constructor(string memory name_, string memory symbol_, uint256 maxSupply_)
        ERC721A(name_, symbol_)
    {
        _maxSupply = maxSupply_;
    }

    function mint(address to, uint256 quantity) external {
        require(getCurrentIndex() + quantity <= _maxSupply, "Exceeds max supply");
        _mint(to, quantity);
    }

    function getCurrentIndex() internal view returns (uint256) {
        return _currentIndex;
    }

}
