import { type KernelProofOutput, type ProofCreator } from '@aztec/circuit-types';
import {
  CallRequest,
  Fr,
  MAX_KEY_VALIDATION_REQUESTS_PER_TX,
  MAX_NEW_NOTE_HASHES_PER_TX,
  MAX_NEW_NULLIFIERS_PER_TX,
  MAX_NOTE_ENCRYPTED_LOGS_PER_TX,
  MAX_NOTE_HASH_READ_REQUESTS_PER_TX,
  MAX_NULLIFIER_READ_REQUESTS_PER_TX,
  MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL,
  NESTED_RECURSIVE_PROOF_LENGTH,
  PrivateCallData,
  PrivateKernelCircuitPublicInputs,
  PrivateKernelData,
  PrivateKernelInitCircuitPrivateInputs,
  PrivateKernelInnerCircuitPrivateInputs,
  PrivateKernelTailCircuitPrivateInputs,
  type PrivateKernelTailCircuitPublicInputs,
  type RECURSIVE_PROOF_LENGTH,
  type RecursiveProof,
  type TxRequest,
  VK_TREE_HEIGHT,
  VerificationKeyAsFields,
  getNonEmptyItems,
  makeRecursiveProof,
} from '@aztec/circuits.js';
import { padArrayEnd } from '@aztec/foundation/collection';
import { createDebugLogger } from '@aztec/foundation/log';
import { assertLength } from '@aztec/foundation/serialize';
import { pushTestData } from '@aztec/foundation/testing';
import { ClientCircuitArtifacts, PrivateResetTagToArtifactName } from '@aztec/noir-protocol-circuits-types';
import { type ExecutionResult, collectNoteHashLeafIndexMap, collectNullifiedNoteHashCounters } from '@aztec/simulator';
import { type WitnessMap } from '@noir-lang/types';

import {
  buildPrivateKernelInitHints,
  buildPrivateKernelInnerHints,
  buildPrivateKernelResetInputs,
  buildPrivateKernelTailHints,
} from './private_inputs_builders/index.js';
import { type ProvingDataOracle } from './proving_data_oracle.js';

/**
 * The KernelProver class is responsible for generating kernel proofs.
 * It takes a transaction request, its signature, and the simulation result as inputs, and outputs a proof
 * along with output notes. The class interacts with a ProvingDataOracle to fetch membership witnesses and
 * constructs private call data based on the execution results.
 */
export class KernelProver {
  private log = createDebugLogger('aztec:kernel-prover');

  constructor(private oracle: ProvingDataOracle, private proofCreator: ProofCreator) { }


