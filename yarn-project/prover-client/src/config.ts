import { type ProverConfig } from '@aztec/circuit-types';

import { tmpdir } from 'os';

/**
 * The prover configuration.
 */
export type ProverClientConfig = ProverConfig & {
  /** The working directory to use for simulation/proving */
  acvmWorkingDirectory: string;
  /** The path to the ACVM binary */
  acvmBinaryPath: string;
  /** The working directory to for proving */
  bbWorkingDirectory: string;
  /** The path to the bb binary */
  bbBinaryPath: string;
};

/**
 * Returns the prover configuration from the environment variables.
 * Note: If an environment variable is not set, the default value is used.
 * @returns The prover configuration.
 */
export function getProverEnvVars(): ProverClientConfig {
  const {
    ACVM_WORKING_DIRECTORY = tmpdir(),
    ACVM_BINARY_PATH = '',
    BB_WORKING_DIRECTORY = tmpdir(),
    BB_BINARY_PATH = '',
    /** @deprecated */
    PROVER_AGENTS = '1',
    PROVER_AGENT_ENABLED = '1',
    PROVER_AGENT_CONCURRENCY = PROVER_AGENTS,
    PROVER_AGENT_POLL_INTERVAL_MS = '100',
    PROVER_REAL_PROOFS = '',
  } = process.env;

  const realProofs = ['1', 'true'].includes(PROVER_REAL_PROOFS);
  const proverAgentEnabled = ['1', 'true'].includes(PROVER_AGENT_ENABLED);
  const parsedProverConcurrency = parseInt(PROVER_AGENT_CONCURRENCY, 10);
  const proverAgentConcurrency = Number.isSafeInteger(parsedProverConcurrency) ? parsedProverConcurrency : 1;
  const parsedProverAgentPollInterval = parseInt(PROVER_AGENT_POLL_INTERVAL_MS, 10);
  const proverAgentPollInterval = Number.isSafeInteger(parsedProverAgentPollInterval)
    ? parsedProverAgentPollInterval
    : 100;

  return {
    acvmWorkingDirectory: ACVM_WORKING_DIRECTORY,
    acvmBinaryPath: ACVM_BINARY_PATH,
    bbBinaryPath: BB_BINARY_PATH,
    bbWorkingDirectory: BB_WORKING_DIRECTORY,
    realProofs,
    proverAgentEnabled,
    proverAgentPollInterval,
    proverAgentConcurrency,
  };
}
