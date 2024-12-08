import json
import logging
from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS, cross_origin
import bcrypt
import jwt
import os
from functools import wraps
from datetime import datetime, time, timedelta, timezone
from dotenv import load_dotenv
import requests
from alphanumeric_totp import AlphanumericTOTP
load_dotenv()
# Secret key for JWT
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'mysecretkey')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization"])

# Database configuration
db_config = {
    "host": "13.203.127.173",
    "user": "admin",
    "password": "admin123",
    "database": "authshieldUsers"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# Home route
@app.route("/")
def home():
    return "AuthShield app backend running"

# Decorator to validate JWT
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        print(f"Authorization Header: {auth_header}")  # Debugging log
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token is missing or invalid"}), 401

        token = auth_header.split(" ")[1]  # Extract token part
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.uid = decoded["uid"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


# Protected route
@app.route("/protected", methods=["GET"])
@cross_origin()
def protected_route():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        # Always remove "Bearer " prefix if present
        token = auth_header.split(" ")[1] if "Bearer " in auth_header else auth_header
        print("Received Token:", token)  # Debug log

        # Add more robust token validation
        try:
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.InvalidSignatureError:
            print("Invalid signature")
            return jsonify({"error": "Invalid token signature"}), 401
        except jwt.DecodeError as e:
            print(f"Decode error: {str(e)}")
            return jsonify({"error": "Unable to decode token"}), 401

        print("Decoded Token:", decoded_token)  # Debug log

        # Check if the token has expired
        current_time = datetime.now(timezone.utc).timestamp()
        if decoded_token.get('exp', 0) < current_time:
            return jsonify({"error": "Token has expired"}), 401

        return jsonify({"uid": decoded_token["uid"]}), 200

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500
    
    
# Signup route
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
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            "INSERT INTO AppUsers(email, password) VALUES (%s, %s)",
            (email, hashed_password.decode('utf-8')),
        )
        conn.commit()

        cursor.execute("SELECT uid FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            uid = user[0]
            token = jwt.encode(
                {
                    "uid": uid,
                    "exp": (datetime.now(timezone.utc) + timedelta(hours=1)).timestamp(),  # Convert to Unix timestamp
                },
                SECRET_KEY,
                algorithm="HS256",
            )
            return jsonify({"message": "Signup successful", "token": f"Bearer {token}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Login route
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
        cursor.execute("SELECT uid, password FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid email or password"}), 400

        uid, stored_password = user
        if not bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
            return jsonify({"error": "Invalid email or password"}), 400

        # Generate the token
        token = jwt.encode(
            {
                "uid": uid,
                "exp": (datetime.now(timezone.utc) + timedelta(hours=1)).timestamp(),  # Convert to Unix timestamp
            },
            SECRET_KEY,
            algorithm="HS256",
        )

        return jsonify({"message": "Login successful", "token": f"Bearer {token}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

      

# Function to generate TOTP using AlphanumericTOTP
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


# Endpoint to scan QR code and decrypt URL
@app.route("/scan", methods=["POST"])
@cross_origin()
@token_required
def scan_qr():
    try:
        logging.info(f"UID from JWT in /scan: {request.uid}")

        qr_code_data = request.get_json().get('qr_code_data')
        if not qr_code_data:
            return jsonify({"error": "No QR code data received"}), 400

        payload = json.loads(qr_code_data)
        user_uuid_from_qr = payload.get("user_uuid")
        if not user_uuid_from_qr:
            return jsonify({"error": "User UUID not found in QR code payload"}), 400

        response = requests.post(
            "http://13.203.127.173:5001/decrypt-url",
            json={
                "uuid": user_uuid_from_qr,
                "encrypted_url": payload["encrypted_url"]
            },
        )

        if response.status_code == 200:
            decrypted_url = response.json()["decrypted_url"]
            totp_secret = decrypted_url.split("secret=")[1].split("&")[0]

            logging.info(f"Inserting into user_totp: user_uuid={user_uuid_from_qr}, totp_secret={totp_secret}, uid={request.uid}")

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO user_totp (user_uuid, totp_secret, uid)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret), uid = VALUES(uid)
                """,
                (user_uuid_from_qr, totp_secret, request.uid)
            )
            conn.commit()
            cursor.close()
            conn.close()

            schedule_totp_for_user(user_uuid_from_qr, totp_secret)

            return jsonify({"message": "QR code scanned successfully", "decrypted_url": decrypted_url}), 200
        else:
            logging.error(f"Error decrypting URL: {response.json()}")
            return jsonify({"error": "Error decrypting URL"}), 400
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500


        
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)