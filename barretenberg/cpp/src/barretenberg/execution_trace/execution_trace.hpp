#pragma once
#include "barretenberg/flavor/flavor.hpp"
#include "barretenberg/plonk_honk_shared/composer/permutation_lib.hpp"
#include "barretenberg/srs/global_crs.hpp"

namespace bb {

template <class Flavor> class ExecutionTrace_ {
    using Builder = typename Flavor::CircuitBuilder;
    using Polynomial = typename Flavor::Polynomial;
    using FF = typename Flavor::FF;
    using TrackBlocks = typename Builder::Arithmetization::TraceBlocks;
    using Wires = std::array<std::vector<uint32_t, bb::ContainerSlabAllocator<uint32_t>>, Builder::NUM_WIRES>;
    using ProvingKey = typename Flavor::ProvingKey;

  public:
    static constexpr size_t NUM_WIRES = Builder::NUM_WIRES;

    struct TraceData {
        std::array<Polynomial, NUM_WIRES> wires;
        std::array<Polynomial, Builder::Arithmetization::NUM_SELECTORS> selectors;
        // A vector of sets (vectors) of addresses into the wire polynomials whose values are copy constrained
        std::vector<CyclicPermutation> copy_cycles;
        uint32_t ram_rom_offset = 0;    // offset of the RAM/ROM block in the execution trace
        uint32_t pub_inputs_offset = 0; // offset of the public inputs block in the execution trace

        TraceData(Builder& builder, ProvingKey& proving_key)
        {
            ZoneScopedN("TraceData construction");
            if constexpr (IsHonkFlavor<Flavor>) {
                {
                    ZoneScopedN("wires initialization");
                    // Initializate the wire and selector polynomials
                    for (auto [wire, other_wire] : zip_view(wires, proving_key.polynomials.get_wires())) {
                        wire = other_wire.share();
                    }
                }
                {
                    ZoneScopedN("selector initialization");
                    for (auto [selector, other_selector] :
                         zip_view(selectors, proving_key.polynomials.get_selectors())) {
                        selector = other_selector.share();
                    }
                }
            } else {
                {
                    ZoneScopedN("wires initialization");
                    // Initializate the wire and selector polynomials
                    for (size_t idx = 0; idx < NUM_WIRES; ++idx) {
                        wires[idx] =
                            proving_key.polynomial_store.get("w_" + std::to_string(idx + 1) + "_lagrange").share();
                    }
                }
                {
                    ZoneScopedN("selector initialization");
                    for (auto [selector, other_selector] :
                         zip_view(selectors, proving_key.polynomials.get_selectors())) {
                        selector = other_selector.share();
                    }
                }
            }
            copy_cycles.resize(builder.variables.size());
        }
    };

    /**
     * @brief Given a circuit, populate a proving key with wire polys, selector polys, and sigma/id polys
     * @note By default, this method constructs an exectution trace that is sorted by gate type. Optionally, it
     * constructs a trace that is both sorted and "structured" in the sense that each block/gate-type has a fixed amount
     * of space within the wire polynomials, regardless of how many actual constraints of each type exist. This is
     * useful primarily for folding since it guarantees that the set of relations that must be executed at each row is
     * consistent across all instances.
     *
     * @param builder
     * @param is_structured whether or not the trace is to be structured with a fixed block size
     */
    static void populate(Builder& builder, ProvingKey&, bool is_structured = false);

  private:
    /**
     * @brief Add the wire and selector polynomials from the trace data to a honk or plonk proving key
     *
     * @param trace_data
     * @param builder
     * @param proving_key
     */
    static void add_wires_and_selectors_to_proving_key(TraceData& trace_data,
                                                       Builder& builder,
                                                       typename Flavor::ProvingKey& proving_key);

    /**
     * @brief Add the memory records indicating which rows correspond to RAM/ROM reads/writes
     * @details The 4th wire of RAM/ROM read/write gates is generated at proving time as a linear combination of the
     * first three wires scaled by powers of a challenge. To know on which rows to perform this calculation, we must
     * store the indices of read/write gates in the proving key. In the builder, we store the row index of these gates
     * within the block containing them. To obtain the row index in the trace at large, we simply increment these
     * indices by the offset at which that block is placed into the trace.
     *
     * @param trace_data
     * @param builder
     * @param proving_key
     */
    static void add_memory_records_to_proving_key(TraceData& trace_data,
                                                  Builder& builder,
                                                  typename Flavor::ProvingKey& proving_key)
        requires IsUltraPlonkOrHonk<Flavor>;

    /**
     * @brief Construct wire polynomials, selector polynomials and copy cycles from raw circuit data
     *
     * @param builder
     * @param dyadic_circuit_size
     * @param is_structured whether or not the trace is to be structured with a fixed block size
     * @return TraceData
     */
    static TraceData construct_trace_data(Builder& builder,
                                          typename Flavor::ProvingKey& proving_key,
                                          bool is_structured = false);

    /**
     * @brief Populate the public inputs block
     * @details The first two wires are a copy of the public inputs and the other wires and all selectors are zero
     *
     * @param builder
     */
    static void populate_public_inputs_block(Builder& builder);

    /**
     * @brief Construct and add the goblin ecc op wires to the proving key
     * @details The ecc op wires vanish everywhere except on the ecc op block, where they contain a copy of the ecc op
     * data assumed already to be present in the corrresponding block of the conventional wires in the proving key.
     *
     * @param builder
     * @param proving_key
     */
    static void add_ecc_op_wires_to_proving_key(Builder& builder, typename Flavor::ProvingKey& proving_key)
        requires IsGoblinFlavor<Flavor>;
};

} // namespace bb