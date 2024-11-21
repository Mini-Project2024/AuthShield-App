// src/config/api.js

const DEV_API_URL = Platform.select({
    ios: 'http://localhost:5000',
    android: 'http://10.0.2.2:5000', // Special Android localhost
  });
  
  const PROD_API_URL = 'authshield-app.clo6ioommyum.eu-north-1.rds.amazonaws.com'; // Add your production URL when ready
  
  export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;