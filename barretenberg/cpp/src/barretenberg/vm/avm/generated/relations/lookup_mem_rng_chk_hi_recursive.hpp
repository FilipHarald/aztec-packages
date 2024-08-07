// AUTOGENERATED FILE
#pragma once

#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/avm/generated/relations/lookup_mem_rng_chk_hi.hpp"
#include "barretenberg/vm/avm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class lookup_mem_rng_chk_hi<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(lookup_mem_rng_chk_hi, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb
