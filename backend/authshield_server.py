import json
import logging
from flask import Flask, request, jsonify, session
import mysql.connector
from flask_cors import CORS, cross_origin
import bcrypt
import os
import re
import time
from functools import wraps
from datetime import datetime, timezone
import requests
from alphanumeric_totp import AlphanumericTOTP
from apscheduler.schedulers.background import BackgroundScheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Flask app configuration
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization"])
app.secret_key = os.getenv('SESSION_SECRET_KEY', 'supersecretkey')

# Database configuration
db_config = {
    "host": "13.203.127.173",
    "user": "admin",
    "password": "admin123",
    "database": "authshieldUsers"
}

def get_db_connection():
    try:
        return mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        logger.error(f"Database connection error: {err}")
        raise

# Session-based authentication decorator
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        logger.info("=== Session Validation Start ===")
        if 'uid' not in session:
            logger.warning("User not logged in")
            return jsonify({"error": "Unauthorized access"}), 401
        
        logger.info(f"Session validated for UID: {session['uid']}")
        return f(*args, **kwargs)
    return decorated

@app.route("/")
def home():
    return "AuthShield app backend running"

# Signup route
@app.route("/signup", methods=["POST"])
@cross_origin()
def signup():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if not all([email, password, confirm_password]):
            return jsonify({"error": "Please fill in all the fields"}), 400
        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            "INSERT INTO AppUsers(email, password) VALUES (%s, %s)",
            (email, hashed_password.decode('utf-8'))
        )
        conn.commit()

        cursor.execute("SELECT uid FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            raise Exception("User creation failed")

        uid = user[0]
        session['uid'] = uid
        session['email'] = email

        return jsonify({
            "message": "Signup successful",
            "uid": uid
        }), 200

    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({"error": "Signup failed"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Login route
@app.route("/login", methods=["POST"])
@cross_origin()
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not all([email, password]):
            return jsonify({"error": "Please fill in all fields"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT uid, password FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not bcrypt.checkpw(password.encode("utf-8"), user[1].encode("utf-8")):
            return jsonify({"error": "Invalid email or password"}), 401

        uid = user[0]
        session['uid'] = uid
        session['email'] = email

        return jsonify({
            "message": "Login successful",
            "uid": uid
        }), 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Logout route
@app.route("/logout", methods=["POST"])
@cross_origin()
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

# Protected route
@app.route("/protected", methods=["GET"])
@cross_origin()
@login_required
def protected_route():
    try:
        return jsonify({
            "message": "Access granted",
            "uid": session['uid'],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error in protected route: {str(e)}")
        return jsonify({"error": "An error occurred accessing protected route"}), 500

# Scan Method
@app.route("/scan", methods=["POST"])
@cross_origin()
@login_required
def scan_qr():
    logger.info("=== Scan QR Request Start ===")
    try:
        request_data = request.get_json()  # Parse JSON payload
        logger.info(f"QR Code Data Received: {request_data}")

        # Extract the qr_code_data key
        qr_code_data = request_data.get("qr_code_data")
        if not qr_code_data:
            return jsonify({"error": "Invalid request structure, 'qr_code_data' missing"}), 400

        # Extract uuid and encrypted_url from nested qr_code_data
        user_uuid_from_qr = qr_code_data.get("uuid")
        encrypted_url = qr_code_data.get("encrypted_url")

        if not user_uuid_from_qr:
            return jsonify({"error": "UUID not found in QR code payload"}), 400
        if not encrypted_url:
            return jsonify({"error": "'encrypted_url' missing in QR code payload"}), 400

        decrypt_response = requests.post(
            "http://13.203.127.173:5001/decrypt-url",
            json={
                "uuid": user_uuid_from_qr,
                "encrypted_url": str(encrypted_url)
            }
        )

        if decrypt_response.status_code != 200:
            logger.error(f"Decrypt URL failed: {decrypt_response.text}")
            return jsonify({"error": "Failed to decrypt URL"}), decrypt_response.status_code

        decrypted_data = decrypt_response.json()
        decrypted_url = decrypted_data.get("decrypted_url")
        if not decrypted_url:
            logger.info("decrypted url missing")
            return jsonify({"error": "Decrypted URL missing in response"}), 500
        else:
            logger.info(decrypted_url)
           
        account = decrypted_url.split("/totp/")[1].split("?")[0]
        logger.info(f"Extracted account: {account}")
        totp_secret = decrypted_url.split("secret=")[1].split("&")[0]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO user_totp (user_uuid, totp_secret,account,uid)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    totp_secret = VALUES(totp_secret),
                    account = VALUES(account),
                    uid = VALUES(uid)
                """,
                (user_uuid_from_qr, totp_secret , account, session['uid'])
            )
            conn.commit()
            logger.info(f"TOTP data stored for UUID: {user_uuid_from_qr} with account: {account}")
        finally:
            cursor.close()
            conn.close()
        schedule_totp_for_user(user_uuid_from_qr, totp_secret)
        return jsonify({
            "message": "QR code processed successfully",
            "decrypted_url": decrypted_url
        }), 200

    except requests.RequestException as e:
        logger.error(f"Decrypt request error: {str(e)}")
        return jsonify({"error": "Failed to process decrypt request"}), 500
    except Exception as e:
        logger.error(f"Scan QR error: {str(e)}")
        return jsonify({"error": f"Failed to process QR code: {str(e)}"}), 500


# @app.route("/generateTotp", methods=["POST"])
# @cross_origin()
# @login_required
# def generate_totp_from_account():
#     logger.info("=== Generate TOTP Request Start ===")
#     try:
#         request_data = request.get_json()
#         account = request_data.get("account")
        
#         if not account:
#             return jsonify({"error": "Account is required"}), 400

#         # Fetch the TOTP secret from the database for the given account
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         cursor.execute("SELECT totp_secret,uid FROM user_totp WHERE account = %s", (account,))
#         result = cursor.fetchone()
        
#         if result is None:
#             return jsonify({"error": "TOTP secret not found for the account"}), 404

#         totp_secret = result[0] 
#         uid=result[1]
#         conn.close()

#         # Use the secret to generate the TOTP code
#         current_code, time_remaining = generate_totp(totp_secret)
#         if current_code is None:
#             return jsonify({"error": "Failed to generate TOTP"}), 500

#         return jsonify({
#             "uid":uid ,
#             "account": account,
#             "code": current_code,
#             "timeRemaining": time_remaining
#         }), 200

#     except Exception as e:
#         logger.error(f"Error in /generateTotp: {str(e)}")
#         return jsonify({"error": f"Failed to process TOTP generation: {str(e)}"}), 500
    
def generate_totp(totp_secret):
    try:
        current_time = int(time.time())
        window_start = current_time - (current_time % 30)
        time_until_next = 30 - (current_time % 30)

        totp = AlphanumericTOTP(secret=totp_secret, digits=6, interval=30)
        current_code = totp.generate_otp(window_start)

        logging.info(f"Current TOTP Code: {current_code}")
        logging.info(f"Time until next code: {time_until_next} seconds")

        return current_code, time_until_next
    except Exception as e:
        logging.error(f"Error generating TOTP: {e}")
        return None, None

@app.route("/update-totp", methods=["POST"])
@cross_origin()
@login_required
def update_totp():
    logger.info("=== Update TOTP Request Start ===")
    try:
        request_data = request.get_json()  # Parse JSON payload
        logger.info(f"TOTP Update Data Received: {request_data}")

        # Extract the account from the request
        user_account = request_data.get("account")
        print(f"user account:{user_account}")
        if not user_account:
            return jsonify({"error": "Account missing in request payload"}), 400

        # Fetch the TOTP secret from the database for the user using account
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT totp_secret FROM user_totp WHERE account = %s", (user_account,))
        result = cursor.fetchone()

        if result is None:
            return jsonify({"error": "TOTP secret not found for the account"}), 400

        totp_secret = result[0]
        conn.close()

        # Generate the current TOTP code using the secret
        totp = AlphanumericTOTP(secret=totp_secret, digits=6, interval=30)
        current_time = int(time.time())
        window_start = current_time - (current_time % 30)
        current_code = totp.generate_otp(window_start)

        # Return the TOTP code and the time remaining until the next code
        time_until_next = 30 - (current_time % 30)
        logger.info(totp)
        return jsonify({
            "message": "TOTP code updated successfully",
            "code": current_code,
            "timeRemaining": time_until_next
        }), 200
       

    except Exception as e:
        logger.error(f"Update TOTP error: {str(e)}")
        return jsonify({"error": f"Failed to update TOTP: {str(e)}"}), 500
    
# Function to schedule TOTP generation every 30 seconds
def schedule_totp_for_user(user_uuid, totp_secret):
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        generate_totp,
        'interval',
        seconds=30,
        args=[totp_secret],
        id=f"totp_job_{user_uuid}",
    )
    scheduler.start()
    logging.info(f"Scheduled TOTP generation job for user: {user_uuid}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
