import { createDebugLogger } from '../../log/logger.js';


/**
 * A number generator which is used as a source of randomness in the system. If the SEED env variable is set, the
 * generator will be deterministic and will always produce the same sequence of numbers. Otherwise a true randomness
 * sourced by crypto library will be used.
 * @remarks This class was implemented so that tests can be run deterministically.
 *
 * TODO(#3949): Ensure this is never used if a PRODUCTION flag is set (before mainnet).
 */
export class RandomnessSingleton {
  private static instance: RandomnessSingleton;

  private rngStates = new Map<string, number>()

  private constructor(
    public readonly seed?: number,
    private readonly log = createDebugLogger('aztec:randomness_singleton'),
  ) {
    if (seed !== undefined) {
      this.log.verbose(`Using pseudo-randomness with seed: ${seed}`);
    } else {
      this.log.verbose('Using true randomness');
    }
  }

  public static getInstance(): RandomnessSingleton {
    if (!RandomnessSingleton.instance) {
      const seed = process.env.SEED ? Number(process.env.SEED) : undefined;
      RandomnessSingleton.instance = new RandomnessSingleton(seed);
    }

    return RandomnessSingleton.instance;
  }

  /**
   * Indicates whether the generator is deterministic (was seeded) or not.
   * @returns Whether the generator is deterministic.
   */
  public isDeterministic(): boolean {
    return this.seed !== undefined;
  }

  public getBytes(length: number, randomnessGroup?: string): Buffer {
    if (this.seed === undefined) {
      // Note: It would be more natural to just have the contents of randomBytes(...) function from
      // yarn-project/foundation/src/crypto/random/index.ts here but that would result in a larger
      // refactor so I think prohibiting use of this func when the seed is undefined is and handling
      // the singleton within randomBytes func is fine.
      throw new Error('RandomnessSingleton is not implemented for non-deterministic mode');
    }
    let state = this.seed;
    if (randomnessGroup && this.rngStates.has(randomnessGroup)) {
      state = this.rngStates.get(randomnessGroup)!;
    }
    const result = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      // Each byte of the buffer is set to a 1 byte of this.counter's value. 0xff is 255 in decimal and it's used as
      // a mask to get the last 8 bits of the counter.
      result[i] = state & 0xff;
    }
    if (randomnessGroup && this.rngStates.has(randomnessGroup)) {
      this.rngStates.set(randomnessGroup, state + 1)!;
    }
    return result;
  }
}