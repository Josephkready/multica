import { useEffect, useState } from "react";
import { Image as RNImage, Text, View } from "react-native";
import { Image } from "expo-image";

import { COLOR } from "./theme";

const MAX_HEIGHT = 400;

// Renders inline / block markdown images. Uses expo-image (already a dep)
// for cache + WebP support. We fetch the source's intrinsic size async via
// RN Image.getSize so width:100% scales to maintain aspect ratio without
// stretching or letterboxing.
export function MarkdownImage({ uri, alt }: { uri: string; alt?: string }) {
  const [aspect, setAspect] = useState<number | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    RNImage.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setAspect(w / h);
      },
      () => {
        if (!cancelled) setErrored(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (errored) {
    return (
      <View
        style={{
          backgroundColor: COLOR.muted,
          borderRadius: 8,
          paddingVertical: 16,
          paddingHorizontal: 12,
          marginVertical: 8,
        }}
      >
        <Text style={{ color: COLOR.mutedForeground, fontSize: 13 }}>
          🖼 Failed to load image{alt ? `: ${alt}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 8 }}>
      <Image
        source={{ uri }}
        style={
          aspect
            ? {
                width: "100%",
                aspectRatio: aspect,
                maxHeight: MAX_HEIGHT,
                borderRadius: 8,
                backgroundColor: COLOR.muted,
              }
            : {
                width: "100%",
                height: 200,
                borderRadius: 8,
                backgroundColor: COLOR.muted,
              }
        }
        contentFit="contain"
        accessibilityLabel={alt}
      />
      {alt && (
        <Text
          style={{
            color: COLOR.mutedForeground,
            fontSize: 12,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {alt}
        </Text>
      )}
    </View>
  );
}
