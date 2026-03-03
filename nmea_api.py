
"""
Filename: basic_observations.py
Author: Harshavardhana B
Date: 2024-08-02
Version: 1.0
Description:
"""


import matplotlib.pyplot as plt
import datetime
import matplotlib.dates as mdates
import math
from math import sin, cos, sqrt
import sys
import numpy as np
import os
import pandas as pd
import utm
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
import io

dataStructure={}
dataStructure1={}

talkerID=""
timestamp_enabled=5
second_path=""
dataextractfalg=int(0)
#print("Please enter file path")  
#path = r"D:\Moto\position_79"
#path=r"D:\dgnss\SOFTWARE\69th_version_RTCM_BASE\03072025_overnight_testPC\08072025_OvernightLPB\new 1"
flag=0
UTC_Time = 0
Seconds_Before = 0
Seconds_Today = 0
Total_Seconds = 0
file_name="Long_analysis.xlsx"
CEP=0
encodings = ["utf-8", "latin-1", "ascii"]
gsvKeys = ["identifier", "noOfSentences", "sentenceNo", "numberOfSV", "svId", "elevation", "azimuth", "cByNo"]
ptmErrors = ("Not eliminated", "Signal loss alert", "MEAS threshold", "Mask angle", "Code arm elimination", "Millisecond error"
                      , "Cross correlation satelite pos across SVs", "Cross correlation ephemeris almanac range different", "Doppler cross correlation"
                      , "Range RAIM", "Range rate RAIM", "Test position residue", "Safe first fix", "Vel innovation", "Position innovation", "LS max misclosure"
                      , "Invalid", "Normal snap consist error", "PR limit exceeded", "Range RAIM snap", "Static state range RAIM", "Static state range rate RAIM"
                      , "Improved range RAIM", "One measurement per signal", "Incoming or outgoing meas", "Step detection range", "Track divergence"
                      , "URA limit exceeded")

constellations = { "0": "GP", "1": "GL", "2": "GA", "3": "GB", "4": "GQ", "5": "GI"}




def convertTime(time, day, month, year):
   # print(time)
   # print(day)
    #print(month)
    return datetime.datetime.combine(datetime.date(int(year), int(month), int(day)), datetime.time(int(time[:2]), int(time[2] + time[3]), int(float(time)) % 100 ))

def converTIMEfromUTC(timestamp,ddmmyy):
    #ddmmyy=(ddmmyy)
    #print()
    time=int()
    day=ddmmyy[:2]
   # print(day)
    month=ddmmyy[2:4]
    #print(month)
    year=ddmmyy[4:6]
    
    #print(year)
    return datetime.datetime.combine(datetime.date((int(year))+2000, int(month), int(day)), datetime.time(int(timestamp[:2]),int (timestamp[2] + timestamp[3]), int(float(time)) % 100  ))


def extractAllData(path):
    talker_flag=int(0)
    global talkerID
    global timestamp_enabled
    dataStructure = {
        "gpEnabled": False, "glEnabled": False, "gaEnabled": False, "gbEnabled": False, "gqEnabled": False, "giEnabled": False
    }
    data = []
    obj = {
        "GSA": {},
        "GSV": {"GP": [], "GL": [], "GA": [], "GB": [], "GQ": [], "GI": []}
    }


    with open(path, "rb") as file:
        startField = ""
        gsv_frame = []
        gsv_lines = 0
        gsv_line_counter = 0
        lineNo = 0
        gsa_buffer = {}
        obj = {}
        incompleteDataLine = False

        lines = [line.strip() for line in file if line.strip()]

        # Read each line from the file
        for line in lines:
            lineNo += 1
            buffer = []
            decoded_line = None

            for encoding in encodings:
                try:
                    decoded_line = line.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if decoded_line is None:
                print("Unable to decode line:", line)
                continue
            
            line = decoded_line.strip()
            #print(len(line))
           
            if(line[0]== "["):
                timestamp_enabled =1
                if len(line)<=26:
                    continue
                #print(timestamp_enabled)
            if(timestamp_enabled == 1):
                if(line[25] ==" " ):
                    modif_line=line[26:]
                    buffer= modif_line.split(",")
                    #print(buffer)

                    
                elif(line[26] ==" " ):
                    modif_line=line[27:]
                    buffer= modif_line.split(",")
                    #print(buffer)
                else:
                    continue
                    
                
            else:
                buffer = line.split(",")
                
                       
            try:
                #RMC is considered if zda is not availabe
                if (buffer[0] == "$GNZDA" or buffer[0]== "$GPZDA" or
                buffer[0]== "$GBZDA" or buffer[0]== "$GIZDA"
                or buffer[0] == "$GLZDA"  or buffer[0]== "$GQZDA"
                   or buffer[0]== "$GAZDA" or buffer[0] == "$GNRMC" or buffer[0]== "$GPRMC" or
                buffer[0]== "$GBRMC" or buffer[0]== "$GIRMC"
                or buffer[0] == "$GLRMC"  or buffer[0]== "$GQRMC"
                   or buffer[0]== "$GARMC")  :
                    talkerID=buffer[0][0:3]
                    talker_flag=talker_flag+1
                    #print((talkerID))            

                if "*" not in buffer[-1] and buffer[0] not in ["$ACQ", "$TRK"]:
                    #incompleteDataLine = True
                    obj = {"GSA": {}, "GSV": {"GP": [], "GL": [], "GA": [], "GB": [], "GQ": [], "GI": []}}
                    continue

                if not startField:
                    startField = buffer[0]

                if buffer[0] == startField:
                    #print(buffer[0])

                    if obj and not incompleteDataLine:
                        data.append(obj)
                        #print(startField)

                    obj = {"GSA": {}, "GSV": {"GP": [], "GL": [], "GA": [], "GB": [], "GQ": [], "GI": []}}
                    incompleteDataLine = False

                # Extract GSA messages
                if buffer[0].endswith("GSA") and not incompleteDataLine:
                    if buffer[-1].startswith('1*') or buffer[0].startswith('$GP'):
                        obj["GSA"]["GP"] = buffer
                        print(obj)
                        dataStructure["gpEnabled"] = True
                    elif buffer[-1].startswith('2*') or buffer[0].startswith('$GL'):
                        obj["GSA"]["GL"] = buffer
                        dataStructure["glEnabled"] = True
                    elif buffer[-1].startswith('3*') or buffer[0].startswith('$GA'):
                        obj["GSA"]["GA"] = buffer
                        dataStructure["gaEnabled"] = True
                    elif buffer[-1].startswith('4*') or buffer[0].startswith('$GB'):
                        obj["GSA"]["GB"] = buffer
                        dataStructure["gbEnabled"] = True
                    elif buffer[-1].startswith('5*') or buffer[0].startswith('$GQ'):
                        obj["GSA"]["GQ"] = buffer
                        dataStructure["gqEnabled"] = True
                    elif buffer[-1].startswith('6*') or buffer[0].startswith('$GI'):
                        obj["GSA"]["GI"] = buffer
                        dataStructure["giEnabled"] = True

                # Check if the line starts with "GPGSV"
                elif buffer[0] == "$GPGSV" and not incompleteDataLine and not obj["GSV"]["GP"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GP"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                # Check if the line starts with "GLGSV"
                elif buffer[0] == "$GLGSV" and not incompleteDataLine and not obj["GSV"]["GL"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GL"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                # Check if the line starts with "GAGSV"
                elif buffer[0] == "$GAGSV" and not incompleteDataLine and not obj["GSV"]["GA"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GA"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                # Check if the line starts with "GBGSV"
                elif buffer[0] == "$GBGSV" and not incompleteDataLine and not obj["GSV"]["GB"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GB"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                # Check if the line starts with "GQGSV"
                elif buffer[0] == "$GQGSV" and not incompleteDataLine and not obj["GSV"]["GQ"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GQ"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                # Check if the line starts with "GIGSV"
                elif buffer[0] == "$GIGSV" and not incompleteDataLine and not obj["GSV"]["GI"]:
                    if gsv_line_counter == 0:
                        gsv_lines = int(buffer[1])

                    if gsv_line_counter == gsv_lines - 1:
                        gsv_frame.append(buffer)
                        obj["GSV"]["GI"] = gsv_frame[:]
                        gsv_line_counter = 0
                        gsv_frame.clear()
                    else:
                        gsv_frame.append(buffer)
                        gsv_line_counter += 1

                elif not incompleteDataLine:
                    obj[buffer[0]] = buffer

            except Exception as e:
                print(f"Error processing line {lineNo}: {e}")
        if not incompleteDataLine:

            data.append(obj)
            import json
            output_filename = "incompleteDataLine.json"
            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump(obj, f, indent=4, ensure_ascii=False)

        dataStructure["data"] = data
        #print(dataStructure)
    import json
    out_filename = "data.json"
    with open(out_filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    if talker_flag > 1:
        #print(dataStructure)

        return dataStructure
    elif talker_flag== 0:
        print("PLEASE CHECK TIMESTAMP ENABLED OR NOT")




def checkPtmErrors():
    
    dataStructure = extractAllData(path)
    #print(dataStructure)
    
    # Looping for data every second
    for i in range(len(dataStructure["data"])):

        if noOfSvsTracked(dataStructure, i) >= 4 and not fixAvailable(dataStructure, i):
            print("At time", dataStructure["data"][i]["PTM"][2])
            #print(gsa["GPGSA"][i])
            ptmError(dataStructure["data"][i]["PTM"])
    
# TODO - Add microseconds functionality
    

# Calculates total no of SVs tracked in all constellations
def noOfSvsTracked (dataStructure, second):

    total = 0

    if dataStructure["gpEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GP"])
    if dataStructure["glEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GL"])
    if dataStructure["gaEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GA"])
    if dataStructure["gbEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GB"])
    if dataStructure["gqEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GQ"])
    if dataStructure["giEnabled"]:
        total = total + noOfSvsTrackedPerConstellation(dataStructure["data"][second]["GSV"]["GI"])

    return total



def fixAvailable (dataStructure, second):
    if dataStructure["gpEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GP"][2]))
    elif dataStructure["glEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GL"][2]) )
    elif dataStructure["gaEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GA"][2]) )
    elif dataStructure["gbEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GB"][2]) )
    elif dataStructure["gqEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GQ"][2]) )
    elif dataStructure["giEnabled"]:
        return (int(dataStructure["data"][second]["GSA"]["GI"][2]) )
    else:
        print("hellO")
   
