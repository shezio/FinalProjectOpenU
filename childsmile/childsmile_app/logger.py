import logging
import logging.handlers
import os
import sys
from datetime import datetime
import pytz
import glob
import traceback

# ---------- ENV DETECTION ----------
IS_AZURE = "DJANGO_ENV" in os.environ and os.environ.get("DJANGO_ENV") == "production"

# ---------- LOG LEVEL ----------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# ---------- LOG DIR ----------
if IS_AZURE:
    LOG_DIR = "/home/logs"
else:
    LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")

# ---------- TIMEZONE ----------
TIMEZONE = pytz.timezone("Asia/Jerusalem")


def cleanup_old_logs(log_dir, log_name, backup_count):
    pattern = os.path.join(log_dir, f"{log_name}_*.log")
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    for f in files[backup_count:]:
        try:
            os.remove(f)
        except OSError:
            pass


class APILogger:
    def __init__(
        self,
        log_name="API",
        max_size=10 * 1024 * 1024,
        backup_count=5
    ):
        os.makedirs(LOG_DIR, exist_ok=True)
        cleanup_old_logs(LOG_DIR, log_name, backup_count)

        self.logger = logging.getLogger(f"childsmile.{log_name}")
        self.logger.setLevel(logging.DEBUG)  # capture all
        self.logger.handlers.clear()
        self.logger.propagate = False

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = os.path.join(LOG_DIR, f"{log_name}_{timestamp}.log")

        formatter = logging.Formatter('%(message)s')

        # 📁 File handler (local + Azure)
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_size,
            backupCount=backup_count,
            encoding="utf-8"
        )
        file_handler.setLevel(LOG_LEVEL)
        file_handler.setFormatter(formatter)

        # 📺 Console handler (local terminal + Azure log stream)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(LOG_LEVEL)
        console_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

        env = "AZURE" if IS_AZURE else "LOCAL"
        self.info(f"Logger initialized ({env}) level={LOG_LEVEL}")

    def _fmt(self, level, msg):
        ts = datetime.now(TIMEZONE).strftime("%d/%m/%Y %H:%M:%S")
        return f"{ts} [{level}] {msg}"

    def debug(self, msg): self.logger.debug(self._fmt("DEBUG", msg))
    def verbose(self, msg): self.logger.debug(self._fmt("VERBOSE", msg))
    def info(self, msg): self.logger.info(self._fmt("INFO", msg))
    def warning(self, msg): self.logger.warning(self._fmt("WARNING", msg))
    def error(self, msg): self.logger.error(self._fmt("ERROR", msg))
    def critical(self, msg): self.logger.critical(self._fmt("CRITICAL", msg))
    def exception(self, msg): self.logger.exception(self._fmt("EXCEPTION", msg))


# 🌍 Global instance
try:
    api_logger = APILogger()
except Exception as e:
    print(f"Failed to initialize API logger: {e}")
    traceback.print_exc()
    api_logger = logging.getLogger("childsmile.API")
    api_logger.addHandler(logging.StreamHandler(sys.stdout))
