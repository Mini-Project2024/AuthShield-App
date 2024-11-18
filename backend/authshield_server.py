from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS, cross_origin
import bcrypt

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True) 

# Main database connection 
db_config = {
    "host": "authshield-app.clo6ioommyum.eu-north-1.rds.amazonaws.com",
    "user": "admin",
    "password": "admin123",
    "database": "authshieldUsers"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

@app.route("/")
def home():
    return "AuthShield app backend running"

@app.route("/signup", methods=["POST"])
@cross_origin()
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirm_password")
    
    # To check if the user has entered all the fields before entering
    if not email or not password or not confirm_password:
        return jsonify({
            "error": "Please fill in all the fields"
        }), 400
        
    # To check if the password match or not
    if password != confirm_password:
        return jsonify({
          "error": "Passwords do not match"  
        }), 400
    
    # The main connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # To check if email has already been user previously or not
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({
                "error": "Email already exists"
            }), 400
            
        # Hash the password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Insert the new user data in the database
        cursor.execute("INSERT INTO AppUsers(email, password) VALUES (%s, %s)", (email, hashed_password.decode('utf-8')))
        
        conn.commit()
        
        return jsonify({
            "message": "Signup Successful"
            
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        # Close all the connection
        cursor.close()
        conn.close()
        
@app.route("/login", methods=["POST"])
@cross_origin()
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    # To check if the user has entered all the fields before entering
    if not email or not password:
        return jsonify({
            "error": "Please fill in all the fields"
        }), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch the user data from the database
        cursor.execute("SELECT * FROM AppUsers WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
              "error": "Invalid email or password"  
            }), 400
            
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
        
if __name__ == "__main__":
    app.run(debug=True)