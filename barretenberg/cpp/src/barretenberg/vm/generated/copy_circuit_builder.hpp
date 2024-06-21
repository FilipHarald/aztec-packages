

// AUTOGENERATED FILE
#pragma once

#include <vector>
#ifndef __wasm__
#include <future>
#endif

#include "barretenberg/common/constexpr_utils.hpp"
#include "barretenberg/common/throw_or_abort.hpp"
#include "barretenberg/ecc/curves/bn254/fr.hpp"
#include "barretenberg/honk/proof_system/logderivative_library.hpp"
#include "barretenberg/plonk_honk_shared/library/grand_product_library.hpp"
#include "barretenberg/relations/generic_lookup/generic_lookup_relation.hpp"
#include "barretenberg/relations/generic_permutation/generic_permutation_relation.hpp"
#include "barretenberg/stdlib_circuit_builders/circuit_builder_base.hpp"

#include "barretenberg/relations/generated/copy/copy.hpp"
#include "barretenberg/relations/generated/copy/copy_main.hpp"
#include "barretenberg/vm/generated/copy_flavor.hpp"

namespace bb {

template <typename FF> struct CopyFullRow {
    FF copy_lagrange_first{};
    FF copy_lagrange_last{};
    FF copy_a{};
    FF copy_b{};
    FF copy_c{};
    FF copy_d{};
    FF copy_sigma_a{};
    FF copy_sigma_b{};
    FF copy_sigma_c{};
    FF copy_sigma_d{};
    FF copy_sigma_x{};
    FF copy_sigma_y{};
    FF copy_sigma_z{};
    FF copy_x{};
    FF copy_y{};
    FF copy_z{};
    FF copy_main{};
    FF id_0{};
    FF id_1{};
    FF copy_d_shift{};
    FF copy_main_shift{};

    [[maybe_unused]] static std::vector<std::string> names();
};

template <typename FF> std::ostream& operator<<(std::ostream& os, CopyFullRow<FF> const& row);

class CopyCircuitBuilder {
  public:
    using Flavor = bb::CopyFlavor;
    using FF = Flavor::FF;
    using Row = CopyFullRow<FF>;

    // TODO: template
    using Polynomial = Flavor::Polynomial;
    using ProverPolynomials = Flavor::ProverPolynomials;

    static constexpr size_t num_fixed_columns = 21;
    static constexpr size_t num_polys = 19;
    std::vector<Row> rows;

    void set_trace(std::vector<Row>&& trace) { rows = std::move(trace); }

    ProverPolynomials compute_polynomials()
    {
        const auto num_rows = get_circuit_subgroup_size();
        ProverPolynomials polys;

        // Allocate mem for each column
        for (auto& poly : polys.get_all()) {
            poly = Polynomial(num_rows);
        }

        for (size_t i = 0; i < rows.size(); i++) {
            polys.copy_lagrange_first[i] = rows[i].copy_lagrange_first;
            polys.copy_lagrange_last[i] = rows[i].copy_lagrange_last;
            polys.copy_a[i] = rows[i].copy_a;
            polys.copy_b[i] = rows[i].copy_b;
            polys.copy_c[i] = rows[i].copy_c;
            polys.copy_d[i] = rows[i].copy_d;
            polys.copy_sigma_a[i] = rows[i].copy_sigma_a;
            polys.copy_sigma_b[i] = rows[i].copy_sigma_b;
            polys.copy_sigma_c[i] = rows[i].copy_sigma_c;
            polys.copy_sigma_d[i] = rows[i].copy_sigma_d;
            polys.copy_sigma_x[i] = rows[i].copy_sigma_x;
            polys.copy_sigma_y[i] = rows[i].copy_sigma_y;
            polys.copy_sigma_z[i] = rows[i].copy_sigma_z;
            polys.copy_x[i] = rows[i].copy_x;
            polys.copy_y[i] = rows[i].copy_y;
            polys.copy_z[i] = rows[i].copy_z;
            polys.copy_main[i] = rows[i].copy_main;
            polys.id_0[i] = rows[i].id_0;
            polys.id_1[i] = rows[i].id_1;
        }

        polys.copy_d_shift = static_cast<Polynomial>(polys.copy_d.shifted());
        polys.copy_main_shift = static_cast<Polynomial>(polys.copy_main.shifted());

        return polys;
    }