# Calculates total no of SVs tracked in all constellations



def noOfSvsTrackedPerConstellation (secondGsvData):
    noOfTrackedSvs = 0

    # Looping for data every line
    for j in range(len(secondGsvData)):

        # Looping for every field
        for k in range(4, len(secondGsvData[j]), 4):

            if k + 3 < len(secondGsvData[j]) and secondGsvData[j][k + 3] and int(secondGsvData[j][k + 3]) >= 30 and secondGsvData[j][k + 1] and secondGsvData[j][k + 2]:
                noOfTrackedSvs = noOfTrackedSvs + 1

    return noOfTrackedSvs



def constellationPrompt(dataStructure):

    print("Active constellations:")
    if dataStructure["gpEnabled"]:
        print("GPS (0)")
    if dataStructure["glEnabled"]:
        print("GLONASS (1)")
    if dataStructure["gaEnabled"]:
        print("Galileo (2)")
    if dataStructure["gbEnabled"]:
        print("BDS (3)")
    if dataStructure["gqEnabled"]:
        print("QZSS (4)")
    if dataStructure["giEnabled"]:
        print("IRNSS (5)")
    print("EXIT  (7)")
    return constellations[input("Which constellation? ")]


def findSvIdsOfConstellation(data, constellation):
    
    svIds = []
    
    # Looping for data every second
    for i in range(len(data)):
        for j in range(len(data[i]["GSV"][constellation])):

            # Looping for every field
            for k in range(4, len(data[i]["GSV"][constellation][j]), 4):

                if k + 3 < len(data[i]["GSV"][constellation][j]) and data[i]["GSV"][constellation][j][k] and int(data[i]["GSV"][constellation][j][k]) not in svIds:
                    svIds.append((int(data[i]["GSV"][constellation][j][k])))
    #print(svIds)

    return svIds




def extractCByNoDataForSvId(data, svId, constellation):
    CByNoData = {"svId": svId, "CByNo": [], "time":[]}
    global talkerID
    # Looping for data every second
    #print(data)
    for i in range(len(data)):

        if data[i][talkerID+"ZDA"][1] and data[i][talkerID+"ZDA"][2] and data[i][talkerID+"ZDA"][3] and data[i][talkerID+"ZDA"][4]:
            CByNoData["time"].append(convertTime(data[i][talkerID+"ZDA"][1], data[i][talkerID+"ZDA"][2], data[i][talkerID+"ZDA"][3], data[i][talkerID+"ZDA"][4]))

            found = False
            
            # Looping for data every line
            for j in range(len(data[i]["GSV"][constellation])):

                # Looping for every field
                for k in range(4, len(data[i]["GSV"][constellation][j]), 4):

                    if k + 3 < len(data[i]["GSV"][constellation][j]) and data[i]["GSV"][constellation][j][k] and int(data[i]["GSV"][constellation][j][k]) == svId:

                        found = True
                    
                        if data[i]["GSV"][constellation][j][k + 3] and data[i]["GSV"][constellation][j][k + 1] and data[i]["GSV"][constellation][j][k + 2]:
                            CByNoData["CByNo"].append(int(data[i]["GSV"][constellation][j][k + 3]))
                        else:
                            CByNoData["CByNo"].append(0)
            if not found:
                CByNoData["CByNo"].append(0)

    return CByNoData


def plotSingleData(xData, xLabel, yData, yLabel, title):

    # plotting the points 
    plt.plot(xData, yData)
 
    # naming the x axis
    plt.xlabel(xLabel)
    # naming the y axis
    plt.ylabel(yLabel)
 
    # giving a title to my graph
    plt.title(title)

    # Rotating x axis keys by 45 deg for readability
    plt.xticks(rotation=25)
 
    # function to show the plot
    plt.show()


def simultaneousConstellationPrompt(dataStructure0, dataStructure1):
    print("Active constellations:")
    if dataStructure0["gpEnabled"] and dataStructure1["gpEnabled"]:
        print("GPS (0)")
    if dataStructure0["glEnabled"] and dataStructure1["glEnabled"]:
        print("GLONASS (1)")
    if dataStructure0["gaEnabled"] and dataStructure1["gaEnabled"]:
        print("Galileo (2)")
    if dataStructure0["gbEnabled"] and dataStructure1["gbEnabled"]:
        print("BDS (3)")
    if dataStructure0["gqEnabled"] and dataStructure1["gqEnabled"]:
        print("QZSS (4)")
    if dataStructure0["giEnabled"] and dataStructure1["giEnabled"]:
        print("IRNSS (5)")

    return constellations[input("Which constellation? ")]



def plotSimultaneousData(xData0, yData0, xData1, yData1, xLabel, yLabel, title):
    
    # plotting the line 0 points 
    plt.plot(xData0, yData0, label = "path-1")
    # plotting the line 1 points 
    plt.plot(xData1, yData1, label = "path-2")

    # naming the x axis
    plt.xlabel(xLabel)
    # naming the y axis
    plt.ylabel(yLabel)
 
    # giving a title to my graph
    plt.title(title)

    # Rotating x axis keys by 45 deg for readability
    plt.xticks(rotation=45)

    # show a legend on the plot
    plt.legend()
 
    # function to show the plot
    plt.show()


#####################################################################################################################################################################

