#include "barretenberg/circuit_checker/circuit_checker.hpp"
#include "barretenberg/common/test.hpp"
#include "barretenberg/stdlib/hash/blake3s/blake3s.hpp"
#include "barretenberg/stdlib/hash/pedersen/pedersen.hpp"
#include "barretenberg/stdlib/honk_recursion/verifier/ultra_recursive_verifier.hpp"
#include "barretenberg/stdlib/primitives/curves/bn254.hpp"
#include "barretenberg/stdlib_circuit_builders/ultra_recursive_flavor.hpp"
#include "barretenberg/ultra_honk/ultra_prover.hpp"
#include "barretenberg/ultra_honk/ultra_verifier.hpp"

namespace bb::stdlib::recursion::honk {

/**
 * @brief Test suite for recursive verification of  Honk proofs for both Ultra and Mega arithmetisation.
 * @details `Inner*` types describe the type of circuits (and everything else required to generate a proof) that we aim
 * to recursively verify. `Outer*` describes the arithmetisation of the recursive verifier circuit and the types
 * required to ensure the recursive verifier circuit is correct (i.e. by producing a proof and verifying it).
 *
 * @tparam RecursiveFlavor defines the recursive verifier, what the arithmetisation of its circuit should be and what
 * types of proofs it recursively verifies.
 */
template <typename RecursiveFlavor> class RecursiveVerifierTest : public testing::Test {

    // Define types for the inner circuit, i.e. the circuit whose proof will be recursively verified
    using InnerFlavor = typename RecursiveFlavor::NativeFlavor;
    using InnerProver = UltraProver_<InnerFlavor>;
    using InnerVerifier = UltraVerifier_<InnerFlavor>;
    using InnerBuilder = typename InnerFlavor::CircuitBuilder;
    using InnerProverInstance = ProverInstance_<InnerFlavor>;
    using InnerCurve = bn254<InnerBuilder>;
    using InnerCommitment = InnerFlavor::Commitment;
    using InnerFF = InnerFlavor::FF;

    // Defines types for the outer circuit, i.e. the circuit of the recursive verifier
    using OuterBuilder = typename RecursiveFlavor::CircuitBuilder;
    using OuterFlavor = std::conditional_t<IsMegaBuilder<OuterBuilder>, MegaFlavor, UltraFlavor>;
    using OuterProver = UltraProver_<OuterFlavor>;
    using OuterVerifier = UltraVerifier_<OuterFlavor>;
    using OuterProverInstance = ProverInstance_<OuterFlavor>;

    using RecursiveVerifier = UltraRecursiveVerifier_<RecursiveFlavor>;
    using VerificationKey = typename RecursiveVerifier::VerificationKey;

    /**
     * @brief Create a non-trivial arbitrary inner circuit, the proof of which will be recursively verified
     *
     * @param builder
     * @param public_inputs
     * @param log_num_gates
     */
    static InnerBuilder create_inner_circuit(size_t log_num_gates = 10)
    {
        using fr_ct = InnerCurve::ScalarField;
        using fq_ct = InnerCurve::BaseField;
        using point_ct = InnerCurve::AffineElement;
        using public_witness_ct = InnerCurve::public_witness_ct;
        using witness_ct = InnerCurve::witness_ct;
        using byte_array_ct = InnerCurve::byte_array_ct;
        using fr = typename InnerCurve::ScalarFieldNative;
        using point = typename InnerCurve::GroupNative::affine_element;

        InnerBuilder builder;

        // Create 2^log_n many add gates based on input log num gates
        const size_t num_gates = 1 << log_num_gates;
        for (size_t i = 0; i < num_gates; ++i) {
            fr a = fr::random_element();
            uint32_t a_idx = builder.add_variable(a);

            fr b = fr::random_element();
            fr c = fr::random_element();
            fr d = a + b + c;
            uint32_t b_idx = builder.add_variable(b);
            uint32_t c_idx = builder.add_variable(c);
            uint32_t d_idx = builder.add_variable(d);

            builder.create_big_add_gate({ a_idx, b_idx, c_idx, d_idx, fr(1), fr(1), fr(1), fr(-1), fr(0) });
        }

        // Perform a batch mul which will add some arbitrary goblin-style ECC op gates if the circuit arithmetic is
        // goblinisied otherwise it will add the conventional nonnative gates
        size_t num_points = 5;
        std::vector<point_ct> circuit_points;
        std::vector<fr_ct> circuit_scalars;
        for (size_t i = 0; i < num_points; ++i) {
            circuit_points.push_back(point_ct::from_witness(&builder, point::random_element()));
            circuit_scalars.push_back(fr_ct::from_witness(&builder, fr::random_element()));
        }
        point_ct::batch_mul(circuit_points, circuit_scalars);

        // Define some additional arbitrary convetional circuit logic
        fr_ct a(public_witness_ct(&builder, fr::random_element()));
        fr_ct b(public_witness_ct(&builder, fr::random_element()));
        fr_ct c(public_witness_ct(&builder, fr::random_element()));

        for (size_t i = 0; i < 32; ++i) {
            a = (a * b) + b + a;
            a = a.madd(b, c);
        }
        pedersen_hash<InnerBuilder>::hash({ a, b });
        byte_array_ct to_hash(&builder, "nonsense test data");
        blake3s(to_hash);

        fr bigfield_data = fr::random_element();
        fr bigfield_data_a{ bigfield_data.data[0], bigfield_data.data[1], 0, 0 };
        fr bigfield_data_b{ bigfield_data.data[2], bigfield_data.data[3], 0, 0 };

        fq_ct big_a(fr_ct(witness_ct(&builder, bigfield_data_a.to_montgomery_form())), fr_ct(witness_ct(&builder, 0)));
        fq_ct big_b(fr_ct(witness_ct(&builder, bigfield_data_b.to_montgomery_form())), fr_ct(witness_ct(&builder, 0)));

        big_a* big_b;

        return builder;
    };

  public:
    static void SetUpTestSuite() { bb::srs::init_crs_factory("../srs_db/ignition"); }

    /**
     * @brief Create inner circuit and call check_circuit on it
     *
     */
    static void test_inner_circuit()
    {
        auto inner_circuit = create_inner_circuit();

        bool result = CircuitChecker::check(inner_circuit);

        EXPECT_EQ(result, true);
    }

    /**
     * @brief Instantiate a recursive verification key from the native verification key produced by the inner cicuit
     * builder. Check consistency beteen the native and stdlib types.
     *
     */
    static void test_recursive_verification_key_creation()
    {
        // Create an arbitrary inner circuit
        auto inner_circuit = create_inner_circuit();
        OuterBuilder outer_circuit;

        // Compute native verification key
        auto instance = std::make_shared<InnerProverInstance>(inner_circuit);
        InnerProver prover(instance); // A prerequisite for computing VK
        auto verification_key = std::make_shared<typename InnerFlavor::VerificationKey>(instance->proving_key);
        // Instantiate the recursive verifier using the native verification key
        RecursiveVerifier verifier{ &outer_circuit, verification_key };

        // Spot check some values in the recursive VK to ensure it was constructed correctly
        EXPECT_EQ(verifier.key->circuit_size, verification_key->circuit_size);
        EXPECT_EQ(verifier.key->log_circuit_size, verification_key->log_circuit_size);
        EXPECT_EQ(verifier.key->num_public_inputs, verification_key->num_public_inputs);
        for (auto [vk_poly, native_vk_poly] : zip_view(verifier.key->get_all(), verification_key->get_all())) {
            EXPECT_EQ(vk_poly.get_value(), native_vk_poly);
        }
    }

    static void test_independent_vk_hash()
    {
        const auto get_polys = [](const size_t inner_size) { // Create an arbitrary inner circuit
            auto inner_circuit = create_inner_circuit(inner_size);

            // Generate a proof over the inner circuit
            auto instance = std::make_shared<InnerProverInstance>(inner_circuit);
            InnerProver inner_prover(instance);
            auto verification_key = std::make_shared<typename InnerFlavor::VerificationKey>(instance->proving_key);
            auto inner_proof = inner_prover.construct_proof();

            // Create a recursive verification circuit for the proof of the inner circuit
            OuterBuilder outer_circuit;
            RecursiveVerifier verifier{ &outer_circuit, verification_key };
            [[maybe_unused]] auto pairing_points = verifier.verify_proof(inner_proof);

            auto outer_instance = std::make_shared<OuterProverInstance>(outer_circuit);
            return std::move(outer_instance->proving_key.polynomials);
        };

        bool broke(false);
        const auto check_eq = [&broke](const auto& p1, const auto& p2) {
            for (size_t idx = 0; idx < p1.size(); idx++) {
                if (p1[idx] != p2[idx]) {
                    broke = true;
                    info("discrepancy at index: ", idx);
                    break;
                }
            }
        };

        const auto polys_10 = get_polys(10);
        const auto polys_11 = get_polys(11);
        std::vector<std::string> precomputed{ "q_c",      "q_l",     "q_r",           "q_o",        "q_4",
                                              "q_m",      "q_arith", "q_delta_range", "q_elliptic", "q_aux",
                                              "q_lookup", "sigma_1", "sigma_2",       "sigma_3",    "sigma_4",
                                              "id_1",     "id_2",    "id_3",          "id_4",       "table_1",
                                              "table_2",  "table_3", "table_4" };
        for (auto [label, q_10, q_11] : zip_view(polys_10.get_labels(), polys_10.get_all(), polys_11.get_all())) {
            if (std::find(precomputed.begin(), precomputed.end(), label) != precomputed.end()) {
                info("checking ", label);
                check_eq(q_10, q_11);
            }
        }

        EXPECT_FALSE(broke);
        // EXPECT_EQ(vk_10->hash(), vk_11->hash());

        // const auto get_vk = [](const size_t inner_size) { // Create an arbitrary inner circuit
        //     auto inner_circuit = create_inner_circuit(inner_size);

        //     // Generate a proof over the inner circuit
        //     auto instance = std::make_shared<InnerProverInstance>(inner_circuit);
        //     InnerProver inner_prover(instance);
        //     auto verification_key = std::make_shared<typename InnerFlavor::VerificationKey>(instance->proving_key);
        //     auto inner_proof = inner_prover.construct_proof();

        //     // Create a recursive verification circuit for the proof of the inner circuit
        //     OuterBuilder outer_circuit;
        //     RecursiveVerifier verifier{ &outer_circuit, verification_key };
        //     [[maybe_unused]] auto pairing_points = verifier.verify_proof(inner_proof);

        //     auto outer_instance = std::make_shared<OuterProverInstance>(outer_circuit);
        //     // OuterProver prover(instance);
        //     auto outer_verification_key =
        //         std::make_shared<typename OuterFlavor::VerificationKey>(instance->proving_key);
        //     return outer_verification_key;
        // };
        // const auto vk_10 = get_vk(10);
        // const auto vk_11 = get_vk(11);
        // for (auto [label, q_10, q_11] : zip_view(vk_10->get_labels(), vk_10->get_all(), vk_11->get_all())) {
        //     info(label);
        //     EXPECT_EQ(q_10, q_11);
        // }
        // EXPECT_EQ(vk_10->hash(), vk_11->hash());
    }

    /**
     * @brief Construct a recursive verification circuit for the proof of an inner circuit then call check_circuit on
     * it.
     */
    static void test_recursive_verification()
    {
        // Create an arbitrary inner circuit
        auto inner_circuit = create_inner_circuit();

        // Generate a proof over the inner circuit
        auto instance = std::make_shared<InnerProverInstance>(inner_circuit);
        InnerProver inner_prover(instance);
        auto verification_key = std::make_shared<typename InnerFlavor::VerificationKey>(instance->proving_key);
        auto inner_proof = inner_prover.construct_proof();

        // Create a recursive verification circuit for the proof of the inner circuit
        OuterBuilder outer_circuit;
        RecursiveVerifier verifier{ &outer_circuit, verification_key };
        auto pairing_points = verifier.verify_proof(inner_proof);
        info("Recursive Verifier: num gates = ", outer_circuit.num_gates);

        // Check for a failure flag in the recursive verifier circuit
        EXPECT_EQ(outer_circuit.failed(), false) << outer_circuit.err();

        // Check 1: Perform native verification then perform the pairing on the outputs of the recursive
        // verifier and check that the result agrees.
        InnerVerifier native_verifier(verification_key);
        auto native_result = native_verifier.verify_proof(inner_proof);
        auto recursive_result = native_verifier.key->pcs_verification_key->pairing_check(pairing_points[0].get_value(),
                                                                                         pairing_points[1].get_value());
        EXPECT_EQ(recursive_result, native_result);

        // Check 2: Ensure that the underlying native and recursive verification algorithms agree by ensuring
        // the manifests produced by each agree.
        auto recursive_manifest = verifier.transcript->get_manifest();
        auto native_manifest = native_verifier.transcript->get_manifest();
        for (size_t i = 0; i < recursive_manifest.size(); ++i) {
            EXPECT_EQ(recursive_manifest[i], native_manifest[i]);
        }

        // Check 3: Construct and verify a proof of the recursive verifier circuit
        if constexpr (!IsSimulator<OuterBuilder>) {
            auto instance = std::make_shared<OuterProverInstance>(outer_circuit);
            OuterProver prover(instance);
            auto verification_key = std::make_shared<typename OuterFlavor::VerificationKey>(instance->proving_key);
            OuterVerifier verifier(verification_key);
            auto proof = prover.construct_proof();
            bool verified = verifier.verify_proof(proof);

            ASSERT(verified);
        }
    }

    /**
     * @brief Construct a verifier circuit for a proof whose data has been tampered with. Expect failure
     * TODO(bberg #656): For now we get a "bad" proof by arbitrarily tampering with bits in a valid proof. It would be
     * much nicer to explicitly change meaningful components, e.g. such that one of the multilinear evaluations is
     * wrong. This is difficult now but should be straightforward if the proof is a struct.
     */
    static void test_recursive_verification_fails()
    {
        // Create an arbitrary inner circuit
        auto inner_circuit = create_inner_circuit();

        // Generate a proof over the inner circuit
        auto instance = std::make_shared<InnerProverInstance>(inner_circuit);
        InnerProver inner_prover(instance);
        auto inner_proof = inner_prover.construct_proof();

        // Arbitrarily tamper with the proof to be verified
        inner_prover.transcript->deserialize_full_transcript();
        inner_prover.transcript->sorted_accum_comm = InnerCommitment::one() * InnerFF::random_element();
        inner_prover.transcript->serialize_full_transcript();
        inner_proof = inner_prover.export_proof();

        // Generate the corresponding inner verification key
        auto inner_verification_key = std::make_shared<typename InnerFlavor::VerificationKey>(instance->proving_key);

        // Create a recursive verification circuit for the proof of the inner circuit
        OuterBuilder outer_circuit;
        RecursiveVerifier verifier{ &outer_circuit, inner_verification_key };
        verifier.verify_proof(inner_proof);

        // We expect the circuit check to fail due to the bad proof
        EXPECT_FALSE(CircuitChecker::check(outer_circuit));
    }
};

// Run the recursive verifier tests with conventional Ultra builder and Goblin builder
using Flavors = testing::Types<MegaRecursiveFlavor_<MegaCircuitBuilder>,
                               MegaRecursiveFlavor_<UltraCircuitBuilder>,
                               UltraRecursiveFlavor_<UltraCircuitBuilder>,
                               UltraRecursiveFlavor_<MegaCircuitBuilder>,
                               UltraRecursiveFlavor_<CircuitSimulatorBN254>,
                               MegaRecursiveFlavor_<CircuitSimulatorBN254>>;

TYPED_TEST_SUITE(RecursiveVerifierTest, Flavors);

HEAVY_TYPED_TEST(RecursiveVerifierTest, InnerCircuit)
{
    TestFixture::test_inner_circuit();
}

HEAVY_TYPED_TEST(RecursiveVerifierTest, RecursiveVerificationKey)
{
    TestFixture::test_recursive_verification_key_creation();
}

HEAVY_TYPED_TEST(RecursiveVerifierTest, SingleRecursiveVerification)
{
    TestFixture::test_recursive_verification();
};

HEAVY_TYPED_TEST(RecursiveVerifierTest, IndependentVKHash)
{
    if constexpr (std::same_as<TypeParam, UltraRecursiveFlavor_<UltraCircuitBuilder>>) {
        TestFixture::test_independent_vk_hash();
    }
};

HEAVY_TYPED_TEST(RecursiveVerifierTest, SingleRecursiveVerificationFailure)
{
    TestFixture::test_recursive_verification_fails();
};

HEAVY_TYPED_TEST(RecursiveVerifierTest, Zeromorph)
{
    TestFixture::test_recursive_verification();
};

} // namespace bb::stdlib::recursion::honk