    [[maybe_unused]] bool check_circuit()
    {

        const FF gamma = FF(1);
        const FF beta = FF(1);
        bb::RelationParameters<typename Flavor::FF> params{
            .eta = 0,
            .beta = beta,
            .gamma = gamma,
            .public_input_delta = 0,
            .lookup_grand_product_delta = 0,
            .beta_sqr = 0,
            .beta_cube = 0,
            .eccvm_set_permutation_delta = 0,
        };

        auto polys = compute_polynomials();
        const size_t num_rows = polys.get_polynomial_size();

        const auto evaluate_relation = [&]<typename Relation>(const std::string& relation_name,
                                                              std::string (*debug_label)(int)) {
            typename Relation::SumcheckArrayOfValuesOverSubrelations result;
            for (auto& r : result) {
                r = 0;
            }
            constexpr size_t NUM_SUBRELATIONS = result.size();

            for (size_t i = 0; i < num_rows; ++i) {
                Relation::accumulate(result, polys.get_row(i), {}, 1);

                bool x = true;
                for (size_t j = 0; j < NUM_SUBRELATIONS; ++j) {
                    if (result[j] != 0) {
                        std::string row_name = debug_label(static_cast<int>(j));
                        throw_or_abort(
                            format("Relation ", relation_name, ", subrelation index ", row_name, " failed at row ", i));
                        x = false;
                    }
                }
                if (!x) {
                    return false;
                }
            }
            return true;
        };

        const auto evaluate_grand_product = [&]<typename GrandProductSettings>(const std::string& grand_product_name) {
            bb::compute_grand_product<Flavor, GrandProductSettings>(polys, params);

            polys.copy_main_shift = static_cast<Polynomial>(polys.copy_main.shifted());

            typename GrandProductSettings::SumcheckArrayOfValuesOverSubrelations grand_product_result;

            for (auto& r : grand_product_result) {
                r = 0;
            }
            for (size_t i = 0; i < num_rows; ++i) {
                GrandProductSettings::accumulate(grand_product_result, polys.get_row(i), params, 1);
            }
            size_t i = 0;
            for (auto r : grand_product_result) {
                if (r != 0) {
                    throw_or_abort(format("Copy ", grand_product_name, " failed.", " Subrelation ", i));
                    return false;
                }
                i++;
            }
            return true;
        };

        auto copy = [&]() {
            return evaluate_relation.template operator()<Copy_vm::copy<FF>>("copy", Copy_vm::get_relation_label_copy);
        };

        // copy_main_relation<FF>::COPY_SET_POLYNOMIAL_INDEX;
        // copy_main_relation<FF>::SIGMA_SET_POLYNOMIAL_INDEX;
        // copy_main_relation<FF>::IDENTITY_SET_POLYNOMIAL_INDEX;

        auto copy_main = [&]() {
            return evaluate_grand_product.template operator()<copy_main_relation<FF>>("COPY_MAIN");
        };

#ifndef __wasm__

        // Evaluate check circuit closures as futures
        std::vector<std::future<bool>> relation_futures;

        relation_futures.emplace_back(std::async(std::launch::async, copy));

        relation_futures.emplace_back(std::async(std::launch::async, copy_main));

        // Wait for lookup evaluations to complete
        for (auto& future : relation_futures) {
            int result = future.get();
            if (!result) {
                return false;
            }
        }
#else

        copy();

        copy_main();

#endif

        return true;
    }

    [[nodiscard]] size_t get_num_gates() const { return rows.size(); }

    [[nodiscard]] size_t get_circuit_subgroup_size() const
    {
        const size_t num_rows = get_num_gates();
        const auto num_rows_log2 = static_cast<size_t>(numeric::get_msb64(num_rows));
        size_t num_rows_pow2 = 1UL << (num_rows_log2 + (1UL << num_rows_log2 == num_rows ? 0 : 1));
        return num_rows_pow2;
    }
};
} // namespace bb
