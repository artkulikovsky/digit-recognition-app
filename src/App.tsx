import { useRef, type RefObject } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Progress,
  Text,
} from "@chakra-ui/react";
import { useCanvasDraw } from "./useCanvasDraw";
import { useNeuralNetwork } from "./useNeuralNetwork";

export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { forwardPass } = useNeuralNetwork();
  const { imageData, clear } = useCanvasDraw(
    canvasRef as RefObject<HTMLCanvasElement>
  );

  const outputLayer = imageData.length ? forwardPass(imageData).aL3 : [];
  const sortedResults = outputLayer.length
    ? Object.entries(outputLayer).sort((a, b) => b[1] - a[1])
    : new Array(10).fill(0).map((_, i) => [i, 0]);

  return (
    <Flex h="100svh" w="100svw" alignItems="center" justifyContent="center" p={4}>
      <Flex maxW="800px" direction="column" gap={4}>
        <Heading textAlign="center">Handwritten Digit Recognition</Heading>
        <Text fontSize="s" textAlign="center" color="gray.400">
          An interactive web application that uses a custom-built neural network
          to classify hand-drawn digits in real time. The used neural network is
          a multi-layer perceptron with softmax output trained on the MNIST
          dataset. Draw a number, and the app predicts its class.
        </Text>
        <Flex
          alignItems="center"
          justifyContent="center"
          direction={{ base: "column-reverse", md: "row" }}
          pb={16}
        >
          <Flex
            direction="column"
            w="fit-content"
            position="relative"
            mt={{ base: 8, md: 0 }}
          >
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
            <HStack
              position="absolute"
              left="50%"
              style={{ transform: "translateX(-50%)" }}
              bottom={-50}
            >
              <Button
                onClick={clear}
                variant="outline"
                colorScheme="gray"
                rounded="2xl"
              >
                Clear
              </Button>
            </HStack>
          </Flex>
          <Flex
            direction="column"
            w="400px"
            px={8}
            gap={1}
            justifyContent="flex-start"
          >
            {sortedResults.map(([digit, possibility]) => {
              const value = Math.round(possibility * 100);
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
        </Flex>
      </Flex>
    </Flex>
  );
};