  /**
   * Generate a proof for a given transaction request and execution result.
   * The function iterates through the nested executions in the execution result, creates private call data,
   * and generates a proof using the provided ProofCreator instance. It also maintains an index of new notes
   * created during the execution and returns them as a part of the KernelProverOutput.
   *
   * @param txRequest - The authenticated transaction request object.
   * @param executionResult - The execution result object containing nested executions and preimages.
   * @returns A Promise that resolves to a KernelProverOutput object containing proof, public inputs, and output notes.
   */
  async prove(
    txRequest: TxRequest,
    executionResult: ExecutionResult,
    isPrivate: boolean,
  ): Promise<KernelProofOutput<PrivateKernelTailCircuitPublicInputs>> {
    const executionStack = [executionResult];
    let firstIteration = true;

    let output: KernelProofOutput<PrivateKernelCircuitPublicInputs> = {
      publicInputs: PrivateKernelCircuitPublicInputs.empty(),
      proof: makeRecursiveProof<typeof NESTED_RECURSIVE_PROOF_LENGTH>(NESTED_RECURSIVE_PROOF_LENGTH),
      verificationKey: VerificationKeyAsFields.makeEmpty(),
      // LONDONTODO this is inelegant as we don't use this - we should revisit KernelProofOutput
      outputWitness: new Map()
    };

    const noteHashLeafIndexMap = collectNoteHashLeafIndexMap(executionResult);
    const noteHashNullifierCounterMap = collectNullifiedNoteHashCounters(executionResult);
    // vector of gzipped bincode acirs
    const acirs: Buffer[] = [];
    const witnessStack: WitnessMap[] = [];

    while (executionStack.length) {
      if (!firstIteration && this.needsReset(executionStack, output)) {
        const resetInputs = await this.getPrivateKernelResetInputs(executionStack, output, noteHashLeafIndexMap, noteHashNullifierCounterMap);
        output = await this.proofCreator.createProofReset(resetInputs);
        // LONDONTODO(AD) consider refactoring this
        acirs.push(Buffer.from(ClientCircuitArtifacts[PrivateResetTagToArtifactName[resetInputs.sizeTag]].bytecode, 'base64'));
        witnessStack.push(output.outputWitness);
      }
      const currentExecution = executionStack.pop()!;
      executionStack.push(...[...currentExecution.nestedExecutions].reverse());

      const publicCallRequests = currentExecution.enqueuedPublicFunctionCalls.map(result => result.toCallRequest());
      const publicTeardownCallRequest = currentExecution.publicTeardownFunctionCall.isEmpty()
        ? CallRequest.empty()
        : currentExecution.publicTeardownFunctionCall.toCallRequest();

      const functionName = await this.oracle.getDebugFunctionName(
        currentExecution.callStackItem.contractAddress,
        currentExecution.callStackItem.functionData.selector,
      );

      // LONDONTODO: This runs through the user's call stack
      const proofOutput = await this.proofCreator.createAppCircuitProof(
        currentExecution.partialWitness,
        currentExecution.acir,
        functionName,
      );
      acirs.push(currentExecution.acir);
      // LONDONTODO is this really a partial witness?
      witnessStack.push(currentExecution.partialWitness);

      const privateCallData = await this.createPrivateCallData(
        currentExecution,
        publicCallRequests,
        publicTeardownCallRequest,
        proofOutput.proof,
        proofOutput.verificationKey,
      );

      if (firstIteration) {
        const hints = buildPrivateKernelInitHints(
          currentExecution.callStackItem.publicInputs,
          noteHashNullifierCounterMap,
          currentExecution.callStackItem.publicInputs.privateCallRequests,
        );
        const proofInput = new PrivateKernelInitCircuitPrivateInputs(txRequest, privateCallData, hints);
        pushTestData('private-kernel-inputs-init', proofInput);
        output = await this.proofCreator.createProofInit(proofInput);
        acirs.push(Buffer.from(ClientCircuitArtifacts.PrivateKernelInitArtifact.bytecode, 'base64'));
        witnessStack.push(output.outputWitness);
      } else {
        const hints = buildPrivateKernelInnerHints(
          currentExecution.callStackItem.publicInputs,
          noteHashNullifierCounterMap,
        );
        const previousVkMembershipWitness = await this.oracle.getVkMembershipWitness(output.verificationKey);
        const previousKernelData = new PrivateKernelData(
          output.publicInputs,
          output.proof,
          output.verificationKey,
          Number(previousVkMembershipWitness.leafIndex),
          assertLength<Fr, typeof VK_TREE_HEIGHT>(previousVkMembershipWitness.siblingPath, VK_TREE_HEIGHT),
        );
        const proofInput = new PrivateKernelInnerCircuitPrivateInputs(previousKernelData, privateCallData, hints);
        pushTestData('private-kernel-inputs-inner', proofInput);
        output = await this.proofCreator.createProofInner(proofInput);
        acirs.push(Buffer.from(ClientCircuitArtifacts.PrivateKernelInnerArtifact.bytecode, 'base64'));
        witnessStack.push(output.outputWitness);
      }
      firstIteration = false;
    }

    if (this.somethingToReset(output)) {
      const resetInputs = await this.getPrivateKernelResetInputs(executionStack, output, noteHashLeafIndexMap, noteHashNullifierCounterMap);
      output = await this.proofCreator.createProofReset(resetInputs);
      // LONDONTODO(AD) consider refactoring this
      acirs.push(Buffer.from(ClientCircuitArtifacts[PrivateResetTagToArtifactName[resetInputs.sizeTag]].bytecode, 'base64'));
      witnessStack.push(output.outputWitness);
    }
    const previousVkMembershipWitness = await this.oracle.getVkMembershipWitness(output.verificationKey);
    const previousKernelData = new PrivateKernelData(
      output.publicInputs,
      output.proof,
      output.verificationKey,
      Number(previousVkMembershipWitness.leafIndex),
      assertLength<Fr, typeof VK_TREE_HEIGHT>(previousVkMembershipWitness.siblingPath, VK_TREE_HEIGHT),
    );

    this.log.debug(
      `Calling private kernel tail with hwm ${previousKernelData.publicInputs.minRevertibleSideEffectCounter}`,
    );

    const hints = buildPrivateKernelTailHints(output.publicInputs);

    const privateInputs = new PrivateKernelTailCircuitPrivateInputs(previousKernelData, hints);

    pushTestData('private-kernel-inputs-ordering', privateInputs);
    // LONDONTODO this will instead become part of our stack of programs
    // LONDONTODO createProofTail won't be called in the future - this is redundantly proving
    const tailOutput = await this.proofCreator.createProofTail(privateInputs);
    acirs.push(Buffer.from(ClientCircuitArtifacts.PrivateKernelTailArtifact.bytecode, 'base64'));
    witnessStack.push(tailOutput.outputWitness);

    // LONDONTODO: isPrivate flag was introduced in PXE interface to allow this `if`
    if (isPrivate) {
      const ivcProof = await this.proofCreator.createClientIvcProof(acirs, witnessStack);
      // LONDONTODO for now we just smuggle all the needed vk etc data into the existing tail proof structure
      tailOutput.clientIvcProof = ivcProof;
    } 
    return tailOutput;
  }

