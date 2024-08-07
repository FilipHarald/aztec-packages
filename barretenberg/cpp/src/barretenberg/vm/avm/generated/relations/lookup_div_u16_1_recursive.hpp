// AUTOGENERATED FILE
#pragma once

#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/avm/generated/relations/lookup_div_u16_1.hpp"
#include "barretenberg/vm/avm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class lookup_div_u16_1<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(lookup_div_u16_1, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb
