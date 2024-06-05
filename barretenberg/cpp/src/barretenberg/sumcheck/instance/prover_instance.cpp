#include "prover_instance.hpp"
#include "barretenberg/honk/proof_system/logderivative_library.hpp"
#include "barretenberg/plonk_honk_shared/composer/permutation_lib.hpp"
#include "barretenberg/stdlib_circuit_builders/ultra_circuit_builder.hpp"

namespace bb {
/**
 * @brief Helper method to compute quantities like total number of gates and dyadic circuit size
 *
 * @tparam Flavor
 * @param circuit
 */
template <class Flavor> size_t ProverInstance_<Flavor>::compute_dyadic_size(Circuit& circuit)
{
    // minimum circuit size due to lookup argument
    const size_t min_size_due_to_lookups = circuit.get_tables_size() + circuit.get_lookups_size();

    // minimum size of execution trace due to everything else
    size_t min_size_of_execution_trace = circuit.public_inputs.size() + circuit.num_gates;
    if constexpr (IsGoblinFlavor<Flavor>) {
        min_size_of_execution_trace += circuit.blocks.ecc_op.size();
    }

    // The number of gates is the maximum required by the lookup argument or everything else, plus an optional zero row
    // to allow for shifts.
    size_t num_zero_rows = Flavor::has_zero_row ? 1 : 0;
    size_t total_num_gates = num_zero_rows + std::max(min_size_due_to_lookups, min_size_of_execution_trace);

    // Next power of 2 (dyadic circuit size)
    return circuit.get_circuit_subgroup_size(total_num_gates);
}

/**
 * @brief
 * @details
 *
 * @tparam Flavor
 * @param circuit
 */
template <class Flavor>
void ProverInstance_<Flavor>::construct_databus_polynomials(Circuit& circuit)
    requires IsGoblinFlavor<Flavor>
{
    auto& public_calldata = proving_key.polynomials.calldata;
    auto& calldata_read_counts = proving_key.polynomials.calldata_read_counts;
    auto& calldata_read_tags = proving_key.polynomials.calldata_read_tags;
    auto& public_return_data = proving_key.polynomials.return_data;
    auto& return_data_read_counts = proving_key.polynomials.return_data_read_counts;

    auto calldata = circuit.get_calldata();
    auto return_data = circuit.get_return_data();

    // Note: We do not utilize a zero row for databus columns
    for (size_t idx = 0; idx < calldata.size(); ++idx) {
        public_calldata[idx] = circuit.get_variable(calldata[idx]);
        calldata_read_counts[idx] = calldata.get_read_count(idx);
    }
    for (size_t idx = 0; idx < return_data.size(); ++idx) {
        public_return_data[idx] = circuit.get_variable(return_data[idx]);
        return_data_read_counts[idx] = return_data.get_read_count(idx);
    }

    // DEBUG: The issue seems to be related to have two identical commitments. If we swet calldata_read_tags[0] = 1,
    // then its commitment is identical to [L_1]. If we set calldata_read_tags[0] = 2, there doesn't seem to be any
    // problem.
    calldata_read_tags[0] = 1; // This causes failure in Mega recursion with Ultra arith
    // calldata_read_tags[0] = 2; // This causes the tests to pass

    auto& databus_id = proving_key.polynomials.databus_id;
    // Compute a simple identity polynomial for use in the databus lookup argument
    for (size_t i = 0; i < databus_id.size(); ++i) {
        databus_id[i] = i;
    }
}

template class ProverInstance_<UltraFlavor>;
template class ProverInstance_<MegaFlavor>;

} // namespace bb
