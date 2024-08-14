import { WitnessMap } from '@noir-lang/types';

export function flattenFieldsAsArray(fields: string[]): Uint8Array {
  const flattenedPublicInputs = fields.map(hexToUint8Array);
  return flattenUint8Arrays(flattenedPublicInputs);
}

export function deflattenFields(flattenedFields: Uint8Array): string[] {
  const publicInputSize = 32;
  const chunkedFlattenedPublicInputs: Uint8Array[] = [];

  for (let i = 0; i < flattenedFields.length; i += publicInputSize) {
    const publicInput = flattenedFields.slice(i, i + publicInputSize);
    chunkedFlattenedPublicInputs.push(publicInput);
  }

  return chunkedFlattenedPublicInputs.map(uint8ArrayToHex);
}

export function witnessMapToPublicInputs(publicInputs: WitnessMap): string[] {
  const publicInputIndices = [...publicInputs.keys()].sort((a, b) => a - b);
  const flattenedPublicInputs = publicInputIndices.map((index) => publicInputs.get(index) as string);
  return flattenedPublicInputs;
}

function flattenUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, val) => acc + val.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function uint8ArrayToHex(buffer: Uint8Array): string {
  const hex: string[] = [];

  buffer.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });

  return '0x' + hex.join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const sanitised_hex = BigInt(hex).toString(16).padStart(64, '0');

  const len = sanitised_hex.length / 2;
  const u8 = new Uint8Array(len);

  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(sanitised_hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}
