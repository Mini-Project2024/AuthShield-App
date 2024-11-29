# import json
# import logging
# from flask import Flask, request, jsonify
# import mysql.connector
# from flask_cors import CORS, cross_origin
# import bcrypt
# import requests
# from apscheduler.schedulers.background import BackgroundScheduler
# import requests
# import logging
# import time
# import mysql.connector
# from alphanumeric_totp import AlphanumericTOTP

# app = Flask(__name__)
# CORS(app, origins="*", supports_credentials=True) 

# # Main database connection 
# db_config = {
#     "host": "13.61.95.75",
#     "user": "admin",
#     "password": "admin123",
#     "database": "authshieldUsers"
# }

# def get_db_connection():
#     return mysql.connector.connect(**db_config)

# @app.route("/")
# def home():
#     return "AuthShield app backend running"

# @app.route("/signup", methods=["POST"])
# @cross_origin()
# def signup():
#     data = request.get_json()
#     email = data.get("email")
#     password = data.get("password")
#     confirm_password = data.get("confirm_password")
    
#     # To check if the user has entered all the fields before entering
#     if not email or not password or not confirm_password:
#         return jsonify({
#             "error": "Please fill in all the fields"
#         }), 400
        
#     # To check if the password match or not
#     if password != confirm_password:
#         return jsonify({
#           "error": "Passwords do not match"  
#         }), 400
    
#     # The main connection
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
        
#         # To check if email has already been user previously or not
#         cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
#         if cursor.fetchone():
#             return jsonify({
#                 "error": "Email already exists"
#             }), 400
            
#         # Hash the password using bcrypt
#         hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
#         # Insert the new user data in the database
#         cursor.execute("INSERT INTO AppUsers(email, password) VALUES (%s, %s)", (email, hashed_password.decode('utf-8')))
        
#         conn.commit()
        
#         return jsonify({
#             "message": "Signup Successful"
            
#         }), 200
        
#     except Exception as e:
#         return jsonify({
#             "error": str(e)
#         }), 500
#     finally:
#         # Close all the connection
#         cursor.close()
#         conn.close()
        
# @app.route("/login", methods=["POST"])
# @cross_origin()
# def login():
#     data = request.get_json()
#     email = data.get("email")
#     password = data.get("password")
    
#     # To check if the user has entered all the fields before entering
#     if not email or not password:
#         return jsonify({
#             "error": "Please fill in all the fields"
#         }), 400
        
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
        
#         # Fetch the user data from the database
#         cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
#         user = cursor.fetchone()
        
#         if not user:
#             return jsonify({
#               "error": "Invalid email or password"  
#             }), 400
            
#         # Verify password
#         stored_password = user[2]
#         if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
#             return jsonify({"error": "Invalid email or password!"}), 400

#         return jsonify({"message": "Login successful!"}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         cursor.close()
#         conn.close()
      

# # Function to generate TOTP using AlphanumericTOTP
# def generate_totp(totp_secret):
#     try:
#         current_time = int(time.time())
#         window_start = current_time - (current_time % 30)
#         time_until_next = 30 - (current_time % 30)

#         totp = AlphanumericTOTP(secret=totp_secret, digits=6, interval=30)
#         current_code = totp.generate_otp(window_start)

#         logging.info(f"Current TOTP Code: {current_code}")
#         logging.info(f"Time until next code: {time_until_next} seconds")

#         return current_code, time_until_next
#     except Exception as e:
#         logging.error(f"Error generating TOTP: {e}")
#         return None, None


