// AUTOGENERATED FILE
#pragma once

#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/avm/generated/relations/perm_main_mem_c.hpp"
#include "barretenberg/vm/avm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class perm_main_mem_c<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(perm_main_mem_c, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb