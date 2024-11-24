import pyotp
import hmac
import hashlib
import time
import base64
import os


class AlphanumericTOTP(pyotp.TOTP):
    def __init__(self, secret, digits=6, digest=hashlib.sha1, interval=30):
        """
        Initialize the AlphanumericTOTP instance

        Args:
            secret (str): The secret key in base32 format
            digits (int): Number of digits in the OTP
            digest: Hash function to use (default: SHA1)
            interval (int): The time interval in seconds for OTP
        """
        super().__init__(secret, digits=digits, digest=digest, interval=interval)
        self.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        self.base = len(self.alphabet)

    def generate_otp(self, input):
        """
        Generate the OTP for the given input (counter or time)
        """
        if input is None:
            input = time.time()

        # Converting input to counter
        if isinstance(input, float):
            input = int(input / self.interval)

        # Generate the HMAC-SHA1 hash
        hmac_obj = hmac.new(
            base64.b32decode(self.secret.upper() + '=' * (-len(self.secret) % 8)),
            int(input).to_bytes(8, byteorder='big'),
            self.digest
        )
        hmac_result = bytearray(hmac_obj.digest())

        # Perform dynamic truncation
        offset = hmac_result[-1] & 0xf
        code = ((hmac_result[offset] & 0x7f) << 24 |
                (hmac_result[offset + 1] & 0xff) << 16 |
                (hmac_result[offset + 2] & 0xff) << 8 |
                (hmac_result[offset + 3] & 0xff))

        # Convert to alphanumeric string
        otp = ''
        for _ in range(self.digits):
            code, remainder = divmod(code, self.base)
            otp = self.alphabet[remainder] + otp

        return otp.rjust(self.digits, self.alphabet[0])

    def now(self):
        """Generate current time OTP"""
        return self.generate_otp(time.time())

    def at(self, for_time):
        """Generate OTP for specific time"""
        if isinstance(for_time, datetime):
            for_time = time.mktime(for_time.timetuple())
        return self.generate_otp(for_time)

    def verify(self, otp, for_time=None, valid_window=0):
        """
        Verify if the OTP is valid

        Args:
            otp (str): The OTP to verify
            for_time: The time to verify against (default: current time)
            valid_window (int): The window of counter values to test

        Returns:
            bool: True if OTP is valid, False otherwise
        """
        if for_time is None:
            for_time = time.time()

        if valid_window:
            for i in range(-valid_window, valid_window + 1):
                if self.generate_otp(for_time + i * self.interval) == str(otp):
                    return True
            return False

        return str(otp) == self.generate_otp(for_time)

    @staticmethod
    def random_base32(length=16):
        """Generate a random base32 secret key"""
        random_bytes = os.urandom(length)
        return base64.b32encode(random_bytes).decode('utf-8').rstrip('=')