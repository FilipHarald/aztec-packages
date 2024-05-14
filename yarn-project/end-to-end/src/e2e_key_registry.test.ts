import { type AccountWallet, AztecAddress, Fr, type PXE } from '@aztec/aztec.js';
import { CompleteAddress, Point, PublicKeys } from '@aztec/circuits.js';
import { KeyRegistryContract, TestContract } from '@aztec/noir-contracts.js';
import { getCanonicalKeyRegistryAddress } from '@aztec/protocol-contracts/key-registry';

import { jest } from '@jest/globals';

import { publicDeployAccounts, setup } from './fixtures/utils.js';

const TIMEOUT = 120_000;

const SHARED_MUTABLE_DELAY = 5;

describe('Key Registry', () => {
  let keyRegistry: KeyRegistryContract;

  let pxe: PXE;
  let testContract: TestContract;
  jest.setTimeout(TIMEOUT);

  let wallets: AccountWallet[];

  let teardown: () => Promise<void>;

  const account = CompleteAddress.random();

  beforeAll(async () => {
    ({ teardown, pxe, wallets } = await setup(3));
    keyRegistry = await KeyRegistryContract.at(getCanonicalKeyRegistryAddress(), wallets[0]);

    testContract = await TestContract.deploy(wallets[0]).send().deployed();

    await publicDeployAccounts(wallets[0], wallets.slice(0, 2));
  });

  const crossDelay = async () => {
    for (let i = 0; i < SHARED_MUTABLE_DELAY; i++) {
      // We send arbitrary tx to mine a block
      await testContract.methods.emit_unencrypted(0).send().wait();
    }
  };

  afterAll(() => teardown());

  describe('failure cases', () => {
    it('throws when address preimage check fails', async () => {
      const publicKeysBuf = account.publicKeys.toBuffer();
      // We randomly invalidate some of the keys by overwriting random byte
      const byteIndex = Math.floor(Math.random() * publicKeysBuf.length);
      publicKeysBuf[byteIndex] = (publicKeysBuf[byteIndex] + 2) % 256;

      const publicKeys = PublicKeys.fromBuffer(publicKeysBuf);

      await expect(
        keyRegistry
          .withWallet(wallets[0])
          .methods.register(
            account,
            account.partialAddress,
            // TODO(#6337): Directly dump account.publicKeys here
            publicKeys.toNoirStruct(),
          )
          .send()
          .wait(),
      ).rejects.toThrow('Computed address does not match supplied address');
    });

    it('should fail when we try to rotate keys for another address without authwit', async () => {
      await expect(
        keyRegistry
          .withWallet(wallets[0])
          .methods.rotate_npk_m(wallets[1].getAddress(), Point.random(), Fr.ZERO)
          .send()
          .wait(),
      ).rejects.toThrow('Assertion failed: Message not authorized by account');
    });

    it('fresh key lib fails for non-existent account', async () => {
      // Should fail as the contract is not registered in key registry

      const randomAddress = AztecAddress.random();
      const randomMasterNullifierPublicKey = Point.random();

      await expect(
        testContract.methods.test_nullifier_key_freshness(randomAddress, randomMasterNullifierPublicKey).send().wait(),
      ).rejects.toThrow(/No public key registered for address/);
    });
  });

  it('fresh key lib succeeds for non-registered account available in PXE', async () => {
    const newAccountCompleteAddress = CompleteAddress.random();
    await pxe.registerRecipient(newAccountCompleteAddress);

    // Should succeed as the account is now registered as a recipient in PXE
    await testContract.methods
      .test_nullifier_key_freshness(
        newAccountCompleteAddress.address,
        newAccountCompleteAddress.publicKeys.masterNullifierPublicKey,
      )
      .send()
      .wait();
  });

  describe('key registration flow', () => {
    it('registers', async () => {
      await keyRegistry
        .withWallet(wallets[0])
        .methods.register(
          account,
          account.partialAddress,
          // TODO(#6337): Directly dump account.publicKeys here
          account.publicKeys.toNoirStruct(),
        )
        .send()
        .wait();

      // We check if our registered nullifier key is equal to the key obtained from the getter by
      // reading our registry contract from the test contract. We expect this to fail because the change has not been applied yet
      const emptyNullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, account)
        .simulate();

      expect(new Fr(emptyNullifierPublicKeyX)).toEqual(Fr.ZERO);

      // We check it again after a delay and expect that the change has been applied and consequently the assert is true
      await crossDelay();

      const nullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, account)
        .simulate();

      expect(new Fr(nullifierPublicKeyX)).toEqual(account.publicKeys.masterNullifierPublicKey.x);
    });

    // Note: This test case is dependent on state from the previous one
    it('key lib succeeds for registered account', async () => {
      // Should succeed as the account is registered in key registry from tests before
      await testContract.methods
        .test_nullifier_key_freshness(account, account.publicKeys.masterNullifierPublicKey)
        .send()
        .wait();
    });
  });

  describe('key rotation flows', () => {
    const firstNewMasterNullifierPublicKey = Point.random();
    const secondNewMasterNullifierPublicKey = Point.random();

    it('rotates npk_m', async () => {
      await keyRegistry
        .withWallet(wallets[0])
        .methods.rotate_npk_m(wallets[0].getAddress(), firstNewMasterNullifierPublicKey, Fr.ZERO)
        .send()
        .wait();

      // We check if our rotated nullifier key is equal to the key obtained from the getter by reading our registry
      // contract from the test contract. We expect this to fail because the change has not been applied yet
      const emptyNullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, wallets[0].getAddress())
        .simulate();

      expect(new Fr(emptyNullifierPublicKeyX)).toEqual(Fr.ZERO);

      // We check it again after a delay and expect that the change has been applied and consequently the assert is true
      await crossDelay();

      const nullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, wallets[0].getAddress())
        .simulate();

      expect(new Fr(nullifierPublicKeyX)).toEqual(firstNewMasterNullifierPublicKey.x);
    });

    it(`rotates npk_m with authwit`, async () => {
      const action = keyRegistry
        .withWallet(wallets[1])
        .methods.rotate_npk_m(wallets[0].getAddress(), secondNewMasterNullifierPublicKey, Fr.ZERO);

      await wallets[0]
        .setPublicAuthWit({ caller: wallets[1].getCompleteAddress().address, action }, true)
        .send()
        .wait();

      await action.send().wait();

      // We get the old nullifier key as the change has not been applied yet
      const oldNullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, wallets[0].getAddress())
        .simulate();

      expect(new Fr(oldNullifierPublicKeyX)).toEqual(firstNewMasterNullifierPublicKey.x);

      await crossDelay();

      // We get the new nullifier key as the change has been applied
      const newNullifierPublicKeyX = await testContract.methods
        .test_shared_mutable_private_getter_for_registry_contract(1, wallets[0].getAddress())
        .simulate();

      expect(new Fr(newNullifierPublicKeyX)).toEqual(secondNewMasterNullifierPublicKey.x);
    });

    it('fresh key lib gets new key after rotation', async () => {
      // Change has been applied hence should succeed now
      await testContract.methods
        .test_nullifier_key_freshness(wallets[0].getAddress(), secondNewMasterNullifierPublicKey)
        .send()
        .wait();
    });
  });
});
