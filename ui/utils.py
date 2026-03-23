import os
import tkinter as tk
import numpy as np
from core.extractor import GSVExtractor

class ConsoleRedirector:
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

def extract_plot_data(cache, plot_idx=0):
    if plot_idx == 0:
        # Use backend GSVExtractor for parallel GSV file processing
        extractor = GSVExtractor(cache.temp_dir)
        dataset = extractor.extract()
        
        if dataset and len(dataset) > 0:
            return dataset.time_data, dataset.cno_data
        else:
            return None, None
    else:
        # Future plot types can be added here
        return None, None