import { type MerkleTreeId, SiblingPath } from '@aztec/circuit-types';
import {
  AppendOnlyTreeSnapshot,
  Fr,
  INITIAL_L2_BLOCK_NUM,
  type NullifierLeaf,
  type PublicDataTreeLeaf,
  StateReference,
  type UInt32,
} from '@aztec/circuits.js';
import { Tuple } from '@aztec/foundation/serialize';

export type MessageHeaderInit = {
  /** The message ID. Optional, if not set defaults to 0 */
  messageId?: number;
  /** Identifies the original request. Optional */
  requestId?: number;
};

export class MessageHeader {
  /** An number to identify this message */
  public readonly messageId: number;
  /** If this message is a response to a request, the messageId of the request */
  public readonly requestId: number;

  constructor({ messageId, requestId }: MessageHeaderInit) {
    this.messageId = messageId ?? 0;
    this.requestId = requestId ?? 0;
  }

  static fromMessagePack(data: object): MessageHeader {
    return new MessageHeader(data as MessageHeaderInit);
  }
}

export class TypedMessage<T, B> {
  public constructor(public readonly msgType: T, public readonly header: MessageHeader, public readonly value: B) {}

  static fromMessagePack<T, B>(data: Record<string, any>): TypedMessage<T, B> {
    return new TypedMessage(data['msgType'], MessageHeader.fromMessagePack(data['header']), data['value']);
  }
}

export interface NativeInstance {
  call(msg: Buffer | Uint8Array): Promise<any>;
}

export enum WorldStateMessageType {
  GET_TREE_INFO = 100,
  GET_STATE_REFERENCE,

  GET_LEAF_VALUE,
  GET_LEAF_PREIMAGE,
  GET_SIBLING_PATH,

  FIND_LEAF_INDEX,
  FIND_LOW_LEAF,

  APPEND_LEAVES,
  BATCH_INSERT,

  UPDATE_ARCHIVE,

  COMMIT,
  ROLLBACK,

  SYNC_BLOCK,
}

interface WithTreeId {
  treeId: MerkleTreeId;
}

interface WithWorldStateRevision {
  revision: WorldStateRevision;
}

interface WithLeafIndex {
  leafIndex: bigint;
}

export type SerializedLeafValue =
  | Buffer // Fr
  | { value: Buffer } // NullifierLeaf
  | { value: Buffer; slot: Buffer }; // PublicDataTreeLeaf

export type SerializedIndexedLeaf = {
  value: Exclude<SerializedLeafValue, Buffer>;
  nextIndex: bigint | number;
  nextValue: Buffer; // Fr
};

interface WithLeafValue {
  leaf: SerializedLeafValue;
}

interface WithLeaves {
  leaves: SerializedLeafValue[];
}

interface GetTreeInfoRequest extends WithTreeId, WithWorldStateRevision {}
interface GetTreeInfoResponse {
  treeId: MerkleTreeId;
  depth: UInt32;
  size: bigint | number;
  root: Buffer;
}

interface GetSiblingPathRequest extends WithTreeId, WithLeafIndex, WithWorldStateRevision {}
type GetSiblingPathResponse = Buffer[];

interface GetStateReferenceRequest extends WithWorldStateRevision {}
interface GetStateReferenceResponse {
  state: Record<MerkleTreeId, TreeStateReference>;
}

interface GetLeafRequest extends WithTreeId, WithWorldStateRevision, WithLeafIndex {}
type GetLeafResponse = SerializedLeafValue | undefined;

interface GetLeafPreImageRequest extends WithTreeId, WithLeafIndex, WithWorldStateRevision {}
type GetLeafPreImageResponse = SerializedIndexedLeaf | undefined;

interface FindLeafIndexRequest extends WithTreeId, WithLeafValue, WithWorldStateRevision {
  startIndex: bigint;
}
type FindLeafIndexResponse = bigint | null;

interface FindLowLeafRequest extends WithTreeId, WithWorldStateRevision {
  key: Fr;
}
interface FindLowLeafResponse {
  index: bigint | number;
  alreadyPresent: boolean;
}

interface AppendLeavesRequest extends WithTreeId, WithLeaves {}

