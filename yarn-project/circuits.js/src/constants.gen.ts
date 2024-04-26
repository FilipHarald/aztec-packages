/* eslint-disable */
// GENERATED FILE - DO NOT EDIT, RUN yarn remake-constants
export const ARGS_LENGTH = 16;
export const MAX_NEW_NOTE_HASHES_PER_CALL = 16;
export const MAX_NEW_NULLIFIERS_PER_CALL = 16;
export const MAX_PRIVATE_CALL_STACK_LENGTH_PER_CALL = 4;
export const MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL = 16;
export const MAX_NEW_L2_TO_L1_MSGS_PER_CALL = 2;
export const MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_CALL = 16;
export const MAX_PUBLIC_DATA_READS_PER_CALL = 16;
export const MAX_NOTE_HASH_READ_REQUESTS_PER_CALL = 32;
export const MAX_NULLIFIER_READ_REQUESTS_PER_CALL = 2;
export const MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_CALL = 2;
export const MAX_NULLIFIER_KEY_VALIDATION_REQUESTS_PER_CALL = 1;
export const MAX_ENCRYPTED_LOGS_PER_CALL = 4;
export const MAX_UNENCRYPTED_LOGS_PER_CALL = 4;
export const MAX_NEW_NOTE_HASHES_PER_TX = 64;
export const MAX_NEW_NULLIFIERS_PER_TX = 64;
export const MAX_PRIVATE_CALL_STACK_LENGTH_PER_TX = 8;
export const MAX_PUBLIC_CALL_STACK_LENGTH_PER_TX = 32;
export const MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_TX = 32;
export const MAX_PUBLIC_DATA_READS_PER_TX = 32;
export const MAX_NEW_L2_TO_L1_MSGS_PER_TX = 2;
export const MAX_NOTE_HASH_READ_REQUESTS_PER_TX = 128;
export const MAX_NULLIFIER_READ_REQUESTS_PER_TX = 8;
export const MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_TX = 8;
export const MAX_NULLIFIER_KEY_VALIDATION_REQUESTS_PER_TX = 4;
export const MAX_ENCRYPTED_LOGS_PER_TX = 8;
export const MAX_UNENCRYPTED_LOGS_PER_TX = 8;
export const NUM_ENCRYPTED_LOGS_HASHES_PER_TX = 1;
export const NUM_UNENCRYPTED_LOGS_HASHES_PER_TX = 1;
export const MAX_PUBLIC_DATA_HINTS = 64;
export const NUMBER_OF_L1_L2_MESSAGES_PER_ROLLUP = 16;
export const VK_TREE_HEIGHT = 3;
export const FUNCTION_TREE_HEIGHT = 5;
export const NOTE_HASH_TREE_HEIGHT = 32;
export const PUBLIC_DATA_TREE_HEIGHT = 40;
export const NULLIFIER_TREE_HEIGHT = 20;
export const L1_TO_L2_MSG_TREE_HEIGHT = 16;
export const ROLLUP_VK_TREE_HEIGHT = 8;
export const ARTIFACT_FUNCTION_TREE_MAX_HEIGHT = 5;
export const NULLIFIER_TREE_ID = 0;
export const NOTE_HASH_TREE_ID = 1;
export const PUBLIC_DATA_TREE_ID = 2;
export const L1_TO_L2_MESSAGE_TREE_ID = 3;
export const ARCHIVE_TREE_ID = 4;
export const NOTE_HASH_SUBTREE_HEIGHT = 6;
export const NOTE_HASH_SUBTREE_SIBLING_PATH_LENGTH = 26;
export const NULLIFIER_SUBTREE_HEIGHT = 6;
export const PUBLIC_DATA_SUBTREE_HEIGHT = 5;
export const ARCHIVE_HEIGHT = 16;
export const NULLIFIER_SUBTREE_SIBLING_PATH_LENGTH = 14;
export const PUBLIC_DATA_SUBTREE_SIBLING_PATH_LENGTH = 35;
export const L1_TO_L2_MSG_SUBTREE_HEIGHT = 4;
export const L1_TO_L2_MSG_SUBTREE_SIBLING_PATH_LENGTH = 12;
export const FUNCTION_SELECTOR_NUM_BYTES = 4;
export const ARGS_HASH_CHUNK_LENGTH = 64;
export const ARGS_HASH_CHUNK_COUNT = 64;
export const MAX_ARGS_LENGTH = ARGS_HASH_CHUNK_COUNT * ARGS_HASH_CHUNK_LENGTH;
export const INITIALIZATION_SLOT_SEPARATOR = 1000_000_000;
export const INITIAL_L2_BLOCK_NUM = 1;
export const BLOB_SIZE_IN_BYTES = 31 * 4096;
export const NESTED_CALL_L2_GAS_BUFFER = 20000;
export const MAX_PACKED_PUBLIC_BYTECODE_SIZE_IN_FIELDS = 16200;
export const MAX_PACKED_BYTECODE_SIZE_PER_PRIVATE_FUNCTION_IN_FIELDS = 3000;
export const MAX_PACKED_BYTECODE_SIZE_PER_UNCONSTRAINED_FUNCTION_IN_FIELDS = 3000;
export const REGISTERER_PRIVATE_FUNCTION_BROADCASTED_ADDITIONAL_FIELDS = 19;
export const REGISTERER_UNCONSTRAINED_FUNCTION_BROADCASTED_ADDITIONAL_FIELDS = 12;
export const REGISTERER_CONTRACT_CLASS_REGISTERED_MAGIC_VALUE =
  0x6999d1e02b08a447a463563453cb36919c9dd7150336fc7c4d2b52f8n;
