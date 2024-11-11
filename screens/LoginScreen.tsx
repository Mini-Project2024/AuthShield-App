// screens/login.tsx
import React, { useState } from "react";
import { View, Text, Button, TextInput, StyleSheet } from "react-native";
import { NavigationProp } from "@react-navigation/native";
import { TouchableOpacity } from "react-native-gesture-handler";

type LoginScreenProps = {
  navigation: NavigationProp<any, any>;
};

const Login: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to AuthShield</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button
        title="Login"
        onPress={() => navigation.navigate("Authenticator")}
      />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text>New to App? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.link}>Signup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  input: {
    width: "80%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  link: { color: "blue", textDecorationLine: "underline" },
});

export default Login;
