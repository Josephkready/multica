import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "@multica/core/auth";

// TextInput style is intentionally inline — NativeWind v4's className-to-style
// pipeline drops `color` and other style props on TextInput inconsistently on
// iOS, producing white-on-white text and "looks broken" symptoms.
const inputBaseStyle = {
  height: 48,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: "hsl(240 6% 90%)", // border token
  borderRadius: 8,
  fontSize: 16,
  color: "hsl(240 10% 4%)", // foreground token
  backgroundColor: "hsl(0 0% 100%)", // background token (light)
} as const;

export default function LoginScreen() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sendCode = useAuthStore((s) => s.sendCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);

  const onSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await sendCode(trimmed);
      setStep("code");
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      await verifyCode(email.trim(), code);
      // CoreProvider's onLogin callback will redirect via the layout.
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-background justify-center px-8 gap-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">multica</Text>
          <Text className="text-muted-foreground">
            {step === "email"
              ? "Enter your email to continue"
              : `Enter the 6-digit code sent to ${email}`}
          </Text>
        </View>

        {step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              style={inputBaseStyle}
              placeholderTextColor="hsl(240 4% 46%)"
            />
            <Pressable
              onPress={onSendCode}
              disabled={!email.trim() || submitting}
              className="bg-primary rounded-md py-3 items-center active:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground font-medium">
                  Send code
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              editable={!submitting}
              autoFocus
              style={{
                ...inputBaseStyle,
                fontSize: 24,
                letterSpacing: 8,
                textAlign: "center",
              }}
              placeholderTextColor="hsl(240 4% 80%)"
            />
            <Pressable
              onPress={onVerify}
              disabled={code.length !== 6 || submitting}
              className="bg-primary rounded-md py-3 items-center active:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground font-medium">
                  Verify
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setCode("");
                setStep("email");
              }}
              disabled={submitting}
              className="items-center py-2"
            >
              <Text className="text-muted-foreground">Use a different email</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
