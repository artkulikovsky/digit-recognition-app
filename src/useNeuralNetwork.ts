import parameters from "./neural-network-parameters.json";

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const softmax = (z: number[]): number[] => {
  const max = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

const sumVectors = (vectors: number[][]): number[] =>
  vectors.reduce((acc, vec) => acc.map((val, i) => val + vec[i]));

const multiplyMatrixByVector = (
  matrix: number[][],
  vector: number[]
): number[] =>
  matrix.map((row) =>
    row.reduce((acc, value, index) => acc + value * vector[index], 0)
  );

export const useNeuralNetwork = () => {
  const forwardPass = (
    aL0: number[]
  ): { aL1: number[]; aL2: number[]; aL3: number[] } => {
    const { bL1, bL2, bL3, wL1, wL2, wL3 } = parameters;

    const zL1 = sumVectors([multiplyMatrixByVector(wL1, aL0), bL1]);
    const aL1 = zL1.map(sigmoid);

    const zL2 = sumVectors([multiplyMatrixByVector(wL2, aL1), bL2]);
    const aL2 = zL2.map(sigmoid);

    const zL3 = sumVectors([multiplyMatrixByVector(wL3, aL2), bL3]);
    const aL3 = softmax(zL3);

    return { aL1, aL2, aL3 };
  };

  return { forwardPass };
};
