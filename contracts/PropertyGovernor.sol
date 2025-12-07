// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Property.sol";

/**
 * @title PropertyGovernor
 * @dev Per-property governance using ERC1155 property shares as voting power.
 *
 * - Each proposal is tied to a specific propertyId.
 * - Voting weight = current balanceOf(voter, propertyId) at the time of voting.
 * - Simple FOR / AGAINST voting.
 * - Quorum computed as (for + against) vs totalSupply(propertyId) * quorumBps / 10_000.
 * - No on-chain execution yet: this is an on-chain signal layer for your app.
 */
contract PropertyGovernor is Ownable {
    struct Proposal {
        uint256 id;
        uint256 propertyId;
        address proposer;
        string title;
        string description;
        uint64 startTime;
        uint64 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool finalized;
        bool succeeded;
    }

    Property public immutable propertyToken;

    uint256 public votingPeriod;
    uint256 public minProposalShares;
    uint16 public quorumBps;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256[] private _allProposalIds;
    mapping(uint256 => uint256[]) private _proposalsByProperty;

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed propertyId,
        address indexed proposer,
        string title
    );

    event VoteCast(
        uint256 indexed proposalId,
        uint256 indexed propertyId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalFinalized(
        uint256 indexed proposalId,
        uint256 indexed propertyId,
        bool succeeded,
        uint256 forVotes,
        uint256 againstVotes
    );

    constructor(
        address propertyToken_,
        uint256 votingPeriod_,
        uint256 minProposalShares_,
        uint16 quorumBps_
    ) Ownable(msg.sender) {
        require(propertyToken_ != address(0), "PropertyGovernor: property zero");
        require(votingPeriod_ > 0, "PropertyGovernor: votingPeriod zero");
        require(quorumBps_ <= 10_000, "PropertyGovernor: quorum > 100%");

        propertyToken = Property(propertyToken_);
        votingPeriod = votingPeriod_;
        minProposalShares = minProposalShares_;
        quorumBps = quorumBps_;
    }

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod > 0, "PropertyGovernor: period zero");
        votingPeriod = newPeriod;
    }

    function setMinProposalShares(uint256 newMin) external onlyOwner {
        minProposalShares = newMin;
    }

    function setQuorumBps(uint16 newQuorumBps) external onlyOwner {
        require(newQuorumBps <= 10_000, "PropertyGovernor: quorum > 100%");
        quorumBps = newQuorumBps;
    }

    function createProposal(uint256 propertyId, string calldata title, string calldata description)
        external
        returns (uint256)
    {
        Property.PropertyInfo memory info = propertyToken.propertyMetadata(propertyId);
        require(info.exists, "PropertyGovernor: unknown property");

        uint256 balance = propertyToken.balanceOf(msg.sender, propertyId);
        require(balance >= minProposalShares, "PropertyGovernor: not enough shares");

        proposalCount += 1;
        uint256 proposalId = proposalCount;

        uint64 start = uint64(block.timestamp);
        uint64 end = uint64(block.timestamp + votingPeriod);

        proposals[proposalId] = Proposal({
            id: proposalId,
            propertyId: propertyId,
            proposer: msg.sender,
            title: title,
            description: description,
            startTime: start,
            endTime: end,
            forVotes: 0,
            againstVotes: 0,
            finalized: false,
            succeeded: false
        });

        _allProposalIds.push(proposalId);
        _proposalsByProperty[propertyId].push(proposalId);

        emit ProposalCreated(proposalId, propertyId, msg.sender, title);
        return proposalId;
    }

    function castVote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "PropertyGovernor: no proposal");
        require(block.timestamp >= p.startTime, "PropertyGovernor: voting not started");
        require(block.timestamp <= p.endTime, "PropertyGovernor: voting ended");
        require(!p.finalized, "PropertyGovernor: finalized");
        require(!hasVoted[proposalId][msg.sender], "PropertyGovernor: already voted");

        uint256 weight = propertyToken.balanceOf(msg.sender, p.propertyId);
        require(weight > 0, "PropertyGovernor: no voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit VoteCast(proposalId, p.propertyId, msg.sender, support, weight);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "PropertyGovernor: no proposal");
        require(!p.finalized, "PropertyGovernor: already finalized");
        require(block.timestamp > p.endTime, "PropertyGovernor: voting not ended");

        uint256 totalSupply = propertyToken.totalSupply(p.propertyId);
        uint256 totalVotes = p.forVotes + p.againstVotes;

        bool reachedQuorum = false;
        if (totalSupply > 0 && quorumBps > 0) {
            reachedQuorum = totalVotes * 10_000 >= totalSupply * quorumBps;
        } else if (quorumBps == 0) {
            reachedQuorum = true;
        }

        bool succeeded = reachedQuorum && p.forVotes > p.againstVotes;

        p.finalized = true;
        p.succeeded = succeeded;

        emit ProposalFinalized(proposalId, p.propertyId, succeeded, p.forVotes, p.againstVotes);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            uint256 propertyId,
            address proposer,
            string memory title,
            string memory description,
            uint64 startTime,
            uint64 endTime,
            uint256 forVotes,
            uint256 againstVotes,
            bool finalized,
            bool succeeded
        )
    {
        Proposal memory p = proposals[proposalId];
        return (
            p.id,
            p.propertyId,
            p.proposer,
            p.title,
            p.description,
            p.startTime,
            p.endTime,
            p.forVotes,
            p.againstVotes,
            p.finalized,
            p.succeeded
        );
    }

    function getProposalsByProperty(uint256 propertyId) external view returns (uint256[] memory) {
        return _proposalsByProperty[propertyId];
    }

    function getAllProposalIds() external view returns (uint256[] memory) {
        return _allProposalIds;
    }
}