# # Function to schedule TOTP generation every 30 seconds
# def schedule_totp_for_user(user_uuid, totp_secret):
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(
#         generate_totp,
#         'interval',
#         seconds=30,
#         args=[totp_secret],
#         id=f"totp_job_{user_uuid}",
#     )
#     scheduler.start()
#     logging.info(f"Scheduled TOTP generation job for user: {user_uuid}")


# # Endpoint to scan QR code and decrypt URL
# @app.route("/scan", methods=["POST"])
# def scan_qr():
#     try:
#         qr_code_data = request.get_json().get('qr_code_data')
#         if qr_code_data:
#             logging.info(f"Raw QR code payload: {qr_code_data}")
#             qr_code_payload = qr_code_data.replace("'", '"')

#             try:
#                 payload = json.loads(qr_code_payload)
#             except json.JSONDecodeError as e:
#                 logging.error(f"Error parsing JSON from QR code payload: {e}")
#                 return jsonify({"error": "Error parsing QR code payload."}), 400

#             # Send API request to decrypt URL
#             response = requests.post(
#                 "http://13.61.95.75:5001/decrypt-url",
#                 json={
#                     "uuid": payload["uuid"],
#                     "encrypted_url": payload["encrypted_url"]
#                 },
#             )

#             if response.status_code == 200:
#                 decrypted_url = response.json()["decrypted_url"]
#                 logging.info(f"Decrypted TOTP URL: {decrypted_url}")

#                 # Extract TOTP secret from URL
#                 totp_secret = decrypted_url.split("secret=")[1].split("&")[0]

#                 # Save or update TOTP secret in the database
#                 connection = get_db_connection()
#                 cursor = connection.cursor()
#                 cursor.execute(
#                     """
#                     INSERT INTO user_totp (user_uuid, totp_secret)
#                     VALUES (%s, %s)
#                     ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret)
#                     """,
#                     (payload["uuid"], totp_secret)
#                 )
#                 connection.commit()
#                 connection.close()

#                 # Start scheduling TOTP generation for this user
#                 schedule_totp_for_user(payload["uuid"], totp_secret)

#                 return jsonify({
#                     "message": "QR code scanned successfully and TOTP secret stored."
#                 })
#             else:
#                 logging.error(f"Error decrypting URL: {response.json()}")
#                 return jsonify({"error": "Error decrypting URL."}), 400

#         else:
#             return jsonify({"message": "No QR code detected."}), 400
#     except Exception as e:
#         logging.error(f"An error occurred: {e}")
#         return jsonify({"error": str(e)}), 500

        
# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0', port=5000)
    
    
# new code with the setup key    
import json
import logging
from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS, cross_origin
import bcrypt
import time
from apscheduler.schedulers.background import BackgroundScheduler
from alphanumeric_totp import AlphanumericTOTP
import os
from hmac import compare_digest

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# Database configuration
db_config = {
    "host": "13.61.95.75",
    "user": "admin",
    "password": "admin123",
    "database": "authshieldUsers"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

@app.route("/")
def home():
    return "AuthShield app backend running securely"

@app.route("/signup", methods=["POST"])
@cross_origin()
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirm_password")

    if not email or not password or not confirm_password:
        return jsonify({"error": "Please fill in all the fields"}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if email already exists
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Insert new user into database
        cursor.execute("INSERT INTO AppUsers(email, password) VALUES (%s, %s)", 
                       (email, hashed_password.decode('utf-8')))
        conn.commit()

        return jsonify({"message": "Signup Successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/login", methods=["POST"])
@cross_origin()
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Please fill in all the fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch user details
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid email or password"}), 400

        # Verify password
        stored_password = user[2]
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return jsonify({"error": "Invalid email or password!"}), 400

        return jsonify({"message": "Login successful!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/get_totp_secret", methods=["POST"])
@cross_origin()
def get_totp_secret():
    data = request.get_json()
    user_uuid = data.get("user_uuid")
    auth_token = data.get("auth_token")  # Optional authentication token

    if not user_uuid:
        return jsonify({"error": "User UUID is required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch `totp_secret` from the database
        cursor.execute(
            "SELECT AES_DECRYPT(totp_secret, %s) as decrypted_secret FROM user_totp WHERE user_uuid = %s",
            (os.getenv("DB_SECRET_KEY"), user_uuid)
        )
        result = cursor.fetchone()

        if not result or not result["decrypted_secret"]:
            return jsonify({"error": "TOTP secret not found"}), 404

        totp_secret = result["decrypted_secret"].decode("utf-8")
        return jsonify({"success": True, "totp_secret": totp_secret}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route("/verify_setup_key", methods=["POST"])
@cross_origin()
def verify_setup_key():
    data = request.get_json()
    user_uuid = data.get("user_uuid")
    setup_key = data.get("setup_key")

    if not user_uuid or not setup_key:
        return jsonify({"error": "User UUID and setup key are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch stored TOTP secret
        cursor.execute(
            "SELECT AES_DECRYPT(totp_secret, %s) as decrypted_secret FROM user_totp WHERE user_uuid = %s",
            (os.getenv("DB_SECRET_KEY"), user_uuid)
        )
        result = cursor.fetchone()

        if not result or not result["decrypted_secret"]:
            return jsonify({"error": "TOTP secret not found"}), 404

        stored_secret = result["decrypted_secret"].decode("utf-8")

        # Verify setup key
        if compare_digest(setup_key, stored_secret):
            return jsonify({"success": True, "message": "Setup key verified successfully."}), 200
        else:
            return jsonify({"success": False, "message": "Setup key does not match."}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

# hope the db has this
# CREATE TABLE user_totp (
    # user_uuid VARCHAR(255) PRIMARY KEY,
    # totp_secret VARBINARY(255) -- Store encrypted secrets
# );
# 