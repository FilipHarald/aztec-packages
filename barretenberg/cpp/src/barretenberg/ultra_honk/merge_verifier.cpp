#include "merge_verifier.hpp"

namespace bb {

template <typename Flavor>
MergeVerifier_<Flavor>::MergeVerifier_()
    : transcript(std::make_shared<Transcript>())
    , pcs_verification_key(std::make_unique<VerifierCommitmentKey>()){};

/**
 * @brief Verify proper construction of the aggregate Goblin ECC op queue polynomials T_i^(j), j = 1,2,3,4.
 * @details Let T_i^(j) be the jth column of the aggregate op queue after incorporating the contribution from the
 * present circuit. T_{i-1}^(j) corresponds to the aggregate op queue at the previous stage and $t_i^(j)$ represents
 * the contribution from the present circuit only. For each j, we have the relationship T_i = T_{i-1} + right_shift(t_i,
 * M_{i-1}), where the shift magnitude M_{i-1} is the honest length of T_{i-1}. This protocol verfies, assuming the
 * length of T_{i-1} is at most M_{i-1}, that the aggregate op queue has been constructed correctly via a simple
 * Schwartz-Zippel check. Evaluations are checked via batched KZG.
 *
 * @tparam Flavor
 * @return bool
 */
#ifdef DATAFLOW_SANITIZER
template <typename Flavor>
bool MergeVerifier_<Flavor>::verify_proof(const HonkProof& proof,
                                          size_t* maximum_index,
                                          bool enable_sanitizer,
                                          size_t separation_index)
{
    transcript = std::make_shared<Transcript>(proof, enable_sanitizer, separation_index);
#else
template <typename Flavor> bool MergeVerifier_<Flavor>::verify_proof(const HonkProof& proof)
{
    transcript = std::make_shared<Transcript>(proof);
#endif
    // Receive commitments [t_i^{shift}], [T_{i-1}], and [T_i]
    std::array<Commitment, Flavor::NUM_WIRES> C_T_prev;
    std::array<Commitment, Flavor::NUM_WIRES> C_t_shift;
    std::array<Commitment, Flavor::NUM_WIRES> C_T_current;
    for (size_t idx = 0; idx < Flavor::NUM_WIRES; ++idx) {
        C_T_prev[idx] = transcript->template receive_from_prover<Commitment>("T_PREV_" + std::to_string(idx + 1));
        C_t_shift[idx] = transcript->template receive_from_prover<Commitment>("t_SHIFT_" + std::to_string(idx + 1));
        C_T_current[idx] = transcript->template receive_from_prover<Commitment>("T_CURRENT_" + std::to_string(idx + 1));
    }

    FF kappa = transcript->template get_challenge<FF>("kappa");

    // Receive transcript poly evaluations and add corresponding univariate opening claims {(\kappa, p(\kappa), [p(X)]}
    std::array<FF, Flavor::NUM_WIRES> T_prev_evals;
    std::array<FF, Flavor::NUM_WIRES> t_shift_evals;
    std::array<FF, Flavor::NUM_WIRES> T_current_evals;
    std::vector<OpeningClaim> opening_claims;
    for (size_t idx = 0; idx < Flavor::NUM_WIRES; ++idx) {
        T_prev_evals[idx] = transcript->template receive_from_prover<FF>("T_prev_eval_" + std::to_string(idx + 1));
        opening_claims.emplace_back(OpeningClaim{ { kappa, T_prev_evals[idx] }, C_T_prev[idx] });
    }
    for (size_t idx = 0; idx < Flavor::NUM_WIRES; ++idx) {
        t_shift_evals[idx] = transcript->template receive_from_prover<FF>("t_shift_eval_" + std::to_string(idx + 1));
        opening_claims.emplace_back(OpeningClaim{ { kappa, t_shift_evals[idx] }, C_t_shift[idx] });
    }
    for (size_t idx = 0; idx < NUM_WIRES; ++idx) {
        T_current_evals[idx] =
            transcript->template receive_from_prover<FF>("T_current_eval_" + std::to_string(idx + 1));
        opening_claims.emplace_back(OpeningClaim{ { kappa, T_current_evals[idx] }, C_T_current[idx] });
    }

    // Check the identity T_i(\kappa) = T_{i-1}(\kappa) + t_i^{shift}(\kappa). If it fails, return false
    bool identity_checked = true;
    for (size_t idx = 0; idx < NUM_WIRES; ++idx) {
        identity_checked = identity_checked && (T_current_evals[idx] == T_prev_evals[idx] + t_shift_evals[idx]);
    }

    FF alpha = transcript->template get_challenge<FF>("alpha");

    // Construct batched commitment and evaluation from constituents
    auto batched_commitment = opening_claims[0].commitment;
    auto batched_eval = opening_claims[0].opening_pair.evaluation;
    auto alpha_pow = alpha;
    for (size_t idx = 1; idx < opening_claims.size(); ++idx) {
        auto& claim = opening_claims[idx];
        batched_commitment = batched_commitment + (claim.commitment * alpha_pow);
        batched_eval += alpha_pow * claim.opening_pair.evaluation;
        alpha_pow *= alpha;
    }

    OpeningClaim batched_claim = { { kappa, batched_eval }, batched_commitment };

    auto pairing_points = PCS::reduce_verify(batched_claim, transcript);
    auto verified = pcs_verification_key->pairing_check(pairing_points[0], pairing_points[1]);
#ifdef DATAFLOW_SANITIZER
    if (maximum_index != nullptr) {
        *maximum_index = transcript->current_object_set_index;
    }
#endif
    return identity_checked && verified;
}

template class MergeVerifier_<UltraFlavor>;
template class MergeVerifier_<MegaFlavor>;

} // namespace bb
