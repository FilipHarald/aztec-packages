// GENERATED FILE - DO NOT EDIT, RUN yarn remake-constants in circuits.js
#pragma once
#include <cstddef>

const size_t MAX_NEW_NOTE_HASHES_PER_CALL = 16;
const size_t MAX_NEW_NULLIFIERS_PER_CALL = 16;
const size_t MAX_NEW_L2_TO_L1_MSGS_PER_CALL = 2;
const size_t MAX_PUBLIC_DATA_UPDATE_REQUESTS_PER_CALL = 32;
const size_t MAX_PUBLIC_DATA_READS_PER_CALL = 16;
const size_t MAX_NOTE_HASH_READ_REQUESTS_PER_CALL = 32;
const size_t MAX_NULLIFIER_READ_REQUESTS_PER_CALL = 32;
const size_t MAX_NULLIFIER_NON_EXISTENT_READ_REQUESTS_PER_CALL = 32;
const size_t MAX_UNENCRYPTED_LOGS_PER_CALL = 4;
const size_t GAS_FEES_LENGTH = 2;
const size_t GAS_LENGTH = 2;
const size_t CALL_CONTEXT_LENGTH = 6;
const size_t CONTENT_COMMITMENT_LENGTH = 4;
const size_t GLOBAL_VARIABLES_LENGTH = 6 + GAS_FEES_LENGTH;
const size_t APPEND_ONLY_TREE_SNAPSHOT_LENGTH = 2;
const size_t PARTIAL_STATE_REFERENCE_LENGTH = 6;
const size_t STATE_REFERENCE_LENGTH = APPEND_ONLY_TREE_SNAPSHOT_LENGTH + PARTIAL_STATE_REFERENCE_LENGTH;
const size_t TOTAL_FEES_LENGTH = 1;
const size_t HEADER_LENGTH = APPEND_ONLY_TREE_SNAPSHOT_LENGTH + CONTENT_COMMITMENT_LENGTH + STATE_REFERENCE_LENGTH +
                             GLOBAL_VARIABLES_LENGTH + TOTAL_FEES_LENGTH;
const size_t PUBLIC_CONTEXT_INPUTS_LENGTH =
    CALL_CONTEXT_LENGTH + HEADER_LENGTH + GLOBAL_VARIABLES_LENGTH + GAS_LENGTH + 2;
