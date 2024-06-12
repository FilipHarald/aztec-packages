#pragma once

#include "aztec_constants.hpp"

#include <cstddef>
#include <cstdint>

// NOTE(MD): for now we will only include the public inputs that are included in call_context
// With more being added in subsequent prs
// KERNEL_INPUTS_LENGTH = CALL_CONTEXT_LENGTH +
inline const std::size_t KERNEL_INPUTS_LENGTH = PUBLIC_CONTEXT_INPUTS_LENGTH;

inline const std::size_t KERNEL_OUTPUTS_LENGTH =
    MAX_NOTE_HASH_READ_REQUESTS_PER_CALL + MAX_NULLIFIER_READ_REQUESTS_PER_CALL +
    MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_CALL + MAX_L1_TO_L2_MSG_READ_REQUESTS_PER_CALL +
    MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_CALL + MAX_PUBLIC_DATA_READS_PER_CALL + MAX_NEW_NOTE_HASHES_PER_CALL +
    MAX_NEW_NULLIFIERS_PER_CALL + MAX_NEW_L2_TO_L1_MSGS_PER_CALL + MAX_UNENCRYPTED_LOGS_PER_CALL;

// START INDEXES in the PUBLIC_CIRCUIT_PUBLIC_INPUTS
// These line up with indexes found in
// https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/circuits.js/src/structs/public_circuit_public_inputs.ts
inline const uint32_t PCPI_GLOBALS_START = PUBLIC_CIRCUIT_PUBLIC_INPUTS_LENGTH - 7 - GLOBAL_VARIABLES_LENGTH;

inline const uint32_t CHAIN_ID_OFFSET = PCPI_GLOBALS_START;
inline const uint32_t VERSION_OFFSET = PCPI_GLOBALS_START + 1;
inline const uint32_t BLOCK_NUMBER_OFFSET = PCPI_GLOBALS_START + 2;
inline const uint32_t TIMESTAMP_OFFSET = PCPI_GLOBALS_START + 3;
inline const uint32_t COINBASE_OFFSET = PCPI_GLOBALS_START + 4;

inline const uint32_t FEE_PER_DA_GAS_OFFSET = PCPI_GLOBALS_START + 6;
inline const uint32_t FEE_PER_L2_GAS_OFFSET = PCPI_GLOBALS_START + 7;

inline const uint32_t TRANSACTION_FEE_OFFSET = PUBLIC_CIRCUIT_PUBLIC_INPUTS_LENGTH - 1;
inline const uint32_t DA_START_GAS_LEFT_PCPI_OFFSET = PUBLIC_CIRCUIT_PUBLIC_INPUTS_LENGTH - 3 - GAS_LENGTH;
inline const uint32_t L2_START_GAS_LEFT_PCPI_OFFSET = PUBLIC_CIRCUIT_PUBLIC_INPUTS_LENGTH - 2 - GAS_LENGTH;

// Kernel output pil offset (Where update objects are inlined)

// Kernel outputs public inputs offsets
inline const uint32_t PCPI_NOTE_HASH_EXISTS_OFFSET = CALL_CONTEXT_LENGTH + 2;
inline const uint32_t PCPI_NULLIFIER_EXISTS_OFFSET =
    PCPI_NOTE_HASH_EXISTS_OFFSET + (MAX_NOTE_HASH_READ_REQUESTS_PER_CALL * READ_REQUEST_LENGTH);

inline const uint32_t PCPI_NULLIFIER_NON_EXISTS_OFFSET =
    PCPI_NULLIFIER_EXISTS_OFFSET + (MAX_NULLIFIER_READ_REQUESTS_PER_CALL * READ_REQUEST_LENGTH);

inline const uint32_t PCPI_L1_TO_L2_MSG_READ_REQUESTS_OFFSET =
    PCPI_NULLIFIER_NON_EXISTS_OFFSET + (MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_CALL * READ_REQUEST_LENGTH);

inline const uint32_t PCPI_PUBLIC_DATA_UPDATE_OFFSET =
    PCPI_L1_TO_L2_MSG_READ_REQUESTS_OFFSET + (MAX_L1_TO_L2_MSG_READ_REQUESTS_PER_CALL * READ_REQUEST_LENGTH);

inline const uint32_t PCPI_PUBLIC_DATA_READ_OFFSET =
    PCPI_PUBLIC_DATA_UPDATE_OFFSET +
    (MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_CALL * CONTRACT_STORAGE_UPDATE_REQUEST_LENGTH);

inline const uint32_t PCPI_PUBLIC_CALLSTACK_OFFSET =
    PCPI_PUBLIC_DATA_READ_OFFSET + (MAX_PUBLIC_DATA_READS_PER_CALL * CONTRACT_STORAGE_READ_LENGTH);

inline const uint32_t PCPI_NEW_NOTE_HASHES_OFFSET =
    PCPI_PUBLIC_CALLSTACK_OFFSET + MAX_PUBLIC_CALL_STACK_LENGTH_PER_CALL;

inline const uint32_t PCPI_NEW_NULLIFIERS_OFFSET =
    PCPI_NEW_NOTE_HASHES_OFFSET + (MAX_NEW_NOTE_HASHES_PER_CALL * NOTE_HASH_LENGTH);

// TODO(md): Note legnth of nullifier is 3? - it includes the note it is nullifying too
inline const uint32_t PCPI_NEW_L2_TO_L1_MSGS_OFFSET =
    PCPI_NEW_NULLIFIERS_OFFSET + (MAX_NEW_NULLIFIERS_PER_CALL * NULLIFIER_LENGTH);

inline const uint32_t PCPI_START_SIDE_EFFECT_COUNTER_OFFSET =
    PCPI_NEW_L2_TO_L1_MSGS_OFFSET + (MAX_NEW_L2_TO_L1_MSGS_PER_CALL * L2_TO_L1_MESSAGE_LENGTH);

inline const uint32_t PCPI_NEW_UNENCRYPTED_LOGS_OFFSET = PCPI_START_SIDE_EFFECT_COUNTER_OFFSET + /*1 item gap*/ 1;

// END INDEXES in the PUBLIC_CIRCUIT_PUBLIC_INPUTS

// L2 and Da gas left are the 3rd last and 2nd last items in the context kernel inputs respectively
inline const std::size_t DA_GAS_LEFT_CONTEXT_INPUTS_OFFSET = KERNEL_INPUTS_LENGTH - 3;
inline const std::size_t L2_GAS_LEFT_CONTEXT_INPUTS_OFFSET = KERNEL_INPUTS_LENGTH - 2;
