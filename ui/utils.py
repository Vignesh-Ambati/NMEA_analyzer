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
    """
    Extract plot data from cache based on plot_idx.
    
    plot_idx=0: Extract C/N0 (cbyn) data from GSV files using multi-threaded backend
    
    Args:
        cache: DataCache object with temp_dir attribute
        plot_idx (int): Plot index (0 for C/N0 plot)
        
    Returns:
        tuple: (time_data, cno_data) as numpy arrays, or (None, None) if no data found
    """
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