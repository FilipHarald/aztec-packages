import {
  ContractClassRegisteredEvent,
  PrivateKernelTailCircuitPublicInputs,
  Proof,
  PublicCallRequest,
} from '@aztec/circuits.js';
import { arraySerializedSizeOfNonEmpty } from '@aztec/foundation/collection';
import { BufferReader, serializeToBuffer } from '@aztec/foundation/serialize';

import { type GetUnencryptedLogsResponse } from '../logs/get_unencrypted_logs_response.js';
import { type L2LogsSource } from '../logs/l2_logs_source.js';
import { EncryptedNoteTxL2Logs, EncryptedTxL2Logs, UnencryptedTxL2Logs } from '../logs/tx_l2_logs.js';
import { type TxStats } from '../stats/stats.js';
import { TxHash } from './tx_hash.js';

/**
 * The interface of an L2 transaction.
 */
export class Tx {
  constructor(
    /**
     * Output of the private kernel circuit for this tx.
     */
    public readonly data: PrivateKernelTailCircuitPublicInputs,
    /**
     * Proof from the private kernel circuit.
     */
    public readonly proof: Proof,
    /**
     * Encrypted note logs generated by the tx.
     */
    public readonly noteEncryptedLogs: EncryptedNoteTxL2Logs,
    /**
     * Encrypted logs generated by the tx.
     */
    public readonly encryptedLogs: EncryptedTxL2Logs,
    /**
     * Unencrypted logs generated by the tx.
     */
    public readonly unencryptedLogs: UnencryptedTxL2Logs,
    /**
     * Enqueued public functions from the private circuit to be run by the sequencer.
     * Preimages of the public call stack entries from the private kernel circuit output.
     */
    public readonly enqueuedPublicFunctionCalls: PublicCallRequest[],
    /**
     * Public function call to be run by the sequencer as part of teardown.
     */
    public readonly publicTeardownFunctionCall: PublicCallRequest,
  ) {
    const kernelPublicCallStackSize = data.numberOfPublicCallRequests();
    if (kernelPublicCallStackSize !== enqueuedPublicFunctionCalls.length) {
      throw new Error(
        `Mismatch number of enqueued public function calls in kernel circuit public inputs (expected
          ${kernelPublicCallStackSize}, got ${enqueuedPublicFunctionCalls.length})`,
      );
    }
  }

  hasPublicCalls() {
    return this.data.numberOfPublicCallRequests() > 0;
  }

  /**
   * Deserializes the Tx object from a Buffer.
   * @param buffer - Buffer or BufferReader object to deserialize.
   * @returns An instance of Tx.
   */
  static fromBuffer(buffer: Buffer | BufferReader): Tx {
    const reader = BufferReader.asReader(buffer);
    return new Tx(
      reader.readObject(PrivateKernelTailCircuitPublicInputs),
      reader.readObject(Proof),
      reader.readObject(EncryptedNoteTxL2Logs),
      reader.readObject(EncryptedTxL2Logs),
      reader.readObject(UnencryptedTxL2Logs),
      reader.readArray(reader.readNumber(), PublicCallRequest),
      reader.readObject(PublicCallRequest),
    );
  }

  /**
   * Serializes the Tx object into a Buffer.
   * @returns Buffer representation of the Tx object.
   */
  toBuffer() {
    return serializeToBuffer([
      this.data,
      this.proof,
      this.noteEncryptedLogs,
      this.encryptedLogs,
      this.unencryptedLogs,
      this.enqueuedPublicFunctionCalls.length,
      this.enqueuedPublicFunctionCalls,
      this.publicTeardownFunctionCall,
    ]);
  }

  /**
   * Convert a Tx class object to a plain JSON object.
   * @returns A plain object with Tx properties.
   */
  public toJSON() {
    return {
      data: this.data.toBuffer().toString('hex'),
      noteEncryptedLogs: this.noteEncryptedLogs.toBuffer().toString('hex'),
      encryptedLogs: this.encryptedLogs.toBuffer().toString('hex'),
      unencryptedLogs: this.unencryptedLogs.toBuffer().toString('hex'),
      proof: this.proof.toBuffer().toString('hex'),
      enqueuedPublicFunctions: this.enqueuedPublicFunctionCalls.map(f => f.toBuffer().toString('hex')) ?? [],
      publicTeardownFunctionCall: this.publicTeardownFunctionCall.toBuffer().toString('hex'),
    };
  }

  /**
   * Gets unencrypted logs emitted by this tx.
   * @param logsSource - An instance of `L2LogsSource` which can be used to obtain the logs.
   * @returns The requested logs.
   */
  public getUnencryptedLogs(logsSource: L2LogsSource): Promise<GetUnencryptedLogsResponse> {
    return logsSource.getUnencryptedLogs({ txHash: this.getTxHash() });
  }

