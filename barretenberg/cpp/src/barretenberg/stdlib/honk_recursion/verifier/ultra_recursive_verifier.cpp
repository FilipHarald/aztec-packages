#include "barretenberg/stdlib/honk_recursion/verifier/ultra_recursive_verifier.hpp"
#include "barretenberg/commitment_schemes/gemini/gemini.hpp"
#include "barretenberg/commitment_schemes/shplonk/shplonk.hpp"
#include "barretenberg/commitment_schemes/zeromorph/zeromorph.hpp"
#include "barretenberg/numeric/bitop/get_msb.hpp"
#include "barretenberg/plonk_honk_shared/library/grand_product_delta.hpp"
#include "barretenberg/transcript/transcript.hpp"

namespace bb::stdlib::recursion::honk {

template <typename Flavor>
UltraRecursiveVerifier_<Flavor>::UltraRecursiveVerifier_(
    Builder* builder, const std::shared_ptr<NativeVerificationKey>& native_verifier_key)
    : key(std::make_shared<VerificationKey>(builder, native_verifier_key))
    , builder(builder)
{}

template <typename Flavor>
UltraRecursiveVerifier_<Flavor>::UltraRecursiveVerifier_(Builder* builder, const std::shared_ptr<VerificationKey>& vkey)
    : key(vkey)
    , builder(builder)
{}

/**
 * @brief This function constructs a recursive verifier circuit for a native Ultra Honk proof of a given flavor.
 *
 */
template <typename Flavor>
std::array<typename Flavor::GroupElement, 2> UltraRecursiveVerifier_<Flavor>::verify_proof(const HonkProof& proof)
{
    StdlibProof<Builder> stdlib_proof = bb::convert_proof_to_witness(builder, proof);
    return verify_proof(stdlib_proof);
}

/**
 * @brief This function constructs a recursive verifier circuit for a native Ultra Honk proof of a given flavor.
 *
 */
template <typename Flavor>
std::array<typename Flavor::GroupElement, 2> UltraRecursiveVerifier_<Flavor>::verify_proof(
    const StdlibProof<Builder>& proof)
{
    using Sumcheck = ::bb::SumcheckVerifier<Flavor>;
    using PCS = typename Flavor::PCS;
    using Shplonk = ShplonkVerifier_<Curve>;
    using Gemini = GeminiVerifier_<Curve>;
    // using ZeroMorph = ::bb::ZeroMorphVerifier_<Curve>;
    using VerifierCommitments = typename Flavor::VerifierCommitments;
    using CommitmentLabels = typename Flavor::CommitmentLabels;
    using RelationParams = ::bb::RelationParameters<FF>;
    using Transcript = typename Flavor::Transcript;
    using GroupElement = typename Flavor::GroupElement;

    transcript = std::make_shared<Transcript>(proof);

    RelationParams relation_parameters;
    VerifierCommitments commitments{ key };
    CommitmentLabels commitment_labels;

    FF circuit_size = transcript->template receive_from_prover<FF>("circuit_size");
    transcript->template receive_from_prover<FF>("public_input_size");
    transcript->template receive_from_prover<FF>("pub_inputs_offset");

    // TODO(https://github.com/AztecProtocol/barretenberg/issues/1032): Uncomment these once it doesn't cause issues
    // with the flows
    // ASSERT(static_cast<uint32_t>(circuit_size.get_value()) == key->circuit_size);
    // ASSERT(static_cast<uint32_t>(public_input_size.get_value()) == key->num_public_inputs);
    // ASSERT(static_cast<uint32_t>(pub_inputs_offset.get_value()) == key->pub_inputs_offset);

    std::vector<FF> public_inputs;
    for (size_t i = 0; i < key->num_public_inputs; ++i) {
        public_inputs.emplace_back(transcript->template receive_from_prover<FF>("public_input_" + std::to_string(i)));
    }

    // Get commitments to first three wire polynomials
    commitments.w_l = transcript->template receive_from_prover<Commitment>(commitment_labels.w_l);
    commitments.w_r = transcript->template receive_from_prover<Commitment>(commitment_labels.w_r);
    commitments.w_o = transcript->template receive_from_prover<Commitment>(commitment_labels.w_o);

    // If Goblin, get commitments to ECC op wire polynomials and DataBus columns
    if constexpr (IsGoblinFlavor<Flavor>) {
        // Receive ECC op wire commitments
        for (auto [commitment, label] :
             zip_view(commitments.get_ecc_op_wires(), commitment_labels.get_ecc_op_wires())) {
            commitment = transcript->template receive_from_prover<Commitment>(label);
        }

        // Receive DataBus related polynomial commitments
        for (auto [commitment, label] :
             zip_view(commitments.get_databus_entities(), commitment_labels.get_databus_entities())) {
            commitment = transcript->template receive_from_prover<Commitment>(label);
        }
    }

    // Get eta challenges; used in RAM/ROM memory records and log derivative lookup argument
    auto [eta, eta_two, eta_three] = transcript->template get_challenges<FF>("eta", "eta_two", "eta_three");
    relation_parameters.eta = eta;
    relation_parameters.eta_two = eta_two;
    relation_parameters.eta_three = eta_three;

    // Get commitments to lookup argument polynomials and fourth wire
    commitments.lookup_read_counts =
        transcript->template receive_from_prover<Commitment>(commitment_labels.lookup_read_counts);
    commitments.lookup_read_tags =
        transcript->template receive_from_prover<Commitment>(commitment_labels.lookup_read_tags);
    commitments.w_4 = transcript->template receive_from_prover<Commitment>(commitment_labels.w_4);

    // Get permutation challenges
    auto [beta, gamma] = transcript->template get_challenges<FF>("beta", "gamma");

    commitments.lookup_inverses =
        transcript->template receive_from_prover<Commitment>(commitment_labels.lookup_inverses);

    // If Goblin (i.e. using DataBus) receive commitments to log-deriv inverses polynomials
    if constexpr (IsGoblinFlavor<Flavor>) {
        for (auto [commitment, label] :
             zip_view(commitments.get_databus_inverses(), commitment_labels.get_databus_inverses())) {
            commitment = transcript->template receive_from_prover<Commitment>(label);
        }
    }

    const FF public_input_delta = compute_public_input_delta<Flavor>(
        public_inputs, beta, gamma, circuit_size, static_cast<uint32_t>(key->pub_inputs_offset));

    relation_parameters.beta = beta;
    relation_parameters.gamma = gamma;
    relation_parameters.public_input_delta = public_input_delta;

    // Get commitment to permutation and lookup grand products
    commitments.z_perm = transcript->template receive_from_prover<Commitment>(commitment_labels.z_perm);

    // Execute Sumcheck Verifier and extract multivariate opening point u = (u_0, ..., u_{d-1}) and purported
    // multivariate evaluations at u
    const size_t log_circuit_size = numeric::get_msb(static_cast<uint32_t>(key->circuit_size));
    auto sumcheck = Sumcheck(log_circuit_size, transcript);
    RelationSeparator alpha;
    for (size_t idx = 0; idx < alpha.size(); idx++) {
        alpha[idx] = transcript->template get_challenge<FF>("alpha_" + std::to_string(idx));
    }

    // TODO(https://github.com/AztecProtocol/barretenberg/issues/1041): Once hashing produces constraints for Ultra in
    // the transcript, a fixed number of gate_challenges must be generated by the prover/verifier in order to achieve a
    // verification circuit that is independent of proof size.
    auto gate_challenges = std::vector<FF>(log_circuit_size);
    for (size_t idx = 0; idx < log_circuit_size; idx++) {
        gate_challenges[idx] = transcript->template get_challenge<FF>("Sumcheck:gate_challenge_" + std::to_string(idx));
    }
    auto [multivariate_challenge, claimed_evaluations, sumcheck_verified] =
        sumcheck.verify(relation_parameters, alpha, gate_challenges);
    size_t prev_num_gates;
    prev_num_gates = builder->num_gates;
    // Compute powers of batching challenge rho
    FF rho = transcript->template get_challenge<FF>("rho");
    std::vector<FF> rhos = gemini::powers_of_rho(rho, Flavor::NUM_ALL_ENTITIES);

    // Compute batched multivariate evaluation
    FF batched_evaluation = FF(0);
    size_t evaluation_idx = 0;
    for (auto& value : claimed_evaluations.get_all()) {
        batched_evaluation += value * rhos[evaluation_idx];
        ++evaluation_idx;
    }

    // Compute batched commitments needed for input to Gemini.
    // Note: For efficiency in emulating the construction of the batched commitments, we want to perform a batch mul
    // rather than naively accumulate the points one by one. To do this, we collect the points and scalars required for
    // each MSM then perform the two batch muls.
    const size_t NUM_UNSHIFTED = commitments.get_unshifted().size();
    const size_t NUM_TO_BE_SHIFTED = commitments.get_to_be_shifted().size();

    std::vector<FF> scalars_unshifted;
    std::vector<FF> scalars_to_be_shifted;
    size_t idx = 0;
    for (size_t i = 0; i < NUM_UNSHIFTED; ++i) {
        scalars_unshifted.emplace_back(rhos[idx++]);
    }
    for (size_t i = 0; i < NUM_TO_BE_SHIFTED; ++i) {
        scalars_to_be_shifted.emplace_back(rhos[idx++]);
    }

    std::vector<GroupElement> unshifted_comms;

    for (auto commitment : commitments.get_unshifted()) {
        unshifted_comms.emplace_back(commitment);
    }
    prev_num_gates = builder->num_gates;
    scalars_unshifted[0] = FF(builder, 1);
    // Batch the commitments to the unshifted and to-be-shifted polynomials using powers of rho
    auto batched_commitment_unshifted = GroupElement::batch_mul(unshifted_comms, scalars_unshifted);
    info("size batch mul = ", scalars_unshifted.size());
    info("Unshifted Batched mul: num gates = ",
         builder->num_gates - prev_num_gates,
         ", (total = ",
         builder->num_gates,
         ")");
    prev_num_gates = builder->num_gates;

    std::vector<GroupElement> shifted_comms;

    for (auto commitment : commitments.get_to_be_shifted()) {
        shifted_comms.emplace_back(commitment);
    }
    prev_num_gates = builder->num_gates;
    auto batched_commitment_to_be_shifted = GroupElement::batch_mul(shifted_comms, scalars_to_be_shifted);
    info("Shifted Batched mul: num gates = ",
         builder->num_gates - prev_num_gates,
         ", (total = ",
         builder->num_gates,
         ")");
    info("size batch mul = ", scalars_to_be_shifted.size());

    prev_num_gates = builder->num_gates;

    multivariate_challenge.resize(log_circuit_size);

    auto gemini_opening_claim = Gemini::reduce_verification(multivariate_challenge,
                                                            /*define!*/ batched_evaluation,
                                                            /*define*/ batched_commitment_unshifted,
                                                            /*define*/ batched_commitment_to_be_shifted,
                                                            transcript);

    info("Gemini: num gates = ", builder->num_gates - prev_num_gates, ", (total = ", builder->num_gates, ")");
    prev_num_gates = builder->num_gates;

    // Produce a Shplonk claim: commitment [Q] - [Q_z], evaluation zero (at random challenge z)
    auto shplonk_claim =
        Shplonk::reduce_verification(key->pcs_verification_key->get_g1_identity(), gemini_opening_claim, transcript);

    info("Shplonk: num gates = ", builder->num_gates - prev_num_gates, ", (total = ", builder->num_gates, ")");
    prev_num_gates = builder->num_gates;
    // // Verify the Shplonk claim with KZG or IPA
    auto shplonk_pairing_points = PCS::reduce_verify(shplonk_claim, transcript);
    info("KZG: num gates = ", builder->num_gates - prev_num_gates, ", (total = ", builder->num_gates, ")");

    return shplonk_pairing_points;
}

template class UltraRecursiveVerifier_<bb::UltraRecursiveFlavor_<UltraCircuitBuilder>>;
template class UltraRecursiveVerifier_<bb::UltraRecursiveFlavor_<MegaCircuitBuilder>>;
template class UltraRecursiveVerifier_<bb::MegaRecursiveFlavor_<UltraCircuitBuilder>>;
template class UltraRecursiveVerifier_<bb::MegaRecursiveFlavor_<MegaCircuitBuilder>>;
template class UltraRecursiveVerifier_<bb::UltraRecursiveFlavor_<CircuitSimulatorBN254>>;
template class UltraRecursiveVerifier_<bb::MegaRecursiveFlavor_<CircuitSimulatorBN254>>;
} // namespace bb::stdlib::recursion::honk