export const REGISTERER_PRIVATE_FUNCTION_BROADCASTED_MAGIC_VALUE =
  0x1b70e95fde0b70adc30496b90a327af6a5e383e028e7a43211a07bcdn;
export const REGISTERER_UNCONSTRAINED_FUNCTION_BROADCASTED_MAGIC_VALUE =
  0xe7af816635466f128568edb04c9fa024f6c87fb9010fdbffa68b3d99n;
export const DEPLOYER_CONTRACT_INSTANCE_DEPLOYED_MAGIC_VALUE =
  0x85864497636cf755ae7bde03f267ce01a520981c21c3682aaf82a631n;
export const DEPLOYER_CONTRACT_ADDRESS = 0x0097949bb96834550868230a1b6cc242d1f662f7c52946245e4e73da1b8b2165n;
export const DEFAULT_GAS_LIMIT = 1_000_000_000;
export const DEFAULT_TEARDOWN_GAS_LIMIT = 100_000_000;
export const DEFAULT_MAX_FEE_PER_GAS = 10;
export const DEFAULT_INCLUSION_FEE = 0;
export const CANONICAL_KEY_REGISTRY_ADDRESS = 0x1585e564a60e6ec974bc151b62705292ebfc75c33341986a47fd9749cedb567en;
export const AZTEC_ADDRESS_LENGTH = 1;
export const GAS_FEES_LENGTH = 3;
export const GAS_LENGTH = 3;
export const GAS_SETTINGS_LENGTH = GAS_LENGTH * 2 + GAS_FEES_LENGTH + /* inclusion_fee */ 1;
export const CALL_CONTEXT_LENGTH = 6;
export const CONTENT_COMMITMENT_LENGTH = 4;
export const CONTRACT_INSTANCE_LENGTH = 5;
export const CONTRACT_STORAGE_READ_LENGTH = 2;
export const CONTRACT_STORAGE_UPDATE_REQUEST_LENGTH = 2;
export const ETH_ADDRESS_LENGTH = 1;
export const FUNCTION_DATA_LENGTH = 2;
export const FUNCTION_LEAF_PREIMAGE_LENGTH = 5;
export const GLOBAL_VARIABLES_LENGTH = 6 + GAS_FEES_LENGTH;
export const APPEND_ONLY_TREE_SNAPSHOT_LENGTH = 2;
export const L1_TO_L2_MESSAGE_LENGTH = 6;
export const L2_TO_L1_MESSAGE_LENGTH = 2;
export const MAX_BLOCK_NUMBER_LENGTH = 2;
export const NULLIFIER_KEY_VALIDATION_REQUEST_LENGTH = 3;
export const NULLIFIER_KEY_VALIDATION_REQUEST_CONTEXT_LENGTH = 4;
export const PARTIAL_STATE_REFERENCE_LENGTH = 6;
export const READ_REQUEST_LENGTH = 2;
export const SIDE_EFFECT_LENGTH = 2;
export const SIDE_EFFECT_LINKED_TO_NOTE_HASH_LENGTH = 3;
export const STATE_REFERENCE_LENGTH = APPEND_ONLY_TREE_SNAPSHOT_LENGTH + PARTIAL_STATE_REFERENCE_LENGTH;
export const TX_CONTEXT_LENGTH = 2 + GAS_SETTINGS_LENGTH;
export const TX_REQUEST_LENGTH = 2 + TX_CONTEXT_LENGTH + FUNCTION_DATA_LENGTH;
export const HEADER_LENGTH =
  APPEND_ONLY_TREE_SNAPSHOT_LENGTH + CONTENT_COMMITMENT_LENGTH + STATE_REFERENCE_LENGTH + GLOBAL_VARIABLES_LENGTH;
