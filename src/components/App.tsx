import { useRef, type RefObject } from "react";
import { Box, Button, Flex, Heading, HStack, Progress, Text } from "@chakra-ui/react";
import { useNeuralNetwork } from "../hooks/useNeuralNetwork";
import { useCanvasDraw } from "../hooks/useCanvasDraw";

const CanvasSection = ({ canvasRef, clear }: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  clear: VoidFunction;
}) => (
  <Flex direction="column" w="fit-content" position="relative" mt={{ base: 4, md: 0 }}>
    <Box
      ref={canvasRef}
      as="canvas"
      w="280px"
      h="280px"
      border="1px solid"
      borderColor="gray.200"
      rounded="2xl"
      style={{ touchAction: "none" }}
    />
    <HStack position="absolute" left="50%" style={{ transform: "translateX(-50%)" }} bottom={-50}>
      <Button onClick={clear} variant="outline" colorScheme="gray" rounded="2xl">
        Clear
      </Button>
    </HStack>
  </Flex>
);

const ResultsSection = ({ results }: { results: number[][] }) => (
  <Flex direction="column" w="400px" px={8} gap={{ base: 0, md: 1 }} justifyContent="flex-start">
    {results.map(([digit, probability]) => {
      const value = Math.round(probability * 100);
      return (
        <Flex key={digit} direction="row">
          <Progress.Root value={value} w="100%">
            <HStack gap="5">
              <Progress.Label>{digit}</Progress.Label>
              <Progress.Track flex="1" rounded="2xl" bg="gray.50">
                <Progress.Range rounded="2xl" />
              </Progress.Track>
              <Progress.ValueText>{value}%</Progress.ValueText>
            </HStack>
          </Progress.Root>
        </Flex>
      );
    })}
  </Flex>
)

export const App = () => {
  const { forwardPass } = useNeuralNetwork();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { imageData, clear } = useCanvasDraw(canvasRef);

  const outputLayerActivations = imageData.length ? forwardPass(imageData).aL3 : [];
  const results = outputLayerActivations.length
    ? outputLayerActivations.map((prob, i) => [i, prob]).sort(([, probA], [, probB]) => probB - probA)
    : new Array(10).fill(0).map((_, i) => [i, 0]);

  return (
    <Flex h="100svh" w="100svw" alignItems="center" justifyContent="center" p={4}>
      <Flex maxW="800px" w="full" direction="column" gap={{ base: 1, md: 4 }}>
        <Heading textAlign="center">Handwritten Digit Recognition</Heading>
        <Text fontSize={{ base: "2xs", md: "md" }} textAlign="center" color="gray.400">
          An interactive web application that uses a custom-built neural network
          (a multi-layer perceptron with softmax output trained on the MNIST dataset)
          to classify hand-drawn digits in real time.
        </Text>
        <Flex
          alignItems="center"
          justifyContent="center"
          direction={{ base: "column-reverse", md: "row" }}
          pb={16}
        >
          <CanvasSection canvasRef={canvasRef} clear={clear} />
          <ResultsSection results={results} />
        </Flex>
      </Flex>
    </Flex>
  );
};
