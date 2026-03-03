import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import time
import threading
import subprocess  
import sys
import os

from nmea_api import mainfunction  ,extractAllData ,findTimeJumps

def resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)
 

class LogAnalyser:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Log Analyser")
        self.root.geometry("1200x300")  #  window size 
        self.root.resizable(False, False)  
        self.center_window()  
        
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(expand=True, fill='both')
        
        self.main_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.main_frame, text='Main')
        
        if hasattr(sys, '_MEIPASS'):
            base_path = sys._MEIPASS
        else:
            base_path = os.path.abspath(".")
        
        accord_img_path = resource_path("Accord_logo.png")
        self.accord_img = tk.PhotoImage(file=accord_img_path)
        self.add_corner_images()

        self.processing_label = tk.Label(self.main_frame, text="", fg="red")
        self.processing_label.grid(row=4, column=1, pady=10)
        
        self.input_label = tk.Label(self.main_frame, text="Log file path:")
        self.input_label.grid(row=2, column=0, padx=20, pady=30, sticky="w")
        
        self.input_entry = tk.Entry(self.main_frame, width=90)
        self.input_entry.grid(row=2, column=1, padx=20, pady=20)
        
        self.browse_button = tk.Button(self.main_frame, text="Browse", command=self.browse_file)
        self.browse_button.grid(row=2, column=2, padx=20, pady=20)
        
        self.submit_button = tk.Button(self.main_frame, text="Submit", command=self.submit)
        self.submit_button.grid(row=3, column=1, padx=20, pady=20)
        
        self.root.mainloop()

        
    def center_window(self):
        window_width = 1200
        window_height = 300
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        position_top = int(screen_height / 2 - window_height / 2)
        position_right = int(screen_width / 2 - window_width / 2)
        self.root.geometry(f"{window_width}x{window_height}+{position_right}+{position_top}")
    
    def browse_file(self):
        filename = filedialog.askopenfilename(title="Select a file")
        self.input_entry.delete(0, tk.END)
        self.input_entry.insert(0, filename)
        

        
    def submit(self):
        global submitflag
        self.processing_label.config(text="Processing...")
        self.root.update_idletasks()
        self.root.after(2000, self.process_submission)  
        #print(submitflag)
    def process_submission(self):
        file_path = self.input_entry.get()
        if not file_path:
            messagebox.showwarning("Warning", "Please select an input log file.")
            self.processing_label.config(text="")
            return

        self.processing_label.config(text="")

        try:
            dataStructure=extractAllData(file_path)
            import json
            output_filename = "data_output.json"
            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump(dataStructure, f, indent=4, ensure_ascii=False)
            findTimeJumps(file_path)
            self.open_main_menu(file_path,dataStructure)
            #root.destroy()
            #messagebox.showinfo("Success", "Processing completed.")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred:\n{e}")
    


    def open_main_menu(self,file_path,dataStructure):

        
        
        new_root = tk.Tk()
        new_root.title("Choose the task")
        new_root.geometry("400x600")
        new_root.resizable(False, False)

        new_root.update_idletasks()
        screen_width = new_root.winfo_screenwidth()
        screen_height = new_root.winfo_screenheight()
        x = (screen_width // 2) - (300 // 2)
        y = (screen_height // 2) - (500 // 2)
        new_root.geometry(f"+{x}+{y}")

        task = [
        "Plot CByN0 from a log",
        "Plot CByN0 from 2 logs",
        " Analyze MIPS",
        " Check for position losses",
        " Plot altitude for a log",
        " Plot altitude for 2 logs",
        " Plot DOP for a log",
        " Plot DOP for 2 logs",
        " Plot no of SVs used for fix from a log",
        " Plot no of SVs used for fix from 2 logs",
        " No of times reset",
        "SBAS use in the log",
        " PlotStatistics against true values(For RTK)",
        "Velocity Plot",
        "EXIT"
        
        ]
        for i in range(len(task)):
            button = tk.Button(
                new_root,
                text=task[i],
                bg="lightblue",
                fg="darkblue",
                command=lambda i=i: safe_mainfunction(i, file_path,new_root,dataStructure)
            )
            button.pack(pady=4)
            if i==2:
                button.config(state=tk.DISABLED)

               

        def safe_mainfunction(i, file_path,new_root,dataStructure):
            try:
                if i!=14:
                    mainfunction(i, file_path,dataStructure)

                else:
                    new_root.destroy()
            except Exception as e:
                messagebox.showerror("Error", f"An error occurred:\n{e}")
                new_root.destroy()


        new_root.mainloop()


    
    def browse_file_for_entry(self, entry):
        filename = filedialog.askopenfilename(title="Select a file")
        entry.delete(0, tk.END)
        entry.insert(0, filename)
    
    def add_corner_images(self):
        self.rinex_label = tk.Label(self.main_frame, image=self.accord_img)
        self.rinex_label.place(relx=0.5, x=40, y=160, anchor='ne')

def run_app():
    LogAnalyser()

run_app()
