// AUTOGENERATED FILE
#pragma once

#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/avm/generated/relations/lookup_u16_2.hpp"
#include "barretenberg/vm/avm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class lookup_u16_2<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(lookup_u16_2, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb
