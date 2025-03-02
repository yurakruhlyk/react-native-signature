import { StatusBar } from "expo-status-bar";
import { useCallback, useState, useMemo } from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

import { SafeAreaView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  Path,
  Skia,
  SkPath,
  useCanvasRef,
} from "@shopify/react-native-skia";
import { runOnJS, useSharedValue } from "react-native-reanimated";

export default function RootLayout() {
  const [paths, setPaths] = useState<string[]>([]);
  const canvasRef = useCanvasRef();
  const currentPath = useSharedValue<SkPath>(Skia.Path.Make());

  // We use those values and Circle for redrawing the canvas
  const pointX = useSharedValue(0);
  const pointY = useSharedValue(0);

  const addPath = useCallback((newPath: string) => {
    setPaths((currentPaths) => [...currentPaths, newPath]);
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onStart((event) => {
          const path = Skia.Path.Make();
          path.moveTo(event.x, event.y);
          currentPath.value = path;
          pointX.value = event.x;
          pointY.value = event.y;
        })
        .onUpdate((event) => {
          currentPath.value.lineTo(event.x, event.y);
          pointX.value = event.x;
          pointY.value = event.y;
        })
        .onEnd(() => {
          runOnJS(addPath)(currentPath.value.toSVGString());
        }),
    []
  );

  const reset = () => {
    setPaths([]);
    currentPath.value = Skia.Path.Make();
  };

  const save = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to save the image!");
        return;
      }

      const image = canvasRef.current?.makeImageSnapshot();

      if (image) {
        const base64 = image.encodeToBase64();
        const tempFilePath =
          FileSystem.cacheDirectory + `signature-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(tempFilePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await MediaLibrary.createAssetAsync(tempFilePath);
        alert("Signature saved to photos!");
      }
    } catch (error) {
      console.log("Failed to save signature:", error);
      alert("Failed to save signature");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GestureHandlerRootView
        style={{
          flex: 1,
          borderBottomColor: "grey",
          borderBottomWidth: 1,
        }}
      >
        <StatusBar style="auto" />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: "gray",
            paddingBottom: 10,
          }}
        >
          <Text
            style={{ color: "red", fontSize: 22, marginRight: 20 }}
            onPress={reset}
          >
            Reset
          </Text>
          <Text style={{ color: "blue", fontSize: 22 }} onPress={save}>
            Save
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <GestureDetector gesture={tap}>
            <Canvas
              ref={canvasRef}
              style={{ flex: 1, backgroundColor: "white" }}
            >
              <Circle cx={pointX} cy={pointY} r={1} color="transparent" />
              {paths.map((path, index) => (
                <Path
                  key={index}
                  path={path}
                  color={"black"}
                  style="stroke"
                  strokeWidth={1}
                />
              ))}
              <Path
                key="currentPath"
                path={currentPath}
                color={"black"}
                style="stroke"
                strokeWidth={1}
              />
            </Canvas>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
