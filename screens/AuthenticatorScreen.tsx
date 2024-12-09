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
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import axios from "axios";

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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [totpCodes, setTotpCodes] = useState<TotpCode[]>([]);
  const [setupKey, setSetupKey] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const [allIntervales,setAllIntervals] = useState<any[]>([]);

  useEffect(() => {
    setFacing((current) => "back");
    (async () => {
      if (!permission?.granted) {
        // Request permission if not already granted
        const result = await requestPermission();
        if (result.granted) {
          console.log("Camera permission granted");
        } else {
          console.log("Camera permission denied");
        }
      } else {
        console.log("Camera permission already granted");
      }
    })();

    // Generate 10 unique recovery codes when component mounts
    // generateRecoveryCodes();
  }, [permission, requestPermission]);

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

  useEffect(()=>{
    return ()=>{
      try{
        allIntervales.forEach(clearInterval);
      }catch(e){

      }
    }
  },[])

  useEffect(() => {
    const fetchTotpsAfterLogin = async () => {
      try {
        const response = await axios.get<{ 
          totp_enabled: boolean; 
          totp_data: Array<{ id: string; account: string; code: string; timeRemaining: number }>}>
          ("http://13.203.127.173:5000/get-totp-data", {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
  
        console.log(response.data)
        if (response.data.totp_enabled) {
          const totpList: TotpCode[] = response.data.totp_data.map((totp) => ({
            id: totp.id,  
            account: totp.account,
            code: totp.code || "", 
            timeRemaining: totp.timeRemaining || 30, 
          }));

          setTotpCodes(totpList);
          for (const code of totpList) {
            await getCode(code); // Fetch the current TOTP code
            await makeInterval(code); // Start updating the code periodically
          }
        }
      } catch (error) {
        console.error("Error fetching TOTP data after login:", error);
      }
    };
  
    // Fetch TOTP codes after login
    fetchTotpsAfterLogin();
  }, []);
  

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


  const getCode = async (code:TotpCode) => {
    try {
      console.log(code.account)
      const response = await axios.post(
        "http://13.203.127.173:5000/get-updated-totp",  // Call the new endpoint
        {
          account: code.account, // Send only the UUID
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 30000,  // You can adjust this if necessary
        }
      );
     
      let f = false;
      for(const totp of totpCodes){
        if(totp.account == code.account){
          f = true;
          break;
        }
      }
      
      if(f){
        setTotpCodes((prev)=>{
          return prev.map((eachCode)=>{
            return (eachCode.account == code.account && (!eachCode.code || eachCode.code == code.code))?{...eachCode,"code":response.data.code}:eachCode
          })
        })
      }else{
        setTotpCodes([...totpCodes,{...response.data,"account":code.account}]);
      }

    } catch (error) {
      
      console.error("Error updating TOTP:", error);
    }
  }
  async function makeInterval(code:TotpCode){
    await getCode(code);
    const newInterval = setInterval(async ()=>{
      console.log("Called")
      await getCode(code);
    }, 14000); // Trigger after timeRemaining
    setAllIntervals([...allIntervales,newInterval]);
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
  
    let parsedData: any;
    try {
      // Attempt to parse the QR data as JSON
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("Scanned data is not a valid JSON string:", data);
        return;
      }
  
      console.log("Original Data:", data);
      console.log("Parsed Data:", parsedData);
  
      // Check if the parsed data contains the necessary QR code info
      if (parsedData.encrypted_url && parsedData.uuid) {
        // Send the QR code data to the backend for decryption
        const response = await axios.post(
          "http://13.203.127.173:5000/scan",
          {
            qr_code_data: parsedData, // Send the parsed data
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 10000, // Set a timeout of 10 seconds
          }
        );
  
        console.log("Response received from server:", response.data);
  
        // Handle successful response from the backend
        if (response.data.message) {
          console.log("Success:", response.data.message);
  
          console.log(response.data);
          // Extract relevant data from the backend response
          const { message, uid, account, code, timeRemaining } = response.data;
  
          // Add the new account and TOTP code to the state
          setTotpCodes((prevCodes) => [
            ...prevCodes,
            { id: uid, account, code, timeRemaining },
          ]);
          await getCode({ id: uid, account, code, timeRemaining });
          await makeInterval({ id: uid, account, code, timeRemaining });

        } else {
          console.error("No message in the server response.");
        }
      } else {
        console.error("Invalid QR code data.");
      }
    } catch (error) {
      // Enhanced error handling
      if (axios.isAxiosError(error)) {
        console.error("Axios error occurred:", error.message);
        if (error.response) {
          console.error("Server response:", {
            status: error.response.status,
            data: error.response.data,
          });
        } else {
          console.error("No server response or network error.");
        }
      } else {
        console.error("Unknown error occurred:", error);
      }
    } finally {
      // Reset scanner state
      setScannerVisible(false);
      setScanned(false);
    }
  };
  
  const addNewTotp = async () => {
    // if (setupKey.trim() !== "") {
    //   try {
    //     // Make an API request to generate the TOTP code using the setup key
    //     const response = await axios.post(
    //       "http://13.203.127.173:5000/generateTotp", // Replace with your backend endpoint to generate TOTP
    //       {
    //         account: "account", // Add proper account data
    //       },
    //       {
    //         headers: {
    //           "Content-Type": "application/json",
    //           Accept: "application/json",
    //         },
    //       }
    //     );
  
    //     const { uid, account, code, timeRemaining } = response.data;
  
    //     // Check if the account already exists in the totpCodes array
    //     setTotpCodes((prevCodes) => {
    //       // If the account exists, update the code; otherwise, add a new entry
    //       const existingAccountIndex = prevCodes.findIndex(
    //         (item) => item.account === account
    //       );
  
    //       if (existingAccountIndex >= 0) {
    //         // Account exists, update the TOTP code and timeRemaining
    //         const updatedCodes = [...prevCodes];
    //         updatedCodes[existingAccountIndex] = {
    //           id: uid,
    //           account,
    //           code,
    //           timeRemaining,
    //         };
    //         return updatedCodes;
    //       } else {
    //         // Account doesn't exist, add a new entry
    //         return [
    //           ...prevCodes,
    //           { id: uid, account, code, timeRemaining },
    //         ];
    //       }
    //     });
  
    //     setModalVisible(false);
    //     setSetupKey("");
    //   } catch (error) {
    //     console.error("Error generating TOTP:", error);
    //   }
    // }
  };
  
  if (permission === null) {
    return <Text>Requesting for camera permission</Text>;
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
          keyExtractor={(item) => item.account}
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
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setScannerVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
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
  overlay: {
    ...StyleSheet.absoluteFillObject, // Fills the entire screen
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black
    justifyContent: "center",
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
