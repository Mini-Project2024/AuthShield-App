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
};

const AuthenticatorScreen: React.FC = () => {
  const navigation = useNavigation<AuthenticatorScreenNavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [totpCodes, setTotpCodes] = useState<TotpCode[]>([
    { id: "1", account: "Google: elisa.beckett@gmail.com", code: "461 927" },
    { id: "2", account: "Google: hikingfan@gmail.com", code: "605 011" },
    { id: "3", account: "Google: surfingfan@gmail.com", code: "556 121" },
  ]);
  const [setupKey, setSetupKey] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    // Generate 10 unique recovery codes when component mounts
    generateRecoveryCodes();
  }, []);

  const generateRecoveryCodes = () => {
    const codes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substr(2, 8).toUpperCase()
    );
    setRecoveryCodes(codes);
  };

  const renderCodeItem = ({ item }: { item: TotpCode }) => (
    <View style={styles.codeItem}>
      <Text style={styles.accountText}>{item.account}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeText}>{item.code}</Text>
        <Icon name="refresh" size={24} color="gray" />
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
          code: "123 456", // Placeholder for the TOTP generation logic
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
          code: "789 012", // Placeholder for TOTP generation
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
            <TouchableOpacity
              style={styles.submenuItem}
              onPress={() => setRecoveryModalVisible(true)}
            >
              <Text style={styles.submenuText}>Recovery Codes</Text>
            </TouchableOpacity>
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

        {/* Existing modals */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          {/* Modal for Adding New TOTP */}
        </Modal>
        <Modal visible={scannerVisible} animationType="slide">
          {/* QR Code Scanner */}
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
    color: "blue" 
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
    paddingVertical: 12
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
});

export default AuthenticatorScreen;
