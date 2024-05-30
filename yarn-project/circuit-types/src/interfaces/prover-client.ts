import { type VerificationKeys } from '@aztec/circuits.js';

import { type BlockProver } from './block-prover.js';
import { type ProvingJobSource } from './proving-job.js';

/**
 * The prover configuration.
 */
export type ProverConfig = {
  /** The URL to the Aztec node to take proving jobs from */
  nodeUrl?: string;
  /** Whether to construct real proofs */
  realProofs: boolean;
  /** Whether this prover has a local prover agent */
  proverAgentEnabled: boolean;
  /** The interval agents poll for jobs at */
  proverAgentPollInterval: number;
  /** The maximum number of proving jobs to be run in parallel */
  proverAgentConcurrency: number;
};

/**
 * The interface to the prover client.
 * Provides the ability to generate proofs and build rollups.
 */
export interface ProverClient extends BlockProver {
  start(): Promise<void>;

  stop(): Promise<void>;

  getProvingJobSource(): ProvingJobSource;

  updateProverConfig(config: Partial<ProverConfig & { vks: VerificationKeys }>): Promise<void>;
}