  /**
   * Convert a plain JSON object to a Tx class object.
   * @param obj - A plain Tx JSON object.
   * @returns A Tx class object.
   */
  public static fromJSON(obj: any) {
    const publicInputs = PrivateKernelTailCircuitPublicInputs.fromBuffer(Buffer.from(obj.data, 'hex'));
    const noteEncryptedLogs = EncryptedNoteTxL2Logs.fromBuffer(Buffer.from(obj.noteEncryptedLogs, 'hex'));
    const encryptedLogs = EncryptedTxL2Logs.fromBuffer(Buffer.from(obj.encryptedLogs, 'hex'));
    const unencryptedLogs = UnencryptedTxL2Logs.fromBuffer(Buffer.from(obj.unencryptedLogs, 'hex'));
    const proof = Buffer.from(obj.proof, 'hex');
    const enqueuedPublicFunctions = obj.enqueuedPublicFunctions
      ? obj.enqueuedPublicFunctions.map((x: string) => PublicCallRequest.fromBuffer(Buffer.from(x, 'hex')))
      : [];
    const publicTeardownFunctionCall = PublicCallRequest.fromBuffer(Buffer.from(obj.publicTeardownFunctionCall, 'hex'));
    return new Tx(
      publicInputs,
      Proof.fromBuffer(proof),
      noteEncryptedLogs,
      encryptedLogs,
      unencryptedLogs,
      enqueuedPublicFunctions,
      publicTeardownFunctionCall,
    );
  }

  /**
   * Construct & return transaction hash.
   * @returns The transaction's hash.
   */
  getTxHash(): TxHash {
    // Private kernel functions are executed client side and for this reason tx hash is already set as first nullifier
    const firstNullifier = this.data.getNonEmptyNullifiers()[0];
    if (!firstNullifier || firstNullifier.isZero()) {
      throw new Error(`Cannot get tx hash since first nullifier is missing`);
    }
    return new TxHash(firstNullifier.toBuffer());
  }

  /** Returns stats about this tx. */
  getStats(): TxStats {
    return {
      txHash: this.getTxHash().toString(),
      noteEncryptedLogCount: this.noteEncryptedLogs.getTotalLogCount(),
      encryptedLogCount: this.encryptedLogs.getTotalLogCount(),
      unencryptedLogCount: this.unencryptedLogs.getTotalLogCount(),
      noteEncryptedLogSize: this.noteEncryptedLogs.getSerializedLength(),
      encryptedLogSize: this.encryptedLogs.getSerializedLength(),
      unencryptedLogSize: this.unencryptedLogs.getSerializedLength(),

      newCommitmentCount: this.data.getNonEmptyNoteHashes().length,
      newNullifierCount: this.data.getNonEmptyNullifiers().length,

      proofSize: this.proof.buffer.length,
      size: this.toBuffer().length,

      feePaymentMethod:
        // needsTeardown? then we pay a fee
        this.data.forPublic?.needsTeardown
          ? // needsSetup? then we pay through a fee payment contract
            this.data.forPublic?.needsSetup
            ? // if the first call is to `approve_public_authwit`, then it's a public payment
              this.enqueuedPublicFunctionCalls.at(-1)!.functionSelector.toField().toBigInt() === 0x43417bb1n
              ? 'fpc_public'
              : 'fpc_private'
            : 'native'
          : 'none',
      classRegisteredCount: this.unencryptedLogs
        .unrollLogs()
        .filter(log => ContractClassRegisteredEvent.isContractClassRegisteredEvent(log.data)).length,
    };
  }

  getSize() {
    return (
      this.data.getSize() +
      this.proof.buffer.length +
      this.noteEncryptedLogs.getSerializedLength() +
      this.encryptedLogs.getSerializedLength() +
      this.unencryptedLogs.getSerializedLength() +
      arraySerializedSizeOfNonEmpty(this.enqueuedPublicFunctionCalls) +
      arraySerializedSizeOfNonEmpty([this.publicTeardownFunctionCall])
    );
  }

  /**
   * Convenience function to get a hash out of a tx or a tx-like.
   * @param tx - Tx-like object.
   * @returns - The hash.
   */
  static getHash(tx: Tx | HasHash): TxHash {
    return hasHash(tx) ? tx.hash : tx.getTxHash();
  }

  /**
   * Convenience function to get array of hashes for an array of txs.
   * @param txs - The txs to get the hashes from.
   * @returns The corresponding array of hashes.
   */
  static getHashes(txs: (Tx | HasHash)[]): TxHash[] {
    return txs.map(Tx.getHash);
  }

  /**
   * Clones a tx, making a deep copy of all fields.
   * @param tx - The transaction to be cloned.
   * @returns The cloned transaction.
   */
  static clone(tx: Tx): Tx {
    const publicInputs = PrivateKernelTailCircuitPublicInputs.fromBuffer(tx.data.toBuffer());
    const proof = Proof.fromBuffer(tx.proof.toBuffer());
    const noteEncryptedLogs = EncryptedNoteTxL2Logs.fromBuffer(Buffer.from(tx.noteEncryptedLogs.toBuffer()));
    const encryptedLogs = EncryptedTxL2Logs.fromBuffer(tx.encryptedLogs.toBuffer());
    const unencryptedLogs = UnencryptedTxL2Logs.fromBuffer(tx.unencryptedLogs.toBuffer());
    const enqueuedPublicFunctions = tx.enqueuedPublicFunctionCalls.map(x => {
      return PublicCallRequest.fromBuffer(x.toBuffer());
    });
    const publicTeardownFunctionCall = PublicCallRequest.fromBuffer(tx.publicTeardownFunctionCall.toBuffer());
    return new Tx(
      publicInputs,
      proof,
      noteEncryptedLogs,
      encryptedLogs,
      unencryptedLogs,
      enqueuedPublicFunctions,
      publicTeardownFunctionCall,
    );
  }
}

/** Utility type for an entity that has a hash property for a txhash */
type HasHash = { /** The tx hash */ hash: TxHash };

function hasHash(tx: Tx | HasHash): tx is HasHash {
  return (tx as HasHash).hash !== undefined;
}