def plotCByNoForSvId(dataStructure):
    constell=[]
    sv_data_back={}
    #print(dataStructure)

    def signalmenu():
     
        if dataStructure["gpEnabled"]:
            
            print("GPS")

            constell.append("GPS")

        if dataStructure["glEnabled"]:
            constell.append("GLONASS")
        if dataStructure["gaEnabled"]:
            constell.append("Galileo")
        if dataStructure["gbEnabled"]:
            constell.append("BDS")
        if dataStructure["gqEnabled"]:
            constell.append("QZSS")
        if dataStructure["giEnabled"]:
            constell.append("IRNSS")
        constell.append("EXIT")
        

        print(constell)
        new_root = tk.Tk()
        new_root.title("Constellation")
        new_root.resizable(False, False)
        new_root.geometry("200x500")

        new_root.update_idletasks()
        screen_width = new_root.winfo_screenwidth()
        screen_height = new_root.winfo_screenheight()
        x = (screen_width // 2) - (300 // 2)
        y = (screen_height // 2) - (500 // 2)
        new_root.geometry(f"+{x}+{y}")


        for i in range(len(constell)):
            button = tk.Button(
                new_root,
                text=constell[i],
                bg="Black",
                fg="white",
                command=lambda i=i: plotdata(new_root,i,dataStructure)
            )
            button.pack(pady=5)
    signalmenu()
    
    def plotdata(new_root,index,dataStructure):
        sv_data = {}        
        if(constell[index] == "EXIT"):
            new_root.destroy()
            return
        elif(constell[index] == "GPS"):
            constellation=constellations["0"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)
        elif(constell[index] == "GLONASS"):
            sv_data = {} 
            constellation=constellations["1"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)

            
        elif(constell[index] == "Galileo"):
            sv_data = {} 
            constellation=constellations["2"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)
       

        elif(constell[index] == "BDS"):
            sv_data = {} 
            constellation=constellations["3"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)

        elif(constell[index] == "QZSS"):
            sv_data = {} 
            constellation=constellations["4"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)

        elif(constell[index] == "IRNSS"):
            sv_data = {} 
            constellation=constellations["5"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            for value in svIds:
                svId_value = "sv-"+str(value)
                sv_data[svId_value]= extractCByNoDataForSvId(dataStructure["data"], value, constellation)

            open_sv_plotter(sv_data)

        #new_root.destroy()
        
       
    def open_sv_plotter(sv_data):
        sv_data_new={}
        root = tk.Tk()
        root.title("SV Plotter")

        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width // 2) - (700 // 2)
        y = (screen_height // 2) - (500 // 2)
        root.geometry(f"700x550+{x}+{y}")

        notebook = ttk.Notebook(root)
        notebook.pack(fill='both', expand=True)

        sv_tab = ttk.Frame(notebook)
        notebook.add(sv_tab, text="GPS satellites")

        sv_tab.grid_rowconfigure(0, weight=0)
        sv_tab.grid_rowconfigure(1, weight=1)
        sv_tab.grid_columnconfigure(0, weight=1)

        # Dropdown
        
        combo = ttk.Combobox(sv_tab, values=["All"] + list(sv_data.keys()), state="readonly")
        combo.grid(row=0, column=0, padx=10, pady=10, sticky='w')
        combo.set("All")

        
        figure = plt.Figure(figsize=(6, 4), dpi=100)
        ax = figure.add_subplot(111)

        
        canvas = FigureCanvasTkAgg(figure, sv_tab)
        canvas_widget = canvas.get_tk_widget()
        canvas_widget.grid(row=1, column=0, padx=10, pady=5, sticky='nsew')

        # Toolbar 
        toolbar_frame = ttk.Frame(sv_tab)
        toolbar_frame.grid(row=2, column=0, sticky='ew', padx=10)
        toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
        toolbar.update()

        # Plotting

        def plot_selected_sv(event=None):
            sv = combo.get()
            ax.clear()
            if sv == "All":
                for sv_name, y in sv_data.items():
                    ax.plot(y["time"], y["CByNo"], label=(sv_name))
                ax.set_title("CbyN of all Sv's")
                ax.legend(loc="upper right", fontsize=8)
            elif sv in sv_data:
                ax.plot(sv_data[sv]['time'], sv_data[sv]['CByNo'],label=sv)
                ax.set_title(f"{sv} CbyN")
            ax.set_ylabel("CbyN - dBm")
            ax.set_xlabel("Time")
            canvas.draw()

        combo.bind("<<ComboboxSelected>>", plot_selected_sv)

        plot_selected_sv()
        root.mainloop()

        

#############################################################################################################################################################


def plotSimultaneousCByNo(dataStructure):

    
    constell=[]
    sv_data_back={}

    root = tk.Tk()
    root.title("2nd file path")
    root.geometry("400x200")
    root.resizable(False, False)

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width // 2) - (300 // 2)
    y = (screen_height // 2) - (500 // 2)
    root.geometry(f"+{x}+{y}")
    processing_label = tk.Label(root, text="", fg="red")

    def browse_second_file():
        global second_path
        second_path = filedialog.askopenfilename(parent=root)
        if second_path:
            processing_label.config(text="Processing...")
            root.update_idletasks()
            #print("Selected second path:", second_path)
            #messagebox.showinfo("Second File", f"You selected:\n{second_path}", parent=root)
            signalmenu(root)
            

    tk.Button(root, text="Browse Second File", command=browse_second_file).pack(pady=50)


    
    def signalmenu(root):
        global second_path
        global dataStructure1
        print("second path:", second_path)
        findTimeJumps(second_path)

        dataStructure1=extractAllData(second_path)
        
     
        if dataStructure["gpEnabled"] == True and dataStructure1["gpEnabled"] == True:
            constell.append("GPS")

        if dataStructure["glEnabled"] == True and dataStructure1["glEnabled"] == True:
            constell.append("GLONASS")
        if dataStructure["gaEnabled"] == True and dataStructure1["gaEnabled"]:
            constell.append("Galileo")
        if dataStructure["gbEnabled"] == True and dataStructure1["gbEnabled"] == True:
            constell.append("BDS")
        if dataStructure["gqEnabled"] == True and dataStructure1["gqEnabled"] == True:
            constell.append("QZSS")
        if dataStructure["giEnabled"] == True and dataStructure1["giEnabled"] == True : 
            constell.append("IRNSS")
        constell.append("EXIT")
        

        print(constell)
        root.destroy()
        new_root = tk.Tk()
        new_root.title("Constellation")
        new_root.resizable(False, False)
        new_root.geometry("200x500")

        new_root.update_idletasks()
        screen_width = new_root.winfo_screenwidth()
        screen_height = new_root.winfo_screenheight()
        x = (screen_width // 2) - (300 // 2)
        y = (screen_height // 2) - (500 // 2)
        new_root.geometry(f"+{x}+{y}")


        for i in range(len(constell)):
            button = tk.Button(
                new_root,
                text=constell[i],
                bg="Black",
                fg="white",
                command=lambda i=i: plotdata(new_root,i,dataStructure,dataStructure1)
            )
            button.pack(pady=5)
    
    def plotdata(new_root,index,dataStructure,dataStructure1):
        if(constell[index] == "EXIT"):
            new_root.destroy()
            return
        elif(constell[index] == "GPS"):
            sv_data = {}        
            data=[]
            constellation=constellations["0"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)
            
        elif(constell[index] == "GLONASS"):
            sv_data = {}        
            data=[]
            constellation=constellations["1"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)
            
        elif(constell[index] == "Galileo"):
            sv_data = {}        
            data=[]
            constellation=constellations["2"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)
       

        elif(constell[index] == "BDS"):
            sv_data = {}        
            data=[]
            constellation=constellations["3"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)
            
        elif(constell[index] == "QZSS"):
            sv_data = {}        
            data=[]
            constellation=constellations["4"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)

        elif(constell[index] == "IRNSS"):
            sv_data = {}        
            data=[]
            constellation=constellations["5"]
            svIds = findSvIdsOfConstellation(dataStructure["data"], constellation)
            svIds1 = findSvIdsOfConstellation(dataStructure1["data"], constellation)
            commonsvs=set(svIds)&set(svIds1)
            for value in commonsvs:
                
                svId_value = "sv-"+str(value)
                data.append( extractCByNoDataForSvId(dataStructure["data"], value, constellation))
                data.append( extractCByNoDataForSvId(dataStructure1["data"], value, constellation))
                sv_data[svId_value]=data
                
            open_sv_plotter(sv_data)
        #new_root.destroy()
        
       
    def open_sv_plotter(sv_data):
        sv_data_new={}
        root = tk.Tk()
        root.title("SV Plotter")

        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width // 2) - (700 // 2)
        y = (screen_height // 2) - (500 // 2)
        root.geometry(f"700x550+{x}+{y}")

        notebook = ttk.Notebook(root)
        notebook.pack(fill='both', expand=True)

        sv_tab = ttk.Frame(notebook)
        notebook.add(sv_tab, text="GPS satellites")

        sv_tab.grid_rowconfigure(0, weight=0)
        sv_tab.grid_rowconfigure(1, weight=1)
        sv_tab.grid_columnconfigure(0, weight=1)

        # Dropdown
        
        combo = ttk.Combobox(sv_tab, values=["All"] + list(sv_data.keys()), state="readonly")
        combo.grid(row=0, column=0, padx=10, pady=10, sticky='w')
        combo.set("All")

        
        figure = plt.Figure(figsize=(6, 4), dpi=100)
        ax = figure.add_subplot(111)

        
        canvas = FigureCanvasTkAgg(figure, sv_tab)
        canvas_widget = canvas.get_tk_widget()
        canvas_widget.grid(row=1, column=0, padx=10, pady=5, sticky='nsew')

        # Toolbar 
        toolbar_frame = ttk.Frame(sv_tab)
        toolbar_frame.grid(row=2, column=0, sticky='ew', padx=10)
        toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
        toolbar.update()

        # Plotting

        def plot_selected_sv(event=None):
            sv = combo.get()
            ax.clear()
            if sv == "All":
                for sv_name, y in sv_data.items():
                    ax.plot(y[0]["time"], y[0]["CByNo"], label=(sv_name))
                ax.set_title("CbyN of all Sv's")
                ax.legend(loc="upper right", fontsize=8)
            elif sv in sv_data:
                ax.plot(sv_data[sv][0]['time'], sv_data[sv][0]['CByNo'],sv_data[sv][1]['time'], sv_data[sv][1]['CByNo'],label=sv)
                
                ax.set_title(f"{sv} CbyN")
                ax.legend(loc="upper right", fontsize=8)

            ax.set_ylabel("CbyN - dBm")
            ax.set_xlabel("Time")
            canvas.draw()

        combo.bind("<<ComboboxSelected>>", plot_selected_sv)

        plot_selected_sv()
        root.mainloop()





        
######################################################################################################################################################################

def findTimeJumps(path):

    # Initialize lists and variables
    date_bf_slp = []
    time_af = []
    buffer = []
    bf_slp = []
    af_slp = []
    count = 0
    first_itr = 0
    second_itr = 0
    zda_list = []
    index = 0
    diff_count = 0
    ZDA = []
    offsetflag=0
    if (timestamp_enabled == 1):
        offset_for_timestamp = int(26)
    else:
        offset_for_timestamp = int(0)

    # Define time intervals for comparison
    time1 = datetime.datetime(2024, 1, 20, 0, 0, 0)
    time2 = datetime.datetime(2024, 1, 20, 0, 0, 1)
    time3 = datetime.datetime(2024, 1, 20, 0, 0, 1, 10000)
    time4 = datetime.datetime(2024, 1, 20, 0, 0, 1, 990000)
    time5 = datetime.datetime(2024, 1, 20, 0, 0, 0, 980000)
    time6 = datetime.datetime(2024, 1, 20, 0, 0, 0, 970000)
    time7 = datetime.datetime(2024, 1, 20, 0, 0, 0, 960000)

    with open(path, 'r') as file:
        for line in file:
            buffer.append(line.strip())
            #print(buffer[0][offset_for_timestamp])
            #break


    for i in range(len(buffer)):
        if len(buffer[i]) <= offset_for_timestamp + 3:
            continue

        if(buffer[i][offset_for_timestamp ] == ' ') and offsetflag == 0:
            offset_for_timestamp=int(27)
            offsetflag=1

        elif (buffer[i][offset_for_timestamp + 1] == 'G' and
              (buffer[i][offset_for_timestamp + 2] == 'P' or
               buffer[i][offset_for_timestamp + 2] == 'B' or
               buffer[i][offset_for_timestamp + 2] == 'L' or
               buffer[i][offset_for_timestamp + 2] == 'A' or
               buffer[i][offset_for_timestamp + 2] == 'Q' or
               buffer[i][offset_for_timestamp + 2] == 'N' or
               buffer[i][offset_for_timestamp + 2] == 'I')and
              buffer[i][offset_for_timestamp + 3] == 'Z' and
              buffer[i][offset_for_timestamp + 4] == 'D' and
              buffer[i][offset_for_timestamp + 5] == 'A'):
            zda_line = (buffer[i])
            
            split_line = zda_line.split(',')
            #print(split_line)
            
            if len(split_line) > 2:
                zda_list.append(split_line)
            else:
                print(f"Skipping line due to insufficient length: {zda_line}")
    '''
    if len(zda_list) > 1 :
        print("LAST ZDA LINE IN THE LOG")
        print((zda_list[len(zda_list)-1]))
    else:
        print("There is no timestamp in the log")
    '''
    # Calculate time differences
    for index in range(len(zda_list) - 1):
        if (zda_list[index][1]) == ''or (zda_list[index+1][1])== '' :
            continue
        else:
            
            
            x = datetime.datetime(int(zda_list[index][4]), int(zda_list[index][3]), int(zda_list[index][2]),
                                 int(zda_list[index][1][0:2]), int(zda_list[index][1][2:4]), int(zda_list[index][1][4:6]),
                                 (int(zda_list[index][1][7:9])*10000))

            y = datetime.datetime(int(zda_list[index+1][4]), int(zda_list[index+1][3]),int(zda_list[index+1][2])  , 
                                int(zda_list[index+1][1][0:2]),int(zda_list[index+1][1][2:4]), int(zda_list[index+1][1][4:6]),
                                  (int(zda_list[index+1][1][7:9])*10000))
            diff = y - x

        if ((diff == (time2 - time1)) or (diff == (time4 - time2)) or (diff == (time3 - time1)) or
            (diff == (time5 - time1)) or (diff == (time6 - time1)) or (diff == (time7 - time1))):
            continue
        else:
            diff_count += 1
            #print(x - y)
            print("Remove the incomplete data from the log file and continue")
            print("time difference:",diff)
            print(zda_list[index])
            print(zda_list[index + 1])

    print("The time Difference count:", diff_count)
    if diff_count > 0:
        return int(0)

#######################################################################################################################################################################
    
def positionLossCheck(dataStructure):




    def show_print_output_gui():
        class PrintToGUI(io.StringIO):
            def __init__(self, text_widget):
                super().__init__()
                self.text_widget = text_widget

            def write(self, s):
                self.text_widget.insert(tk.END, s)
                self.text_widget.see(tk.END)

            def flush(self):
                pass

        root = tk.Tk()
        root.title("Position loss")

        text = tk.Text(root, wrap='word', height=20, width=60)
        text.pack(padx=10, pady=10)

        sys.stdout = PrintToGUI(text)
        
        positionLossCount,GGAData=extractGGAData(dataStructure["data"])

        print("Position lost", positionLossCount, "times\r\n")

        if positionLossCount:
            for i in range(0,len(GGAData["positionLoss"])):
                
                print("position lost at ",GGAData["positionLoss"][i])

        root.mainloop()

    show_print_output_gui()










#######################################################################################################################################################################



def extractGGAData(data):
    global talkerID
    positionloss=int(0)
    GGAData = {"altitude": [], "time":[],"lattitude":[],"positionLoss":[],"SBASUSED":[]}

    for i in range(len(data)):
        if data[i][talkerID+"ZDA"][1] and data[i][talkerID+"ZDA"][2] and data[i][talkerID+"ZDA"][3] and data[i][talkerID+"ZDA"][4]:

            GGAData["time"].append(convertTime(data[i][talkerID + "ZDA"][1], data[i][talkerID + "ZDA"][2], data[i][talkerID + "ZDA"][3], data[i][talkerID + "ZDA"][4]))

            if data[i][talkerID+"GGA"][9]:

                GGAData["altitude"].append(float(data[i][talkerID+"GGA"][9]))
                GGAData["lattitude"].append(float(data[i][talkerID+"GGA"][2]))

            else:
                GGAData["altitude"].append(0.0)
                GGAData["lattitude"].append(0.0)
                GGAData["positionLoss"].append(float(data[i][talkerID+"ZDA"][1]))
                positionloss=positionloss+1
                
            if data[i][talkerID+"GGA"][6]:
                
                GGAData["SBASUSED"].append(float(data[i][talkerID+"GGA"][6]))
            else:
                GGAData["SBASUSED"].append(0.0)


            

    return positionloss,GGAData

#   FOR quectel NMEA message
##########################################################################################################
def extractVTGData(data):
    global talkerID
    vtgdata = {"time": [], "Velocity": []}

    for i in range(len(data)):
        if data[i][talkerID+"ZDA"][1] and data[i][talkerID+"ZDA"][2] and data[i][talkerID+"ZDA"][3] and data[i][talkerID+"ZDA"][4]:

            vtgdata["time"].append(convertTime(data[i][talkerID + "ZDA"][1], data[i][talkerID + "ZDA"][2], data[i][talkerID + "ZDA"][3], data[i][talkerID + "ZDA"][4]))

            if data[i][talkerID+"VTG"][7]:

                vtgdata["Velocity"].append(float(data[i][talkerID+"VTG"][7]))

            else:
                vtgdata["Velocity"].append(0.0)


            

    return vtgdata
################################################################################################
def extractAltitudeData_QUECTEL(data):

    altitudeData = {"altitude": [], "time":[]}
    
    for i in range(len(data)):
        if data[i]["$GNRMC"][1]:
             #print(int(ddmmyy))
            timestamp=((data[i]["$GNRMC"][1]))
            ddmmyy=((data[i]["$GNRMC"][9]))
            altitudeData["time"].append(converTIMEfromUTC(timestamp,ddmmyy))
            if data[i]["$GNGGA"][9]:
                altitudeData["altitude"].append(float(data[i]["$GNGGA"][9]))
            else:
                altitudeData["altitude"].append(0.0)

    return altitudeData



def plotSingleAltitude(dataStructure):

    positionloss,altitudeData = extractGGAData(dataStructure["data"])


    
    if(len(altitudeData["time"])) == (len(altitudeData["altitude"])):
        
        plotSingleData(altitudeData["time"], "time", altitudeData["altitude"], "altitude - meters", "altitude plot")








def plotSimultaneousAltitude(dataStructure):
    def extractionandplotof2ndfile(root):
        global second_path
    
        global dataStructure1
        dataStructure1 = extractAllData(second_path)
        
        pos,altitudeData = extractGGAData(dataStructure["data"])

        pos,altitudeData1 = extractGGAData(dataStructure1["data"])
        root.destroy()                                      
        plotSimultaneousData(altitudeData["time"], altitudeData["altitude"], altitudeData1["time"], altitudeData1["altitude"], "time", "altitude - meters", "altitude plot")    


    root = tk.Tk()
    root.title("2nd file path")
    root.geometry("400x200")
    root.resizable(False, False)

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width // 2) - (300 // 2)
    y = (screen_height // 2) - (500 // 2)
    root.geometry(f"+{x}+{y}")
    processing_label = tk.Label(root, text="", fg="red")

    def browse_second_file():
        global second_path
        second_path = filedialog.askopenfilename(parent=root)
        if second_path:
            processing_label.config(text="Processing...")
            root.update_idletasks()
            #print("Selected second path:", second_path)
            #messagebox.showinfo("Second File", f"You selected:\n{second_path}", parent=root)
            extractionandplotof2ndfile(root)
            

    tk.Button(root, text="Browse Second File", command=browse_second_file).pack(pady=50)



######################################################################################################################################################################
def sbasplot(dataStructure):
    
    positionloss,altitudeData = extractGGAData(dataStructure["data"])
    
    if(len(altitudeData["time"])) == (len(altitudeData["SBASUSED"])):
        
        plotSingleData(altitudeData["time"], "time", altitudeData["SBASUSED"], "SBAS aplied", "Differential correction from SBAS")




######################################################################################################################################################################

def plotDopData(dataStructure):

    dopData = extractDopData(dataStructure)

    def open_sv_plotter(dopData):
        root = tk.Tk()
        root.title("SV Plotter")

        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width // 2) - (700 // 2)
        y = (screen_height // 2) - (500 // 2)
        root.geometry(f"700x550+{x}+{y}")

        notebook = ttk.Notebook(root)
        notebook.pack(fill='both', expand=True)

        sv_tab = ttk.Frame(notebook)
        notebook.add(sv_tab, text="DOP")

        sv_tab.grid_rowconfigure(0, weight=0)
        sv_tab.grid_rowconfigure(1, weight=1)
        sv_tab.grid_columnconfigure(0, weight=1)
        dopcpy=dict(dopData)
        del dopcpy['time']
        #print(dopcpy.items())

        # Dropdown 
        combo = ttk.Combobox(sv_tab, values=["All"] + list(dopcpy.keys()), state="readonly")
        combo.grid(row=0, column=0, padx=10, pady=10, sticky='w')
        combo.set("All")

        
        figure = plt.Figure(figsize=(6, 4), dpi=100)
        ax = figure.add_subplot(111)

        canvas = FigureCanvasTkAgg(figure, sv_tab)
        canvas_widget = canvas.get_tk_widget()
        canvas_widget.grid(row=1, column=0, padx=10, pady=5, sticky='nsew')

        # Toolbar 
        toolbar_frame = ttk.Frame(sv_tab)
        toolbar_frame.grid(row=2, column=0, sticky='ew', padx=10)
        toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
        toolbar.update()

        # Plotting 
        def plot_selected_sv(event=None):
            sv = combo.get()
            ax.clear()
            if sv == "All":
                for sv_name, y in dopcpy.items():
                    ax.plot(dopData["time"], y ,label=sv_name)
                ax.set_title("DOP")
                ax.legend(loc="upper right", fontsize=7)
            elif sv in dopcpy:
                ax.plot(dopData["time"], dopcpy[sv])
                ax.set_title(f" {sv}")
            ax.set_ylabel(sv)
            ax.set_xlabel("Time")
            canvas.draw()

        combo.bind("<<ComboboxSelected>>", plot_selected_sv)

        plot_selected_sv()
        root.mainloop()

    open_sv_plotter(dopData)



    #plotTripleData(dopData["time"], dopData["PDOP"], dopData["time"], dopData["HDOP"], dopData["time"], dopData["VDOP"], "time", "DOP", "DOP plot", "PDOP", "HDOP", "VDOP")    
#######################################################################################################################################################################

    
def extractDopData(dataStructure):
    dopData = {"PDOP": [], "HDOP": [], "VDOP": [], "time": []}

    for i in range(len(dataStructure["data"])):
        if (dataStructure["data"][i][talkerID + "ZDA"][1] and dataStructure["data"][i][talkerID + "ZDA"][2] and dataStructure["data"][i][talkerID + "ZDA"][3]):
            dopData["time"].append(convertTime(dataStructure["data"][i][talkerID + "ZDA"][1], dataStructure["data"][i][talkerID + "ZDA"][2], dataStructure["data"][i][talkerID + "ZDA"][3], dataStructure["data"][i][talkerID + "ZDA"][4]))
            
            if dataStructure["gpEnabled"] and dataStructure["data"][i]["GSA"]["GP"][15]:
                
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GP"][15]))
            elif dataStructure["gaEnabled"] and dataStructure["data"][i]["GSA"]["GA"][15]:
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GA"][15]))
            elif dataStructure["glEnabled"] and dataStructure["data"][i]["GSA"]["GL"][15]:
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GL"][15]))
            elif dataStructure["gbEnabled"] and dataStructure["data"][i]["GSA"]["GB"][15]:
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GB"][15]))
            elif dataStructure["gqEnabled"] and dataStructure["data"][i]["GSA"]["GQ"][15]:
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GQ"][15]))
            elif dataStructure["giEnabled"] and dataStructure["data"][i]["GSA"]["GI"][15]:
                dopData["PDOP"].append(float(dataStructure["data"][i]["GSA"]["GI"][15]))
            else:
                dopData["PDOP"].append(0.0)
                
            if dataStructure["gpEnabled"] and dataStructure["data"][i]["GSA"]["GP"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GP"][16]))
            elif dataStructure["gaEnabled"] and dataStructure["data"][i]["GSA"]["GA"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GA"][16]))
            elif dataStructure["glEnabled"] and dataStructure["data"][i]["GSA"]["GL"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GL"][16]))
            elif dataStructure["gbEnabled"] and dataStructure["data"][i]["GSA"]["GB"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GB"][16]))
            elif dataStructure["gqEnabled"] and dataStructure["data"][i]["GSA"]["GQ"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GQ"][16]))
            elif dataStructure["giEnabled"] and dataStructure["data"][i]["GSA"]["GI"][16]:
                dopData["HDOP"].append(float(dataStructure["data"][i]["GSA"]["GI"][16]))
            else:
                dopData["HDOP"].append(0.0)
                
            if dataStructure["gpEnabled"] and dataStructure["data"][i]["GSA"]["GP"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GP"][17]))
            elif dataStructure["gaEnabled"] and dataStructure["data"][i]["GSA"]["GA"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GA"][17]))
            elif dataStructure["glEnabled"] and dataStructure["data"][i]["GSA"]["GL"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GL"][17]))
            elif dataStructure["gbEnabled"] and dataStructure["data"][i]["GSA"]["GB"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GB"][17]))
            elif dataStructure["gqEnabled"] and dataStructure["data"][i]["GSA"]["GQ"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GQ"][17]))
            elif dataStructure["giEnabled"] and dataStructure["data"][i]["GSA"]["GI"][17]:
                dopData["VDOP"].append(float(dataStructure["data"][i]["GSA"]["GI"][17]))
            else:
                dopData["VDOP"].append(0.0)

    return dopData

        
            

    


####################################################################################################################################################################
def plotTripleData(xData0, yData0, xData1, yData1, xData2, yData2, xLabel, yLabel, title, label0, label1, label2):
    
    # plotting the line 0 points 
    plt.plot(xData0, yData0, label = label0)
    # plotting the line 1 points 
    plt.plot(xData1, yData1, label = label1)
    # plotting the line 2 points 
    plt.plot(xData2, yData2, label = label2)

    # naming the x axis
    plt.xlabel(xLabel)
    # naming the y axis
    plt.ylabel(yLabel)
 
    # giving a title to my graph
    plt.title(title)

    # Rotating x axis keys by 45 deg for readability
    plt.xticks(rotation=45)

    # show a legend on the plot
    plt.legend()
 
    # function to show the plot
    plt.show()

#################################################################################################################################################################



def plotSimultaneousDopData():
    
    path0 = path
    print("Enter the path of 2nd log")
    path1 = input()
    flag=1
    choice=None
    dataStructure0 = extractAllData(path0)
    dataStructure1 = extractAllData(path1)
    print(dataStructure1)
    dopData0 = extractDopData(dataStructure0)
    dopData1 = extractDopData(dataStructure1)

    

    while choice == None:

        print()
        print("0 - PDOP")
        print("1 - HDOP")
        print("2 - VDOP")
        print("3 - All")
        print(("What data do you want to view?\n"))
        
        choice = (input())
                     

        if choice == '0':
            plotSimultaneousData(dopData0["time"], dopData0["PDOP"], dopData1["time"], dopData1["PDOP"], "time", "DOP", "PDOP plot")
        elif choice == '1':
            plotSimultaneousData(dopData0["time"], dopData0["HDOP"], dopData1["time"], dopData1["HDOP"], "time", "DOP", "HDOP plot")
        elif choice == '2':
            plotSimultaneousData(dopData0["time"], dopData0["VDOP"], dopData1["time"], dopData1["VDOP"], "time", "DOP", "VDOP plot")
        elif choice == '3':
            plotSimultaneousData(dopData0["time"], dopData0["PDOP"], dopData1["time"], dopData1["PDOP"], "time", "DOP", "PDOP plot")
            plotSimultaneousData(dopData0["time"], dopData0["HDOP"], dopData1["time"], dopData1["HDOP"], "time", "DOP", "HDOP plot")
            plotSimultaneousData(dopData0["time"], dopData0["VDOP"], dopData1["time"], dopData1["VDOP"], "time", "DOP", "VDOP plot")
        else:
            print("Invalid choice")
            choice = None

#################################################################################################################################################################        

def PlotVelocity(dataStructure):

    vtgdata=extractVTGData(dataStructure['data'])
    try:
            
        if(len(vtgdata["time"]) ==  len(vtgdata["time"])):
            

            plotSingleData(vtgdata["time"], "time", vtgdata["Velocity"], "Kmph", "VELOCITY ")
  
        
    except Exception as e:
                messagebox.showerror("Error", f"An error occurred:\n{e}")






























#######################################################################################################################################################
def extractFixData(dataStructure):
    #print(talkerID + "ZDA")
    #print(talkerID)
    #print(dataStructure)
    count=0
    fixData = {"time": [], "noOfSvsUsedForFix": [],"GPSSvsUsedforfix":[],"GQSvsUsedforfix":[],"GalSvsUsedforfix":[],"GlonasSvsUsedforfix":[],"BiedouSvsUsedforfix":[],"NavicSvsUsedforfix":[]}
    required_keys = ['GSA', 'GSV', talkerID+'GGA', talkerID+'GNS', talkerID+'RMC', talkerID+'GLL', talkerID+'VTG', talkerID+'ZDA']
    #print((dataStructure["data"][0].keys()))
    for i in range(len(dataStructure["data"])):
        current_keys=dataStructure["data"][i].keys()
        #print(current_keys)


        if not all(key in current_keys for key in required_keys):
            
            #print((dataStructure["data"][i].keys()))

            continue
        if (dataStructure["data"][i][talkerID + "ZDA"][1] and dataStructure["data"][i][talkerID + "ZDA"][2] and dataStructure["data"][i][talkerID + "ZDA"][3]
        and dataStructure["data"][i][talkerID + "ZDA"][4]):

            fixData["time"].append(convertTime(dataStructure["data"][i][talkerID + "ZDA"][1], dataStructure["data"][i][talkerID + "ZDA"][2], dataStructure["data"][i][talkerID + "ZDA"][3], dataStructure["data"][i][talkerID + "ZDA"][4]))
        
            #print(fixData)
            if fixAvailable(dataStructure, i):
                g_c=0
                gal_c=0
                glon_c=0
                bie_c=0
                nav_c=0
                qzs_c=0
                
                

                if dataStructure["gpEnabled"]:
                    

                    for j in range(3, (len(dataStructure["data"][i]["GSA"]["GP"]))-4):
                        
                        if dataStructure["data"][i]["GSA"]["GP"][j]:
                            #counter = counter + 1
                            g_c=g_c+1
                            #print(dataStructure["data"][i]["GSA"]["GP"][j])
                    fixData["GPSSvsUsedforfix"].append(g_c)
                if dataStructure["gbEnabled"]:
                    #print("bye")
                    for j in range(3, (len(dataStructure["data"][i]["GSA"]["GB"])) - 4):
                        if  dataStructure["data"][i]["GSA"]["GB"][j]:
                            #counter = counter + 1
                            bie_c=bie_c+1
                            #print(dataStructure["data"][i]["GSA"]["GB"][j])
                        else:
                            bie_c=bie_c+0

                    fixData["BiedouSvsUsedforfix"].append(bie_c)
            

               

                if dataStructure["gaEnabled"]:
                    for j in range(3, (len(dataStructure["data"][i]["GSA"]["GA"]))-4):
                        if  dataStructure["data"][i]["GSA"]["GA"][j]:
                            #ounter = counter + 1
                            #print(dataStructure["data"][i]["GSA"]["GA"][j])

                            gal_c=gal_c+1
                    fixData["GalSvsUsedforfix"].append(gal_c)
               
                        
                            
                    

                if dataStructure["giEnabled"]:
                   
                    for j in range(3, (len(dataStructure["data"][i]["GSA"]["GI"])-4)):
                        if  dataStructure["data"][i]["GSA"]["GI"][j]:
                            #counter = gal_c + 1
                            nav_c=nav_c+1
                            #print(dataStructure["data"][i]["GSA"]["GI"][j])
                        else:
                            nav_c=nav_c+0
                    fixData["NavicSvsUsedforfix"].append(nav_c)

                if dataStructure["glEnabled"]:
                    for j in range(3, (len(dataStructure["data"][i]["GSA"]["GL"]))-4):
                        if  dataStructure["data"][i]["GSA"]["GL"][j]:
                            #counter = counter + 1
                            #print(dataStructure["data"][i]["GSA"]["GL"][j])

                            glon_c=glon_c+1
                        else:
                            glon_c=glon_c+0
                    fixData["GlonasSvsUsedforfix"].append(glon_c)

                if dataStructure["gqEnabled"]:
                    for j in range(3, len(dataStructure["data"][i]["GSA"]["GQ"])-4):
                        if dataStructure["data"][i]["GSA"]["GQ"][j]:
                            #print("GQ")

                            qzs_c=qzs_c+1
                            #print(dataStructure["data"][i]["GSA"]["GQ"][j])
                            #counter = counter + 1
                        else:
                            qzs_c=qzs_c+0
                    fixData["GQSvsUsedforfix"].append(qzs_c)

                
                            
                fixData["noOfSvsUsedForFix"].append(g_c+bie_c+glon_c+nav_c+gal_c+qzs_c)

            else:
                fixData["noOfSvsUsedForFix"].append(0)
              

    return fixData

###############################################################################################################################

def plotNoOfSvsUsedForFix(dataStructure):
    fixData = extractFixData(dataStructure)
    #print(fixData)
    sv_data = {}
    slNo=int(0)
    if dataStructure["gpEnabled"] == True:
        sv_data["GPS"]=None
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["GPSSvsUsedforfix"])):
             sv_data["GPS"] = fixData["GPSSvsUsedforfix"]     
      

    if dataStructure["gqEnabled"] == True:
        sv_data["QZSS"]=None
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["GQSvsUsedforfix"])):
            
            sv_data["QZSS"] = fixData["GQSvsUsedforfix"]     


                        
    if dataStructure["gaEnabled"] == True:
        sv_data["GALILEO"]=None
        
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["GalSvsUsedforfix"])):

            sv_data["GALILEO"] = fixData["GalSvsUsedforfix"] 
        
    if dataStructure["gbEnabled"] == True:
        sv_data["BEIDOU"]=None
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["BiedouSvsUsedforfix"])):
 
            sv_data["BEIDOU"] = fixData["BiedouSvsUsedforfix"] 
      
    if dataStructure["giEnabled"] == True: 
        sv_data["IRNSS"]=None
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["NavicSvsUsedforfix"])):
 
            sv_data["IRNSS"] = fixData["NavicSvsUsedforfix"] 
       
    if dataStructure["glEnabled"] == True:
        sv_data["GLONASS"]=None
        slNo=slNo+1
        if(len(fixData["time"])) == (len(fixData["GlonasSvsUsedforfix"])):
 
            sv_data["GLONASS"] = fixData["GlonasSvsUsedforfix"] 
        
    if slNo > 1:
        sv_data["All Constellation"]=None
        if(len(fixData["time"])) == (len(fixData["noOfSvsUsedForFix"])):

            sv_data["All Constellation"] = fixData["noOfSvsUsedForFix"] 

 
    def open_sv_plotter():
        root = tk.Tk()
        root.title("SV Plotter")

        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width // 2) - (700 // 2)
        y = (screen_height // 2) - (500 // 2)
        root.geometry(f"700x550+{x}+{y}")

        notebook = ttk.Notebook(root)
        notebook.pack(fill='both', expand=True)

        sv_tab = ttk.Frame(notebook)
        notebook.add(sv_tab, text="SV's used for position")

        sv_tab.grid_rowconfigure(0, weight=0)
        sv_tab.grid_rowconfigure(1, weight=1)
        sv_tab.grid_columnconfigure(0, weight=1)

        # Dropdown 
        combo = ttk.Combobox(sv_tab, values=["All"] + list(sv_data.keys()), state="readonly")
        combo.grid(row=0, column=0, padx=10, pady=10, sticky='w')
        combo.set("All")

        
        figure = plt.Figure(figsize=(6, 4), dpi=100)
        ax = figure.add_subplot(111)

        
        canvas = FigureCanvasTkAgg(figure, sv_tab)
        canvas_widget = canvas.get_tk_widget()
        canvas_widget.grid(row=1, column=0, padx=10, pady=5, sticky='nsew')

        # Toolbar 
        toolbar_frame = ttk.Frame(sv_tab)
        toolbar_frame.grid(row=2, column=0, sticky='ew', padx=10)
        toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
        toolbar.update()

        # Plotting 
        def plot_selected_sv(event=None):
            sv = combo.get()
            ax.clear()
            if sv == "All":
                for sv_name, y in sv_data.items():
                    ax.plot(fixData["time"], y, label=sv_name)
                ax.set_title("Number of SVs used for position")
                ax.legend(loc="upper right", fontsize=7)
            elif sv in sv_data:
                ax.plot(fixData["time"], sv_data[sv])
                ax.set_title(f"Number of {sv} SVs used for position")
            ax.set_ylabel("Number of SVs used")
            ax.set_xlabel("Time")
            canvas.draw()

        combo.bind("<<ComboboxSelected>>", plot_selected_sv)

        plot_selected_sv()
        root.mainloop()

    open_sv_plotter()

##################################################################################################################



def plotSimultaneousNoOfSvsUsedForFix(dataStructure):
    global second_path
    global dataStructure1
    #print(second_path)
    sv_data = {}
    sv_data1={}
    def extractionandplotof2ndfile(root):
        print("second path:", second_path)
        findTimeJumps(second_path)

        slNo=int(0)
        dataStructure1=extractAllData(second_path)
        fixData = extractFixData(dataStructure)
        fixData1 = extractFixData(dataStructure1)

        
        if dataStructure["gpEnabled"] == True and dataStructure1["gpEnabled"] == True:
            sv_data["GPS"]=None
            sv_data1["GPS"]=None
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["GPSSvsUsedforfix"])):
                sv_data["GPS"] = fixData["GPSSvsUsedforfix"]     
            if(len(fixData1["time"])) == (len(fixData1["GPSSvsUsedforfix"])):
                sv_data1["GPS"] = fixData1["GPSSvsUsedforfix"]     

        if dataStructure["gqEnabled"] == True and dataStructure1["gqEnabled"] == True:
            sv_data["QZSS"]=None
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["GQSvsUsedforfix"])):
                
                sv_data["QZSS"] = fixData["GQSvsUsedforfix"]
            
            if(len(fixData1["time"])) == (len(fixData1["GQSvsUsedforfix"])):
                
                sv_data1["QZSS"] = fixData1["GQSvsUsedforfix"]

                            
        if dataStructure["gaEnabled"] == True and dataStructure1["gaEnabled"]:
            sv_data["GALILEO"]=None
            
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["GalSvsUsedforfix"])):

                sv_data["GALILEO"] = fixData["GalSvsUsedforfix"] 
            if(len(fixData1["time"])) == (len(fixData1["GalSvsUsedforfix"])):

                sv_data1["GALILEO"] = fixData1["GalSvsUsedforfix"] 

            
        if dataStructure["gbEnabled"] == True and dataStructure1["gbEnabled"] == True:
            sv_data["BEIDOU"]=None
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["BiedouSvsUsedforfix"])):
     
                sv_data["BEIDOU"] = fixData["BiedouSvsUsedforfix"] 

            if(len(fixData1["time"])) == (len(fixData1["BiedouSvsUsedforfix"])):
     
                sv_data1["BEIDOU"] = fixData1["BiedouSvsUsedforfix"] 

          
        if dataStructure["giEnabled"] == True and dataStructure1["giEnabled"] == True : 
            sv_data["IRNSS"]=None
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["NavicSvsUsedforfix"])):
     
                sv_data["IRNSS"] = fixData["NavicSvsUsedforfix"] 
            if(len(fixData1["time"])) == (len(fixData1["NavicSvsUsedforfix"])):
     
                sv_data1["IRNSS"] = fixData1["NavicSvsUsedforfix"] 

           
        if dataStructure["glEnabled"] == True and dataStructure1["glEnabled"] == True:
            sv_data["GLONASS"]=None
            slNo=slNo+1
            if(len(fixData["time"])) == (len(fixData["GlonasSvsUsedforfix"])):
     
                sv_data["GLONASS"] = fixData["GlonasSvsUsedforfix"] 
            if(len(fixData1["time"])) == (len(fixData1["GlonasSvsUsedforfix"])):
     
                sv_data1["GLONASS"] = fixData1["GlonasSvsUsedforfix"] 

            
        if slNo > 1:
            sv_data["All Constellation"]=None
            if(len(fixData["time"])) == (len(fixData["noOfSvsUsedForFix"])):

                sv_data["All Constellation"] = fixData["noOfSvsUsedForFix"] 

            if(len(fixData1["time"])) == (len(fixData1["noOfSvsUsedForFix"])):

                sv_data1["All Constellation"] = fixData1["noOfSvsUsedForFix"] 

        root.destroy()

        def open_sv_plotter():
            root = tk.Tk()
            root.title("SV Plotter")

            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            x = (screen_width // 2) - (700 // 2)
            y = (screen_height // 2) - (500 // 2)
            root.geometry(f"700x550+{x}+{y}")

            notebook = ttk.Notebook(root)
            notebook.pack(fill='both', expand=True)

            sv_tab = ttk.Frame(notebook)
            notebook.add(sv_tab, text="SV's used for position")

            sv_tab.grid_rowconfigure(0, weight=0)
            sv_tab.grid_rowconfigure(1, weight=1)
            sv_tab.grid_columnconfigure(0, weight=1)

            # Dropdown 
            combo = ttk.Combobox(sv_tab, values=["All"] + list(sv_data.keys()), state="readonly")
            combo.grid(row=0, column=0, padx=10, pady=10, sticky='w')
            combo.set("All")

            
            figure = plt.Figure(figsize=(6, 4), dpi=100)
            ax = figure.add_subplot(111)

            
            canvas = FigureCanvasTkAgg(figure, sv_tab)
            canvas_widget = canvas.get_tk_widget()
            canvas_widget.grid(row=1, column=0, padx=10, pady=5, sticky='nsew')

            # Toolbar 
            toolbar_frame = ttk.Frame(sv_tab)
            toolbar_frame.grid(row=2, column=0, sticky='ew', padx=10)
            toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
            toolbar.update()

            # Plotting 
            def plot_selected_sv(event=None):
                sv = combo.get()
                ax.clear()
                if sv == "All":
                    for (sv_name, y), (sv_name2, z) in zip(sv_data.items(), sv_data1.items()):
                        ax.plot(fixData["time"], y,fixData1["time"],z, label=sv_name)
                    ax.set_title("Number of SVs used for position")
                    ax.legend(loc="upper right", fontsize=7)
                elif sv in sv_data and sv in sv_data1:
                    ax.plot(fixData["time"], sv_data[sv],fixData1["time"],sv_data1[sv],label=sv)
                    ax.set_title(f"Number of {sv} SVs used for position")
                ax.set_ylabel("Number of SVs used")
                ax.set_xlabel("Time")
                canvas.draw()

            combo.bind("<<ComboboxSelected>>", plot_selected_sv)

            plot_selected_sv()
            root.mainloop()

        open_sv_plotter()
        

  #########2nd path UI  #######
    #if second_path == "":
    root = tk.Tk()
    root.title("2nd file path")
    root.geometry("400x200")
    root.resizable(False, False)

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width // 2) - (300 // 2)
    y = (screen_height // 2) - (500 // 2)
    root.geometry(f"+{x}+{y}")
    processing_label = tk.Label(root, text="", fg="red")

    def browse_second_file():
        global second_path
        second_path = filedialog.askopenfilename(parent=root)
        if second_path:
            processing_label.config(text="Processing...")
            root.update_idletasks()
            #print("Selected second path:", second_path)
            #messagebox.showinfo("Second File", f"You selected:\n{second_path}", parent=root)
            extractionandplotof2ndfile(root)
            

    tk.Button(root, text="Browse Second File", command=browse_second_file).pack(pady=50)


##################################################################################################################################################################################
def extractMipsData(data, index):

    timeDataFrom = "$GNZDA"

    mipsData = {"data": [], "time": []}
    for i in range(len(data)):
        
        if data[i]["$ACMPS"][index] and data[i][timeDataFrom][1]:
            mipsData["data"].append(float(data[i]["$ACMPS"][index]))
            mipsData["time"].append(convertTime(data[i][timeDataFrom][1], data[i][timeDataFrom][2], data[i][timeDataFrom][3], data[i][timeDataFrom][4]))

    return mipsData


############################################################################################################
def analyzeMips():
    
    dataStructure = extractAllData(path)
    #print(dataStructure)

    index = {"0": 1, "1": 4, "2": 8, "3": 10, "4": 11, "5": 17, "6": 21}

    choice = None
    while choice == None:
        print()
        print("0 - Acquisition MIPS")
        print("1 - Max tracking MIPS")
        print("2 - BBISR MIPS")
        print("3 - SDBM MIPS")
        print("4 - Max SDBM MIPS")
        print("5 - Acquisition MIPS at max instance")
        print("6 - Max BBISR MIPS")
        print("7 - Everything")
        print()

        print("What data do you want to view?")
        choice = int(input())
        

        if choice < 0 or choice > 7:
            choice = None
        elif choice == 7:
            for key in index:
                mipsData = extractMipsData(dataStructure["data"], index[key])
                plotSingleData(mipsData["time"], "time", mipsData["data"], "MIPS", "MIPS plot")
        else:
            mipsData = extractMipsData(dataStructure["data"], index[str(choice)])
            plotSingleData(mipsData["time"], "time", mipsData["data"], "MIPS", "MIPS plot")


    
########################################################################################################################################################################

def Reset(file_path, word):
    try:
        count = 0
 
        with open(file_path, 'r') as file:
            for line in file:
                if word in line:
                    count += 1
 
        print(f" {count} times reset happened in this file.")
    
    except error as e:
        print(f"Error: {e}")












###########################################################################################################################################################################

    
def extractlatlongalti(data):
    '''
    def ddmm_to_decimal(coordinate):
        degrees = int(coordinate // 100)
        minutes = coordinate % 100
        return degrees + (minutes / 60)

    # Example usage
    latitude_ddmm = 1257.44781  # Example latitude in ddmm.mmmm format
    longitude_ddmm =7738.49540  # Example longitude in ddmm.mmmm format

    latitude_decimal = ddmm_to_decimal(latitude_ddmm)
    longitude_decimal = ddmm_to_decimal(longitude_ddmm)

    '''
    LatLongAltiData = {"lattitude":[],"longitude":[],"altitude": [], "time":[]}
    TrueXYZ={"lattitude":[],"longitude":[],"altitude": [], "time":[]}
    #print(len(data))
    
    MeanSea=0

    
    for i in range(len(data)):
        if (data[i]["$GNRMC"][2] and data[i]["$GNRMC"][3] and data[i]["$GNRMC"][5] and data[i]["$GNRMC"][4]):
            
            
            value=float(data[i]["$GNGGA"][11])
            ddmmyyy=data[i]["$GNRMC"][9]
            dat=ddmmyyy[:2]
            mon=ddmmyyy[2:4]
            ye="20"+ddmmyyy[-2:]
            
            if(value != 0):
                MeanSea=value
            if data[i]["$GNRMC"][3]:
                LatLongAltiData["lattitude"].append(float(data[i]["$GNRMC"][3]))
                LatLongAltiData["time"].append(convertTime(data[i]["$GNRMC"][1], dat, mon, ye))

            else:
                LatLongAltiData["lattitude"].append(float(0.0))
                
            if data[i]["$GNRMC"][5]:
                LatLongAltiData["longitude"].append(float(data[i]["$GNRMC"][5]))
            else:
                LatLongAltiData["longitude"].append(float(0.0))
                
                
            if data[i]["$GNRMC"][9]:
                LatLongAltiData["altitude"].append(float(data[i]["$GNGGA"][9]))

            else:
                LatLongAltiData["altitude"].append(float(0.0))
                

    
    return LatLongAltiData,MeanSea





def check_all_zeroes_for_time(data_dict):
    time_list = data_dict.get("time", [])  # Get "Time" list
    num_time_entries = len(time_list)
 
    if num_time_entries == 0:
        return False  # No time data to compare
 
    for key, values in data_dict.items():
        if key != "time" and isinstance(values, list):  # Ignore "Time" key
            if len(values) != num_time_entries:  # Ensure lengths match
                return False
            if any(float(v) != 0 for v in values):  # If any value is not zero, return False
                return False
 
    return True  # Return True if all numeric lists are entirely zero 
###########################################################################################################################################################################
def PlotStatistics():
    #dataStructure = extractAllData(path)


    #extract lat long alti from the data

    latlongalti,meansea= extractlatlongalti(dataStructure["data"])
    #print(latlongalti)
    
    def dm_to_dd(dm):
        if not dm:
            return 0.0  
     
        degrees = int(dm) // 100  
        minutes = dm - (degrees * 100)  
        result=str( degrees + (minutes / 60)  )
        return result
    def convert_dict_dm_to_dd(data_dict):
        converted_dict = {}
     
        for key, values in data_dict.items():
            if key != "time":
                
                if isinstance(values, list):
                    converted_dict[key] = [dm_to_dd(value) for value in values]
                else:
                    converted_dict[key] = dm_to_dd(values)
            if key == "altitude":
                converted_dict[key]=[(value+meansea) for value in values]
     
        return converted_dict
    
    converted_data = convert_dict_dm_to_dd(latlongalti)
    converted_data['time']=latlongalti['time']
    
    #print(converted_data)
    latlongalti=converted_data
    latitude = latlongalti.get("lattitude", [])
    print(len(latitude))
    longittude = latlongalti.get("longitude", [])
    latitude = np.array(latitude).astype(float)
    longittude = np.array(longittude).astype(float)
    
    altittude = latlongalti.get("altitude", [])
    altittude = np.array(altittude).astype(float)
    print(len(longittude))
    computed_xyz = GEO2ECEF(latlongalti)
    
    computed_xyz['time']=latlongalti['time']
    print(altittude)
    data=dataStructure["data"]
    print("enter TRUE X Y Z")
    X=input("X value\n")
    Y=input("Y value\n")
    Z=input("Z value\n")
    TrueXYz={"lattitude":[],"longitude":[],"altitude": [], "time":[]}



    for i in range(len(data)):
        if (data[i]["$GNRMC"][1] and data[i]["$GNRMC"][2] and data[i]["$GNRMC"][3] and data[i]["$GNRMC"][4]):

            
            if data[i]["$GNRMC"][2]:
                TrueXYz["lattitude"].append((X))
            else:
                TrueXYz["lattitude"].append(0.0)

            if data[i]["$GNRMC"][4]:
                TrueXYz["longitude"].append(Y)
            else:
                TrueXYz["longitude"].append(0.0)
                
            if data[i]["$GNRMC"][9]:
                TrueXYz["altitude"].append(Z)

            else:
                TrueXYz["altitude"].append(0.0)
    TrueXYz['time']=latlongalti['time']
    xyzerror=compute_xyz_difference(computed_xyz,TrueXYz)
    xyzerror['time']=computed_xyz['time']

    
    error_3d = np.sqrt(np.power(xyzerror.get("dX", []), 2) + np.power(xyzerror.get("dY", []), 2) + np.power(xyzerror.get("dZ", []), 2))
    error_3D_RMS = np.sqrt(np.mean(error_3d * error_3d))
    error_2d=np.sqrt(np.power(xyzerror.get("dX", []), 2) + np.power(xyzerror.get("dY", []), 2) )
    error_2D_RMS = np.sqrt(np.mean(error_2d * error_2d))

    true_latitude,true_longitude,true_altitude = ECEF2GEO([X,Y,Z])
    
    err_lat_inm = []
    err_lon_inm = []
    err_alt_inm = []
    (true_latm, true_lonm, n, i) = utm.from_latlon(true_latitude, true_longitude)
    
    for count in range(len(latitude)):
        (latm, lonm, n, i) = utm.from_latlon(latitude[count],longittude[count])
        err_lat_inm.append(true_latm - latm)
        err_lon_inm.append(true_lonm - lonm)
        
    for i in range(len(altittude)):
        err_alt_inm.append(true_altitude-altittude[i])
    print(true_latitude)
    print(true_longitude)
    print(true_altitude)                      
    err_lat = np.array(err_lat_inm) * np.array(err_lat_inm)
    err_lon = np.array(err_lon_inm) * np.array(err_lon_inm)
    err_alt= np.array(xyzerror.get("dZ", []) * np.array(xyzerror.get("dZ", [])))
    error_2d_geo = np.sqrt(err_lat + err_lon)
    error_2d_1sigma_geo = np.std(error_2d_geo)
    error_2D_RMS_geo = np.sqrt(np.mean(error_2d_geo * error_2d_geo))
                                                        
    error_3d_geo = np.sqrt(err_lat + err_lon + err_alt)
    error_3D_RMS_geo=np.sqrt(np.mean(error_3d_geo * error_3d_geo))






    M1=np.abs(error_2d_geo)
    sort_pos = np.sort(M1)
    L1 = len(sort_pos)
    pos_error = sort_pos [round(L1 * 0.5)]
    pos_Err_1_sigma = sort_pos [round(L1 * 0.65)]
    pos_Err_90_percent = sort_pos[ round(L1 * 0.90)]
    pos_Err_2_sigma = sort_pos [round(L1 * 0.95)]
    pos_Err_3_sigma = sort_pos [round(L1 * 0.99)]
    
    M2=np.abs(error_3d)
    sort_pos_1 = np.sort(M2)
    L2 = len(sort_pos_1)
    pos_error_3d = sort_pos_1[round(L2 * 0.5)]
    pos_Err_1_sigma_3d = sort_pos_1[round(L2 * 0.65)]
    pos_Err_90_percent_3d = sort_pos_1[round(L2 * 0.90)]
    pos_Err_2_sigma_3d = sort_pos_1[round(L2 * 0.95)]
    pos_Err_3_sigma_3d = sort_pos_1[round(L2 * 0.99)]
                                                        
   
    
    last_word = path.split("\\")[-1]
    print(last_word)


    val=input("do u want to write data to excel\n")
    if val == 's':
        
    #xyzerror = arr.tolist()
        writetoexcel(computed_xyz,TrueXYz,xyzerror,error_2d,error_3d,err_lat_inm,err_lon_inm,err_alt_inm,error_2d_geo,error_3d_geo);
    


    
    plotin=int(input("Plot lat error ,lon error,alti error ? (0 = No, 1 = Yes)\n"))
    if plotin == 0:
        print("TRUE")
    elif plotin == 1:
        PlotErrorData(computed_xyz['time'],err_lat_inm,err_lon_inm,err_alt_inm,error_2d_geo,error_3d_geo,"time", "LatError", "LongError", "AltError","ERROR")

        print("CEP of Pos Err:\t" + str(pos_error) + "\n")
        print("CEP of Pos Err 1 sigma:\t" + str(pos_Err_1_sigma) + "\n")
        print("CEP of Pos Err 90 percent:\t " + str(pos_Err_90_percent) + "\n")
        print("CEP of Pos Err 2 sigma:\t" + str(pos_Err_2_sigma) + "\n")
        print("CEP of Pos Err 3 sigma:\t" + str(pos_Err_3_sigma) + "\n\n")

        print("SEP of Pos Err 3d:\t" + str(pos_error_3d) + "\n")
        print("SEP of Pos Err 1 sigma 3d:\t" + str(pos_Err_1_sigma_3d) + "\n")
        print("SEP of Pos Err 90 percent 3d:\t" + str(pos_Err_90_percent_3d) + "\n")
        print("SEP of Pos Err 2 sigma 3d:\t" + str(pos_Err_2_sigma_3d) + "\n")
        print("SEP of Pos Err 3 sigma 3d:\t" + str(pos_Err_3_sigma_3d) + "\n\n")
        #PlotErrorData(xyzerror["time"],error_3d,[],
    else:
        print("Invalid choice")


        
        ##converting lat long into meters
        #lat=latlongalti.get("lattitude",[])
        #lon=latlongalti.get("longitude",[])
        #err_lat_inm = []
        #err_lon_inm = []
        #(true_latm, true_lonm, n, i) = utm.from_latlon(float(X), float(Y))
        
        #for count in range(len(lat)):
         #       (latm, lonm, n, i) = utm.from_latlon(lat[count], lon[count])

          #      err_lat_inm.append(true_latm - latm)
           #     err_lon_inm.append(true_lonm - lonm)
        #print(err_lat_inm)
        #print(err_lon_inm)

    



    
      
###########################################################################################################################################################################



def GEO2ECEF(geo_dict):

    
    a = 6378137.0  # Semi-major axis of the Earth (meters)
    flattening = 3.35281066474e-03
    e_squared = (2 * flattening) - (flattening ** 2)  # Square of eccentricity
    pi = 3.14159265358979323846

    # Extract values from the dictionary
    Latitude = geo_dict.get("lattitude", [])
    Longitude = geo_dict.get("longitude", [])
    Altitude = geo_dict.get("altitude", [])
    Time = geo_dict.get("time", [])
        # Initialize result lists
    X, Y, Z = [], [], []
    
     # Validate input length
    min_length = min(len(Latitude), len(Longitude), len(Altitude), len(Time))
    
    if len(Latitude) != len(Longitude) or len(Latitude) != len(Altitude) or len(Latitude) != len(Time):
        print(f"Warning: Mismatched list lengths! Trimming all lists to {min_length} entries.")
        Latitude, Longitude, Altitude, Time = Latitude[:min_length], Longitude[:min_length], Altitude[:min_length], Time[:min_length]


    # Precompute trigonometric values
    sine_of_latitude = [sin(float(lat) * pi / 180) for lat in Latitude]
    cos_of_latitude = [cos(float(lat) * pi / 180) for lat in Latitude]
    sine_of_longitude = [sin(float(lon) * pi / 180) for lon in Longitude]
    cos_of_longitude = [cos(float(lon) * pi / 180) for lon in Longitude]
  

    # Convert to ECEF
    for i in range(len(Latitude)):
        N = a / sqrt(1 - e_squared * sine_of_latitude[i] ** 2)
        x = (N + float(Altitude[i])) * cos_of_latitude[i] * cos_of_longitude[i]
        y = (N + float(Altitude[i])) * cos_of_latitude[i] * sine_of_longitude[i]
        z = (N * (1 - e_squared) + float(Altitude[i])) * sine_of_latitude[i]
 
        X.append(x)
        Y.append(y)
        Z.append(z)
 
    # Return results as a dictionary
    return {"X": X, "Y": Y, "Z": Z}
 



###########################################################################################################################################################################
def ECEF2GEO(ecef):
    x = ecef[0]
    y = ecef[1]
    z = ecef[2]
    x=float(x)
    y=float(y)

    z=float(z)

    a = np.double(6378137.00)
    e = np.double(8.1819190842622e-2)
    pi = 3.14159265358979323846
    asq = np.power(a, 2)
    esq = np.power(e, 2)
    b = np.sqrt(asq * (1 - esq))
    bsq = np.power(b, 2)
    ep = np.sqrt((asq - bsq) / bsq)
    p = np.sqrt(np.power(x, 2) + np.power(y, 2))
    th = np.arctan2(a * z, b * p)
    lon = np.arctan2(y, x)
    lat = np.arctan2((z + np.power(ep, 2) * b * np.power(np.sin(th), 3)), (p - esq * a * np.power(np.cos(th), 3)))
    N = a / (np.sqrt(1 - esq * np.power(np.sin(lat), 2)))
    alt = p / np.cos(lat) - N
    lon = lon % (2 * pi)
    lat = lat * (180 / pi)
    lon = lon * (180 / pi)
    if lon > 180:
        lon -= 360
    return lat, lon, alt


########################################################################################################################

def compute_xyz_difference(computed_xyz, true_xyz):
    

    dX = [float(x_c) - float(x_t) for x_c, x_t in zip(computed_xyz["X"], true_xyz["lattitude"])]
    dY = [float(y_c) - float(y_t) for y_c, y_t in zip(computed_xyz["Y"], true_xyz["longitude"])]
    dZ = [float(z_c) - float(z_t) for z_c, z_t in zip(computed_xyz["Z"], true_xyz["altitude"])]

    return {"dX": dX, "dY": dY, "dZ": dZ}

 
    #return {"time": computed_xyz, "dX": dX, "dY": dY, "dZ": dZ}
 
###########################################################################################################################################################################

def PlotErrorData(xData0,yData0,yData1,yData2,error_2d,error_3d,xLabel, yLabel0, yLabel1,yLabe2,title):

# plotting the line 0 points 
    plt.plot(xData0, yData0 ,label='latError(meters)',color='r')
    plt.xlabel(xLabel+"(seconds)")
    plt.title("Lattitude Error")
    plt.ylabel(title+"(meter)")

    plt.show()

    plt.plot(xData0, yData1 ,label='LonError(meters)',color='g')
    plt.xlabel(xLabel+"(seconds)")
    plt.title("longittude Error")
    plt.ylabel(title+"(meter)")

    plt.show()

    plt.plot(xData0, yData2 ,label='AltError(meters)',color='b')
    plt.xlabel(xLabel+"(seconds)")
    plt.title("altittude Error")

    plt.ylabel(title+"(meter)")
    plt.show()


    # function to show the plot
    plt.plot(xData0, error_2d ,label='HPE (meters)',color='blue')
    plt.xlabel(xLabel+"(seconds)")
    plt.ylabel(title+"(meter)")
    plt.title("3d Error ")
    plt.show()
    
    # function to show the plot
    plt.plot(xData0, error_3d ,label='VPE (meters)',color='green')
    plt.xlabel(xLabel+"(seconds)")
    plt.ylabel(title+"(meter)")
    plt.title("2d Error ")
    plt.show()

    

 

##############################################################################################################################################
def writetoexcel(computed_xyz,true_xyz,xyzerror,error_2d,error_3d,err_lat_inm,err_lon_inm, err_alt_inm,error_2d_geo,error_3d_geo):
    last_word = path.split("\\")[-1]
    
    Latitude = (true_xyz.get("lattitude", []))
    Latitude = [float(x) for x in Latitude]

    Longitude = (true_xyz.get("longitude", []))
    Longitude = [float(x) for x in Longitude]

    Altitude = (true_xyz.get("altitude", []) )  
    Altitude = [float(x) for x in Altitude]
    print(len((xyzerror.get("dX",[]))))
    print(len(Latitude))
    print(len((computed_xyz.get("X",[]))))

    error_2d = error_2d.tolist()
    error_3d = error_3d.tolist()
    if os.path.exists(file_name):
        # Load the existing Excel file
        with pd.ExcelWriter(file_name, engine='openpyxl', mode='a') as writer:
            
            df = pd.DataFrame({'X': computed_xyz["X"],'Y': computed_xyz["Y"],'Z':computed_xyz["Z"],
                               'TRUE-X': (Latitude),'TRUE-Y':( Longitude),'TRUE-Z':(Altitude),
                               'dX(m)': xyzerror["dX"],'dY(m)': xyzerror["dY"],'dZ(m)': xyzerror["dZ"],
                               '2D-Pos error(m)': (error_2d),'3D-Pos error(m)':( error_3d)  ,             

                               'lat_error(m)': err_lat_inm,'lon_error(m)': err_lon_inm,'alt_error(m)':err_alt_inm,'HPE(m)':error_2d_geo,'VPE(m)': error_3d_geo})  
            df.to_excel(writer, sheet_name=last_word, index=False)
          
    else:
        df = pd.DataFrame({'X': computed_xyz["X"],'Y': computed_xyz["Y"],'Z':computed_xyz["Z"],
                               'TRUE-X': (Latitude),'TRUE-Y':( Longitude),'TRUE-Z':(Altitude),
                               'dX(m)': xyzerror["dX"],'dY(m)': xyzerror["dY"],'dZ(m)': xyzerror["dZ"],
                               '2D-Pos error(m)': (error_2d),'3D-Pos error(m)':( error_3d)  ,             

                               'lat_error(m)': err_lat_inm,'lon_error(m)': err_lon_inm,'alt_error(m)':err_alt_inm,'HPE(m)':error_2d_geo,'VPE(m)': error_3d_geo})  
        df.to_excel(file_name, sheet_name=last_word, index=False)

    print(f"Data has been written to {file_name}.")


    
##############################################################################################################################################

def mainfunction(ch,path,dataStructure):


    try:

        if (ch) == 0:
            plotCByNoForSvId(dataStructure)
        elif (ch) == 1:
            plotSimultaneousCByNo(dataStructure)                        
        elif  (ch) == 2:
            analyzeMips()
        elif  (ch) == 3:
            positionLossCheck(dataStructure)
        elif  (ch) == 4:
            plotSingleAltitude(dataStructure)
        elif  (ch) == 5:
            plotSimultaneousAltitude(dataStructure)
        elif  (ch) == 6:
            plotDopData(dataStructure)
        elif (ch) == 7:
            plotSimultaneousDopData()
        elif (ch) == 8:
            
            
            plotNoOfSvsUsedForFix(dataStructure)
        elif (ch) == 9:
            
            plotSimultaneousNoOfSvsUsedForFix(dataStructure)
        elif (ch) == 10:
            Reset(path, 'ASU')
            
        elif (ch) == 11:
            sbasplot(dataStructure)
        elif (ch) == 12:
            PlotStatistics()
        elif (ch) == 13:
            PlotVelocity(dataStructure)


    except Exception as e:
            pass



