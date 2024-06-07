import { loadContractArtifact } from '@aztec/types/abi';
import { type NoirCompiledContract } from '@aztec/types/noir';

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const artifactPath = resolve(dirname(fileURLToPath(import.meta.url)), '../artifacts/ContractInstanceDeployer.json');

export const ContractInstanceDeployerArtifact = loadContractArtifact(
  JSON.parse(readFileSync(artifactPath, 'utf-8').toString()) as NoirCompiledContract,
);
