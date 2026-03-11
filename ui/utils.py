import tkinter as tk
import numpy as np

class ConsoleRedirector:
    """Redirects print statements to a tkinter Text widget."""
    def __init__(self, widget):
        self.widget = widget

    def write(self, text):
        try:
            self.widget.insert(tk.END, text)
            self.widget.see(tk.END)
            self.widget.update_idletasks()
        except:
            pass

    def flush(self):
        pass

def extract_plot_data(cache):
    """
    Extract time and C/N0 data from cache dictionary.
    Returns (time_data, cno_data) as numpy arrays or (None, None).
    """
    time_data = None
    cno_data = None
    try:
        # Try known keys for time
        for key in ['time', 'timestamp', 'times', 'Time', 'TIMESTAMP']:
            if key in cache:
                time_data = np.asarray(cache[key])
                break
        # Try known keys for C/N0
        for key in ['cno', 'cn0', 'CByN0', 'c_by_n0', 'cbyn0', 'CNO', 'CN0']:
            if key in cache:
                cno_data = np.asarray(cache[key])
                break
        # If no exact match, try to find any numeric array of similar length
        if cno_data is None:
            for key, value in cache.items():
                try:
                    arr = np.asarray(value)
                    if arr.ndim == 1 and arr.size > 10 and np.issubdtype(arr.dtype, np.number):
                        if time_data is None or arr.size == time_data.size:
                            cno_data = arr
                            break
                except:
                    continue
        # Ensure same length
        if time_data is not None and cno_data is not None and len(time_data) != len(cno_data):
            min_len = min(len(time_data), len(cno_data))
            time_data = time_data[:min_len]
            cno_data = cno_data[:min_len]
    except Exception as e:
        print(f"⚠️ Error extracting data: {e}")
        return None, None
    return time_data, cno_data