import {
  AztecAddress,
  AztecNode,
  BatchCall,
  CompleteAddress,
  Contract,
  ContractArtifact,
  ContractBase,
  ContractClassWithId,
  ContractDeployer,
  DebugLogger,
  EthAddress,
  Fr,
  PXE,
  SignerlessWallet,
  TxHash,
  TxStatus,
  Wallet,
  getContractClassFromArtifact,
  getContractInstanceFromDeployParams,
  isContractDeployed,
} from '@aztec/aztec.js';
import {
  ARTIFACT_FUNCTION_TREE_MAX_HEIGHT,
  MAX_PACKED_BYTECODE_SIZE_PER_PRIVATE_FUNCTION_IN_FIELDS,
  MAX_PACKED_PUBLIC_BYTECODE_SIZE_IN_FIELDS,
  computeArtifactFunctionTree,
  computeArtifactFunctionTreeRoot,
  computeArtifactMetadataHash,
  computeFunctionArtifactHash,
  computePrivateFunctionsRoot,
  computePrivateFunctionsTree,
  computePublicBytecodeCommitment,
} from '@aztec/circuits.js';
import { siloNullifier } from '@aztec/circuits.js/abis';
import { FunctionSelector, FunctionType, bufferAsFields } from '@aztec/foundation/abi';
import { padArrayEnd } from '@aztec/foundation/collection';
import { ContractClassRegistererContract, ReaderContractArtifact, StatefulTestContract } from '@aztec/noir-contracts';
import { TestContract, TestContractArtifact } from '@aztec/noir-contracts/Test';
import { TokenContractArtifact } from '@aztec/noir-contracts/Token';
import { SequencerClient } from '@aztec/sequencer-client';

import { setup } from './fixtures/utils.js';

