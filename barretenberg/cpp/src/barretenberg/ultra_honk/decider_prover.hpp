#pragma once
#include <algorithm>
#include <array>
#include <memory>
#include <tuple>
#include <utility>
#include <vector>

#include "barretenberg/commitment_schemes/zeromorph/zeromorph.hpp"
#include "barretenberg/common/compiler_hints.hpp"
#include "barretenberg/common/ref_array.hpp"
#include "barretenberg/ecc/fields/field_impl.hpp"
#include "barretenberg/ecc/fields/field_impl_generic.hpp"
#include "barretenberg/ecc/fields/field_impl_x64.hpp"
#include "barretenberg/ecc/groups/affine_element_impl.hpp"
#include "barretenberg/flavor/flavor.hpp"
#include "barretenberg/honk/proof_system/types/proof.hpp"
#include "barretenberg/relations/relation_parameters.hpp"
#include "barretenberg/stdlib_circuit_builders/mega_flavor.hpp"
#include "barretenberg/stdlib_circuit_builders/ultra_flavor.hpp"
#include "barretenberg/sumcheck/instance/prover_instance.hpp"
#include "barretenberg/sumcheck/sumcheck_output.hpp"
#include "barretenberg/transcript/transcript.hpp"

namespace bb {

template <IsUltraFlavor Flavor> class DeciderProver_ {
    using FF = typename Flavor::FF;
    using Commitment = typename Flavor::Commitment;
    using CommitmentKey = typename Flavor::CommitmentKey;
    using ProvingKey = typename Flavor::ProvingKey;
    using Polynomial = typename Flavor::Polynomial;
    using ProverPolynomials = typename Flavor::ProverPolynomials;
    using CommitmentLabels = typename Flavor::CommitmentLabels;
    using PCS = typename Flavor::PCS;
    using Instance = ProverInstance_<Flavor>;
    using Transcript = typename Flavor::Transcript;
    using RelationSeparator = typename Flavor::RelationSeparator;

  public:
    explicit DeciderProver_(const std::shared_ptr<Instance>&,
                            const std::shared_ptr<Transcript>& transcript = std::make_shared<Transcript>());

    BB_PROFILE void execute_relation_check_rounds();
    BB_PROFILE void execute_zeromorph_rounds();

    HonkProof export_proof();
    HonkProof construct_proof();

    std::shared_ptr<Instance> accumulator;

    std::shared_ptr<Transcript> transcript;

    bb::RelationParameters<FF> relation_parameters;

    CommitmentLabels commitment_labels;

    Polynomial quotient_W;

    SumcheckOutput<Flavor> sumcheck_output;

    std::shared_ptr<CommitmentKey> commitment_key;

    using ZeroMorph = ZeroMorphProver_<PCS>;

  private:
    HonkProof proof;
};

using UltraDeciderProver = DeciderProver_<UltraFlavor>;
using MegaDeciderProver = DeciderProver_<MegaFlavor>;

} // namespace bb
