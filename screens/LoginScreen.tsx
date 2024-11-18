import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

type LoginScreenProps = {
  navigation: NavigationProp<any, any>;
};

const Login: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields!");
      return;
    }

    try {
      const response = await fetch("http://13.60.192.115:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Login successful!");
        navigation.navigate("Authenticator");
      } else {
        Alert.alert("Error", result.error || "Login failed!");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again later.");
    }
  };

  return (
    <LinearGradient colors={["#4a90e2", "#145DA0"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to AuthShield</Text>
        <Text style={styles.subtitle}>Secure Your Account</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#aaa"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to App?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.link}> Signup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#e0e0e0",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    width: "85%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButton: {
    width: "85%",
    padding: 15,
    backgroundColor: "#1E88E5",
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
  },
  signupText: {
    color: "#e0e0e0",
    fontSize: 15,
  },
  link: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    textDecorationLine: "underline",
  },
});

export default Login;