interface BatchInsertRequest extends WithTreeId, WithLeaves {}
interface BatchInsertResponse {
  low_leaf_witness_data: ReadonlyArray<{
    leaf: SerializedIndexedLeaf;
    index: bigint | number;
    path: Tuple<Buffer, number>;
  }>;
  sorted_leaves: ReadonlyArray<[SerializedLeafValue, UInt32]>;
  subtree_path: Tuple<Buffer, number>;
}

interface SyncBlockRequest {
  blockStateRef: StateReference;
  blockHash: Fr;
  paddedNoteHashes: readonly Fr[];
  paddedL1ToL2Messages: readonly Fr[];
  paddedNullifiers: readonly NullifierLeaf[];
  batchesOfPaddedPublicDataWrites: readonly PublicDataTreeLeaf[][];
}

interface SyncBlockResponse {
  isBlockOurs: boolean;
}

export type WorldStateRequest = {
  [WorldStateMessageType.GET_TREE_INFO]: GetTreeInfoRequest;
  [WorldStateMessageType.GET_STATE_REFERENCE]: GetStateReferenceRequest;

  [WorldStateMessageType.GET_LEAF_VALUE]: GetLeafRequest;
  [WorldStateMessageType.GET_LEAF_PREIMAGE]: GetLeafPreImageRequest;
  [WorldStateMessageType.GET_SIBLING_PATH]: GetSiblingPathRequest;

  [WorldStateMessageType.FIND_LEAF_INDEX]: FindLeafIndexRequest;
  [WorldStateMessageType.FIND_LOW_LEAF]: FindLowLeafRequest;

  [WorldStateMessageType.APPEND_LEAVES]: AppendLeavesRequest;
  [WorldStateMessageType.BATCH_INSERT]: BatchInsertRequest;

  [WorldStateMessageType.UPDATE_ARCHIVE]: void;

  [WorldStateMessageType.COMMIT]: void;
  [WorldStateMessageType.ROLLBACK]: void;

  [WorldStateMessageType.SYNC_BLOCK]: SyncBlockRequest;
};

export type WorldStateResponse = {
  [WorldStateMessageType.GET_TREE_INFO]: GetTreeInfoResponse;
  [WorldStateMessageType.GET_STATE_REFERENCE]: GetStateReferenceResponse;

  [WorldStateMessageType.GET_LEAF_VALUE]: GetLeafResponse;
  [WorldStateMessageType.GET_LEAF_PREIMAGE]: GetLeafPreImageResponse;
  [WorldStateMessageType.GET_SIBLING_PATH]: GetSiblingPathResponse;

  [WorldStateMessageType.FIND_LEAF_INDEX]: FindLeafIndexResponse;
  [WorldStateMessageType.FIND_LOW_LEAF]: FindLowLeafResponse;

  [WorldStateMessageType.APPEND_LEAVES]: void;
  [WorldStateMessageType.BATCH_INSERT]: BatchInsertResponse;

  [WorldStateMessageType.UPDATE_ARCHIVE]: void;

  [WorldStateMessageType.COMMIT]: void;
  [WorldStateMessageType.ROLLBACK]: void;

  [WorldStateMessageType.SYNC_BLOCK]: SyncBlockResponse;
};

export type WorldStateRevision = -1 | 0 | UInt32;
export function worldStateRevision(includeUncommittedOrBlock: false | true | number): WorldStateRevision {
  if (typeof includeUncommittedOrBlock === 'number') {
    if (includeUncommittedOrBlock < INITIAL_L2_BLOCK_NUM || !Number.isInteger(includeUncommittedOrBlock)) {
      throw new TypeError('Invalid block number: ' + includeUncommittedOrBlock);
    }

    return includeUncommittedOrBlock;
  } else if (includeUncommittedOrBlock) {
    return -1;
  } else {
    return 0;
  }
}

type TreeStateReference = {
  root: Buffer;
  size: number;
};

export function treeStateReferenceToSnapshot(ref: TreeStateReference): AppendOnlyTreeSnapshot {
  return new AppendOnlyTreeSnapshot(Fr.fromBuffer(ref.root), ref.size);
}
