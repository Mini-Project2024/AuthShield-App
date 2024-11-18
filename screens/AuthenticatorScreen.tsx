import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import FloatingButton from "../components/FloatingButton";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Camera as ExpoCamera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";

type RootStackParamList = {
  Login: undefined;
  Authenticator: undefined;
};

type AuthenticatorScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Authenticator"
>;

type TotpCode = {
  id: string;
  account: string;
  code: string;
  timeRemaining: number;
};

const AuthenticatorScreen: React.FC = () => {
  const navigation = useNavigation<AuthenticatorScreenNavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [totpCodes, setTotpCodes] = useState<TotpCode[]>([
    {
      id: "1",
      account: "Google: elisa.beckett@gmail.com",
      code: "461 927",
      timeRemaining: 30,
    },
    {
      id: "2",
      account: "Google: hikingfan@gmail.com",
      code: "605 011",
      timeRemaining: 30,
    },
    {
      id: "3",
      account: "Google: surfingfan@gmail.com",
      code: "556 121",
      timeRemaining: 30,
    },
  ]);
  const [setupKey, setSetupKey] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    // Generate 10 unique recovery codes when component mounts
    // generateRecoveryCodes();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTotpCodes((prevCodes) => {
        const updatedCodes = prevCodes.map((code) => ({
          ...code,
          timeRemaining: 30 - Math.floor((Date.now() / 1000) % 30),
        }));
        return updatedCodes;
      });
    }, 1000); // Set timer to update only once every second
  
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  

  // // Start the timer
  // const timer = setInterval(() => {
  //   setTotpCodes((prevCodes) =>
  //     prevCodes.map((code) => {
  //       const newTimeRemaining = 30 - Math.floor((Date.now() / 1000) % 30); // Time remaining in seconds
  //       return {
  //         ...code,
  //         timeRemaining: newTimeRemaining,
  //       };
  //     })
  //   );
  // }, 1000);

  // const generateRecoveryCodes = () => {
  //   const codes = Array.from({ length: 10 }, () =>
  //     Math.random().toString(36).substr(2, 8).toUpperCase()
  //   );
  //   setRecoveryCodes(codes);
  // };

  const renderCodeItem = ({ item }: { item: TotpCode }) => (
    <View style={styles.codeItem}>
      <Text style={styles.accountText}>{item.account}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeText}>{item.code}</Text>
        <View style={styles.timerContainer}>
          <Icon name="timer" size={24} color="blue" />
          <Text style={styles.timerText}>{item.timeRemaining}s</Text>
        </View>
      </View>
    </View>
  );

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScannerVisible(false);
    console.log("QR Code Data:", data);

    // Process or add scanned data to TOTP list
    if (data) {
      setTotpCodes((prev) => [
        ...prev,
        {
          id: `${prev.length + 1}`,
          account: `Scanned Account ${prev.length + 1}`,
          code: "123 456",
          timeRemaining: 30,
        },
      ]);
    }
  };

  const addNewTotp = () => {
    if (setupKey.trim() !== "") {
      setTotpCodes((prev) => [
        ...prev,
        {
          id: `${prev.length + 1}`,
          account: `New Account ${prev.length + 1}`,
          code: "789 012",
          timeRemaining: 30,
        },
      ]);
    }
    setModalVisible(false);
    setSetupKey("");
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  const handleLogout = () => {
    navigation.navigate("Login");
  };

  const dismissSubmenu = () => {
    if (submenuVisible) setSubmenuVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissSubmenu}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>AuthShield</Text>
          <TouchableOpacity
            style={styles.profileIconContainer}
            onPress={() => setSubmenuVisible((prev) => !prev)}
          >
            <Icon name="person" size={24} color="black" />
          </TouchableOpacity>
        </View>
        {submenuVisible && (
          <View style={styles.submenu}>
            {/* <TouchableOpacity
              style={styles.submenuItem}
              onPress={() => setRecoveryModalVisible(true)}
            >
              <Text style={styles.submenuText}>Recovery Codes</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
              <Icon
                name="logout"
                size={20}
                color="white"
                style={styles.logoutIcon}
              />
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          data={totpCodes}
          renderItem={renderCodeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
        <FloatingButton onPress={() => setModalVisible(true)} />

        {/* Modal for Recovery Codes */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={recoveryModalVisible}
          onRequestClose={() => setRecoveryModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Your Recovery Codes</Text>
                <ScrollView>
                  {recoveryCodes.map((code, index) => (
                    <Text key={index} style={styles.recoveryCodeText}>
                      {code}
                    </Text>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setRecoveryModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Modal for Adding New TOTP */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Setup Key</Text>
              <TextInput placeholder="Setup Code" style={styles.input} />
              <TouchableOpacity style={styles.addButton} onPress={addNewTotp}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                  setModalVisible(false);
                  setScannerVisible(true);
                }}
              >
                <Text style={styles.scanButtonText}>Scan QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={scannerVisible} animationType="slide">
          {/* QR Code Scanner */}
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.scannerOverlay}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "blue",
  },
  profileIconContainer: {
    backgroundColor: "#e0e0e0",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: { paddingHorizontal: 16 },
  codeItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  accountText: { color: "gray", marginBottom: 4 },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeText: { fontSize: 24, fontWeight: "bold", color: "black" },
  submenu: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: 1,
    zIndex: 1,
  },
  submenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  submenuText: {
    fontSize: 16,
    color: "black",
    paddingVertical: 12,
  },
  logoutButton: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "red",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  logoutIcon: { marginRight: 10 },
  logoutText: { color: "white", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontWeight: "bold" },
  scanButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  scanButtonText: { color: "white", fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "red",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "white", fontWeight: "bold" },
  scannerOverlay: { position: "absolute", bottom: 20, width: "100%" },
  recoveryCodeText: {
    fontSize: 16,
    color: "black",
    marginBottom: 8,
    textAlign: "center",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    color: "blue",
    marginLeft: 4,
  },
});

export default AuthenticatorScreen;