export const PRIVATE_CIRCUIT_PUBLIC_INPUTS_LENGTH =
  CALL_CONTEXT_LENGTH +
  3 +
  MAX_BLOCK_NUMBER_LENGTH +
  SIDE_EFFECT_LENGTH * MAX_NOTE_HASH_READ_REQUESTS_PER_CALL +
  READ_REQUEST_LENGTH * MAX_NULLIFIER_READ_REQUESTS_PER_CALL +
  NULLIFIER_KEY_VALIDATION_REQUEST_LENGTH * MAX_NULLIFIER_KEY_VALIDATION_REQUESTS_PER_CALL +
  SIDE_EFFECT_LENGTH * MAX_NEW_NOTE_HASHES_PER_CALL +
  SIDE_EFFECT_LINKED_TO_NOTE_HASH_LENGTH * MAX_NEW_NULLIFIERS_PER_CALL +
  MAX_PRIVATE_CALL_STACK_LENGTH_PER_CALL +
  MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL +
  L2_TO_L1_MESSAGE_LENGTH * MAX_NEW_L2_TO_L1_MSGS_PER_CALL +
  2 +
  SIDE_EFFECT_LENGTH * MAX_ENCRYPTED_LOGS_PER_CALL +
  SIDE_EFFECT_LENGTH * MAX_UNENCRYPTED_LOGS_PER_CALL +
  2 +
  HEADER_LENGTH +
  TX_CONTEXT_LENGTH;
export const PUBLIC_CIRCUIT_PUBLIC_INPUTS_LENGTH =
  CALL_CONTEXT_LENGTH +
  2 +
  READ_REQUEST_LENGTH * MAX_NULLIFIER_READ_REQUESTS_PER_CALL +
  READ_REQUEST_LENGTH * MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_CALL +
  CONTRACT_STORAGE_UPDATE_REQUEST_LENGTH * MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_CALL +
  CONTRACT_STORAGE_READ_LENGTH * MAX_PUBLIC_DATA_READS_PER_CALL +
  MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL +
  SIDE_EFFECT_LENGTH * MAX_NEW_NOTE_HASHES_PER_CALL +
  SIDE_EFFECT_LINKED_TO_NOTE_HASH_LENGTH * MAX_NEW_NULLIFIERS_PER_CALL +
  L2_TO_L1_MESSAGE_LENGTH * MAX_NEW_L2_TO_L1_MSGS_PER_CALL +
  2 +
  SIDE_EFFECT_LENGTH * MAX_UNENCRYPTED_LOGS_PER_CALL +
  1 +
  HEADER_LENGTH +
  GLOBAL_VARIABLES_LENGTH +
  AZTEC_ADDRESS_LENGTH +
  /* revert_code */ 1 +
  2 * GAS_LENGTH +
  /* transaction_fee */ 1;
