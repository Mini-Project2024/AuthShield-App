import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

type SignupScreenProps = {
  navigation: NavigationProp<any, any>;
};

const Signup: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields!");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    try {
      const response = await fetch("http://13.60.192.115:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          email, 
          password, 
          confirm_password: confirmPassword 
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "Signup failed!");
        return;
      }
  
      const result = await response.json();
      Alert.alert("Success", "Signup successful!");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error", "Network error. Please check your connection.");
    }
  };

  return (
    <LinearGradient colors={["#4a90e2", "#145DA0"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Create a New Account</Text>
        <Text style={styles.subtitle}>Join AuthShield for secure access</Text>
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
        <TextInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </TouchableOpacity>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}> Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.7,
  },
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
  signupButton: {
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
  signupButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
  },
  loginText: {
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

export default Signup;