describe('e2e_deploy_contract', () => {
  let pxe: PXE;
  let accounts: CompleteAddress[];
  let logger: DebugLogger;
  let wallet: Wallet;
  let sequencer: SequencerClient | undefined;
  let aztecNode: AztecNode;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ teardown, pxe, accounts, logger, wallet, sequencer, aztecNode } = await setup());
  }, 100_000);

  afterAll(() => teardown());

  /**
   * Milestone 1.1.
   * https://hackmd.io/ouVCnacHQRq2o1oRc5ksNA#Interfaces-and-Responsibilities
   */
  it('should deploy a contract', async () => {
    const publicKey = accounts[0].publicKey;
    const salt = Fr.random();
    const deploymentData = getContractInstanceFromDeployParams(
      TestContractArtifact,
      [],
      salt,
      publicKey,
      EthAddress.ZERO,
    );
    const deployer = new ContractDeployer(TestContractArtifact, pxe, publicKey);
    const tx = deployer.deploy().send({ contractAddressSalt: salt });
    logger(`Tx sent with hash ${await tx.getTxHash()}`);
    const receipt = await tx.getReceipt();
    expect(receipt).toEqual(
      expect.objectContaining({
        status: TxStatus.PENDING,
        error: '',
      }),
    );
    logger(`Receipt received and expecting contract deployment at ${receipt.contractAddress}`);
    // we pass in wallet to wait(...) because wallet is necessary to create a TS contract instance
    const receiptAfterMined = await tx.wait({ wallet });

    expect(receiptAfterMined).toEqual(
      expect.objectContaining({
        status: TxStatus.MINED,
        error: '',
        contractAddress: deploymentData.address,
      }),
    );
    const contractAddress = receiptAfterMined.contractAddress!;
    expect(await isContractDeployed(pxe, contractAddress)).toBe(true);
    expect(await isContractDeployed(pxe, AztecAddress.random())).toBe(false);
  }, 60_000);

  /**
   * Verify that we can produce multiple rollups.
   */
  it('should deploy one contract after another in consecutive rollups', async () => {
    const deployer = new ContractDeployer(TestContractArtifact, pxe);

    for (let index = 0; index < 2; index++) {
      logger(`Deploying contract ${index + 1}...`);
      // we pass in wallet to wait(...) because wallet is necessary to create a TS contract instance
      const receipt = await deployer.deploy().send({ contractAddressSalt: Fr.random() }).wait({ wallet });
      expect(receipt.status).toBe(TxStatus.MINED);
    }
  }, 60_000);

  /**
   * Verify that we can deploy multiple contracts and interact with all of them.
   */
  it('should deploy multiple contracts and interact with them', async () => {
    const deployer = new ContractDeployer(TestContractArtifact, pxe);

    for (let index = 0; index < 2; index++) {
      logger(`Deploying contract ${index + 1}...`);
      const receipt = await deployer.deploy().send({ contractAddressSalt: Fr.random() }).wait({ wallet });

      const contract = await Contract.at(receipt.contractAddress!, TestContractArtifact, wallet);
      logger(`Sending TX to contract ${index + 1}...`);
      await contract.methods.get_public_key(accounts[0].address).send().wait();
    }
  }, 60_000);

  /**
   * Milestone 1.2.
   * https://hackmd.io/-a5DjEfHTLaMBR49qy6QkA
   */
  it('should not deploy a contract with the same salt twice', async () => {
    const contractAddressSalt = Fr.random();
    const deployer = new ContractDeployer(TestContractArtifact, pxe);

    {
      // we pass in wallet to wait(...) because wallet is necessary to create a TS contract instance
      const receipt = await deployer.deploy().send({ contractAddressSalt }).wait({ wallet });

      expect(receipt.status).toBe(TxStatus.MINED);
      expect(receipt.error).toBe('');
    }

    {
      await expect(deployer.deploy().send({ contractAddressSalt }).wait()).rejects.toThrowError(
        /A settled tx with equal hash/,
      );
    }
  }, 60_000);

  it('should deploy a contract connected to a portal contract', async () => {
    const deployer = new ContractDeployer(TestContractArtifact, wallet);
    const portalContract = EthAddress.random();

    // ContractDeployer was instantiated with wallet so we don't have to pass it to wait(...)
    const txReceipt = await deployer.deploy().send({ portalContract }).wait();

    expect(txReceipt.status).toBe(TxStatus.MINED);
    const contractAddress = txReceipt.contractAddress!;

    expect((await pxe.getContractData(contractAddress))?.portalContractAddress.toString()).toEqual(
      portalContract.toString(),
    );
    expect((await pxe.getExtendedContractData(contractAddress))?.contractData.portalContractAddress.toString()).toEqual(
      portalContract.toString(),
    );
  }, 60_000);

  it('it should not deploy a contract which failed the public part of the execution', async () => {
    sequencer?.updateSequencerConfig({
      minTxsPerBlock: 2,
    });

    try {
      // This test requires at least another good transaction to go through in the same block as the bad one.
      // I deployed the same contract again but it could really be any valid transaction here.
      const goodDeploy = new ContractDeployer(TokenContractArtifact, wallet).deploy(
        AztecAddress.random(),
        'TokenName',
        'TKN',
        18,
      );
      const badDeploy = new ContractDeployer(TokenContractArtifact, wallet).deploy(
        AztecAddress.ZERO,
        'TokenName',
        'TKN',
        18,
      );

      await Promise.all([
        goodDeploy.simulate({ skipPublicSimulation: true }),
        badDeploy.simulate({ skipPublicSimulation: true }),
      ]);

      const [goodTx, badTx] = [
        goodDeploy.send({ skipPublicSimulation: true }),
        badDeploy.send({ skipPublicSimulation: true }),
      ];

      const [goodTxPromiseResult, badTxReceiptResult] = await Promise.allSettled([goodTx.wait(), badTx.wait()]);

      expect(goodTxPromiseResult.status).toBe('fulfilled');
      expect(badTxReceiptResult.status).toBe('rejected');

      const [goodTxReceipt, badTxReceipt] = await Promise.all([goodTx.getReceipt(), badTx.getReceipt()]);

      expect(goodTxReceipt.blockNumber).toEqual(expect.any(Number));
      expect(badTxReceipt.blockNumber).toBeUndefined();

      await expect(pxe.getExtendedContractData(goodDeploy.instance!.address)).resolves.toBeDefined();
      await expect(pxe.getExtendedContractData(goodDeploy.instance!.address)).resolves.toBeDefined();

      await expect(pxe.getContractData(badDeploy.instance!.address)).resolves.toBeUndefined();
      await expect(pxe.getExtendedContractData(badDeploy.instance!.address)).resolves.toBeUndefined();
    } finally {
      sequencer?.updateSequencerConfig({
        minTxsPerBlock: 1,
      });
    }
  }, 60_000);

  // Tests calling a private function in an uninitialized and undeployed contract. Note that
  // it still requires registering the contract artifact and instance locally in the pxe.
  test.each(['as entrypoint', 'from an account contract'] as const)(
    'executes a function in an undeployed contract %s',
    async kind => {
      const testWallet = kind === 'as entrypoint' ? new SignerlessWallet(pxe) : wallet;
      const contract = await registerContract(testWallet, TestContract);
      const receipt = await contract.methods.emit_nullifier(10).send().wait({ debug: true });
      const expected = siloNullifier(contract.address, new Fr(10));
      expect(receipt.debugInfo?.newNullifiers[1]).toEqual(expected);
    },
  );

  // Tests privately initializing an undeployed contract. Also requires pxe registration in advance.
  test.each(['as entrypoint', 'from an account contract'] as const)(
    'privately initializes an undeployed contract contract %s',
    async kind => {
      const testWallet = kind === 'as entrypoint' ? new SignerlessWallet(pxe) : wallet;
      const owner = await registerRandomAccount(pxe);
      const initArgs: StatefulContractCtorArgs = [owner, 42];
      const contract = await registerContract(testWallet, StatefulTestContract, initArgs);
      await contract.methods
        .constructor(...initArgs)
        .send()
        .wait();
      expect(await contract.methods.summed_values(owner).view()).toEqual(42n);
    },
  );

  // Tests privately initializing multiple undeployed contracts on the same tx through an account contract.
  it('initializes multiple undeployed contracts in a single tx', async () => {
    const owner = await registerRandomAccount(pxe);
    const initArgs: StatefulContractCtorArgs[] = [42, 52].map(value => [owner, value]);
    const contracts = await Promise.all(initArgs.map(args => registerContract(wallet, StatefulTestContract, args)));
    const calls = contracts.map((c, i) => c.methods.constructor(...initArgs[i]).request());
    await new BatchCall(wallet, calls).send().wait();
    expect(await contracts[0].methods.summed_values(owner).view()).toEqual(42n);
    expect(await contracts[1].methods.summed_values(owner).view()).toEqual(52n);
  });

  // Tests registering a new contract class on a node
  // All this dance will be hidden behind a nicer API in the near future!
  describe('registering a new contract class', () => {
    let registerer: ContractClassRegistererContract;
    let artifact: ContractArtifact;
    let contractClass: ContractClassWithId;
    let registerTxHash: TxHash;
    let privateFunctionsRoot: Fr;
    let publicBytecodeCommitment: Fr;

    beforeAll(async () => {
      artifact = ReaderContractArtifact;
      contractClass = getContractClassFromArtifact(artifact);
      privateFunctionsRoot = computePrivateFunctionsRoot(contractClass.privateFunctions);
      publicBytecodeCommitment = computePublicBytecodeCommitment(contractClass.packedBytecode);
      registerer = await registerContract(wallet, ContractClassRegistererContract, [], new Fr(1));

      logger(`contractClass.id: ${contractClass.id}`);
      logger(`contractClass.artifactHash: ${contractClass.artifactHash}`);
      logger(`contractClass.privateFunctionsRoot: ${privateFunctionsRoot}`);
      logger(`contractClass.publicBytecodeCommitment: ${publicBytecodeCommitment}`);
      logger(`contractClass.packedBytecode.length: ${contractClass.packedBytecode.length}`);

      // Broadcast the class public bytecode via the registerer contract
      const tx = await registerer.methods
        .register(
          contractClass.artifactHash,
          privateFunctionsRoot,
          publicBytecodeCommitment,
          bufferAsFields(contractClass.packedBytecode, MAX_PACKED_PUBLIC_BYTECODE_SIZE_IN_FIELDS),
        )
        .send()
        .wait();
      registerTxHash = tx.txHash;
    });

    it('emits registered logs', async () => {
      const logs = await pxe.getUnencryptedLogs({ txHash: registerTxHash });
      const registeredLog = logs.logs[0].log; // We need a nicer API!
      expect(registeredLog.contractAddress).toEqual(registerer.address);
    });

    it('registers the contract class on the node', async () => {
      const registeredClass = await aztecNode.getContractClass(contractClass.id);
      expect(registeredClass).toBeDefined();
      expect(registeredClass!.artifactHash.toString()).toEqual(contractClass.artifactHash.toString());
      expect(registeredClass!.privateFunctionsRoot.toString()).toEqual(privateFunctionsRoot.toString());
      expect(registeredClass!.packedBytecode.toString('hex')).toEqual(contractClass.packedBytecode.toString('hex'));
      expect(registeredClass!.publicFunctions).toEqual(contractClass.publicFunctions);
      expect(registeredClass!.privateFunctions).toEqual([]);
    });

    it('broadcasts a private function and registers it on the node', async () => {
      const privateFunction = contractClass.privateFunctions[0];
      const privateFunctionArtifact = artifact.functions.find(fn =>
        FunctionSelector.fromNameAndParameters(fn).equals(privateFunction.selector),
      )!;

      // TODO(@spalladino): The following is computing the unconstrained root hash twice.
      // Feels like we need a nicer API for returning a hash along with all its preimages,
      // since it's common to provide all hash preimages to a function that verifies them.
      const artifactMetadataHash = computeArtifactMetadataHash(artifact);
      const unconstrainedArtifactFunctionTreeRoot = computeArtifactFunctionTreeRoot(artifact, FunctionType.OPEN);
      const privateFunctionTreePath = computePrivateFunctionsTree(contractClass.privateFunctions).getSiblingPath(0);
      const artifactFunctionTreePath = computeArtifactFunctionTree(artifact, FunctionType.SECRET)!.getSiblingPath(0);

      const selector = privateFunction.selector;
      const metadataHash = computeFunctionArtifactHash(privateFunctionArtifact);
      const bytecode = bufferAsFields(
        Buffer.from(privateFunctionArtifact.bytecode, 'hex'),
        MAX_PACKED_BYTECODE_SIZE_PER_PRIVATE_FUNCTION_IN_FIELDS,
      );
      const vkHash = privateFunction.vkHash;

      await registerer.methods
        .broadcast_private_function(
          contractClass.id,
          Fr.fromBufferReduce(artifactMetadataHash),
          Fr.fromBufferReduce(unconstrainedArtifactFunctionTreeRoot),
          privateFunctionTreePath.map(Fr.fromBufferReduce),
          padArrayEnd(artifactFunctionTreePath.map(Fr.fromBufferReduce), Fr.ZERO, ARTIFACT_FUNCTION_TREE_MAX_HEIGHT),
          // eslint-disable-next-line camelcase
          { selector, metadata_hash: Fr.fromBufferReduce(metadataHash), bytecode, vk_hash: vkHash },
        )
        .send()
        .wait();
    }, 60_000);

    it('broadcasts an unconstrained function', async () => {
      const functionArtifact = artifact.functions.find(fn => fn.functionType === FunctionType.UNCONSTRAINED)!;

      // TODO(@spalladino): Same comment as above on computing duplicated hashes.
      const artifactMetadataHash = computeArtifactMetadataHash(artifact);
      const privateArtifactFunctionTreeRoot = computeArtifactFunctionTreeRoot(artifact, FunctionType.SECRET);
      const functionTreePath = computeArtifactFunctionTree(artifact, FunctionType.UNCONSTRAINED)!.getSiblingPath(0);

      const selector = FunctionSelector.fromNameAndParameters(functionArtifact);
      const metadataHash = computeFunctionArtifactHash(functionArtifact);
      const bytecode = bufferAsFields(
        Buffer.from(functionArtifact.bytecode, 'hex'),
        MAX_PACKED_BYTECODE_SIZE_PER_PRIVATE_FUNCTION_IN_FIELDS,
      );

      await registerer.methods
        .broadcast_unconstrained_function(
          contractClass.id,
          Fr.fromBufferReduce(artifactMetadataHash),
          Fr.fromBufferReduce(privateArtifactFunctionTreeRoot),
          padArrayEnd(functionTreePath.map(Fr.fromBufferReduce), Fr.ZERO, ARTIFACT_FUNCTION_TREE_MAX_HEIGHT),
          // eslint-disable-next-line camelcase
          { selector, metadata_hash: Fr.fromBufferReduce(metadataHash), bytecode },
        )
        .send()
        .wait();
    }, 60_000);
  });
});

type StatefulContractCtorArgs = Parameters<StatefulTestContract['methods']['constructor']>;

async function registerRandomAccount(pxe: PXE): Promise<AztecAddress> {
  const { completeAddress: owner, privateKey } = CompleteAddress.fromRandomPrivateKey();
  await pxe.registerAccount(privateKey, owner.partialAddress);
  return owner.address;
}

type ContractArtifactClass<T extends ContractBase> = {
  at(address: AztecAddress, wallet: Wallet): Promise<T>;
  artifact: ContractArtifact;
};

async function registerContract<T extends ContractBase>(
  wallet: Wallet,
  contractArtifact: ContractArtifactClass<T>,
  args: any[] = [],
  salt?: Fr,
): Promise<T> {
  const instance = getContractInstanceFromDeployParams(contractArtifact.artifact, args, salt);
  await wallet.addContracts([{ artifact: contractArtifact.artifact, instance }]);
  return contractArtifact.at(instance.address, wallet);
}
