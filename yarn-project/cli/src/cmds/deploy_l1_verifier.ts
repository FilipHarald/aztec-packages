import { BBCircuitVerifier } from '@aztec/bb-prover';
import { createL1Clients, deployL1Contract } from '@aztec/ethereum';
import { type DebugLogger, type LogFn } from '@aztec/foundation/log';
import { MockVerifierAbi, MockVerifierBytecode, RollupAbi } from '@aztec/l1-artifacts';

// @ts-expect-error solc-js doesn't publish its types https://github.com/ethereum/solc-js/issues/689
import solc from 'solc';
import { getContract } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

import { createCompatibleClient } from '../client.js';

export async function deployUltraVerifier(
  ethRpcUrl: string,
  privateKey: string,
  mnemonic: string,
  pxeRpcUrl: string,
  bbBinaryPath: string,
  bbWorkingDirectory: string,
  log: LogFn,
  debugLogger: DebugLogger,
) {
  const circuitVerifier = await BBCircuitVerifier.new({ bbBinaryPath, bbWorkingDirectory });
  const contractSrc = await circuitVerifier.generateSolidityContract('RootRollupArtifact', 'UltraVerifier.sol');
  log('Generated UltraVerifier contract');

  const input = {
    language: 'Solidity',
    sources: {
      'UltraVerifier.sol': {
        content: contractSrc,
      },
    },
    settings: {
      // we require the optimizer
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['evm.bytecode.object', 'abi'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  log('Compiled UltraVerifier');

  const abi = output.contracts['UltraVerifier.sol']['UltraVerifier'].abi;
  const bytecode: string = output.contracts['UltraVerifier.sol']['UltraVerifier'].evm.bytecode.object;

  const account = !privateKey
    ? mnemonicToAccount(mnemonic!)
    : privateKeyToAccount(`${privateKey.startsWith('0x') ? '' : '0x'}${privateKey}` as `0x${string}`);
  const { publicClient, walletClient } = createL1Clients(ethRpcUrl, account);

  const verifierAddress = await deployL1Contract(walletClient, publicClient, abi, `0x${bytecode}`);
  log(`Deployed UltraVerifier at ${verifierAddress.toString()}`);

  const pxe = await createCompatibleClient(pxeRpcUrl, debugLogger);
  const { l1ContractAddresses } = await pxe.getNodeInfo();

  const rollup = getContract({
    abi: RollupAbi,
    address: l1ContractAddresses.rollupAddress.toString(),
    client: walletClient,
  });

  await rollup.write.setVerifier([verifierAddress.toString()]);
  log(`Rollup accepts only real proofs now`);
}

export async function deployMockVerifier(
  ethRpcUrl: string,
  privateKey: string,
  mnemonic: string,
  pxeRpcUrl: string,
  log: LogFn,
  debugLogger: DebugLogger,
) {
  const account = !privateKey
    ? mnemonicToAccount(mnemonic!)
    : privateKeyToAccount(`${privateKey.startsWith('0x') ? '' : '0x'}${privateKey}` as `0x${string}`);
  const { publicClient, walletClient } = createL1Clients(ethRpcUrl, account);

  const mockVerifierAddress = await deployL1Contract(walletClient, publicClient, MockVerifierAbi, MockVerifierBytecode);
  log(`Deployed MockVerifier at ${mockVerifierAddress.toString()}`);

  const pxe = await createCompatibleClient(pxeRpcUrl, debugLogger);
  const { l1ContractAddresses } = await pxe.getNodeInfo();

  const rollup = getContract({
    abi: RollupAbi,
    address: l1ContractAddresses.rollupAddress.toString(),
    client: walletClient,
  });

  await rollup.write.setVerifier([mockVerifierAddress.toString()]);
  log(`Rollup accepts only fake proofs now`);
}
