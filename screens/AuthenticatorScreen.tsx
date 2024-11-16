import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import FloatingButton from "../components/FloatingButton";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Camera as ExpoCamera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";

type TotpCode = {
  id: string;
  account: string;
  code: string;
};

const AuthenticatorScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [totpCodes, setTotpCodes] = useState<TotpCode[]>([
    { id: "1", account: "Google: elisa.beckett@gmail.com", code: "461 927" },
    { id: "2", account: "Google: hikingfan@gmail.com", code: "605 011" },
    { id: "3", account: "Google: surfingfan@gmail.com", code: "556 121" },
  ]);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

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
    //otpauth://user={}?secret=yvhvhgvhgvhg
  };

  const addNewTotp = () => {
    setModalVisible(false);
    // Logic to add a new TOTP to `totpCodes` array
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>AuthShield</Text>
      </View>
      <FlatList
        data={totpCodes}
        renderItem={renderCodeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <FloatingButton onPress={() => setModalVisible(true)} />

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

      {/* QR Code Scanner */}
      <Modal visible={scannerVisible} animationType="slide">
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: { padding: 16, alignItems: "center" },
  headerText: { fontSize: 18, fontWeight: "bold", color: "black" },
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
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#6200ee" },
  scannerOverlay: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    alignItems: "center",
  },
});

export default AuthenticatorScreen;