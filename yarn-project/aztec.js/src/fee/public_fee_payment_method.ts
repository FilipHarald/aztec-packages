import { type FunctionCall } from '@aztec/circuit-types';
import { type GasSettings } from '@aztec/circuits.js';
import { FunctionSelector, FunctionType } from '@aztec/foundation/abi';
import { type AztecAddress } from '@aztec/foundation/aztec-address';
import { Fr } from '@aztec/foundation/fields';

import { computeAuthWitMessageHash } from '../utils/authwit.js';
import { type AccountWallet } from '../wallet/account_wallet.js';
import { type FeePaymentMethod } from './fee_payment_method.js';

/**
 * Holds information about how the fee for a transaction is to be paid.
 */
export class PublicFeePaymentMethod implements FeePaymentMethod {
  constructor(
    /**
     * The asset used to pay the fee.
     */
    protected asset: AztecAddress,
    /**
     * Address which will hold the fee payment.
     */
    protected paymentContract: AztecAddress,

    /**
     * An auth witness provider to authorize fee payments
     */
    protected wallet: AccountWallet,
  ) {}

  /**
   * The asset used to pay the fee.
   * @returns The asset used to pay the fee.
   */
  getAsset() {
    return this.asset;
  }

  /**
   * The address which will facilitate the fee payment.
   * @returns The contract address responsible for holding the fee payment.
   */
  getPaymentContract() {
    return this.paymentContract;
  }

  /**
   * Creates a function call to pay the fee in the given asset.
   * @param gasSettings - The gas settings.
   * @returns The function call to pay the fee.
   */
  getFunctionCalls(gasSettings: GasSettings): Promise<FunctionCall[]> {
    const nonce = Fr.random();
    const maxFee = gasSettings.getFeeLimit();
    const messageHash = computeAuthWitMessageHash(
      this.paymentContract,
      this.wallet.getChainId(),
      this.wallet.getVersion(),
      {
        name: 'transfer_public',
        args: [this.wallet.getAddress(), this.paymentContract, maxFee, nonce],
        selector: FunctionSelector.fromSignature('transfer_public((Field),(Field),Field,Field)'),
        type: FunctionType.PUBLIC,
        isStatic: false,
        to: this.asset,
        returnTypes: [],
      },
    );

    return Promise.resolve([
      this.wallet.setPublicAuthWit(messageHash, true).request(),
      {
        name: 'fee_entrypoint_public',
        to: this.getPaymentContract(),
        selector: FunctionSelector.fromSignature('fee_entrypoint_public(Field,(Field),Field)'),
        type: FunctionType.PRIVATE,
        isStatic: false,
        args: [maxFee, this.asset, nonce],
        returnTypes: [],
      },
    ]);
  }
}
