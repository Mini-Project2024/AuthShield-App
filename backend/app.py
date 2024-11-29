from flask import Flask, jsonify
import requests
import cv2
import logging
import time
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from pyzbar.pyzbar import decode
from alphanumeric_totp import AlphanumericTOTP  # Import your custom TOTP class
import json
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database configuration
db_config = {
    "host": "13.61.95.75",
    "user": "admin",
    "password": "admin123",
    "database": "authshieldUsers"
}


# Helper function to connect to the database
def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            logging.info("Database connected successfully!")
        return connection
    except Error as e:
        logging.error(f"Error connecting to database: {e}")
        return None


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
@app.route("/scan", methods=["GET"])
def scan_qr():
    try:
        qr_code_data = requests.json.get('qrcode_data')
        if qr_code_data:
            logging.info(f"Raw QR code payload: {qr_code_data}")
            qr_code_payload = qr_code_data.replace("'", '"')

            try:
                payload = json.loads(qr_code_payload)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing JSON from QR code payload: {e}")
                return jsonify({"error": "Error parsing QR code payload."}), 400

            # Send API request to decrypt URL
            response = requests.post(
                "http://13.61.95.75:6000/decrypt-url",
                json={
                    "uuid": payload["uuid"],
                    "encrypted_url": payload["encrypted_url"]
                },
            )

            if response.status_code == 200:
                decrypted_url = response.json()["decrypted_url"]
                logging.info(f"Decrypted TOTP URL: {decrypted_url}")

                # Extract TOTP secret from URL
                totp_secret = decrypted_url.split("secret=")[1].split("&")[0]

                # Save or update TOTP secret in the database
                connection = get_db_connection()
                cursor = connection.cursor()
                cursor.execute(
                    """
                    INSERT INTO user_totp (user_uuid, totp_secret)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret)
                    """,
                    (payload["uuid"], totp_secret)
                )
                connection.commit()
                connection.close()

                # Start scheduling TOTP generation for this user
                schedule_totp_for_user(payload["uuid"], totp_secret)

                return jsonify({
                    "message": "QR code scanned successfully and TOTP secret stored."
                })
            else:
                logging.error(f"Error decrypting URL: {response.json()}")
                return jsonify({"error": "Error decrypting URL."}), 400

        else:
            return jsonify({"message": "No QR code detected."}), 400
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
