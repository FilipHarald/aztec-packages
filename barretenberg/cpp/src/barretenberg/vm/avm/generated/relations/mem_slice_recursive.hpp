// AUTOGENERATED FILE
#pragma once

#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/avm/generated/relations/mem_slice_recursive.hpp"
#include "barretenberg/vm/avm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class Avm_vm::mem_slice_recursiveImpl<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(Avm_vm::mem_slice_recursiveImpl, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb
