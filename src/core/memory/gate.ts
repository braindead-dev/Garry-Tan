/**
 * @file src/core/memory/gate.ts
 * @description
 * Implements the "Should I Reply?" gate. This module decides whether the agent should
 * even consider generating a response to a given event.
 *
 * Responsibilities:
 * 1.  Calculating the relevance of an incoming message to the agent's self-concept.
 * 2.  Maintaining a running average embedding of the agent's own sent messages (self-embedding).
 * 3.  Implementing the logistic decision probability formula:
 *     P(reply) = logistic(eta0 + eta1*rho + eta2*is_direct_mention)
 * 4.  Managing the evolution of the shyness parameter (eta0) over time.
 * 5.  Returning a boolean decision on whether to proceed with a reply.
 */ 