export const PRIVATE_CALL_STACK_ITEM_LENGTH =
  AZTEC_ADDRESS_LENGTH + FUNCTION_DATA_LENGTH + PRIVATE_CIRCUIT_PUBLIC_INPUTS_LENGTH;
export const ENQUEUE_PUBLIC_FUNCTION_CALL_RETURN_LENGTH = 2 + FUNCTION_DATA_LENGTH + CALL_CONTEXT_LENGTH;
export const GET_NOTES_ORACLE_RETURN_LENGTH = 674;
export const NOTE_HASHES_NUM_BYTES_PER_BASE_ROLLUP = 2048;
export const NULLIFIERS_NUM_BYTES_PER_BASE_ROLLUP = 2048;
export const PUBLIC_DATA_WRITES_NUM_BYTES_PER_BASE_ROLLUP = 2048;
export const CONTRACTS_NUM_BYTES_PER_BASE_ROLLUP = 32;
export const CONTRACT_DATA_NUM_BYTES_PER_BASE_ROLLUP = 64;
export const CONTRACT_DATA_NUM_BYTES_PER_BASE_ROLLUP_UNPADDED = 52;
export const L2_TO_L1_MSGS_NUM_BYTES_PER_BASE_ROLLUP = 64;
export const LOGS_HASHES_NUM_BYTES_PER_BASE_ROLLUP = 64;
export const NUM_MSGS_PER_BASE_PARITY = 4;
export const NUM_BASE_PARITY_PER_ROOT_PARITY = 4;
export const RECURSIVE_PROOF_LENGTH = 93;
export const NESTED_RECURSIVE_PROOF_LENGTH = 109;
export const VERIFICATION_KEY_LENGTH_IN_FIELDS = 114;
export enum GeneratorIndex {
  NOTE_HASH = 1,
  NOTE_HASH_NONCE = 2,
  UNIQUE_NOTE_HASH = 3,
  SILOED_NOTE_HASH = 4,
  MESSAGE_NULLIFIER = 5,
  INITIALIZATION_NULLIFIER = 6,
  OUTER_NULLIFIER = 7,
  PUBLIC_DATA_READ = 8,
  PUBLIC_DATA_UPDATE_REQUEST = 9,
  FUNCTION_DATA = 10,
  FUNCTION_LEAF = 11,
  CONTRACT_DEPLOYMENT_DATA = 12,
  CONSTRUCTOR = 13,
  CONSTRUCTOR_ARGS = 14,
  CONTRACT_ADDRESS_V1 = 15,
  CONTRACT_LEAF = 16,
  CALL_CONTEXT = 17,
  CALL_STACK_ITEM = 18,
  CALL_STACK_ITEM_2 = 19,
  SECRET_HASH = 20,
  L2_TO_L1_MSG = 21,
  TX_CONTEXT = 22,
  PUBLIC_LEAF_INDEX = 23,
  PUBLIC_DATA_LEAF = 24,
  SIGNED_TX_REQUEST = 25,
  GLOBAL_VARIABLES = 26,
  PARTIAL_ADDRESS = 27,
  BLOCK_HASH = 28,
  SIDE_EFFECT = 29,
  FEE_PAYLOAD = 30,
  TX_REQUEST = 33,
  SIGNATURE_PAYLOAD = 34,
  VK = 41,
  PRIVATE_CIRCUIT_PUBLIC_INPUTS = 42,
  PUBLIC_CIRCUIT_PUBLIC_INPUTS = 43,
  FUNCTION_ARGS = 44,
  AUTHWIT_INNER = 45,
  AUTHWIT_OUTER = 46,
  NSK_M = 47,
  IVSK_M = 48,
  OVSK_M = 49,
  TSK_M = 50,
  PUBLIC_KEYS_HASH = 51,
  NOTE_NULLIFIER = 52,
  INNER_NOTE_HASH = 53,
  NOTE_CONTENT_HASH = 54,
}
