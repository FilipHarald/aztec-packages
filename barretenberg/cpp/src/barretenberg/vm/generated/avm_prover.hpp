

#pragma once
#include "barretenberg/commitment_schemes/zeromorph/zeromorph.hpp"
#include "barretenberg/plonk/proof_system/types/proof.hpp"
#include "barretenberg/relations/relation_parameters.hpp"
#include "barretenberg/sumcheck/sumcheck_output.hpp"
#include "barretenberg/transcript/transcript.hpp"

#include "barretenberg/vm/generated/avm_flavor.hpp"

namespace bb {

class AvmProver {

    using Flavor = AvmFlavor;
    using FF = Flavor::FF;
    using PCS = Flavor::PCS;
    using PCSCommitmentKey = Flavor::CommitmentKey;
    using ProvingKey = Flavor::ProvingKey;
    using Polynomial = Flavor::Polynomial;
    using ProverPolynomials = Flavor::ProverPolynomials;
    using CommitmentLabels = Flavor::CommitmentLabels;
    using Transcript = Flavor::Transcript;

  public:
    explicit AvmProver(std::shared_ptr<ProvingKey> input_key, std::shared_ptr<PCSCommitmentKey> commitment_key);

    void execute_preamble_round();
    void execute_wire_commitments_round();
    void execute_log_derivative_inverse_round();
    void execute_relation_check_rounds();
    void execute_pcs_rounds();

    HonkProof export_proof();
    HonkProof construct_proof();

    std::shared_ptr<Transcript> transcript = std::make_shared<Transcript>();

    std::vector<FF> public_inputs;

    bb::RelationParameters<FF> relation_parameters;

    std::shared_ptr<ProvingKey> key;

    // Container for spans of all polynomials required by the prover (i.e. all multivariates evaluated by Sumcheck).
    ProverPolynomials prover_polynomials;

    CommitmentLabels commitment_labels;
    typename Flavor::WitnessCommitments witness_commitments;

    Polynomial quotient_W;

    SumcheckOutput<Flavor> sumcheck_output;

    std::shared_ptr<PCSCommitmentKey> commitment_key;

  private:
    HonkProof proof;
};

} // namespace bb