  private needsReset(executionStack: ExecutionResult[], output: KernelProofOutput<PrivateKernelCircuitPublicInputs>) {
    const nextIteration = executionStack[executionStack.length - 1];
    return (
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.newNoteHashes).length +
      getNonEmptyItems(output.publicInputs.end.newNoteHashes).length >
      MAX_NEW_NOTE_HASHES_PER_TX ||
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.newNullifiers).length +
      getNonEmptyItems(output.publicInputs.end.newNullifiers).length >
      MAX_NEW_NULLIFIERS_PER_TX ||
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.noteEncryptedLogsHashes).length +
      getNonEmptyItems(output.publicInputs.end.noteEncryptedLogsHashes).length >
      MAX_NOTE_ENCRYPTED_LOGS_PER_TX ||
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.noteHashReadRequests).length +
      getNonEmptyItems(output.publicInputs.validationRequests.noteHashReadRequests).length >
      MAX_NOTE_HASH_READ_REQUESTS_PER_TX ||
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.nullifierReadRequests).length +
      getNonEmptyItems(output.publicInputs.validationRequests.nullifierReadRequests).length >
      MAX_NULLIFIER_READ_REQUESTS_PER_TX ||
      getNonEmptyItems(nextIteration.callStackItem.publicInputs.keyValidationRequestsAndGenerators).length +
      getNonEmptyItems(output.publicInputs.validationRequests.scopedKeyValidationRequestsAndGenerators).length >
      MAX_KEY_VALIDATION_REQUESTS_PER_TX
    );
  }

  private somethingToReset(output: KernelProofOutput<PrivateKernelCircuitPublicInputs>) {
    return (
      getNonEmptyItems(output.publicInputs.validationRequests.noteHashReadRequests).length > 0 ||
      getNonEmptyItems(output.publicInputs.validationRequests.nullifierReadRequests).length > 0 ||
      getNonEmptyItems(output.publicInputs.validationRequests.scopedKeyValidationRequestsAndGenerators).length > 0 ||
      output.publicInputs.end.newNoteHashes.find(noteHash => noteHash.nullifierCounter !== 0) ||
      output.publicInputs.end.newNullifiers.find(nullifier => !nullifier.nullifiedNoteHash.equals(Fr.zero()))
    );
  }

  // LONDONTODO(AD): not a great distinction between this and buildPrivateKernelResetInputs
  private async getPrivateKernelResetInputs(
    executionStack: ExecutionResult[],
    output: KernelProofOutput<PrivateKernelCircuitPublicInputs>,
    noteHashLeafIndexMap: Map<bigint, bigint>,
    noteHashNullifierCounterMap: Map<number, number>,
  ) {
    const previousVkMembershipWitness = await this.oracle.getVkMembershipWitness(output.verificationKey);
    const previousKernelData = new PrivateKernelData(
      output.publicInputs,
      output.proof,
      output.verificationKey,
      Number(previousVkMembershipWitness.leafIndex),
      assertLength<Fr, typeof VK_TREE_HEIGHT>(previousVkMembershipWitness.siblingPath, VK_TREE_HEIGHT),
    );

    return await buildPrivateKernelResetInputs(
      executionStack,
      previousKernelData,
      noteHashLeafIndexMap,
      noteHashNullifierCounterMap,
      this.oracle,
    );
  }

  // LONDONTODO(AD) this has now been unbundled from createProofReset
  // private async runReset(
  //   executionStack: ExecutionResult[],
  //   output: KernelProofOutput<PrivateKernelCircuitPublicInputs>,
  //   noteHashLeafIndexMap: Map<bigint, bigint>,
  //   noteHashNullifierCounterMap: Map<number, number>,
  // ): Promise<KernelProofOutput<PrivateKernelCircuitPublicInputs>> {
  //   const previousVkMembershipWitness = await this.oracle.getVkMembershipWitness(output.verificationKey);
  //   const previousKernelData = new PrivateKernelData(
  //     output.publicInputs,
  //     output.proof,
  //     output.verificationKey,
  //     Number(previousVkMembershipWitness.leafIndex),
  //     assertLength<Fr, typeof VK_TREE_HEIGHT>(previousVkMembershipWitness.siblingPath, VK_TREE_HEIGHT),
  //   );

  //   return this.proofCreator.createProofReset(
  //     await buildPrivateKernelResetInputs(
  //       executionStack,
  //       previousKernelData,
  //       noteHashLeafIndexMap,
  //       noteHashNullifierCounterMap,
  //       this.oracle,
  //     ),
  //   );
  // }

  private async createPrivateCallData(
    { callStackItem }: ExecutionResult,
    publicCallRequests: CallRequest[],
    publicTeardownCallRequest: CallRequest,
    proof: RecursiveProof<typeof RECURSIVE_PROOF_LENGTH>,
    vk: VerificationKeyAsFields,
  ) {
    const { contractAddress, functionData } = callStackItem;

    const publicCallStack = padArrayEnd(publicCallRequests, CallRequest.empty(), MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL);

    const functionLeafMembershipWitness = await this.oracle.getFunctionMembershipWitness(
      contractAddress,
      functionData.selector,
    );
    const { contractClassId, publicKeysHash, saltedInitializationHash } = await this.oracle.getContractAddressPreimage(
      contractAddress,
    );
    const { artifactHash: contractClassArtifactHash, publicBytecodeCommitment: contractClassPublicBytecodeCommitment } =
      await this.oracle.getContractClassIdPreimage(contractClassId);

    // TODO(#262): Use real acir hash
    // const acirHash = keccak256(Buffer.from(bytecode, 'hex'));
    const acirHash = Fr.fromBuffer(Buffer.alloc(32, 0));

    return PrivateCallData.from({
      callStackItem,
      publicCallStack,
      publicTeardownCallRequest,
      proof,
      vk,
      publicKeysHash,
      contractClassArtifactHash,
      contractClassPublicBytecodeCommitment,
      saltedInitializationHash,
      functionLeafMembershipWitness,
      acirHash,
    });
  }
}
