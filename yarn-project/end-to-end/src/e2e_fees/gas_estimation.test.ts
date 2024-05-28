import {
  type AccountWallet,
  type AztecAddress,
  type FeePaymentMethod,
  NativeFeePaymentMethod,
  PublicFeePaymentMethod,
} from '@aztec/aztec.js';
import { GasFees, type GasSettings } from '@aztec/circuits.js';
import { type TokenContract as BananaCoin, type FPCContract } from '@aztec/noir-contracts.js';

import { FeesTest } from './fees_test.js';

describe('e2e_fees gas_estimation', () => {
  let aliceWallet: AccountWallet;
  let aliceAddress: AztecAddress;
  let bobAddress: AztecAddress;
  let bananaCoin: BananaCoin;
  let bananaFPC: FPCContract;
  let gasSettings: GasSettings;
  let teardownFixedFee: bigint;

  const t = new FeesTest('gas_estimation');

  beforeAll(async () => {
    await t.applyBaseSnapshots();
    await t.applyFPCSetupSnapshot();
    await t.applyFundAliceWithBananas();
    await t.applyFundAliceWithGasToken();
    ({ aliceWallet, aliceAddress, bobAddress, bananaCoin, bananaFPC, gasSettings } = await t.setup());

    teardownFixedFee = gasSettings.teardownGasLimits.computeFee(GasFees.default()).toBigInt();
  });

  afterAll(async () => {
    await t.teardown();
  });

  const makeTransferRequest = () => bananaCoin.methods.transfer_public(aliceAddress, bobAddress, 1n, 0n);

  // Sends two tx with transfers of public tokens: one with estimateGas on, one with estimateGas off
  const sendTransfers = (paymentMethod: FeePaymentMethod) =>
    Promise.all(
      [true, false].map(estimateGas =>
        makeTransferRequest().send({ estimateGas, fee: { gasSettings, paymentMethod } }).wait(),
      ),
    );

  const getFeeFromEstimatedGas = (estimatedGas: Pick<GasSettings, 'gasLimits' | 'teardownGasLimits'>) =>
    gasSettings.inclusionFee
      .add(estimatedGas.gasLimits.computeFee(GasFees.default()))
      .add(estimatedGas.teardownGasLimits.computeFee(GasFees.default()))
      .toBigInt();

  it('estimates gas with native fee payment method', async () => {
    const paymentMethod = new NativeFeePaymentMethod(aliceAddress);
    const estimatedGas = await makeTransferRequest().estimateGas({ fee: { gasSettings, paymentMethod } });
    const [withEstimate, withoutEstimate] = await sendTransfers(paymentMethod);
    const actualFee = withEstimate.transactionFee!;

    // Estimation should yield that teardown has no cost, so should send the tx with zero for teardown
    expect(actualFee + teardownFixedFee).toEqual(withoutEstimate.transactionFee!);

    // Check that estimated gas for teardown are zero
    expect(estimatedGas.teardownGasLimits.l2Gas).toEqual(0);
    expect(estimatedGas.teardownGasLimits.daGas).toEqual(0);

    // Check that the estimate was close to the actual gas used by recomputing the tx fee from it
    const feeFromEstimatedGas = getFeeFromEstimatedGas(estimatedGas);

    // The actual fee should be under the estimate, but not too much
    expect(feeFromEstimatedGas).toBeLessThan(actualFee * 2n);
    expect(feeFromEstimatedGas).toBeGreaterThanOrEqual(actualFee);
  });

  it('estimates gas with public payment method', async () => {
    const paymentMethod = new PublicFeePaymentMethod(bananaCoin.address, bananaFPC.address, aliceWallet);
    const estimatedGas = await makeTransferRequest().estimateGas({ fee: { gasSettings, paymentMethod } });
    const [withEstimate, withoutEstimate] = await sendTransfers(paymentMethod);
    const actualFee = withEstimate.transactionFee!;

    // Estimation should yield that teardown has reduced cost, but is not zero
    expect(withEstimate.transactionFee!).toBeLessThan(withoutEstimate.transactionFee!);
    expect(withEstimate.transactionFee! + teardownFixedFee).toBeGreaterThan(withoutEstimate.transactionFee!);

    // Check that estimated gas for teardown are not zero since we're doing work there
    expect(estimatedGas.teardownGasLimits.l2Gas).toBeGreaterThan(0);

    // Check that the estimate was close to the actual gas used by recomputing the tx fee from it
    const feeFromEstimatedGas = getFeeFromEstimatedGas(estimatedGas);

    // The actual fee should be under the estimate, but not too much
    // TODO(palla/gas): 3x is too much, find out why we cannot bring this down to 2x
    expect(feeFromEstimatedGas).toBeLessThan(actualFee * 3n);
    expect(feeFromEstimatedGas).toBeGreaterThanOrEqual(actualFee);
  });
});
