"""
API Logger Module
Centralized logging for all backend API calls
Supports multiple log levels, file rotation, and future CloudWatch integration
"""

import logging
import logging.handlers
import os
from datetime import datetime
import pytz
import glob
import sys
import traceback

def cleanup_old_logs(log_dir, log_name, backup_count):
    """
    Clean up old log files, keeping only the most recent 'backup_count' files.
    
    Args:
        log_dir: Directory containing log files
        log_name: Prefix for log files
        backup_count: Number of log files to keep
    """
    pattern = os.path.join(log_dir, f"{log_name}_*.log")
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    if len(files) > backup_count:
        for f in files[backup_count:]:
            try:
                os.remove(f)
            except OSError:
                # log the failed removal in logger error
                api_logger.error(f"Failed to remove log file: {f}")

class APILogger:
    """
    Centralized logger for API calls with support for:
    - Multiple log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - Rotating file handler (prevents logs from growing too large)
    - Custom timestamp format (dd/mm/yyyy HH:MM:SS in Asia/Jerusalem timezone)
    - Future CloudWatch integration
    """
    
    def __init__(
        self,
        log_dir=None,
        max_size=10 * 1024 * 1024,  # 10MB default
        backup_count=5,
        log_level=logging.INFO,
        log_name="API"
    ):
        """
        Initialize the API Logger
        
        Args:
            log_dir: Directory to store log files (default: childsmile_app/logs)
            max_size: Max size of each log file in bytes (default: 10MB)
            backup_count: Number of backup log files to keep (default: 5)
            log_level: Logging level (default: INFO)
            log_name: Prefix for log files (default: API)
        """
        if log_dir is None:
            log_dir = os.path.join(os.path.dirname(__file__), "logs")
        
        self.log_dir = log_dir
        self.max_size = max_size
        self.backup_count = backup_count
        self.log_name = log_name
        self.timezone = pytz.timezone("Asia/Jerusalem")
        
        # Create logs directory if it doesn't exist
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # before creating new log file, clean up old logs
        cleanup_old_logs(log_dir, log_name, backup_count)

        # ✅ Create logger with DEBUG level (capture everything)
        self.logger = logging.getLogger(f"childsmile.{log_name}")
        self.logger.setLevel(logging.DEBUG)  # Logger captures ALL levels
        
        # Remove existing handlers to avoid duplicates
        self.logger.handlers = []
        
        # Create rotating file handler
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = os.path.join(log_dir, f"{log_name}_{timestamp}.log")
        
        handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_size,
            backupCount=backup_count
        )
        # ✅ Handler level controls what gets written to file
        handler.setLevel(log_level)
        
        # Create formatter with custom timestamp
        formatter = logging.Formatter(
            fmt='%(message)s',
            datefmt='%d/%m/%Y %H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        # Add handler to logger
        self.logger.addHandler(handler)
    
    def _format_message(self, level, message):
        """
        Format log message with timestamp and level
        
        Args:
            level: Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            message: Message to log
            
        Returns:
            Formatted message with timestamp
        """
        formatted_time = datetime.now(self.timezone).strftime("%d/%m/%Y %H:%M:%S")
        return f"{formatted_time} [{level}] {message}"
    
    def debug(self, message):
        """Log debug message"""
        self.logger.debug(self._format_message("DEBUG", message))
    
    def info(self, message):
        """Log info message"""
        self.logger.info(self._format_message("INFO", message))
    
    def warning(self, message):
        """Log warning message"""
        self.logger.warning(self._format_message("WARNING", message))
    
    def error(self, message):
        """Log error message"""
        self.logger.error(self._format_message("ERROR", message))
    
    def critical(self, message):
        """Log critical message"""
        self.logger.critical(self._format_message("CRITICAL", message))
    
    def exception(self, message):
        """Log exception message"""
        self.logger.exception(self._format_message("EXCEPTION", message))

    def verbose(self, message):
        """Log verbose/debug message"""
        self.logger.debug(self._format_message("VERBOSE", message))

# Global logger instance for API calls
try:
    api_logger = APILogger(log_level=logging.INFO, log_name="API")
except Exception as e:
    print(f"ERROR: Failed to initialize APILogger: {e}")
    print(f"Traceback: {traceback.format_exc()}")
    # Fallback to basic logger
    api_logger = logging.getLogger("childsmile.API")
    api_logger.setLevel(logging.DEBUG)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(message)s')
    api_logger.addHandler(handler)
