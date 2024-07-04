
#include "barretenberg/flavor/relation_definitions.hpp"
#include "barretenberg/relations/generated/avm/powers.hpp"
#include "barretenberg/stdlib/primitives/bigfield/bigfield.hpp"
#include "barretenberg/vm/recursion/avm_recursive_flavor.hpp"

namespace bb {
template class Avm_vm::powersImpl<stdlib::bigfield<UltraCircuitBuilder, bb::Bn254FqParams>>;
DEFINE_SUMCHECK_VERIFIER_RELATION_CLASS(Avm_vm::powersImpl, AvmRecursiveFlavor_<UltraCircuitBuilder>);
} // namespace bb
