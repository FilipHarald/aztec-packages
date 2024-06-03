#pragma once

#include "barretenberg/honk/proof_system/types/proof.hpp"
#include "barretenberg/vm/avm_trace/avm_common.hpp"
#include "barretenberg/vm/avm_trace/avm_instructions.hpp"
#include "barretenberg/vm/avm_trace/avm_trace.hpp"

#include <cstddef>
#include <cstdint>
#include <vector>

namespace bb::avm_trace {

class Execution {
  public:
    Execution() = default;

    static std::vector<FF> getDefaultPublicInputs();

    static VmPublicInputs convert_public_inputs(std::vector<FF> const& public_inputs_vec);

    // TODO: Clean these overloaded functions. We probably need less and confusing overloading.
    static std::vector<Row> gen_trace(std::vector<Instruction> const& instructions,
                                      std::vector<FF>& returndata,
                                      std::vector<FF> const& calldata,
                                      std::vector<FF> const& public_inputs);
    static std::vector<Row> gen_trace(std::vector<Instruction> const& instructions,
                                      std::vector<FF> const& calldata = {});
    static std::vector<Row> gen_trace(std::vector<Instruction> const& instructions,
                                      std::vector<FF> const& calldata,
                                      std::vector<FF> const& public_inputs);
    static std::tuple<AvmFlavor::VerificationKey, bb::HonkProof> prove(std::vector<uint8_t> const& bytecode,
                                                                       std::vector<FF> const& calldata = {});
    static bool verify(AvmFlavor::VerificationKey vk, HonkProof const& proof);
};

} // namespace bb::avm_trace
